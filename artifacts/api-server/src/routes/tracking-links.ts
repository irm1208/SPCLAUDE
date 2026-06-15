import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { db, siteConfigTable } from "@workspace/db";
import { trackingLinksTable, gbParcelsTable, groupBuysTable, ordersTable, orderLineItemsTable, type TrackingPackage, type TrackingEvent } from "@workspace/db";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// ─── Reuse 17track helpers from gb-parcels ───────────────────────────────────

async function getTrack17Key(): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "track17ApiKey"));
  return row?.value || process.env.TRACK17_API_KEY || null;
}

const TRACK17_BASE = "https://api.17track.net/track/v2.4";

async function track17Register(trackingNumber: string, carrierCode = 0): Promise<boolean> {
  const key = await getTrack17Key();
  if (!key) return false;
  try {
    const entry: Record<string, unknown> = carrierCode > 0
      ? { number: trackingNumber, carrier: carrierCode }
      : { number: trackingNumber };
    const res = await fetch(`${TRACK17_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify([entry]),
    });
    const json = await res.json() as { data?: { accepted?: unknown[]; rejected?: Array<{ error?: { code?: number } }> } };
    const accepted = json?.data?.accepted ?? [];
    if (accepted.length > 0) return true;
    const rejected = json?.data?.rejected ?? [];
    return rejected.every(r => r.error?.code === -18019901) && rejected.length > 0;
  } catch { return false; }
}

async function track17GetInfo(trackingNumber: string, carrierCode = 0): Promise<unknown | null> {
  const key = await getTrack17Key();
  if (!key) return null;
  try {
    const entry: Record<string, unknown> = carrierCode > 0
      ? { number: trackingNumber, carrier: carrierCode }
      : { number: trackingNumber };
    const res = await fetch(`${TRACK17_BASE}/gettrackinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify([entry]),
    });
    const json = await res.json() as { data?: { accepted?: unknown[] } };
    const accepted = json?.data?.accepted ?? [];
    return accepted.length > 0 ? accepted[0] : null;
  } catch { return null; }
}

const COUNTRY_MAP: [string, string][] = [
  ["hong kong", "China"], ["china", "China"], [", cn", "China"],
  ["united kingdom", "United Kingdom"], ["england", "United Kingdom"],
  ["scotland", "United Kingdom"], [", uk", "United Kingdom"],
  ["united states", "United States"], [", usa", "United States"], [", us", "United States"],
  ["germany", "Germany"], ["france", "France"], ["netherlands", "Netherlands"],
  ["belgium", "Belgium"], ["poland", "Poland"], ["sweden", "Sweden"],
  ["norway", "Norway"], ["denmark", "Denmark"], ["finland", "Finland"],
  ["spain", "Spain"], ["italy", "Italy"], ["portugal", "Portugal"],
  ["switzerland", "Switzerland"], ["austria", "Austria"],
  ["australia", "Australia"], ["canada", "Canada"],
  ["japan", "Japan"], ["south korea", "South Korea"], ["singapore", "Singapore"],
  ["taiwan", "China"], ["thailand", "Thailand"], ["india", "India"],
];

function maskLocation(loc: string): string {
  if (!loc) return "";
  const lower = loc.toLowerCase();
  for (const [key, label] of COUNTRY_MAP) {
    if (lower.includes(key)) return label;
  }
  return "";
}

function maskStatus(status: string): string {
  if (!status) return "";
  return status
    .replace(/signed\s+(for\s+)?by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/g, "Signed for")
    .replace(/received\s+by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/gi, "Received")
    .replace(/\d{1,5}\s+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]*)*(St|Ave|Blvd|Rd|Dr|Ln|Ct|Pl|Way|Street|Avenue|Road)/gi, "")
    .trim();
}

function maskTrackingNumber(tn: string): string {
  // Fully opaque — show no real characters so the carrier cannot be identified
  return "•".repeat(Math.min(Math.max(tn.length, 6), 12));
}

const STATUS_STRING_MAP: Record<string, string> = {
  NotFound: "pending",
  InfoReceived: "pending",
  InTransit: "in_transit",
  Expired: "expired",
  AvailableForPickup: "out_for_delivery",
  OutForDelivery: "out_for_delivery",
  DeliveryFailure: "attempted",
  Delivered: "delivered",
  Exception: "exception",
};

type V24Accepted = {
  track_info?: {
    latest_status?: { status?: string };
    tracking?: {
      providers?: Array<{
        events?: Array<{
          time_iso?: string;
          time_utc?: string;
          description?: string;
          location?: string;
        }>;
      }>;
    };
  };
};

function parseTrack17(accepted: unknown): { status: string; statusCode: number; events: TrackingEvent[] } {
  const a = accepted as V24Accepted;
  const trackInfo = a?.track_info ?? {};
  const rawStatus = trackInfo.latest_status?.status ?? "";
  const status = STATUS_STRING_MAP[rawStatus] ?? "pending";
  const STATUS_REVERSE: Record<string, number> = {
    pending: 0, in_transit: 20, out_for_delivery: 30,
    attempted: 35, delivered: 40, exception: 50, expired: 60,
  };
  const statusCode = STATUS_REVERSE[status] ?? 0;

  const providers = trackInfo.tracking?.providers ?? [];
  const seen = new Set<string>();
  const events: TrackingEvent[] = [];
  for (const prov of providers) {
    for (const ev of prov.events ?? []) {
      const date = ev.time_utc ?? ev.time_iso ?? "";
      const description = ev.description ?? "";
      if (!description) continue;
      const key = `${date}|${description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ date, status: maskStatus(description), location: maskLocation(ev.location ?? "") });
    }
  }
  return { status, statusCode, events };
}

// ── slug helpers ──────────────────────────────────────────────────────────────
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function uniqueSlug(base: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || "track"}-${rand}`;
}

// ── Public endpoint: direct parcel tracking ───────────────────────────────────
// GET /api/track/parcel/:parcelId — no auth required
router.get("/track/parcel/:parcelId", async (req, res): Promise<void> => {
  const { parcelId } = req.params;
  const [parcel] = await db
    .select({
      id: gbParcelsTable.id,
      label: gbParcelsTable.label,
      carrier: gbParcelsTable.carrier,
      trackingNumber: gbParcelsTable.trackingNumber,
      status: gbParcelsTable.status,
      statusCode: gbParcelsTable.statusCode,
      items: gbParcelsTable.items,
      cachedEvents: gbParcelsTable.cachedEvents,
      lastChecked: gbParcelsTable.lastChecked,
      groupBuyId: gbParcelsTable.groupBuyId,
    })
    .from(gbParcelsTable)
    .where(eq(gbParcelsTable.id, parcelId));

  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  const [gb] = await db
    .select({ name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, parcel.groupBuyId));

  // Only show items when a member-specific ?items= param is present.
  // Without it, items are hidden — use /track/gb/:gbId/member/:username for per-member views.
  const itemsParam = typeof req.query.items === "string" ? req.query.items.trim() : "";
  const items = itemsParam
    ? itemsParam.split("|").map(s => s.trim()).filter(Boolean)
    : [];

  res.json({
    id: parcel.id,
    slug: `parcel/${parcel.id}`,
    title: gb?.name ?? parcel.groupBuyId,
    description: null,
    packages: [{
      id: parcel.id,
      label: parcel.label,
      carrier: parcel.carrier ?? "",
      trackingNumber: maskTrackingNumber(parcel.trackingNumber ?? ""),
      status: parcel.status ?? "pending",
      statusCode: parcel.statusCode ?? 0,
      items,
      cachedEvents: parcel.cachedEvents ?? [],
      lastChecked: parcel.lastChecked ? parcel.lastChecked.toISOString() : null,
    }],
    updatedAt: parcel.lastChecked ?? new Date(),
  });
});

// ── Public endpoint: all member parcels in a GB ───────────────────────────────
// GET /api/track/gb/:gbId/member/:username — no auth required
router.get("/track/gb/:gbId/member/:username", async (req, res): Promise<void> => {
  const { gbId } = req.params;
  const cleanUsername = decodeURIComponent(req.params.username).replace(/^@/, "").toLowerCase();

  const [gb] = await db
    .select({ name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const parcels = await db
    .select({
      id: gbParcelsTable.id,
      label: gbParcelsTable.label,
      carrier: gbParcelsTable.carrier,
      trackingNumber: gbParcelsTable.trackingNumber,
      status: gbParcelsTable.status,
      statusCode: gbParcelsTable.statusCode,
      items: gbParcelsTable.items,
      cachedEvents: gbParcelsTable.cachedEvents,
      lastChecked: gbParcelsTable.lastChecked,
    })
    .from(gbParcelsTable)
    .where(eq(gbParcelsTable.groupBuyId, gbId));

  if (parcels.length === 0) { res.status(404).json({ error: "No parcels found" }); return; }

  // Get this member's order line items for the GB
  const memberOrders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${cleanUsername}`,
      isNull(ordersTable.deletedAt),
    ));

  const memberItemNames = new Set<string>();
  if (memberOrders.length > 0) {
    const lineItems = await db
      .select({ productName: orderLineItemsTable.productName })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, memberOrders.map(o => o.id)));
    for (const li of lineItems) memberItemNames.add(li.productName.trim().toLowerCase());
  }

  // Hard stop — if this member has no orders in the GB, show nothing
  if (memberItemNames.size === 0) {
    res.status(404).json({ error: "No packages found for your orders in this group buy" });
    return;
  }

  // For each parcel, find only this member's items; filter to parcels they have items in
  const memberParcels = parcels
    .map(parcel => {
      const allParcelItems = ((parcel.items ?? []) as { name: string }[]).map(i => i.name);
      const items = allParcelItems.filter(name => memberItemNames.has(name.trim().toLowerCase()));
      return { parcel, items };
    })
    .filter(({ items }) => items.length > 0);

  // Compute items not yet in any parcel (so the tracking page can show a pending section)
  const dispatchedItemKeys = new Set<string>();
  for (const { items } of memberParcels) {
    for (const name of items) dispatchedItemKeys.add(name.trim().toLowerCase());
  }
  // Get canonical display names from the member's line items
  const memberLineItemsFull = await db
    .select({ productName: orderLineItemsTable.productName })
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, memberOrders.map(o => o.id)));
  const seenPendingKeys = new Set<string>();
  const pendingItems: string[] = [];
  for (const li of memberLineItemsFull) {
    const key = li.productName.trim().toLowerCase();
    if (!dispatchedItemKeys.has(key) && !seenPendingKeys.has(key)) {
      seenPendingKeys.add(key);
      pendingItems.push(li.productName.trim());
    }
  }

  // If member has no orders at all, return 404 — no data to show
  if (memberParcels.length === 0 && pendingItems.length === 0) {
    res.status(404).json({ error: "No packages found for your orders in this group buy" });
    return;
  }

  res.json({
    id: gbId,
    slug: `gb/${gbId}/member/${req.params.username}`,
    title: gb.name,
    description: null,
    packages: memberParcels.map(({ parcel, items }) => ({
      id: parcel.id,
      label: parcel.label,
      carrier: parcel.carrier ?? "",
      trackingNumber: maskTrackingNumber(parcel.trackingNumber ?? ""),
      status: parcel.status ?? "pending",
      statusCode: parcel.statusCode ?? 0,
      items,
      cachedEvents: parcel.cachedEvents ?? [],
      lastChecked: parcel.lastChecked ? parcel.lastChecked.toISOString() : null,
    })),
    pendingItems,
    updatedAt: new Date(),
  });
});

// ── Public endpoint ───────────────────────────────────────────────────────────
// GET /api/track/:slug — no auth required
router.get("/track/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [link] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.slug, slug));
  if (!link) { res.status(404).json({ error: "Tracking page not found" }); return; }

  const packages = (link.packages as TrackingPackage[]).map(pkg => ({
    id: pkg.id,
    label: pkg.label,
    carrier: pkg.carrier,
    trackingNumber: maskTrackingNumber(pkg.trackingNumber),
    status: pkg.status,
    statusCode: pkg.statusCode,
    items: pkg.items,
    cachedEvents: pkg.cachedEvents,
    lastChecked: pkg.lastChecked,
  }));

  res.json({
    id: link.id,
    slug: link.slug,
    title: link.title,
    description: link.description ?? null,
    packages,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  });
});

// ── Admin: list all tracking links ────────────────────────────────────────────
router.get("/admin/tracking-links", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const links = await db.select().from(trackingLinksTable).orderBy(trackingLinksTable.createdAt);
  res.json(links);
});

// ── Admin: create tracking link ───────────────────────────────────────────────
router.post("/admin/tracking-links", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { title, description, slug: rawSlug } = req.body as { title?: string; description?: string; slug?: string };
  if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }

  const baseSlug = rawSlug?.trim() ? slugify(rawSlug.trim()) : slugify(title.trim());
  const slug = uniqueSlug(baseSlug);

  const [link] = await db.insert(trackingLinksTable).values({
    slug,
    title: title.trim(),
    description: description?.trim() || null,
    packages: [],
  }).returning();
  res.status(201).json(link);
});

// ── Admin: update tracking link metadata ─────────────────────────────────────
router.patch("/admin/tracking-links/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { title, description } = req.body as { title?: string; description?: string };
  const [existing] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const update: Partial<typeof trackingLinksTable.$inferInsert> = { updatedAt: new Date() };
  if (title?.trim()) update.title = title.trim();
  if (description !== undefined) update.description = description?.trim() || null;

  const [updated] = await db.update(trackingLinksTable).set(update).where(eq(trackingLinksTable.id, id)).returning();
  res.json(updated);
});

// ── Admin: delete tracking link ───────────────────────────────────────────────
router.delete("/admin/tracking-links/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  await db.delete(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  res.json({ ok: true });
});

// ── Admin: add package to tracking link ──────────────────────────────────────
router.post("/admin/tracking-links/:id/packages", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { label, carrier, carrierCode, trackingNumber, customTrackingUrl, notes, items } = req.body as {
    label?: string; carrier?: string; carrierCode?: number; trackingNumber?: string;
    customTrackingUrl?: string; notes?: string; items?: string[];
  };
  if (!label?.trim()) { res.status(400).json({ error: "Label is required" }); return; }
  if (!trackingNumber?.trim()) { res.status(400).json({ error: "Tracking number is required" }); return; }

  const [link] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  if (!link) { res.status(404).json({ error: "Tracking link not found" }); return; }

  const packages = (link.packages as TrackingPackage[]) ?? [];
  const newPkg: TrackingPackage = {
    id: randomUUID(),
    label: label.trim(),
    carrier: carrier?.trim() || "Auto",
    carrierCode: carrierCode ?? 0,
    trackingNumber: trackingNumber.trim(),
    customTrackingUrl: customTrackingUrl?.trim() || undefined,
    notes: notes?.trim() || undefined,
    status: "pending",
    statusCode: 0,
    items: (items ?? []).map(s => s.trim()).filter(Boolean),
    cachedEvents: [],
    lastChecked: null,
  };
  packages.push(newPkg);

  const [updated] = await db.update(trackingLinksTable)
    .set({ packages, updatedAt: new Date() })
    .where(eq(trackingLinksTable.id, id))
    .returning();
  res.status(201).json(updated);
});

// ── Admin: update package ─────────────────────────────────────────────────────
router.patch("/admin/tracking-links/:id/packages/:pkgId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id, pkgId } = req.params;
  const { label, carrier, carrierCode, trackingNumber, customTrackingUrl, notes, items } = req.body as {
    label?: string; carrier?: string; carrierCode?: number; trackingNumber?: string;
    customTrackingUrl?: string; notes?: string; items?: string[];
  };

  const [link] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  if (!link) { res.status(404).json({ error: "Tracking link not found" }); return; }

  const packages = (link.packages as TrackingPackage[]).map(pkg => {
    if (pkg.id !== pkgId) return pkg;
    return {
      ...pkg,
      ...(label?.trim() ? { label: label.trim() } : {}),
      ...(carrier !== undefined ? { carrier: carrier.trim() || "Auto" } : {}),
      ...(carrierCode !== undefined ? { carrierCode: carrierCode ?? 0 } : {}),
      ...(trackingNumber?.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
      ...(customTrackingUrl !== undefined ? { customTrackingUrl: customTrackingUrl?.trim() || undefined } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || undefined } : {}),
      ...(items !== undefined ? { items: items.map(s => s.trim()).filter(Boolean) } : {}),
    };
  });

  const [updated] = await db.update(trackingLinksTable)
    .set({ packages, updatedAt: new Date() })
    .where(eq(trackingLinksTable.id, id))
    .returning();
  res.json(updated);
});

// ── Admin: delete package ─────────────────────────────────────────────────────
router.delete("/admin/tracking-links/:id/packages/:pkgId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id, pkgId } = req.params;

  const [link] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  if (!link) { res.status(404).json({ error: "Not found" }); return; }

  const packages = (link.packages as TrackingPackage[]).filter(p => p.id !== pkgId);
  const [updated] = await db.update(trackingLinksTable)
    .set({ packages, updatedAt: new Date() })
    .where(eq(trackingLinksTable.id, id))
    .returning();
  res.json(updated);
});

// ── Admin: refresh package tracking from 17track ─────────────────────────────
router.post("/admin/tracking-links/:id/packages/:pkgId/refresh", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id, pkgId } = req.params;

  const [link] = await db.select().from(trackingLinksTable).where(eq(trackingLinksTable.id, id));
  if (!link) { res.status(404).json({ error: "Not found" }); return; }

  const packages = link.packages as TrackingPackage[];
  const pkgIdx = packages.findIndex(p => p.id === pkgId);
  if (pkgIdx === -1) { res.status(404).json({ error: "Package not found" }); return; }
  const pkg = packages[pkgIdx];

  const cCode = pkg.carrierCode ?? 0;
  await track17Register(pkg.trackingNumber, cCode);
  const accepted = await track17GetInfo(pkg.trackingNumber, cCode);

  if (!accepted) {
    packages[pkgIdx] = { ...pkg, lastChecked: new Date().toISOString() };
    await db.update(trackingLinksTable).set({ packages, updatedAt: new Date() }).where(eq(trackingLinksTable.id, id));
    res.json({ ok: false, reason: "Registered with 17track — data not yet available. Try again in a few minutes." });
    return;
  }

  const { status, statusCode, events } = parseTrack17(accepted);
  packages[pkgIdx] = { ...pkg, status, statusCode, cachedEvents: events, lastChecked: new Date().toISOString() };
  await db.update(trackingLinksTable).set({ packages, updatedAt: new Date() }).where(eq(trackingLinksTable.id, id));
  res.json({ ok: true, status, events: events.length });
});

export default router;

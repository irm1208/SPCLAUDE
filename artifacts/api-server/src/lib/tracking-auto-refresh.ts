/**
 * Auto-refresh tracking for all active GB parcels and tracking-link packages.
 * Runs on a schedule and updates stale (non-delivered) tracking entries.
 */
import { db, gbParcelsTable, gbParcelOptinsTable, accountsTable, groupBuysTable, trackingLinksTable, siteConfigTable, wholesaleShareMembersTable, wholesaleSharesTable, ordersTable } from "@workspace/db";
import { eq, and, ne, or, isNull, lt, inArray, sql } from "drizzle-orm";
import { sendTelegramMessageFull, getTemplate, renderTemplate } from "./telegram";
import type { TrackingPackage, TrackingEvent } from "@workspace/db";
import { registerScheduler } from "./scheduler-registry";
import { translateZh } from "./translate-zh";
import { resolveCarrierCode } from "../routes/gb-parcels";

const TRACK17_BASE = "https://api.17track.net/track/v2.4";

// How often to run the auto-refresh job (ms)
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Parcels/packages not checked within this window are considered stale
const STALE_AFTER_MS = 90 * 60 * 1000; // 90 minutes

// Delay between individual 17track API calls to avoid rate limiting
const API_CALL_DELAY_MS = 1200;

// Terminal statuses — skip these
const TERMINAL_STATUSES = new Set(["delivered", "undeliverable", "expired"]);

async function getTrack17Key(): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, "track17ApiKey"));
    return row?.value || process.env.TRACK17_API_KEY || null;
  } catch {
    return process.env.TRACK17_API_KEY || null;
  }
}

const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function track17Register(trackingNumber: string, carrierCode = 0): Promise<boolean> {
  const key = await getTrack17Key();
  if (!key) return false;
  try {
    const entry: Record<string, unknown> = carrierCode > 0
      ? { number: trackingNumber, carrier: carrierCode }
      : { number: trackingNumber };
    const res = await fetchWithTimeout(`${TRACK17_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify([entry]),
    });
    const json = await res.json() as {
      data?: {
        accepted?: unknown[];
        rejected?: Array<{ error?: { code?: number } }>;
      };
    };
    const accepted = json?.data?.accepted ?? [];
    if (accepted.length > 0) return true;
    const rejected = json?.data?.rejected ?? [];
    // -18019901 = already registered — treat as success
    return rejected.every(r => r.error?.code === -18019901) && rejected.length > 0;
  } catch {
    return false;
  }
}

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
const STATUS_REVERSE: Record<string, number> = {
  pending: 0, in_transit: 20, out_for_delivery: 30,
  attempted: 35, delivered: 40, exception: 50, expired: 60,
};

const COUNTRY_MAP: [string, string][] = [
  ["hong kong", "China"], ["china", "China"], [", cn", "China"],
  ["united kingdom", "United Kingdom"], ["england", "United Kingdom"],
  ["scotland", "United Kingdom"], [", uk", "United Kingdom"],
  ["united states", "United States"], [", usa", "United States"], [", us", "United States"],
  ["germany", "Germany"], ["france", "France"], ["netherlands", "Netherlands"],
  ["australia", "Australia"], ["canada", "Canada"], ["japan", "Japan"],
  ["south korea", "South Korea"], ["singapore", "Singapore"],
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
  const translated = translateZh(status);
  if (translated !== status) return translated;
  return status
    .replace(/signed\s+(for\s+)?by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/g, "Signed for")
    .replace(/received\s+by[:\s]+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+)*/gi, "Received")
    .trim();
}

async function track17GetInfo(trackingNumber: string, carrierCode = 0): Promise<unknown | null> {
  const key = await getTrack17Key();
  if (!key) return null;
  try {
    const entry: Record<string, unknown> = carrierCode > 0
      ? { number: trackingNumber, carrier: carrierCode }
      : { number: trackingNumber };
    const res = await fetchWithTimeout(`${TRACK17_BASE}/gettrackinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify([entry]),
    });
    const json = await res.json() as { data?: { accepted?: unknown[] } };
    const accepted = json?.data?.accepted ?? [];
    return accepted.length > 0 ? accepted[0] : null;
  } catch {
    return null;
  }
}

function parseTrack17Response(accepted: unknown): {
  status: string;
  statusCode: number;
  events: { date: string; status: string; location: string }[];
} {
  const a = accepted as V24Accepted;
  const trackInfo = a?.track_info ?? {};
  const rawStatus = trackInfo.latest_status?.status ?? "";
  const status = STATUS_STRING_MAP[rawStatus] ?? "pending";
  const statusCode = STATUS_REVERSE[status] ?? 0;

  const providers = trackInfo.tracking?.providers ?? [];
  const seen = new Set<string>();
  const events: { date: string; status: string; location: string }[] = [];
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Status display labels for notification messages
const STATUS_LABELS: Record<string, string> = {
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  attempted: "Delivery Attempted",
  exception: "Delivery Exception",
  returned: "Returned",
};

async function fireParcelStatusNotifications(
  parcelId: string,
  label: string,
  trackingNumber: string,
  status: string,
  groupBuyId: string,
): Promise<void> {
  // Find all opted-in members for this parcel
  const optins = await db
    .select({ telegramChatId: gbParcelOptinsTable.telegramChatId, telegramUsername: gbParcelOptinsTable.telegramUsername })
    .from(gbParcelOptinsTable)
    .where(and(
      eq(gbParcelOptinsTable.parcelId, parcelId),
      eq(gbParcelOptinsTable.optedIn, true),
    ));

  if (optins.length === 0) return;

  const [gb] = await db
    .select({ name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));

  const tn = trackingNumber ?? "";
  const masked = tn.length > 7 ? `${tn.slice(0, 3)}${"•".repeat(Math.min(tn.length - 7, 8))}${tn.slice(-4)}` : tn;
  const statusLabel = STATUS_LABELS[status] ?? status.replace(/_/g, " ");

  const emoji = status === "out_for_delivery" ? "🚚" : status === "attempted" ? "⚠️" : status === "exception" ? "🚨" : status === "delivered" ? "✅" : "📍";
  const trackingLine = tn ? `\nTracking: <code>${masked}</code>` : "";
  const { template: statusTpl } = await getTemplate("bot_tracking_status_update");
  const text = renderTemplate(statusTpl, {
    emoji,
    gb_name: gb?.name ?? groupBuyId,
    label,
    status_label: statusLabel,
    tracking_line: trackingLine,
  });

  const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
  const notifMarkup = {
    inline_keyboard: [[
      { text: "📦 Check status", callback_data: `ps:${parcelId}` },
      { text: "🌐 Track on site", url: `${appUrl}/track/parcel/${parcelId}` },
    ]],
  };

  for (const optin of optins) {
    await sendTelegramMessageFull(
      optin.telegramChatId,
      text,
      "HTML",
      { recipientType: "user", recipientUsername: optin.telegramUsername ?? undefined },
      { reply_markup: notifMarkup },
    ).catch(err => {
      console.error(`[tracking-auto-refresh] Failed to notify chatId=${optin.telegramChatId} for parcel ${parcelId}:`, err);
    });
    await sleep(300);
  }

  console.log(`[tracking-auto-refresh] Sent status "${status}" notifications for parcel ${parcelId} to ${optins.length} member(s)`);
}

function isStale(lastChecked: Date | null | undefined): boolean {
  if (!lastChecked) return true;
  return Date.now() - lastChecked.getTime() > STALE_AFTER_MS;
}

async function refreshGbParcels(): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);

  const parcels = await db
    .select()
    .from(gbParcelsTable)
    .where(
      and(
        ne(gbParcelsTable.trackingNumber, ""),
        // Only non-terminal statuses
        or(
          eq(gbParcelsTable.status, "pending"),
          eq(gbParcelsTable.status, "in_transit"),
          eq(gbParcelsTable.status, "out_for_delivery"),
          eq(gbParcelsTable.status, "attempted"),
          eq(gbParcelsTable.status, "exception"),
        ),
        or(
          isNull(gbParcelsTable.lastChecked),
          lt(gbParcelsTable.lastChecked, staleThreshold),
        ),
      ),
    );

  if (parcels.length === 0) {
    console.log("[tracking-auto-refresh] No stale GB parcels to refresh");
    return 0;
  }

  console.log(`[tracking-auto-refresh] Refreshing ${parcels.length} stale GB parcel(s)`);
  let refreshed = 0;

  for (const parcel of parcels) {
    try {
      if (!parcel.trackingNumber?.trim()) continue;

      const carrierCode = resolveCarrierCode(parcel.carrier ?? "");
      let registered = await track17Register(parcel.trackingNumber, carrierCode);
      // Fall back to auto-detect if specific carrier code failed
      const effectiveCode = (!registered && carrierCode > 0)
        ? (await track17Register(parcel.trackingNumber, 0) ? 0 : carrierCode)
        : carrierCode;
      if (!registered) registered = effectiveCode === 0;
      await sleep(500);
      const accepted = await track17GetInfo(parcel.trackingNumber, effectiveCode);

      if (!accepted) {
        await db
          .update(gbParcelsTable)
          .set({ lastChecked: new Date() })
          .where(eq(gbParcelsTable.id, parcel.id));
      } else {
        const { status, statusCode, events } = parseTrack17Response(accepted);
        const oldStatus = parcel.status;
        await db
          .update(gbParcelsTable)
          .set({ status, statusCode, cachedEvents: events, lastChecked: new Date() })
          .where(eq(gbParcelsTable.id, parcel.id));
        refreshed++;
        console.log(`[tracking-auto-refresh] Parcel ${parcel.id} (${parcel.trackingNumber}) carrier=${parcel.carrier}(${effectiveCode}): ${status}`);

        // Fire notifications if status changed and is neither pending nor delivered
        const SILENT_STATUSES = new Set(["pending", "delivered", "undeliverable", "expired"]);
        if (status !== oldStatus && !SILENT_STATUSES.has(status)) {
          await fireParcelStatusNotifications(parcel.id, parcel.label, parcel.trackingNumber ?? "", status, parcel.groupBuyId).catch(err => {
            console.error(`[tracking-auto-refresh] Notification error for parcel ${parcel.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error(`[tracking-auto-refresh] Error refreshing parcel ${parcel.id}:`, err);
    }

    await sleep(API_CALL_DELAY_MS);
  }

  return refreshed;
}

async function refreshTrackingLinks(): Promise<number> {
  let refreshed = 0;
  try {
    const links = await db.select().from(trackingLinksTable);

    for (const link of links) {
      const packages = (link.packages as TrackingPackage[]) ?? [];
      let changed = false;
      const updatedPackages = [...packages];

      for (let i = 0; i < updatedPackages.length; i++) {
        const pkg = updatedPackages[i];
        if (!pkg.trackingNumber?.trim()) continue;
        if (TERMINAL_STATUSES.has(pkg.status ?? "")) continue;

        const lastChecked = pkg.lastChecked ? new Date(pkg.lastChecked as string) : null;
        if (!isStale(lastChecked)) continue;

        try {
          await track17Register(pkg.trackingNumber);
          await sleep(500);
          const accepted = await track17GetInfo(pkg.trackingNumber);

          if (accepted) {
            const { status, statusCode, events } = parseTrack17Response(accepted);
            updatedPackages[i] = {
              ...pkg,
              status,
              statusCode,
              cachedEvents: events as TrackingEvent[],
              lastChecked: new Date().toISOString(),
            };
            refreshed++;
            changed = true;
            console.log(`[tracking-auto-refresh] Package ${pkg.id} (${pkg.trackingNumber}): ${status}`);
          } else {
            updatedPackages[i] = { ...pkg, lastChecked: new Date().toISOString() };
            changed = true;
          }
        } catch (err) {
          console.error(`[tracking-auto-refresh] Error refreshing package ${pkg.id}:`, err);
        }

        await sleep(API_CALL_DELAY_MS);
      }

      if (changed) {
        await db
          .update(trackingLinksTable)
          .set({ packages: updatedPackages })
          .where(eq(trackingLinksTable.id, link.id));
      }
    }
  } catch (err) {
    console.error("[tracking-auto-refresh] Error refreshing tracking links:", err);
  }

  return refreshed;
}

async function runRefresh(): Promise<void> {
  console.log("[tracking-auto-refresh] Starting auto-refresh run…");
  const key = await getTrack17Key();
  if (!key) {
    console.log("[tracking-auto-refresh] No 17track API key configured — skipping");
    return;
  }

  try {
    const parcelCount = await refreshGbParcels();
    const packageCount = await refreshTrackingLinks();
    const onwardCount = await refreshWholesaleOnwardParcels();
    const mainCount = await refreshWholesaleMainParcels();
    console.log(`[tracking-auto-refresh] Done — ${parcelCount} parcel(s), ${packageCount} package(s), ${onwardCount} onward parcel(s), ${mainCount} shared main parcel(s) updated`);
  } catch (err) {
    console.error("[tracking-auto-refresh] Run failed:", err);
  }
}

/**
 * Register + fetch + parse tracking events for any raw tracking number.
 * Used by the Telegram bot for direct-shipping orders (no GB parcel record).
 */
export async function fetchTrackingEventsForNumber(trackingNumber: string): Promise<{
  status: string;
  events: { date: string; status: string; location: string }[];
}> {
  let registered = await track17Register(trackingNumber, 0);
  if (!registered) registered = await track17Register(trackingNumber, 0);
  await sleep(600);
  const accepted = await track17GetInfo(trackingNumber, 0);
  if (!accepted) return { status: "pending", events: [] };
  const { status, events } = parseTrack17Response(accepted);
  return { status, events };
}

/**
 * Register + fetch + parse MASKED tracking for an onward wholesale-share parcel.
 * Returns the normalised status, numeric code, and masked event list (country-only
 * locations, names/addresses stripped) — safe to surface to the participant.
 */
export async function fetchOnwardTracking(trackingNumber: string, carrier: string | null | undefined): Promise<{
  status: string;
  statusCode: number;
  events: { date: string; status: string; location: string }[];
} | null> {
  const tn = trackingNumber.trim();
  if (!tn) return null;
  const carrierCode = resolveCarrierCode(carrier ?? "");
  let registered = await track17Register(tn, carrierCode);
  // Fall back to auto-detect if the specific carrier code was rejected.
  const effectiveCode = (!registered && carrierCode > 0)
    ? (await track17Register(tn, 0) ? 0 : carrierCode)
    : carrierCode;
  if (!registered) registered = effectiveCode === 0;
  await sleep(500);
  const accepted = await track17GetInfo(tn, effectiveCode);
  if (!accepted) return null;
  return parseTrack17Response(accepted);
}

/**
 * Refresh stale, non-terminal onward parcel tracking for wholesale-share members.
 * The combined order must be submitted for forwarding to have begun, so we only scan
 * members of submitted shares that carry a tracking number.
 */
async function refreshWholesaleOnwardParcels(): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);

  const members = await db
    .select()
    .from(wholesaleShareMembersTable)
    .where(
      and(
        ne(wholesaleShareMembersTable.onwardTrackingNumber, ""),
        or(
          isNull(wholesaleShareMembersTable.onwardTrackingStatus),
          eq(wholesaleShareMembersTable.onwardTrackingStatus, "pending"),
          eq(wholesaleShareMembersTable.onwardTrackingStatus, "in_transit"),
          eq(wholesaleShareMembersTable.onwardTrackingStatus, "out_for_delivery"),
          eq(wholesaleShareMembersTable.onwardTrackingStatus, "attempted"),
          eq(wholesaleShareMembersTable.onwardTrackingStatus, "exception"),
        ),
        or(
          isNull(wholesaleShareMembersTable.onwardTrackingChecked),
          lt(wholesaleShareMembersTable.onwardTrackingChecked, staleThreshold),
        ),
      ),
    );

  if (members.length === 0) {
    console.log("[tracking-auto-refresh] No stale wholesale onward parcels to refresh");
    return 0;
  }

  console.log(`[tracking-auto-refresh] Refreshing ${members.length} stale wholesale onward parcel(s)`);
  let refreshed = 0;

  for (const m of members) {
    const tn = m.onwardTrackingNumber?.trim();
    if (!tn) continue;
    try {
      const result = await fetchOnwardTracking(tn, m.onwardCarrier);
      if (!result) {
        await db.update(wholesaleShareMembersTable)
          .set({ onwardTrackingChecked: new Date() })
          .where(eq(wholesaleShareMembersTable.id, m.id));
      } else {
        await db.update(wholesaleShareMembersTable)
          .set({
            onwardTrackingStatus: result.status,
            onwardTrackingStatusCode: result.statusCode,
            onwardTrackingEvents: result.events,
            onwardTrackingChecked: new Date(),
          })
          .where(eq(wholesaleShareMembersTable.id, m.id));
        refreshed++;
      }
    } catch (err) {
      console.error(`[tracking-auto-refresh] Error refreshing onward parcel for member ${m.id}:`, err);
    }
    await sleep(API_CALL_DELAY_MS);
  }

  return refreshed;
}

// Collapses concurrent refreshes for the SAME share into one. When admin sets the
// tracking number it is written to every member order, firing one PATCH (and one
// one-shot refresh) per member — without this guard they would all hit 17track for
// the same number at once. Also stops a scheduled run from overlapping an admin one-shot.
const mainRefreshInFlight = new Set<string>();
// Marks a share whose refresh was requested WHILE one was already in flight (same
// process). The in-flight run re-checks this flag when it finishes and re-runs once,
// so an admin number change during a fetch is never silently dropped.
const mainRefreshDirty = new Set<string>();

// Resolve the canonical main-parcel tracking number for a share from its member
// orders (orders.trackingNumber is the source of truth; admin writes the same number
// to every member order). Returns null when no member order carries a tracking number.
async function loadCanonicalMainTracking(shareId: string): Promise<{ number: string; carrier: string | null } | null> {
  const rows = await db
    .select({ tn: ordersTable.trackingNumber, tns: ordersTable.trackingNumbers, carrier: ordersTable.shippingCarrier })
    .from(ordersTable)
    .where(and(eq(ordersTable.sharedOrderId, shareId), eq(ordersTable.orderType, "wholesale_shared")));
  for (const r of rows) {
    const single = r.tn?.trim();
    if (single) return { number: single, carrier: r.carrier ?? null };
    const first = Array.isArray(r.tns) && r.tns.length ? String(r.tns[0]).trim() : "";
    if (first) return { number: first, carrier: r.carrier ?? null };
  }
  return null;
}

/**
 * Refresh the MASKED main-parcel (vendor → recipient) tracking cache for one share.
 * orders.trackingNumber is the source of truth; wholesale_shares.mainTracking* is a
 * cache keyed by mainTrackingNumber. Collapses concurrent calls for the same share
 * (in-flight guard) but re-runs once if another call arrived mid-fetch (dirty flag),
 * so an admin number change during a fetch is never dropped.
 */
export async function refreshWholesaleMainParcelForShare(shareId: string): Promise<{ updated: boolean }> {
  if (mainRefreshInFlight.has(shareId)) {
    // A refresh is already running for this share; remember another was requested so
    // the running one re-checks after it finishes (see the loop below).
    mainRefreshDirty.add(shareId);
    return { updated: false };
  }
  mainRefreshInFlight.add(shareId);
  try {
    let updated = false;
    // Track the number already fetched THIS cycle so a dirty re-run for the SAME
    // unchanged number collapses to a single 17track call (the common admin-burst case).
    let fetchedNumber: string | null = null;
    do {
      mainRefreshDirty.delete(shareId);
      const r = await reconcileAndFetchMainParcelOnce(shareId, fetchedNumber);
      updated = updated || r.updated;
      fetchedNumber = r.fetchedNumber;
    } while (mainRefreshDirty.has(shareId));
    return { updated };
  } catch (err) {
    console.error(`[tracking-auto-refresh] Error refreshing main parcel for share ${shareId}:`, err);
    return { updated: false };
  } finally {
    mainRefreshDirty.delete(shareId);
    mainRefreshInFlight.delete(shareId);
  }
}

/**
 * One reconcile+fetch pass for a share's main-parcel cache. All cache writes are
 * CONDITIONAL on the previously-observed cache key (null-safe) and check the affected
 * row count, so a concurrent (even cross-process) writer that already moved the key to
 * a newer number can never be clobbered. Returns the number actually fetched so the
 * caller can skip a redundant fetch on a dirty re-run.
 */
async function reconcileAndFetchMainParcelOnce(
  shareId: string,
  alreadyFetchedNumber: string | null,
): Promise<{ updated: boolean; fetchedNumber: string | null }> {
  const [share] = await db.select().from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id, shareId));
  if (!share) return { updated: false, fetchedNumber: alreadyFetchedNumber };

  const canonical = await loadCanonicalMainTracking(shareId);

  // Null-safe guard on the cache key we just read, so our write only lands if nobody
  // else moved the key in the meantime.
  const oldKeyMatch = share.mainTrackingNumber == null
    ? isNull(wholesaleSharesTable.mainTrackingNumber)
    : eq(wholesaleSharesTable.mainTrackingNumber, share.mainTrackingNumber);

  // Number cleared/absent → drop the cached feed so a stale timeline never shows.
  if (!canonical) {
    if (share.mainTrackingNumber) {
      await db.update(wholesaleSharesTable)
        .set({
          mainTrackingNumber: null,
          mainTrackingCarrier: null,
          mainTrackingStatus: null,
          mainTrackingStatusCode: null,
          mainTrackingEvents: [],
          mainTrackingChecked: null,
        })
        .where(and(eq(wholesaleSharesTable.id, shareId), oldKeyMatch));
    }
    return { updated: false, fetchedNumber: null };
  }

  // Already fetched this exact number this cycle and it hasn't changed → skip a
  // redundant 17track call (collapses an admin burst into a single fetch).
  if (canonical.number === alreadyFetchedNumber && share.mainTrackingNumber === canonical.number) {
    return { updated: false, fetchedNumber: alreadyFetchedNumber };
  }

  // Admin changed the number → reset the cache to the new key BEFORE fetching, guarded
  // on the old key. If no row matched, another writer already reconciled → bail.
  if (share.mainTrackingNumber !== canonical.number) {
    const reset = await db.update(wholesaleSharesTable)
      .set({
        mainTrackingNumber: canonical.number,
        mainTrackingCarrier: canonical.carrier,
        mainTrackingStatus: null,
        mainTrackingStatusCode: null,
        mainTrackingEvents: [],
        mainTrackingChecked: null,
      })
      .where(and(eq(wholesaleSharesTable.id, shareId), oldKeyMatch))
      .returning({ id: wholesaleSharesTable.id });
    if (reset.length === 0) return { updated: false, fetchedNumber: alreadyFetchedNumber };
  }

  const result = await fetchOnwardTracking(canonical.number, canonical.carrier);
  if (!result) {
    // Couldn't fetch — just stamp checked (guarded on the cache key).
    await db.update(wholesaleSharesTable)
      .set({ mainTrackingChecked: new Date() })
      .where(and(eq(wholesaleSharesTable.id, shareId), eq(wholesaleSharesTable.mainTrackingNumber, canonical.number)));
    return { updated: false, fetchedNumber: canonical.number };
  }

  const write = await db.update(wholesaleSharesTable)
    .set({
      mainTrackingStatus: result.status,
      mainTrackingStatusCode: result.statusCode,
      mainTrackingEvents: result.events,
      mainTrackingCarrier: canonical.carrier,
      mainTrackingChecked: new Date(),
    })
    .where(and(eq(wholesaleSharesTable.id, shareId), eq(wholesaleSharesTable.mainTrackingNumber, canonical.number)))
    .returning({ id: wholesaleSharesTable.id });
  return { updated: write.length > 0, fetchedNumber: canonical.number };
}

/**
 * Refresh stale, non-terminal main-parcel tracking for submitted wholesale shares.
 * Scans from the member orders (the source of truth) so a share is picked up even if
 * its cache was never populated. The combined parcel only ships once the order is
 * submitted (everyone paid), so we only scan submitted shares.
 */
async function refreshWholesaleMainParcels(): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_MS);

  const shares = await db
    .selectDistinct({ id: wholesaleSharesTable.id })
    .from(wholesaleSharesTable)
    .innerJoin(ordersTable, eq(ordersTable.sharedOrderId, wholesaleSharesTable.id))
    .where(
      and(
        eq(wholesaleSharesTable.status, "submitted"),
        eq(ordersTable.orderType, "wholesale_shared"),
        // A member order carries a usable number (single non-empty OR a non-empty
        // array) — mirrors loadCanonicalMainTracking so array-only rows aren't missed.
        or(
          ne(ordersTable.trackingNumber, ""),
          sql`jsonb_array_length(coalesce(${ordersTable.trackingNumbers}, '[]'::jsonb)) > 0`,
        ),
        // Refresh when the cached status is non-terminal (or never fetched), OR when the
        // cache key is stale vs a member order's live number. The latter self-heals the
        // rare multi-process case where a guarded reset lost its race and the cache is
        // now pinned to a stale (possibly terminal) number that the status filter alone
        // would never pick up again.
        or(
          isNull(wholesaleSharesTable.mainTrackingStatus),
          eq(wholesaleSharesTable.mainTrackingStatus, "pending"),
          eq(wholesaleSharesTable.mainTrackingStatus, "in_transit"),
          eq(wholesaleSharesTable.mainTrackingStatus, "out_for_delivery"),
          eq(wholesaleSharesTable.mainTrackingStatus, "attempted"),
          eq(wholesaleSharesTable.mainTrackingStatus, "exception"),
          and(
            ne(ordersTable.trackingNumber, ""),
            sql`${wholesaleSharesTable.mainTrackingNumber} IS DISTINCT FROM ${ordersTable.trackingNumber}`,
          ),
        ),
        or(
          isNull(wholesaleSharesTable.mainTrackingChecked),
          lt(wholesaleSharesTable.mainTrackingChecked, staleThreshold),
        ),
      ),
    );

  if (shares.length === 0) {
    console.log("[tracking-auto-refresh] No stale wholesale main parcels to refresh");
    return 0;
  }

  console.log(`[tracking-auto-refresh] Refreshing ${shares.length} stale wholesale main parcel(s)`);
  let refreshed = 0;
  for (const s of shares) {
    try {
      const r = await refreshWholesaleMainParcelForShare(s.id);
      if (r.updated) refreshed++;
    } catch (err) {
      console.error(`[tracking-auto-refresh] Error refreshing main parcel for share ${s.id}:`, err);
    }
    await sleep(API_CALL_DELAY_MS);
  }
  return refreshed;
}

export async function refreshSingleGbParcel(parcelId: string): Promise<{ status: string; updated: boolean }> {
  const [parcel] = await db.select().from(gbParcelsTable).where(eq(gbParcelsTable.id, parcelId));
  if (!parcel || !parcel.trackingNumber?.trim()) return { status: parcel?.status ?? "unknown", updated: false };

  const carrierCode = resolveCarrierCode(parcel.carrier ?? "");
  let registered = await track17Register(parcel.trackingNumber, carrierCode);
  // Fall back to auto-detect if specific carrier code failed
  const effectiveCode = (!registered && carrierCode > 0)
    ? (await track17Register(parcel.trackingNumber, 0) ? 0 : carrierCode)
    : carrierCode;
  await sleep(500);
  const accepted = await track17GetInfo(parcel.trackingNumber, effectiveCode);

  if (!accepted) {
    await db.update(gbParcelsTable).set({ lastChecked: new Date() }).where(eq(gbParcelsTable.id, parcelId));
    return { status: parcel.status, updated: false };
  }

  const { status, statusCode, events } = parseTrack17Response(accepted);
  const oldStatus = parcel.status;
  await db.update(gbParcelsTable).set({ status, statusCode, cachedEvents: events, lastChecked: new Date() }).where(eq(gbParcelsTable.id, parcelId));

  const SILENT_STATUSES = new Set(["pending", "delivered", "undeliverable", "expired"]);
  if (status !== oldStatus && !SILENT_STATUSES.has(status)) {
    await fireParcelStatusNotifications(parcel.id, parcel.label, parcel.trackingNumber, status, parcel.groupBuyId).catch(() => {});
  }

  return { status, updated: status !== oldStatus };
}

export function startTrackingAutoRefresh(): void {
  registerScheduler({
    name: "tracking-auto-refresh",
    label: "Tracking refresh (17track)",
    description: "Refreshes parcel and package tracking via the 17track API.",
    defaultIntervalMs: REFRESH_INTERVAL_MS,
    minIntervalMs: 5 * 60 * 1000,
    maxIntervalMs: 24 * 60 * 60 * 1000,
    initialDelayMs: 5 * 60 * 1000,
    run: runRefresh,
  });
}

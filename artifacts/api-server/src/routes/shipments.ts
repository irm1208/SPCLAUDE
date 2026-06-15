import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import { shipmentsTable, siteConfigTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { MaskedEvent } from "@workspace/db";

const router = Router();

// ─── site_config helpers ──────────────────────────────────────
async function getConfig(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}
async function setConfig(key: string, value: string) {
  await db.insert(siteConfigTable).values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}
function sha256(s: string) { return createHash("sha256").update(s).digest("hex"); }
function safeStrEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) { timingSafeEqual(bufA, Buffer.alloc(bufA.length)); return false; }
    return timingSafeEqual(bufA, bufB);
  } catch { return false; }
}

async function getTrack17Key(): Promise<string | null> {
  return (await getConfig("track17ApiKey")) || process.env.TRACK17_API_KEY || null;
}

// ─── 17track API helpers ──────────────────────────────────────
const TRACK17_BASE = "https://api.17track.net/track/v2.2";

async function track17Register(trackingNumber: string): Promise<void> {
  const key = await getTrack17Key();
  if (!key) return;
  try {
    await fetch(`${TRACK17_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify({ data: [{ number: trackingNumber, carrier: 0 }] }),
    });
  } catch { /* silent */ }
}

async function track17GetInfo(trackingNumber: string): Promise<any | null> {
  const key = await getTrack17Key();
  if (!key) return null;
  try {
    const res = await fetch(`${TRACK17_BASE}/gettrackinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify({ data: [{ number: trackingNumber, carrier: 0 }] }),
    });
    const json = await res.json() as { code?: number; data?: { accepted?: any[] } };
    if (json?.code !== 0) return null;
    return json?.data?.accepted?.[0] ?? null;
  } catch { return null; }
}

// ─── Masking helpers ──────────────────────────────────────────
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

function maskLocation(location: string): string {
  if (!location) return "";
  const lower = location.toLowerCase();
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

const STATUS_CODE_MAP: Record<number, string> = {
  0: "pending", 10: "pending",
  20: "in_transit",
  30: "out_for_delivery",
  35: "attempted",
  40: "delivered",
  50: "exception",
  60: "expired",
};

function parseTrack17Response(accepted: any): { status: string; statusCode: number; events: MaskedEvent[] } {
  const track = accepted?.track ?? {};
  const z2: number = track.z2 ?? 0;
  const status = STATUS_CODE_MAP[z2] ?? "pending";

  const rawEvents: any[] = track.z1 ?? [];
  const latest = track.z3 ?? null;

  const allRaw = latest ? [latest, ...rawEvents] : rawEvents;

  const events: MaskedEvent[] = allRaw
    .map((e: any) => ({
      date: e.a ?? "",
      status: maskStatus(e.z ?? ""),
      location: maskLocation(e.l ?? ""),
    }))
    .filter(e => e.status);

  return { status, statusCode: z2, events };
}

// ─── Fetch & cache a single shipment ─────────────────────────
async function refreshShipment(shipment: typeof shipmentsTable.$inferSelect): Promise<void> {
  await track17Register(shipment.trackingNumber);
  const accepted = await track17GetInfo(shipment.trackingNumber);
  if (!accepted) return;

  const { status, statusCode, events } = parseTrack17Response(accepted);

  await db.update(shipmentsTable)
    .set({
      status,
      statusCode,
      cachedEvents: JSON.stringify(events),
      lastChecked: new Date(),
    })
    .where(eq(shipmentsTable.id, shipment.id));
}

// ─── Public: masked shipment list ────────────────────────────
router.get("/shipments", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.active, true))
      .orderBy(desc(shipmentsTable.createdAt));

    const masked = rows.map(r => ({
      id: r.id,
      label: r.label,
      carrier: r.carrier,
      status: r.status,
      origin: r.origin,
      estimatedDelivery: r.estimatedDelivery,
      events: (() => { try { return JSON.parse(r.cachedEvents ?? "[]"); } catch { return []; } })(),
      lastChecked: r.lastChecked,
      createdAt: r.createdAt,
    }));

    res.json(masked);
  } catch { res.status(500).json({ error: "Failed to load shipments" }); }
});

// ─── Admin: list all (with tracking numbers) ─────────────────
router.get("/admin/shipments", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db.select().from(shipmentsTable).orderBy(desc(shipmentsTable.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ─── Admin: create ────────────────────────────────────────────
router.post("/admin/shipments", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { label, carrier, trackingNumber, origin, estimatedDelivery, notes, active } = req.body;
  if (!label?.trim() || !trackingNumber?.trim()) {
    res.status(400).json({ error: "label and trackingNumber are required" });
    return;
  }
  try {
    const id = randomUUID();
    await db.insert(shipmentsTable).values({
      id,
      label: label.trim(),
      carrier: (carrier ?? "Auto").trim(),
      trackingNumber: trackingNumber.trim(),
      origin: (origin ?? "China").trim(),
      estimatedDelivery: estimatedDelivery?.trim() || null,
      notes: notes?.trim() || null,
      active: active !== false,
      status: "pending",
      cachedEvents: "[]",
    });
    const [row] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id));

    // Fire-and-forget first track fetch
    refreshShipment(row).catch(() => {});

    res.json(row);
  } catch { res.status(500).json({ error: "Failed to create shipment" }); }
});

// ─── Admin: update ────────────────────────────────────────────
router.put("/admin/shipments/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { label, carrier, trackingNumber, origin, estimatedDelivery, notes, active, status } = req.body;
  try {
    const updates: Partial<typeof shipmentsTable.$inferInsert> = {};
    if (label !== undefined) updates.label = label.trim();
    if (carrier !== undefined) updates.carrier = carrier.trim();
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber.trim();
    if (origin !== undefined) updates.origin = origin.trim();
    if (estimatedDelivery !== undefined) updates.estimatedDelivery = estimatedDelivery?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (active !== undefined) updates.active = active;
    if (status !== undefined) updates.status = status;

    await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, id));
    const [row] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id));
    res.json(row);
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// ─── Admin: delete ────────────────────────────────────────────
router.delete("/admin/shipments/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.delete(shipmentsTable).where(eq(shipmentsTable.id, req.params.id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// ─── Admin: force-refresh from 17track ───────────────────────
router.post("/admin/shipments/:id/refresh", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id));
    if (!shipment) { res.status(404).json({ error: "Not found" }); return; }

    if (!(await getTrack17Key())) {
      res.status(422).json({ error: "17track API key not configured" });
      return;
    }

    await refreshShipment(shipment);
    const [updated] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id));
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to refresh" }); }
});

// ─── Admin: get 17track config status ─────────────────────────
router.get("/admin/track17/config", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rawKey = await getConfig("track17ApiKey");
  const hasKey = !!(rawKey || process.env.TRACK17_API_KEY);
  const hasChangeCode = !!(await getConfig("track17ChangeCodeHash"));
  const keySource = rawKey ? "db" : process.env.TRACK17_API_KEY ? "env" : null;
  const maskedKey = rawKey
    ? rawKey.slice(0, 4) + "•".repeat(Math.max(0, rawKey.length - 8)) + rawKey.slice(-4)
    : process.env.TRACK17_API_KEY ? "set via environment variable" : null;
  res.json({ hasKey, hasChangeCode, keySource, maskedKey });
});

// ─── Admin: set / change 17track API key ──────────────────────
router.post("/admin/track17/api-key", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { apiKey, changeCode } = req.body;
  const cleanKey = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!cleanKey) { res.status(400).json({ error: "API key is required" }); return; }

  const storedHash = await getConfig("track17ChangeCodeHash");
  if (storedHash) {
    if (!changeCode || !safeStrEqual(sha256(String(changeCode)), storedHash)) {
      res.status(403).json({ error: "Incorrect change code" });
      return;
    }
  }

  await setConfig("track17ApiKey", cleanKey);
  res.json({ ok: true });
});

// ─── Admin: test 17track API key ─────────────────────────────
const TRACK17_ERROR_HINTS: Record<number, string> = {
  [-18010013]: "API plan not active — go to 17track.net → API → Apply for API access and wait for approval.",
  [-18010002]: "No permission — your API key may not have access to this endpoint.",
  [-18010001]: "Invalid API key format.",
};

router.post("/admin/track17/test", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const key = await getTrack17Key();
  if (!key) {
    res.status(422).json({ ok: false, error: "No API key configured" });
    return;
  }
  try {
    // Use register with a real-format tracking number.
    // If the key is valid, 17track returns code 0 (accepted) or code -2 with per-item errors
    // (rejected/invalid number format). Both indicate a live, authenticated connection.
    // A true auth failure returns HTTP 401 or an outer code that is not 0 or -2.
    const testRes = await fetch(`${TRACK17_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "17token": key },
      body: JSON.stringify({ data: [{ number: "RR000000000CN", carrier: 0 }] }),
    });
    let json: { code?: number; message?: string; data?: any } = {};
    try { json = await testRes.json() as typeof json; } catch { /* not JSON */ }

    const outerCode = json?.code;
    // code 0 = all accepted; code -2 = partial/all rejected at item level (key still valid)
    if (outerCode === 0 || outerCode === -2) {
      res.json({ ok: true, message: "API key is valid — 17track is connected and ready." });
    } else {
      const hint = TRACK17_ERROR_HINTS[outerCode as number];
      const base = `17track error ${outerCode}`;
      res.json({
        ok: false,
        error: hint ? `${base} — ${hint}` : `${base}: ${json?.message ?? "Unknown error"}`,
      });
    }
  } catch (e: any) {
    res.json({ ok: false, error: `Could not reach 17track API: ${e?.message ?? "Network error"}` });
  }
});

// ─── Admin: set / change the change code ─────────────────────
router.post("/admin/track17/change-code", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { currentCode, newCode } = req.body;

  if (!newCode || typeof newCode !== "string" || newCode.trim().length < 6) {
    res.status(400).json({ error: "New code must be at least 6 characters" });
    return;
  }

  const storedHash = await getConfig("track17ChangeCodeHash");
  if (storedHash) {
    if (!currentCode || !safeStrEqual(sha256(String(currentCode)), storedHash)) {
      res.status(403).json({ error: "Current code is incorrect" });
      return;
    }
  }

  await setConfig("track17ChangeCodeHash", sha256(newCode.trim()));
  res.json({ ok: true });
});

export default router;

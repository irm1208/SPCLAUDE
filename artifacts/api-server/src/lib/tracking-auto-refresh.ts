/**
 * Auto-refresh tracking for all active GB parcels and tracking-link packages.
 * Runs on a schedule and updates stale (non-delivered) tracking entries.
 */
import { db, gbParcelsTable, gbParcelOptinsTable, accountsTable, groupBuysTable, trackingLinksTable, siteConfigTable } from "@workspace/db";
import { eq, and, ne, or, isNull, lt, inArray } from "drizzle-orm";
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
    console.log(`[tracking-auto-refresh] Done — ${parcelCount} parcel(s), ${packageCount} package(s) updated`);
  } catch (err) {
    console.error("[tracking-auto-refresh] Run failed:", err);
  }
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

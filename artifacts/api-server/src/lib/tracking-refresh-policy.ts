export const TRACKING_STALE_AFTER_MS = 6 * 60 * 60 * 1000;
export const TRACKING_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
export const TRACKING_FAILURE_BACKOFF_MS = 30 * 60 * 1000;
export const TRACKING_MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export const TERMINAL_TRACKING_STATUSES = new Set([
  "delivered",
  "undeliverable",
  "expired",
]);

const PERSISTED_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function normalizeTrackingNumber(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export function trackingRefreshKey(
  domain: string,
  trackingNumber: string,
  carrierCode?: number,
): string {
  return `${domain}:${normalizeTrackingNumber(trackingNumber)}:${carrierCode ?? 0}`;
}

function timestamp(value: Date | string | null | undefined): number | null {
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value !== "string" || !PERSISTED_TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return parsed;
}

export function isTrackingRefreshDue(
  lastChecked: Date | string | null | undefined,
  status: string | null | undefined,
  now = Date.now(),
): boolean {
  if (TERMINAL_TRACKING_STATUSES.has(status ?? "")) return false;
  const checked = timestamp(lastChecked);
  return checked === null || now - checked >= TRACKING_STALE_AFTER_MS;
}

export function isManualTrackingRefreshAllowed(
  lastChecked: Date | string | null | undefined,
  status: string | null | undefined,
  now = Date.now(),
): boolean {
  if (TERMINAL_TRACKING_STATUSES.has(status ?? "")) return false;
  const checked = timestamp(lastChecked);
  return checked === null || now - checked >= TRACKING_MANUAL_REFRESH_COOLDOWN_MS;
}
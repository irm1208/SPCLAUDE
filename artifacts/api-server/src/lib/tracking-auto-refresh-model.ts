import { getTrackingPackages, projectTrackingPackages, trackingCarrierCode, type TrackingSource } from "@workspace/shipping/tracking";
import { isWholesaleTrackingAlertStatus } from "./wholesale-tracking";

export type WholesaleParcelDetail = {
  trackingNumber: string;
  carrier?: string;
  status: string | null;
  statusCode?: string;
  events: Array<{ date: string; status: string; location: string }>;
  lastChecked: string | null;
};

const TERMINAL_STATUSES = new Set(["delivered", "undeliverable", "expired"]);

export function parcelNeedsRefresh(parcel: WholesaleParcelDetail | undefined): boolean {
  return !TERMINAL_STATUSES.has(parcel?.status ?? "");
}

export function shouldSkipWholesaleRefresh(
  trackingNumbers: string[],
  details: Record<string, WholesaleParcelDetail>,
): boolean {
  return trackingNumbers.length > 0 && trackingNumbers.every(number => !!details[number] && !parcelNeedsRefresh(details[number]));
}

export function reconcileWholesaleTrackingCache(
  previousNumbers: string[],
  nextNumbers: string[],
  details: Record<string, WholesaleParcelDetail>,
): Partial<{
  trackingDetails: Record<string, WholesaleParcelDetail>;
  trackingStatus: null;
  trackingEvents: null;
  trackingLastChecked: null;
}> {
  const trackingDetails = Object.fromEntries(nextNumbers
    .filter(number => !!details[number])
    .map(number => [number, details[number]]));
  if (previousNumbers[0] !== nextNumbers[0]) {
    return { trackingDetails, trackingStatus: null, trackingEvents: null, trackingLastChecked: null };
  }
  return { trackingDetails };
}

export function normalizeWholesaleTrackingDetails(value: unknown): Record<string, WholesaleParcelDetail> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const details: Record<string, WholesaleParcelDetail> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    if (typeof entry.trackingNumber !== "string" || entry.trackingNumber !== key || ["__proto__", "constructor", "prototype"].includes(key) || (entry.status !== null && typeof entry.status !== "string") ||
      (entry.statusCode !== undefined && typeof entry.statusCode !== "string") ||
      (entry.carrier !== undefined && typeof entry.carrier !== "string") ||
      (entry.lastChecked !== null && typeof entry.lastChecked !== "string") || !Array.isArray(entry.events)) continue;
    const events = entry.events.filter((event): event is { date: string; status: string; location: string } =>
      !!event && typeof event === "object" && typeof (event as Record<string, unknown>).date === "string" &&
      typeof (event as Record<string, unknown>).status === "string" && typeof (event as Record<string, unknown>).location === "string");
    details[key] = {
      trackingNumber: entry.trackingNumber, status: entry.status,
      ...(typeof entry.statusCode === "string" ? { statusCode: entry.statusCode } : {}),
      ...(typeof entry.carrier === "string" ? { carrier: entry.carrier } : {}),
      events, lastChecked: entry.lastChecked,
    };
  }
  return details;
}

/** Applies only successful lookups, intentionally retaining unavailable parcel data. */
export function mergeWholesaleParcelResults(
  previous: Record<string, WholesaleParcelDetail>,
  successful: Record<string, WholesaleParcelDetail>,
): Record<string, WholesaleParcelDetail> {
  return { ...previous, ...successful };
}

/** Keeps historical singular fields compatible with the canonical first parcel. */
export function selectWholesaleCompatibilityFields(
  trackingNumbers: string[],
  details: Record<string, WholesaleParcelDetail>,
  legacy: { trackingStatus: string | null; trackingEvents: Array<{ date: string; status: string; location: string }> | null; trackingLastChecked: Date | null },
) {
  const primary = details[trackingNumbers[0]];
  return {
    trackingStatus: primary?.status ?? legacy.trackingStatus,
    trackingEvents: primary?.events ?? legacy.trackingEvents,
    trackingLastChecked: primary?.lastChecked ? new Date(primary.lastChecked) : legacy.trackingLastChecked,
  };
}

/** Evaluate staleness per leg, never from the international compatibility timestamp. */
export function trackingRefreshCandidates(source: TrackingSource, now: number, staleAfterMs: number) {
  const packages = getTrackingPackages(source);
  const views = projectTrackingPackages(source);
  return packages.flatMap((pkg, index) => {
    const view = views[index];
    return (["international", "local"] as const).flatMap(role => {
      const leg = view[role];
      if (!leg || TERMINAL_STATUSES.has(leg.status ?? "")) return [];
      const checked = leg.lastChecked ? Date.parse(leg.lastChecked) : NaN;
      if (Number.isFinite(checked) && now - checked < staleAfterMs) return [];
      return [{ trackingNumber: leg.trackingNumber, carrierCode: trackingCarrierCode(pkg, role) ?? 0 }];
    });
  });
}

/** A cache transition yields at most one milestone per physical package. */
export function changedPackageMilestones(source: TrackingSource, details: Record<string, WholesaleParcelDetail>) {
  const before = new Map(projectTrackingPackages(source).map(p => [p.id, p.status]));
  return projectTrackingPackages({ ...source, trackingDetails: details }).filter(p =>
    p.status && isWholesaleTrackingAlertStatus(p.status) && before.get(p.id) !== p.status);
}
import { MAX_TRACKING_NUMBERS, type TrackingPackage } from "@workspace/shipping/tracking";

export interface BulkTrackingLine {
  code: string;
  trackingNumber?: string;
  trackingNumbers?: string[];
  trackingPackages?: TrackingPackage[];
  expectedTrackingSnapshot?: string;
  items?: { name: string; qty: number }[];
}

const clean = (value: string | undefined) => (value ?? "").trim();

export function newTrackingPackage(
  internationalTrackingNumber = "",
  courier = "other",
  localTrackingNumber: string | null = null,
): TrackingPackage {
  return {
    id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    courier,
    internationalTrackingNumber,
    localTrackingNumber,
  };
}

export function parseBulkTrackingCsv(raw: string): BulkTrackingLine[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const columns = line.split(",").map(clean);
      const [code, second, international, local] = columns;
      if (!code) throw new Error(`Line ${index + 1}: order code is required`);

      if (columns.length <= 2) {
        return { code, trackingNumber: second };
      }
      if (second.toLowerCase() !== "bmurfs") {
        throw new Error(`Line ${index + 1}: four-column package rows must use BMURFS`);
      }
      if (!international) {
        throw new Error(`Line ${index + 1}: international tracking number is required`);
      }
      const trackingPackage = newTrackingPackage(international, "bmurfs", local || null);
      return {
        code,
        trackingPackages: [trackingPackage],
      };
    });
}

export function trackingPackageErrors(packages: TrackingPackage[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const numberCount = packages.reduce((count, pkg) => count + 1 + (pkg.localTrackingNumber ? 1 : 0), 0);
  if (numberCount > MAX_TRACKING_NUMBERS) errors.push(`At most ${MAX_TRACKING_NUMBERS} tracking numbers are supported.`);
  packages.forEach((pkg, index) => {
    if (!pkg.internationalTrackingNumber.trim()) errors.push(`Package ${index + 1} needs an international tracking number.`);
    if (pkg.localTrackingNumber && pkg.courier.toLowerCase() !== "bmurfs") {
      errors.push(`Package ${index + 1}: remove or unpair the local number before changing courier.`);
    }
    for (const number of [pkg.internationalTrackingNumber, pkg.localTrackingNumber]) {
      const normalized = number?.trim().toLowerCase();
      if (!normalized) continue;
      if (seen.has(normalized)) errors.push(`Tracking number ${number?.trim()} is used more than once.`);
      seen.add(normalized);
    }
  });
  return errors;
}

export function canApplyReviewedShipment(reviewWarnings: string[] | undefined, acknowledged: boolean): boolean {
  return !reviewWarnings?.length || acknowledged;
}

export function bindTrackingPackagesDraft(
  draft: Record<string, unknown>,
  trackingPackages: TrackingPackage[],
  persistedTrackingSnapshot: string | undefined,
): Record<string, unknown> {
  return {
    ...draft,
    trackingPackages,
    expectedTrackingSnapshot: Object.prototype.hasOwnProperty.call(draft, "expectedTrackingSnapshot")
      ? draft.expectedTrackingSnapshot
      : persistedTrackingSnapshot,
  };
}

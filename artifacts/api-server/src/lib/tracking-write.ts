import {
  canonicalTrackingNumbers,
  flattenTrackingPackages,
  getTrackingPackages,
  normalizeTrackingPackages,
  trackingNumbersChanged,
  trackingSnapshot,
  type TrackingPackage,
  type TrackingSource,
} from "@workspace/shipping/tracking";
import {
  normalizeWholesaleTrackingDetails,
  reconcileWholesaleTrackingCache,
} from "./tracking-auto-refresh-model";

type ShippedItem = { name: string; qty: number };

export type TrackingWriteSource = TrackingSource & {
  trackingPackages?: unknown;
  trackingDetails?: unknown;
  trackingShippedItems?: unknown;
  orderType?: string | null;
  sharedOrderId?: string | null;
};

export type TrackingWriteInput = {
  trackingNumber?: unknown;
  trackingNumbers?: unknown;
  trackingPackages?: unknown;
  expectedTrackingSnapshot?: unknown;
  items?: unknown;
};

function cleanFlatNumbers(value: unknown, primary: unknown): string[] {
  const candidates = Array.isArray(value) ? value : primary == null ? [] : [primary];
  return [...new Set(candidates
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim().slice(0, 200))
    .filter(Boolean))].slice(0, 20);
}

function sameOrdered(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function mergePackages(existing: TrackingPackage[], incoming: TrackingPackage[]): TrackingPackage[] {
  let result = [...existing];
  for (const submitted of incoming) {
    const byId = result.findIndex(current => current.id === submitted.id);
    const byInternational = result.findIndex(current =>
      current.internationalTrackingNumber.toUpperCase() === submitted.internationalTrackingNumber.toUpperCase());
    const index = byId >= 0 ? byId : byInternational;
    const previous = index >= 0 ? result[index] : null;
    // Bulk extractors commonly generate a fresh id. Exact international identity
    // is authoritative and must not churn the durable package id or erase a local
    // leg merely because a retry omitted it.
    const matchedInternationalIsLegacy = byInternational >= 0 &&
      /^_*legacy-\d+$/.test(result[byInternational].id) &&
      result[byInternational].courier === "other";
    const pkg: TrackingPackage = byInternational >= 0 && byId < 0 && !matchedInternationalIsLegacy
      ? {
          ...submitted,
          id: result[byInternational].id,
          localTrackingNumber: submitted.localTrackingNumber ?? result[byInternational].localTrackingNumber,
        }
      : submitted;
    if (pkg.localTrackingNumber && pkg.courier !== "bmurfs") {
      throw new Error("An existing local leg can be retained only for BMURFS");
    }

    const consumedLegacyIds = new Set<string>();
    for (const current of result) {
      if (current === previous) continue;
      for (const claimed of flattenTrackingPackages([pkg])) {
        if (!flattenTrackingPackages([current]).some(value =>
          value.toUpperCase() === claimed.toUpperCase())) continue;
        const isStandaloneLegacy = /^_*legacy-\d+$/.test(current.id) &&
          current.courier === "other" && !current.localTrackingNumber;
        const isExplicitLocalConsumption = isStandaloneLegacy &&
          pkg.localTrackingNumber?.toUpperCase() === claimed.toUpperCase();
        if (!isExplicitLocalConsumption) {
          throw new Error(`Tracking number ${claimed} already belongs to another package`);
        }
        consumedLegacyIds.add(current.id);
      }
    }
    result = result.filter(current => !consumedLegacyIds.has(current.id));
    const replacementIndex = previous
      ? result.findIndex(current => current.id === previous.id)
      : -1;
    if (replacementIndex >= 0) result[replacementIndex] = pkg;
    else result.push(pkg);
  }
  return normalizeTrackingPackages(result);
}

function normalizedItems(value: unknown): ShippedItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items = value.filter((item): item is ShippedItem =>
    !!item && typeof item === "object" &&
    typeof (item as ShippedItem).name === "string" &&
    Number.isFinite(Number((item as ShippedItem).qty)));
  return items.length ? items : null;
}

/**
 * Pure planning step shared by all order tracking write routes. The caller is
 * responsible for applying updates with a compare-and-swap WHERE clause.
 */
export function prepareTrackingWrite(
  source: TrackingWriteSource,
  input: TrackingWriteInput,
  options: { mergePackages?: boolean } = {},
): {
  updates: Record<string, unknown>;
  beforeSnapshot: string;
  numbersChanged: boolean;
  groupingChanged: boolean;
  shouldNotify: boolean;
} {
  const beforeSnapshot = trackingSnapshot(source);
  if (input.expectedTrackingSnapshot !== undefined &&
      input.expectedTrackingSnapshot !== beforeSnapshot) {
    throw new Error("Tracking was changed by another writer; reload and try again");
  }

  const hasStructured = input.trackingPackages !== undefined;
  const hasFlat = input.trackingNumber !== undefined || input.trackingNumbers !== undefined;
  if (!hasStructured && !hasFlat) {
    return { updates: {}, beforeSnapshot, numbersChanged: false, groupingChanged: false, shouldNotify: false };
  }
  if (hasStructured && (source.orderType === "wholesale_shared" || source.sharedOrderId)) {
    throw new Error("Paired package tracking is out of scope for shared orders");
  }

  let packages: TrackingPackage[] | null = null;
  let numbers: string[];
  if (hasStructured) {
    const submitted = normalizeTrackingPackages(input.trackingPackages);
    packages = options.mergePackages
      ? mergePackages(getTrackingPackages(source), submitted)
      : submitted;
    numbers = flattenTrackingPackages(packages);
    if (hasFlat) {
      const flat = cleanFlatNumbers(input.trackingNumbers, input.trackingNumber);
      if (!sameOrdered(flat, numbers)) {
        throw new Error("trackingPackages conflict with flat tracking numbers");
      }
    }
  } else {
    numbers = cleanFlatNumbers(input.trackingNumbers, input.trackingNumber);
    const storedPackages = source.trackingPackages == null
      ? []
      : normalizeTrackingPackages(source.trackingPackages);
    if (storedPackages.length &&
        trackingNumbersChanged(flattenTrackingPackages(storedPackages), numbers)) {
      throw new Error("Tracking membership is grouped into packages; use the package editor to add or remove numbers");
    }
  }

  const beforeNumbers = canonicalTrackingNumbers(source);
  const numberSetChanged = trackingNumbersChanged(beforeNumbers, numbers);
  let oldPackages: TrackingPackage[] | null = null;
  try {
    oldPackages = source.trackingPackages == null ? null : normalizeTrackingPackages(source.trackingPackages);
  } catch {
    // A strict valid replacement is allowed to repair malformed legacy metadata.
  }
  const groupingChanged = hasStructured &&
    JSON.stringify(oldPackages) !== JSON.stringify(packages);

  const details = normalizeWholesaleTrackingDetails(source.trackingDetails);
  const oldPrimary = beforeNumbers[0];
  if (oldPrimary && !details[oldPrimary] && source.trackingStatus != null) {
    details[oldPrimary] = {
      trackingNumber: oldPrimary,
      status: source.trackingStatus,
      events: Array.isArray(source.trackingEvents) ? source.trackingEvents : [],
      lastChecked: source.trackingLastChecked instanceof Date
        ? source.trackingLastChecked.toISOString()
        : source.trackingLastChecked ?? null,
    };
  }

  const updates: Record<string, unknown> = {
    trackingNumber: numbers[0] ?? null,
    trackingNumbers: numbers.length ? numbers : null,
    ...(hasStructured ? { trackingPackages: packages!.length ? packages : null } : {}),
    ...reconcileWholesaleTrackingCache(beforeNumbers, numbers, details),
  };

  const shippedItems = source.trackingShippedItems && typeof source.trackingShippedItems === "object" &&
    !Array.isArray(source.trackingShippedItems)
    ? { ...(source.trackingShippedItems as Record<string, ShippedItem[]>) }
    : {};
  for (const key of Object.keys(shippedItems)) {
    if (!numbers.includes(key)) delete shippedItems[key];
  }
  if (packages) {
    for (const pkg of packages) {
      if (pkg.localTrackingNumber) {
        if (!shippedItems[pkg.internationalTrackingNumber] && shippedItems[pkg.localTrackingNumber]) {
          shippedItems[pkg.internationalTrackingNumber] = shippedItems[pkg.localTrackingNumber];
        }
        delete shippedItems[pkg.localTrackingNumber];
      }
    }
  }
  const items = normalizedItems(input.items);
  if (items) {
    const itemKeys = packages
      ? normalizeTrackingPackages(input.trackingPackages).map(pkg => pkg.internationalTrackingNumber)
      : numbers;
    for (const number of itemKeys) shippedItems[number] = items;
  }
  if (source.trackingShippedItems !== undefined || items) {
    updates.trackingShippedItems = Object.keys(shippedItems).length ? shippedItems : null;
  }

  return {
    updates,
    beforeSnapshot,
    numbersChanged: numberSetChanged,
    groupingChanged,
    shouldNotify: numberSetChanged && numbers.length > 0,
  };
}
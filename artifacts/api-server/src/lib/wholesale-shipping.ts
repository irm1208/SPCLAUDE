// ── Server-authoritative wholesale shipping calculator ───────────────────────
// Mirrors the tier/package logic used on the wholesale order page, but lives on the
// server so combined shared-order shipping can never be tampered with by the client.
//
// A vendor defines tier columns (e.g. "1–5", "6–10", ...) with an upper kit bound per
// tier and a per-region price list (one price per tier). Orders larger than
// maxKitsPerPackage are split into multiple packages, each priced by its own tier.

export interface ShippingVendorRegion {
  name: string;
  prices?: number[];      // one price per tier
  priceNote?: string;     // single note spanning all tiers (e.g. "80USD/kg") → not auto-calculable
  customNote?: string;    // multi-line custom pricing → not auto-calculable
  countries?: string[];   // full country names that auto-select this region
}

export interface ShippingVendor {
  id: string;
  name: string;
  tiers: string[];
  tierBounds?: number[];        // upper kit-count for each tier
  maxKitsPerPackage?: number;   // kits before cycling to the next package (default 25)
  regions: ShippingVendorRegion[];
}

export function getTierIndex(kits: number, tierBounds: number[]): number {
  for (let i = 0; i < tierBounds.length; i++) {
    if (kits <= tierBounds[i]) return i;
  }
  return tierBounds.length - 1;
}

function tierBoundsFor(vendor: ShippingVendor): number[] {
  return vendor.tierBounds ?? vendor.tiers.map((_, i) => (i + 1) * 5);
}

// Price for a single package (kits already capped to maxKitsPerPackage by the caller).
export function calcPackageShipping(
  vendor: ShippingVendor,
  region: ShippingVendorRegion,
  kits: number,
): number | null {
  if (region.customNote || region.priceNote || !region.prices) return null;
  const bounds = tierBoundsFor(vendor);
  const tierIdx = getTierIndex(kits, bounds);
  const price = region.prices[tierIdx];
  return price ?? null;
}

// Total shipping across however many packages the combined kit count requires.
// Returns null when the region cannot be auto-calculated (custom/per-kg pricing).
export function calcTotalShipping(
  vendor: ShippingVendor,
  region: ShippingVendorRegion,
  kits: number,
): number | null {
  if (region.customNote || region.priceNote || !region.prices) return null;
  if (kits <= 0) return 0;
  const maxPkg = vendor.maxKitsPerPackage ?? 25;
  let remaining = kits;
  let total = 0;
  // Guard against runaway loops on bad config (maxPkg <= 0).
  if (maxPkg <= 0) return null;
  while (remaining > 0) {
    const inThisPackage = Math.min(remaining, maxPkg);
    const price = calcPackageShipping(vendor, region, inThisPackage);
    if (price === null) return null;
    total += price;
    remaining -= inThisPackage;
  }
  return Number(total.toFixed(2));
}

// Find the region whose `countries` list contains the given country (case-insensitive).
export function pickRegionForCountry(
  vendor: ShippingVendor,
  country: string | null | undefined,
): { region: ShippingVendorRegion; index: number } | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  if (!c) return null;
  for (let i = 0; i < vendor.regions.length; i++) {
    const region = vendor.regions[i];
    if (region.countries?.some(rc => rc.trim().toLowerCase() === c)) {
      return { region, index: i };
    }
  }
  return null;
}

// Largest-remainder apportionment of a whole number of cents by weight.
// Guarantees the parts sum exactly to totalCents and is deterministic
// (ties broken by ascending index).
function apportionCents(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalCents <= 0 || totalWeight <= 0) {
    return weights.map(() => 0);
  }
  const exact = weights.map(w => (totalCents * w) / totalWeight);
  const floored = exact.map(Math.floor);
  const used = floored.reduce((a, b) => a + b, 0);
  let remainder = totalCents - used;
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  const result = [...floored];
  let k = 0;
  while (remainder > 0) {
    result[order[k % n].i] += 1;
    remainder -= 1;
    k += 1;
  }
  return result;
}

// Split a dollar total of vendor shipping between members.
// - "even": equal split (remainder cents go to earliest members).
// - "by_size": proportional to each member's kit count (largest-remainder rounding).
// Falls back to an even split when by_size has no positive weights.
// Input order maps 1:1 to output order, so callers can zip results back to members.
export function splitShipping(
  totalDollars: number,
  kitWeights: number[],
  mode: "even" | "by_size",
): number[] {
  const n = kitWeights.length;
  if (n === 0) return [];
  const totalCents = Math.round((Number(totalDollars) || 0) * 100);
  const useBySize = mode === "by_size" && kitWeights.some(w => w > 0);
  const weights = useBySize ? kitWeights.map(w => Math.max(0, w)) : kitWeights.map(() => 1);
  const cents = apportionCents(totalCents, weights);
  return cents.map(c => Number((c / 100).toFixed(2)));
}

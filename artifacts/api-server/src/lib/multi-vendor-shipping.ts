import { calcTotalShipping, pickRegionForCountry, splitShipping, type ShippingVendor } from "./wholesale-shipping";

export type NamedVendor = ShippingVendor & { id: string; name: string };
export type VendorShippingPart = { vendorId: string; vendorName: string; kits: number; shipping: number | null };
type Item = { vendorId?: string | null; quantity: number };
export type VendorShippingSplit = Record<string, "buyers" | "all_members">;

export function parseVendorShippingSplit(value: unknown, vendors: { id: string }[]): VendorShippingSplit {
  if (value === null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid supplier shipping split.");
  const entries = Object.entries(value);
  if (entries.some(([id, rule]) => !vendors.some(v => v.id === id) || (rule !== "buyers" && rule !== "all_members"))) {
    throw new Error("Choose a valid shipping split for each available supplier.");
  }
  return Object.fromEntries(entries) as VendorShippingSplit;
}

export function vendorShippingWeight(items: Item[], vendorId: string, fallbackVendorId?: string | null, rules?: VendorShippingSplit | null): number {
  return items.reduce((sum, item) => sum +
    (rules?.[vendorId] === "all_members" || (item.vendorId || fallbackVendorId || "") === vendorId
      ? Math.max(0, Number(item.quantity) || 0) : 0), 0);
}
export function resolveProductVendor<T extends {id: string; name: string; legacyCatalogueVendor?: string}>(
  product: { wholesaleVendorId?: string | null; vendor?: string | null }, vendors: T[],
): T | null {
  if (product.wholesaleVendorId) return vendors.find(v => v.id === product.wholesaleVendorId) ?? null;
  const name = String(product.vendor ?? "").trim().toLowerCase();
  const legacy = vendors.find(v => v.legacyCatalogueVendor?.toLowerCase() === name);
  if (legacy) return legacy;
  const matches = vendors.filter(v => v.id === name || v.name.trim().toLowerCase() === name);
  return matches.length === 1 ? matches[0] : null;
}

// Default to each vendor's buyers; the organiser can include all members with items.
// Unknown/custom rates stay null: callers must block checkout, never use zero.
export function quoteVendorShipping(
  vendors: NamedVendor[], members: Item[][], country: string, mode: string,
  fallbackVendorId?: string | null, singleVendorOverride?: number | null,
  rules?: VendorShippingSplit | null,
) {
  const ids = [...new Set(members.flat().filter(i => i.quantity > 0).map(i => i.vendorId || fallbackVendorId || ""))];
  const breakdown: VendorShippingPart[] = [];
  const allocations: VendorShippingPart[][] = members.map(() => []);
  for (const id of ids) {
    const vendor = vendors.find(v => v.id === id);
    const weights = members.map(items => items.reduce((s, i) => s + ((i.vendorId || fallbackVendorId || "") === id ? Math.max(0, Number(i.quantity) || 0) : 0), 0));
    const splitWeights = members.map(items => vendorShippingWeight(items, id, fallbackVendorId, rules));
    const kits = weights.reduce((s, n) => s + n, 0);
    const region = vendor && pickRegionForCountry(vendor, country);
    const shipping = ids.length === 1 && singleVendorOverride != null && singleVendorOverride >= 0
      ? singleVendorOverride : (vendor && region ? calcTotalShipping(vendor, region.region, kits) : null);
    const part = { vendorId: id, vendorName: vendor?.name ?? "Unavailable vendor", kits, shipping };
    breakdown.push(part);
    const buyers = splitWeights.flatMap((n, index) => n > 0 ? [index] : []);
    const splits = shipping == null ? null : splitShipping(shipping, buyers.map(index => splitWeights[index]), mode === "by_size" ? "by_size" : "even");
    buyers.forEach((index, n) => allocations[index].push({ ...part, kits: weights[index], shipping: splits?.[n] ?? null }));
  }
  const total = breakdown.some(p => p.shipping == null) ? null : Number(breakdown.reduce((s, p) => s + p.shipping!, 0).toFixed(2));
  return { breakdown, members: allocations, total };
}

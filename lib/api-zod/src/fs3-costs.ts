/** Shared supplier-cost contract and resolver. No fuzzy, dose, or compound inference. */
export interface Fs3CostMatch {
  vendorId: string | null;
  productName: string;
  costName: string;
  reviewedAt: string;
  reviewedBy: string;
  reviewNote: string;
  active: boolean;
}
export interface Fs3SavedCost {
  productName: string;
  unitCost: unknown;
  matches?: Fs3CostMatch[];
}
export const normaliseFs3Name = (name: string) => name.trim().toLowerCase();
export interface Fs3SupplierIdentity { id: string; name: string; legacyCatalogueVendor?: string; }
export interface Fs3SupplierContext {
  vendorId?: string | null;
  shareVendorId?: string | null;
  wholesaleVendorId?: string | null;
  legacyVendor?: string | null;
}
/** Use the same ownership precedence as supplier shipments. Never guess a label. */
export function resolveFs3SupplierId(
  context: Fs3SupplierContext,
  product: { wholesaleVendorId?: string | null; vendor?: string | null },
  vendors: Fs3SupplierIdentity[],
): string | null {
  const explicit = context.vendorId || context.shareVendorId || context.wholesaleVendorId || product.wholesaleVendorId;
  if (explicit) return explicit;
  const label = product.vendor?.trim() || context.legacyVendor?.trim();
  if (!label) return null;
  const key = normaliseFs3Name(label);
  const matching = vendors.filter(v => [v.id, v.name, v.legacyCatalogueVendor ?? ""].some(n => normaliseFs3Name(n) === key));
  // An unknown/ambiguous named supplier is not permission to use legacy aliases.
  return matching.length === 1 ? matching[0].id : `unresolved:${key}`;
}

export function resolveFs3ProductCost(
  product: { wholesaleCost?: unknown; wholesaleVendorId?: string | null } | undefined,
  costs: Fs3SavedCost[], matches: Fs3CostMatch[], name: string, vendorId: string | null,
) {
  if (product?.wholesaleCost != null) {
    const cost = product.wholesaleCost === "" ? NaN : Number(product.wholesaleCost);
    return Number.isFinite(cost) && cost >= 0 ? cost : null;
  }
  return resolveFs3Cost(costs, matches, name, vendorId, !product?.wholesaleVendorId);
}
export function resolveFs3Cost(
  costs: Fs3SavedCost[], matches: Fs3CostMatch[], name: string, vendorId: string | null = null,
  allowLegacyExact = vendorId === null,
): number | null {
  const key = normaliseFs3Name(name);
  const exact = costs.filter(c => normaliseFs3Name(c.productName) === key);
  const reviewed = matches.filter(m => m.active && m.reviewedAt && m.reviewedBy && m.reviewNote &&
    m.vendorId === vendorId && normaliseFs3Name(m.productName) === key);
  const targets = new Set(reviewed.map(m => normaliseFs3Name(m.costName)));
  // A legacy exact cost remains authoritative even when its order line has a
  // shipment vendor. Explicit catalogue supplier offers must opt out of it.
  const matching = allowLegacyExact && exact.length ? exact : targets.size === 1
    ? costs.filter(c => normaliseFs3Name(c.productName) === [...targets][0]) : [];
  const prices = new Set(matching.map(c => c.unitCost == null || c.unitCost === "" ? NaN : Number(c.unitCost)));
  const price = prices.size === 1 ? [...prices][0] : null;
  return price != null && Number.isFinite(price) && price >= 0 ? price : null;
}

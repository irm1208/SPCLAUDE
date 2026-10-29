import { resolveProductVendor } from "./multi-vendor-shipping";
import { previewFingerprint, supplierCatalogueCosts, VendorPortalError } from "./vendor-portal-model";

interface Product {
  id: string; name: string; vendor?: string | null;
  wholesaleVendorId?: string | null; wholesaleCost?: unknown;
}
interface Vendor { id: string; name: string; legacyCatalogueVendor?: string; }

export function planFs3CostImport(
  products: Product[], vendors: Vendor[], vendorId: string,
  costs: Array<{ productName: string; unitCost: unknown }>,
) {
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor || vendor.legacyCatalogueVendor?.trim().toLowerCase() !== "uther") {
    throw new VendorPortalError("FS3 legacy cost import is available only for UR / Uther.");
  }
  const matches: Array<{ id: string; name: string; cost: string }> = [];
  const skipped: Array<{ id: string; name: string; reason: string }> = [];
  let preserved = 0;
  for (const product of [...products].sort((a, b) => a.id.localeCompare(b.id))) {
    if (resolveProductVendor(product, vendors)?.id !== vendorId) continue;
    if (product.wholesaleCost != null) { preserved++; continue; }
    try {
      // This is an explicitly authorised copy into UR's supplier-cost fields,
      // not the normal export fallback for arbitrary vendor-scoped products.
      const [price] = supplierCatalogueCosts([{ productName: product.name }], [], costs);
      matches.push({ id: product.id, name: product.name, cost: price.unitCost });
    } catch (error) {
      if (!(error instanceof VendorPortalError)) throw error;
      skipped.push({ id: product.id, name: product.name, reason: "No unique saved FS3 cost. Check the exact product name and conflicting prices in My Prices." });
    }
  }
  const review = { vendorId, matches, skipped, preserved };
  return { ...review, previewToken: previewFingerprint(review) };
}

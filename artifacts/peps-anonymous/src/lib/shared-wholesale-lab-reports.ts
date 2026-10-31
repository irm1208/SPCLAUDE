import { getWholesaleLabSupplier, loadWholesaleLabAvailability } from "./wholesale-lab-reports";

export interface SharedLabProduct {
  id: string;
  name: string;
  vendorName?: string | null;
}

export interface SharedProductLabReport {
  productName: string;
  supplier: string;
  batchPrefixes: string[];
}

export async function loadSharedWholesaleLabReports(
  products: SharedLabProduct[],
  request: typeof fetch = fetch,
): Promise<Record<string, SharedProductLabReport>> {
  const groups = new Map<string, SharedLabProduct[]>();
  for (const product of products) {
    // UR is the abbreviated Uther catalogue, not a separate lab supplier.
    const name = product.vendorName?.trim() ?? "";
    const supplier = getWholesaleLabSupplier({
      name, legacyCatalogueVendor: name.toLowerCase() === "ur" ? "Uther" : undefined,
    });
    if (!supplier) continue; // Never query unscoped certificates for unknown suppliers.
    const group = groups.get(supplier) ?? [];
    group.push(product);
    groups.set(supplier, group);
  }
  const results = await Promise.all([...groups].map(async ([supplier, items]) => {
    try {
      const { available, prefixes } = await loadWholesaleLabAvailability(items, supplier, request);
      return items.filter(product => available[product.name]).map(product => [
        product.id, { productName: product.name, supplier, batchPrefixes: prefixes[product.name] },
      ] as const);
    } catch {
      // A failed supplier lookup must not expose another supplier's reports.
      return [];
    }
  }));
  return Object.fromEntries(results.flat());
}

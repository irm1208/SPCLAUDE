import { anyBatchCodeMatches, resolveProductBatchPrefixes } from "./batch-prefixes";

export function getWholesaleLabSupplier(vendor: { name: string; legacyCatalogueVendor?: string } | null): string {
  return (vendor?.legacyCatalogueVendor || vendor?.name || "").trim();
}

export async function loadWholesaleLabAvailability(
  products: { name: string }[],
  supplier: string,
  request: typeof fetch = fetch,
) {
  const available: Record<string, boolean> = {};
  const prefixes: Record<string, string[]> = {};
  if (!supplier.trim()) return { available, prefixes };
  const params = new URLSearchParams({ supplier: supplier.trim() });
  const response = await request(`/api/lab-tests/batch-codes?${params}`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not load supplier lab reports");
  const codes: unknown = await response.json();
  if (!Array.isArray(codes) || codes.some(code => typeof code !== "string")) {
    throw new Error("Invalid supplier lab reports response");
  }
  for (const product of products) {
    prefixes[product.name] = resolveProductBatchPrefixes(product.name);
    available[product.name] = anyBatchCodeMatches(codes, prefixes[product.name]);
  }
  return { available, prefixes };
}

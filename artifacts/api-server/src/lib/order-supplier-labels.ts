import { resolveFs3SupplierId } from "@workspace/api-zod/fs3-costs";
type Supplier = { id: string; name: string; legacyCatalogueVendor?: string };
type Product = { id: string; wholesaleVendorId?: string | null; vendor?: string | null };
type Source = { orderType?: string | null; wholesaleVendorId?: string | null };
type Line = { vendorId?: string | null; productId?: string | null };

/** Labels only: no costs, payments or guessed same-name product matches. */
export function orderSupplierLabels(order: Source, lines: Line[], products: Product[], vendors: Supplier[], shareVendorId?: string | null): string[] {
  if (!["wholesale", "wholesale_shared"].includes(order.orderType ?? "")) return [];
  const labels = (lines.length ? lines : [{}]).map(line => {
    const product = products.find(p => p.id === line.productId);
    const id = resolveFs3SupplierId({ ...order, vendorId: line.vendorId, shareVendorId }, product ?? {}, vendors);
    return vendors.find(v => v.id === id)?.name ?? "Supplier not recorded";
  });
  return [...new Set(labels)];
}

import type { ImportReviewRow, ProductRecord } from "../data";

export type SplitInspectorDraftIdentity = Pick<
  ProductRecord,
  "name" | "vendor" | "mgSize"
>;

export function pinSelectedProduct<Product extends Pick<ProductRecord, "id">>(
  visibleProducts: readonly Product[],
  selectedProduct: Product | null | undefined,
  selectedId: string | null,
  dirty: boolean,
): Product[] {
  const uniqueVisibleProducts = visibleProducts.filter(
    (product, index) =>
      visibleProducts.findIndex((candidate) => candidate.id === product.id) ===
      index,
  );

  if (
    !dirty ||
    !selectedId ||
    !selectedProduct ||
    selectedProduct.id !== selectedId ||
    uniqueVisibleProducts.some((product) => product.id === selectedId)
  ) {
    return uniqueVisibleProducts;
  }

  return [selectedProduct, ...uniqueVisibleProducts];
}

function productIdentity(
  product: Pick<ProductRecord, "name" | "vendor" | "mgSize">,
): string {
  return [product.name, product.vendor, product.mgSize]
    .map((value) => value.trim().toLowerCase())
    .join("\u001f");
}

export function findDirtyImportConflict(
  products: readonly ProductRecord[],
  selectedId: string | null,
  draft: SplitInspectorDraftIdentity | null | undefined,
  importRows: readonly ImportReviewRow[],
): ImportReviewRow | null {
  if (!selectedId || !draft) return null;

  const selectedProduct = products.find((product) => product.id === selectedId);
  if (!selectedProduct) return null;

  const selectedIdentity = productIdentity(selectedProduct);
  return (
    importRows.find(
      (row) => row.included && productIdentity(row) === selectedIdentity,
    ) ?? null
  );
}

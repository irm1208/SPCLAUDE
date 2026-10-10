type ExistingItem = { productName: string; productId: string | null };
type CatalogProduct = { id: string; name: string };

/** Link exact product names only; never guess a compound or strength. */
export function resolveEditedProductId(
  productName: string,
  existingItems: ExistingItem[],
  catalog: CatalogProduct[],
): string {
  const name = productName.trim().toLowerCase();
  const existingIds = new Set(existingItems
    .filter(item => item.productName.trim().toLowerCase() === name && item.productId?.trim())
    .map(item => item.productId!));
  if (existingIds.size === 1) return [...existingIds][0];
  if (existingIds.size > 1) return "";
  const catalogIds = new Set(catalog
    .filter(product => product.name.trim().toLowerCase() === name)
    .map(product => product.id));
  return catalogIds.size === 1 ? [...catalogIds][0] : "";
}

export type BrowseProduct = {
  id: string;
  name: string;
  category?: string | null;
  mgSize?: string | null;
  price: number;
  maxPerCustomer?: number | null;
};

export function groupProductsForBrowse<T extends BrowseProduct>(
  products: T[],
  query: string,
  categoryOrder: string[],
): { category: string; products: T[] }[] {
  const search = query.trim().toLowerCase();
  const groups = new Map<string, T[]>();
  for (const product of products) {
    if (search && !`${product.name} ${product.mgSize ?? ""} ${product.category ?? ""}`.toLowerCase().includes(search)) continue;
    const category = product.category || "Uncategorised";
    const existing = groups.get(category) ?? [];
    existing.push(product);
    groups.set(category, existing);
  }
  const categories = [...groups.keys()].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    if (a === "Uncategorised") return 1;
    if (b === "Uncategorised") return -1;
    return a.localeCompare(b);
  });
  return categories.map(category => ({ category, products: groups.get(category)! }));
}
import {
  SAMPLE_PRODUCTS,
  type ImportCandidate,
  type ImportReviewRow,
  type ProductFilters,
  type ProductRecord,
  type ProductStatus,
} from "../data.ts";

const LOW_STOCK_MAX = 5;

function cloneProduct(product: ProductRecord): ProductRecord {
  return { ...product };
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function matchesStock(product: ProductRecord, mode: ProductFilters["stock"]): boolean {
  switch (mode) {
    case "available":
      return product.stock === null || product.stock > 0;
    case "low":
      return product.stock !== null && product.stock > 0 && product.stock <= LOW_STOCK_MAX;
    case "out":
      return product.stock === 0;
    case "unlimited":
      return product.stock === null;
    case "all":
    default:
      return true;
  }
}

export function filterProducts(
  products: readonly ProductRecord[],
  filters: ProductFilters,
): ProductRecord[] {
  const query = normalise(filters.query ?? "");
  const vendor = normalise(filters.vendor ?? "");
  const category = normalise(filters.category ?? "");
  const stock = filters.stock ?? "all";

  return products
    .filter((product) => {
      const searchable = [product.name, product.vendor, product.mgSize, product.category]
        .map((value) => normalise(value ?? ""));
      const queryMatches = !query || searchable.some((value) => value.includes(query));
      const vendorMatches = !vendor || vendor === "all" || normalise(product.vendor) === vendor;
      const categoryMatches = !category || category === "all" || normalise(product.category) === category;
      return queryMatches && vendorMatches && categoryMatches && matchesStock(product, stock);
    })
    .map(cloneProduct);
}

export function getProductStatus(product: ProductRecord): ProductStatus {
  if (!product.visible) return "paused";
  if (product.stock === null) return "live";
  if (product.stock <= 0) return "out-of-stock";
  if (product.stock <= LOW_STOCK_MAX) return "low-stock";
  return "live";
}

export type ProductPatch = Partial<Omit<ProductRecord, "id">>;
export type ProductIdCollection = ReadonlySet<string> | readonly string[];

export function applyBulkPatch(
  products: readonly ProductRecord[],
  selectedIds: ProductIdCollection,
  patch: ProductPatch,
): ProductRecord[] {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const { id: _ignoredId, ...safePatch } = patch as ProductPatch & { id?: unknown };
  return products.map((product) =>
    selected.has(product.id)
      ? { ...product, ...safePatch }
      : cloneProduct(product),
  );
}

export function resetProducts(_products: readonly ProductRecord[]): ProductRecord[] {
  return SAMPLE_PRODUCTS.map(cloneProduct);
}

function importKey(candidate: ImportCandidate): string {
  return [candidate.name, candidate.vendor, candidate.mgSize].map(normalise).join("\u001f");
}

export function classifyImportRows(
  existing: readonly ProductRecord[],
  incoming: readonly ImportCandidate[],
): ImportReviewRow[] {
  const existingByKey = new Map(existing.map((product) => [importKey(product), product]));

  return incoming.map((candidate) => {
    const match = existingByKey.get(importKey(candidate));
    if (!match) {
      return { ...candidate, status: "new", included: true };
    }

    if (match.price !== candidate.price) {
      return {
        ...candidate,
        status: "price-changed",
        existingPrice: match.price,
        included: true,
      };
    }

    return {
      ...candidate,
      status: "duplicate",
      existingPrice: match.price,
      included: false,
    };
  });
}

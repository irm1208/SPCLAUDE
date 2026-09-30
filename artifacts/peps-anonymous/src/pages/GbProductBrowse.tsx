import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { groupProductsForBrowse, type BrowseProduct } from "./gb-product-browse";

type Capacity = {
  productName: string;
  status: "available" | "limited" | "low" | "full";
};

const stockLabel = { available: "In stock", limited: "Medium", low: "Low", full: "Out of stock" };
const stockColor = { available: "#6EE7B7", limited: "#FCD34D", low: "#FDBA74", full: "#FCA5A5" };

export function GbProductBrowse({
  products, categoryOrder, capacity, selectedIds, onAdd, formatPrice, hidePrices, disabled, loading,
}: {
  products: BrowseProduct[];
  categoryOrder: string[];
  capacity?: Capacity[];
  selectedIds: Set<string>;
  onAdd: (id: string) => void;
  formatPrice: (price: number) => string;
  hidePrices: boolean;
  disabled: boolean;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const groups = groupProductsForBrowse(products, query, categoryOrder);
  const capacityByName = new Map(capacity?.map(item => [item.productName.trim().toLowerCase(), item]) ?? []);

  return (
    <section aria-label="Browse all group-buy products" className="space-y-3">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
        <input
          type="search"
          aria-label="Search group-buy products"
          placeholder="Search the full product list…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#162231] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]"
        />
      </div>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-white/10 p-4 text-sm text-white/65">
          {loading ? "Loading products…" : products.length === 0 ? "No products available in this group buy." : "No products match your search."}
        </p>
      ) : groups.map(({ category, products: items }) => (
        <div key={category}>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#E9A020]">{category}</h3>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {items.map(product => {
              const cap = capacityByName.get(product.name.trim().toLowerCase());
              const selected = selectedIds.has(product.id);
              const unavailable = cap?.status === "full" || product.maxPerCustomer === 0;
              return (
                <div key={product.id} className="flex min-w-0 items-center gap-3 border-b border-white/10 bg-[#162231] px-3 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium leading-snug text-white">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      {product.mgSize && <span className="text-white/55">{product.mgSize}</span>}
                      {cap && (
                        <span className="font-semibold" style={{ color: stockColor[cap.status] }}>
                          <span aria-hidden="true">● </span>{stockLabel[cap.status]}
                        </span>
                      )}
                      {!hidePrices && <span className="font-semibold text-white/80">{formatPrice(product.price)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(product.id)}
                    disabled={disabled || selected || unavailable}
                    aria-label={selected ? `${product.name} already in order` : `Add ${product.name} to order`}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[#5B8DEF]/40 bg-[#2D6BCC]/20 px-2.5 text-xs font-bold text-white transition-colors hover:bg-[#2D6BCC]/40 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {selected ? "Added" : unavailable ? "Unavailable" : <><Plus className="h-3.5 w-3.5" /> Add</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
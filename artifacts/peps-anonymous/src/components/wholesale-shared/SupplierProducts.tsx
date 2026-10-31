import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { groupByVendor, type VendorTagged } from "@/lib/vendor-grouping";

interface Supplier { id: string; name: string }
interface Product extends VendorTagged { id: string; name: string; active?: boolean }
interface Item extends VendorTagged { productId: string; productName: string; quantity: number; unitPrice: number }
const unassigned = "__none__";
const money = (value: number) => `$${value.toFixed(2)}`;

/** Only changes the visible catalogue. Basket quantities and saving belong to the parent. */
export function SupplierProductBrowser<T extends Product>({ products, vendors = [], allowedVendorIds, search, onSearchChange, quantities, renderProduct }: {
  products: T[];
  vendors?: Supplier[];
  allowedVendorIds?: string[] | null;
  search: string;
  onSearchChange: (search: string) => void;
  quantities: Readonly<Record<string, number>>;
  renderProduct: (product: T) => ReactNode;
}) {
  const [preferredSupplier, setPreferredSupplier] = useState<string | null>(null);
  const eligible = products.filter(product => product.active !== false && (allowedVendorIds == null
    || (product.vendorId != null && allowedVendorIds.includes(product.vendorId))));
  const choices = new Map<string, Supplier>();
  for (const vendor of vendors) {
    if (allowedVendorIds == null || allowedVendorIds.includes(vendor.id)) choices.set(vendor.id, vendor);
  }
  for (const product of eligible) {
    const id = product.vendorId ?? unassigned;
    if (!choices.has(id)) choices.set(id, { id, name: product.vendorName ?? "Supplier not specified" });
  }
  const suppliers = [...choices.values()];
  const selected = suppliers.find(supplier => supplier.id === preferredSupplier) ?? suppliers[0];
  const query = search.trim().toLowerCase();
  const visible = eligible.filter(product => (product.vendorId ?? unassigned) === selected?.id
    && (!query || product.name.toLowerCase().includes(query)));

  return (
    <>
      {suppliers.length > 1 && (
        <div role="group" aria-label="Choose supplier" className="relative flex flex-wrap gap-2">
          {suppliers.map(supplier => {
            const kits = eligible.filter(product => (product.vendorId ?? unassigned) === supplier.id)
              .reduce((sum, product) => sum + Math.max(0, quantities[product.id] ?? 0), 0);
            const active = selected?.id === supplier.id;
            return (
              <button key={supplier.id} type="button" aria-pressed={active}
                onClick={() => setPreferredSupplier(supplier.id)}
                className="min-h-11 px-4 rounded-lg border text-sm font-semibold inline-flex items-center gap-2"
                style={{ background: active ? "var(--t-blue)" : "var(--t-surface2)", color: active ? "#fff" : "var(--t-text)",
                  borderColor: active ? "var(--t-blue)" : "var(--t-border)" }}>
                {supplier.name}
                {kits > 0 && <span className="text-[11px]" aria-label={`${kits} kits selected`}>({kits})</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border"
        style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />
        <input value={search} onChange={event => onSearchChange(event.target.value)}
          aria-label="Search supplier products" placeholder={selected ? `Search ${selected.name} products…` : "Search products…"}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm" style={{ color: "var(--t-text)" }} />
      </div>
      <div key={selected?.id ?? unassigned} className="max-h-72 overflow-y-auto rounded-lg divide-y"
        style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}
        role="region" aria-label={selected ? `${selected.name} products` : "Supplier products"}>
        {selected && <p className="text-[10px] font-bold uppercase tracking-widest px-3 py-2"
          style={{ color: "var(--t-blue)", background: "var(--t-surface2)" }}>{selected.name}</p>}
        {visible.length === 0 && <p className="text-sm text-center py-6" style={{ color: "var(--t-muted)" }}>
          {selected ? `No products found for ${selected.name}.` : "No suppliers currently available."}
        </p>}
        {visible.map(product => <div key={product.id}>{renderProduct(product)}</div>)}
      </div>
    </>
  );
}

/** Supplier attribution is read from item metadata, never inferred from the product name. */
export function SupplierItemGroups({ items, vendors = [], aggregate = false }: {
  items: Item[];
  vendors?: Supplier[];
  aggregate?: boolean;
}) {
  return (
    <div className="space-y-3">
      {groupByVendor(items).map(group => {
        const lines: Item[] = [];
        const byProduct = new Map<string, Item>();
        for (const item of group.items) {
          const key = JSON.stringify([item.productId, item.unitPrice]);
          const existing = aggregate ? byProduct.get(key) : undefined;
          if (existing) existing.quantity += item.quantity;
          else {
            const line = { ...item };
            lines.push(line);
            if (aggregate) byProduct.set(key, line);
          }
        }
        const name = group.vendorName ?? vendors.find(vendor => vendor.id === group.vendorId)?.name ?? "Supplier not specified";
        return (
          <section key={group.key} data-vendor-items={group.key} className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--t-border)" }} aria-label={`${name} order items`}>
            <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 text-xs font-bold"
              style={{ background: "var(--t-surface2)", color: "var(--t-blue)" }}>
              <span>{name}</span>
              <span className="tabular-nums">{lines.reduce((sum, item) => sum + item.quantity, 0)} kits · {money(lines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}</span>
            </div>
            <ul className="px-3 py-2 space-y-1.5">
              {lines.map((item, index) => (
                <li key={`${item.productId}:${index}`} className="flex items-start justify-between gap-3 text-xs" style={{ color: "var(--t-muted)" }}>
                  <span className="min-w-0 break-words">
                    <span className="block">{item.productName}</span>
                    <span className="block text-[10px] mt-0.5">{money(item.unitPrice)} / kit</span>
                  </span>
                  <span className="shrink-0 tabular-nums">×{item.quantity} · {money(item.quantity * item.unitPrice)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

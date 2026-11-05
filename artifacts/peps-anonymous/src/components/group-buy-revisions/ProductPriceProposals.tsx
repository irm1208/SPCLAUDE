import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { parseProductPriceCsv, productPriceTemplate, validProposedPrice, type PriceProduct, type PriceImportRow } from "./product-price-csv";

type PriceAccess = { enabled: boolean; products: PriceProduct[]; busy?: boolean };
export function useProductPriceProposals(currency: string) {
  const [access, setAccess] = useState<PriceAccess>({ enabled: false, products: [] });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const setPrice = useCallback((id: string, value: string) => setPrices(current => {
    const next = { ...current };
    if (!value.trim()) delete next[id]; else next[id] = value;
    return next;
  }), []);
  const stage = useCallback((rows: PriceImportRow[]) => setPrices(current => ({
    ...current, ...Object.fromEntries(rows.map(row => [row.productId, row.newPrice])),
  })), []);
  const clear = useCallback(() => setPrices({}), []);
  return { ...access, currency, prices, setAccess, setPrice, stage, clear };
}
export type ProductPricing = ReturnType<typeof useProductPriceProposals>;

const fieldStyle = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" };
export function ProductNewPrice({ pricing, productId }: { pricing?: ProductPricing; productId: string }) {
  const product = pricing?.products.find(p => p.id === productId);
  if (!pricing?.enabled || !product) return null;
  const value = pricing.prices[productId] ?? "";
  const invalid = !!value && !validProposedPrice(value);
  return <label className="flex min-w-0 flex-col gap-1 text-[11px]" style={{ color: "var(--t-muted)" }}>
    <span>Current price: {pricing.currency} {Number(product.price).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    <span className="flex flex-wrap items-center gap-2">New price
      <input type="text" inputMode="decimal" value={value} disabled={pricing.busy} onChange={e => pricing.setPrice(productId, e.target.value)}
        aria-label={`New price for ${product.name}`} aria-invalid={invalid}
        data-testid={`product-new-price-${productId}`} className="h-8 w-28 rounded-md px-2 text-sm" style={fieldStyle} placeholder="No change" />
    </span>
    {invalid && <span role="alert" style={{ color: "var(--t-red, #b42318)" }}>Use 0–1,000,000, up to 2 decimals.</span>}
  </label>;
}

export function ProductPriceImport({ pricing }: { pricing: ProductPricing }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [preview, setPreview] = useState<{ rows: PriceImportRow[]; errors: string[] } | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState("");
  // Rendering off invalidates a read that was started before the feature was disabled.
  const enabledRef = useRef(pricing.enabled); enabledRef.current = pricing.enabled;
  const productsRef = useRef(pricing.products); productsRef.current = pricing.products;
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const request = ++seq.current;
    setNotice(""); setPreview(null); setReading(true);
    try {
      if (file.size > 2_000_000) throw new Error("CSV must be smaller than 2 MB.");
      const text = await file.text();
      if (request !== seq.current || !enabledRef.current) return;
      setPreview(parseProductPriceCsv(text, productsRef.current));
    } catch (e) {
      if (request === seq.current && enabledRef.current) setPreview({ rows: [], errors: [(e as Error).message] });
    } finally { if (request === seq.current) setReading(false); }
  };
  if (!pricing.enabled) return null;
  return <section className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }} aria-label="Product price update CSV">
    <h3 className="text-sm font-bold">Update proposed prices by CSV</h3>
    <p className="text-xs" style={{ color: "var(--t-muted)" }}>For your uploaded products in this group buy only. Import stages New prices; it does not create products, change catalogue prices or edit orders. Leave New price blank for no change.</p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" style={fieldStyle} onClick={() => {
        const url = URL.createObjectURL(new Blob(["\uFEFF", productPriceTemplate(pricing.products)], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = "group-buy-price-update-template.csv"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Download price CSV template</button>
      <button type="button" disabled={reading || pricing.busy} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={fieldStyle} onClick={() => fileRef.current?.click()}>{reading ? "Reading CSV…" : "Import price updates"}</button>
      <input type="file" ref={fileRef} accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={read} hidden data-testid="price-update-csv" />
    </div>
    {preview && <div className="space-y-2">
      {preview.errors.length > 0 && <div role="alert" className="max-h-48 overflow-y-auto text-xs" style={{ color: "var(--t-red, #b42318)" }}>
        <strong>No prices staged. Correct these CSV errors:</strong>{preview.errors.map((error, i) => <p key={i}>{error}</p>)}
      </div>}
      {preview.rows.length > 0 && <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-xs"><thead><tr><th>Product</th><th>Strength</th><th>Current price</th><th>New price</th></tr></thead>
          <tbody>{preview.rows.map(row => <tr key={row.productId} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <td className="py-2 pr-2">{row.name}</td><td>{row.strength}</td><td>{pricing.currency} {row.currentPrice}</td><td className="font-bold">{pricing.currency} {Number(row.newPrice).toFixed(2)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!preview.errors.length && !preview.rows.length && <p className="text-xs">No New prices were entered in this CSV.</p>}
      <div className="flex gap-2">
        <button type="button" disabled={!!preview.errors.length || !preview.rows.length || pricing.busy} className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-40" style={{ background: "var(--t-blue-deep)" }} onClick={() => {
          pricing.stage(preview.rows); setNotice(`${preview.rows.length} proposed prices staged. Click “Review product price changes” above, check the unpaid orders and send confirmation requests.`);
          setPreview(null);
        }}>Stage {preview.rows.length} proposed prices</button>
        <button type="button" className="px-2 text-xs underline" onClick={() => { seq.current++; setPreview(null); }}>Cancel import</button>
      </div>
    </div>}
    {notice && <p role="status" className="text-xs">{notice}</p>}
    <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>Price drafts are unsent and stay on this page only. Send confirmation requests before leaving.</p>
  </section>;
}

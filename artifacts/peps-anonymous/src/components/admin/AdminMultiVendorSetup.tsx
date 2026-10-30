import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, AlertTriangle, Info } from "lucide-react";
import { Fs3SupplierCostImport } from "./Fs3SupplierCostImport";
import { JbgYtCatalogueImport } from "./JbgYtCatalogueImport";
import { wholesaleProfit } from "@/lib/wholesale-profit";
import { SupplierMessageEditor } from "./SupplierMessageEditor";

// Contract:
//  GET   /api/admin/wholesale-vendors                 -> { vendors: AdminVendor[], activeVendorId: string|null }
//  GET   /api/admin/wholesale-products                -> AdminWholesaleProduct[] (or { products })
//  PATCH /api/admin/wholesale-vendors/:id/availability   { enabled: boolean }
//  PATCH /api/admin/wholesale-products/:id               { wholesaleVendorId, wholesaleCost, wholesalePrice, stock }
// Legacy vendors with `enabled === undefined` are treated as enabled only when they are activeVendorId.

export interface AdminVendor { id: string; name: string; enabled?: boolean; legacyCatalogueVendor?: string; wholesaleMessage?: string }
export interface AdminWholesaleProduct {
  id: string;
  name: string;
  vendor?: string | null;
  wholesaleVendorId: string | null;
  wholesaleCost: number | null;
  wholesalePrice: number | null;
  stock: number | null;
  wholesaleEnabled?: boolean;
}

export function isVendorEnabled(v: AdminVendor, activeVendorId: string | null): boolean {
  return v.enabled === undefined ? v.id === activeVendorId : v.enabled;
}

/** Parse an optional numeric input. "" -> null; invalid -> undefined. */
export function parseOptionalNumber(raw: string, integer = false): number | null | undefined {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (integer && !Number.isInteger(n)) return undefined;
  return n;
}

interface RowDraft { vendorId: string; cost: string; price: string; stock: string; enabled: boolean }
export function productVendorId(p: AdminWholesaleProduct, vendors: AdminVendor[]): string {
  if (p.wholesaleVendorId) return p.wholesaleVendorId;
  const name = (p.vendor ?? "").trim().toLowerCase();
  const legacy = vendors.find(v => v.legacyCatalogueVendor?.toLowerCase() === name);
  if (legacy) return legacy.id;
  const matches = vendors.filter(v => v.id === name || v.name.trim().toLowerCase() === name);
  return matches.length === 1 ? matches[0].id : "";
}
const toDraft = (p: AdminWholesaleProduct, vendors: AdminVendor[] = []): RowDraft => ({
  vendorId: productVendorId(p, vendors),
  cost: p.wholesaleCost != null ? String(p.wholesaleCost) : "",
  price: p.wholesalePrice != null ? String(p.wholesalePrice) : "",
  stock: p.stock != null ? String(p.stock) : "",
  enabled: p.wholesaleEnabled !== false,
});

async function readError(r: Response, fallback: string) {
  const body = await r.json().catch(() => null) as { error?: string } | null;
  return body?.error ? `${fallback}: ${body.error}` : `${fallback} (${r.status})`;
}

export function AdminMultiVendorSetup({ secret, selectedVendorId, onVendorsChanged }: {
  secret: string;
  selectedVendorId?: string;
  onVendorsChanged?: () => void;
}) {
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminWholesaleProduct[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [rowState, setRowState] = useState<Record<string, { busy?: boolean; error?: string; saved?: boolean }>>({});
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const h = { "x-admin-secret": secret };
      const [vr, pr] = await Promise.all([
        fetch("/api/admin/wholesale-vendors", { headers: h, credentials: "include" }),
        fetch("/api/admin/wholesale-products", { headers: h, credentials: "include" }),
      ]);
      if (!vr.ok) throw new Error(await readError(vr, "Could not load vendors"));
      if (!pr.ok) throw new Error(await readError(pr, "Could not load wholesale products"));
      const vb = await vr.json();
      const pb = await pr.json();
      const list: AdminWholesaleProduct[] = Array.isArray(pb) ? pb : Array.isArray(pb?.products) ? pb.products : [];
      setVendors(Array.isArray(vb?.vendors) ? vb.vendors : []);
      setActiveVendorId(typeof vb?.activeVendorId === "string" ? vb.activeVendorId : null);
      setProducts(list);
      setDrafts(Object.fromEntries(list.map(p => [p.id, toDraft(p, vb.vendors ?? [])])));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load multi-vendor setup");
    }
  }, [secret]);

  useEffect(() => { void load(); }, [load]);

  const toggleVendor = async (v: AdminVendor) => {
    const next = !isVendorEnabled(v, activeVendorId);
    setToggleBusy(v.id); setToggleError(null);
    try {
      const r = await fetch(`/api/admin/wholesale-vendors/${encodeURIComponent(v.id)}/availability`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) throw new Error(await readError(r, `Could not update ${v.name}`));
      setVendors(vs => vs?.map(x => x.id === v.id ? { ...x, enabled: next } : x) ?? vs);
      onVendorsChanged?.();
    } catch (e) {
      setToggleError(e instanceof Error ? e.message : "Could not update vendor availability");
    } finally { setToggleBusy(null); }
  };

  const saveRow = async (p: AdminWholesaleProduct) => {
    const d = drafts[p.id] ?? toDraft(p, vendors ?? []);
    const cost = parseOptionalNumber(d.cost);
    const price = parseOptionalNumber(d.price);
    const stock = parseOptionalNumber(d.stock, true);
    const bad = [cost === undefined && "supplier cost", price === undefined && "sell price", stock === undefined && "stock (whole number)"].filter(Boolean);
    if (bad.length) { setRowState(s => ({ ...s, [p.id]: { error: `Invalid ${bad.join(", ")}` } })); return; }
    if (!d.vendorId) { setRowState(s => ({ ...s, [p.id]: { error: "Choose a vendor" } })); return; }
    setRowState(s => ({ ...s, [p.id]: { busy: true } }));
    try {
      const r = await fetch(`/api/admin/wholesale-products/${encodeURIComponent(p.id)}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ wholesaleVendorId: d.vendorId, wholesaleCost: cost, wholesalePrice: price, stock,
          ...(d.enabled !== (p.wholesaleEnabled !== false) ? { wholesaleEnabled: d.enabled } : {}) }),
      });
      if (!r.ok) throw new Error(await readError(r, "Save failed"));
      const body = await r.json().catch(() => null) as Partial<AdminWholesaleProduct> | null;
      const updated: AdminWholesaleProduct = { ...p, wholesaleVendorId: d.vendorId, wholesaleCost: cost ?? null, wholesalePrice: price ?? null, stock: stock ?? null, wholesaleEnabled: d.enabled, ...(body && body.id === p.id ? body : {}) };
      setProducts(ps => ps.map(x => x.id === p.id ? updated : x));
      setDrafts(ds => ({ ...ds, [p.id]: toDraft(updated, vendors ?? []) }));
      setRowState(s => ({ ...s, [p.id]: { saved: true } }));
    } catch (e) {
      setRowState(s => ({ ...s, [p.id]: { error: e instanceof Error ? e.message : "Save failed" } }));
    }
  };

  const vendorName = useMemo(() => new Map((vendors ?? []).map(v => [v.id, v.name])), [vendors]);
  const visible = products.filter(p => {
    const id = productVendorId(p, vendors ?? []);
    if (selectedVendorId) return id === selectedVendorId || (showUnassigned && !id);
    return filter === "all" ? true : filter === "unassigned" ? !id : id === filter;
  });

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2" data-testid="multivendor-load-error">
        <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        <button type="button" onClick={() => void load()} className="ml-auto font-semibold underline" data-testid="button-retry-multivendor">Retry</button>
      </div>
    );
  }
  if (!vendors) return <div className="h-32 rounded-lg bg-slate-100 animate-pulse" data-testid="multivendor-loading" />;

  const inputCls = "h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-400";
  const importVendor = vendors.find(v => v.id === (selectedVendorId ?? filter) &&
    v.legacyCatalogueVendor?.trim().toLowerCase() === "uther");
  const jbgYtVendor = vendors.find(v => v.id === (selectedVendorId ?? filter) &&
    v.name.trim().toLowerCase().replace(/\s/g, "") === "jbg/yt");
  const hasUnsavedEdits = products.some(p => drafts[p.id] &&
    JSON.stringify(drafts[p.id]) !== JSON.stringify(toDraft(p, vendors)));
  const importDisabledReason = hasUnsavedEdits ? "Save your unsaved product edits before importing."
    : Object.values(rowState).some(row => row.busy) || toggleBusy ? "Wait for the current save to finish." : undefined;

  return (
    <section className="space-y-4" data-testid="admin-multivendor-setup">
      <fieldset disabled={importBusy} className="min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Vendor availability</h3>
        <p className="text-xs text-slate-500 mt-0.5">Enabled vendors are offered to buyers at the same time. The active vendor in the vendor modal is only the default selection.</p>
        {toggleError && <p role="alert" className="mt-2 text-xs font-semibold text-red-600" data-testid="multivendor-toggle-error">{toggleError}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {vendors.length === 0 && <p className="text-xs text-slate-500">No vendors configured yet — add one in the vendor modal.</p>}
          {vendors.filter(v => !selectedVendorId || v.id === selectedVendorId).map(v => {
            const on = isVendorEnabled(v, activeVendorId);
            return (
              <button key={v.id} type="button" role="switch" aria-checked={on} disabled={toggleBusy === v.id}
                onClick={() => void toggleVendor(v)} data-testid={`toggle-vendor-${v.id}`}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-xs font-semibold disabled:opacity-60 ${on ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
                {toggleBusy === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className={`w-2 h-2 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`} />}
                {v.name}{v.id === activeVendorId ? " · default" : ""}{v.enabled === undefined ? " (legacy)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Each catalogue product is <strong>one offer from one vendor</strong>. To sell the same item from a second vendor, create a separate catalogue product with Add Product and assign it here. Supplier cost is admin-only and never shown to members.</p>
      </div>

      {importVendor && <Fs3SupplierCostImport key={importVendor.id} secret={secret}
        vendorId={importVendor.id} vendorName={importVendor.name} onApplied={load}
        disabledReason={importDisabledReason} onBusyChange={setImportBusy} />}
      {jbgYtVendor && <JbgYtCatalogueImport key={jbgYtVendor.id} secret={secret}
        vendorId={jbgYtVendor.id} onApplied={async () => { await load(); onVendorsChanged?.(); }}
        disabledReason={importDisabledReason} onBusyChange={setImportBusy} />}
      {vendors.filter(v => v.id === (selectedVendorId ?? filter)).map(v => <SupplierMessageEditor
        key={v.id} secret={secret} vendorId={v.id} vendorName={v.name} initialMessage={v.wholesaleMessage ?? ""}
        onSaved={message => setVendors(current => current?.map(item => item.id === v.id ? { ...item, wholesaleMessage: message } : item) ?? null)} />)}

      {selectedVendorId ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showUnassigned} onChange={e => setShowUnassigned(e.target.checked)} data-testid="show-unassigned-products" />
          Show unassigned products to assign to this vendor
        </label>
      ) : <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600" htmlFor="mv-filter">Vendor</label>
        <select id="mv-filter" value={filter} onChange={e => setFilter(e.target.value)} className="h-8 rounded border border-slate-200 bg-white px-2 text-xs" data-testid="select-multivendor-filter">
          <option value="all">All products ({products.length})</option>
          <option value="unassigned">Unassigned</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-semibold px-2 py-2">Product</th>
              <th className="text-left font-semibold px-2 py-2 w-36">Vendor</th>
              <th className="text-left font-semibold px-2 py-2 w-24">Supplier cost</th>
              <th className="text-left font-semibold px-2 py-2 w-24">Sell price</th>
              <th className="text-left font-semibold px-2 py-2 w-24" title="Sell price minus supplier cost, per kit; excludes shipping, discounts and fees">Profit / kit</th>
              <th className="text-left font-semibold px-2 py-2 w-24" title="Profit divided by sell price × 100">Margin</th>
              <th className="text-left font-semibold px-2 py-2 w-20">Stock</th>
              <th className="text-left font-semibold px-2 py-2">Available</th>
              <th className="px-2 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-slate-400">No products match this filter.</td></tr>
            )}
            {visible.map(p => {
              const d = drafts[p.id] ?? toDraft(p, vendors);
              const profit = wholesaleProfit(d.cost, d.price);
              const profitColor = profit && profit.profit < 0 ? "text-red-700" : profit && profit.profit > 0 ? "text-emerald-700" : "text-slate-500";
              const st = rowState[p.id] ?? {};
              const set = (k: keyof RowDraft) => (e: { target: { value: string } }) => {
                setDrafts(ds => ({ ...ds, [p.id]: { ...d, [k]: e.target.value } }));
                setRowState(s => ({ ...s, [p.id]: {} }));
              };
              const unknownVendor = !!p.wholesaleVendorId && !vendorName.has(p.wholesaleVendorId);
              return (
                <tr key={p.id} className="border-t border-slate-100 align-top" data-testid={`row-mv-product-${p.id}`}>
                  <td className="px-2 py-2">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    {p.wholesaleEnabled === false && <p className="text-[10px] text-slate-400">Wholesale off</p>}
                    {st.error && <p role="alert" className="text-[11px] font-semibold text-red-600 mt-1" data-testid={`error-mv-${p.id}`}>{st.error}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <select value={d.vendorId} onChange={set("vendorId")} className={inputCls} data-testid={`select-mv-vendor-${p.id}`}>
                      <option value="">— Unassigned —</option>
                      {vendors.filter(v => !selectedVendorId || v.id === selectedVendorId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      {unknownVendor && <option value={p.wholesaleVendorId!}>Unknown ({p.wholesaleVendorId})</option>}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input inputMode="decimal" value={d.cost} onChange={set("cost")} placeholder="—" className={inputCls} data-testid={`input-mv-cost-${p.id}`} /></td>
                  <td className="px-2 py-2"><input inputMode="decimal" value={d.price} onChange={set("price")} placeholder="—" className={inputCls} data-testid={`input-mv-price-${p.id}`} /></td>
                  <td className={`px-2 py-3 font-semibold whitespace-nowrap ${profitColor}`} data-testid={`mv-profit-${p.id}`}>{profit ? `${profit.profit < 0 ? "−" : ""}$${Math.abs(profit.profit).toFixed(2)}` : "—"}</td>
                  <td className={`px-2 py-3 font-semibold whitespace-nowrap ${profitColor}`} data-testid={`mv-margin-${p.id}`}>{profit?.margin != null ? `${profit.margin.toFixed(1)}%` : "—"}</td>
                  <td className="px-2 py-2"><input inputMode="numeric" value={d.stock} onChange={set("stock")} placeholder="—" className={inputCls} data-testid={`input-mv-stock-${p.id}`} /></td>
                  <td className="px-2 py-2"><input type="checkbox" aria-label={`Available for wholesale: ${p.name}`} checked={d.enabled}
                    onChange={e => { setDrafts(ds => ({ ...ds, [p.id]: { ...d, enabled: e.target.checked } })); setRowState(s => ({ ...s, [p.id]: {} })); }}
                    data-testid={`input-mv-enabled-${p.id}`} /></td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => void saveRow(p)} disabled={st.busy} data-testid={`button-mv-save-${p.id}`}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-slate-800 text-white text-xs font-semibold disabled:opacity-60">
                      {st.busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {st.saved ? "Saved" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </fieldset>
    </section>
  );
}

export default AdminMultiVendorSetup;

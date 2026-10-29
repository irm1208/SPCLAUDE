import { useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { SupplierBatch, SupplierScope, BatchRefreshPreview, BatchOrder } from "@/lib/supplier-batches";

const V = {
  text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", border: "var(--t-border, #D0DAE4)",
  surface: "var(--t-surface, #FFFFFF)", surface2: "var(--t-surface2, #F1F5F9)",
};
const NAVY = "#1B3A7A";
const btn = "h-9 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50";
const ghost = "h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50";
const kits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const MONEY = ["Grand total", "Credits applied", "Amount due", "Product subtotal", "Vendor shipping"];

function money(v: string | undefined, currency: string) {
  const n = Number(v);
  if (v == null || v === "" || !Number.isFinite(n)) return "—";
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n); } catch { return `${n.toFixed(2)} ${currency}`; }
}

interface Props {
  batch: SupplierBatch; scope: SupplierScope; groupBuyId: string; busy: boolean;
  requestPreview: (path: string, body: unknown) => Promise<BatchRefreshPreview>;
  /** Posts the confirmed refresh; resolves true when the SupplierData cache was updated. */
  onConfirm: (path: string, body: unknown) => Promise<boolean>;
}

function Arrow() { return <span aria-label="to" className="mx-0.5" style={{ color: NAVY }}>→</span>; }

const itemKey = (i: BatchOrder["items"][number]) => JSON.stringify([i.productId, i.productName, Number(i.unitPrice)]);
function groupedItem(items: BatchOrder["items"], key: string) {
  const lines = items.filter(i => itemKey(i) === key);
  return lines.length ? { ...lines[0], quantity: lines.reduce((n, i) => n + i.quantity, 0),
    lineTotal: lines.reduce((n, i) => n + Number(i.lineTotal), 0).toFixed(2) } : undefined;
}
const productKey = (p: { productId: string; productName: string }) => JSON.stringify([p.productId, p.productName]);

function OrderChange({ c, currency }: { c: BatchRefreshPreview["changes"][number]; currency: string }) {
  const { before: b, after: a } = c;
  const ids = [...new Set([...b.items, ...(a?.items ?? [])].map(itemKey))];
  const diff: [string, string, string][] = [];
  if (a) {
    if (b.kits !== a.kits) diff.push(["Kits", kits(b.kits), kits(a.kits)]);
    if (b.country !== a.country) diff.push(["Country", b.country || "—", a.country || "—"]);
    if (b.username !== a.username) diff.push(["Member", b.username, a.username]);
    MONEY.forEach((l, i) => { const x = b.money?.[i], y = a.money?.[i]; if ((x || y) && x !== y) diff.push([l, money(x, currency), money(y, currency)]); });
  }
  return (
    <li data-testid={`row-refresh-change-${c.orderId}`} className="rounded-lg border p-2 space-y-1" style={{ borderColor: V.border, background: V.surface }}>
      <p className="font-semibold"><span className="font-mono">{c.code}</span> <span style={{ color: V.muted }}>{b.username} · {b.country}</span></p>
      {!a ? <p className="text-red-700">Order is missing or no longer eligible for this batch.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-left text-[11px]">
          <tbody>
            {ids.map(id => {
              const x = groupedItem(b.items, id), y = groupedItem(a.items, id);
              if (x && y && x.quantity === y.quantity && x.unitPrice === y.unitPrice && x.lineTotal === y.lineTotal) return null;
              return (
                <tr key={id} className="border-t" style={{ borderColor: V.border }}>
                  <td className="py-0.5 pr-2 break-words">{(y ?? x)!.productName}
                    <span className="block" style={{ color: V.muted }}>{money((y ?? x)!.unitPrice, currency)} / kit</span>
                  </td>
                  <td className="pr-2 tabular-nums">{x?.quantity ?? 0}<Arrow />{y?.quantity ?? 0}</td>
                  <td className="tabular-nums" style={{ color: V.muted }}>{money(x?.lineTotal, currency)}<Arrow />{money(y?.lineTotal, currency)}</td>
                </tr>
              );
            })}
            {diff.map(([l, x, y]) => (
              <tr key={l} className="border-t" style={{ borderColor: V.border }}>
                <td className="py-0.5 pr-2">{l}</td><td colSpan={2} className="tabular-nums">{x}<Arrow />{y}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </li>
  );
}

export function BatchRefreshReview({ batch, busy, requestPreview, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<BatchRefreshPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const id = batch.id;
  const base = `/${encodeURIComponent(id)}`;

  const load = async () => {
    const current = ++generation.current;
    setOpen(true); setLoading(true); setError(null); setApproved(false); setPreview(null);
    try {
      const result = await requestPreview(`${base}/refresh-preview`, { expectedBatchToken: batch.snapshot.token });
      if (generation.current === current) setPreview(result);
    }
    catch (e) { if (generation.current === current) setError(e instanceof Error ? e.message : "Could not load the update preview."); }
    finally { if (generation.current === current) setLoading(false); }
  };
  const close = () => { generation.current++; setOpen(false); setLoading(false); setPreview(null); setError(null); setApproved(false); };
  const stale = !!preview && (batch.state !== "prepared" || batch.snapshot.token !== preview.expectedBatchToken);
  const confirm = async () => {
    if (!preview || !approved || !preview.canConfirm || stale || busy || saving || loading) return;
    setSaving(true); setError(null);
    try {
      const ok = await onConfirm(`${base}/refresh`, { confirm: true, expectedBatchToken: preview.expectedBatchToken, token: preview.token });
      if (ok) close(); else setError("The batch was not updated. Load a fresh preview and review it again.");
    } catch (e) { setError(e instanceof Error ? e.message : "The batch was not updated."); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <button type="button" data-testid={`button-refresh-review-${id}`} disabled={busy} onClick={load} className={ghost} style={{ borderColor: V.border, color: NAVY }}>
      <RefreshCw className="w-3.5 h-3.5" /> Review changes and update batch
    </button>
  );

  const p = preview;
  const unchanged = p ? Math.max(0, p.before.orderCount - p.changes.length) : 0;
  const productIds = p ? [...new Set([...p.before.products, ...(p.after?.products ?? [])].map(productKey))] : [];
  const disabled = busy || saving || loading || !p || !p.canConfirm || stale || !approved;
  return (
    <section data-testid={`panel-refresh-${id}`} aria-label={`Review changes for ${batch.reference}`} aria-busy={loading}
      className="rounded-lg p-3 space-y-3 text-xs" style={{ background: "var(--t-blue-08, rgba(45,107,204,0.08))", color: V.text }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">Review changes · reference stays <span className="font-mono" data-testid={`text-refresh-reference-${id}`}>{p?.reference ?? batch.reference}</span></p>
        {p && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>{p.currency}</span>}
      </div>
      {loading && <div className="space-y-2" aria-label="Loading update preview">{[0, 1].map(i => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: V.surface2 }} />)}</div>}
      {p && <>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div><dt className="text-[10px]" style={{ color: V.muted }}>Kits</dt>
            <dd className="font-semibold tabular-nums" data-testid={`text-refresh-kits-${id}`}>{kits(p.before.kits)} → {p.after ? `${kits(p.after.kits)} kits` : "—"}</dd></div>
          <div><dt className="text-[10px]" style={{ color: V.muted }}>Orders</dt>
            <dd className="font-semibold tabular-nums">{p.before.orderCount} → {p.after ? p.after.orderCount : "—"}</dd></div>
          <div><dt className="text-[10px]" style={{ color: V.muted }}>Unchanged orders</dt>
            <dd className="font-semibold tabular-nums">{unchanged}</dd></div>
        </dl>
        {productIds.length > 0 && (
          <ul className="space-y-0.5">
            {productIds.map(pid => {
              const x = p.before.products.find(i => productKey(i) === pid), y = p.after?.products.find(i => productKey(i) === pid);
              return <li key={pid} className="tabular-nums">{(y ?? x)!.productName}: {x?.quantity ?? 0} → {p.after ? (y?.quantity ?? 0) : "—"}</li>;
            })}
          </ul>
        )}
        {p.changes.length > 0 ? <ul className="space-y-2" aria-label="Changed orders">{p.changes.map(c => <OrderChange key={c.orderId} c={c} currency={p.currency} />)}</ul>
          : <p style={{ color: V.muted }}>No order lines changed.</p>}
        {p.blockers.length > 0 && (
          <ul role="alert" data-testid={`list-refresh-blockers-${id}`} className="list-disc pl-4 text-red-700">
            {p.blockers.map((x, i) => <li key={`${x.orderId}-${i}`}>{x.code && <span className="font-mono">{x.code}: </span>}{x.reason}</li>)}
          </ul>
        )}
        <p style={{ color: V.muted }}>Updates this prepared batch's snapshot only. The reference is kept; no orders, payments or supplier submissions change.</p>
        {stale && <p role="alert" className="text-amber-700">This batch changed since this preview. Load a fresh preview before updating.</p>}
        {p.canConfirm && !stale && (
          <label className="flex items-start gap-2 font-semibold">
            <input type="checkbox" data-testid={`checkbox-refresh-approve-${id}`} checked={approved} disabled={busy || saving} onChange={e => setApproved(e.target.checked)} className="mt-0.5" />
            I've reviewed these changes and want to update {p.reference}.
          </label>
        )}
      </>}
      {error && <p role="alert" data-testid={`text-refresh-error-${id}`} className="text-red-600 whitespace-pre-wrap">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid={`button-refresh-confirm-${id}`} disabled={disabled} onClick={confirm} className={btn} style={{ background: NAVY }}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Update batch, keep reference
        </button>
        <button type="button" data-testid={`button-refresh-reload-${id}`} disabled={busy || saving || loading} onClick={load} className={ghost} style={{ borderColor: V.border, color: V.text }}>
          <RefreshCw className="w-3.5 h-3.5" /> Load fresh preview
        </button>
        <button type="button" data-testid={`button-refresh-cancel-${id}`} disabled={saving} onClick={close} className="h-9 px-3 font-semibold" style={{ color: V.muted }}>Cancel</button>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Download, Plus, Trash2 } from "lucide-react";
import { SupplierBatchFulfilment } from "./SupplierBatchFulfilment";
import {
  EU_BATCH_COUNTRIES, supplierKey, supplierRequest, downloadSupplierCsv,
  type SupplierScope, type SupplierData, type BatchConfig, type BatchProposal, type SupplierBatch,
} from "@/lib/supplier-batches";

const V = {
  text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", border: "var(--t-border, #D0DAE4)",
  surface: "var(--t-surface, #FFFFFF)", surface2: "var(--t-surface2, #F1F5F9)",
};
const NAVY = "#1B3A7A";
const POLL_MS = 60_000;
const inputCls = "w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/40 disabled:opacity-60";
const inputStyle = { background: V.surface2, borderColor: V.border, color: V.text };
const btn = "h-9 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50";
const ghost = "h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50";
const label = "text-[10px] font-bold uppercase tracking-widest";

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const kits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Parse ISO list; UK normalises to GB. */
export function parseCountries(s: string): string[] {
  return [...new Set(s.toUpperCase().split(/[\s,;]+/).filter(Boolean).map(c => (c === "UK" ? "GB" : c)))];
}

interface Props {
  groupBuyId: string; scope: SupplierScope; headers?: Record<string, string>;
  onViewOrders?: (batchId: string, orderId?: string) => void; onDispatch?: () => void;
}
type Draft = { enabled: boolean; telegramAlerts: boolean; regions: { id: string; name: string; countries: string; targetKits: string }[] };
const toDraft = (c: BatchConfig): Draft => ({
  enabled: c.enabled, telegramAlerts: c.telegramAlerts,
  regions: c.regions.map(r => ({ id: r.id, name: r.name, countries: r.countries.join(" "), targetKits: String(r.targetKits) })),
});

function Msg({ m, id }: { m: { err: boolean; text: string } | null; id: string }) {
  if (!m) return null;
  return <p role={m.err ? "alert" : "status"} data-testid={id} className={`text-xs ${m.err ? "text-red-600" : "text-green-700"}`}>{m.text}</p>;
}

function ConfigEditor({ data, busy, run, reload, putConfig }: {
  putConfig: (c: BatchConfig, v: number) => Promise<SupplierData>; data: SupplierData; busy: boolean; run: (fn: () => Promise<SupplierData>) => Promise<SupplierData>; reload: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(data.config));
  const [dirty, setDirty] = useState(false);
  const [baseVersion, setBaseVersion] = useState(data.version);
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);
  // Adopt server config only when not dirty — never clobber drafts during polling.
  useEffect(() => {
    if (!dirty && data.version !== baseVersion) { setDraft(toDraft(data.config)); setBaseVersion(data.version); }
  }, [data.version, data.config, dirty, baseVersion]);
  const upd = (f: (d: Draft) => Draft) => { setDraft(f); setDirty(true); setMsg(null); };
  const setRegion = (i: number, k: keyof Draft["regions"][number], v: string) =>
    upd(d => ({ ...d, regions: d.regions.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const newId = () => `r${Date.now().toString(36)}`;
  const addRegion = (name = "", countries = "") => upd(d => ({ ...d, regions: [...d.regions, { id: newId(), name, countries, targetKits: "10" }] }));

  const validate = (): string | null => {
    for (const r of draft.regions) {
      if (!r.name.trim()) return "Every region needs a name.";
      const cs = parseCountries(r.countries);
      if (!cs.length) return `${r.name}: add at least one country code.`;
      if (cs.some(c => !/^[A-Z]{2}$/.test(c))) return `${r.name}: use two-letter ISO country codes.`;
      const t = Number(r.targetKits);
      if (!(t > 0) || Math.round(t * 2) !== t * 2) return `${r.name}: target kits must be positive, in 0.5 steps.`;
    }
    return null;
  };
  const saveReal = async () => {
    const err = validate(); if (err) { setMsg({ err: true, text: err }); return; }
    const config: BatchConfig = { enabled: draft.enabled, telegramAlerts: draft.telegramAlerts,
      regions: draft.regions.map(r => ({ id: r.id, name: r.name.trim(), countries: parseCountries(r.countries), targetKits: Number(r.targetKits) })) };
    try {
      const res = await run(() => putConfig(config, baseVersion));
      setDirty(false); setConflict(false); setDraft(toDraft(res.config)); setBaseVersion(res.version);
      setMsg({ err: false, text: "Supplier batch settings saved." });
    } catch (e) {
      const text = e instanceof Error ? e.message : "Could not save settings.";
      const status = (e as { status?: number } | null)?.status;
      const isConf = status === 409;
      setConflict(isConf);
      setMsg({ err: true, text: isConf ? `${text} Your draft is kept. Load latest to discard it.` : text });
    }
  };
  const discard = () => { setDraft(toDraft(data.config)); setBaseVersion(data.version); setDirty(false); setConflict(false); setMsg(null); reload(); };

  return (
    <fieldset className="rounded-xl border p-3 space-y-3" style={{ borderColor: V.border }} disabled={busy}>
      <legend className={`${label} px-1`} style={{ color: "#8A9AAA" }}>Batch settings</legend>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: V.text }}>
          <input type="checkbox" data-testid="checkbox-supplier-enabled" checked={draft.enabled} onChange={e => upd(d => ({ ...d, enabled: e.target.checked }))} />
          Supplier batching enabled
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: V.text }}>
          <input type="checkbox" data-testid="checkbox-supplier-telegram" checked={draft.telegramAlerts} onChange={e => upd(d => ({ ...d, telegramAlerts: e.target.checked }))} />
          Telegram alerts to staff when a region is ready
        </label>
      </div>
      <p className="text-[11px]" style={{ color: V.muted }}>Staff alerts only — members never receive supplier batch alerts.</p>
      <p className="text-[11px]" style={{ color: V.muted }}>Only fully paid regional orders count towards the target. Direct Shipping orders are handled separately and do not count.</p>
      <div className="space-y-2">
        {draft.regions.length === 0 && <p className="text-xs" style={{ color: V.muted }}>No regions yet. Add one to start grouping paid orders.</p>}
        {draft.regions.map((r, i) => (
          <div key={r.id} data-testid={`row-supplier-region-${i}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_96px_auto] items-end">
            <label><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Region name</span>
              <input data-testid={`input-region-name-${i}`} value={r.name} onChange={e => setRegion(i, "name", e.target.value)} className={inputCls} style={inputStyle} /></label>
            <label><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Countries (ISO codes)</span>
              <input data-testid={`input-region-countries-${i}`} value={r.countries} onChange={e => setRegion(i, "countries", e.target.value)} placeholder="GB IE" className={`${inputCls} font-mono`} style={inputStyle} /></label>
            <label><span className="block text-[11px] font-semibold mb-1" style={{ color: V.muted }}>Target kits</span>
              <input data-testid={`input-region-target-${i}`} type="number" min={0.5} step={0.5} value={r.targetKits} onChange={e => setRegion(i, "targetKits", e.target.value)} className={inputCls} style={inputStyle} /></label>
            <button type="button" aria-label={`Remove ${r.name || "region"}`} onClick={() => upd(d => ({ ...d, regions: d.regions.filter((_, j) => j !== i) }))} className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="button-add-region" onClick={() => addRegion()} className={ghost} style={{ borderColor: V.border, color: V.text }}><Plus className="w-3.5 h-3.5" /> Region</button>
        <button type="button" data-testid="button-preset-eu" onClick={() => addRegion("EU", EU_BATCH_COUNTRIES.join(" "))} className={ghost} style={{ borderColor: V.border, color: V.text }}>EU preset</button>
        <button type="button" data-testid="button-preset-gb" onClick={() => addRegion("United Kingdom", "GB")} className={ghost} style={{ borderColor: V.border, color: V.text }}>UK preset</button>
      </div>
      <p className="text-[11px]" style={{ color: V.muted }}>UK is saved as GB. Overlapping countries are rejected on save.</p>
      <Msg m={msg} id="text-supplier-config-msg" />
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="button-save-supplier-config" onClick={saveReal} disabled={busy || !dirty} className={btn} style={{ background: NAVY }}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save settings
        </button>
        {(dirty || conflict) && <button type="button" data-testid="button-discard-supplier-config" onClick={discard} className="h-9 px-3 text-xs font-semibold" style={{ color: V.muted }}>{conflict ? "Load latest (discard draft)" : "Discard changes"}</button>}
        {dirty && !conflict && data.version !== baseVersion && <span className="text-[11px] self-center text-amber-700">Settings changed elsewhere since you started editing.</span>}
      </div>
    </fieldset>
  );
}

function OrdersDetail({ p }: { p: BatchProposal }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold" style={{ color: V.text }}>Member & product detail ({p.orders.length} orders)</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead><tr style={{ color: V.muted }}><th className="py-1 pr-2">Order</th><th className="pr-2">Member</th><th className="pr-2">Country</th><th className="pr-2">Kits</th><th className="pr-2">Paid</th><th>Products</th></tr></thead>
          <tbody>
            {p.orders.map(o => (
              <tr key={o.id} className="border-t align-top" style={{ borderColor: V.border, color: V.text }}>
                <td className="py-1 pr-2 font-mono">{o.code}</td><td className="pr-2">{o.username}</td><td className="pr-2">{o.country}</td>
                <td className="pr-2">{kits(o.kits)}</td>
                <td className="pr-2">{o.paidAt ? fmt(o.paidAt) : o.historicalReviewed ? `Reviewed (queued ${fmt(o.orderingAt)})` : "—"}</td>
                <td>{o.items.map(i => `${i.productName} ×${i.quantity}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ProposalCard({ p, enabled, busy, onConfirm }: { p: BatchProposal; enabled: boolean; busy: boolean; onConfirm: (p: BatchProposal) => Promise<void> }) {
  const [preview, setPreview] = useState<BatchProposal | null>(null);
  const pct = Math.min(100, (p.queuedKits / (p.region.targetKits || 1)) * 100);
  const stale = preview && preview.token !== p.token;
  return (
    <div data-testid={`card-proposal-${p.region.id}`} className="rounded-xl border p-3 space-y-2" style={{ borderColor: V.border }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: V.text }}>{p.region.name} <span className="text-[11px] font-mono font-normal" style={{ color: V.muted }}>{p.region.countries.join(" ")}</span></span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${p.ready ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{p.ready ? "Ready" : "Filling"}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: V.surface2 }} role="progressbar" aria-label={`${p.region.name} queued kits`} aria-valuenow={p.queuedKits} aria-valuemax={p.region.targetKits}>
        <div className="h-full" style={{ width: `${pct}%`, background: "#2D6BCC" }} />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[["Queued / target", `${kits(p.queuedKits)} / ${kits(p.region.targetKits)}`], ["Proposed kits", kits(p.kits)],
          ["Members / orders", `${new Set(p.orders.map(o => o.username)).size} / ${p.orders.length}`],
          ["Left in queue", `${kits(p.remainingKits)}${p.readyAt ? ` · ready ${fmt(p.readyAt)}` : ""}`]].map(([k, v]) => (
          <div key={k}><dt style={{ color: V.muted }} className="text-[10px]">{k}</dt><dd className="font-semibold tabular-nums" style={{ color: V.text }}>{v}</dd></div>
        ))}
      </dl>
      {p.products.length > 0 && <p className="text-[11px]" style={{ color: V.muted }}>{p.products.map(x => `${x.productName} ×${x.quantity}`).join(" · ")}</p>}
      {p.orders.length > 0 && <OrdersDetail p={p} />}
      {!preview ? (
        <button type="button" data-testid={`button-preview-batch-${p.region.id}`} disabled={!enabled || busy || p.orders.length === 0} onClick={() => setPreview(p)} className={btn} style={{ background: NAVY }}>Preview batch</button>
      ) : (
        <div data-testid={`preview-batch-${p.region.id}`} className="rounded-lg p-3 space-y-2 text-xs" style={{ background: "var(--t-blue-08, rgba(45,107,204,0.08))", color: V.text }}>
          <p className="font-semibold">Prepare {kits(preview.kits)} kits from {preview.orders.length} paid orders ({preview.orders.map(o => o.code).join(", ")}).</p>
          <p style={{ color: V.muted }}>This records a supplier batch only. No supplier order is placed and no member parcel status changes.</p>
          {stale && <p role="alert" className="text-amber-700">The queue changed since this preview. Confirming uses the preview shown above; the server will reject it if it is no longer valid. Close and re-preview to see the latest.</p>}
          <div className="flex gap-2">
            <button type="button" data-testid={`button-confirm-batch-${p.region.id}`} disabled={!enabled || busy} onClick={async () => { await onConfirm(preview); setPreview(null); }} className={btn} style={{ background: NAVY }}>
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm batch
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={busy} className="h-9 px-3 font-semibold" style={{ color: V.muted }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchCard({ b, busy, act, exportCsv, context }: { b: SupplierBatch; busy: boolean; act: (path: string, body: unknown) => Promise<boolean>; exportCsv: (id: string) => Promise<void>; context: Props }) {
  const [mode, setMode] = useState<"ordered" | "release" | null>(null);
  const [showFulfilment, setShowFulfilment] = useState(false);
  const [reason, setReason] = useState("");
  const blocked = b.exceptions.length > 0;
  return (
    <div data-testid={`card-batch-${b.id}`} className="rounded-xl border p-3 space-y-2" style={{ borderColor: V.border }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold font-mono" style={{ color: V.text }}>{b.reference}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${b.state === "ordered" ? "bg-green-100 text-green-700" : b.state === "released" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-800"}`}>{b.state}</span>
      </div>
      <p className="text-[11px]" style={{ color: V.muted }}>
        {b.snapshot.region.name} · {kits(b.snapshot.kits)} kits · {b.snapshot.orders.length} orders · prepared {fmt(b.createdAt)} by {b.createdBy}
        {b.orderedAt && ` · ordered ${fmt(b.orderedAt)}`}{b.releasedAt && ` · released ${fmt(b.releasedAt)}`}
      </p>
      {b.releaseReason && <p className="text-xs" style={{ color: V.text }}>Release reason: {b.releaseReason}</p>}
      {blocked && (
        <ul role="alert" className="text-xs text-red-600 list-disc pl-4">
          {b.exceptions.map(x => <li key={x.orderId}><span className="font-mono">{x.code}</span>: {x.reason}</li>)}
        </ul>
      )}
      <OrdersDetail p={b.snapshot} />
      {b.state === "ordered" && <div className="space-y-3">
        <button type="button" className={btn} style={{ background: NAVY }} aria-expanded={showFulfilment} onClick={() => setShowFulfilment(v => !v)}>
          {showFulfilment ? "Close" : "Manage"} supplier packages &amp; receipt
        </button>
        {showFulfilment && <SupplierBatchFulfilment {...context} initialBatchId={b.id} />}
      </div>}
      {b.state === "prepared" && !mode && (
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid={`button-ordered-${b.id}`} disabled={busy || blocked} onClick={() => setMode("ordered")} className={btn} style={{ background: NAVY }}>Mark ordered from supplier & process these orders</button>
          <button type="button" data-testid={`button-export-${b.id}`} disabled={busy || blocked} onClick={() => exportCsv(b.id)} className={ghost} style={{ borderColor: V.border, color: V.text }}><Download className="w-3.5 h-3.5" /> CSV</button>
          <button type="button" data-testid={`button-release-${b.id}`} disabled={busy} onClick={() => setMode("release")} className={ghost} style={{ borderColor: V.border, color: "#b91c1c" }}>Release unsent batch</button>
        </div>
      )}
      {b.state === "ordered" && (
        <button type="button" data-testid={`button-export-${b.id}`} disabled={busy || blocked} onClick={() => exportCsv(b.id)} className={ghost} style={{ borderColor: V.border, color: V.text }}><Download className="w-3.5 h-3.5" /> CSV</button>
      )}
      {mode === "ordered" && (
        <div className="rounded-lg p-3 text-xs space-y-2" style={{ background: "var(--t-blue-08, rgba(45,107,204,0.08))", color: V.text }}>
          <p>Only these {b.snapshot.orders.length} Submitted orders move to Processing. Payments are unchanged. Confirm you have placed this order with the supplier yourself.</p>
          <div className="flex gap-2">
            <button type="button" data-testid={`button-confirm-ordered-${b.id}`} disabled={busy} onClick={async () => { if (await act(`/${encodeURIComponent(b.id)}/ordered`, { confirm: true })) setMode(null); }} className={btn} style={{ background: NAVY }}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm ordered</button>
            <button type="button" onClick={() => setMode(null)} disabled={busy} className="h-9 px-3 font-semibold" style={{ color: V.muted }}>Cancel</button>
          </div>
        </div>
      )}
      {mode === "release" && (
        <div className="rounded-lg p-3 text-xs space-y-2 bg-red-50">
          <label className="block"><span className="block font-semibold mb-1 text-red-700">Reason (required)</span>
            <textarea data-testid={`input-release-reason-${b.id}`} value={reason} onChange={e => setReason(e.target.value)} rows={2} className={inputCls} style={inputStyle} /></label>
          <p className="text-red-700">Releasing returns these orders to the queue. Nothing was sent to the supplier.</p>
          <div className="flex gap-2">
            <button type="button" data-testid={`button-confirm-release-${b.id}`} disabled={busy || !reason.trim()} onClick={async () => { if (await act(`/${encodeURIComponent(b.id)}/release`, { confirm: true, reason: reason.trim() })) { setMode(null); setReason(""); } }} className={btn} style={{ background: "#ef4444" }}>Release batch</button>
            <button type="button" onClick={() => setMode(null)} disabled={busy} className="h-9 px-3 font-semibold" style={{ color: V.muted }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Body({ groupBuyId, scope, headers, onViewOrders, onDispatch }: Props) {
  const qc = useQueryClient();
  const key = supplierKey(scope, groupBuyId);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [msg, setMsg] = useState<{ err: boolean; text: string } | null>(null);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const f = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f);
  }, []);
  const q = useQuery({
    queryKey: key,
    queryFn: () => supplierRequest<SupplierData>(scope, groupBuyId, "", undefined, "GET", headers),
    refetchInterval: busy || !visible ? false : POLL_MS, retry: 1,
  });
  const run = async (fn: () => Promise<SupplierData>) => {
    if (busyRef.current) throw new Error("Another supplier action is still running.");
    busyRef.current = true; setBusy(true);
    try { await qc.cancelQueries({ queryKey: key }); const r = await fn(); qc.setQueryData(key, r); return r; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const putConfig = (config: BatchConfig, expectedVersion: number) => supplierRequest(scope, groupBuyId, "/config", { config, expectedVersion }, "PUT", headers);
  const act = async (path: string, body: unknown, ok = "Done.") => {
    setMsg(null);
    try { await run(() => supplierRequest(scope, groupBuyId, path, body, "POST", headers)); setMsg({ err: false, text: ok }); return true; }
    catch (e) { setMsg({ err: true, text: e instanceof Error ? e.message : "Request failed." }); return false; }
  };
  const exportCsv = async (id: string) => {
    setMsg(null);
    try { await downloadSupplierCsv(scope, groupBuyId, id, headers); } catch (e) { setMsg({ err: true, text: e instanceof Error ? e.message : "Export failed." }); }
  };

  const d = q.data;
  if (q.isLoading) return <div className="space-y-2" aria-label="Loading supplier batches">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: V.surface2 }} />)}</div>;
  if (!d) return (
    <div role="alert" data-testid="text-supplier-load-error" className="flex items-center gap-2 text-xs text-red-600">
      <span className="flex-1">Could not load supplier batches: {q.error instanceof Error ? q.error.message : "error"}</span>
      <button type="button" onClick={() => q.refetch()} className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="w-3 h-3" /> Retry</button>
    </div>
  );
  return (
    <div className="space-y-4">
      {q.isError && <p role="alert" className="text-xs text-red-600">Refresh failed; showing last loaded data.</p>}
      <p className="text-[11px]" style={{ color: V.muted }}>Last checked {fmt(d.checkedAt)}</p>
      <ConfigEditor putConfig={putConfig} data={d} busy={busy} run={run} reload={() => { qc.invalidateQueries({ queryKey: key }); }} />
      <Msg m={msg} id="text-supplier-msg" />
      <section className="space-y-2">
        <p className={label} style={{ color: "#8A9AAA" }}>Proposals</p>
        {!d.config.enabled && <p className="text-xs" style={{ color: V.muted }}>Batching is disabled. History stays available; new batches cannot be confirmed.</p>}
        {d.proposals.length === 0 && <p className="text-xs" style={{ color: V.muted }}>No regional queues yet.</p>}
        {d.proposals.map(p => (
          <ProposalCard key={p.region.id} p={p} enabled={d.config.enabled} busy={busy}
            onConfirm={async snap => { await act("/confirm", { regionId: snap.region.id, token: snap.token }, `Batch prepared for ${snap.region.name}.`); }} />
        ))}
      </section>
      {d.review.length > 0 && (
        <section className="space-y-2">
          <p className={label} style={{ color: "#8A9AAA" }}>Needs review</p>
          {d.review.map(r => (
            <div key={r.id} data-testid={`row-review-${r.id}`} className="flex flex-wrap items-center gap-2 rounded-xl border p-2 text-xs" style={{ borderColor: V.border, color: V.text }}>
              <span className="font-mono">{r.code}</span><span>{r.username}</span><span style={{ color: V.muted }}>{r.country || "no country"}</span>
              <span className="flex-1 text-amber-700">{r.reason}</span>
              {r.canReviewHistorical && (
                <button type="button" data-testid={`button-review-${r.id}`} disabled={busy} onClick={() => act(`/review/${encodeURIComponent(r.id)}`, { confirm: true }, `${r.code} queued using review time.`)} className={ghost} style={{ borderColor: V.border, color: V.text }}
                  title="Queues this historical order using the review time. Does not verify payment.">Queue using review time</button>
              )}
            </div>
          ))}
          <p className="text-[11px]" style={{ color: V.muted }}>Reviewing a historical order only sets its queue time. It does not verify payment.</p>
        </section>
      )}
      <section className="space-y-2">
        <p className={label} style={{ color: "#8A9AAA" }}>Batch history</p>
        {d.batches.length === 0 && <p className="text-xs" style={{ color: V.muted }}>No supplier batches yet.</p>}
        <details className="rounded-xl border p-3" style={{ borderColor: V.border }}>
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: V.text }}>Shipping &amp; receipt overview</summary>
          <div className="mt-3"><SupplierBatchFulfilment groupBuyId={groupBuyId} scope={scope} headers={headers} onViewOrders={onViewOrders} onDispatch={onDispatch} /></div>
        </details>
        {d.batches.map(b => <BatchCard key={b.id} b={b} busy={busy} act={(p, body) => act(p, body)} exportCsv={exportCsv} context={{ groupBuyId, scope, headers, onViewOrders, onDispatch }} />)}
      </section>
      {d.events.length > 0 && (
        <section className="space-y-1">
          <p className={label} style={{ color: "#8A9AAA" }}>Staff notifications</p>
          {d.events.map(e => (
            <p key={e.id} className="text-[11px]" style={{ color: V.text }}>
              {fmt(e.createdAt)} · {e.kind} · Telegram: <span className="font-semibold">{e.telegram}</span>
              {e.lastError && <span className="text-red-600"> · {e.lastError}</span>}
              {e.detail && (e.detail.region || e.detail.text) && (
                <span data-testid={`text-event-detail-${e.id}`} className="block pl-3" style={{ color: V.muted }}>
                  {[e.detail.region, e.detail.kits != null && `${kits(Number(e.detail.kits))}${e.detail.target != null ? ` / ${kits(Number(e.detail.target))}` : ""} kits`, e.detail.text].filter(Boolean).join(" · ")}
                </span>
              )}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

export function SupplierBatchManager(props: Props) {
  return (
    <section data-testid="supplier-batch-manager" aria-labelledby={`sb-h-${props.groupBuyId}`} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: V.border, background: V.surface, color: V.text }}>
      <div>
        <h3 id={`sb-h-${props.groupBuyId}`} className="text-sm font-bold" style={{ color: V.text }}>Supplier batches</h3>
        <p className="text-[11px] mt-0.5" style={{ color: V.muted }}>Group paid members' kits by region for supplier purchasing. Separate from individual parcel delivery.</p>
      </div>
      <Body key={`${props.scope}:${props.groupBuyId}`} {...props} />
    </section>
  );
}
export default SupplierBatchManager;

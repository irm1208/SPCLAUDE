import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Scissors } from "lucide-react";
import {
  HALF_KIT_POLL_MS, fetchManagement, offerCurrencyMismatch, formatMoney, publishSequentially, releaseClaim, saveOffer, validateOfferForm,
  type HalfKitCandidate, type HalfKitClaim, type HalfKitManagement, type HalfKitScope, type OfferInput,
} from "@/lib/half-kit-api";

const C = {
  text: "var(--t-text, #0F1F38)", muted: "var(--t-muted, #6B7280)", border: "var(--t-border, #D0DAE4)",
  surface: "var(--t-surface, #FFFFFF)", navy: "#1B3A7A", blue: "#2D6BCC", amber: "#E9A020",
};
const inputCls = "h-9 w-full rounded-lg border px-2 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6BCC]";
const label = "text-[10px] font-bold uppercase tracking-widest";

type BulkResult = { succeeded: string[]; failed: { productId: string; error: string }[] };
type Draft = { price: string; deliveryCharge: string; vendorShippingCharge: string };

function draftFor(c: HalfKitCandidate, currency: string): Draft {
  // Amounts saved in a former GB currency are not reused; start from the current default half price.
  const offer = offerCurrencyMismatch(c.offer, currency) ? null : c.offer;
  return {
    price: (offer?.price ?? c.defaultPrice).toFixed(2),
    deliveryCharge: (offer?.deliveryCharge ?? 0).toFixed(2),
    vendorShippingCharge: (offer?.vendorShippingCharge ?? 0).toFixed(2),
  };
}

function CandidateRow({ c, currency, selected, onSelect, onSave }: {
  c: HalfKitCandidate; currency: string; selected: boolean; onSelect: (v: boolean) => void;
  onSave: (productId: string, input: OfferInput) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFor(c, currency));
  const mismatch = offerCurrencyMismatch(c.offer, currency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = !!c.offer?.published;
  const submit = async (publish: boolean) => {
    const v = validateOfferForm(draft);
    if (!v.ok) { setError(v.error); return; }
    setBusy(true); setError(null);
    try { await onSave(c.productId, { ...v.value, published: publish, version: c.offer?.version }); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };
  const field = (k: keyof Draft, text: string) => (
    <label className="block">
      <span className={label} style={{ color: C.muted }}>{text}</span>
      <input type="number" min="0" step="0.01" inputMode="decimal" className={inputCls}
        style={{ borderColor: C.border, background: C.surface, color: C.text }}
        value={draft[k]} disabled={busy} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
        data-testid={`input-${k}-${c.productId}`} />
    </label>
  );
  return (
    <li className="rounded-xl border p-3 space-y-3" style={{ borderColor: published ? "rgba(45,107,204,0.35)" : C.border, background: C.surface }} data-testid={`row-candidate-${c.productId}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2D6BCC]" checked={selected} disabled={!c.remainingHalf || busy || mismatch}
          onChange={e => onSelect(e.target.checked)} aria-label={`Select ${c.productName}`} data-testid={`checkbox-candidate-${c.productId}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" style={{ color: C.text }}>{c.productName}</p>
          <p className="text-xs tabular-nums" style={{ color: C.muted }}>
            {c.totalQuantity} kits ordered · default half {formatMoney(currency, c.defaultPrice)}
            {c.remainingHalf ? " · 0.5 unfilled" : " · no unfilled half"}
          </p>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={published ? { background: "rgba(34,197,94,0.12)", color: "#15803d" } : { background: "rgba(138,154,170,0.15)", color: C.muted }}
          data-testid={`status-offer-${c.productId}`}>{published ? "Published" : c.offer ? "Hidden" : "Not offered"}</span>
      </div>
      {mismatch && (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg p-2 text-xs" style={{ background: "rgba(233,160,32,0.12)", color: "#92400e" }} data-testid={`warning-currency-${c.productId}`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Saved offer was priced in {c.offer!.currency} ({formatMoney(c.offer!.currency!, c.offer!.price)}). The group buy now uses {currency}: review the price below and publish it individually.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {field("price", `Half price (${currency})`)}
        {field("deliveryCharge", "Extra delivery")}
        {field("vendorShippingCharge", "Vendor shipping")}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || (!c.remainingHalf && !published)} onClick={() => submit(true)}
          className="h-9 rounded-xl px-3 text-xs font-bold text-white disabled:opacity-50" style={{ background: C.navy }}
          data-testid={`button-publish-${c.productId}`}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : published ? "Save & keep published" : "Publish"}
        </button>
        {c.offer && (
          <button type="button" disabled={busy} onClick={() => submit(false)}
            className="h-9 rounded-xl border border-dashed px-3 text-xs font-semibold disabled:opacity-50" style={{ borderColor: C.border, color: C.muted }}
            data-testid={`button-hide-${c.productId}`}>{published ? "Hide" : "Save hidden"}</button>
        )}
      </div>
    </li>
  );
}

function ClaimRow({ claim, currency, onRelease }: { claim: HalfKitClaim; currency: string; onRelease: (id: string) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const release = async () => {
    if (!window.confirm(`Release ${claim.productName} half from order ${claim.orderCode}? Credits spent on it are returned.`)) return;
    setBusy(true); setError(null);
    try { await onRelease(claim.id); } catch (e) { setError(e instanceof Error ? e.message : "Release failed"); } finally { setBusy(false); }
  };
  const statusColor = { unpaid: C.amber, paid: "#15803d", released: C.muted, blocked: "#dc2626" }[claim.status];
  return (
    <tr className="border-t align-top" style={{ borderColor: C.border }} data-testid={`row-claim-${claim.id}`}>
      <td className="py-2 pr-3"><span className="font-mono text-xs">{claim.orderCode}</span><br /><span className="text-xs" style={{ color: C.muted }}>@{claim.username}</span></td>
      <td className="py-2 pr-3 text-xs">{claim.productName}</td>
      <td className="py-2 pr-3 text-xs tabular-nums">{formatMoney(currency, claim.price)}
        {(claim.deliveryCharge > 0 || claim.vendorShippingCharge > 0) && <span style={{ color: C.muted }}> + {formatMoney(currency, claim.deliveryCharge + claim.vendorShippingCharge)} ship</span>}
        {claim.creditsUsed > 0 && <><br /><span style={{ color: C.muted }}>credits {formatMoney(currency, claim.creditsUsed)}</span></>}
      </td>
      <td className="py-2 pr-3 text-xs font-bold uppercase" style={{ color: statusColor }}>{claim.status}</td>
      <td className="py-2 text-right">
        {claim.canRelease && claim.status === "unpaid" && (
          <button type="button" disabled={busy} onClick={release} className="h-8 rounded-lg border px-2 text-xs font-semibold text-red-600 disabled:opacity-50"
            style={{ borderColor: "rgba(239,68,68,0.4)" }} data-testid={`button-release-claim-${claim.id}`}>{busy ? "Releasing" : "Release"}</button>
        )}
        {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export function HalfKitManagerView({ data, onSave, onRelease, onBulkPublish }: {
  scope: HalfKitScope; data: HalfKitManagement;
  onSave: (productId: string, input: OfferInput) => Promise<unknown>;
  onRelease: (claimId: string) => Promise<unknown>;
  onBulkPublish: (items: { productId: string; input: OfferInput }[]) => Promise<BulkResult>;
}) {
  const { group, claims } = data;
  const candidates = useMemo(() => data.candidates.filter(c => c.remainingHalf), [data.candidates]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulk, setBulk] = useState<BulkResult | null>(null);
  const names = useMemo(() => new Map(candidates.map(c => [c.productId, c.productName])), [candidates]);
  const selectedCandidates = candidates.filter(c => selected.has(c.productId) && !offerCurrencyMismatch(c.offer, group.currency));
  const publishSelected = async () => {
    const items = selectedCandidates.map(c => {
      const d = draftFor(c, group.currency);
      return { productId: c.productId, input: { price: Number(d.price), deliveryCharge: Number(d.deliveryCharge), vendorShippingCharge: Number(d.vendorShippingCharge), published: true, version: c.offer?.version } };
    });
    setBulkBusy(true); setBulk(null);
    try { const r = await onBulkPublish(items); setBulk(r); setSelected(new Set(r.failed.map(f => f.productId))); }
    finally { setBulkBusy(false); }
  };
  return (
    <section className="space-y-4" aria-labelledby="half-kit-heading">
      <div className="flex items-center gap-2">
        <Scissors className="w-4 h-4" style={{ color: C.blue }} />
        <h3 id="half-kit-heading" className="text-sm font-bold" style={{ color: C.text }}>Fill half kits — {group.name}</h3>
      </div>
      <p className="text-xs" style={{ color: C.muted }}>
        Products whose total ends in .5. Publish an offer so a member can add the remaining half to their existing order. No coupons apply{group.allowCredits ? "; credits allowed" : "; credits disabled for this group buy"}. Unpaid claims stay reserved until you release them.
      </p>
      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: C.border, color: C.muted }} data-testid="text-no-candidates">
          Every product total is a whole kit right now. Nothing to fill.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={selectedCandidates.length === 0 || bulkBusy} onClick={publishSelected}
              className="h-9 rounded-xl px-3 text-xs font-bold text-white disabled:opacity-50" style={{ background: C.blue }} data-testid="button-publish-selected">
              {bulkBusy ? "Publishing…" : `Publish selected (${selectedCandidates.length})`}
            </button>
            <span className="text-[11px]" style={{ color: C.muted }}>Uses the saved/default price for each. Publishes one at a time.</span>
          </div>
          {bulk && (
            <div role="status" className="rounded-lg border p-3 text-xs space-y-1" style={{ borderColor: bulk.failed.length ? "rgba(233,160,32,0.5)" : "rgba(34,197,94,0.4)" }} data-testid="status-bulk-result">
              <p className="flex items-center gap-1.5 font-semibold" style={{ color: C.text }}>
                {bulk.failed.length ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: C.amber }} /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                {bulk.succeeded.length} published, {bulk.failed.length} failed
              </p>
              {bulk.failed.map(f => <p key={f.productId} className="text-red-600">{names.get(f.productId) ?? f.productId}: {f.error}</p>)}
            </div>
          )}
          <ul className="space-y-2">
            {candidates.map(c => (
              <CandidateRow key={`${c.productId}-${c.offer?.version ?? 0}`} c={c} currency={group.currency} selected={selected.has(c.productId)} onSave={onSave}
                onSelect={v => setSelected(s => { const n = new Set(s); if (v) n.add(c.productId); else n.delete(c.productId); return n; })} />
            ))}
          </ul>
        </>
      )}
      <div>
        <p className={label} style={{ color: C.muted }}>Claim history</p>
        {claims.length === 0 ? <p className="text-xs mt-1" style={{ color: C.muted }}>No claims yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left" style={{ color: C.text }}>
            <thead><tr className={label} style={{ color: C.muted }}><th className="py-1 pr-3">Order</th><th className="pr-3">Product</th><th className="pr-3">Agreed</th><th className="pr-3">Status</th><th /></tr></thead>
            <tbody>{claims.map(cl => <ClaimRow key={cl.id} claim={cl} currency={cl.currency || group.currency} onRelease={onRelease} />)}</tbody>
          </table></div>
        )}
      </div>
    </section>
  );
}

export function HalfKitManager({ scope, groupBuyId }: { scope: HalfKitScope; groupBuyId: string }) {
  const qc = useQueryClient();
  const key = ["half-kit-offers", scope, groupBuyId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchManagement(scope, groupBuyId), refetchInterval: HALF_KIT_POLL_MS });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const save = useMutation({ mutationFn: (a: { productId: string; input: OfferInput }) => saveOffer(scope, groupBuyId, a.productId, a.input), onSettled: refresh });
  const release = useMutation({ mutationFn: (id: string) => releaseClaim(scope, groupBuyId, id), onSettled: refresh });
  const wrap = { borderColor: C.border, background: C.surface };
  if (q.isLoading) return (
    <div className="rounded-xl border p-4 space-y-2" style={wrap} aria-busy="true">
      {[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "rgba(27,58,122,0.07)" }} />)}
    </div>
  );
  if (q.isError || !q.data) return (
    <div role="alert" className="rounded-xl border p-4 text-sm flex items-center justify-between gap-3" style={wrap}>
      <span className="text-red-600">Could not load half-kit offers: {q.error instanceof Error ? q.error.message : "unknown error"}</span>
      <button type="button" onClick={() => q.refetch()} className="h-8 rounded-lg border px-3 text-xs font-semibold flex items-center gap-1" style={{ borderColor: C.border }} data-testid="button-retry-half-kits"><RefreshCw className="w-3 h-3" />Retry</button>
    </div>
  );
  return (
    <div className="rounded-xl border p-4" style={wrap} data-testid="panel-half-kit-manager">
      <HalfKitManagerView scope={scope} data={q.data}
        onSave={(productId, input) => save.mutateAsync({ productId, input })}
        onRelease={id => release.mutateAsync(id)}
        onBulkPublish={async items => {
          const r = await publishSequentially(items.map(i => i.productId), id => saveOffer(scope, groupBuyId, id, items.find(i => i.productId === id)!.input));
          await refresh();
          return r;
        }} />
    </div>
  );
}

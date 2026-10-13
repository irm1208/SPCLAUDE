import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Package, RefreshCw } from "lucide-react";
import {
  HALF_KIT_POLL_MS, claimHalfKit, computeClaimTotals, fetchMemberOffers, formatMoney, isAuthRequired, isPreviewConflict, newRequestId,
  type ClaimResult, type HalfKitGroup, type MemberOffer, type MemberOrder, type MemberOffersResponse, type HalfKitAvailability,
} from "@/lib/half-kit-api";

export function HalfKitOfferCard({ offer, currency, onClaim, disabled }: { offer: MemberOffer; currency: string; onClaim: () => void; disabled: boolean }) {
  const extra = offer.deliveryCharge + offer.vendorShippingCharge;
  return (
    <li className="rounded-2xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: "#D0DAE4" }} data-testid={`card-offer-${offer.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#0F1F38]">{offer.productName}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC]">0.5 kit</p>
        </div>
        <p className="text-lg font-bold tabular-nums text-[#1B3A7A]" data-testid={`text-price-${offer.id}`}>{formatMoney(currency, offer.price)}</p>
      </div>
      {extra > 0 && (
        <dl className="text-xs text-[#6B7280] space-y-0.5">
          {offer.deliveryCharge > 0 && <div className="flex justify-between"><dt>Extra delivery</dt><dd className="tabular-nums">{formatMoney(currency, offer.deliveryCharge)}</dd></div>}
          {offer.vendorShippingCharge > 0 && <div className="flex justify-between"><dt>Vendor shipping</dt><dd className="tabular-nums">{formatMoney(currency, offer.vendorShippingCharge)}</dd></div>}
        </dl>
      )}
      <button type="button" disabled={disabled} onClick={onClaim} className="mt-auto h-10 rounded-xl text-sm font-bold text-white disabled:opacity-50 bg-[#1B3A7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6BCC]" data-testid={`button-claim-${offer.id}`}>
        Add to my order
      </button>
    </li>
  );
}

export function ClaimConfirmation({ offer, group, order, creditsBalance, useCredits }: { offer: MemberOffer; group: HalfKitGroup; order: MemberOrder; creditsBalance: number; useCredits: boolean }) {
  const t = computeClaimTotals(offer, creditsBalance, useCredits, group.allowCredits);
  const m = (n: number) => formatMoney(group.currency, n);
  return (
    <dl className="rounded-xl bg-[#F8FAFC] border p-3 text-sm space-y-1.5" style={{ borderColor: "#D0DAE4" }} data-testid="summary-claim">
      <Row k="Item" v={`${offer.productName} · 0.5 kit`} />
      <Row k="Added to order" v={`${order.code} (${order.paymentStatus})`} />
      <Row k="Half price" v={m(offer.price)} />
      {offer.deliveryCharge > 0 && <Row k="Extra delivery" v={m(offer.deliveryCharge)} />}
      {offer.vendorShippingCharge > 0 && <Row k="Vendor shipping" v={m(offer.vendorShippingCharge)} />}
      <Row k="Total" v={m(t.total)} strong />
      {t.credits > 0 && <Row k="Credits used" v={`- ${m(t.credits)}`} />}
      <Row k="Cash due now" v={m(t.cash)} strong />
      <p className="pt-1 text-[11px] text-[#6B7280]">No coupons apply to half kits. {order.paymentStatus === "paid" ? "Your original payment stays confirmed; only this additional amount becomes due." : "This amount is added to your order's payable total."}</p>
    </dl>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-3 ${strong ? "font-bold text-[#0F1F38]" : "text-[#374151]"}`}><dt>{k}</dt><dd className="tabular-nums text-right">{v}</dd></div>;
}

export default function GroupBuyHalfKits() {
  const [, params] = useRoute("/group-buys/:id/half-kits");
  return <HalfKitOffers gbId={params?.id ?? ""} />;
}

export function HalfKitOffers({ gbId, embedded = false, enabled = true }: { gbId: string; embedded?: boolean; enabled?: boolean }) {
  const qc = useQueryClient();
  const key = ["member-half-kits", gbId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchMemberOffers(gbId), enabled: !!gbId && enabled, staleTime: 0, refetchOnMount: "always", refetchInterval: HALF_KIT_POLL_MS });
  const [active, setActive] = useState<MemberOffer | null>(null);
  const [orderId, setOrderId] = useState("");
  const [useCredits, setUseCredits] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const [needsReconfirm, setNeedsReconfirm] = useState(false);
  const claim = useMutation({
    mutationFn: (expectedCredit: number) => claimHalfKit(gbId, active!.id, { orderId, version: active!.version, useCredits, requestId: requestIdRef.current!, expectedCredit }),
    onSuccess: async r => {
      const claimedOfferId = active!.id;
      const availabilityKey = ["account", "half-kit-availability"];
      // A confirmed claim must disappear even if the subsequent refresh fails.
      // Cancel older reads before patching, so they cannot restore the taken half.
      await Promise.all([
        qc.cancelQueries({ queryKey: key }),
        qc.cancelQueries({ queryKey: availabilityKey }),
      ]);
      let remaining: number | undefined;
      qc.setQueryData<MemberOffersResponse>(key, cached => {
        if (!cached) return cached;
        const offers = cached.offers.filter(offer => offer.id !== claimedOfferId);
        remaining = offers.length;
        return { ...cached, offers };
      });
      if (remaining !== undefined) {
        const remainingCount = remaining;
        qc.setQueryData<HalfKitAvailability>(availabilityKey, cached => cached && ({
          counts: { ...cached.counts, [gbId]: Math.min(cached.counts[gbId] ?? 0, remainingCount) },
        }));
      }
      setResult(r); setActive(null); requestIdRef.current = null;
      qc.invalidateQueries({ queryKey: ["account", "orders"] });
      qc.invalidateQueries({ queryKey: ["account", "me"] });
      qc.invalidateQueries({ queryKey: ["gb-capacity", gbId] });
    },
    onError: e => { if (isPreviewConflict(e)) setNeedsReconfirm(true); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["account", "half-kit-availability"] });
      return qc.invalidateQueries({ queryKey: key });
    },
  });
  // After a 409 the refreshed preview may differ: sync the open offer to its latest server snapshot.
  useEffect(() => {
    if (!needsReconfirm || !active || !q.data) return;
    const latest = q.data.offers.find(o => o.id === active.id);
    if (!latest) { setActive(null); requestIdRef.current = null; setNeedsReconfirm(false); claim.reset(); return; }
    if (latest.version !== active.version || latest.price !== active.price || latest.deliveryCharge !== active.deliveryCharge || latest.vendorShippingCharge !== active.vendorShippingCharge) setActive(latest);
  }, [q.data, needsReconfirm]);
  const orders = q.data?.orders ?? [];
  useEffect(() => { if (orders.length === 1) setOrderId(orders[0].id); }, [orders.length, orders[0]?.id]);

  const open = (o: MemberOffer) => { setActive(o); setResult(null); claim.reset(); requestIdRef.current = newRequestId(); setNeedsReconfirm(false); };
  const close = () => { if (claim.isPending) return; setActive(null); requestIdRef.current = null; setNeedsReconfirm(false); claim.reset(); };
  const order = orders.find(o => o.id === orderId);
  const previewCredit = active && q.data && order ? computeClaimTotals(active, q.data.creditsBalance, useCredits, q.data.group.allowCredits).credits : 0;
  const confirm = () => { setNeedsReconfirm(false); claim.reset(); claim.mutate(previewCredit); };

  if (embedded && (!enabled || q.isLoading || (!q.isError && !q.data) || (q.data?.offers.length === 0 && !result && !active))) return null;

  return (
    <div className={embedded ? "rounded-2xl border p-4 space-y-4" : "min-h-[100dvh] bg-[#F8FAFC]"}
      style={embedded ? { background: "var(--t-surface)", borderColor: "var(--t-border)" } : undefined}
      data-testid={embedded ? "section-order-half-kits" : "page-half-kits"}>
      {embedded ? (
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{result && q.data?.offers.length === 0 ? "Half kit added" : "Available half kits"}</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>Add a published half kit to an order you already placed in this group buy. These are separate from your new order below.</p>
        </div>
      ) : (
      <header className="text-white" style={{ background: "linear-gradient(135deg, #3B66C8 0%, #1B3A7A 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link href="/account?s=groups" className="inline-flex items-center gap-1 text-xs text-white/75 hover:text-white" data-testid="link-back"><ArrowLeft className="w-3.5 h-3.5" />Back to my group buys</Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#E9A020]">Available half kits</p>
          <h1 className="text-2xl font-bold text-white">{q.data?.group.name ?? "Group buy"}</h1>
          <p className="mt-1 text-sm text-white/75">Add a remaining half kit to an order you already placed in this group buy.</p>
        </div>
      </header>
      )}
      <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl px-4 py-6 space-y-4"}>
        {result && (
          <div role="status" className="rounded-2xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: "rgba(34,197,94,0.4)" }} data-testid="status-claim-success">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="flex-1 text-sm text-[#374151]">Half kit added to <span className="font-mono font-bold">{result.orderCode}</span>. Amount due: <b>{formatMoney(q.data?.group.currency ?? "", result.amountDue)}</b></p>
            <Link href={result.paymentPath} className="h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold text-white bg-[#1B3A7A]" data-testid="link-payment">Go to payment</Link>
          </div>
        )}
        {q.isLoading ? (
          <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true">{[0, 1].map(i => <li key={i} className="h-36 rounded-2xl bg-white border animate-pulse" style={{ borderColor: "#D0DAE4" }} />)}</ul>
        ) : q.isError || !q.data ? (
          <div role="alert" className="rounded-2xl border bg-white p-5 text-sm flex items-center justify-between gap-3" style={{ borderColor: "#D0DAE4" }}>
            <span className="text-red-600">{q.error instanceof Error ? q.error.message : "Could not load offers."}</span>
            <div className="flex shrink-0 gap-2">
              {isAuthRequired(q.error) && (
                <Link href="/account" className="h-9 rounded-lg px-3 text-xs font-bold text-white bg-[#1B3A7A] inline-flex items-center" data-testid="link-sign-in">Sign in</Link>
              )}
              <button type="button" onClick={() => q.refetch()} className="h-9 rounded-lg border px-3 text-xs font-semibold inline-flex items-center gap-1" data-testid="button-retry"><RefreshCw className="w-3 h-3" />Retry</button>
            </div>
          </div>
        ) : q.data.offers.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: "#D0DAE4" }} data-testid="text-no-offers">
            <Package className="mx-auto w-6 h-6 text-[#8A9AAA]" />
            <p className="mt-2 font-semibold text-[#0F1F38]">No half kits available right now</p>
            <p className="text-sm text-[#6B7280]">Your organiser publishes these when a product total is left at .5. This page refreshes automatically.</p>
          </div>
        ) : (
          <>
            {orders.length === 0 && <p role="note" className="rounded-xl border bg-amber-50 p-3 text-sm text-amber-900" style={{ borderColor: "rgba(233,160,32,0.4)" }}>You need a submitted, not-yet-dispatched order in this group buy to claim a half kit.</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
              {q.data.offers.map(o => <HalfKitOfferCard key={o.id} offer={o} currency={q.data!.group.currency} disabled={orders.length === 0} onClaim={() => open(o)} />)}
            </ul>
          </>
        )}
      </div>

      {active && q.data && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0F1F38]/50 p-0 sm:p-4" onClick={close}>
          <div role="dialog" aria-modal="true" aria-labelledby="claim-title" className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 id="claim-title" className="text-lg font-bold text-[#0F1F38]">Confirm half kit</h2>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">Target order</span>
              <select className="mt-1 h-10 w-full rounded-lg border px-2 text-sm" style={{ borderColor: "#D0DAE4" }} value={orderId} disabled={claim.isPending}
                onChange={e => setOrderId(e.target.value)} data-testid="select-order">
                <option value="">Select an order…</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.code} · {o.paymentStatus} · due {formatMoney(q.data!.group.currency, o.amountDue)}</option>)}
              </select>
            </label>
            {q.data.group.allowCredits && q.data.creditsBalance > 0 && (
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <input type="checkbox" className="h-4 w-4 accent-[#2D6BCC]" checked={useCredits} disabled={claim.isPending} onChange={e => setUseCredits(e.target.checked)} data-testid="checkbox-use-credits" />
                Use credits (balance {formatMoney(q.data.group.currency, q.data.creditsBalance)})
              </label>
            )}
            {order ? <ClaimConfirmation offer={active} group={q.data.group} order={order} creditsBalance={q.data.creditsBalance} useCredits={useCredits} />
              : <p className="text-sm text-[#6B7280]">Choose which order receives this half.</p>}
            {needsReconfirm ? (
              <p role="alert" className="text-sm text-amber-900 rounded-lg bg-amber-50 p-2" data-testid="status-reconfirm">The price, credits or availability changed. The summary above is refreshed; please check it and confirm again.</p>
            ) : claim.isError && <p role="alert" className="text-sm text-red-600">{claim.error instanceof Error ? claim.error.message : "Claim failed"}. You can retry safely.</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} disabled={claim.isPending} className="h-10 rounded-xl border border-dashed px-4 text-sm text-[#8A9AAA]" style={{ borderColor: "#D0DAE4" }} data-testid="button-cancel-claim">Cancel</button>
              <button type="button" disabled={!order || claim.isPending || (needsReconfirm && q.isFetching)} onClick={confirm} className="h-10 rounded-xl px-4 text-sm font-bold text-white bg-[#1B3A7A] disabled:opacity-50 inline-flex items-center gap-2" data-testid="button-confirm-claim">
                {claim.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{needsReconfirm ? "Confirm updated amount" : claim.isError ? "Retry" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

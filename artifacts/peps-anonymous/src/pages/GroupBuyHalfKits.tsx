import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useDraftStore } from "@/hooks/use-draft-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ChevronDown, Loader2, Package, RefreshCw } from "lucide-react";
import { HalfKitClaimDialog } from "@/components/half-kits/HalfKitClaimDialog";
import {
  HALF_KIT_POLL_MS, claimHalfKit, computeClaimTotals, fetchMemberOffers, formatMoney, isAuthRequired, isPreviewConflict, isHalfKitTaken, newRequestId,
  type ClaimResult, type HalfKitGroup, type MemberOffer, type MemberOrder, type MemberOffersResponse, type HalfKitAvailability,
} from "@/lib/half-kit-api";

export function HalfKitOfferCard({ offer, currency, onClaim, disabled, embedded = false, selected = false }: { offer: MemberOffer; currency: string; onClaim: () => void; disabled: boolean; embedded?: boolean; selected?: boolean }) {
  const extra = offer.deliveryCharge + offer.vendorShippingCharge;
  if (embedded) return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 px-3 py-3 border-b last:border-b-0"
      style={{ background: "#162231", borderColor: "rgba(255,255,255,0.08)" }} data-testid={`card-offer-${offer.id}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug break-words" style={{ color: "#FFFFFF" }}>{offer.productName}</p>
        <p className="text-[10px] font-semibold" style={{ color: "#60A5FA" }}>0.5 kit</p>
      </div>
      <p className="text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap" style={{ color: "#FFFFFF" }}
        data-testid={`text-price-${offer.id}`}>{formatMoney(currency, offer.price)}</p>
      <button type="button" disabled={disabled} onClick={onClaim} aria-label={`Add ${offer.productName} half kit to my order`}
        className="min-h-11 min-w-11 rounded-lg px-3 text-xs font-bold text-white bg-[#1B3A7A] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#60A5FA]"
        style={{ border: "1px solid rgba(96,165,250,0.35)" }} data-testid={`button-claim-${offer.id}`}>{selected ? "Added" : "Add"}</button>
      {extra > 0 && <p className="col-span-3 text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
        {offer.deliveryCharge > 0 && <>Extra delivery {formatMoney(currency, offer.deliveryCharge)}</>}
        {offer.deliveryCharge > 0 && offer.vendorShippingCharge > 0 && " · "}
        {offer.vendorShippingCharge > 0 && <>Vendor shipping {formatMoney(currency, offer.vendorShippingCharge)}</>}
      </p>}
    </li>
  );
  return (
    <li className={`rounded-xl border p-4 flex flex-col gap-3 ${embedded ? "sm:flex-row sm:items-center" : "bg-white"}`} style={{ borderColor: embedded ? "rgba(255,255,255,0.12)" : "#D0DAE4", ...(embedded && { background: "#162231" }) }} data-testid={`card-offer-${offer.id}`}>
      <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#0F1F38] break-words" style={embedded ? { color: "#FFFFFF" } : undefined}>{offer.productName}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D6BCC]" style={embedded ? { color: "#60A5FA" } : undefined}>0.5 kit</p>
        </div>
        <p className="text-lg font-bold tabular-nums text-[#1B3A7A]" style={embedded ? { color: "#FFFFFF" } : undefined} data-testid={`text-price-${offer.id}`}>{formatMoney(currency, offer.price)}</p>
      </div>
      {extra > 0 && (
        <dl className="text-xs text-[#6B7280] space-y-0.5" style={embedded ? { color: "rgba(255,255,255,0.75)" } : undefined}>
          {offer.deliveryCharge > 0 && <div className="flex justify-between"><dt>Extra delivery</dt><dd className="tabular-nums">{formatMoney(currency, offer.deliveryCharge)}</dd></div>}
          {offer.vendorShippingCharge > 0 && <div className="flex justify-between"><dt>Vendor shipping</dt><dd className="tabular-nums">{formatMoney(currency, offer.vendorShippingCharge)}</dd></div>}
        </dl>
      )}
      </div>
      <button type="button" disabled={disabled} onClick={onClaim} className={`${embedded ? "sm:shrink-0 sm:w-40" : "mt-auto"} h-10 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 bg-[#1B3A7A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6BCC]`} style={embedded ? { background: "#1B3A7A", border: "1px solid rgba(96,165,250,0.35)" } : undefined} data-testid={`button-claim-${offer.id}`}>
        Add to my order
      </button>
    </li>
  );
}

export function ClaimConfirmation({ offer, group, order, creditsBalance, useCredits }: { offer: MemberOffer; group: HalfKitGroup; order: MemberOrder; creditsBalance: number; useCredits: boolean }) {
  const t = computeClaimTotals(offer, creditsBalance, useCredits, group.allowCredits);
  const m = (n: number) => formatMoney(group.currency, n);
  return (
    <dl className="rounded-xl border p-3 text-sm space-y-1.5" style={{ background: "var(--t-surface2)", color: "var(--t-text)", borderColor: "var(--t-border)" }} data-testid="summary-claim">
      <Row k="Item" v={`${offer.productName} · 0.5 kit`} />
      <Row k="Added to order" v={`${order.code} (${order.paymentStatus})`} />
      <Row k="Half price" v={m(offer.price)} />
      {offer.deliveryCharge > 0 && <Row k="Extra delivery" v={m(offer.deliveryCharge)} />}
      {offer.vendorShippingCharge > 0 && <Row k="Vendor shipping" v={m(offer.vendorShippingCharge)} />}
      <Row k="Total" v={m(t.total)} strong />
      {t.credits > 0 && <Row k="Credits used" v={`- ${m(t.credits)}`} />}
      <Row k="Cash due now" v={m(t.cash)} strong />
      <p className="pt-1 text-[11px]" style={{ color: "var(--t-muted)" }}>No coupons apply to half kits. {order.paymentStatus === "paid" ? "Your original payment stays confirmed; only this additional amount becomes due." : "This amount is added to your order's payable total."}</p>
    </dl>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`} style={{ color: "var(--t-text)" }}><dt className="shrink-0">{k}</dt><dd className="min-w-0 break-words tabular-nums text-right">{v}</dd></div>;
}

export default function GroupBuyHalfKits() {
  const [, params] = useRoute("/group-buys/:id/half-kits");
  return <HalfKitOffers gbId={params?.id ?? ""} />;
}

export function HalfKitOffers({ gbId, embedded = false, enabled = true }: { gbId: string; embedded?: boolean; enabled?: boolean }) {
  const draftGroupId = useDraftStore(state => state.groupBuyId);
  const selectedCheckout = useDraftStore(state => state.halfKitCheckout);
  const selectedIds = new Set(draftGroupId === gbId && selectedCheckout
    ? [selectedCheckout.offerId, ...(selectedCheckout.additionalOffers ?? []).map(selection => selection.offerId)] : []);
  const [, navigate] = useLocation();
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

  const open = (o: MemberOffer) => {
    if (orders.length === 0) {
      const previous = useDraftStore.getState();
      if (previous.groupBuyId === gbId && previous.halfKitCheckout) {
        const selections = [previous.halfKitCheckout, ...(previous.halfKitCheckout.additionalOffers ?? [])];
        if (!selections.some(selection => selection.offerId === o.id)) {
          const { additionalOffers: _, ...first } = previous.halfKitCheckout;
          useDraftStore.setState({
            halfKitCheckout: { ...first, additionalOffers: [
              ...(previous.halfKitCheckout.additionalOffers ?? []),
              { offerId: o.id, productId: o.productId, version: o.version, price: o.price, requestId: newRequestId() },
            ] },
            lineItems: [...previous.lineItems, { id: newRequestId(), productId: o.productId, productName: o.productName, quantity: 0.5, unitPrice: o.price * 2, lineTotal: o.price }],
          });
        }
        navigate(`/order?gbId=${encodeURIComponent(gbId)}`);
        return;
      }
      if ((previous.orderId || previous.lineItems.some(item => item.productId)) &&
        !window.confirm("Start a separate half-kit order? This will replace the products in your current draft.")) return;
      // Normal checkout supplies delivery, vendor shipping, fees and payment. Do not reserve yet.
      useDraftStore.getState().clearDraft();
      useDraftStore.getState().setGroupBuyId(gbId);
      useDraftStore.setState({
        telegramUsername: previous.telegramUsername,
        halfKitCheckout: { offerId: o.id, productId: o.productId, version: o.version, price: o.price, requestId: newRequestId() },
        lineItems: [{ id: newRequestId(), productId: o.productId, productName: o.productName, quantity: 0.5, unitPrice: o.price * 2, lineTotal: o.price }],
      });
      navigate(`/order?gbId=${encodeURIComponent(gbId)}`);
      return;
    }
    setActive(o); setResult(null); claim.reset(); requestIdRef.current = newRequestId(); setNeedsReconfirm(false);
  };
  const close = () => { if (claim.isPending) return; setActive(null); requestIdRef.current = null; setNeedsReconfirm(false); claim.reset(); };
  const order = orders.find(o => o.id === orderId);
  const previewCredit = active && q.data && order ? computeClaimTotals(active, q.data.creditsBalance, useCredits, q.data.group.allowCredits).credits : 0;
  const confirm = () => { setNeedsReconfirm(false); claim.reset(); claim.mutate(previewCredit); };
  const OfferSection = embedded ? "details" : "div";

  if (embedded && (!enabled || q.isLoading || (!q.isError && !q.data) || (q.data?.offers.length === 0 && !result && !active))) return null;

  return (
    <div className={embedded ? "order-form-half-kits mb-4 pb-4" : "min-h-[100dvh] bg-[#F8FAFC]"}
      style={embedded ? { borderBottom: "1px solid rgba(255,255,255,0.14)" } : undefined}
      data-testid={embedded ? "section-order-half-kits" : "page-half-kits"}>
      <OfferSection className={embedded ? "group" : undefined}>
      {embedded ? (
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#60A5FA]"
          data-testid="toggle-half-kit-offers">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
              <Package className="w-3.5 h-3.5 text-[#60A5FA]" aria-hidden="true" />
            </div>
            <span className="flex-1 text-xs font-bold text-[#E9A020]">{result && q.data?.offers.length === 0 ? "Half kit added" : "Available half kits"}
              {q.data && q.data.offers.length > 0 && <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">{q.data.offers.length}</span>}
            </span>
            <span className="text-[11px] text-white/75 group-open:hidden">View</span>
            <span className="hidden text-[11px] text-white/75 group-open:inline">Hide</span>
            <ChevronDown className="h-4 w-4 text-white/75 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
      ) : (
      <header className="text-white" style={{ background: "linear-gradient(135deg, #3B66C8 0%, #1B3A7A 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link href="/account?s=groups" className="inline-flex items-center gap-1 text-xs text-white/75 hover:text-white" data-testid="link-back"><ArrowLeft className="w-3.5 h-3.5" />Back to my group buys</Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#E9A020]">Available half kits</p>
          <h1 className="text-2xl font-bold text-white">{q.data?.group.name ?? "Group buy"}</h1>
          <p className="mt-1 text-sm text-white/75">Add a remaining half kit to an existing order, or create a new order with normal group-buy shipping.</p>
        </div>
      </header>
      )}
      <div className={embedded ? "mt-2 space-y-2" : "mx-auto max-w-3xl px-4 py-6 space-y-4"}>
        {embedded && <p className="text-[11px] leading-relaxed text-white/65">Add to your existing order, or check out with a new order if you don’t have one.</p>}
        {result && (
          <div role="status" className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${embedded ? "" : "bg-white"}`} style={{ borderColor: "rgba(34,197,94,0.4)", ...(embedded && { background: "#162231" }) }} data-testid="status-claim-success">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="flex-1 text-sm text-[#374151]" style={embedded ? { color: "rgba(255,255,255,0.85)" } : undefined}>Half kit added to <span className="font-mono font-bold">{result.orderCode}</span>. Amount due: <b>{formatMoney(q.data?.group.currency ?? "", result.amountDue)}</b></p>
            <Link href={result.paymentPath} className="h-10 inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold text-white bg-[#1B3A7A]" data-testid="link-payment">Go to payment</Link>
          </div>
        )}
        {q.isLoading ? (
          <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true">{[0, 1].map(i => <li key={i} className="h-36 rounded-2xl bg-white border animate-pulse" style={{ borderColor: "#D0DAE4" }} />)}</ul>
        ) : q.isError || !q.data ? (
          <div role="alert" className={`rounded-2xl border p-5 text-sm flex flex-wrap items-center justify-between gap-3 ${embedded ? "" : "bg-white"}`} style={{ borderColor: embedded ? "rgba(255,255,255,0.12)" : "#D0DAE4", ...(embedded && { background: "#162231", color: "#FFFFFF" }) }}>
            <span className={embedded ? "text-red-300" : "text-red-600"}>{q.error instanceof Error ? q.error.message : "Could not load offers."}</span>
            <div className="flex shrink-0 gap-2">
              {isAuthRequired(q.error) && (
                <Link href="/account" className="h-9 rounded-lg px-3 text-xs font-bold text-white bg-[#1B3A7A] inline-flex items-center" data-testid="link-sign-in">Sign in</Link>
              )}
              <button type="button" onClick={() => q.refetch()} className="h-9 rounded-lg border px-3 text-xs font-semibold inline-flex items-center gap-1" data-testid="button-retry"><RefreshCw className="w-3 h-3" />Retry</button>
            </div>
          </div>
        ) : q.data.offers.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-8 text-center ${embedded ? "" : "bg-white"}`} style={{ borderColor: embedded ? "rgba(255,255,255,0.12)" : "#D0DAE4", ...(embedded && { background: "#162231" }) }} data-testid="text-no-offers">
            <Package className="mx-auto w-6 h-6 text-[#8A9AAA]" />
            <p className="mt-2 font-semibold text-[#0F1F38]" style={embedded ? { color: "#FFFFFF" } : undefined}>No half kits available right now</p>
            <p className="text-sm text-[#6B7280]" style={embedded ? { color: "rgba(255,255,255,0.75)" } : undefined}>Your organiser publishes these when a product total is left at .5. This page refreshes automatically.</p>
          </div>
        ) : (
          <>
            {orders.length === 0 && <p role="note" className="text-xs" style={{ color: embedded ? "rgba(255,255,255,0.75)" : "#6B7280" }}>No existing order needed. Add one or more available half kits, then choose delivery and review your combined total. Normal group-buy delivery and vendor shipping apply once to the order.</p>}
            <ul className={embedded ? "max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-white/10" : "grid gap-3 sm:grid-cols-2"} data-testid="list-half-kit-offers"
              tabIndex={embedded ? 0 : undefined} aria-label="Available half kits">
              {q.data.offers.map(o => <HalfKitOfferCard key={o.id} offer={orders.length ? o : { ...o, deliveryCharge: 0, vendorShippingCharge: 0 }} currency={q.data!.group.currency} embedded={embedded} selected={!orders.length && selectedIds.has(o.id)} disabled={!orders.length && selectedIds.has(o.id)} onClaim={() => open(o)} />)}
            </ul>
          </>
        )}
      </div>
      </OfferSection>

      {active && q.data && (
        <HalfKitClaimDialog pending={claim.isPending} onClose={close} footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={close} disabled={claim.isPending} className="h-10 rounded-xl border px-4 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-muted)" }} data-testid="button-cancel-claim">{isHalfKitTaken(claim.error) ? "Close" : "Cancel"}</button>
            {!isHalfKitTaken(claim.error) && <button type="button" disabled={!order || claim.isPending || (needsReconfirm && q.isFetching)} onClick={confirm} className="h-10 rounded-xl px-4 text-sm font-bold text-white bg-[#1B3A7A] disabled:opacity-50 inline-flex items-center gap-2" data-testid="button-confirm-claim">
              {claim.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{needsReconfirm ? "Confirm updated amount" : claim.isError ? "Retry" : "Confirm"}
            </button>}
          </div>
        }>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Target order</span>
              <select className="mt-1 min-h-11 w-full rounded-lg border px-2 text-base" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)", color: "var(--t-text)" }} value={orderId} disabled={claim.isPending}
                onChange={e => setOrderId(e.target.value)} data-testid="select-order">
                <option value="">Select an order…</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.code} · {o.paymentStatus} · due {formatMoney(q.data!.group.currency, o.amountDue)}</option>)}
              </select>
            </label>
            {q.data.group.allowCredits && q.data.creditsBalance > 0 && (
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--t-text)" }}>
                <input type="checkbox" className="h-4 w-4 accent-[#2D6BCC]" checked={useCredits} disabled={claim.isPending} onChange={e => setUseCredits(e.target.checked)} data-testid="checkbox-use-credits" />
                Use credits (balance {formatMoney(q.data.group.currency, q.data.creditsBalance)})
              </label>
            )}
            {order ? <ClaimConfirmation offer={active} group={q.data.group} order={order} creditsBalance={q.data.creditsBalance} useCredits={useCredits} />
               : <p className="text-sm" style={{ color: "var(--t-muted)" }}>Choose which order receives this half.</p>}
            {needsReconfirm ? (
              <p role="alert" className="text-sm text-amber-900 rounded-lg bg-amber-50 p-2" data-testid="status-reconfirm">The price, credits or availability changed. The summary above is refreshed; please check it and confirm again.</p>
            ) : claim.isError && <p role="alert" className="text-sm text-red-600">{claim.error instanceof Error ? claim.error.message : "Claim failed"}{isHalfKitTaken(claim.error) ? " Please choose another available half kit." : " You can retry safely."}</p>}
        </HalfKitClaimDialog>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, Copy, Check, Users, Truck, Lock, Plus, Minus, Search, Crown,
  ArrowLeft, CreditCard, CheckCircle2, Clock, Share2, Ban, AlertCircle,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount } from "@/hooks/use-account";
import {
  useWholesaleShare,
  joinWholesaleShare,
  setWholesaleShareItems,
  setWholesaleShareDelivery,
  setWholesaleShareSplit,
  lockWholesaleShare,
  cancelWholesaleShare,
  useInvalidateWholesaleShare,
  type WholesaleShareDetail,
  type WholesaleSplitMode,
} from "@/hooks/use-wholesale-shares";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  active?: boolean;
}

const money = (n: number) => `$${n.toFixed(2)}`;

function StatusBadge({ status }: { status: WholesaleShareDetail["status"] }) {
  const meta: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "Open", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    locked: { label: "Locked — paying", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
    submitted: { label: "Submitted", color: "var(--t-blue)", bg: "var(--t-blue-08)" },
    cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };
  const m = meta[status] ?? meta.open;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
}

// Only a fully `confirmed` payment counts toward the shared order's auto-submit
// (the backend's allPaid / maybeSubmitSharedOrder use `confirmed` only).
function PayBadge({ paymentStatus }: { paymentStatus: string | null }) {
  const paid = paymentStatus === "confirmed";
  const pending = paymentStatus === "pending_confirmation";
  const testOnly = paymentStatus === "test_confirmed";
  const color = paid ? "#22c55e" : (pending || testOnly) ? "#eab308" : "#ef4444";
  const bg = paid ? "rgba(34,197,94,0.12)" : (pending || testOnly) ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)";
  const label = paid ? "Paid" : pending ? "Checking…" : testOnly ? "Test only" : "Unpaid";
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ color, background: bg }}>
      {paid ? <CheckCircle2 className="w-3 h-3" /> : (pending || testOnly) ? <Clock className="w-3 h-3" /> : null}
      {label}
    </span>
  );
}

export default function WholesaleShared() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/wholesale/shared/:id");
  const id = params?.id ?? null;
  const { account, isLoading: accountLoading } = useAccount();
  const invalidate = useInvalidateWholesaleShare();

  const { data: result, isLoading: shareLoading } = useWholesaleShare(id);
  const share = result?.ok ? result.share : null;

  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Local editor state for the current member's items + tip
  const [myItems, setMyItems] = useState<Record<string, number>>({});
  const [myTip, setMyTip] = useState(0);
  const [itemsDirty, setItemsDirty] = useState(false);

  // Creator-only delivery picker — organiser chooses WHICH member receives the
  // parcel; the address itself comes from that member's saved account profile.
  const [delUser, setDelUser] = useState("");
  const deliverySeeded = useRef(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // Gate: wholesale members only
  useEffect(() => {
    if (!accountLoading && (!account || !account.isWholesale)) setLocation("/wholesale");
  }, [accountLoading, account, setLocation]);

  // Load wholesale products once
  useEffect(() => {
    fetch("/api/wholesale/products")
      .then(r => (r.ok ? r.json() : []))
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const myMember = useMemo(() => share?.members.find(m => m.isYou) ?? null, [share]);

  // Seed my items/tip from the server unless I have unsaved local edits
  useEffect(() => {
    if (!myMember || itemsDirty) return;
    const q: Record<string, number> = {};
    myMember.items.forEach(it => { q[it.productId] = it.quantity; });
    setMyItems(q);
    setMyTip(myMember.tip ?? 0);
  }, [myMember, itemsDirty]);

  // Seed the delivery picker once from the share's current delivery member.
  useEffect(() => {
    if (!share || deliverySeeded.current) return;
    if (share.isCreator) setDelUser(share.delivery.username ?? "");
    deliverySeeded.current = true;
  }, [share]);

  const priceOf = (productId: string) => products.find(p => p.id === productId)?.price ?? 0;
  const nameOf = (productId: string) => products.find(p => p.id === productId)?.name ?? productId;

  const myKits = useMemo(() => Object.values(myItems).reduce((s, q) => s + (q > 0 ? q : 0), 0), [myItems]);
  const mySubtotal = useMemo(
    () => Object.entries(myItems).reduce((s, [pid, q]) => s + (q > 0 ? q * priceOf(pid) : 0), 0),
    [myItems, products],
  );

  if (accountLoading || (shareLoading && !result)) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
        </div>
      </PageLayout>
    );
  }
  if (!account || !account.isWholesale) return null;

  // ── Not found / not a member yet ──
  if (result && !result.ok) {
    const notFound = result.status === 404;
    const canJoin = result.status === 403 && !notFound;
    return (
      <PageLayout>
        <main className="px-4 py-8 max-w-md mx-auto w-full">
          <button onClick={() => setLocation("/wholesale")} className="flex items-center gap-1.5 text-sm mb-5" style={{ color: "var(--t-muted)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to wholesale
          </button>
          <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "var(--t-blue-08)" }}>
              {notFound ? <AlertCircle className="w-6 h-6" style={{ color: "var(--t-blue)" }} /> : <Users className="w-6 h-6" style={{ color: "var(--t-blue)" }} />}
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                {notFound ? "Shared order not found" : "Join shared wholesale order"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>
                {notFound
                  ? "This code doesn't match any shared order. Double-check the code with the organiser."
                  : <>You've been invited to shared order <span className="font-mono font-bold" style={{ color: "var(--t-text)" }}>{id}</span>. Join to add your own items.</>}
              </p>
            </div>
            {canJoin && (
              <>
                {actionError && <p className="text-sm" style={{ color: "#ef4444" }}>{actionError}</p>}
                <button
                  disabled={busy === "join"}
                  onClick={async () => {
                    setActionError(""); setBusy("join");
                    try { await joinWholesaleShare(id!); invalidate(id!); }
                    catch (e) { setActionError((e as Error).message); }
                    finally { setBusy(null); }
                  }}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "var(--t-blue)" }}
                >
                  {busy === "join" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Join this shared order
                </button>
              </>
            )}
          </div>
        </main>
      </PageLayout>
    );
  }

  if (!share) return null;

  const isOpen = share.status === "open";
  const canEditItems = isOpen && share.isMember;
  const paidCount = share.members.filter(m => m.paymentStatus === "confirmed").length;

  // Lock readiness hints (creator, while open)
  const everyoneHasItems = share.members.length > 0 && share.members.every(m => m.kits > 0);
  const deliverySet = !!share.delivery.username && !!share.delivery.address && !!share.delivery.country && !!share.delivery.name;
  const shippingCalculable = deliverySet && share.estimateCalculable;
  const canLock = isOpen && share.members.length >= 2 && everyoneHasItems && deliverySet && shippingCalculable;

  const setQty = (pid: string, val: number) => {
    const v = Math.max(0, Math.round(val));
    setItemsDirty(true);
    setMyItems(prev => {
      const next = { ...prev };
      if (v <= 0) delete next[pid]; else next[pid] = v;
      return next;
    });
  };

  const saveItems = async () => {
    if (!id) return;
    setActionError(""); setBusy("items");
    try {
      const items = Object.entries(myItems).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
      await setWholesaleShareItems(id, items, myTip);
      setItemsDirty(false);
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const saveDelivery = async () => {
    if (!id || !delUser) return;
    setActionError(""); setBusy("delivery");
    try {
      await setWholesaleShareDelivery(id, delUser);
      invalidate(id);
    } catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const changeSplit = async (mode: WholesaleSplitMode) => {
    if (!id || mode === share.splitMode) return;
    setActionError(""); setBusy("split");
    try { await setWholesaleShareSplit(id, mode); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const doLock = async () => {
    if (!id) return;
    setActionError(""); setBusy("lock");
    try { await lockWholesaleShare(id); invalidate(id); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(null); }
  };

  const doCancel = async () => {
    if (!id) return;
    const msg = share.status === "locked"
      ? "Cancel this locked shared order for everyone? Each member's order will be cancelled and anyone who already paid will need a manual refund. This can't be undone."
      : "Cancel this shared order for everyone? This can't be undone.";
    if (!window.confirm(msg)) return;
    setActionError(""); setBusy("cancel");
    try { await cancelWholesaleShare(id); invalidate(id); setLocation("/wholesale"); }
    catch (e) { setActionError((e as Error).message); setBusy(null); }
  };

  const copy = (text: string, which: "code" | "link") => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  const searchQ = productSearch.trim().toLowerCase();
  const visibleProducts = (searchQ ? products.filter(p => p.name.toLowerCase().includes(searchQ)) : products)
    .filter(p => p.active !== false);

  const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" } as const;
  const field = { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" } as const;

  return (
    <PageLayout>
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="px-4 py-5 pb-36 max-w-3xl mx-auto w-full space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <button onClick={() => setLocation("/wholesale")} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--t-muted)" }}>
              <ArrowLeft className="w-4 h-4" /> Back to wholesale
            </button>

            {/* Header / code */}
            <div className="rounded-2xl p-5 space-y-4" style={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Shared Wholesale Order</h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--t-muted)" }}>
                    One parcel, split between members. Everyone pays their own items.
                  </p>
                </div>
                <StatusBadge status={share.status} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => copy(share.id, "code")}
                  className="inline-flex items-center gap-2 px-3 h-10 rounded-xl font-mono font-bold text-lg tracking-widest"
                  style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}
                  title="Copy share code"
                >
                  {share.id}
                  {copied === "code" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copy(shareLink, "link")}
                  className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}
                >
                  {copied === "link" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied === "link" ? "Link copied" : "Copy invite link"}
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm ml-auto" style={{ color: "var(--t-muted)" }}>
                  <Users className="w-4 h-4" /> {share.memberCount}/{share.maxMembers} members
                </span>
              </div>
            </div>

            {/* Status banners */}
            {share.status === "submitted" && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#15803d" }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Everyone has paid — this order has been submitted to the vendor.
              </div>
            )}
            {share.status === "locked" && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(234,179,8,0.10)", border: "1px solid rgba(234,179,8,0.25)", color: "#a16207" }}>
                <Clock className="w-4 h-4 shrink-0" /> {paidCount} of {share.members.length} members have paid. The order is submitted automatically once everyone pays.
              </div>
            )}
            {share.status === "cancelled" && (
              <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>
                <Ban className="w-4 h-4 shrink-0" /> This shared order was cancelled.
              </div>
            )}

            {actionError && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c" }}>
                {actionError}
              </div>
            )}

            {/* Members */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Members</p>
              <div className="rounded-xl divide-y" style={{ ...card, borderColor: "var(--t-border)" }}>
                {share.members.map(m => (
                  <div key={m.username} className="p-4 flex items-start justify-between gap-3" style={{ borderColor: "var(--t-border)" }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>@{m.username.replace(/^@/, "")}</span>
                        {m.isCreator && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                            <Crown className="w-2.5 h-2.5" /> Organiser
                          </span>
                        )}
                        {m.isYou && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>You</span>}
                        {share.delivery.username && m.username.toLowerCase() === share.delivery.username.toLowerCase() && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                            <Truck className="w-2.5 h-2.5" /> Delivery
                          </span>
                        )}
                        {!isOpen && <PayBadge paymentStatus={m.paymentStatus} />}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>
                        {m.kits > 0 ? `${m.kits} kit${m.kits === 1 ? "" : "s"} · ${money(m.subtotal)}` : "No items yet"}
                        {m.tip > 0 && ` · tip ${money(m.tip)}`}
                        {m.shippingShare != null && ` · ship ${money(m.shippingShare)}`}
                        {m.orderCode && ` · order #${m.orderCode}`}
                      </p>
                    </div>
                    {!isOpen && m.isYou && m.orderId && m.paymentStatus !== "confirmed" && share.status !== "cancelled" && (
                      <button
                        onClick={() => setLocation(`/account/orders/${m.orderId}`)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-bold text-white"
                        style={{ background: "var(--t-blue)" }}
                      >
                        <CreditCard className="w-4 h-4" /> Pay
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* My items editor */}
            {canEditItems && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>My Items</p>
                  {itemsDirty && <span className="text-xs font-semibold" style={{ color: "#eab308" }}>Unsaved changes</span>}
                </div>
                <div className="rounded-xl p-4 space-y-3" style={card}>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-lg border" style={field}>
                    <Search className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products…"
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: "var(--t-text)" }}
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
                    {visibleProducts.length === 0 && (
                      <p className="text-sm text-center py-6" style={{ color: "var(--t-muted)" }}>No products found.</p>
                    )}
                    {visibleProducts.map(p => {
                      const qty = myItems[p.id] ?? 0;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderColor: "var(--t-border)" }}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{p.name}</p>
                            <p className="text-xs" style={{ color: "var(--t-muted)" }}>{money(p.price)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setQty(p.id, qty - 1)} disabled={qty <= 0} className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }}>
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              value={qty || ""}
                              onChange={e => setQty(p.id, parseInt(e.target.value || "0", 10))}
                              placeholder="0"
                              className="w-12 h-7 text-center rounded-lg border text-sm bg-transparent outline-none"
                              style={field}
                            />
                            <button onClick={() => setQty(p.id, qty + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Tip (optional)</label>
                    <select value={myTip} onChange={e => { setItemsDirty(true); setMyTip(parseFloat(e.target.value)); }} className="h-9 px-3 rounded-lg border text-sm outline-none" style={field}>
                      {[0, 2, 5, 10, 15, 20].map(a => <option key={a} value={a}>{a === 0 ? "No tip" : `$${a}`}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
                    <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                      {myKits} kit{myKits === 1 ? "" : "s"} · <span className="font-bold" style={{ color: "var(--t-text)" }}>{money(mySubtotal)}</span>
                    </p>
                    <button
                      onClick={saveItems}
                      disabled={busy === "items" || !itemsDirty}
                      className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: "var(--t-blue)" }}
                    >
                      {busy === "items" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save my items
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Combined summary */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Combined Order</p>
              <div className="rounded-xl p-4 space-y-2.5" style={card}>
                <Row label="Combined kits" value={String(share.combinedKits)} />
                <Row label="Combined products" value={money(share.combinedSubtotal)} />
                <Row
                  label={`Vendor shipping${share.shippingRegion ? ` · ${share.shippingRegion}` : ""}`}
                  value={
                    share.status !== "open" && share.totalVendorShipping != null
                      ? money(share.totalVendorShipping)
                      : share.shippingEstimate != null
                        ? `≈ ${money(share.shippingEstimate)}`
                        : share.delivery.country ? "—" : "Set delivery to estimate"
                  }
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm" style={{ color: "var(--t-muted)" }}>Split between members</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{share.splitMode === "by_size" ? "By order size" : "Evenly"}</span>
                </div>
              </div>
            </section>

            {/* Creator controls */}
            {share.isCreator && isOpen && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Controls</p>
                <div className="rounded-xl p-4 space-y-4" style={card}>

                  {/* Split mode */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Shipping split</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["even", "by_size"] as WholesaleSplitMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => changeSplit(mode)}
                          disabled={busy === "split"}
                          className="h-10 rounded-lg text-sm font-semibold border transition-all"
                          style={share.splitMode === mode
                            ? { background: "var(--t-blue-08)", borderColor: "var(--t-blue-25)", color: "var(--t-blue)" }
                            : { background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-muted)" }}
                        >
                          {mode === "even" ? "Split evenly" : "By order size"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery member — organiser picks who receives the parcel;
                      the address comes from that member's saved account profile. */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Deliver the whole parcel to</label>
                      <select value={delUser} onChange={e => setDelUser(e.target.value)} className="w-full h-10 px-3 rounded-lg border text-sm outline-none" style={field}>
                        <option value="">Select a member…</option>
                        {share.members.map(m => (
                          <option key={m.username} value={m.username} disabled={!m.hasDeliveryAddress}>
                            @{m.username.replace(/^@/, "")}{m.isCreator ? " (you)" : ""}{m.hasDeliveryAddress ? "" : " — no saved address"}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs mt-1.5" style={{ color: "var(--t-muted)" }}>
                        Only members who've saved a delivery address in their account can be chosen. The parcel ships to their saved address.
                      </p>
                    </div>
                    <button onClick={saveDelivery} disabled={busy === "delivery" || !delUser} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: "var(--t-surface2)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                      {busy === "delivery" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                      Set delivery member
                    </button>
                    {share.delivery.username && share.delivery.address && (
                      <div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-muted)" }}>Shipping to @{share.delivery.username.replace(/^@/, "")}</p>
                        <p className="whitespace-pre-line" style={{ color: "var(--t-text)" }}>{share.delivery.address}</p>
                        {share.delivery.country && <p style={{ color: "var(--t-text)" }}>{share.delivery.country}</p>}
                        {share.delivery.phone && <p style={{ color: "var(--t-muted)" }}>{share.delivery.phone}</p>}
                      </div>
                    )}
                  </div>

                  {/* Lock checklist + actions */}
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--t-border)" }}>
                    <Checklist ok={share.members.length >= 2} text="At least 2 members" />
                    <Checklist ok={everyoneHasItems} text="Every member has added items" />
                    <Checklist ok={deliverySet} text="Delivery member & address set" />
                    <Checklist ok={shippingCalculable} text={deliverySet ? "Shipping can be calculated for this destination" : "Shipping calculable (set delivery first)"} />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={doLock}
                        disabled={!canLock || busy === "lock"}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: "var(--t-blue)" }}
                      >
                        {busy === "lock" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Lock & create orders
                      </button>
                      <button
                        onClick={doCancel}
                        disabled={busy === "cancel"}
                        className="px-4 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                      Locking creates each member's order and stops further edits. Each member then pays their own share.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Locked: organiser can still cancel if a member never pays */}
            {share.isCreator && share.status === "locked" && (
              <section className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Organiser Controls</p>
                <div className="rounded-xl p-4 space-y-3" style={card}>
                  <p className="text-sm" style={{ color: "var(--t-text)" }}>
                    Waiting for everyone to pay. The combined order is submitted to the vendor automatically once all members have paid.
                  </p>
                  <button
                    onClick={doCancel}
                    disabled={busy === "cancel"}
                    className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    {busy === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Cancel shared order
                  </button>
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                    Use this if a member never pays. Every member's order is cancelled; anyone who already paid will need a manual refund.
                  </p>
                </div>
              </section>
            )}

            {/* My share to pay (locked, non-creator quick action handled in member row) */}
          </motion.div>
        </main>
      </div>
    </PageLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--t-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{value}</span>
    </div>
  );
}

function Checklist({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: ok ? "rgba(34,197,94,0.15)" : "var(--t-surface2)", color: ok ? "#15803d" : "var(--t-muted)" }}>
        {ok ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      </span>
      <span style={{ color: ok ? "var(--t-text)" : "var(--t-muted)" }}>{text}</span>
    </div>
  );
}

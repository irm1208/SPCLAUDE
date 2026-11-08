import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Landmark, RefreshCw } from "lucide-react";
import { adminAuth } from "../../lib/admin-auth";
import { hasReviewToken, isLedger, parsePaidAt, selectedTotal, summarize, type LedgerData, type LedgerOrder } from "./peps-anon-payment/model";
import { LedgerSummary } from "./peps-anon-payment/LedgerSummary";
import { LedgerOrders } from "./peps-anon-payment/LedgerOrders";
import { ReceiptHistory } from "./peps-anon-payment/ReceiptHistory";
import { RecordPaymentPanel, type Draft, type PaymentForm } from "./peps-anon-payment/RecordPaymentPanel";
import { card, inputCls, inputStyle, Skeleton, subtle } from "../reshipper-payouts/ui";

const EMPTY_FORM: PaymentForm = { walletId: "", amount: "", txid: "", paidAt: "", note: "" };

async function request(path: string, init?: RequestInit) {
  const response = await adminAuth.request(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export default function VendorPaymentsAdmin() {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [data, setData] = useState<LedgerData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<PaymentForm>(EMPTY_FORM);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [voidId, setVoidId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<LedgerOrder | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [reason, setReason] = useState("");
  const [ledgerKey, setLedgerKey] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const vendorRef = useRef(vendorId);
  vendorRef.current = vendorId;

  const load = useCallback(async (id: string) => {
    const run = ++generation.current;
    setLoading(true);
    setDraft(null);
    setRemoveTarget(null);
    setSelected(new Set());
    setLoadError(null);
    try {
      const result = await request(`/api/admin/vendor-payments${id ? `?vendorId=${encodeURIComponent(id)}` : ""}`);
      if (!isLedger(result)) throw new Error("Could not load payment details. Refresh and try again.");
      if (run !== generation.current) return;
      setVendors(result.vendors);
      setData(result);
      setForm((f) => (result.wallets.some((w) => w.id === f.walletId) ? f : { ...f, walletId: "" }));
      setLedgerKey((k) => k + 1);
    } catch (error) {
      if (run !== generation.current) return;
      setData(null);
      setLoadError(error instanceof Error ? error.message : "Could not load payments");
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(vendorId);
    return () => { generation.current++; };
  }, [vendorId, load]);

  const dirty = !!(draft || voidId || removeTarget || selected.size || form.amount || form.txid || form.paidAt || form.note || busy);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onFocus = () => { if (vendorRef.current && !dirtyRef.current && !lock.current) void load(vendorRef.current); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const ledger = vendorId && data && data.vendorId === vendorId ? data : null;
  const summary = useMemo(() => (ledger ? summarize(ledger.orders, ledger.summary) : null), [ledger]);
  const { orders: chosen, total } = useMemo(() => selectedTotal(ledger?.orders ?? [], selected), [ledger, selected]);
  const wallet = ledger?.wallets.find((w) => w.id === form.walletId);
  const paid = parsePaidAt(form.paidAt);
  const tokenProblem = chosen.filter((o) => !hasReviewToken(o)).length;
  const ready = !loading && !busy && !!wallet && chosen.length > 0 && chosen.length === selected.size && tokenProblem === 0 && paid.ok &&
    /^\d+(?:\.\d+)?$/.test(form.amount.trim()) && /[1-9]/.test(form.amount) && !!form.txid.trim();

  function changeVendor(id: string) {
    generation.current++;
    setVendorId(id);
    setData(null);
    setForm(EMPTY_FORM);
    setDraft(null);
    setSelected(new Set());
    setVoidId("");
    setRemoveTarget(null);
    setReason("");
    setMessage(null);
    setLoadError(null);
  }

  function review() {
    if (!ready || removeTarget || voidId || lock.current || !wallet || !paid.ok || !chosen.every(hasReviewToken)) return;
    setDraft({
      vendorId,
      walletId: wallet.id,
      walletSnapshot: { currency: wallet.currency, network: wallet.network, address: wallet.address },
      submissionIds: chosen.map((o) => o.id),
      orderSnapshots: chosen.map((o) => ({ submissionId: o.id, reviewToken: o.reviewToken as string })),
      txid: form.txid.trim(),
      cryptoAmount: form.amount.trim(),
      ...(paid.iso ? { paidAt: paid.iso } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    });
    setMessage(null);
  }

  async function mutate(isVoid: boolean) {
    if (lock.current || removeTarget || (isVoid ? !voidId || !reason.trim() : !draft)) return;
    const forVendor = vendorId;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await request(isVoid ? `/api/admin/vendor-payments/${encodeURIComponent(voidId)}/void` : "/api/admin/vendor-payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isVoid ? { reason: reason.trim() } : draft),
      });
      if (vendorRef.current !== forVendor) return;
      setDraft(null);
      setForm(EMPTY_FORM);
      setVoidId("");
      setReason("");
      setMessage({ ok: true, text: isVoid ? "Payment record voided." : "Payment recorded." });
      await load(forVendor);
    } catch (error) {
      if (vendorRef.current === forVendor) setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save payment" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function removeSubmission() {
    if (lock.current || busy || draft || voidId || !removeTarget || removeTarget.canRemove !== true) return;
    if (removeTarget.requiresRemovalOverride && !removeReason.trim()) return;
    const forVendor = vendorId;
    const submissionId = removeTarget.id;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await request(`/api/admin/vendor-portal/orders/${encodeURIComponent(submissionId)}`, {
        method: "DELETE",
        ...(removeTarget.requiresRemovalOverride ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ override: true, reason: removeReason.trim() }) } : {}),
      });
      if (vendorRef.current !== forVendor) return;
      setRemoveTarget(null);
      await load(forVendor);
      if (vendorRef.current === forVendor) {
        setMessage({ ok: true, text: `Supplier submission ${removeTarget.reference} removed from the vendor portal and payment list. Customer order and historical receipts remain.` });
      }
    } catch (error) {
      if (vendorRef.current === forVendor) setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not remove supplier submission" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const voidTarget = ledger?.payments.find((p) => p.id === voidId);

  return <section className="rounded-2xl border p-4 sm:p-5 space-y-5" style={card} data-testid="vendor-payments-admin">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={subtle}>Supplier accounts</p>
        <h2 className="flex items-center gap-2 text-xl font-bold" style={{ color: "var(--t-text)" }}><Landmark className="w-5 h-5" style={{ color: "var(--t-blue)" }} />Peps Anon Payment</h2>
        <p className="text-xs mt-1 max-w-xl" style={subtle}>Exact supplier-order costs and receipts for transfers sent outside this website. Recording a receipt never sends funds, verifies a blockchain, or changes customer payment or fulfilment status.</p>
      </div>
      <button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "var(--t-border)" }}
        disabled={busy || loading} onClick={() => void load(vendorId)} data-testid="payment-refresh"><RefreshCw className="w-3.5 h-3.5" />Refresh payments & wallets</button>
    </header>

    <label className="block text-xs max-w-sm" style={subtle}>Vendor
      <select className={inputCls} style={inputStyle} data-testid="payment-vendor" value={vendorId} disabled={busy} onChange={(e) => changeVendor(e.target.value)}>
        <option value="">Select vendor</option>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
    </label>

    {message && <p role={message.ok ? "status" : "alert"} className="rounded-xl p-2.5 text-sm" style={{ background: message.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: message.ok ? "#15803D" : "#B91C1C" }}>{message.text}</p>}
    {loadError && <div role="alert" className="rounded-xl border p-3 text-sm flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "#ef4444", background: "color-mix(in srgb, #ef4444 7%, var(--t-surface))" }} data-testid="payment-load-error">
      <span>{loadError}</span>
      <button type="button" className="font-semibold underline" onClick={() => void load(vendorId)} data-testid="payment-retry">Retry</button>
    </div>}
    {!vendorId && !loadError && <p className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>Choose a vendor to see their supplier-cost ledger.</p>}
    {vendorId && loading && !ledger && <Skeleton />}

    {ledger && summary && <>
      <LedgerSummary summary={summary} selectedCount={chosen.length} selectedTotal={total} />

      <section aria-label="Saved receiving wallets" className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={subtle}>Vendor receiving wallets</p>
        {!ledger.wallets.length
          ? <p className="text-sm rounded-xl border-l-4 p-3" style={{ borderColor: "#E9A020" }}>The vendor needs to add a payment wallet in their Settings before a payment can be recorded.</p>
          : <ul className="grid gap-2 md:grid-cols-2">{ledger.wallets.map((w) => <li key={w.id} className="rounded-xl border p-3 text-xs" style={{ borderColor: w.id === form.walletId ? "var(--t-blue-40)" : "var(--t-border)" }}>
              <p className="font-semibold">{w.label ? `${w.label} · ` : ""}{w.currency} / {w.network}</p>
              <code className="block break-all mt-1 select-all">{w.address}</code>
              <button type="button" className="mt-1 inline-flex items-center gap-1 underline" data-testid={`payment-copy-${w.id}`}
                onClick={() => {
                  const fail = () => setMessage({ ok: false, text: "Could not copy address. Select and copy it above." });
                  const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
                  if (!clip?.writeText) return fail();
                  clip.writeText(w.address).then(() => setMessage({ ok: true, text: "Wallet address copied." }), fail);
                }}>
                <Copy className="w-3 h-3" />Copy address</button>
            </li>)}</ul>}
      </section>

      <LedgerOrders key={ledgerKey} orders={ledger.orders} selected={selected} onSelected={setSelected} locked={busy || !!draft || !!voidId || !!removeTarget}
        onRemove={(order) => { if (order.canRemove === true && !busy && !draft && !voidId && !lock.current) { setRemoveTarget(order); setRemoveReason(""); setMessage(null); } }}
        removeTarget={removeTarget} onRemoveCancel={() => setRemoveTarget(null)} onRemoveConfirm={() => void removeSubmission()} removeBusy={busy}
        removeReason={removeReason} onRemoveReason={setRemoveReason} />

      <RecordPaymentPanel wallets={ledger.wallets} form={form} onForm={(p) => setForm((f) => ({ ...f, ...p }))} chosen={chosen} total={total}
        draft={draft} busy={busy || !!removeTarget || !!voidId} ready={ready && !removeTarget && !voidId} dateError={!paid.ok} tokenProblem={tokenProblem} onReview={review} onConfirm={() => void mutate(false)} onEdit={() => setDraft(null)} />

      <ReceiptHistory key={`h-${ledgerKey}`} payments={ledger.payments} locked={busy || !!draft || !!removeTarget} onVoid={(id) => { setVoidId(id); setReason(""); }} />

      {voidTarget && <div className="rounded-xl border p-3 space-y-2 text-sm" style={{ borderColor: "#ef4444" }}>
        <p>Only corrects this record; does not reverse transfer. Its order allocations are released under existing rules.</p>
        <p className="break-all text-xs">TXID: <span className="font-mono">{voidTarget.txid}</span></p>
        <label className="block text-xs" style={subtle}>Required reason (audited)
          <input data-testid="payment-void-reason" className={inputCls} style={inputStyle} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <button type="button" data-testid="payment-void-confirm" disabled={busy || !reason.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#ef4444" }} onClick={() => void mutate(true)}>Confirm void record</button>
          <button type="button" disabled={busy} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: "var(--t-border)" }} onClick={() => setVoidId("")}>Cancel</button>
        </div>
      </div>}
    </>}
  </section>;
}

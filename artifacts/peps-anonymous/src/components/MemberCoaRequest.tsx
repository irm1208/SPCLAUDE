import { useCallback, useEffect, useRef, useState } from "react";
import { FileCheck2, Loader2, AlertCircle, Copy, Check, RefreshCw, ChevronDown } from "lucide-react";
import { coaApi, type CoaMemberView, type CoaRail } from "@/lib/coa-api";
import {
  COA_FIELDS, COA_PHASE_TONE, COA_STATUS_LABEL, canMemberEdit, canMemberPay, canReReserve, coaPhase, fmtCoaFee, hasCoaEvidence, missingCoaFields, type CoaDetails,
} from "@/lib/coa-ui";

const box = { background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" } as const;
const inputCls = "w-full h-10 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#2D6BCC]/40";
const inputStyle = { background: "var(--t-bg)", border: "1px solid var(--t-border)", color: "var(--t-text)" } as const;

function CopyText({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--t-blue)" }}>
      {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{done ? "Copied" : "Copy"}
    </button>
  );
}

/** Member COA request for a single group-buy order. Separate from order payment. */
export function MemberCoaRequest({ orderId }: { orderId: string }) {
  const [view, setView] = useState<CoaMemberView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [details, setDetails] = useState<CoaDetails>({ client: "", sample: "", manufacturer: "", batch: "" });
  const [railKey, setRailKey] = useState("");
  const [proofMode, setProofMode] = useState<"tx" | "ref">("tx");
  const [proof, setProof] = useState("");

  const apply = (v: CoaMemberView) => {
    setView(v);
    if (v.request) setDetails({ client: v.request.client, sample: v.request.sample, manufacturer: v.request.manufacturer, batch: v.request.batch });
  };

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setLoadError(null);
    try { const v = await coaApi<CoaMemberView>(`/orders/${orderId}/coa`); if (id === seq.current) apply(v); }
    catch (e) { if (id === seq.current) setLoadError(e instanceof Error ? e.message : "Unable to load COA request."); }
    if (id === seq.current) setLoading(false);
  }, [orderId]);
  // Clear previous order/account data before loading a new identity
  useEffect(() => {
    setView(null); setError(null); setProof(""); setRailKey("");
    setDetails({ client: "", sample: "", manufacturer: "", batch: "" });
  }, [orderId]);
  useEffect(() => { void load(); return () => { ++seq.current; }; }, [load]);
  const hasView = !!view;
  useEffect(() => {
    if (hasView && window.location.hash === "#coa") document.getElementById("coa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hasView]);

  const run = async (key: string, path: string, body: unknown) => {
    setBusy(key); setError(null);
    const id = ++seq.current;
    try {
      const v = await coaApi<CoaMemberView>(`/orders/${orderId}/coa${path}`, { method: "POST", body: JSON.stringify(body) });
      if (id !== seq.current) return;
      apply(v);
      if (key === "pay") setProof("");
    } catch (e) {
      if (id !== seq.current) return;
      setError(e instanceof Error ? e.message : "Request failed.");
      // Show the failure immediately; a slow refresh must not keep the action
      // spinner running. Ignore it if the member starts another action/navigates.
      setBusy(null);
      void coaApi<CoaMemberView>(`/orders/${orderId}/coa`)
        .then(v => { if (id === seq.current) setView(v); })
        .catch(() => { /* Preserve the visible error and typed inputs. */ });
    }
    if (id === seq.current) setBusy(null);
  };

  if (loading && !view) {
    return (
      <section id="coa" className="rounded-lg p-4 sm:p-5 space-y-3 scroll-mt-24" style={box}>
        <div className="h-4 w-40 rounded animate-pulse" style={{ background: "var(--t-border)" }} />
        <div className="h-10 rounded animate-pulse" style={{ background: "var(--t-border)" }} />
      </section>
    );
  }
  if (loadError && !view) {
    return (
      <section id="coa" className="rounded-lg p-4 flex items-center gap-3 scroll-mt-24" style={box}>
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm flex-1">{loadError}</p>
        <button onClick={() => void load()} className="text-xs font-bold inline-flex items-center gap-1" style={{ color: "var(--t-blue)" }}><RefreshCw className="w-3 h-3" />Retry</button>
      </section>
    );
  }
  if (!view) return null;
  const req = view.request;
  // Nothing to show: not eligible and no existing request
  if (!req && !view.eligible && !view.reason) return null;

  const cfg = view.config;
  const fee = req ? req.fee : cfg?.fee ?? 0;
  const currency = req ? req.currency : cfg?.currency ?? "USD";
  const reReserve = canReReserve(req, view.eligible);
  const editable = (canMemberEdit(req) && (view.eligible || !!req)) || reReserve;
  const evidenceHeld = !!req && (req.status === "expired" || req.status === "withdrawn") && hasCoaEvidence(req);
  const canPay = canMemberPay(req);
  const phase = req ? coaPhase(req.status) : null;
  const tone = phase ? COA_PHASE_TONE[phase] : null;
  const missing = missingCoaFields(details);
  const rails: CoaRail[] = cfg?.rails ?? [];
  const awaitingPayment = canPay;
  const selectedRail = rails.find(r => `${r.currency}|${r.network}` === railKey);

  return (
    <details id="coa" className="group/coa rounded-lg p-4 sm:p-5 scroll-mt-24" style={box}>
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D6BCC] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "var(--t-blue-10)", color: "var(--t-blue)" }}>
          <FileCheck2 className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>Certificate of analysis</p>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            Request a COA using the details below. The COA fee is charged separately and is not part of your order total.
          </p>
        </div>
        {req && tone && (
          <span className="text-[10.5px] font-bold px-2 py-1 rounded-full shrink-0" style={{ color: tone.fg, background: tone.bg }}>
            {COA_STATUS_LABEL[req.status]}
          </span>
        )}
        <ChevronDown aria-hidden="true" className="w-4 h-4 mt-1 shrink-0 transition-transform group-open/coa:rotate-180" />
      </summary>
      <div className="space-y-4 pt-4">
      {busy && (
        <p role="status" aria-live="polite" className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
          {busy === "details" ? (req ? "Saving COA details…" : "Reserving your COA place…")
            : busy === "instr" ? "Preparing your payment instructions…"
            : busy === "pay" || busy === "verify" ? "Saving and checking your payment. Blockchain confirmation may take a little longer…"
            : "Updating your COA request…"}
        </p>
      )}

      {req?.status === "completed" && (
        <div className="rounded-md p-3 space-y-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
          {req.certificate ? <>
            <p className="text-sm font-semibold">Your certificate is ready</p>
            <a href={`/api/orders/${encodeURIComponent(orderId)}/coa/certificate`} download
              className="inline-flex items-center h-10 px-4 rounded-xl text-sm font-bold text-white" style={{ background: "#1B3A7A" }}>
              Download COA PDF
            </a>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Private to your order. Attached {new Date(req.certificate.attachedAt).toLocaleDateString("en-GB")}.</p>
          </> : <p className="text-sm" style={{ color: "var(--t-muted)" }}>Your request is completed. Admin has not attached the certificate yet.</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md p-3" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>COA fee</p>
          <p className="text-lg font-extrabold">{fmtCoaFee(fee, currency)}</p>
          <p className="text-[10.5px]" style={{ color: "var(--t-muted)" }}>{req && !reReserve ? "Locked for your request" : "Separate from order total"}</p>
        </div>
        <div className="rounded-md p-3" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>{req ? "Expires" : "Places left"}</p>
          <p className="text-lg font-extrabold">
            {req ? (req.expiresAt && canMemberEdit(req) && req.status === "reserved" ? new Date(req.expiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "No expiry") : view.available}
          </p>
          <p className="text-[10.5px]" style={{ color: "var(--t-muted)" }}>{req ? (req.source === "invited" ? "Invited by Admin" : "Public request") : "Shared across this group buy"}</p>
        </div>
      </div>

      {!req && !view.eligible && view.reason && (
        <p className="text-sm rounded-md p-3" style={{ background: "var(--t-bg)", color: "var(--t-muted)" }}>{view.reason}</p>
      )}

      {evidenceHeld && (
        <p className="text-sm rounded-md p-3" style={{ background: "rgba(233,160,32,0.12)", color: "#B7791F" }}>
          Your payment evidence was saved after this request expired. It is held for review by Admin and cannot be reserved again from here.
        </p>
      )}
      {req?.status === "invited" && !canPay && canMemberEdit(req) && (
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>Save all four details to see payment options.</p>
      )}
      {reReserve && (
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>This request is {req!.status}. Check the details and reserve again if you still want a COA.</p>
      )}
      {(editable || req) && (
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (!missing.length) void run("details", "", details); }}>
          <div className="grid sm:grid-cols-2 gap-3">
            {COA_FIELDS.map(f => (
              <label key={f.key} className="space-y-1 block">
                <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>{f.label}</span>
                <input className={inputCls} style={inputStyle} value={details[f.key]} placeholder={f.hint} required
                  disabled={!editable || !!busy} onChange={e => setDetails(d => ({ ...d, [f.key]: e.target.value }))} />
              </label>
            ))}
          </div>
          {editable && (
            <button type="submit" disabled={!!busy || missing.length > 0}
              className="h-10 px-4 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "#1B3A7A" }}>
              {busy === "details" && <Loader2 className="w-4 h-4 animate-spin" />}
              {reReserve ? "Reserve again" : req ? "Save details" : "Reserve COA place"}
            </button>
          )}
        </form>
      )}

      {req && awaitingPayment && !req.payment && (
        <div className="space-y-2 rounded-md p-3" style={{ background: "var(--t-bg)", border: "1px dashed var(--t-border)" }}>
          <p className="text-xs font-bold">Choose how to pay the COA fee</p>
          {rails.length === 0 && !cfg?.manualInstructions && <p className="text-xs" style={{ color: "var(--t-muted)" }}>No payment method is open right now. Check back later.</p>}
          {rails.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <select className={inputCls + " max-w-xs"} style={inputStyle} value={railKey} onChange={e => setRailKey(e.target.value)}>
                <option value="">Select stablecoin and network</option>
                {rails.map(r => <option key={`${r.currency}|${r.network}`} value={`${r.currency}|${r.network}`}>{r.currency} on {r.network}</option>)}
              </select>
              <button type="button" disabled={!selectedRail || !!busy}
                onClick={() => selectedRail && void run("instr", "/payment-instructions", { currency: selectedRail.currency, network: selectedRail.network })}
                className="h-10 px-4 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "#2D6BCC" }}>
                {busy === "instr" && <Loader2 className="w-4 h-4 animate-spin" />}Get payment details
              </button>
            </div>
          )}
          {cfg?.manualInstructions && (
            <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--t-muted)" }}><b>Manual payment:</b> {cfg.manualInstructions}</p>
          )}
        </div>
      )}

      {req?.payment && (
        <div className="rounded-md p-3 space-y-1.5" style={{ background: "var(--t-blue-08)", border: "1px solid var(--t-blue-20)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-blue)" }}>COA payment instructions</p>
          <div className="flex justify-between gap-2 text-sm"><span>Send exactly</span><b>{req.payment.amount} {req.payment.currency} <CopyText value={String(req.payment.amount)} /></b></div>
          <div className="flex justify-between gap-2 text-sm"><span>Network</span><b>{req.payment.network}</b></div>
          <div className="text-sm"><span>Wallet</span> <CopyText value={req.payment.walletAddress} />
            <p className="font-mono text-xs break-all mt-0.5">{req.payment.walletAddress}</p></div>
        </div>
      )}

      {req && canPay && (req.payment || cfg?.manualInstructions) && (
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (proof.trim()) void run("pay", "/payment", proofMode === "tx" && req.payment ? { txHash: proof.trim() } : { reference: proof.trim() }); }}>
          <div className="flex gap-1 text-xs font-bold">
            {req.payment && <button type="button" onClick={() => setProofMode("tx")} className="px-2.5 py-1 rounded-full" style={proofMode === "tx" ? { background: "#1B3A7A", color: "#fff" } : { color: "var(--t-muted)" }}>Transaction hash</button>}
            {cfg?.manualInstructions && <button type="button" onClick={() => setProofMode("ref")} className="px-2.5 py-1 rounded-full" style={proofMode === "ref" || !req.payment ? { background: "#1B3A7A", color: "#fff" } : { color: "var(--t-muted)" }}>Manual reference</button>}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} style={inputStyle} value={proof} onChange={e => setProof(e.target.value)} required
              placeholder={proofMode === "tx" && req.payment ? "Paste the transaction hash" : "Payment reference you used"} />
            <button type="submit" disabled={!proof.trim() || !!busy}
              className="h-10 px-4 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 shrink-0 disabled:opacity-50" style={{ background: "#1B3A7A" }}>
              {busy === "pay" && <Loader2 className="w-4 h-4 animate-spin" />}Submit
            </button>
          </div>
        </form>
      )}

      {req && (req.txHash || req.reference || req.verificationMessage) && (
        <div className="text-xs space-y-0.5" style={{ color: "var(--t-muted)" }}>
          {req.txHash && <p className="break-all">Transaction: <span className="font-mono">{req.txHash}</span></p>}
          {req.reference && <p>Reference: {req.reference}</p>}
          {req.verificationMessage && <p>{req.verificationMessage}</p>}
        </div>
      )}

      {req && (
        <div className="flex flex-wrap gap-3">
          {req.status === "review" && req.txHash && (
            <button type="button" disabled={!!busy}
              onClick={() => void run("verify", "/payment", { txHash: req.txHash })}
              className="text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50" style={{ color: "var(--t-blue)" }}>
              {busy === "verify" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Retry payment verification
            </button>
          )}
          <button type="button" disabled={!!busy || loading} onClick={() => void load()}
            className="text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50" style={{ color: "var(--t-blue)" }}>
            <RefreshCw className="w-3.5 h-3.5" />Refresh COA status
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</p>}

      {req && canMemberEdit(req) && (req.status === "reserved" || req.status === "invited") && (
        <button type="button" disabled={!!busy}
          onClick={() => { if (confirm("Withdraw your COA request? Your place will be released.")) void run("withdraw", "/withdraw", {}); }}
          className="text-xs font-bold underline disabled:opacity-50" style={{ color: "#ef4444" }}>
          {busy === "withdraw" ? "Withdrawing..." : "Withdraw COA request"}
        </button>
      )}
      </div>
    </details>
  );
}

export default MemberCoaRequest;

import React, { useState, useEffect, useCallback } from "react";
import { Copy, CheckCircle, Clock, XCircle, Loader2, ChevronRight, Boxes, AlertCircle, FlaskConical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CryptoOption = { currency: string; network: string; walletAddress: string };
type WARStatus = "pending" | "confirmed" | "rejected";
type WARData = {
  id: number;
  amountUsd: number;
  status: WARStatus;
  paymentTestAmount: number | null;
  testPaymentTxHash: string | null;
  paymentTxHash: string | null;
  paymentCryptoNetwork: string | null;
  paymentCryptoCurrency: string | null;
  createdAt: string;
  rejectionReason: string | null;
};
type ApiResp = { request: WARData | null; cryptoOptions: CryptoOption[] };

function getStep(req: WARData | null): "none" | "test" | "pay" | "review" {
  if (!req) return "none";
  if (req.paymentTxHash) return "review";
  if (req.testPaymentTxHash) return "pay";
  return "test";
}

export function WholesaleAccessSection() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CryptoOption | null>(null);
  const [testTx, setTestTx] = useState("");
  const [fullTx, setFullTx] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/account/wholesale-access");
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        if (!selectedOption && d.cryptoOptions.length > 0) setSelectedOption(d.cryptoOptions[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/account/wholesale-access", { method: "POST" });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        if (d.cryptoOptions.length > 0) setSelectedOption(d.cryptoOptions[0]);
      } else {
        const e = await r.json().catch(() => ({})) as Record<string, string>;
        toast({ title: "Error", description: e.error || "Could not start your request.", variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!", description: "Copied to clipboard." });
  };

  const handleSubmitTestTx = async () => {
    if (!testTx.trim() || !selectedOption || !data?.request) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/wholesale-access/test-tx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: testTx.trim(), currency: selectedOption.currency, network: selectedOption.network }),
      });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        setTestTx("");
        toast({ title: "Test payment submitted", description: "Now send the remaining balance." });
      } else {
        const e = await r.json().catch(() => ({})) as Record<string, string>;
        toast({ title: "Error", description: e.error || "Could not submit test payment.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFullTx = async () => {
    if (!fullTx.trim() || !data?.request) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/wholesale-access/tx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: fullTx.trim() }),
      });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        setFullTx("");
        toast({ title: "Payment submitted!", description: "We'll confirm your access shortly." });
      } else {
        const e = await r.json().catch(() => ({})) as Record<string, string>;
        toast({ title: "Error", description: e.error || "Could not submit payment.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
      </div>
    );
  }

  const req = data?.request ?? null;
  const opts = data?.cryptoOptions ?? [];
  const effective = selectedOption ?? opts[0] ?? null;
  const step = getStep(req);

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (req?.status === "confirmed") {
    return (
      <div className="w-full max-w-[520px] space-y-4">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Wholesale Access Granted</h3>
            <p className="text-sm mt-2" style={{ color: "light-dark(#166534,#86efac)" }}>
              Your ${req.amountUsd} fee has been confirmed and added as store credit to your account.
            </p>
          </div>
          <a
            href="/wholesale"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ background: "#16a34a" }}
          >
            Open Wholesale Shop <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Rejected ──────────────────────────────────────────────────────────────
  if (req?.status === "rejected") {
    return (
      <div className="w-full max-w-[520px] space-y-4">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Request Not Approved</h3>
              {req.rejectionReason && (
                <p className="text-xs mt-0.5" style={{ color: "light-dark(#dc2626,#fca5a5)" }}>{req.rejectionReason}</p>
              )}
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>
            If you believe this is an error, contact us via the Support tab.
          </p>
        </div>
      </div>
    );
  }

  // ── Under review (full tx submitted) ──────────────────────────────────────
  if (step === "review") {
    return (
      <div className="w-full max-w-[520px] space-y-4">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
              <Clock className="w-5 h-5" style={{ color: "light-dark(#d97706,#f0c880)" }} />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Payment Under Review</h3>
              <p className="text-xs mt-0.5" style={{ color: "light-dark(#92400e,#e8c488)" }}>
                We'll confirm your access and credit your account shortly.
              </p>
            </div>
          </div>
          {req?.testPaymentTxHash && (
            <div className="rounded-lg px-3 py-2.5 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--t-muted)" }}>Test TX</p>
              <p className="text-xs font-mono break-all" style={{ color: "var(--t-subtle)" }}>{req.testPaymentTxHash}</p>
            </div>
          )}
          {req?.paymentTxHash && (
            <div className="rounded-lg px-3 py-2.5 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--t-muted)" }}>Full Payment TX</p>
              <p className="text-xs font-mono break-all" style={{ color: "var(--t-subtle)" }}>{req.paymentTxHash}</p>
            </div>
          )}
          {req?.paymentCryptoCurrency && req?.paymentCryptoNetwork && (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              {req.paymentCryptoCurrency} · {req.paymentCryptoNetwork} · ${req.amountUsd}
            </p>
          )}
          <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>
            Usually confirmed within 24 hours. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1: Test payment ──────────────────────────────────────────────────
  if (step === "test") {
    const testAmount = req?.paymentTestAmount ?? null;
    return (
      <div className="w-full max-w-[520px] space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white" style={{ background: "var(--t-blue)" }}>1</div>
          <span className="text-xs font-bold" style={{ color: "var(--t-blue)" }}>Test Payment</span>
          <div className="flex-1 h-px mx-1" style={{ background: "var(--t-border)" }} />
          <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>2</div>
          <span className="text-xs" style={{ color: "var(--t-muted)" }}>Full Payment</span>
        </div>

        {/* Explanation banner */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--t-blue)" }} />
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Verify your wallet first</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--t-muted)" }}>
              Send a small test amount to confirm you're using the right wallet and network. Once verified, send the remaining balance to complete your access.
            </p>
          </div>
        </div>

        {/* Fee summary */}
        <div className="rounded-xl p-4 grid grid-cols-2 gap-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Your access fee</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: "var(--t-text)" }}>${req?.amountUsd}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send now (test)</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: "var(--t-blue)" }}>
              ${testAmount != null ? testAmount.toFixed(2) : "—"}
            </p>
          </div>
        </div>

        {/* Network selection */}
        {opts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Select network</p>
            <div className="grid grid-cols-2 gap-2">
              {opts.map(opt => {
                const sel = effective?.currency === opt.currency && effective?.network === opt.network;
                return (
                  <button
                    key={`${opt.currency}-${opt.network}`}
                    onClick={() => setSelectedOption(opt)}
                    className="rounded-lg px-3 py-2.5 text-left transition-all"
                    style={{
                      background: sel ? "var(--t-blue-10)" : "var(--t-surface)",
                      border: sel ? "1.5px solid var(--t-blue)" : "1px solid var(--t-border)",
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: sel ? "var(--t-blue)" : "var(--t-text)" }}>{opt.currency}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>{opt.network}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wallet + copyable amount */}
        {effective && testAmount != null && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send test amount to</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>{effective.walletAddress}</p>
              <button
                onClick={() => handleCopy(effective.walletAddress, "wallet1")}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold"
                style={{
                  background: copied === "wallet1" ? "rgba(22,163,74,0.12)" : "var(--t-surface2)",
                  color: copied === "wallet1" ? "#16a34a" : "var(--t-text)",
                  border: "1px solid var(--t-border)",
                }}
              >
                {copied === "wallet1" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === "wallet1" ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => handleCopy(testAmount.toFixed(2), "amt1")}
              className="w-full rounded-lg px-3 py-2.5 flex items-center justify-between text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--t-blue)" }}
            >
              <span>Tap to copy test amount</span>
              <span className="font-mono font-black">${testAmount.toFixed(2)} {effective.currency}</span>
            </button>
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "light-dark(#d97706,#f0c880)" }} />
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                Send <strong style={{ color: "var(--t-text)" }}>exactly ${testAmount.toFixed(2)} {effective.currency}</strong> via {effective.network}. Wrong network = lost funds.
              </p>
            </div>
          </div>
        )}

        {/* TX input */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Test payment transaction hash</p>
          <input
            value={testTx}
            onChange={e => setTestTx(e.target.value)}
            placeholder="Paste your test transaction hash"
            className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
          <button
            onClick={handleSubmitTestTx}
            disabled={!testTx.trim() || submitting}
            className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--t-blue)" }}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "I've Sent the Test Payment →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Full payment ──────────────────────────────────────────────────
  if (step === "pay") {
    const testAmount = req?.paymentTestAmount ?? 0;
    const remaining = Math.max(0, parseFloat(((req?.amountUsd ?? 0) - testAmount).toFixed(2)));
    const currency = req?.paymentCryptoCurrency ?? effective?.currency ?? "";
    const network = req?.paymentCryptoNetwork ?? effective?.network ?? "";
    const wallet = effective?.walletAddress ?? "";
    return (
      <div className="w-full max-w-[520px] space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white" style={{ background: "#16a34a" }}>✓</div>
          <span className="text-xs font-bold" style={{ color: "#16a34a" }}>Test Verified</span>
          <div className="flex-1 h-px mx-1" style={{ background: "var(--t-border)" }} />
          <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white" style={{ background: "var(--t-blue)" }}>2</div>
          <span className="text-xs font-bold" style={{ color: "var(--t-blue)" }}>Full Payment</span>
        </div>

        {/* Success note */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Test payment received — wallet verified ✓</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
              Now send the remaining <strong style={{ color: "var(--t-text)" }}>${remaining.toFixed(2)} {currency}</strong> to complete your access fee.
            </p>
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="rounded-xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span style={{ color: "var(--t-muted)" }}>Total access fee</span>
            <span className="font-semibold" style={{ color: "var(--t-text)" }}>${req?.amountUsd}</span>
          </div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span style={{ color: "var(--t-muted)" }}>Test payment sent</span>
            <span className="font-semibold" style={{ color: "#16a34a" }}>−${testAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid var(--t-border)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Remaining to send</span>
            <span className="text-2xl font-black" style={{ color: "var(--t-blue)" }}>${remaining.toFixed(2)}</span>
          </div>
        </div>

        {/* Wallet */}
        {wallet && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Same wallet — {network}</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>{wallet}</p>
              <button
                onClick={() => handleCopy(wallet, "wallet2")}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold"
                style={{
                  background: copied === "wallet2" ? "rgba(22,163,74,0.12)" : "var(--t-surface2)",
                  color: copied === "wallet2" ? "#16a34a" : "var(--t-text)",
                  border: "1px solid var(--t-border)",
                }}
              >
                {copied === "wallet2" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === "wallet2" ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => handleCopy(remaining.toFixed(2), "amt2")}
              className="w-full rounded-lg px-3 py-2.5 flex items-center justify-between text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--t-blue)" }}
            >
              <span>Tap to copy remaining amount</span>
              <span className="font-mono font-black">${remaining.toFixed(2)} {currency}</span>
            </button>
          </div>
        )}

        {/* TX input */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Full payment transaction hash</p>
          <input
            value={fullTx}
            onChange={e => setFullTx(e.target.value)}
            placeholder="Paste your transaction hash"
            className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
          <button
            onClick={handleSubmitFullTx}
            disabled={!fullTx.trim() || submitting}
            className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--t-blue)" }}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Full Payment for Review"}
          </button>
        </div>
      </div>
    );
  }

  // ── Landing: no request yet ───────────────────────────────────────────────
  return (
    <div className="w-full max-w-[520px] space-y-5">
      <div className="rounded-xl p-6 space-y-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--t-blue-10)" }}>
          <Boxes className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
        </div>
        <div>
          <h3 className="text-xl font-black" style={{ color: "var(--t-text)" }}>Wholesale Access</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--t-muted)" }}>
            Our wholesale shop is reserved for serious buyers. To keep it that way, we ask for a small one-time fee — not to make money, but to confirm you're here to buy.
          </p>
        </div>
        <ul className="space-y-2.5">
          {[
            "Bulk pricing on all peptide products",
            "Access to exclusive wholesale-only listings",
            "Shared order coordination tools",
            "Priority customer support",
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--t-subtle)" }}>
              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#16a34a" }} />
              {item}
            </li>
          ))}
        </ul>
        <div className="rounded-lg p-4 space-y-2" style={{ background: "rgba(22,163,74,0.06)", border: "1.5px solid rgba(22,163,74,0.2)" }}>
          <p className="text-xs font-bold" style={{ color: "light-dark(#166534,#86efac)" }}>
            💰 Your fee comes straight back to you
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
            The access fee ($90–$110) is a buyer verification step — nothing more. Once your payment is confirmed, the full amount is <strong style={{ color: "var(--t-text)" }}>returned to your account as store credit</strong>, ready to use on your first order.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--t-blue)" }}
        >
          {creating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
            : <>Get Wholesale Access <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

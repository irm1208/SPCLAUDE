import React, { useState, useEffect, useCallback } from "react";
import { Copy, CheckCircle, Clock, XCircle, Loader2, ChevronRight, Boxes, AlertCircle, FlaskConical, Zap } from "lucide-react";
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
type PaymentPath = "test" | "skip" | null;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold"
      style={{
        background: copied ? "rgba(22,163,74,0.12)" : "var(--t-surface2)",
        color: copied ? "#16a34a" : "var(--t-text)",
        border: "1px solid var(--t-border)",
      }}
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function NetworkPills({ opts, selected, onSelect }: { opts: CryptoOption[]; selected: CryptoOption | null; onSelect: (o: CryptoOption) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(opt => {
        const sel = selected?.currency === opt.currency && selected?.network === opt.network;
        return (
          <button
            key={`${opt.currency}-${opt.network}`}
            onClick={() => onSelect(opt)}
            className="rounded-xl px-3.5 py-2 text-left transition-all"
            style={{
              background: sel ? "var(--t-blue)" : "var(--t-surface)",
              border: sel ? "1.5px solid var(--t-blue)" : "1px solid var(--t-border)",
            }}
          >
            <p className="text-xs font-bold leading-tight" style={{ color: sel ? "#fff" : "var(--t-text)" }}>{opt.currency}</p>
            <p className="text-[10px] mt-0.5" style={{ color: sel ? "rgba(255,255,255,0.7)" : "var(--t-muted)" }}>{opt.network}</p>
          </button>
        );
      })}
    </div>
  );
}

export function WholesaleAccessSection() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<CryptoOption | null>(null);
  const [paymentPath, setPaymentPath] = useState<PaymentPath>(null);
  const [testTx, setTestTx] = useState("");
  const [fullTx, setFullTx] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/account/wholesale-access");
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        if (d.cryptoOptions.length > 0) setSelected(s => s ?? d.cryptoOptions[0]);
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
        if (d.cryptoOptions.length > 0) setSelected(d.cryptoOptions[0]);
      } else {
        const e = await r.json().catch(() => ({})) as Record<string, string>;
        toast({ title: "Error", description: e.error || "Could not start your request.", variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitTestTx = async () => {
    if (!testTx.trim() || !selected || !data?.request) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/wholesale-access/test-tx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: testTx.trim(), currency: selected.currency, network: selected.network }),
      });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        setTestTx("");
        setPaymentPath(null);
        toast({ title: "Test payment submitted", description: "Now send the remaining balance." });
      } else {
        const e = await r.json().catch(() => ({})) as Record<string, string>;
        toast({ title: "Error", description: e.error || "Could not submit test payment.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFullTx = async (currency?: string, network?: string) => {
    if (!fullTx.trim() || !data?.request) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/wholesale-access/tx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: fullTx.trim(), currency, network }),
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
  const effective = selected ?? opts[0] ?? null;

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (req?.status === "confirmed") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Wholesale Access Granted</h3>
            <p className="text-sm mt-2" style={{ color: "light-dark(#166534,#86efac)" }}>
              Your ${req.amountUsd} fee has been confirmed and added as store credit.
            </p>
          </div>
          <a href="/wholesale" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#16a34a" }}>
            Open Wholesale Shop <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Rejected ──────────────────────────────────────────────────────────────
  if (req?.status === "rejected") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Request Not Approved</h3>
              {req.rejectionReason && <p className="text-xs mt-0.5" style={{ color: "light-dark(#dc2626,#fca5a5)" }}>{req.rejectionReason}</p>}
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>Contact us via the Support tab if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // ── Under review ──────────────────────────────────────────────────────────
  if (req?.paymentTxHash) {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.3)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
              <Clock className="w-5 h-5" style={{ color: "light-dark(#d97706,#f0c880)" }} />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Payment Under Review</h3>
              <p className="text-xs mt-0.5" style={{ color: "light-dark(#92400e,#e8c488)" }}>We'll confirm your access and credit your account shortly.</p>
            </div>
          </div>
          {req.testPaymentTxHash && (
            <div className="rounded-lg px-3 py-2.5 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
              <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--t-muted)" }}>Test TX</p>
              <p className="text-xs font-mono break-all" style={{ color: "var(--t-subtle)" }}>{req.testPaymentTxHash}</p>
            </div>
          )}
          <div className="rounded-lg px-3 py-2.5 space-y-0.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--t-muted)" }}>Full Payment TX</p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--t-subtle)" }}>{req.paymentTxHash}</p>
          </div>
          {req.paymentCryptoCurrency && req.paymentCryptoNetwork && (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>{req.paymentCryptoCurrency} · {req.paymentCryptoNetwork} · ${req.amountUsd}</p>
          )}
          <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>Usually confirmed within 24 hours. Check back soon.</p>
        </div>
      </div>
    );
  }

  // ── After test TX submitted → send full remaining ─────────────────────────
  if (req?.testPaymentTxHash) {
    const testAmount = req.paymentTestAmount ?? 0;
    const remaining = Math.max(0, parseFloat(((req.amountUsd ?? 0) - testAmount).toFixed(2)));
    const currency = req.paymentCryptoCurrency ?? "";
    const network = req.paymentCryptoNetwork ?? "";
    const wallet = effective?.walletAddress ?? "";
    return (
      <div className="w-full max-w-[520px] space-y-4">
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Test payment received — wallet verified ✓</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
              Now send the remaining <strong style={{ color: "var(--t-text)" }}>${remaining.toFixed(2)} {currency}</strong> to complete your access fee.
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span style={{ color: "var(--t-muted)" }}>Total access fee</span>
            <span className="font-semibold" style={{ color: "var(--t-text)" }}>${req.amountUsd}</span>
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

        {wallet && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Same wallet — {network}</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>{wallet}</p>
              <CopyButton text={wallet} />
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(remaining.toFixed(2)).catch(() => {}); toast({ title: "Copied!", description: "Amount copied." }); }}
              className="w-full rounded-lg px-3 py-2.5 flex items-center justify-between text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--t-blue)" }}
            >
              <span>Tap to copy remaining amount</span>
              <span className="font-mono font-black">${remaining.toFixed(2)} {currency}</span>
            </button>
          </div>
        )}

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
            onClick={() => handleSubmitFullTx(currency, network)}
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

  // ── Request exists, no TX submitted yet ───────────────────────────────────
  if (req) {
    const testAmount = req.paymentTestAmount;

    // ── Sub-screen: test payment TX form ──────────────────────────────────
    if (paymentPath === "test" && effective) {
      return (
        <div className="w-full max-w-[520px] space-y-4">
          <button
            onClick={() => setPaymentPath(null)}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--t-muted)" }}
          >
            ← Back
          </button>

          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--t-blue)" }} />
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Test payment — verify your wallet</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {testAmount != null
                  ? <>Send <strong style={{ color: "var(--t-text)" }}>${testAmount.toFixed(2)} {effective.currency}</strong> on {effective.network}. Once we see it, you'll send the rest.</>
                  : <>Send a small test amount on {effective.network} to confirm your wallet. Once submitted, you'll send the full fee.</>}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send to — {effective.network}</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>{effective.walletAddress}</p>
              <CopyButton text={effective.walletAddress} />
            </div>
            {testAmount != null && (
              <button
                onClick={() => { navigator.clipboard.writeText(testAmount.toFixed(2)).catch(() => {}); toast({ title: "Copied!", description: "Amount copied." }); }}
                className="w-full rounded-lg px-3 py-2.5 flex items-center justify-between text-xs font-semibold"
                style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--t-blue)" }}
              >
                <span>Tap to copy test amount</span>
                <span className="font-mono font-black">${testAmount.toFixed(2)} {effective.currency}</span>
              </button>
            )}
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "light-dark(#d97706,#f0c880)" }} />
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                Only send on the <strong style={{ color: "var(--t-text)" }}>{effective.network}</strong> network. Wrong network = lost funds.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Test transaction hash</p>
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
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Test Payment →"}
            </button>
          </div>
        </div>
      );
    }

    // ── Sub-screen: skip straight to full payment TX form ─────────────────
    if (paymentPath === "skip" && effective) {
      return (
        <div className="w-full max-w-[520px] space-y-4">
          <button
            onClick={() => setPaymentPath(null)}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--t-muted)" }}
          >
            ← Back
          </button>

          <div className="rounded-xl p-4 grid grid-cols-2 gap-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send in full</p>
              <p className="text-2xl font-black mt-0.5" style={{ color: "var(--t-blue)" }}>${req.amountUsd}</p>
            </div>
            <div className="text-right self-end">
              <p className="text-[10px]" style={{ color: "var(--t-muted)" }}>{effective.currency} · {effective.network}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send to — {effective.network}</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>{effective.walletAddress}</p>
              <CopyButton text={effective.walletAddress} />
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(String(req.amountUsd)).catch(() => {}); toast({ title: "Copied!", description: "Amount copied." }); }}
              className="w-full rounded-lg px-3 py-2.5 flex items-center justify-between text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--t-blue)" }}
            >
              <span>Tap to copy amount</span>
              <span className="font-mono font-black">${req.amountUsd} {effective.currency}</span>
            </button>
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "light-dark(#d97706,#f0c880)" }} />
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                Only send on the <strong style={{ color: "var(--t-text)" }}>{effective.network}</strong> network. Wrong network = lost funds.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Transaction hash</p>
            <input
              value={fullTx}
              onChange={e => setFullTx(e.target.value)}
              placeholder="Paste your transaction hash"
              className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
            />
            <button
              onClick={() => handleSubmitFullTx(effective.currency, effective.network)}
              disabled={!fullTx.trim() || submitting}
              className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--t-blue)" }}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Payment for Review"}
            </button>
          </div>
        </div>
      );
    }

    // ── Choice screen (default): network select + two options ─────────────
    return (
      <div className="w-full max-w-[520px] space-y-4">
        {/* Amount + network */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Choose your network</span>
            <span className="text-lg font-black" style={{ color: "var(--t-text)" }}>${req.amountUsd}</span>
          </div>
          {opts.length > 0 ? (
            <NetworkPills opts={opts} selected={effective} onSelect={setSelected} />
          ) : (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>No payment options configured yet. Contact support.</p>
          )}
          {effective && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-subtle)" }}>
              Send <strong style={{ color: "var(--t-text)" }}>${req.amountUsd} {effective.currency}</strong> on the {effective.network} network to unlock wholesale access.
            </p>
          )}
        </div>

        {/* Two path options */}
        {effective && (
          <div className="space-y-2.5">
            <button
              onClick={() => setPaymentPath("test")}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                <FlaskConical className="w-5 h-5" style={{ color: "light-dark(#d97706,#f0c880)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Send a test payment first</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>Recommended — sends $1–$2 to confirm you're on the right network</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />
            </button>

            <button
              onClick={() => setPaymentPath("skip")}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                <Zap className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Skip to full payment</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>I'm confident I'm on the right network</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--t-muted)" }} />
            </button>
          </div>
        )}

        {effective && (
          <p className="text-[11px] text-center" style={{ color: "var(--t-muted)" }}>
            Only send <strong style={{ color: "var(--t-text)" }}>{effective.currency}</strong> on the <strong style={{ color: "var(--t-text)" }}>{effective.network}</strong> network. Other chains = lost funds.
          </p>
        )}
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
          <p className="text-xs font-bold" style={{ color: "light-dark(#166534,#86efac)" }}>💰 Your fee comes straight back to you</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
            The access fee ($90–$110) is a buyer verification step. Once confirmed, the full amount is <strong style={{ color: "var(--t-text)" }}>returned as store credit</strong> ready to use on your first order.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--t-blue)" }}
        >
          {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <>Get Wholesale Access <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

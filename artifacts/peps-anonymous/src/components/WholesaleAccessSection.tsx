import React, { useState, useEffect, useCallback } from "react";
import { Shield, Copy, CheckCircle, Clock, XCircle, Loader2, ChevronRight, Boxes, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CryptoOption = { currency: string; network: string; walletAddress: string };
type WARStatus = "pending" | "confirmed" | "rejected";
type WARData = {
  id: number;
  amountUsd: number;
  status: WARStatus;
  paymentTxHash: string | null;
  paymentCryptoNetwork: string | null;
  paymentCryptoCurrency: string | null;
  createdAt: string;
  rejectionReason: string | null;
};
type ApiResp = { request: WARData | null; cryptoOptions: CryptoOption[] };

export function WholesaleAccessSection() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CryptoOption | null>(null);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyAddress = () => {
    if (!selectedOption?.walletAddress) return;
    navigator.clipboard.writeText(selectedOption.walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Wallet address copied to clipboard." });
  };

  const handleSubmitTx = async () => {
    if (!txHash.trim() || !selectedOption || !data?.request) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/account/wholesale-access/tx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: txHash.trim(), currency: selectedOption.currency, network: selectedOption.network }),
      });
      if (r.ok) {
        const d: ApiResp = await r.json();
        setData(d);
        toast({ title: "Submitted!", description: "Your payment has been submitted for review." });
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

  const req = data?.request;
  const opts = data?.cryptoOptions ?? [];
  const effective = selectedOption ?? opts[0] ?? null;

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

  if (req?.status === "pending" && req.paymentTxHash) {
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
          <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--t-muted)" }}>Submitted Tx</p>
            <p className="text-xs font-mono mt-1 break-all" style={{ color: "var(--t-subtle)" }}>{req.paymentTxHash}</p>
          </div>
          {req.paymentCryptoCurrency && req.paymentCryptoNetwork && (
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

  if (req?.status === "pending" && !req.paymentTxHash) {
    return (
      <div className="w-full max-w-[520px] space-y-4">
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Your access fee</p>
            <p className="text-4xl font-black mt-0.5" style={{ color: "var(--t-text)" }}>${req.amountUsd}</p>
            <p className="text-xs mt-1.5 max-w-[240px]" style={{ color: "var(--t-muted)" }}>
              This exact amount will be credited back to your account once confirmed.
            </p>
          </div>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-10)" }}>
            <Shield className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
          </div>
        </div>

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

        {effective && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Send to this address</p>
            <div className="rounded-lg px-3 py-3 flex items-center gap-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <p className="font-mono text-xs flex-1 break-all min-w-0" style={{ color: "var(--t-subtle)" }}>
                {effective.walletAddress}
              </p>
              <button
                onClick={handleCopyAddress}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={{
                  background: copied ? "rgba(22,163,74,0.12)" : "var(--t-surface2)",
                  color: copied ? "#16a34a" : "var(--t-text)",
                  border: "1px solid var(--t-border)",
                }}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "light-dark(#d97706,#f0c880)" }} />
              <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
                Send exactly <strong style={{ color: "var(--t-text)" }}>${req.amountUsd} {effective.currency}</strong> via {effective.network}. Sending to the wrong network will result in lost funds.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--t-muted)" }}>Transaction hash</p>
          <input
            value={txHash}
            onChange={e => setTxHash(e.target.value)}
            placeholder="Paste your transaction hash here"
            className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}
          />
          <button
            onClick={handleSubmitTx}
            disabled={!txHash.trim() || submitting}
            className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--t-blue)" }}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : "Submit Payment for Review"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[520px] space-y-5">
      <div className="rounded-xl p-6 space-y-5" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--t-blue-10)" }}>
          <Boxes className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
        </div>
        <div>
          <h3 className="text-xl font-black" style={{ color: "var(--t-text)" }}>Wholesale Access</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--t-muted)" }}>
            Get access to our private wholesale shop — bulk pricing, exclusive listings, and shared order tools for serious members.
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
        <div className="rounded-lg p-3" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
            <strong style={{ color: "var(--t-text)" }}>One-time access fee:</strong> $90–$110 (your exact amount is assigned when you start).
            This fee is <strong style={{ color: "var(--t-text)" }}>fully refunded as store credit</strong> once your payment is confirmed.
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

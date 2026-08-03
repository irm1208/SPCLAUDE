import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, ChevronRight, Clock } from "lucide-react";
import PaymentPanel from "@/components/PaymentPanel";

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
type ApiResp = { request: WARData | null; cryptoOptions?: unknown[] };

export function WholesaleAccessSection() {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<WARData | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/account/wholesale-access");
      if (r.ok) {
        const d: ApiResp = await r.json();
        setRequest(d.request);
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
        setRequest(d.request);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (newStatus === "confirmed" || newStatus === "pending_confirmation") {
      setSubmitted(true);
      await fetchStatus();
    }
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
      </div>
    );
  }

  if (request?.status === "confirmed") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(22,163,74,0.15)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Wholesale Access Granted</h3>
            <p className="text-sm mt-2" style={{ color: "light-dark(#166534,#86efac)" }}>
              Your ${request.amountUsd} fee has been confirmed and added as store credit.
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

  if (request?.status === "rejected") {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Request Not Approved</p>
              <p className="text-xs" style={{ color: "var(--t-muted)" }}>Your wholesale access request was rejected.</p>
            </div>
          </div>
          {request.rejectionReason && (
            <div className="rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(239,68,68,0.7)" }}>Reason</p>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>{request.rejectionReason}</p>
            </div>
          )}
          <p className="text-xs text-center" style={{ color: "var(--t-muted)" }}>Contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  if (submitted || request?.paymentTxHash) {
    return (
      <div className="w-full max-w-[520px]">
        <div className="rounded-xl p-6 text-center space-y-4" style={{ background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.3)" }}>
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)" }}>
            <Clock className="w-7 h-7" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--t-text)" }}>Payment Under Review</h3>
            <p className="text-sm mt-2" style={{ color: "var(--t-muted)" }}>
              We've received your payment. Access will be granted once confirmed — usually within a few hours.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>You'll be notified when your access is ready.</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full max-w-[520px] space-y-6">
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
          <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>How it works</h3>
          <ol className="space-y-3">
            {[
              { n: "1", text: "Select Get Wholesale Access from the navigation." },
              { n: "2", text: "Pay the $50 access fee." },
              { n: "3", text: "The full $50 is added back to your account as credit." },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: "var(--t-blue)" }}>{n}</span>
                <p className="text-sm leading-snug pt-0.5" style={{ color: "var(--t-text)" }}>{text}</p>
              </li>
            ))}
          </ol>
          <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              The credit does not expire and can be used at any time. The $50 amount was chosen because it covers the lowest available shipping option.
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--t-blue)" }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {creating ? "Setting up..." : "Get Wholesale Access"}
          </button>
        </div>
      </div>
    );
  }

  const paymentStatus =
    request.testPaymentTxHash ? "test_confirmed" :
    request.paymentTestAmount !== null ? "test_ready" :
    "unpaid";

  return (
    <div className="w-full max-w-[520px] space-y-4">
      <div className="rounded-xl px-4 py-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>Wholesale Access Fee</p>
        <p className="text-2xl font-black mt-1" style={{ color: "var(--t-text)" }}>${request.amountUsd}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>One-time fee · returned as store credit</p>
      </div>

      <PaymentPanel
        apiPrefix="/api/account/wholesale-access"
        grandTotal={request.amountUsd}
        paymentStatus={paymentStatus}
        paymentTxHash={request.paymentTxHash}
        paymentTestAmount={request.paymentTestAmount}
        testPaymentTxHash={request.testPaymentTxHash}
        paymentsEnabled={true}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

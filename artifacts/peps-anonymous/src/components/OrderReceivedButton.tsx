import React, { useState } from "react";
import { PackageCheck, Loader2 } from "lucide-react";

export interface MemberReceipt {
  status: "Completed";
  memberReceivedAt: string;
}

export function OrderReceivedButton({ orderId, status, memberReceivedAt, onReceived, compact = false }: {
  orderId: string;
  status: string;
  memberReceivedAt?: string | null;
  onReceived: (receipt: MemberReceipt) => void;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirmReceipt() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/received`, {
        method: "POST", credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not confirm receipt. Please try again.");
      onReceived(data);
      setConfirming(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not confirm receipt. Please try again.");
    } finally { setPending(false); }
  }
  if (memberReceivedAt) {
    return <p role="status" className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--t-text)" }}>
      <PackageCheck className="h-4 w-4 shrink-0" style={{ color: "var(--t-blue)" }} />
      {compact ? "Received" : `You confirmed receipt on ${new Date(memberReceivedAt).toLocaleString()}.`}
    </p>;
  }
  if (status !== "Shipped") return null;
  const primary = "min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return <div className="space-y-3">
    {confirming ? <div className="rounded-lg p-3 space-y-3" style={{ border: "1px solid var(--t-border)", background: "var(--t-bg)" }}>
      <p className="text-sm font-semibold">Have you received all items in this order?</p>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>This marks your order as delivered. Only confirm when everything has arrived.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={confirmReceipt} className={primary} style={{ background: "var(--t-blue)", color: "#fff" }}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          {pending ? "Confirming…" : "Yes, I've received it"}
        </button>
        <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(null); }} className={primary} style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>Cancel</button>
      </div>
    </div> : <button type="button" onClick={() => setConfirming(true)}
      className={compact
        ? "min-h-11 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        : `${primary} w-full`}
      style={compact ? { borderColor: "var(--t-border)", color: "var(--t-blue)" } : { background: "var(--t-blue)", color: "#fff" }}>
      <PackageCheck className="h-4 w-4" />{compact ? "Received" : "Mark as received"}
    </button>}
    {error && <p role="alert" className="text-sm" style={{ color: "var(--t-red, #dc2626)" }}>{error}</p>}
  </div>;
}

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { fmtC } from "@/lib/currency";
import { useRequestCustomerRefund, type CustomerRefund, type CustomerRefundView } from "@/hooks/use-account";

const STATUS_LABELS: Record<CustomerRefund["status"], string> = {
  requested: "Refund request submitted",
  verifying: "Refund is being verified",
  verification_failed: "Refund verification failed",
  completed: "Refund completed",
};

function RefundStatus({ refund }: { refund: CustomerRefund }) {
  const failed = refund.status === "verification_failed";
  const done = refund.status === "completed";
  return (
    <div className="rounded-lg px-3 py-2.5" style={{
      background: done ? "rgba(34,197,94,.09)" : failed ? "rgba(239,68,68,.08)" : "var(--t-blue-08)",
      border: `1px solid ${done ? "rgba(34,197,94,.24)" : failed ? "rgba(239,68,68,.24)" : "var(--t-blue-20)"}`,
    }}>
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : failed ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <ShieldCheck className="w-4 h-4" style={{ color: "var(--t-blue)" }} />}
        <span className="text-sm font-bold" style={{ color: done ? "#15803d" : failed ? "#b91c1c" : "var(--t-text)" }}>
          {STATUS_LABELS[refund.status]}
        </span>
        <span className="ml-auto text-sm font-extrabold" style={{ color: "var(--t-text)" }}>{fmtC(refund.amountUsd, "USD")}</span>
      </div>
      {failed && (refund.verificationErrorCode || refund.verificationErrorMessage) && (
        <p className="mt-1.5 text-xs" style={{ color: "#b91c1c" }}>
          {refund.verificationErrorCode && <span className="font-mono mr-1">{refund.verificationErrorCode}</span>}
          {refund.verificationErrorMessage}
        </p>
      )}
      {refund.outgoingTxid && (
        <div className="mt-2 text-xs flex items-center gap-1.5 flex-wrap">
          <span style={{ color: "var(--t-muted)" }}>TXID</span>
          {refund.explorerUrl ? <a className="font-mono break-all" style={{ color: "var(--t-blue)" }} href={refund.explorerUrl} target="_blank" rel="noreferrer">{refund.outgoingTxid}<ExternalLink className="inline w-3 h-3 ml-1" /></a> : <span className="font-mono break-all" style={{ color: "var(--t-text)" }}>{refund.outgoingTxid}</span>}
        </div>
      )}
      <p className="mt-2 text-[11px]" style={{ color: "var(--t-muted)" }}>
        {refund.method === "crypto"
          ? "Crypto is sent externally by the processor, then the transaction ID is verified."
          : "An admin or the owning organiser manually processes this refund to account credits."}
      </p>
    </div>
  );
}

export function CustomerRefundPanel({
  orderId,
  amountUsd,
  refundView,
  onUpdated,
}: {
  orderId: string;
  amountUsd?: number;
  refundView?: CustomerRefundView | null;
  onUpdated?: () => void;
}) {
  const request = useRequestCustomerRefund();
  const [method, setMethod] = useState<"credit" | "crypto">("credit");
  const [asset, setAsset] = useState<"USDC" | "USDT">("USDC");
  const [wallet, setWallet] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CustomerRefund | null>(null);
  const refund = refundView?.current ?? submitted;
  const displayAmountUsd = refund?.amountUsd ?? amountUsd ?? 0;
  const walletValid = /^0x[a-fA-F0-9]{40}$/.test(wallet.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (method === "crypto" && !walletValid) {
      setError("Enter a valid Ethereum address beginning with 0x.");
      return;
    }
    setError(null);
    try {
      const result = await request.mutateAsync({
        orderId,
        method,
        ...(method === "crypto" ? { asset, network: "Ethereum ERC-20" as const, destinationWallet: wallet.trim() } : {}),
      });
      setSubmitted({
        id: String(result.id ?? "pending"),
        method,
        status: "requested",
        amountUsd: Number(result.amountUsd ?? displayAmountUsd),
        asset: method === "crypto" ? asset : null,
        network: method === "crypto" ? "Ethereum ERC-20" : null,
        destinationWallet: method === "crypto" ? wallet.trim() : null,
        outgoingTxid: null,
        explorerUrl: null,
        verificationErrorCode: null,
        verificationErrorMessage: null,
        requestedAt: new Date().toISOString(),
      });
      setShowForm(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit refund request");
    }
  };

  if (refund) return <RefundStatus refund={refund} />;
  if (!refundView?.canRequest) return null;

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">Need a refund?</p>
          <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>Refund amount: {fmtC(displayAmountUsd, "USD")} · reviewed and manually processed.</p>
        </div>
        {!showForm && <button type="button" onClick={() => setShowForm(true)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ background: "#1B3A7A" }}>I want a refund</button>}
      </div>
      {showForm && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold">Refund method</legend>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name={`refund-method-${orderId}`} checked={method === "credit"} onChange={() => setMethod("credit")} /> Refund to account credits</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name={`refund-method-${orderId}`} checked={method === "crypto"} onChange={() => setMethod("crypto")} /> Refund in crypto</label>
          </fieldset>
          {method === "crypto" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold">Asset
                <select aria-label="Refund asset" value={asset} onChange={event => setAsset(event.target.value as "USDC" | "USDT")} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--t-bg)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                  <option value="USDC">USDC</option><option value="USDT">USDT</option>
                </select>
              </label>
              <label className="block text-xs font-bold">Ethereum ERC-20 address
                <input aria-invalid={wallet.length > 0 && !walletValid} value={wallet} onChange={event => setWallet(event.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono" style={{ background: "var(--t-bg)", color: "var(--t-text)", border: `1px solid ${wallet.length > 0 && !walletValid ? "#ef4444" : "var(--t-border)"}` }} />
              </label>
              <p className="text-xs flex gap-1.5" style={{ color: "#b45309" }}><AlertTriangle className="w-3.5 h-3.5 shrink-0" />Completed on-chain transfers cannot be reversed. Check this address carefully.</p>
            </div>
          )}
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>An admin or the owning organiser manually processes requests. This is not automatic approval or payment.</p>
          {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>Cancel</button>
            <button type="submit" disabled={request.isPending} className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: "#1B3A7A" }}>{request.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit refund request"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default CustomerRefundPanel;
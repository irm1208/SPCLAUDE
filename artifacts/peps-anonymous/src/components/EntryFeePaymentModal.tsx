import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { Copy, Check, Loader2, Send, AlertCircle, ShieldCheck, X, RefreshCw, Wallet } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useEntryFeeStatus, useSubmitEntryFeeTx, type EntryFeePaymentInfo } from "@/hooks/use-account";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      type="button"
      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
    </button>
  );
}

function CopyableField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`${mono ? "font-mono" : "font-semibold"} text-xs text-slate-800 break-all flex-1 leading-relaxed`}>
          {value}
        </p>
        <CopyBtn value={value} />
      </div>
    </div>
  );
}

interface Props {
  groupBuyId: string;
  initial: EntryFeePaymentInfo;
  onClose: () => void;
  /** Called once the fee is confirmed and membership should be (re-)granted via join-gb. */
  onConfirmed: () => Promise<void> | void;
}

export function EntryFeePaymentModal({ groupBuyId, initial, onClose, onConfirmed }: Props) {
  const [txHash, setTxHash] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [confirmedHandled, setConfirmedHandled] = useState(false);

  const isPolling = initial.status === "submitted" || initial.status === "pending";
  const { data, isLoading } = useEntryFeeStatus(groupBuyId, {
    refetchInterval: isPolling ? 15_000 : undefined,
  });
  const submitTx = useSubmitEntryFeeTx();

  const fee = data ?? initial;

  useEffect(() => {
    if (fee.status === "confirmed" && !confirmedHandled) {
      setConfirmedHandled(true);
      setFinishing(true);
      Promise.resolve(onConfirmed()).finally(() => setFinishing(false));
    }
  }, [fee.status, confirmedHandled, onConfirmed]);

  const handleSubmitTx = async () => {
    setSubmitError("");
    const trimmed = txHash.trim();
    if (trimmed.length < 8) {
      setSubmitError("Please enter a valid transaction hash");
      return;
    }
    try {
      await submitTx.mutateAsync({ paymentId: fee.id, txHash: trimmed });
      setTxHash("");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit transaction");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="fixed inset-0 z-[61] flex items-center justify-center p-5 pointer-events-none"
      >
        <div className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto bg-white shadow-2xl max-h-[90vh] flex flex-col">
          <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F3EEFF" }}>
              <Wallet className="w-5 h-5" style={{ color: "#7C3AED" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {fee.label || "Entry Fee Required"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">One-time payment to join this group buy</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <div className="h-px bg-slate-100 shrink-0" />

          <div className="px-4 py-4 space-y-3 overflow-y-auto">
            {fee.status === "confirmed" || finishing ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50">
                  {finishing ? <Loader2 className="w-7 h-7 animate-spin text-emerald-600" /> : <ShieldCheck className="w-7 h-7 text-emerald-600" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">Payment confirmed!</p>
                  <p className="text-xs text-slate-400 mt-1">Finalizing your membership…</p>
                </div>
              </div>
            ) : (
              <>
                {fee.status === "rejected" && (
                  <div className="flex gap-2 items-start p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-600">
                      <p className="font-semibold">Your previous submission was rejected</p>
                      {fee.rejectionReason && <p className="mt-0.5">{fee.rejectionReason}</p>}
                      <p className="mt-1 text-red-500/80">Please submit a new transaction hash below.</p>
                    </div>
                  </div>
                )}

                {fee.status === "submitted" && (
                  <div className="flex gap-2 items-start p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0 animate-spin" />
                    <p className="text-xs text-amber-700">
                      Verifying your transaction — this can take a few minutes. This screen will update automatically once confirmed.
                    </p>
                  </div>
                )}

                <div className="rounded-2xl p-3 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">Amount to send</p>
                  <p className="text-sm font-bold text-slate-900">
                    {fee.payment.amount.toFixed(2)} {fee.payment.currency}
                  </p>
                </div>

                {fee.payment.walletAddress ? (
                  <>
                    <div className="flex flex-col items-center gap-2 py-1">
                      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 inline-block">
                        <QRCode value={fee.payment.walletAddress} size={132} level="M" />
                      </div>
                    </div>
                    <CopyableField label={`${fee.payment.currency} · ${fee.payment.network} address`} value={fee.payment.walletAddress} />
                  </>
                ) : (
                  <div className="flex gap-2 items-start p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-500">Payment details are not yet configured for this group buy. Please contact an admin.</p>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-700">
                    {fee.hasTxHash ? "Resubmit transaction hash" : "Transaction hash"}
                  </p>
                  <Input
                    className="font-mono text-xs h-11"
                    placeholder="0x..."
                    value={txHash}
                    onChange={e => setTxHash(e.target.value)}
                    disabled={submitTx.isPending}
                  />
                  {submitError && (
                    <div className="flex gap-2 items-start p-2.5 bg-red-50 rounded-lg border border-red-100">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{submitError}</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleSubmitTx} disabled={submitTx.isPending || !txHash.trim()}>
                    {submitTx.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
                      : fee.hasTxHash
                        ? <><RefreshCw className="w-4 h-4 mr-2" />Resubmit</>
                        : <><Send className="w-4 h-4 mr-2" />Submit Transaction</>
                    }
                  </Button>
                </div>

                {isLoading && <p className="text-[10px] text-slate-300 text-center pt-1">Checking status…</p>}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

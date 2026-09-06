import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { usePayment, useSelectRail, useSubmitTransaction } from "../api";
import { PAYMENT_RAILS } from "@open-crypto-checkout/core";
import { Button, Input, cn } from "../components";
import QRCode from "react-qr-code";
import { CheckCircle2, Copy, AlertTriangle, AlertCircle, Clock, ChevronLeft, Loader2, Info } from "lucide-react";

export default function CheckoutPage() {
  const [, params] = useRoute("/checkout/:publicId");
  const publicId = params?.publicId || "";
  const { data: payment, isLoading, error, refetch } = usePayment(publicId);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2 text-center">Payment not found</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">The payment link might be invalid or expired.</p>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Back to Demo
        </Link>
      </div>
    );
  }

  const isTerminal = ["paid", "expired", "failed", "cancelled"].includes(payment.status);

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl shadow-black/10 border border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 py-8 text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
          <div className="relative z-10">
            <p className="text-primary-foreground/80 text-xs font-bold tracking-widest uppercase mb-3">Total Amount</p>
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">
              {payment.fiatAmount} <span className="text-xl sm:text-2xl text-primary-foreground/60">{payment.fiatCurrency}</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex-1 flex flex-col">
          <StatusBanner status={payment.status} />

          {!payment.selectedQuote && ["created", "awaiting_payment"].includes(payment.status) && (
            <RailSelector payment={payment} />
          )}

          {payment.selectedQuote && ["created", "awaiting_payment"].includes(payment.status) && (
            <PaymentDetails payment={payment} onBack={() => refetch()} />
          )}

          {payment.selectedQuote && ["transaction_submitted", "confirming"].includes(payment.status) && (
            <ProcessingScreen payment={payment} />
          )}

          {payment.selectedQuote && isTerminal && (
            <TerminalScreen payment={payment} />
          )}
          
          {["underpaid", "overpaid_review"].includes(payment.status) && (
            <ReviewScreen payment={payment} />
          )}
        </div>
      </div>
      <div className="mt-8 text-xs text-slate-500 font-mono tracking-wide">
        {payment.publicId}
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    paid: { label: "Payment Complete", icon: <CheckCircle2 className="w-5 h-5" />, cls: "bg-success/15 text-success border-success/30" },
    expired: { label: "Payment Expired", icon: <Clock className="w-5 h-5" />, cls: "bg-muted text-muted-foreground border-border" },
    failed: { label: "Payment Failed", icon: <AlertCircle className="w-5 h-5" />, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    cancelled: { label: "Payment Cancelled", icon: <AlertCircle className="w-5 h-5" />, cls: "bg-muted text-muted-foreground border-border" },
    underpaid: { label: "Underpaid - Needs Attention", icon: <AlertTriangle className="w-5 h-5" />, cls: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
    overpaid_review: { label: "Overpaid - Under Review", icon: <Info className="w-5 h-5" />, cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  };
  const config = map[status];
  if (!config) return null;
  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-lg border mb-6", config.cls)} data-testid={`status-${status}`}>
      {config.icon}
      <span className="font-bold text-sm tracking-wide">{config.label}</span>
    </div>
  );
}

function RailSelector({ payment }: { payment: any }) {
  const selectRail = useSelectRail(payment.publicId);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-lg font-bold font-display mb-1">Select Payment Method</h2>
      <p className="text-sm text-muted-foreground mb-6">Choose a cryptocurrency and network to pay with.</p>
      <div className="space-y-3">
        {payment.allowedRails.map((rail: any) => {
          const r = PAYMENT_RAILS.find((p) => p.id === rail.id) || rail;
          return (
            <button
              key={rail.id}
              onClick={() => selectRail.mutate(rail.id)}
              disabled={selectRail.isPending}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none group bg-background"
              data-testid={`btn-select-rail-${rail.id}`}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold text-foreground group-hover:text-primary transition-colors">{r.asset}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{r.network} network</span>
              </div>
              <ChevronLeft className="w-5 h-5 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          );
        })}
      </div>
      {selectRail.isError && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">
          Failed to select payment method. Please try again.
        </div>
      )}
    </div>
  );
}

function CopyableField({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className={cn("text-xs font-bold uppercase tracking-wider", warn ? "text-orange-600" : "text-muted-foreground")}>{label}</label>
        {copied && <span className="text-[10px] font-bold text-success uppercase tracking-wider animate-in fade-in">Copied!</span>}
      </div>
      <button 
        onClick={handleCopy}
        className={cn("w-full flex items-center justify-between gap-3 p-3 rounded-md border bg-secondary/50 hover:bg-secondary transition-colors group text-left", warn ? "border-orange-500/30" : "border-border")}
      >
        <span className="font-mono text-sm break-all text-foreground">{value}</span>
        <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
      </button>
    </div>
  );
}

function PaymentDetails({ payment }: { payment: any; onBack: () => void }) {
  const submitTx = useSubmitTransaction(payment.publicId);
  const [txHash, setTxHash] = useState("");
  const quote = payment.selectedQuote!;
  const rail = PAYMENT_RAILS.find((r) => r.id === quote.railId);

  // Convert base units to decimal string based on rail decimals
  const decimals = rail?.decimals || 18;
  const baseUnits = quote.amountBaseUnits || "0";
  
  let displayAmount = "0";
  if (baseUnits !== "0") {
    if (baseUnits.length <= decimals) {
      const padded = baseUnits.padStart(decimals, "0");
      displayAmount = `0.${padded}`.replace(/\.?0+$/, "");
    } else {
      const whole = baseUnits.slice(0, -decimals) || "0";
      const fraction = baseUnits.slice(-decimals).replace(/0+$/, "");
      displayAmount = fraction ? `${whole}.${fraction}` : whole;
    }
  }
  
  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) return;
    submitTx.mutate(txHash.trim());
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">
      <div className="flex justify-center mb-8">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-border inline-block">
          <QRCode 
            value={quote.destinationAddress}
            size={180}
            level="M"
          />
        </div>
      </div>

      <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <p className="text-sm text-orange-800 leading-relaxed font-medium">
          Send EXACTLY <span className="font-mono font-bold bg-orange-500/20 px-1 rounded">{displayAmount} {rail?.asset}</span> on the <span className="font-bold uppercase tracking-wider">{rail?.network}</span> network. Sending on the wrong network will result in permanent loss of funds.
        </p>
      </div>

      <CopyableField label="Amount to send" value={displayAmount} warn />
      <CopyableField label="Destination Address" value={quote.destinationAddress} />

      <div className="mt-auto pt-6 border-t border-border">
        <form onSubmit={handleTxSubmit}>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Already paid?</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Paste transaction hash (0x...)" 
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="font-mono text-xs h-10"
              data-testid="input-tx-hash"
            />
            <Button type="submit" isLoading={submitTx.isPending} disabled={!txHash.trim()} className="h-10 px-6 shrink-0" data-testid="btn-submit-tx">
              Submit
            </Button>
          </div>
          {submitTx.isError && (
            <p className="mt-2 text-xs text-destructive font-medium">{submitTx.error?.message || "Failed to submit transaction."}</p>
          )}
        </form>
      </div>
    </div>
  );
}

function ProcessingScreen({ payment }: { payment: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 py-10">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
        <div className="absolute inset-0 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <Loader2 className="w-8 h-8 text-primary opacity-0" />
        <Clock className="w-6 h-6 text-primary absolute" />
      </div>
      <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
      <p className="text-sm text-muted-foreground max-w-[260px]">
        {payment.status === "transaction_submitted" ? "Transaction submitted. Waiting for network confirmation..." : "Confirming transaction on the network. This usually takes a few minutes."}
      </p>
    </div>
  );
}

function TerminalScreen({ payment }: { payment: any }) {
  const isPaid = payment.status === "paid";
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 py-10">
      {isPaid ? (
        <>
          <div className="w-20 h-20 rounded-full bg-success/20 text-success flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2">Payment Successful</h2>
          <p className="text-sm text-muted-foreground">The merchant has been notified of your payment.</p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2 capitalize">{payment.status}</h2>
          <p className="text-sm text-muted-foreground">This payment session is no longer active.</p>
        </>
      )}
    </div>
  );
}

function ReviewScreen({ payment }: { payment: any }) {
  const isUnderpaid = payment.status === "underpaid";
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 py-10">
      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-6", isUnderpaid ? "bg-orange-500/20 text-orange-600" : "bg-blue-500/20 text-blue-600")}>
        {isUnderpaid ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
      </div>
      <h2 className="text-xl font-bold mb-2">{isUnderpaid ? "Insufficient Amount Received" : "Overpayment Under Review"}</h2>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        {isUnderpaid 
          ? "The amount received was less than expected. Please contact the merchant to resolve this issue."
          : "The amount received was more than expected. The merchant will review and resolve this transaction."}
      </p>
    </div>
  );
}

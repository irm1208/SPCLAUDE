import React from "react";
import { getCreditPaymentStatus } from "@/lib/credit-payment";
import { fmtC } from "@/lib/currency";

interface CreditPaymentPillProps {
  creditsApplied?: number | null;
  grandTotal: number;
  currency?: string | null;
}

export function CreditPaymentPill({ creditsApplied, grandTotal, currency }: CreditPaymentPillProps) {
  const status = getCreditPaymentStatus(creditsApplied, grandTotal);
  if (!status) return null;

  const isFull = status === "full";
  const amount = fmtC(creditsApplied ?? 0, currency);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
      style={{
        background: isFull ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
        borderColor: isFull ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
        color: isFull ? "#047857" : "#B45309",
      }}
      title={isFull ? `The order total is fully covered by ${amount} store credit` : `${amount} store credit covers part of the order total`}
    >
      {isFull ? `Paid with credit · ${amount}` : `Partially paid with credit · ${amount}`}
    </span>
  );
}
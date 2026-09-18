import React from "react";
import { getCreditPaymentStatus } from "@/lib/credit-payment";

interface CreditPaymentPillProps {
  creditsApplied?: number | null;
  grandTotal: number;
}

export function CreditPaymentPill({ creditsApplied, grandTotal }: CreditPaymentPillProps) {
  const status = getCreditPaymentStatus(creditsApplied, grandTotal);
  if (!status) return null;

  const isFull = status === "full";
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
      style={{
        background: isFull ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
        borderColor: isFull ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
        color: isFull ? "#047857" : "#B45309",
      }}
      title={isFull ? "The order total is fully covered by store credit" : "Store credit covers part of the order total"}
    >
      {isFull ? "Paid with credit" : "Partially paid with credit"}
    </span>
  );
}
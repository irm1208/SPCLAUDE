import { safeSubtractMoneyClamped } from "@/lib/exact-money";

export interface OrderPaymentSummaryInput {
  grandTotal: number;
  amountDue: number;
  paymentStatus: string;
  balancePaymentStatus?: string | null;
}

export interface OrderPaymentSummary {
  hasOutstandingAddOn: boolean;
  paidAmount: number;
  showFullyPaidPanel: boolean;
  statusLabel: string;
}

export function getOrderPaymentSummary({
  grandTotal,
  amountDue,
  paymentStatus,
  balancePaymentStatus,
}: OrderPaymentSummaryInput): OrderPaymentSummary {
  const originalPaymentConfirmed = paymentStatus === "confirmed" || paymentStatus === "test_confirmed";
  const balanceSettled = balancePaymentStatus === "confirmed" || balancePaymentStatus === "waived";
  const hasOutstandingAddOn = originalPaymentConfirmed && amountDue > 0 && !balanceSettled;

  return {
    hasOutstandingAddOn,
    paidAmount: safeSubtractMoneyClamped(grandTotal, hasOutstandingAddOn ? amountDue : 0),
    showFullyPaidPanel: originalPaymentConfirmed && !hasOutstandingAddOn,
    statusLabel: hasOutstandingAddOn ? "Original payment confirmed" : "Payment confirmed",
  };
}
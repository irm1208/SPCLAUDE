export type OrganiserFeePaymentStatus = "unpaid" | "confirmed" | string;

export interface OrganiserFeeOrderInput {
  oldFee: number;
  newFee: number;
  grandTotal: number;
  amountDue: number;
  paymentStatus: OrganiserFeePaymentStatus;
}

export interface OrganiserFeeOrderUpdate {
  changed: boolean;
  organiserFee: number;
  grandTotal: number;
  amountDue: number;
  resetPaymentLock: boolean;
  resetBalancePayment: boolean;
}

const roundCents = (value: number) => Number(value.toFixed(2));

export function buildOrganiserFeeOrderUpdate({
  oldFee,
  newFee,
  grandTotal,
  amountDue,
  paymentStatus,
}: OrganiserFeeOrderInput): OrganiserFeeOrderUpdate {
  if (!Number.isFinite(oldFee) || oldFee < 0) {
    throw new Error("Existing organiser fee must be a non-negative amount.");
  }
  if (!Number.isFinite(newFee) || newFee < 0) {
    throw new Error("Organiser fee must be a non-negative amount.");
  }

  const delta = roundCents(newFee - oldFee);
  const changed = delta !== 0;
  // Once any payment attempt has started, retain the original payable amount and
  // lock. Later adjustments may add an outstanding balance, but never reduce the
  // recorded order or reopen the original payment.
  const paymentProtected = paymentStatus !== "unpaid";
  const positiveDelta = Math.max(0, delta);
  const nextGrandTotal = roundCents(grandTotal + (paymentProtected ? positiveDelta : delta));

  return {
    changed,
    organiserFee: roundCents(newFee),
    grandTotal: nextGrandTotal,
    amountDue: paymentProtected
      ? roundCents(amountDue + positiveDelta)
      : roundCents(amountDue),
    resetPaymentLock: !paymentProtected && changed,
    resetBalancePayment: paymentProtected && positiveDelta > 0,
  };
}
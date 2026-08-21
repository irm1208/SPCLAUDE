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
  const nextGrandTotal = roundCents(grandTotal + delta);
  const changed = delta !== 0;
  const wasConfirmed = paymentStatus === "confirmed";

  return {
    changed,
    organiserFee: roundCents(newFee),
    grandTotal: nextGrandTotal,
    amountDue: wasConfirmed
      ? roundCents(amountDue + Math.max(0, delta))
      : roundCents(amountDue),
    resetPaymentLock: !wasConfirmed && changed,
    resetBalancePayment: wasConfirmed && delta > 0,
  };
}
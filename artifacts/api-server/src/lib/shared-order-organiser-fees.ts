export type OrganiserFeePaymentStatus = "unpaid" | "confirmed" | string;

export interface OrganiserFeeOrderInput {
  oldFee: number;
  newFee: number;
  grandTotal: number;
  /** The materialised order total before its organiser fee is applied. */
  baseGrandTotal?: number;
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
  baseGrandTotal,
  amountDue,
  paymentStatus,
}: OrganiserFeeOrderInput): OrganiserFeeOrderUpdate {
  if (!Number.isFinite(oldFee) || oldFee < 0) {
    throw new Error("Existing organiser fee must be a non-negative amount.");
  }
  if (!Number.isFinite(newFee) || newFee < 0) {
    throw new Error("Organiser fee must be a non-negative amount.");
  }
  if (baseGrandTotal !== undefined && (!Number.isFinite(baseGrandTotal) || baseGrandTotal < 0)) {
    throw new Error("Order total before organiser fee must be a non-negative amount.");
  }

  const delta = roundCents(newFee - oldFee);
  // Once any payment attempt has started, retain the original payable amount and
  // lock. The unpaid-order reconciliation must not rewrite any payment-started
  // order, even if its configured fee changes later.
  const paymentProtected = paymentStatus !== "unpaid";
  if (paymentProtected) {
    return {
      changed: false,
      organiserFee: roundCents(oldFee),
      grandTotal: roundCents(grandTotal),
      amountDue: roundCents(amountDue),
      resetPaymentLock: false,
      resetBalancePayment: false,
    };
  }

  const nextGrandTotal = baseGrandTotal === undefined
    ? roundCents(grandTotal + delta)
    : roundCents(
      baseGrandTotal
      + newFee
      + Math.max(0, roundCents(grandTotal) - roundCents(baseGrandTotal + oldFee)),
    );
  const changed = delta !== 0 || roundCents(grandTotal) !== nextGrandTotal;

  return {
    changed,
    organiserFee: roundCents(newFee),
    grandTotal: nextGrandTotal,
    amountDue: roundCents(amountDue),
    resetPaymentLock: changed,
    resetBalancePayment: false,
  };
}
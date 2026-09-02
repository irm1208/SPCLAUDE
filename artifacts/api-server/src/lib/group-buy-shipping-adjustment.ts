export class ShippingAdjustmentError extends Error {
  constructor(
    readonly code: "paid_order_decrease" | "balance_payment_pending",
    message: string,
  ) {
    super(message);
    this.name = "ShippingAdjustmentError";
  }
}

export function allocateShipping(
  totalShipping: number,
  equalPct: number,
  weightedPct: number,
  orders: Array<{ orderId: string; quantity: number }>,
): Array<{ orderId: string; amount: number }> {
  if (orders.length === 0) return [];
  const totalCents = Math.round(totalShipping * 100);
  const totalQuantity = orders.reduce((sum, order) => sum + Math.max(0, order.quantity), 0);
  let assignedCents = 0;

  return orders.map((order, index) => {
    const isLast = index === orders.length - 1;
    const equalShare = (equalPct / 100) / orders.length;
    const weightedShare = totalQuantity > 0
      ? (weightedPct / 100) * (Math.max(0, order.quantity) / totalQuantity)
      : 0;
    const cents = isLast
      ? totalCents - assignedCents
      : Math.round(totalCents * (equalShare + weightedShare));
    assignedCents += cents;
    return { orderId: order.orderId, amount: cents / 100 };
  });
}

export function reconcileShippingAdjustment(input: {
  paymentStatus: string | null | undefined;
  balancePaymentStatus: string | null | undefined;
  currentGrandTotal: number;
  currentVendorShipping: number;
  currentAmountDue: number;
  newGrandTotal: number;
  newVendorShipping: number;
}): {
  amountDue: number;
  balancePaymentStatus: string | null;
  clearPrimaryPaymentLock: boolean;
} {
  const paidLike = input.paymentStatus === "confirmed" || input.paymentStatus === "test_confirmed";
  if (!paidLike) {
    return {
      amountDue: input.currentAmountDue,
      balancePaymentStatus: input.balancePaymentStatus ?? null,
      clearPrimaryPaymentLock: input.newGrandTotal !== input.currentGrandTotal,
    };
  }

  if (["pending", "pending_confirmation", "verifying"].includes(input.balancePaymentStatus ?? "")) {
    throw new ShippingAdjustmentError(
      "balance_payment_pending",
      "Shipping cannot change while a balance payment is pending confirmation",
    );
  }

  const delta = Number((input.newGrandTotal - input.currentGrandTotal).toFixed(2));
  if (delta < 0) {
    throw new ShippingAdjustmentError(
      "paid_order_decrease",
      "Shipping cannot reduce a confirmed order total",
    );
  }

  const amountDue = Number((input.currentAmountDue + delta).toFixed(2));
  return {
    amountDue,
    balancePaymentStatus: amountDue > 0 ? "unpaid" : (input.balancePaymentStatus ?? null),
    clearPrimaryPaymentLock: false,
  };
}
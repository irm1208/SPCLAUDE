export interface GroupBuyOrderStatusFields {
  status?: string | null;
  paymentStatus?: string | null;
}

export function matchesTestPayment(order: GroupBuyOrderStatusFields): boolean {
  const status = order.paymentStatus?.trim().toLowerCase();
  return status === "test_ready" || status === "test_confirmed";
}

export function matchesCancelledOrRefunded(order: GroupBuyOrderStatusFields): boolean {
  return order.status?.trim().toLowerCase() === "cancelled"
    || order.paymentStatus?.trim().toLowerCase() === "refunded";
}
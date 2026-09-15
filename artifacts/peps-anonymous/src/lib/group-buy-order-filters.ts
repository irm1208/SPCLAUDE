export interface GroupBuyOrderStatusFields {
  status?: string | null;
  paymentStatus?: string | null;
}

export function matchesCancelledOrRefunded(order: GroupBuyOrderStatusFields): boolean {
  return order.status?.trim().toLowerCase() === "cancelled"
    || order.paymentStatus?.trim().toLowerCase() === "refunded";
}
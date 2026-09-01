export interface OrderSubmitResponse {
  id?: string;
  code: string;
  mergedIntoExistingOrder?: boolean;
}

export function resolveOrderSubmitDestination(
  data: OrderSubmitResponse,
  existingOrderId: string | null,
): string {
  const orderId = data.id ?? existingOrderId ?? "";
  if (data.mergedIntoExistingOrder) {
    return `/account/orders/${encodeURIComponent(orderId)}`;
  }
  const action = existingOrderId ? "updated" : "created";
  return `/success?code=${encodeURIComponent(data.code)}&action=${action}&oid=${encodeURIComponent(orderId)}`;
}
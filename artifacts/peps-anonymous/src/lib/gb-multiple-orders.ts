export interface MultipleGbOrder {
  multipleGbOrderCount?: number;
  additionOfOrderId?: string | null;
  status?: string;
  apiStatus?: string;
}

export function isMultipleGbOrder(order: MultipleGbOrder): boolean {
  const status = (order.apiStatus ?? order.status ?? "").toLowerCase();
  return !order.additionOfOrderId && status !== "cancelled" && status !== "draft"
    && (order.multipleGbOrderCount ?? 0) > 1;
}

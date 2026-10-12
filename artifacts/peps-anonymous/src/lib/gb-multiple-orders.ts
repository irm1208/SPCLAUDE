export interface MultipleGbOrder {
  multipleGbOrderCount?: number;
  additionOfOrderId?: string | null;
  status?: string;
  apiStatus?: string;
  deletedAt?: string | null;
}

function isSeparateActiveOrder(order: MultipleGbOrder): boolean {
  const status = (order.apiStatus ?? order.status ?? "").toLowerCase();
  return !order.additionOfOrderId && !order.deletedAt && status !== "cancelled" && status !== "draft";
}

export function isMultipleGbOrder(order: MultipleGbOrder): boolean {
  return isSeparateActiveOrder(order) && (order.multipleGbOrderCount ?? 0) > 1;
}

/** Use only with a complete, unfiltered list for ONE GB; never paginated results. */
export function annotateCompleteGbOrderCounts<T extends MultipleGbOrder & { telegramUsername: string }>(
  orders: readonly T[],
): Array<T & { multipleGbOrderCount: number }> {
  const personKey = (order: T) => order.telegramUsername.trim().replace(/^@+/, "").toLowerCase();
  const counts = new Map<string, number>();
  for (const order of orders) {
    const key = personKey(order);
    if (key && isSeparateActiveOrder(order)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return orders.map(order => ({
    ...order,
    multipleGbOrderCount: isSeparateActiveOrder(order) ? counts.get(personKey(order)) ?? 0 : 0,
  }));
}

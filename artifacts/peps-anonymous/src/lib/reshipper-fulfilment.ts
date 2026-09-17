import {
  matchesCancelledOrRefunded,
  type GroupBuyOrderStatusFields,
} from "./group-buy-order-filters";

interface ReshipperAssignedOrder extends GroupBuyOrderStatusFields {
  reshipperUsername?: string | null;
}

export function canonicalReshipperUsername(username: string | null | undefined): string {
  return username?.trim().replace(/^@/, "").trim().toLowerCase() ?? "";
}

export function filterAssignedFulfilmentOrders<T extends ReshipperAssignedOrder>(
  orders: T[],
  reshipperUsername: string,
): T[] {
  const assignedUsername = canonicalReshipperUsername(reshipperUsername);
  if (!assignedUsername) return [];

  return orders.filter(order =>
    canonicalReshipperUsername(order.reshipperUsername) === assignedUsername
    && !matchesCancelledOrRefunded(order),
  );
}
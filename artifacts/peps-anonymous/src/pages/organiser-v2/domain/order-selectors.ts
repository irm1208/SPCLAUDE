import type { OverviewOrder } from "../overview-model.ts";
import type { OrganiserOrder } from "./order.ts";

const COMPLETED_STATUSES = new Set<OrganiserOrder["status"]>([
  "shipped",
  "dispatched",
  "delivered",
]);

export function isPendingPaymentReview(order: OrganiserOrder): boolean {
  return order.paymentStatus?.toLowerCase() === "pending_confirmation";
}

export function selectPaymentAttentionOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => order.status === "pending");
}

export function selectDispatchReadyOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => order.status === "paid" || order.status === "processing");
}

export function selectCompletedOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => COMPLETED_STATUSES.has(order.status));
}

export function selectNeedsActionOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  const selected = orders.filter(order => (
    order.status !== "cancelled"
    && !COMPLETED_STATUSES.has(order.status)
    && (order.status === "pending" || Boolean(order.flagged))
  ));
  return [...new Map(selected.map(order => [order.id, order])).values()];
}

export function deriveOrderAttentionSummary(orders: readonly OrganiserOrder[]) {
  const paymentOrders = selectPaymentAttentionOrders(orders);
  return {
    paymentCount: paymentOrders.length,
    paymentTotal: paymentOrders.reduce((total, order) => total + order.total, 0),
    dispatchReadyCount: selectDispatchReadyOrders(orders).length,
    needsActionCount: selectNeedsActionOrders(orders).length,
  };
}

export function toOverviewOrders(orders: readonly OrganiserOrder[]): OverviewOrder[] {
  return orders.map(order => ({
    id: order.id,
    status: order.status,
    total: order.total,
    memberName: order.memberName,
    products: order.products.map(product => `${product.name} × ${product.quantity}`),
    createdAt: order.createdAt,
  }));
}

export function countPendingPayments(orders: readonly OrganiserOrder[]): number {
  return selectPaymentAttentionOrders(orders).length;
}

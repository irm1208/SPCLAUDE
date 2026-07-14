import type { OverviewOrder } from "../overview-model.ts";
import type { OrganiserOrder } from "./order.ts";

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
  return orders.filter(order => order.status === "pending").length;
}

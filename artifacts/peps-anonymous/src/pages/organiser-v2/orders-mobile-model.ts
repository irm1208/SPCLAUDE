import type { OrganiserOrder } from "./domain/order.ts";
import {
  deriveOrderAttentionSummary,
  selectCompletedOrders,
  selectNeedsActionOrders,
} from "./domain/order-selectors.ts";
import { cloneOrderFilters, type OrderFilterValues } from "./orders-filter-model.ts";

export type MobileOrderView = "needs-action" | "all" | "completed";
export type MobileOrderAction = "chase-payment" | "open-dispatch";

export interface MobileAttentionItem {
  order: OrganiserOrder;
  label: string;
  ageDays: number;
}

export interface MobileOrdersModel {
  summary: ReturnType<typeof deriveOrderAttentionSummary>;
  needsAction: MobileAttentionItem[];
  completed: OrganiserOrder[];
}

function ageInDays(createdAt: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86_400_000));
}

function attentionLabel(order: OrganiserOrder, ageDays: number): string {
  if (order.flagged?.note) return order.flagged.note;
  if (order.paymentStatus?.toLowerCase() === "pending_confirmation") return "Payment needs review";
  if (ageDays === 1) return "1 day overdue";
  return `${ageDays} days overdue`;
}

export function buildMobileOrdersModel(
  orders: readonly OrganiserOrder[],
  now: number = Date.now(),
): MobileOrdersModel {
  const needsAction = selectNeedsActionOrders(orders)
    .map(order => {
      const ageDays = ageInDays(order.createdAt, now);
      return { order, ageDays, label: attentionLabel(order, ageDays) };
    })
    .sort((left, right) => {
      const paymentPriority = Number(right.order.status === "pending") - Number(left.order.status === "pending");
      return paymentPriority || right.ageDays - left.ageDays || left.order.id.localeCompare(right.order.id);
    });
  return {
    summary: deriveOrderAttentionSummary(orders),
    needsAction,
    completed: selectCompletedOrders(orders),
  };
}

export function selectMobileOrderView(
  model: MobileOrdersModel,
  allOrders: readonly OrganiserOrder[],
  view: MobileOrderView,
): OrganiserOrder[] {
  if (view === "needs-action") return model.needsAction.map(item => item.order);
  if (view === "completed") return [...model.completed];
  return [...allOrders];
}

export function applyMobileOrderAction(
  filters: OrderFilterValues,
  action: MobileOrderAction,
): OrderFilterValues {
  const next = cloneOrderFilters(filters);
  next.statusFilters = action === "chase-payment"
    ? ["unpaid", "pending-confirmation"]
    : ["ready-dispatch"];
  return next;
}

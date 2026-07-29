import type { OrganiserOrder } from "./domain/order";

export type OrderSortOrder = "newest" | "oldest";
export type OrderStatusFilter =
  | "all"
  | "paid"
  | "unpaid"
  | "pending-confirmation"
  | "ready-dispatch"
  | "completed";
export type OrderFilterChipId = "status" | "country" | "payment" | "order-date" | "payment-date";

export interface OrderFilterValues {
  statusFilters: OrderStatusFilter[];
  countryFilters: string[];
  paymentMethodFilters: string[];
  orderDateFrom: string;
  orderDateTo: string;
  paymentDateFrom: string;
  paymentDateTo: string;
  sortOrder: OrderSortOrder;
}

export interface OrderFilterChip {
  id: OrderFilterChipId;
  label: string;
}

export interface OrderFilterDateErrors {
  orderDate?: string;
  paymentDate?: string;
}

const STATUS_LABELS: Record<OrderStatusFilter, string> = {
  all: "All",
  paid: "Paid",
  unpaid: "Unpaid",
  "pending-confirmation": "Pending confirmation",
  "ready-dispatch": "Ready to dispatch",
  completed: "Completed",
};

export function cloneOrderFilters(filters: OrderFilterValues): OrderFilterValues {
  return {
    ...filters,
    statusFilters: [...filters.statusFilters],
    countryFilters: [...filters.countryFilters],
    paymentMethodFilters: [...filters.paymentMethodFilters],
  };
}

export function countActiveOrderFilterCategories(filters: OrderFilterValues): number {
  return [
    !filters.statusFilters.includes("all") && filters.statusFilters.length > 0,
    filters.countryFilters.length > 0,
    filters.paymentMethodFilters.length > 0,
    Boolean(filters.orderDateFrom || filters.orderDateTo),
    Boolean(filters.paymentDateFrom || filters.paymentDateTo),
  ].filter(Boolean).length;
}

function selectionLabel(prefix: string, values: string[]): string {
  return values.length === 1 ? `${prefix}: ${values[0]}` : `${prefix}: ${values.length} selected`;
}

function rangeLabel(prefix: string, from: string, to: string): string {
  if (from && to) return `${prefix}: ${from} – ${to}`;
  if (from) return `${prefix}: from ${from}`;
  return `${prefix}: to ${to}`;
}

export function createOrderFilterChips(filters: OrderFilterValues): OrderFilterChip[] {
  const chips: OrderFilterChip[] = [];
  if (!filters.statusFilters.includes("all") && filters.statusFilters.length > 0) {
    const statusLabels = filters.statusFilters.map(status => STATUS_LABELS[status] ?? status);
    chips.push({ id: "status", label: selectionLabel("Status", statusLabels) });
  }
  if (filters.countryFilters.length > 0) {
    chips.push({ id: "country", label: selectionLabel("Country", filters.countryFilters) });
  }
  if (filters.paymentMethodFilters.length > 0) {
    chips.push({ id: "payment", label: selectionLabel("Payment", filters.paymentMethodFilters) });
  }
  if (filters.orderDateFrom || filters.orderDateTo) {
    chips.push({
      id: "order-date",
      label: rangeLabel("Order date", filters.orderDateFrom, filters.orderDateTo),
    });
  }
  if (filters.paymentDateFrom || filters.paymentDateTo) {
    chips.push({
      id: "payment-date",
      label: rangeLabel("Payment date", filters.paymentDateFrom, filters.paymentDateTo),
    });
  }
  return chips;
}

export function validateOrderFilterDates(filters: OrderFilterValues): OrderFilterDateErrors {
  const errors: OrderFilterDateErrors = {};
  if (
    filters.orderDateFrom
    && filters.orderDateTo
    && filters.orderDateFrom > filters.orderDateTo
  ) {
    errors.orderDate = "Order date from must be before order date to.";
  }
  if (
    filters.paymentDateFrom
    && filters.paymentDateTo
    && filters.paymentDateFrom > filters.paymentDateTo
  ) {
    errors.paymentDate = "Payment date from must be before payment date to.";
  }
  return errors;
}

function startOfSelectedDay(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfSelectedDay(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

export function filterOrders(
  orders: readonly OrganiserOrder[],
  filters: OrderFilterValues,
  searchQuery: string,
): OrganiserOrder[] {
  const query = searchQuery.trim().toLowerCase();
  return orders
    .filter(order => {
      const matchesSearch = !query || [
        order.code ?? "",
        order.memberUsername,
        order.memberName,
        order.id,
        order.paymentProof?.value ?? "",
      ].some(value => value.toLowerCase().includes(query));

      const paymentStatus = order.paymentStatus?.toLowerCase();
      const isPendingConfirmation = paymentStatus === "pending_confirmation"
        || (!paymentStatus && order.status === "processing");
      const isCompleted = ["shipped", "dispatched", "delivered"].includes(order.status);
      const isReadyDispatch = order.status === "paid" || order.status === "processing";
      const matchesStatus = filters.statusFilters.includes("all")
        || (filters.statusFilters.includes("paid") && order.status === "paid")
        || (filters.statusFilters.includes("unpaid") && order.status === "pending" && !isPendingConfirmation)
        || (filters.statusFilters.includes("pending-confirmation") && isPendingConfirmation)
        || (filters.statusFilters.includes("ready-dispatch") && isReadyDispatch)
        || (filters.statusFilters.includes("completed") && isCompleted);

      const matchesCountry = filters.countryFilters.length === 0
        || filters.countryFilters.includes(order.country);
      const matchesPayment = filters.paymentMethodFilters.length === 0
        || filters.paymentMethodFilters.includes(order.paymentMethod);

      const createdAt = new Date(order.createdAt).getTime();
      const matchesOrderDate = (
        !filters.orderDateFrom || createdAt >= startOfSelectedDay(filters.orderDateFrom)
      ) && (
        !filters.orderDateTo || createdAt <= endOfSelectedDay(filters.orderDateTo)
      );

      const paidAt = order.paidAt ? new Date(order.paidAt).getTime() : null;
      const matchesPaymentDate = (!filters.paymentDateFrom && !filters.paymentDateTo)
        || (
          paidAt !== null
          && (!filters.paymentDateFrom || paidAt >= startOfSelectedDay(filters.paymentDateFrom))
          && (!filters.paymentDateTo || paidAt <= endOfSelectedDay(filters.paymentDateTo))
        );

      return matchesSearch
        && matchesStatus
        && matchesCountry
        && matchesPayment
        && matchesOrderDate
        && matchesPaymentDate;
    })
    .sort((left, right) => {
      const delta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      return filters.sortOrder === "newest" ? delta : -delta;
    });
}

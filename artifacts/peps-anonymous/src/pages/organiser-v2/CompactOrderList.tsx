import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { fmtMoney } from "./data";
import type { OrganiserOrder } from "./domain/order";

interface Props {
  orders: readonly OrganiserOrder[];
  onOpenOrder: (order: OrganiserOrder) => void;
  selected?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  empty?: ReactNode;
}

function orderQuantity(order: OrganiserOrder): number {
  return order.products.reduce((sum, product) => sum + product.quantity, 0);
}

function orderDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
}

export default function CompactOrderList({
  orders,
  onOpenOrder,
  selected = [],
  onSelectionChange,
  empty,
}: Props) {
  if (!orders.length) return <>{empty ?? null}</>;

  const selectedSet = new Set(selected);
  const allSelected = orders.every(order => selectedSet.has(order.id));
  const toggleAll = () => onSelectionChange?.(allSelected ? [] : orders.map(order => order.id));
  const toggleOne = (orderId: string) => onSelectionChange?.(
    selectedSet.has(orderId)
      ? selected.filter(id => id !== orderId)
      : [...selected, orderId],
  );

  return (
    <div className="orders-compact-list" data-selectable={onSelectionChange ? true : undefined}>
      <div className="orders-compact-header">
        {onSelectionChange ? (
          <label className="orders-compact-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Select all orders"
            />
          </label>
        ) : null}
        <span>User name</span>
        <span>QTY</span>
        <span>Total</span>
        <span>Date</span>
        <span />
      </div>

      {orders.map(order => (
        <div
          className="orders-compact-row"
          data-order-id={order.id}
          data-selected={selectedSet.has(order.id) || undefined}
          key={order.id}
        >
          {onSelectionChange ? (
            <label
              className="orders-compact-select"
              onClick={event => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(order.id)}
                onChange={() => toggleOne(order.id)}
                aria-label={`Select order ${order.code ?? order.id}`}
              />
            </label>
          ) : null}
          <button
            type="button"
            className="orders-compact-summary"
            onClick={() => onOpenOrder(order)}
            aria-label={`Open full order details for @${order.memberUsername}`}
          >
            <span className="orders-compact-cell orders-compact-user" data-label="User name">
              <strong>@{order.memberUsername}</strong>
            </span>
            <span className="orders-compact-cell" data-label="QTY">
              <strong>{orderQuantity(order)}</strong>
            </span>
            <span className="orders-compact-cell orders-compact-total" data-label="Total">
              <strong>{fmtMoney(order.total, "GBP")}</strong>
            </span>
            <span className="orders-compact-cell" data-label="Date">
              <time dateTime={order.createdAt}>{orderDate(order.createdAt)}</time>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
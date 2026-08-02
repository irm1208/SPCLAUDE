import { useState } from "react";
import { ChevronRight, Copy, Edit2 } from "lucide-react";
import type { ReactNode } from "react";
import { fmtMoney } from "./data";
import type { OrganiserOrder } from "./domain/order";
import { AtlasStatusBadge } from "./AtlasUi";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  dispatched: "Dispatched",
};

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "navy";

function statusTone(status: string): Tone {
  if (status === "pending") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "dispatched") return "navy";
  return "success";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function orderQuantity(order: OrganiserOrder): number {
  return order.products.reduce((sum, product) => sum + product.quantity, 0);
}

function fmt(iso: string, withTime = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  orders: readonly OrganiserOrder[];
  selected?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Opens the edit modal for an order */
  onEditOrder?: (order: OrganiserOrder) => void;
  /** Adds an order to the bulk-selection set and collapses the row */
  onSelectOrder?: (orderId: string) => void;
  /** Copies a string to clipboard (e.g. payment TXID) */
  onCopyToClipboard?: (text: string) => void;
  /** Opens the payment proof screenshot lightbox */
  onViewProofImage?: (url: string) => void;
  /** Auto-expand a specific order on first render (deep-link support) */
  initialExpandedId?: string;
  empty?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompactOrderList({
  orders,
  selected = [],
  onSelectionChange,
  onEditOrder,
  onSelectOrder,
  onCopyToClipboard,
  onViewProofImage,
  initialExpandedId,
  empty,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId ?? null);

  if (!orders.length) return <>{empty ?? null}</>;

  const selectedSet = new Set(selected);
  const allSelected = orders.every(order => selectedSet.has(order.id));
  const toggleAll = () => onSelectionChange?.(allSelected ? [] : orders.map(order => order.id));
  const toggleOne = (orderId: string) => onSelectionChange?.(
    selectedSet.has(orderId)
      ? selected.filter(id => id !== orderId)
      : [...selected, orderId],
  );
  const toggleExpand = (orderId: string) =>
    setExpandedId(prev => (prev === orderId ? null : orderId));

  return (
    <div className="orders-compact-list" data-selectable={onSelectionChange ? true : undefined}>
      {/* Column header row */}
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

      {orders.map(order => {
        const isExpanded = expandedId === order.id;
        return (
          <div
            className="orders-compact-row"
            data-order-id={order.id}
            data-selected={selectedSet.has(order.id) || undefined}
            data-expanded={isExpanded || undefined}
            key={order.id}
          >
            {/* Per-row checkbox — click does not toggle the accordion */}
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

            {/* Compact summary row — click toggles the accordion */}
            <button
              type="button"
              className="orders-compact-summary"
              onClick={() => toggleExpand(order.id)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} order for @${order.memberUsername}`}
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
                <time dateTime={order.createdAt}>{fmt(order.createdAt)}</time>
              </span>
              <ChevronRight aria-hidden="true" className="orders-compact-chevron" />
            </button>

            {/* Inline accordion — full order details */}
            {isExpanded ? (
              <div className="orders-compact-detail">
                {/* Status + method strip */}
                <div className="orders-compact-detail-top">
                  <AtlasStatusBadge tone={statusTone(order.status)}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </AtlasStatusBadge>
                  <span className="orders-compact-detail-meta">
                    {order.paymentMethod} · {order.country}
                  </span>
                </div>

                <div className="orders-compact-detail-sections">
                  {/* Items */}
                  <section className="orders-compact-detail-section">
                    <h4>Items</h4>
                    <div className="orders-compact-detail-items">
                      {order.products.map(product => (
                        <div key={product.name} className="orders-compact-detail-item">
                          <div>
                            <strong>{product.name}</strong>
                            <span>Qty {product.quantity}</span>
                          </div>
                          <strong>{fmtMoney(product.price * product.quantity, "GBP")}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Payment */}
                  <section className="orders-compact-detail-section">
                    <h4>Payment</h4>
                    <dl className="orders-compact-detail-dl">
                      <div><dt>Method</dt><dd>{order.paymentMethod}</dd></div>
                      <div>
                        <dt>Status</dt>
                        <dd>{order.paymentStatus ?? STATUS_LABELS[order.status] ?? order.status}</dd>
                      </div>
                      <div>
                        <dt>Paid</dt>
                        <dd>{order.paidAt ? fmt(order.paidAt, true) : "Not recorded"}</dd>
                      </div>
                      <div>
                        <dt>Proof</dt>
                        <dd>
                          {order.paymentProof
                            ? order.paymentProof.type === "txid"
                              ? "Transaction ID"
                              : "Screenshot"
                            : "Not provided"}
                        </dd>
                      </div>
                    </dl>
                    {order.paymentProof ? (
                      order.paymentProof.type === "txid" ? (
                        <button
                          type="button"
                          className="atlas-drawer-inline-action"
                          onClick={() => onCopyToClipboard?.(order.paymentProof!.value)}
                        >
                          <Copy aria-hidden="true" />
                          Copy {order.paymentProof.value.slice(0, 10)}…{order.paymentProof.value.slice(-6)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="atlas-drawer-inline-action"
                          onClick={() => onViewProofImage?.(order.paymentProof!.value)}
                        >
                          View screenshot
                        </button>
                      )
                    ) : null}
                  </section>

                  {/* Delivery */}
                  <section className="orders-compact-detail-section">
                    <h4>Delivery</h4>
                    <dl className="orders-compact-detail-dl">
                      <div><dt>Shipping</dt><dd>{order.shippingOption}</dd></div>
                      <div><dt>Country</dt><dd>{order.country}</dd></div>
                      <div><dt>Tracking</dt><dd>{order.trackingNumber ?? "Not assigned"}</dd></div>
                      <div><dt>Created</dt><dd>{fmt(order.createdAt, true)}</dd></div>
                    </dl>
                  </section>

                  {/* Notes */}
                  {(order.internalNotes || order.flagged) ? (
                    <section className="orders-compact-detail-section">
                      <h4>Notes</h4>
                      {order.flagged ? (
                        <p className="orders-compact-detail-note">
                          <strong>Flag:</strong> {order.flagged.note}
                        </p>
                      ) : null}
                      {order.internalNotes ? (
                        <p className="orders-compact-detail-note">
                          <strong>Internal:</strong> {order.internalNotes}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                </div>

                {/* Actions */}
                {(onEditOrder || onSelectOrder) ? (
                  <div className="orders-compact-detail-actions">
                    {onEditOrder ? (
                      <button
                        type="button"
                        className="orders-compact-detail-action-secondary"
                        onClick={() => onEditOrder(order)}
                      >
                        <Edit2 aria-hidden="true" /> Edit order
                      </button>
                    ) : null}
                    {onSelectOrder ? (
                      <button
                        type="button"
                        className="orders-compact-detail-action-primary"
                        onClick={() => { onSelectOrder(order.id); setExpandedId(null); }}
                      >
                        Select order
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

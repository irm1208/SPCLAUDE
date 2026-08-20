import { index, integer, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * An administrator-maintained timeline of payment wallets. Rows are scoped to
 * the kind of order they serve and have a bounded effective period, so old
 * transactions are never compared against a replacement wallet by accident.
 */
export const approvedWalletHistoryTable = pgTable("approved_wallet_history", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull().default("all"),
  network: text("network").notNull(),
  address: text("address").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("approved_wallet_history_lookup_idx").on(t.scope, t.network, t.effectiveFrom),
]);

/**
 * Read-only check snapshots. They never drive an order state transition; the
 * audit workspace can show the latest chain evidence without re-querying a
 * third-party RPC node on every page load.
 */
export const paymentAuditResultsTable = pgTable("payment_audit_results", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  txHash: text("tx_hash").notNull(),
  referenceSource: text("reference_source").notNull().default("payment"),
  txKind: text("tx_kind").notNull().default("crypto"),
  status: text("status").notNull(),
  network: text("network"),
  currency: text("currency"),
  expectedAmount: numeric("expected_amount", { precision: 24, scale: 10 }),
  expectedWallet: text("expected_wallet"),
  recipientAddress: text("recipient_address"),
  receivedAmount: numeric("received_amount", { precision: 24, scale: 10 }),
  confirmations: integer("confirmations"),
  reason: text("reason"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("payment_audit_results_order_tx_source_unique").on(t.orderId, t.txHash, t.referenceSource),
  index("payment_audit_results_order_idx").on(t.orderId),
  index("payment_audit_results_checked_idx").on(t.checkedAt),
]);

export type ApprovedWalletHistory = typeof approvedWalletHistoryTable.$inferSelect;
export type PaymentAuditResult = typeof paymentAuditResultsTable.$inferSelect;
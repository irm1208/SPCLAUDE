import { sql } from "drizzle-orm";
import {
  check,
  integer,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { groupBuysTable } from "./group_buys";
import { ordersTable } from "./orders";

export const GROUP_BUY_REFUND_METHODS = ["credit", "crypto"] as const;
export type GroupBuyRefundMethod = typeof GROUP_BUY_REFUND_METHODS[number];

export const GROUP_BUY_REFUND_STATUSES = [
  "requested",
  "verifying",
  "verification_failed",
  "completed",
] as const;
export type GroupBuyRefundStatus = typeof GROUP_BUY_REFUND_STATUSES[number];

export const GROUP_BUY_REFUND_ASSETS = ["USDC", "USDT"] as const;
export type GroupBuyRefundAsset = typeof GROUP_BUY_REFUND_ASSETS[number];

export const GROUP_BUY_REFUND_NETWORKS = ["Ethereum ERC-20"] as const;
export type GroupBuyRefundNetwork = typeof GROUP_BUY_REFUND_NETWORKS[number];

export const groupBuyRefundsTable = pgTable("group_buy_refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onUpdate: "restrict", onDelete: "restrict" }),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onUpdate: "restrict", onDelete: "restrict" }),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onUpdate: "restrict", onDelete: "restrict" }),
  method: text("method").notNull(),
  status: text("status").notNull().default("requested"),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  asset: text("asset"),
  network: text("network"),
  destinationWallet: text("destination_wallet"),
  // Stored as a decimal integer string so base-unit amounts remain exact.
  // tokenDecimals is intentionally not persisted: the only supported refund
  // rail is Ethereum ERC-20 USDC/USDT, whose canonical token precision is
  // fixed at six decimals. `amountBaseUnits` is therefore always USD cents ×
  // 10,000 (and the service rejects every other network/asset).
  amountBaseUnits: numeric("amount_base_units", { precision: 30, scale: 0 }),
  // Once recorded, an outgoing transaction identity must never be replaced.
  outgoingTxid: text("outgoing_txid"),
  confirmationCount: integer("confirmation_count"),
  explorerUrl: text("explorer_url"),
  processorUsername: text("processor_username"),
  processorRole: text("processor_role"),
  processingAttemptId: text("processing_attempt_id"),
  verificationErrorCode: text("verification_error_code"),
  verificationErrorMessage: text("verification_error_message"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  verifyingAt: timestamp("verifying_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  check(
    "group_buy_refunds_method_check",
    sql`${t.method} in ('credit', 'crypto')`,
  ),
  check(
    "group_buy_refunds_status_check",
    sql`${t.status} in ('requested', 'verifying', 'verification_failed', 'completed')`,
  ),
  check(
    "group_buy_refunds_asset_check",
    sql`${t.asset} is null or ${t.asset} in ('USDC', 'USDT')`,
  ),
  check(
    "group_buy_refunds_network_check",
    sql`${t.network} is null or ${t.network} = 'Ethereum ERC-20'`,
  ),
  check(
    "group_buy_refunds_positive_amount_check",
    sql`${t.amountUsd} > 0`,
  ),
  check(
    "group_buy_refunds_method_fields_check",
    sql`(
      (${t.method} = 'credit'
        and ${t.asset} is null
        and ${t.network} is null
        and ${t.destinationWallet} is null
        and ${t.amountBaseUnits} is null)
      or
      (${t.method} = 'crypto'
        and ${t.asset} is not null
        and ${t.network} is not null
        and ${t.destinationWallet} is not null
        and ${t.amountBaseUnits} is not null
        and ${t.amountBaseUnits} > 0)
    )`,
  ),
  uniqueIndex("group_buy_refunds_active_order_unique")
    .on(t.orderId)
    .where(sql`${t.status} in ('requested', 'verifying', 'verification_failed')`),
  uniqueIndex("group_buy_refunds_outgoing_txid_unique")
    .on(t.outgoingTxid)
    .where(sql`${t.outgoingTxid} is not null`),
  index("group_buy_refunds_order_id_idx").on(t.orderId),
  index("group_buy_refunds_group_buy_status_idx").on(t.groupBuyId, t.status),
]);

export const groupBuyRefundAttemptsTable = pgTable("group_buy_refund_attempts", {
  id: text("id").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onUpdate: "restrict", onDelete: "restrict" }),
  submittedTxid: text("submitted_txid").notNull(),
  processorUsername: text("processor_username").notNull(),
  processorRole: text("processor_role").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  resultCode: text("result_code"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("group_buy_refund_attempts_refund_started_idx").on(t.refundId, t.startedAt),
]);

export const groupBuyRefundTxClaimsTable = pgTable("group_buy_refund_tx_claims", {
  txid: text("txid").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onUpdate: "restrict", onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("group_buy_refund_tx_claims_refund_idx").on(t.refundId),
]);

export const groupBuyRefundTransitionOutboxTable = pgTable("group_buy_refund_transition_outbox", {
  id: text("id").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onUpdate: "restrict", onDelete: "restrict" }),
  attemptId: text("attempt_id").notNull(),
  orderId: text("order_id"),
  groupBuyId: text("group_buy_id"),
  accountId: text("account_id"),
  method: text("method"),
  source: text("source").notNull().default("background"),
  transition: text("transition").notNull(),
  action: text("action").notNull().default("group_buy_refund_transition"),
  processorUsername: text("processor_username").notNull(),
  processorRole: text("processor_role").notNull(),
  submittedTxid: text("submitted_txid"),
  resultCode: text("result_code").notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("group_buy_refund_transition_outbox_txid_nonempty", sql`${t.submittedTxid} IS NULL OR length(trim(${t.submittedTxid})) > 0`),
  uniqueIndex("group_buy_refund_transition_outbox_unique")
    .on(t.refundId, t.attemptId, t.transition),
]);

/**
 * Durable customer notification outbox.  `transitionKey` is deliberately part
 * of the identity: requested/completed have one occurrence, while each crypto
 * verification attempt gets its own verifying/failed occurrence.  This keeps a
 * retry of one attempt idempotent without suppressing a later
 * verification_failed -> verifying -> verification_failed cycle.
 */
export const groupBuyRefundNotificationsTable = pgTable("group_buy_refund_notifications", {
  id: text("id").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  status: text("status").notNull(),
  eventKey: text("event_key").notNull(),
  transitionKey: text("transition_key").notNull(),
  attemptId: text("attempt_id"),
  orderCode: text("order_code"),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }),
  explorerUrl: text("explorer_url"),
  txid: text("txid"),
  attemptCount: integer("attempt_count").notNull().default(0),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("group_buy_refund_notifications_transition_unique")
    .on(t.refundId, t.status, t.accountId, t.transitionKey),
  index("group_buy_refund_notifications_pending_idx")
    .on(t.sentAt, t.claimedAt, t.createdAt),
  check("group_buy_refund_notifications_status_check", sql`${t.status} in ('requested', 'verifying', 'verification_failed', 'completed')`),
]);

export type GroupBuyRefund = typeof groupBuyRefundsTable.$inferSelect;
export type NewGroupBuyRefund = typeof groupBuyRefundsTable.$inferInsert;
export type GroupBuyRefundAttempt = typeof groupBuyRefundAttemptsTable.$inferSelect;
export type NewGroupBuyRefundAttempt = typeof groupBuyRefundAttemptsTable.$inferInsert;
export type GroupBuyRefundTxClaim = typeof groupBuyRefundTxClaimsTable.$inferSelect;
export type NewGroupBuyRefundTxClaim = typeof groupBuyRefundTxClaimsTable.$inferInsert;
export type GroupBuyRefundTransitionOutbox = typeof groupBuyRefundTransitionOutboxTable.$inferSelect;
export type NewGroupBuyRefundTransitionOutbox = typeof groupBuyRefundTransitionOutboxTable.$inferInsert;
export type GroupBuyRefundNotification = typeof groupBuyRefundNotificationsTable.$inferSelect;
export type NewGroupBuyRefundNotification = typeof groupBuyRefundNotificationsTable.$inferInsert;

import { sql } from "drizzle-orm";
import {
  check,
  integer,
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
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  method: text("method").notNull(),
  status: text("status").notNull().default("requested"),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  asset: text("asset"),
  network: text("network"),
  destinationWallet: text("destination_wallet"),
  // Stored as a decimal integer string so base-unit amounts remain exact.
  amountBaseUnits: numeric("amount_base_units", { precision: 30, scale: 0 }),
  // Once recorded, an outgoing transaction identity must never be replaced.
  outgoingTxid: text("outgoing_txid"),
  confirmationCount: integer("confirmation_count"),
  explorerUrl: text("explorer_url"),
  processorUsername: text("processor_username"),
  processorRole: text("processor_role"),
  verificationError: text("verification_error"),
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
]);

export const groupBuyRefundAttemptsTable = pgTable("group_buy_refund_attempts", {
  id: text("id").primaryKey(),
  refundId: text("refund_id").notNull().references(() => groupBuyRefundsTable.id, { onDelete: "cascade" }),
  submittedTxid: text("submitted_txid").notNull(),
  processorUsername: text("processor_username").notNull(),
  processorRole: text("processor_role").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  resultCode: text("result_code"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GroupBuyRefund = typeof groupBuyRefundsTable.$inferSelect;
export type NewGroupBuyRefund = typeof groupBuyRefundsTable.$inferInsert;
export type GroupBuyRefundAttempt = typeof groupBuyRefundAttemptsTable.$inferSelect;
export type NewGroupBuyRefundAttempt = typeof groupBuyRefundAttemptsTable.$inferInsert;
import { pgTable, text, timestamp, serial, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accountsTable } from "./accounts";
import { groupBuyRefundsTable } from "./group_buy_refunds";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // positive = credits added, negative = credits deducted
  reason: text("reason").notNull(),
  orderId: text("order_id"), // optional link to the order being refunded
  refundId: text("refund_id").references(() => groupBuyRefundsTable.id, { onDelete: "set null" }),
  adminUsername: text("admin_username"), // null for system-generated transactions
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("credit_transactions_account_refund_unique")
    .on(t.accountUsername, t.refundId)
    .where(sql`${t.refundId} is not null`),
]);

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type NewCreditTransaction = typeof creditTransactionsTable.$inferInsert;

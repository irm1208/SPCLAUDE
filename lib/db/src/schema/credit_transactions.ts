import { pgTable, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  amount: integer("amount").notNull(), // positive = credits added, negative = credits deducted (in pence/cents)
  reason: text("reason").notNull(),
  orderId: text("order_id"), // optional link to the order being refunded
  adminUsername: text("admin_username"), // null for system-generated transactions
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type NewCreditTransaction = typeof creditTransactionsTable.$inferInsert;

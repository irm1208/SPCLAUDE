import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const gbTestingContributionsTable = pgTable("gb_testing_contributions", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  orderId: text("order_id").notNull(),
  gbId: text("gb_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("crypto"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GbTestingContribution = typeof gbTestingContributionsTable.$inferSelect;
export type NewGbTestingContribution = typeof gbTestingContributionsTable.$inferInsert;

import { pgTable, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const wholesaleAccessRequestsTable = pgTable("wholesale_access_requests", {
  id: serial("id").primaryKey(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  amountUsd: integer("amount_usd").notNull(),
  status: text("status").notNull().default("pending"),
  paymentTxHash: text("payment_tx_hash"),
  paymentCryptoNetwork: text("payment_crypto_network"),
  paymentCryptoCurrency: text("payment_crypto_currency"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  adminUsername: text("admin_username"),
  rejectionReason: text("rejection_reason"),
});

export type WholesaleAccessRequest = typeof wholesaleAccessRequestsTable.$inferSelect;
export type NewWholesaleAccessRequest = typeof wholesaleAccessRequestsTable.$inferInsert;

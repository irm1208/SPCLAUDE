import { pgTable, text, integer, numeric, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { groupBuysTable } from "./group_buys";
import { ordersTable } from "./orders";

export type CoaRail = { currency: string; network: string; walletAddress: string };
export type CoaPayment = CoaRail & { amount: number; quotedAt?: string };
export type CoaCertificate = { key: string; size: number; attachedAt: string; attachedBy: string };
export const groupBuyCoaSettingsTable = pgTable("group_buy_coa_settings", {
  groupBuyId: text("group_buy_id").primaryKey().references(() => groupBuysTable.id, { onDelete: "restrict" }),
  mode: text("mode").notNull().default("disabled"),
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  cap: integer("cap").notNull().default(1),
  rails: jsonb("rails").$type<CoaRail[]>().notNull().default([]),
  manualInstructions: text("manual_instructions").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
/** One durable record per order. Unpaid release never deletes payment history. */
export const groupBuyCoaRequestsTable = pgTable("group_buy_coa_requests", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "restrict" }),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  source: text("source").notNull(),
  status: text("status").notNull(),
  client: text("client").notNull().default(""),
  sample: text("sample").notNull().default(""),
  manufacturer: text("manufacturer").notNull().default(""),
  batch: text("batch").notNull().default(""),
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  rails: jsonb("rails").$type<CoaRail[]>().notNull(),
  manualInstructions: text("manual_instructions").notNull().default(""),
  payment: jsonb("payment").$type<CoaPayment>(),
  txHash: text("tx_hash"),
  reference: text("reference"),
  verificationMessage: text("verification_message"),
  internalNotes: text("internal_notes").notNull().default(""),
  confirmedBy: text("confirmed_by"),
  confirmationNote: text("confirmation_note"),
  certificate: jsonb("certificate").$type<CoaCertificate>(),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("group_buy_coa_order_unique").on(t.orderId),
  index("group_buy_coa_group_idx").on(t.groupBuyId),
]);

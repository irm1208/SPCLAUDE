import { pgTable, text, integer, jsonb, timestamp, unique, index } from "drizzle-orm/pg-core";
import { groupBuysTable } from "./group_buys";
import { ordersTable } from "./orders";

/** Plain unique constraints are intentionally publish-safe (no expression indexes). */
export const gbSupplierSettingsTable = pgTable("gb_supplier_settings", {
  groupBuyId: text("group_buy_id").primaryKey().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull(), version: integer("version").notNull().default(0),
  readiness: jsonb("readiness").notNull().default({}),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
});
export const gbSupplierBatchesTable = pgTable("gb_supplier_batches", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(), reference: text("reference").notNull(),
  previewToken: text("preview_token").notNull(), snapshot: jsonb("snapshot").notNull(),
  state: text("state").notNull().default("prepared"), createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  orderedAt: timestamp("ordered_at", { withTimezone: true }), orderedBy: text("ordered_by"),
  releasedAt: timestamp("released_at", { withTimezone: true }), releaseReason: text("release_reason"),
}, t => [unique("gb_supplier_sequence_unique").on(t.groupBuyId, t.sequence), unique("gb_supplier_preview_unique").on(t.groupBuyId, t.previewToken)]);
export const gbSupplierAllocationsTable = pgTable("gb_supplier_allocations", {
  orderId: text("order_id").primaryKey().references(() => ordersTable.id, { onDelete: "restrict" }),
  batchId: text("batch_id").notNull().references(() => gbSupplierBatchesTable.id, { onDelete: "restrict" }),
}, t => [index("gb_supplier_allocation_batch_idx").on(t.batchId)]);
export const gbSupplierEligibilityTable = pgTable("gb_supplier_eligibility", {
  orderId: text("order_id").primaryKey().references(() => ordersTable.id, { onDelete: "cascade" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), reviewedBy: text("reviewed_by"),
  firstEligibleAt: timestamp("first_eligible_at", { withTimezone: true }),
  orderingAt: timestamp("ordering_at", { withTimezone: true }),
});
export const gbSupplierEventsTable = pgTable("gb_supplier_events", {
  id: text("id").primaryKey(), groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), detail: jsonb("detail").notNull(),
  recipient: text("recipient"), telegram: text("telegram").notNull().default("disabled"),
  attempts: integer("attempts").notNull().default(0), lastError: text("last_error"),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("gb_supplier_event_group_idx").on(t.groupBuyId)]);

import { pgTable, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { groupBuysTable } from "./group_buys";
import { ordersTable } from "./orders";

export const groupBuyOrderRevisionSettingsTable = pgTable("group_buy_order_revision_settings", {
  groupBuyId: text("group_buy_id").primaryKey().references(() => groupBuysTable.id, { onDelete: "restrict" }),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type OrderRevisionSnapshot = {
  items: Array<{ id: string; productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
  grandTotal: string; productSubtotal: string; adminFee: string;
};
export const groupBuyOrderRevisionsTable = pgTable("group_buy_order_revisions", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "restrict" }),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
  createdBy: text("created_by").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  snapshotHash: text("snapshot_hash").notNull(),
  before: jsonb("before").$type<OrderRevisionSnapshot>().notNull(),
  proposal: jsonb("proposal").$type<OrderRevisionSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}, t => [
  index("gb_order_revision_group_idx").on(t.groupBuyId, t.createdAt),
  index("gb_order_revision_order_idx").on(t.orderId, t.status),
]);

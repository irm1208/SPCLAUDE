import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const inventoryTurnoverLogTable = pgTable("inventory_turnover_log", {
  id: serial("id").primaryKey(),
  qiyunleCode: text("qiyunle_code").notNull(),
  productId: text("product_id"),
  productName: text("product_name"),
  wentOosAt: timestamp("went_oos_at", { withTimezone: true }).notNull(),
  restockedAt: timestamp("restocked_at", { withTimezone: true }),
  turnaroundDays: numeric("turnaround_days", { precision: 8, scale: 2 }),
  prevStock: integer("prev_stock"),
  restockedTo: integer("restocked_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryTurnoverLog = typeof inventoryTurnoverLogTable.$inferSelect;
export type NewInventoryTurnoverLog = typeof inventoryTurnoverLogTable.$inferInsert;

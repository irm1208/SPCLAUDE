import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { ordersTable } from "./orders";

export const hiddenOrdersTable = pgTable("hidden_orders", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username")
    .notNull()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("hidden_orders_username_order_uniq").on(t.telegramUsername, t.orderId),
]);

export type HiddenOrder = typeof hiddenOrdersTable.$inferSelect;
export type NewHiddenOrder = typeof hiddenOrdersTable.$inferInsert;

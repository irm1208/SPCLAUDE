import { pgTable, text, timestamp, jsonb, serial } from "drizzle-orm/pg-core";

/**
 * Audit trail for order routing decisions.
 * Created whenever admin changes routing_type, reshipperUsername, or countryLegId.
 */
export const routingHistoryTable = pgTable("routing_history", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(), // references ordersTable.id (no FK to avoid circular dep)
  changedBy: text("changed_by").notNull(), // admin username or 'system' | 'bulk'
  fromRoutingType: text("from_routing_type"), // previous routing_type value
  toRoutingType: text("to_routing_type"),     // new routing_type value
  fromReshipperUsername: text("from_reshipper_username"),
  toReshipperUsername: text("to_reshipper_username"),
  fromCountryLegId: text("from_country_leg_id"),
  toCountryLegId: text("to_country_leg_id"),
  reason: text("reason"), // optional admin note
  metadata: jsonb("metadata"), // extra context (e.g. bulk operation ID)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoutingHistory = typeof routingHistoryTable.$inferSelect;
export type NewRoutingHistory = typeof routingHistoryTable.$inferInsert;

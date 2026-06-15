import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const customerActivityLogsTable = pgTable("customer_activity_logs", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "restrict", onUpdate: "cascade" }),
  eventCategory: text("event_category").notNull(),
  eventType: text("event_type").notNull(),
  entityId: text("entity_id"),
  actorUsername: text("actor_username"),
  actorType: text("actor_type").notNull().default("customer"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("customer_activity_logs_username_created_idx").on(t.telegramUsername, t.createdAt),
  index("customer_activity_logs_event_type_idx").on(t.eventType),
]);

export type CustomerActivityLog = typeof customerActivityLogsTable.$inferSelect;
export type NewCustomerActivityLog = typeof customerActivityLogsTable.$inferInsert;

export const healthInsightLogsTable = pgTable("health_insight_logs", {
  id: text("id").primaryKey(),
  telegramUsername: text("telegram_username").notNull(),
  logType: text("log_type").notNull(),
  loggedDate: text("logged_date"),
  value: text("value"),
  unit: text("unit"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type HealthInsightLog = typeof healthInsightLogsTable.$inferSelect;
export type NewHealthInsightLog = typeof healthInsightLogsTable.$inferInsert;

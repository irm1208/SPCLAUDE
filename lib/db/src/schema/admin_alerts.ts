import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const adminAlertsTable = pgTable("admin_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  priority: text("priority").notNull().default("medium"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  linkUrl: text("link_url"),
  relatedEntityId: text("related_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminAlert = typeof adminAlertsTable.$inferSelect;

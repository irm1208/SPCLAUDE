import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const scheduledAnnouncementsTable = pgTable("scheduled_announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  groupBuyId: text("group_buy_id"),
  sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: text("recipient_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScheduledAnnouncement = typeof scheduledAnnouncementsTable.$inferSelect;

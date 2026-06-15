import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const telegramMessageLogsTable = pgTable("telegram_message_logs", {
  id: serial("id").primaryKey(),
  recipientType: text("recipient_type").notNull(),
  recipientUsername: text("recipient_username"),
  recipientChatId: text("recipient_chat_id").notNull(),
  messageText: text("message_text").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  delivered: boolean("delivered").notNull(),
  errorMessage: text("error_message"),
});

export type TelegramMessageLog = typeof telegramMessageLogsTable.$inferSelect;
export type NewTelegramMessageLog = typeof telegramMessageLogsTable.$inferInsert;

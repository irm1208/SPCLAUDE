import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("feedback"),
  message: text("message").notNull(),
  telegramUsername: text("telegram_username"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

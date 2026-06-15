import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accountsTable } from "./accounts";

export const btConversationsTable = pgTable("bt_conversations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramUsername: text("telegram_username")
    .notNull()
    .references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  messagesJson: text("messages_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

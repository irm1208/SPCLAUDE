import { pgTable, serial, bigint, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { wholesaleSharesTable } from "./wholesale_shares";

// Maps an outbound "shared order chat" Telegram notification (its message_id in a
// specific chat) back to the wholesale share it belongs to, so that when a member
// REPLIES to that Telegram message the reply can be routed into the in-app chat.
// Mirrors ticket_telegram_messages. A (telegram_message_id, chat_id) pair is unique
// within Telegram, so it must route to exactly one share.
export const wholesaleChatTelegramMessagesTable = pgTable("wholesale_chat_telegram_messages", {
  id: serial("id").primaryKey(),
  telegramMessageId: bigint("telegram_message_id", { mode: "number" }).notNull(),
  chatId: text("chat_id").notNull(),
  shareId: text("share_id").notNull().references(() => wholesaleSharesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("wctm_tg_msg_chat_unique").on(t.telegramMessageId, t.chatId),
  index("wctm_share_id_idx").on(t.shareId),
]);

export type WholesaleChatTelegramMessage = typeof wholesaleChatTelegramMessagesTable.$inferSelect;

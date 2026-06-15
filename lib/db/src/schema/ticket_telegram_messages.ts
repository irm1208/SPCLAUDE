import { pgTable, serial, bigint, text, timestamp, index } from "drizzle-orm/pg-core";
import { ticketsTable } from "./tickets";

export const ticketTelegramMessagesTable = pgTable("ticket_telegram_messages", {
  id: serial("id").primaryKey(),
  telegramMessageId: bigint("telegram_message_id", { mode: "number" }).notNull(),
  chatId: text("chat_id").notNull(),
  ticketId: text("ticket_id").notNull().references(() => ticketsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ttm_tg_msg_chat_idx").on(t.telegramMessageId, t.chatId),
  index("ttm_ticket_id_idx").on(t.ticketId),
]);

export type TicketTelegramMessage = typeof ticketTelegramMessagesTable.$inferSelect;

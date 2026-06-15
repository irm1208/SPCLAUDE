import { pgTable, text, timestamp, index, serial, boolean } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export const TICKET_CATEGORIES = [
  "order_issue",
  "general_support",
  "group_buy",
  "wholesale",
  "testing_pool",
] as const;
export type TicketCategory = typeof TICKET_CATEGORIES[number];

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_AUTHOR_ROLES = ["customer", "admin"] as const;
export type TicketAuthorRole = typeof TICKET_AUTHOR_ROLES[number];

export const ticketsTable = pgTable("tickets", {
  id: text("id").primaryKey(),
  accountUsername: text("account_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  category: text("category").$type<TicketCategory>().notNull(),
  subject: text("subject").notNull(),
  status: text("status").$type<TicketStatus>().notNull().default("open"),
  customerUnread: boolean("customer_unread").notNull().default(false),
  groupBuyId: text("group_buy_id"),
  issueType: text("issue_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("tickets_account_username_idx").on(t.accountUsername),
  index("tickets_status_idx").on(t.status),
  index("tickets_created_at_idx").on(t.createdAt),
]);

export const ticketMessagesTable = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => ticketsTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").$type<TicketAuthorRole>().notNull(),
  authorUsername: text("author_username").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ticket_messages_ticket_id_idx").on(t.ticketId),
]);

export type Ticket = typeof ticketsTable.$inferSelect;
export type NewTicket = typeof ticketsTable.$inferInsert;
export type TicketMessage = typeof ticketMessagesTable.$inferSelect;
export type NewTicketMessage = typeof ticketMessagesTable.$inferInsert;

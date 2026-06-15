import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  telegramUsername: text("telegram_username").primaryKey(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  accountStatus: text("account_status").notNull().default("active"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Customer = typeof customersTable.$inferSelect;

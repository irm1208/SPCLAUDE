import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

/** Dedicated vendor identities; deliberately no foreign key to member accounts. */
export const vendorAccountsTable = pgTable("vendor_accounts", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  vendorId: text("vendor_id"),
  status: text("status").notNull().default("pending"),
  companyName: text("company_name").notNull().default(""),
  contactName: text("contact_name").notNull().default(""),
  email: text("email"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("vendor_accounts_vendor_id_idx").on(t.vendorId)]);

export const vendorSessionsTable = pgTable("vendor_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username").notNull().references(() => vendorAccountsTable.username, { onDelete: "cascade", onUpdate: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("vendor_sessions_username_idx").on(t.username), index("vendor_sessions_expires_at_idx").on(t.expiresAt)]);

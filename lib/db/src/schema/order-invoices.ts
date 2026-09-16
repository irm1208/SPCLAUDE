import { jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const orderInvoicesTable = pgTable("order_invoices", {
  orderId: text("order_id").primaryKey().references(() => ordersTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date"),
  currency: text("currency").notNull().default("GBP"),
  status: text("status").notNull().default("draft"),
  seller: jsonb("seller").notNull().$type<Record<string, unknown>>(),
  customer: jsonb("customer").notNull().$type<Record<string, unknown>>(),
  lineItems: jsonb("line_items").notNull().$type<Array<Record<string, string>>>(),
  notes: text("notes").notNull().default(""),
  terms: text("terms").notNull().default(""),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OrderInvoice = typeof orderInvoicesTable.$inferSelect;
export type InsertOrderInvoice = typeof orderInvoicesTable.$inferInsert;

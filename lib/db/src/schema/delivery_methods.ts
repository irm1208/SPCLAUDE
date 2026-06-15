import { pgTable, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Delivery methods - each has a price shown to the customer when selected
// Manage these by re-running the seed script or syncing from Google Sheets
export const deliveryMethodsTable = pgTable("delivery_methods", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order"),
  infoEnabled: boolean("info_enabled").notNull().default(false),
  infoText: text("info_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliveryMethodSchema = createInsertSchema(deliveryMethodsTable).omit({ createdAt: true, updatedAt: true });
export type InsertDeliveryMethod = z.infer<typeof insertDeliveryMethodSchema>;
export type DeliveryMethod = typeof deliveryMethodsTable.$inferSelect;

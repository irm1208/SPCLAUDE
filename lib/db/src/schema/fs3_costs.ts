import { pgTable, text, numeric, serial, timestamp } from "drizzle-orm/pg-core";

export const fs3CostsTable = pgTable("fs3_costs", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull().unique(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Fs3Cost = typeof fs3CostsTable.$inferSelect;

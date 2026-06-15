import { pgTable, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Postage options - can be managed via Google Sheets sync
export const postageTable = pgTable("postage", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPostageSchema = createInsertSchema(postageTable).omit({ createdAt: true, updatedAt: true });
export type InsertPostage = z.infer<typeof insertPostageSchema>;
export type Postage = typeof postageTable.$inferSelect;

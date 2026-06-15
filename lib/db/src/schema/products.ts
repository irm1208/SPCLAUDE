import { pgTable, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Products catalog - can be managed via Google Sheets sync.
// sourceGroupBuyId: if set, this product was imported for a specific GB only (not shown globally).
// vendor: the supplier/vendor for this product (required, e.g. "Uther").
export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull().default("Uther"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  category: text("category"),
  sortOrder: integer("sort_order"),
  sourceGroupBuyId: text("source_group_buy_id"),
  organiserId: text("organiser_id"), // FK to accounts.telegram_username — scopes product to organiser
  mgSize: text("mg_size"),
  unitCount: text("unit_count"),
  wholesaleEnabled: boolean("wholesale_enabled").notNull().default(true),
  wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 }),
  halfKitEnabled: boolean("half_kit_enabled").notNull().default(true),
  stock: integer("stock"),
  lowStockThreshold: integer("low_stock_threshold"),
  weightGrams: integer("weight_grams"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

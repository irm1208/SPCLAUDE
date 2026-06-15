import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

/**
 * Box sizes available for quoting. The server picks the smallest box where
 * total qty <= maxQuantity. Admins manage these via the Shipping tab.
 */
export const packageSizesTable = pgTable("package_sizes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lengthCm: integer("length_cm").notNull(),
  widthCm: integer("width_cm").notNull(),
  heightCm: integer("height_cm").notNull(),
  maxQuantity: integer("max_quantity").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type PackageSize = typeof packageSizesTable.$inferSelect;

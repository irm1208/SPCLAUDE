import { pgTable, text, integer, numeric, boolean } from "drizzle-orm/pg-core";

export const intlParcelSizesTable = pgTable("intl_parcel_sizes", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id"),
  name: text("name").notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  lengthCm: integer("length_cm").notNull(),
  widthCm: integer("width_cm").notNull(),
  heightCm: integer("height_cm").notNull(),
  qtyLabel: text("qty_label"),
  notes: text("notes"),
  maxKitsPerPackage: integer("max_kits_per_package"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const intlShippingRatesTable = pgTable("intl_shipping_rates", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id"),
  parcelSizeId: text("parcel_size_id").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  carrier: text("carrier").notNull(),
  priceGbp: numeric("price_gbp", { precision: 8, scale: 2 }).notNull(),
  priceUsd: numeric("price_usd", { precision: 8, scale: 2 }).notNull(),
  priceEur: numeric("price_eur", { precision: 8, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type IntlParcelSize = typeof intlParcelSizesTable.$inferSelect;
export type IntlShippingRate = typeof intlShippingRatesTable.$inferSelect;

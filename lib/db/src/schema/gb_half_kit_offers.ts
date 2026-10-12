import { pgTable, text, numeric, boolean, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { groupBuysTable } from "./group_buys";
import { productsTable } from "./products";
import { ordersTable } from "./orders";

export const gbHalfKitOffersTable = pgTable("gb_half_kit_offers", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id),
  productId: text("product_id").notNull().references(() => productsTable.id),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  vendorShippingCharge: numeric("vendor_shipping_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull(),
  published: boolean("published").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("gb_half_kit_offer_product_unique").on(t.groupBuyId, t.productId)]);

export const gbHalfKitClaimsTable = pgTable("gb_half_kit_claims", {
  id: text("id").primaryKey(),
  offerId: text("offer_id").notNull().references(() => gbHalfKitOffersTable.id),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id),
  orderId: text("order_id").notNull().references(() => ordersTable.id),
  // History survives a released line's deletion.
  lineItemId: text("line_item_id").notNull(),
  requestId: text("request_id").notNull(),
  offerVersion: integer("offer_version").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  username: text("username").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).notNull(),
  vendorShippingCharge: numeric("vendor_shipping_charge", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  creditsUsd: numeric("credits_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  creditsUsed: numeric("credits_used", { precision: 10, scale: 2 }).notNull().default("0"),
  cashDue: numeric("cash_due", { precision: 10, scale: 2 }).notNull(),
  state: text("state").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releasedBy: text("released_by"),
}, t => [
  unique("gb_half_kit_claim_request_unique").on(t.requestId),
  unique("gb_half_kit_claim_line_unique").on(t.lineItemId),
  unique("gb_half_kit_claim_offer_version_unique").on(t.offerId, t.offerVersion),
  index("gb_half_kit_claim_order_idx").on(t.orderId),
  index("gb_half_kit_claim_group_idx").on(t.groupBuyId),
]);

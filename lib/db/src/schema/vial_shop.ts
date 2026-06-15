import { pgTable, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const vialVendorsTable = pgTable("vial_vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  contactTelegram: text("contact_telegram"),
  telegramChatId: text("telegram_chat_id"),
  logoUrl: text("logo_url"),
  shipsTo: text("ships_to"),
  country: text("country"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  sellerPasswordHash: text("seller_password_hash"),
  walletAddress: text("wallet_address"),
  revolutLink: text("revolut_link"),
  paypalLink: text("paypal_link"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order"),
  resetCode: text("reset_code"),
  resetCodeExpiresAt: timestamp("reset_code_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vialProductsTable = pgTable("vial_products", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  mgSize: text("mg_size"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USDT"),
  stock: integer("stock").notNull().default(0),
  manufacturer: text("manufacturer"),
  batchNumber: text("batch_number"),
  labReportUrl: text("lab_report_url"),
  imageUrl: text("image_url"),
  weightGrams: integer("weight_grams"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const vialDiscountCodesTable = pgTable("vial_discount_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vialOrdersTable = pgTable("vial_orders", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  telegramUsername: text("telegram_username").notNull(),
  shippingName: text("shipping_name"),
  shippingAddress: text("shipping_address"),
  email: text("email"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  discountCodeId: text("discount_code_id"),
  discountCodeUsed: text("discount_code_used"),
  orderStatus: text("order_status").notNull().default("accepted"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentTxHash: text("payment_tx_hash"),
  walletAddress: text("wallet_address"),
  adminNotes: text("admin_notes"),
  shippingCountry: text("shipping_country"),
  shippingCity: text("shipping_city"),
  shippingPostcode: text("shipping_postcode"),
  shippingPrice: numeric("shipping_price", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingCarrier: text("shipping_carrier"),
  shippingService: text("shipping_service"),
  carrierServiceRef: text("carrier_service_ref"),
  quotedWeightGrams: integer("quoted_weight_grams"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vialOrderItemsTable = pgTable("vial_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const vialManufacturersTable = pgTable("vial_manufacturers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country"),
  website: text("website"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VialVendor = typeof vialVendorsTable.$inferSelect;
export type VialProduct = typeof vialProductsTable.$inferSelect;
export type VialDiscountCode = typeof vialDiscountCodesTable.$inferSelect;
export type VialOrder = typeof vialOrdersTable.$inferSelect;
export type VialOrderItem = typeof vialOrderItemsTable.$inferSelect;
export type VialManufacturer = typeof vialManufacturersTable.$inferSelect;

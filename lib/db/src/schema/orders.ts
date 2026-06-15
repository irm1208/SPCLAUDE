import { pgTable, text, numeric, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gbCountryLegsTable } from "./group_buys";

// Order statuses — configurable here
// Editable statuses: "Draft", "Submitted"
// Non-editable: "Processing", "Shipped", "Completed", "Cancelled"
export const ORDER_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

// Orders editable by customers while in these statuses
export const EDITABLE_STATUSES: OrderStatus[] = ["Draft", "Submitted"];

// Order headers — one row per order
export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  telegramUsername: text("telegram_username").notNull(),

  deliveryMethod: text("delivery_method").notNull(),
  deliveryMethodId: text("delivery_method_id").notNull().default(""),
  deliveryPrice: numeric("delivery_price", { precision: 10, scale: 2 }).notNull().default("0"),
  vendorShipping: numeric("vendor_shipping", { precision: 10, scale: 2 }).notNull().default("0"),
  productSubtotal: numeric("product_subtotal", { precision: 10, scale: 2 }).notNull(),
  tip: numeric("tip", { precision: 10, scale: 2 }).notNull().default("0"),
  grandTotal: numeric("grand_total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("Submitted"),
  adminNotes: text("admin_notes"),
  adminMessage: text("admin_message"),
  trackingNumber: text("tracking_number"),
  trackingNumbers: jsonb("tracking_numbers").$type<string[]>(),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentTxHash: text("payment_tx_hash"),
  paymentTxHashes: jsonb("payment_tx_hashes").$type<string[]>(),
  paymentTestAmount: numeric("payment_test_amount", { precision: 10, scale: 2 }),
  testPaymentTxHash: text("test_payment_tx_hash"),
  shippingName: text("shipping_name"),
  shippingPhone: text("shipping_phone"),
  shippingEmail: text("shipping_email"),
  shippingAddress: text("shipping_address"),
  pin: text("pin").notNull().default("0000"),
  inpostQrCode: text("inpost_qr_code"),
  royalMailQrCode: text("royal_mail_qr_code"),
  qrPosted: boolean("qr_posted").notNull().default(false),
  qrCodes: jsonb("qr_codes").$type<Record<string, string>>(),
  groupBuyId: text("group_buy_id"),
  testingContribution: numeric("testing_contribution", { precision: 10, scale: 2 }).notNull().default("0"),
  testVote: text("test_vote"),
  refundStatus: text("refund_status"),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }),
  paymentRejectionReason: text("payment_rejection_reason"),
  paymentScreenshot: text("payment_screenshot"),
  paymentUsdAmount: numeric("payment_usd_amount", { precision: 10, scale: 2 }),
  shippingCountry: text("shipping_country"),
  countryLegId: text("country_leg_id").references(() => gbCountryLegsTable.id, { onDelete: "set null" }), // nullable — set for orders in country-legs-enabled GBs
  reshipperUsername: text("reshipper_username"),
  reshipperCleared: boolean("reshipper_cleared").notNull().default(false), // true = admin explicitly removed reshipper; suppresses gbReshippers fallback
  shippingCity: text("shipping_city"),
  ipAddress: text("ip_address"),
  shippingPostcode: text("shipping_postcode"),
  shippingCarrier: text("shipping_carrier"),
  carrierServiceRef: text("carrier_service_ref"),
  quotedWeightGrams: integer("quoted_weight_grams"),
  orderType: text("order_type"),
  couponCode: text("coupon_code"),
  couponDiscount: numeric("coupon_discount", { precision: 10, scale: 2 }).notNull().default("0"),
  adminFee: numeric("admin_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  adminFeeLabel: text("admin_fee_label"),
  creditsApplied: integer("credits_applied").notNull().default(0),
  directShippingRequested: boolean("direct_shipping_requested").notNull().default(false), // customer requested direct home address delivery
  directShippingCost: numeric("direct_shipping_cost", { precision: 10, scale: 2 }), // calculated wholesale shipping cost for direct home delivery
  // Outstanding balance not yet covered by the customer's payment.
  // Incremented when an organiser adds an unpaid charge (e.g. intl shipping marked Unpaid).
  amountDue: numeric("amount_due", { precision: 10, scale: 2 }).notNull().default("0"),
  // Customer-uploaded proof of payment for the outstanding balance (data URL, JPG/PNG).
  balanceScreenshot: text("balance_screenshot"),
  // Outstanding-balance payment tracking (mirrors paymentTxHash / paymentStatus but for the
  // amountDue charge added after initial payment). balanceTxHash is the TX hash for crypto,
  // "anonpay:<id>" for AnonPay, or "fiat:revolut" / "fiat:paypal" for manual rails.
  balanceTxHash: text("balance_tx_hash"),
  balancePaymentStatus: text("balance_payment_status"),
  balanceConfirmedAt: timestamp("balance_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"), // 'admin' | 'customer' | 'leave_gb'
  // ── Routing (Task #11) ─────────────────────────────────────────────────────
  // routingType: 'direct' = ship direct to customer address;
  //              'reshipper' = ship to reshipper hub;
  //              'unrouted' = explicit no-decision (excluded from shipment);
  //              null = legacy order (fall back to directShippingRequested).
  routingType: text("routing_type"),
  legacyMode: boolean("legacy_mode").notNull().default(false),
  batchLocked: boolean("batch_locked").notNull().default(false),
  batchLockedAt: timestamp("batch_locked_at", { withTimezone: true }),
  // Country where the reshipper hub is located (may differ from shippingCountry).
  reshipperHubCountry: text("reshipper_hub_country"),
  // Draft line items saved by auto-save every 30s; cleared when committed
  draftLineItems: jsonb("draft_line_items").$type<{ productName: string; quantity: number; unitPrice: number }[]>(),
  draftLineItemsSavedAt: timestamp("draft_line_items_saved_at", { withTimezone: true }),
  // Set when admin confirms dispatch via the Dispatch & Packing Slips tab
  dispatchConfirmedAt: timestamp("dispatch_confirmed_at", { withTimezone: true }),
  // Reshipper who confirmed dispatch (from the parcel's reshipperUsername)
  dispatchedByReshipper: text("dispatched_by_reshipper"),
  // Set when admin archives the order from the Dispatched Orders tab (soft-archive, not deleted)
  dispatchArchivedAt: timestamp("dispatch_archived_at", { withTimezone: true }),
}, (t) => [
  index("orders_telegram_username_idx").on(t.telegramUsername),
  index("orders_group_buy_id_idx").on(t.groupBuyId),
  index("orders_shipping_country_idx").on(t.shippingCountry),
  index("orders_created_at_idx").on(t.createdAt),
  index("orders_deleted_at_idx").on(t.deletedAt),
]);

export const orderNotesTable = pgTable("order_notes", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderNote = typeof orderNotesTable.$inferSelect;

// ── Order messages (ticket thread) ────────────────────────────
export const orderMessagesTable = pgTable("order_messages", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  senderRole: text("sender_role").notNull(), // "admin" | "customer"
  senderUsername: text("sender_username").notNull(),
  body: text("body").notNull(),
  attachmentData: text("attachment_data"), // base64 data URL, stored in DB (≤10MB)
  attachmentName: text("attachment_name"), // original filename
  attachmentMime: text("attachment_mime"), // e.g. "image/jpeg"
  readByAdmin: boolean("read_by_admin").notNull().default(false),
  readByCustomer: boolean("read_by_customer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("order_messages_order_id_idx").on(t.orderId),
]);

export type OrderMessage = typeof orderMessagesTable.$inferSelect;

// Order line items — one row per product per order
// quantity is numeric to support 0.5 increments
export const orderLineItemsTable = pgTable("order_line_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  isOos: boolean("is_oos").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("order_line_items_order_id_idx").on(t.orderId),
]);

// Rate limiting for failed order lookups
export const lookupAttemptsTable = pgTable("lookup_attempts", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dispatch images uploaded by admin and matched to orders via AI OCR
export const orderDispatchImagesTable = pgTable("order_dispatch_images", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  imageData: text("image_data").notNull(), // base64 data URL (lazy-loaded via dedicated endpoint)
  filename: text("filename").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  ocrOrderCode: text("ocr_order_code"),      // extracted order code from AI OCR
  ocrUsername: text("ocr_username"),          // extracted telegram username from AI OCR
}, (t) => [
  index("order_dispatch_images_order_id_idx").on(t.orderId),
]);

export type OrderDispatchImage = typeof orderDispatchImagesTable.$inferSelect;

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const insertOrderLineItemSchema = createInsertSchema(orderLineItemsTable).omit({ createdAt: true, updatedAt: true });
export type InsertOrderLineItem = z.infer<typeof insertOrderLineItemSchema>;
export type OrderLineItem = typeof orderLineItemsTable.$inferSelect;

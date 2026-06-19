import { pgTable, text, numeric, boolean, integer, timestamp, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { deliveryMethodsTable } from "./delivery_methods";

export const GROUP_BUY_STATUSES = ["draft", "active", "closed", "archived"] as const;
export type GroupBuyStatus = typeof GROUP_BUY_STATUSES[number];

export const groupBuysTable = pgTable("group_buys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  closeDate: timestamp("close_date", { withTimezone: true }),
  invitePin: text("invite_pin"),
  invitePinHash: text("invite_pin_hash"),
  testOrderPin: text("test_order_pin"),
  manufacturer: text("manufacturer"),
  manufacturerCountry: text("manufacturer_country"),
  infoCards: text("info_cards"),
  currency: text("currency").notNull().default("GBP"),
  sortOrder: integer("sort_order"),
  labTestSupplier: text("lab_test_supplier"),
  testingEnabled: boolean("testing_enabled").notNull().default(false),
  vendorShippingEnabled: boolean("vendor_shipping_enabled").notNull().default(false),
  vendorShippingMessage: text("vendor_shipping_message"),
  vendorShippingAmount: numeric("vendor_shipping_amount", { precision: 10, scale: 2 }),
  vendorShippingMode: text("vendor_shipping_mode").notNull().default("equal"),
  vendorShippingEqualPct: integer("vendor_shipping_equal_pct").notNull().default(100),
  vendorShippingKits: integer("vendor_shipping_kits"),
  vendorShippingMaxKitsPerPackage: integer("vendor_shipping_max_kits_per_package"),
  paymentMessageEnabled: boolean("payment_message_enabled").notNull().default(false),
  paymentMessage: text("payment_message"),
  paymentsEnabled: boolean("payments_enabled").notNull().default(true),
  directShippingPaymentsEnabled: boolean("direct_shipping_payments_enabled").notNull().default(true),
  paymentsTestMode: boolean("payments_test_mode").notNull().default(false),
  paymentsTestUsernames: jsonb("payments_test_usernames").$type<string[]>(),
  memberLimit: integer("member_limit"),
  minMembers: integer("min_members"),
  maxKitsPerCustomer: integer("max_kits_per_customer"),
  maxKitsTotal: integer("max_kits_total"),
  minKitsPerPerson: integer("min_kits_per_person"),
  hiddenFromList: boolean("hidden_from_list").notNull().default(false),
  forcedUsernames: jsonb("forced_usernames").$type<string[]>(),
  shippingOptions: text("shipping_options"),
  // GB Organiser ownership — null means admin-owned GB
  organiserId: text("organiser_id"), // FK to accounts.telegram_username (no FK constraint to avoid circular dep)
  approvalStatus: text("approval_status"), // null (admin GB) | "pending_approval" | "approved" | "rejected"
  organiserPayments: jsonb("organiser_payments").$type<{
    usdtWallet?: string;
    revolutHandle?: string;
    paypalHandle?: string;
    cryptoCurrency?: string;
    cryptoNetwork?: string;
    cryptoWalletAddress?: string;
    anonPayEnabled?: boolean;
    anonPayWallet?: string;
    anonPayTicker?: string;
    anonPayNetwork?: string;
  } | null>(), // GB-level payment method overrides
  allowedCountries: jsonb("allowed_countries").$type<string[]>(),
  excludedCountries: jsonb("excluded_countries").$type<string[]>(),
  blockedAccounts: jsonb("blocked_accounts").$type<string[]>(),
  pnlCosts: jsonb("pnl_costs").$type<{
    materials?: number;
    lab?: number;
    shipping?: number;
    misc?: number;
    notes?: string;
  } | null>(), // cost inputs for P&L calculation
  adminFeeEnabled: boolean("admin_fee_enabled").notNull().default(false),
  // "fixed" = a flat currency amount; "percent" = a percentage of the order's product subtotal.
  adminFeeType: text("admin_fee_type").notNull().default("fixed"),
  adminFeeAmount: numeric("admin_fee_amount", { precision: 10, scale: 2 }),
  adminFeeLabel: text("admin_fee_label"),
  adminFeeCountries: text("admin_fee_countries"),
  sharedShippingCountries: text("shared_shipping_countries"),
  allowHalfKits: boolean("allow_half_kits").notNull().default(true),
  // Per-action customer permissions when the parent GB is in status "closed".
  // Default true = current behaviour (everything allowed). Set any to false to
  // block that customer action once the GB is closed. Admin and organiser
  // always retain full edit ability regardless of these flags.
  allowOrderAddons: boolean("allow_order_addons").notNull().default(true),
  allowEditOrderWhenClosed: boolean("allow_edit_order_when_closed").notNull().default(true),
  allowEditAddressWhenClosed: boolean("allow_edit_address_when_closed").notNull().default(true),
  allowDeleteOrderWhenClosed: boolean("allow_delete_order_when_closed").notNull().default(true),
  hidePricesWhenClosed: boolean("hide_prices_when_closed").notNull().default(false),
  hideCostBreakdownWhenClosed: boolean("hide_cost_breakdown_when_closed").notNull().default(false),
  hideGrandTotalWhenClosed: boolean("hide_grand_total_when_closed").notNull().default(false),
  hidePricesOnInvoice: boolean("hide_prices_on_invoice").notNull().default(false),
  hidePricesOnGbViewer: boolean("hide_prices_on_gb_viewer").notNull().default(false),
  hidePricesOnOrderForm: boolean("hide_prices_on_order_form").notNull().default(false),
  hideOrderTotalOnOrderForm: boolean("hide_order_total_on_order_form").notNull().default(false),
  showStockView: boolean("show_stock_view").notNull().default(true),
  qrUploadInpostEnabled: boolean("qr_upload_inpost_enabled").notNull().default(false),
  qrUploadRoyalMailEnabled: boolean("qr_upload_royal_mail_enabled").notNull().default(false),
  qrUploadMessage: text("qr_upload_message"),
  qrUploadCouriers: jsonb("qr_upload_couriers").$type<string[]>(),
  orderPageMessage: text("order_page_message"),
  paymentBanner: text("payment_banner"),
  reshipperInviteCode: text("reshipper_invite_code").unique(),
  countryLegsEnabled: boolean("country_legs_enabled").notNull().default(false),
  allowReshipperCode: boolean("allow_reshipper_code").notNull().default(false),
  allowExtraOrders: boolean("allow_extra_orders").notNull().default(false),
  organiserOrderEditEnabled: boolean("organiser_order_edit_enabled").notNull().default(false),
  organiserCanEditStatus: boolean("organiser_can_edit_status").notNull().default(true),
  organiserCanEditPaymentStatus: boolean("organiser_can_edit_payment_status").notNull().default(true),
  organiserCanEditTracking: boolean("organiser_can_edit_tracking").notNull().default(true),
  organiserCanEditNotes: boolean("organiser_can_edit_notes").notNull().default(true),
  organiserCanEditTxId: boolean("organiser_can_edit_tx_id").notNull().default(false),
  organiserCanEditQuantities: boolean("organiser_can_edit_quantities").notNull().default(false),
  organiserCanMarkOos: boolean("organiser_can_mark_oos").notNull().default(true),
  organiserRules: jsonb("organiser_rules").$type<{ id: string; text: string; enabled: boolean; format: string }[]>(),
  qrViewerUsernames: jsonb("qr_viewer_usernames").$type<string[]>(),
  legViewerAccess: jsonb("leg_viewer_access").$type<{ username: string; legIds: string[] }[]>(),
  directShippingEnabled: boolean("direct_shipping_enabled").notNull().default(false), // admin can allow customers to opt for direct home delivery
  directShippingVendorId: text("direct_shipping_vendor_id"), // wholesale vendor used for dynamic direct-shipping cost calculation
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const groupBuyProductsTable = pgTable("group_buy_products", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  priceOverride: numeric("price_override", { precision: 10, scale: 2 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order"),
}, (t) => [
  unique("group_buy_products_unique").on(t.groupBuyId, t.productId),
]);

export const groupBuyDeliveryMethodsTable = pgTable("group_buy_delivery_methods", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  deliveryMethodId: text("delivery_method_id").notNull().references(() => deliveryMethodsTable.id, { onDelete: "cascade" }),
}, (t) => [
  unique("group_buy_delivery_methods_unique").on(t.groupBuyId, t.deliveryMethodId),
]);

export const insertGroupBuySchema = createInsertSchema(groupBuysTable)
  .omit({ createdAt: true, updatedAt: true })
  .extend({ status: z.enum(GROUP_BUY_STATUSES).optional() } as any);
export type InsertGroupBuy = z.infer<typeof insertGroupBuySchema>;
export type GroupBuy = typeof groupBuysTable.$inferSelect;

// ── gb_country_legs — per-country sub-groups within a GB ────────────────────
// Each leg represents one country's participants within a parent GB.
// When countryLegsEnabled = true on the GB, members select their country on join,
// and optionally must present a country-specific invite code.
export const GB_COUNTRY_LEG_STATUSES = ["active", "closed"] as const;
export type GbCountryLegStatus = typeof GB_COUNTRY_LEG_STATUSES[number];

export const gbCountryLegsTable = pgTable("gb_country_legs", {
  id: text("id").primaryKey(),
  gbId: text("gb_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  countryCode: text("country_code").notNull(), // ISO 3166-1 alpha-2
  countryName: text("country_name").notNull(),
  inviteEnabled: boolean("invite_enabled").notNull().default(false),
  inviteCode: text("invite_code").unique(),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  message: text("message"), // general message shown on this country leg
  countryNote: text("country_note"), // note shown only to members of this country
  vendorShippingCost: numeric("vendor_shipping_cost", { precision: 10, scale: 2 }), // total vendor shipping cost for this leg
  vendorPackageCount: integer("vendor_package_count"), // number of packages/kits going to this country from the vendor
  directShippingEnabled: boolean("direct_shipping_enabled").notNull().default(false), // allow members to request direct home address shipping
  wholesaleVendorId: text("wholesale_vendor_id"), // ID of the wholesale vendor whose shipping table is used for direct shipping cost calculation
  kitCountExcludedOrderIds: jsonb("kit_count_excluded_order_ids").$type<string[]>(), // order IDs excluded from the kit count viewer total
  // ── Routing (Task #11) ─────────────────────────────────────────────────────
  // When true, no new payments are accepted for this leg (e.g. pending reshipper confirmation).
  paymentBlocked: boolean("payment_blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("gb_country_legs_gb_country_unique").on(t.gbId, t.countryCode),
]);

export type GbCountryLeg = typeof gbCountryLegsTable.$inferSelect;
export type NewGbCountryLeg = typeof gbCountryLegsTable.$inferInsert;

export const insertGroupBuyProductSchema = createInsertSchema(groupBuyProductsTable);
export type InsertGroupBuyProduct = z.infer<typeof insertGroupBuyProductSchema>;
export type GroupBuyProduct = typeof groupBuyProductsTable.$inferSelect;

export const insertGroupBuyDeliveryMethodSchema = createInsertSchema(groupBuyDeliveryMethodsTable);
export type InsertGroupBuyDeliveryMethod = z.infer<typeof insertGroupBuyDeliveryMethodSchema>;
export type GroupBuyDeliveryMethod = typeof groupBuyDeliveryMethodsTable.$inferSelect;

// ── Parcel statuses ───────────────────────────────────────────
export const GB_PARCEL_STATUSES = ["pending", "in_transit", "out_for_delivery", "attempted", "delivered", "exception", "expired"] as const;
export type GbParcelStatus = typeof GB_PARCEL_STATUSES[number];

export type ParcelItem = { name: string; qty: number; productId?: string };
export type ParcelEvent = { date: string; status: string; location: string };

// ── gb_parcels ────────────────────────────────────────────────
export const gbParcelsTable = pgTable("gb_parcels", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  reshipperUsername: text("reshipper_username"),
  label: text("label").notNull(),
  carrier: text("carrier").notNull().default("Auto"),
  trackingNumber: text("tracking_number").notNull(),
  status: text("status").notNull().default("pending"),
  statusCode: integer("status_code").default(0),
  items: jsonb("items").$type<ParcelItem[]>().notNull().default([]),
  cachedEvents: jsonb("cached_events").$type<ParcelEvent[]>().notNull().default([]),
  notes: text("notes"),
  trackingUrl: text("tracking_url"),
  trackingParams: jsonb("tracking_params").$type<Record<string, string>>(),
  lastChecked: timestamp("last_checked", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GbParcel = typeof gbParcelsTable.$inferSelect;
export type NewGbParcel = typeof gbParcelsTable.$inferInsert;

// ── gb_parcel_optins ──────────────────────────────────────────
// Tracks per-member opt-in to tracking update notifications for a specific parcel.
// Keyed by parcel ID + telegram chat ID.
export const gbParcelOptinsTable = pgTable("gb_parcel_optins", {
  id: text("id").primaryKey(),
  parcelId: text("parcel_id").notNull().references(() => gbParcelsTable.id, { onDelete: "cascade" }),
  telegramChatId: text("telegram_chat_id").notNull(),
  telegramUsername: text("telegram_username"),
  optedIn: boolean("opted_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("gb_parcel_optins_unique").on(t.parcelId, t.telegramChatId),
]);

export type GbParcelOptin = typeof gbParcelOptinsTable.$inferSelect;

// ── custom_couriers ───────────────────────────────────────────
export const customCouriersTable = pgTable("custom_couriers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  trackingUrlTemplate: text("tracking_url_template"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CustomCourier = typeof customCouriersTable.$inferSelect;
export type NewCustomCourier = typeof customCouriersTable.$inferInsert;

// ── gb_testing_rounds ─────────────────────────────────────────
// One testing round per group buy (at most one active at a time).
// Tracks the opt-in contribution amount, voting status and results.
export const GB_TESTING_ROUND_STATUSES = ["active", "closed", "sent_to_lab", "results_received"] as const;
export type GbTestingRoundStatus = typeof GB_TESTING_ROUND_STATUSES[number];

export const gbTestingRoundsTable = pgTable("gb_testing_rounds", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  contributionAmount: numeric("contribution_amount", { precision: 10, scale: 2 }).notNull().default("15"),
  anyContribution: boolean("any_contribution").notNull().default(false),
  lateOptInEnabled: boolean("late_opt_in_enabled").notNull().default(false),
  lateOptInPaymentMethods: jsonb("late_opt_in_payment_methods").$type<string[]>(),
  optInThresholdPct: integer("opt_in_threshold_pct"),
  maxCompoundVotes: integer("max_compound_votes").notNull().default(1),
  maxTestVotes: integer("max_test_votes").notNull().default(1),
  janoshikPaymentUrl: text("janoshik_payment_url"),
  status: text("status").notNull().default("active"),
  labShippingCost: numeric("lab_shipping_cost", { precision: 10, scale: 2 }),
  voteOptions: jsonb("vote_options").$type<string[]>(),
  peptideBatches: jsonb("peptide_batches").$type<Record<string, string>>(),
  testOptions: jsonb("test_options").$type<string[]>(),
  resultNotes: text("result_notes"),
  resultPdfUrl: text("result_pdf_url"),
  resultPostedAt: timestamp("result_posted_at", { withTimezone: true }),
  fundingNote: text("funding_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GbTestingRound = typeof gbTestingRoundsTable.$inferSelect;
export type NewGbTestingRound = typeof gbTestingRoundsTable.$inferInsert;

// ── gb_testing_votes ──────────────────────────────────────────
// One vote per order per round. Voters choose a peptide and vial count.
export const gbTestingVotesTable = pgTable("gb_testing_votes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  roundId: text("round_id").notNull().references(() => gbTestingRoundsTable.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull(),
  gbId: text("gb_id").notNull(),
  peptideName: text("peptide_name").notNull(),
  peptideNames: jsonb("peptide_names").$type<string[]>(),
  vialCount: integer("vial_count").notNull().default(1),
  testSelections: jsonb("test_selections").$type<string[]>().notNull().default([]),
  anonymous: boolean("anonymous").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("gb_testing_votes_unique").on(t.roundId, t.orderId),
]);

export type GbTestingVote = typeof gbTestingVotesTable.$inferSelect;
export type NewGbTestingVote = typeof gbTestingVotesTable.$inferInsert;

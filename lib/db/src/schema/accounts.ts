import { pgTable, text, timestamp, unique, index, jsonb, boolean, integer, serial, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { groupBuysTable, gbCountryLegsTable } from "./group_buys";

// Reshipper status values
export const RESHIPPER_STATUSES = ["applied", "approved", "rejected", "suspended"] as const;
export type ReshipperStatus = typeof RESHIPPER_STATUSES[number];

// Organiser status values
export const ORGANISER_STATUSES = ["applied", "approved", "rejected", "suspended"] as const;
export type OrganiserStatus = typeof ORGANISER_STATUSES[number];

// Organiser role values
export const ORGANISER_ROLES = ["standard", "trusted", "senior"] as const;
export type OrganiserRole = typeof ORGANISER_ROLES[number];

export const accountsTable = pgTable("accounts", {
  telegramUsername: text("telegram_username").primaryKey(),
  passwordHash: text("password_hash"),
  email: text("email"),
  accountStatus: text("account_status").notNull().default("active"),
  telegramChatId: text("telegram_chat_id"),
  telegramNotifications: jsonb("telegram_notifications").default({ status: true, deleted: true, payment: true, profile: true, new_order: true }),
  telegramLinkToken: text("telegram_link_token"),
  telegramLinkExpiresAt: timestamp("telegram_link_expires_at", { withTimezone: true }),
  healthDataConsent: boolean("health_data_consent").notNull().default(false),
  discussCount: integer("discuss_count").notNull().default(0),
  discussLimitOverride: integer("discuss_limit_override"),
  resetCode: text("reset_code"),
  resetCodeExpiresAt: timestamp("reset_code_expires_at", { withTimezone: true }),
  // Pool Leader fields (standalone testing pools, separate from GB organiser)
  poolLeaderStatus: text("pool_leader_status"), // null | "applied" | "approved" | "rejected" | "suspended"
  poolLeaderAppliedAt: timestamp("pool_leader_applied_at", { withTimezone: true }),
  poolLeaderApprovedAt: timestamp("pool_leader_approved_at", { withTimezone: true }),
  poolLeaderBio: text("pool_leader_bio"),
  poolLeaderWallet: text("pool_leader_wallet"),
  poolLeaderWalletCurrency: text("pool_leader_wallet_currency"),
  poolLeaderWalletNetwork: text("pool_leader_wallet_network"),
  poolLeaderAnonpayWallet: text("pool_leader_anonpay_email"),
  poolLeaderAnonpayTicker: text("pool_leader_anonpay_ticker"),
  poolLeaderAnonpayNetwork: text("pool_leader_anonpay_network"),
  poolLeaderRevolutHandle: text("pool_leader_revolut_handle"),
  poolLeaderPaypalEmail: text("pool_leader_paypal_email"),
  // GB Organiser fields
  organiserStatus: text("organiser_status"), // null = not applied, "applied", "approved", "rejected", "suspended"
  organiserRole: text("organiser_role").$type<OrganiserRole>(), // null = not set, "standard", "trusted", "senior"
  organiserApprovedAt: timestamp("organiser_approved_at", { withTimezone: true }),
  organiserAllowedVendors: jsonb("organiser_allowed_vendors").$type<string[] | null>(), // null = unrestricted; [] = no vendors allowed; ["Uther","QSC"] = restricted list
  organiserPaymentMethods: jsonb("organiser_payment_methods").$type<{
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
  } | null>(),
  // Reshipper fields
  reshipperStatus: text("reshipper_status"), // null = not applied, "applied", "approved", "rejected", "suspended"
  reshipperApprovedAt: timestamp("reshipper_approved_at", { withTimezone: true }),
  reshipperPaymentMethods: jsonb("reshipper_payment_methods").$type<{
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
  } | null>(),
  // Credits (in smallest currency unit, e.g. pence)
  credits: integer("credits").notNull().default(0),
  // Wholesale account flag
  isWholesale: boolean("is_wholesale").notNull().default(false),
  // Reshipper capability toggles
  reshipperSettings: jsonb("reshipper_settings").$type<{
    acceptingPayments?: boolean;
    acceptingOrders?: boolean;
    visible?: boolean;
  } | null>(),
  country: text("country"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  addressCity: text("address_city"),
  addressPostcode: text("address_postcode"),
  addressPhone: text("address_phone"),
  addressPhonePrefix: text("address_phone_prefix"),
  wholesaleDraft: jsonb("wholesale_draft").$type<Record<string, unknown> | null>(),
  lastLoginIp: text("last_login_ip"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  signupInviteCode: text("signup_invite_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const accountGroupBuysTable = pgTable("account_group_buys", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  countryLegId: text("country_leg_id").references(() => gbCountryLegsTable.id, { onDelete: "set null" }), // nullable — set when joining a GB with country legs enabled
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  allowExtraOrder: boolean("allow_extra_order").notNull().default(false),
}, (t) => [
  unique("account_group_buys_unique").on(t.accountId, t.groupBuyId),
]);

export const gbWaitlistTable = pgTable("gb_waitlist", {
  id: text("id").primaryKey(),
  groupBuyId: text("group_buy_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
}, (t) => [
  unique("gb_waitlist_unique").on(t.groupBuyId, t.accountId),
]);

export type GbWaitlistEntry = typeof gbWaitlistTable.$inferSelect;

// Organiser audit log — records every admin action on an organiser account
export const organiserAuditLogTable = pgTable("organiser_audit_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  adminUsername: text("admin_username").notNull(),
  organiserUsername: text("organiser_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  actionType: text("action_type").notNull(), // "status_change" | "role_change"
  previousValue: text("previous_value"),
  newValue: text("new_value"),
});

export type OrganiserAuditLogEntry = typeof organiserAuditLogTable.$inferSelect;

export const ruleAcceptancesTable = pgTable("rule_acceptances", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  version: integer("version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("rule_acceptances_account_version_unique").on(t.accountId, t.version),
]);

export type RuleAcceptance = typeof ruleAcceptancesTable.$inferSelect;

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;

export const insertAccountGroupBuySchema = createInsertSchema(accountGroupBuysTable);
export type InsertAccountGroupBuy = z.infer<typeof insertAccountGroupBuySchema>;
export type AccountGroupBuy = typeof accountGroupBuysTable.$inferSelect;

// ── gb_reshippers — links an approved reshipper to a specific GB + country ───
export const gbReshippersTable = pgTable("gb_reshippers", {
  id: text("id").primaryKey(),
  gbId: text("gb_id").notNull().references(() => groupBuysTable.id, { onDelete: "cascade" }),
  reshipperUsername: text("reshipper_username").notNull().references(() => accountsTable.telegramUsername, { onDelete: "cascade", onUpdate: "cascade" }),
  country: text("country").notNull(),
  enabledPaymentMethods: jsonb("enabled_payment_methods").$type<{
    usdtEnabled?: boolean;
    revolutEnabled?: boolean;
    paypalEnabled?: boolean;
    cryptoEnabled?: boolean;
    anonPayEnabled?: boolean;
  }>().default({}),
  reshipperPaymentDetails: jsonb("reshipper_payment_details").$type<{
    usdtWallet?: string | null;
    revolutHandle?: string | null;
    paypalHandle?: string | null;
    cryptoCurrency?: string | null;
    cryptoNetwork?: string | null;
    cryptoWalletAddress?: string | null;
    anonPayEnabled?: boolean;
    anonPayWallet?: string | null;
    anonPayTicker?: string | null;
    anonPayNetwork?: string | null;
  } | null>(),
  enabled: boolean("enabled").notNull().default(true),
  paymentTarget: text("payment_target").notNull().default("reshipper"),
  reshipperFeeEnabled: boolean("reshipper_fee_enabled").notNull().default(false),
  reshipperFeeType: text("reshipper_fee_type").notNull().default("fixed"),
  reshipperFeeAmount: numeric("reshipper_fee_amount", { precision: 10, scale: 2 }),
  allowPayments: boolean("allow_payments").notNull().default(false),
  allowVendorShippingSplit: boolean("allow_vendor_shipping_split").notNull().default(false),
  // ── Reshipper invite codes (Task #11) ──────────────────────────────────────
  // reshipperCode: unique alphanumeric code that customers can use to join
  //               this reshipper's group instead of another for the same country.
  reshipperCode: text("reshipper_code").unique(),
  reshipperCodeActive: boolean("reshipper_code_active").notNull().default(true),
  // Maximum number of orders this reshipper slot can handle. null = unlimited.
  codeCapacity: integer("code_capacity"),
  // ── Payment blocking (Task #12) ────────────────────────────────────────────
  // When true, no new payments are accepted for orders routed via this reshipper.
  paymentBlocked: boolean("payment_blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("gb_reshippers_gb_username_unique").on(t.gbId, t.reshipperUsername),
  index("gb_reshippers_reshipper_username_idx").on(t.reshipperUsername),
]);

export type GbReshipper = typeof gbReshippersTable.$inferSelect;
export type NewGbReshipper = typeof gbReshippersTable.$inferInsert;

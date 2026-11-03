import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, index, unique } from "drizzle-orm/pg-core";

/**
 * Testmedaddy: an independent third-party peptide testing platform.
 *
 * Every table carries the `tmd_` prefix and deliberately has NO foreign keys to
 * Salt & Peps or Peps Anonymous tables. Accounts, vendors, pools, payments and
 * results are all self-contained so the product can be split out later.
 */

/* ---- Accounts ------------------------------------------------------------- */
export type TmdNotificationPrefs = { email?: boolean; telegram?: boolean; poolUpdates?: boolean; results?: boolean; chat?: boolean };

export const tmdUsersTable = pgTable("tmd_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarKey: text("avatar_key"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  telegramChatId: text("telegram_chat_id"),
  telegramUsername: text("telegram_username"),
  notificationPrefs: jsonb("notification_prefs").$type<TmdNotificationPrefs>().notNull().default({}),
  /** Default payout methods copied onto each new pool the user hosts. */
  payoutMethods: jsonb("payout_methods").$type<TmdPaymentMethods>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("tmd_users_email_unique").on(t.email), unique("tmd_users_handle_unique").on(t.handle)]);

export const tmdSessionsTable = pgTable("tmd_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => tmdUsersTable.id, { onDelete: "cascade" }),
  remembered: boolean("remembered").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_sessions_user_idx").on(t.userId), index("tmd_sessions_expires_idx").on(t.expiresAt)]);

/** Email verification and password reset tokens. Only the hash is stored. */
export const tmdEmailTokensTable = pgTable("tmd_email_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => tmdUsersTable.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_email_tokens_user_idx").on(t.userId)]);

/* ---- Vendors and batches -------------------------------------------------- */
export const tmdVendorsTable = pgTable("tmd_vendors", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  website: text("website"),
  country: text("country"),
  description: text("description"),
  logoKey: text("logo_key"),
  verified: boolean("verified").notNull().default(false),
  claimedBy: text("claimed_by").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("tmd_vendors_slug_unique").on(t.slug)]);

export const tmdBatchesTable = pgTable("tmd_batches", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => tmdVendorsTable.id, { onDelete: "cascade" }),
  compound: text("compound").notNull(),
  batchNumber: text("batch_number").notNull(),
  mg: text("mg"),
  capColour: text("cap_colour"),
  manufacturedOn: text("manufactured_on"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_batches_vendor_idx").on(t.vendorId), unique("tmd_batches_vendor_compound_batch_unique").on(t.vendorId, t.compound, t.batchNumber)]);

/* ---- Pools ---------------------------------------------------------------- */
export type TmdPaymentMethods = {
  crypto?: { currency: string; network: string; address: string }[];
  anonpay?: { wallet: string; ticker: string; network: string };
  revolut?: { handle: string };
  paypal?: { email: string };
};
export const TMD_POOL_STATUSES = ["draft", "open", "funded", "at_lab", "results", "closed", "cancelled"] as const;
export type TmdPoolStatus = (typeof TMD_POOL_STATUSES)[number];
export const TMD_POOL_VISIBILITY = ["public", "unlisted", "invite"] as const;
export const TMD_RESULTS_VISIBILITY = ["public", "members", "password"] as const;

export const tmdPoolsTable = pgTable("tmd_pools", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  organiserId: text("organiser_id").notNull().references(() => tmdUsersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("public"),
  accessCodeHash: text("access_code_hash"),
  resultsVisibility: text("results_visibility").notNull().default("public"),
  resultsPasswordHash: text("results_password_hash"),
  labName: text("lab_name"),
  splitMode: text("split_mode").notNull().default("even"),
  fixedShareUsd: numeric("fixed_share_usd", { precision: 12, scale: 2 }),
  shippingUsd: numeric("shipping_usd", { precision: 12, scale: 2 }).notNull().default("0"),
  organiserTipUsd: numeric("organiser_tip_usd", { precision: 12, scale: 2 }).notNull().default("0"),
  platformFeePct: numeric("platform_fee_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  targetUsd: numeric("target_usd", { precision: 12, scale: 2 }).notNull().default("0"),
  minMembers: integer("min_members").notNull().default(1),
  maxMembers: integer("max_members"),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  paymentMethods: jsonb("payment_methods").$type<TmdPaymentMethods>().notNull().default({}),
  coverPhotoKey: text("cover_photo_key"),
  telegramChatId: text("telegram_chat_id"),
  telegramChatTitle: text("telegram_chat_title"),
  resultNotes: text("result_notes"),
  resultsPublishedAt: timestamp("results_published_at", { withTimezone: true }),
  fundedAt: timestamp("funded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("tmd_pools_slug_unique").on(t.slug), index("tmd_pools_organiser_idx").on(t.organiserId), index("tmd_pools_status_idx").on(t.status)]);

/** What is being tested in a pool: a batch, a test type, a lab and a price. */
export const tmdPoolItemsTable = pgTable("tmd_pool_items", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  batchId: text("batch_id").references(() => tmdBatchesTable.id, { onDelete: "set null" }),
  testType: text("test_type").notNull(),
  lab: text("lab"),
  priceUsd: numeric("price_usd", { precision: 12, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(1),
  labOrderUrl: text("lab_order_url"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_pool_items_pool_idx").on(t.poolId)]);

export const TMD_PAYMENT_STATUSES = ["pending", "submitted", "verified", "rejected", "refunded"] as const;

export const tmdPoolMembersTable = pgTable("tmd_pool_members", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  guestContact: text("guest_contact"),
  displayName: text("display_name").notNull(),
  anonymous: boolean("anonymous").notNull().default(false),
  amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),
  paymentCurrency: text("payment_currency"),
  paymentNetwork: text("payment_network"),
  paymentAddress: text("payment_address"),
  paymentRef: text("payment_ref"),
  screenshotKey: text("screenshot_key"),
  /** For volatile coins (ETH, SOL, BTC): the coin amount the member was asked to send and the rate used. */
  paymentAmountCrypto: numeric("payment_amount_crypto", { precision: 24, scale: 8 }),
  paymentUsdPerCoin: numeric("payment_usd_per_coin", { precision: 18, scale: 6 }),
  paymentStatus: text("payment_status").notNull().default("pending"),
  claimToken: text("claim_token").notNull(),
  note: text("note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: text("verified_by"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_pool_members_pool_idx").on(t.poolId), index("tmd_pool_members_user_idx").on(t.userId), unique("tmd_pool_members_claim_token_unique").on(t.claimToken), index("tmd_pool_members_status_idx").on(t.paymentStatus)]);

/* ---- Photos, results, messages ------------------------------------------- */
export const tmdPhotosTable = pgTable("tmd_photos", {
  id: text("id").primaryKey(),
  storageKey: text("storage_key").notNull(),
  batchId: text("batch_id").references(() => tmdBatchesTable.id, { onDelete: "cascade" }),
  poolId: text("pool_id").references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").references(() => tmdVendorsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("batch"),
  caption: text("caption"),
  uploadedBy: text("uploaded_by").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_photos_batch_idx").on(t.batchId), index("tmd_photos_pool_idx").on(t.poolId), index("tmd_photos_vendor_idx").on(t.vendorId)]);

export const tmdResultsTable = pgTable("tmd_results", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  poolItemId: text("pool_item_id").references(() => tmdPoolItemsTable.id, { onDelete: "set null" }),
  summary: text("summary"),
  purityPct: numeric("purity_pct", { precision: 6, scale: 3 }),
  quantityMg: numeric("quantity_mg", { precision: 10, scale: 3 }),
  endotoxin: text("endotoxin"),
  sterility: text("sterility"),
  heavyMetals: text("heavy_metals"),
  passed: boolean("passed"),
  reportKey: text("report_key"),
  labVerifyUrl: text("lab_verify_url"),
  postedBy: text("posted_by").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_results_pool_idx").on(t.poolId)]);

export const tmdMessagesTable = pgTable("tmd_messages", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => tmdUsersTable.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  kind: text("kind").notNull().default("chat"),
  body: text("body").notNull(),
  telegramMessageId: text("telegram_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_messages_pool_idx").on(t.poolId, t.createdAt)]);

export const tmdNotificationsTable = pgTable("tmd_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => tmdUsersTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  dedupeKey: text("dedupe_key"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("tmd_notifications_user_idx").on(t.userId, t.createdAt), unique("tmd_notifications_dedupe_unique").on(t.dedupeKey)]);

/** Telegram linking codes for users (`/start <token>`) and pool group chats (`/link <token>`). */
export const tmdTelegramLinksTable = pgTable("tmd_telegram_links", {
  token: text("token").primaryKey(),
  userId: text("user_id").references(() => tmdUsersTable.id, { onDelete: "cascade" }),
  poolId: text("pool_id").references(() => tmdPoolsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TmdUser = typeof tmdUsersTable.$inferSelect;
export type TmdSession = typeof tmdSessionsTable.$inferSelect;
export type TmdVendor = typeof tmdVendorsTable.$inferSelect;
export type TmdBatch = typeof tmdBatchesTable.$inferSelect;
export type TmdPool = typeof tmdPoolsTable.$inferSelect;
export type TmdPoolItem = typeof tmdPoolItemsTable.$inferSelect;
export type TmdPoolMember = typeof tmdPoolMembersTable.$inferSelect;
export type TmdPhoto = typeof tmdPhotosTable.$inferSelect;
export type TmdResult = typeof tmdResultsTable.$inferSelect;
export type TmdMessage = typeof tmdMessagesTable.$inferSelect;

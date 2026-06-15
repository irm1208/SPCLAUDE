import { pgTable, text, date, numeric, integer, timestamp, boolean, jsonb, unique, serial } from "drizzle-orm/pg-core";

export type PoolPaymentMethod =
  | { type: "crypto"; currency: string; network: string; address: string }
  | { type: "anonpay"; wallet: string; ticker: string; network: string }
  | { type: "revolut"; handle: string }
  | { type: "paypal"; email: string };

export const TESTING_POOL_STATUSES = [
  "draft",
  "open",
  "funded",
  "sent_to_lab",
  "results_received",
  "closed",
  "cancelled",
] as const;
export type TestingPoolStatus = typeof TESTING_POOL_STATUSES[number];

export const POOL_VOTING_MODES = ["leader_decides", "vote"] as const;
export type PoolVotingMode = typeof POOL_VOTING_MODES[number];

// ── test_catalog: admin-managed list of available test types ──
// category: "analysis" | "single" | "addon"
// analysisSection (only when category="analysis"): "compound" | "extra" | "variance"
export const testCatalogTable = pgTable("test_catalog", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  labName: text("lab_name"),
  description: text("description"),
  defaultPriceUsd: numeric("default_price_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  unitLabel: text("unit_label").notNull().default("test"), // e.g. "test", "vial", "sample"
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  category: text("category").notNull().default("analysis"), // analysis | single | addon
  analysisSection: text("analysis_section"), // compound | extra | variance (only for analysis category)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TestCatalogEntry = typeof testCatalogTable.$inferSelect;
export type NewTestCatalogEntry = typeof testCatalogTable.$inferInsert;

// ── testing_pools: standalone testing pools, leader-owned ──
export const testingPoolsTable = pgTable("testing_pools", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  leaderUsername: text("leader_username").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  compoundName: text("compound_name"),
  manufacturer: text("manufacturer"),
  batchNumber: text("batch_number"),
  status: text("status").notNull().default("draft"),
  votingMode: text("voting_mode").notNull().default("leader_decides"),
  // Aggregate target across selected tests; recomputed when pool_tests change.
  targetAmountUsd: numeric("target_amount_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  // Single shared password (hashed) for results access
  resultsPasswordHash: text("results_password_hash"),
  // Leader's chosen wallet for receiving contributions (snapshotted at creation)
  payoutWalletAddress: text("payout_wallet_address"),
  payoutCurrency: text("payout_currency"),
  payoutNetwork: text("payout_network"),
  // Public results
  resultNotes: text("result_notes"),
  resultPdfUrl: text("result_pdf_url"),
  resultPostedAt: timestamp("result_posted_at", { withTimezone: true }),
  // Payment methods accepted by this pool (snapshotted from leader at creation, editable)
  paymentMethods: jsonb("payment_methods").$type<PoolPaymentMethod[]>(),
  // Contributor add-ons
  contributorNamedReportEnabled: boolean("contributor_named_report_enabled").notNull().default(false),
  // When true, new contributions are rejected once targetAmountUsd is reached
  stopOnFunded: boolean("stop_on_funded").notNull().default(false),
  // Fixed opt-in fee: null = contributor enters any amount, otherwise this is the fixed fee
  fixedOptInFeeUsd: numeric("fixed_opt_in_fee_usd", { precision: 10, scale: 2 }),
  // Optional link to a GB if the pool was created from one (informational only)
  groupBuyId: text("group_buy_id"),
  // Product metadata (admin-editable, exposed publicly)
  capColor: text("cap_color"),
  mgSize: text("mg_size"),
  manufacturingDate: date("manufacturing_date"),
  // Admin gate
  approvalStatus: text("approval_status").notNull().default("approved"), // pending | approved | rejected
  rejectionReason: text("rejection_reason"),
  hiddenFromList: boolean("hidden_from_list").notNull().default(false),
  // Allow contributors to indicate they can provide a vial for the pool
  allowVialContribution: boolean("allow_vial_contribution").notNull().default(false),
  // Custom message shown prominently on the public pool page (admin or leader editable)
  pageMessage: text("page_message"),
  // Optional product/vial image shown on the pool card and detail page
  imageUrl: text("image_url"),
  // Maximum number of contributors who may opt in for a named report (null = unlimited)
  namedReportCap: integer("named_report_cap"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TestingPool = typeof testingPoolsTable.$inferSelect;
export type NewTestingPool = typeof testingPoolsTable.$inferInsert;

// ── pool_tests: which tests belong to a pool (with quantities + price snapshots) ──
export const poolTestsTable = pgTable("pool_tests", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => testingPoolsTable.id, { onDelete: "cascade" }),
  catalogId: text("catalog_id"), // optional — null if a custom one-off
  code: text("code").notNull(),
  name: text("name").notNull(),
  unitPriceUsd: numeric("unit_price_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull().default(1),
  votes: integer("votes").notNull().default(0), // populated when votingMode = "vote"
  selected: boolean("selected").notNull().default(true), // leader can toggle off without deleting
  contributionStatus: text("contribution_status").notNull().default("active"), // active | rejected | closed | delete_requested
  janoshikUrl: text("janoshik_url"), // optional per-test Janoshik payment URL
});

export type PoolTest = typeof poolTestsTable.$inferSelect;
export type NewPoolTest = typeof poolTestsTable.$inferInsert;

// ── pool_participants: opt-ins (users or guests) ──
export const POOL_PARTICIPANT_PAYMENT_STATUSES = [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "refunded",
] as const;

export const poolParticipantsTable = pgTable("pool_participants", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => testingPoolsTable.id, { onDelete: "cascade" }),
  // Identity — at least one of accountUsername / contactEmail / contactTelegram required
  accountUsername: text("account_username"),
  // FK to accounts(telegram_username) — mirrors accountUsername, consistent with other tables
  accountId: text("account_id"),
  contactEmail: text("contact_email"),
  contactTelegram: text("contact_telegram"),
  displayName: text("display_name"),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentMethod: text("payment_method"), // crypto | paypal | revolut | anonpay
  paymentTxHash: text("payment_tx_hash"),
  paymentScreenshotUrl: text("payment_screenshot_url"), // base64 data URL for paypal/revolut
  paymentCurrency: text("payment_currency"),
  paymentNetwork: text("payment_network"),
  paymentSubmittedAt: timestamp("payment_submitted_at", { withTimezone: true }),
  paymentVerifiedAt: timestamp("payment_verified_at", { withTimezone: true }),
  // Named report opt-in (when pool.contributorNamedReportEnabled = true)
  namedReportOptIn: boolean("named_report_opt_in").notNull().default(false),
  namedReportName: text("named_report_name"),
  // Whether this participant offered to provide a vial for the test
  canProvideVial: boolean("can_provide_vial").notNull().default(false),
  // Public visibility toggle — when true, displayName shows on pool page; when false, "Anonymous"
  isPublic: boolean("is_public").notNull().default(false),
  // Vote (when votingMode = "vote") — JSON array of pool_tests.id
  voteTestIds: jsonb("vote_test_ids").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PoolParticipant = typeof poolParticipantsTable.$inferSelect;
export type NewPoolParticipant = typeof poolParticipantsTable.$inferInsert;

// ── pool_test_results: per-test result rows when results posted ──
export const poolTestResultsTable = pgTable("pool_test_results", {
  id: serial("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => testingPoolsTable.id, { onDelete: "cascade" }),
  poolTestId: text("pool_test_id").notNull().references(() => poolTestsTable.id, { onDelete: "cascade" }),
  resultText: text("result_text"),
  resultPdfUrl: text("result_pdf_url"),
  passed: boolean("passed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PoolTestResult = typeof poolTestResultsTable.$inferSelect;

// ── pool_messages: leader broadcast messages to pool participants ──
export const poolMessagesTable = pgTable("pool_messages", {
  id: text("id").primaryKey(),
  poolId: text("pool_id").notNull().references(() => testingPoolsTable.id, { onDelete: "cascade" }),
  leaderUsername: text("leader_username").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PoolMessage = typeof poolMessagesTable.$inferSelect;

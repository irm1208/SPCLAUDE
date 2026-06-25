import { pgTable, text, numeric, integer, timestamp, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Shared Wholesale Orders ──────────────────────────────────────────────────
// A "wholesale share" lets one wholesale member start a combined order and invite
// other wholesale members (the organiser can optionally cap the group size). Each member adds their
// own items; the whole parcel ships to one chosen delivery member; everyone pays for
// their own items; vendor shipping is split (evenly or by order size). The combined
// order locks and is materialised into real per-member orders only after lock, and is
// considered "submitted" to the vendor once every member has paid.

export const WHOLESALE_SHARE_STATUSES = ["open", "locked", "submitted", "cancelled"] as const;
export type WholesaleShareStatus = typeof WHOLESALE_SHARE_STATUSES[number];

// "even" = vendor shipping divided equally between members.
// "by_size" = vendor shipping split proportionally to each member's kit count.
export const WHOLESALE_SHARE_SPLIT_MODES = ["even", "by_size"] as const;
export type WholesaleShareSplitMode = typeof WHOLESALE_SHARE_SPLIT_MODES[number];

// Draft items held per member while the share is still open (before lock materialises orders).
export type WholesaleShareItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export const wholesaleSharesTable = pgTable("wholesale_shares", {
  id: text("id").primaryKey(), // short uppercase share code, also used as the invite/join code
  creatorUsername: text("creator_username").notNull(),
  status: text("status").notNull().default("open"),
  splitMode: text("split_mode").notNull().default("even"),
  maxMembers: integer("max_members"), // null = no limit on group size (organiser-set)
  // ── Organiser-set order rules (all optional; null = no limit) ────────────────
  // Per-person kit bounds and a total kit cap, enforced when members add items and
  // again at lock. A date/time deadline auto-locks the order once it's ready. An
  // optional country allow-list restricts where the parcel may ship.
  minKitsPerMember: integer("min_kits_per_member"),
  maxKitsPerMember: integer("max_kits_per_member"),
  maxTotalKits: integer("max_total_kits"),
  lockDeadline: timestamp("lock_deadline", { withTimezone: true }),
  allowedCountries: jsonb("allowed_countries").$type<string[]>(),
  vendorId: text("vendor_id"), // snapshot of the active wholesale vendor at creation time
  // Chosen delivery member + their address snapshot (whole parcel ships here)
  deliveryUsername: text("delivery_username"),
  shippingName: text("shipping_name"),
  shippingPhone: text("shipping_phone"),
  shippingEmail: text("shipping_email"),
  shippingAddress: text("shipping_address"),
  shippingCountry: text("shipping_country"),
  // Snapshots captured at lock for stable display
  totalVendorShipping: numeric("total_vendor_shipping", { precision: 10, scale: 2 }),
  totalKits: numeric("total_kits", { precision: 10, scale: 2 }),
  // ── Optional peer-to-peer fees (paid separately, NOT to admin) ──────────────
  // The organiser can charge each participant a custom organiser fee (paid to the
  // organiser/creator) and a custom reshipper fee (paid to the parcel recipient
  // for sorting out the deal). These are paid directly to the organiser/recipient
  // and never enter the per-member order total that the admin/vendor collects.
  // Free-text payment instructions shown to participants for each fee.
  organiserPaymentInfo: text("organiser_payment_info"),
  reshipperPaymentInfo: text("reshipper_payment_info"),
  // ── Onward shipping (recipient re-ships each participant's items onward) ──────
  // When the parcel recipient (delivery member) enables onward shipping, they set a
  // custom per-participant onward charge (stored in the per-member reshipperFee) and
  // publish their OWN payout methods below. These monies go directly to the recipient
  // and NEVER enter any order total / admin / vendor accounting. The recipient marks
  // each charge paid manually (no auto-verification).
  onwardShippingEnabled: boolean("onward_shipping_enabled").notNull().default(false),
  // Recipient's structured payout methods for the onward charge (any combination).
  reshipperWalletAddress: text("reshipper_wallet_address"),
  reshipperWalletCurrency: text("reshipper_wallet_currency"), // "USDT" | "USDC" (ERC-20 only)
  reshipperAnonpay: text("reshipper_anonpay"),
  reshipperPaypal: text("reshipper_paypal"),
  reshipperRevolut: text("reshipper_revolut"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("wholesale_shares_creator_idx").on(t.creatorUsername),
  index("wholesale_shares_status_idx").on(t.status),
]);

export type WholesaleShare = typeof wholesaleSharesTable.$inferSelect;
export type NewWholesaleShare = typeof wholesaleSharesTable.$inferInsert;

export const wholesaleShareMembersTable = pgTable("wholesale_share_members", {
  id: text("id").primaryKey(),
  shareId: text("share_id").notNull().references(() => wholesaleSharesTable.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  isCreator: boolean("is_creator").notNull().default(false),
  // Draft items + tip held here while the share is open; materialised into a real order at lock.
  items: jsonb("items").$type<WholesaleShareItem[]>().notNull().default([]),
  tip: numeric("tip", { precision: 10, scale: 2 }).notNull().default("0"),
  // The materialised order created at lock; null while the share is still open.
  orderId: text("order_id"),
  // Per-member vendor-shipping share computed at lock (snapshot for display).
  shippingShare: numeric("shipping_share", { precision: 10, scale: 2 }),
  // ── Optional peer-to-peer fees set by the organiser for THIS participant ─────
  // organiserFee → paid to the organiser; reshipperFee → paid to the parcel
  // recipient. The current recipient is exempt (effective fee treated as 0).
  // Each fee tracks a "paid" flag confirmed by its payee (organiser/recipient).
  organiserFee: numeric("organiser_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  reshipperFee: numeric("reshipper_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  organiserFeePaid: boolean("organiser_fee_paid").notNull().default(false),
  reshipperFeePaid: boolean("reshipper_fee_paid").notNull().default(false),
  // ── Onward shipping destination (provided by THIS participant) ───────────────
  // Optional: where the recipient should forward this member's items. A written
  // address and/or an uploaded courier DELIVERY QR image (e.g. Royal Mail/InPost),
  // stored as an uncompressed data URL so it stays scannable. NOT a payment QR.
  onwardAddress: text("onward_address"),
  onwardQr: text("onward_qr"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("wholesale_share_members_unique").on(t.shareId, t.username),
  index("wholesale_share_members_share_idx").on(t.shareId),
  index("wholesale_share_members_username_idx").on(t.username),
]);

export type WholesaleShareMember = typeof wholesaleShareMembersTable.$inferSelect;
export type NewWholesaleShareMember = typeof wholesaleShareMembersTable.$inferInsert;

export const insertWholesaleShareSchema = createInsertSchema(wholesaleSharesTable).omit({ createdAt: true, updatedAt: true });
export type InsertWholesaleShare = z.infer<typeof insertWholesaleShareSchema>;

export const insertWholesaleShareMemberSchema = createInsertSchema(wholesaleShareMembersTable).omit({ joinedAt: true, updatedAt: true });
export type InsertWholesaleShareMember = z.infer<typeof insertWholesaleShareMemberSchema>;

// ── Shared order chat ────────────────────────────────────────────────────────
// A lightweight Telegram-style message thread scoped to a single shared order.
// Only members of the share can read or post. Posting also fires a Telegram bot
// notification to every OTHER member who has the chat preference enabled.
export const wholesaleShareMessagesTable = pgTable("wholesale_share_messages", {
  id: text("id").primaryKey(),
  shareId: text("share_id").notNull().references(() => wholesaleSharesTable.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("wholesale_share_messages_share_idx").on(t.shareId, t.createdAt),
]);

export type WholesaleShareMessage = typeof wholesaleShareMessagesTable.$inferSelect;
export type NewWholesaleShareMessage = typeof wholesaleShareMessagesTable.$inferInsert;

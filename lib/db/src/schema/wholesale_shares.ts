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

// A single masked onward-tracking event (mirrors ParcelEvent shape used for GB parcels).
// Location is masked to country-only and status descriptions are cleaned of names/addresses
// before storage, so this is always safe to surface to the participant.
export type WholesaleOnwardTrackingEvent = { date: string; status: string; location: string };

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
  // Max number of parcels the combined order will be split into. Distinct from
  // maxTotalKits (which is a quantity of kits) — this is a count of parcels.
  // Displayed on the public group card; null = not set.
  maxPackages: integer("max_packages"),
  lockDeadline: timestamp("lock_deadline", { withTimezone: true }),
  allowedCountries: jsonb("allowed_countries").$type<string[]>(),
  // ── Public group listing ────────────────────────────────────────────────────
  // When true, this shared order is listed publicly so any wholesale member can
  // discover and join it (no approval needed). organiserFlatFee is a flat per-person
  // fee shown on the public card and applied to each member who joins.
  isPublic: boolean("is_public").notNull().default(false),
  organiserFlatFee: numeric("organiser_flat_fee", { precision: 10, scale: 2 }),
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
  // ── Optional organiser fee (paid separately, NOT to admin) ──────────────────
  // The organiser can charge each participant a custom organiser fee (paid directly
  // to the organiser/creator). It never enters the per-member order total that the
  // admin/vendor collects. Free-text payment instructions shown to participants.
  organiserPaymentInfo: text("organiser_payment_info"),
  // ── Main parcel tracking (vendor → recipient) cache ─────────────────────────
  // Admin sets ONE tracking number for the whole shared order, written to every
  // member order (orders.trackingNumber is the source of truth). These columns are a
  // CACHE of that combined parcel's 17track feed, keyed by mainTrackingNumber. Events
  // are masked (country-only location, names/addresses stripped) BEFORE storage, so
  // they are safe to surface to every participant. The raw number/carrier are exposed
  // in the API only to the parcel recipient (and admin-only order routes).
  mainTrackingNumber: text("main_tracking_number"),
  mainTrackingCarrier: text("main_tracking_carrier"),
  mainTrackingStatus: text("main_tracking_status"),
  mainTrackingStatusCode: integer("main_tracking_status_code"),
  mainTrackingEvents: jsonb("main_tracking_events").$type<WholesaleOnwardTrackingEvent[]>().notNull().default([]),
  mainTrackingChecked: timestamp("main_tracking_checked", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("wholesale_shares_creator_idx").on(t.creatorUsername),
  index("wholesale_shares_status_idx").on(t.status),
  index("wholesale_shares_public_idx").on(t.isPublic, t.status),
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
  // ── Optional organiser fee set by the organiser for THIS participant ─────────
  // organiserFee → paid directly to the organiser. The current recipient is exempt
  // (effective fee treated as 0). Tracks a "paid" flag confirmed by the organiser.
  organiserFee: numeric("organiser_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  organiserFeePaid: boolean("organiser_fee_paid").notNull().default(false),
  // ── Onward shipping address (where this member wants their items forwarded) ───
  // Each participant may enter their OWN onward address. It is private: only the
  // chosen parcel recipient (delivery member) and the member themselves can read it
  // — never the organiser or other members. Used by the recipient to forward each
  // member's items after the combined parcel arrives. Never priced/snapshotted.
  onwardName: text("onward_name"),
  onwardPhone: text("onward_phone"),
  onwardEmail: text("onward_email"),
  onwardAddress: text("onward_address"),
  onwardCountry: text("onward_country"),
  // ── Onward parcel tracking (set by the organiser/recipient who forwards items) ─
  // After the combined parcel arrives, the recipient forwards each member's items
  // and records the onward tracking number here. Events are fetched from 17track and
  // MASKED (country-only location, names/addresses stripped) before storage so they
  // are safe to show the participant. The raw number/carrier are exposed only to the
  // dispatching recipient; participants see a masked number plus the status timeline.
  onwardTrackingNumber: text("onward_tracking_number"),
  onwardCarrier: text("onward_carrier"),
  onwardTrackingStatus: text("onward_tracking_status"),
  onwardTrackingStatusCode: integer("onward_tracking_status_code"),
  onwardTrackingEvents: jsonb("onward_tracking_events").$type<WholesaleOnwardTrackingEvent[]>().notNull().default([]),
  onwardTrackingChecked: timestamp("onward_tracking_checked", { withTimezone: true }),
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

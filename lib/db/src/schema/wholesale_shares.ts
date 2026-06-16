import { pgTable, text, numeric, integer, timestamp, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Shared Wholesale Orders ──────────────────────────────────────────────────
// A "wholesale share" lets one wholesale member start a combined order and invite
// up to MAX_WHOLESALE_SHARE_MEMBERS other wholesale members. Each member adds their
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

// Hard cap on total members in a single shared order (creator counts as one).
export const MAX_WHOLESALE_SHARE_MEMBERS = 10;

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
  maxMembers: integer("max_members").notNull().default(10),
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

import { pgTable, text, jsonb, timestamp, unique, index, integer } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

export type VendorCostItem = { productName: string; quantity: number; unitCost: string; lineTotal: string };
export type VendorShipping = { name: string; address: string; country: string; phone: string; email: string };
export type VendorSnapshot = {
  items: VendorCostItem[]; shipping: VendorShipping; currency: "USD";
  productCost: string; shippingCost: string; totalCost: string;
};

export const vendorPortalAccessTable = pgTable("vendor_portal_access", {
  username: text("username").primaryKey().references(() => accountsTable.telegramUsername, { onUpdate: "cascade", onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull(),
  grantedBy: text("granted_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Self-service vendor applications. Admin approval copies the row into vendor_portal_access. */
export const vendorPortalRequestsTable = pgTable("vendor_portal_requests", {
  username: text("username").primaryKey().references(() => accountsTable.telegramUsername, { onUpdate: "cascade", onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  website: text("website"),
  message: text("message"),
  requestedVendorId: text("requested_vendor_id"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorSubmissionsTable = pgTable("vendor_submissions", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  vendorId: text("vendor_id").notNull(),
  reference: text("reference").notNull(),
  orderIds: jsonb("order_ids").$type<string[]>().notNull(),
  sharedOrderId: text("shared_order_id"),
  snapshot: jsonb("snapshot").$type<VendorSnapshot>().notNull(),
  sourceFingerprint: text("source_fingerprint").notNull(),
  status: text("status").notNull().default("Submitted"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  submittedBy: text("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("vendor_submissions_source_key_unique").on(t.sourceKey),
  index("vendor_submissions_vendor_id_idx").on(t.vendorId),
]);

export const vendorImagesTable = pgTable("vendor_images", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => vendorSubmissionsTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  filename: text("filename").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("vendor_images_submission_id_idx").on(t.submissionId)]);

export const vendorAuditTable = pgTable("vendor_audit", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-vendor preferences set in the portal. A closed window pauses automatic routing to that vendor. */
export const vendorSettingsTable = pgTable("vendor_settings", {
  vendorId: text("vendor_id").primaryKey(),
  closedFrom: timestamp("closed_from", { withTimezone: true }),
  closedUntil: timestamp("closed_until", { withTimezone: true }),
  closedNote: text("closed_note"),
  handlingDays: integer("handling_days"),
  defaultCarrier: text("default_carrier"),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A vendor flags a problem with an assigned shipment; Admin resolves it. */
export const vendorOrderIssuesTable = pgTable("vendor_order_issues", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => vendorSubmissionsTable.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").notNull(),
  type: text("type").notNull(),
  note: text("note"),
  reportedBy: text("reported_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  resolution: text("resolution"),
}, t => [index("vendor_order_issues_submission_idx").on(t.submissionId), index("vendor_order_issues_vendor_idx").on(t.vendorId)]);

/* ---------------------------------------------------------------------------
 * Vendor Telegram bot (separate from the member bot)
 * ------------------------------------------------------------------------- */
export type VendorTelegramPrefs = { newOrders?: boolean; holds?: boolean; overdue?: boolean; issues?: boolean; messages?: boolean };
export const vendorTelegramChatsTable = pgTable("vendor_telegram_chats", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  chatId: text("chat_id").notNull(),
  chatType: text("chat_type"),
  title: text("title"),
  linkedBy: text("linked_by").notNull(),
  prefs: jsonb("prefs").$type<VendorTelegramPrefs>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("vendor_telegram_chats_chat_unique").on(t.chatId), index("vendor_telegram_chats_vendor_idx").on(t.vendorId)]);

export const vendorTelegramLinkTokensTable = pgTable("vendor_telegram_link_tokens", {
  token: text("token").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  username: text("username").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per (kind, submission) so the notifier never sends the same alert twice, even across restarts. */
export const vendorTelegramEventsTable = pgTable("vendor_telegram_events", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  submissionId: text("submission_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  delivered: integer("delivered").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("vendor_telegram_events_kind_submission_unique").on(t.kind, t.submissionId)]);

/* ---------------------------------------------------------------------------
 * Vendor message threads (Admin <-> vendor), mirrored to the vendor Telegram bot
 * ------------------------------------------------------------------------- */
export const vendorThreadsTable = pgTable("vendor_threads", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  submissionId: text("submission_id").references(() => vendorSubmissionsTable.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  openedBy: text("opened_by").notNull(),
  vendorUnread: integer("vendor_unread").notNull().default(0),
  adminUnread: integer("admin_unread").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessagePreview: text("last_message_preview"),
  closedBy: text("closed_by"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("vendor_threads_vendor_idx").on(t.vendorId), index("vendor_threads_last_message_idx").on(t.lastMessageAt)]);

export const vendorThreadMessagesTable = pgTable("vendor_thread_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => vendorThreadsTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  imagePath: text("image_path"),
  imageName: text("image_name"),
  via: text("via").notNull().default("portal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("vendor_thread_messages_thread_idx").on(t.threadId)]);

/** Telegram message ids of thread notifications, so a native Telegram reply lands in the right thread. */
export const vendorThreadTelegramMessagesTable = pgTable("vendor_thread_telegram_messages", {
  id: text("id").primaryKey(),
  telegramMessageId: text("telegram_message_id").notNull(),
  chatId: text("chat_id").notNull(),
  threadId: text("thread_id").notNull().references(() => vendorThreadsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("vendor_thread_telegram_messages_unique").on(t.telegramMessageId, t.chatId)]);

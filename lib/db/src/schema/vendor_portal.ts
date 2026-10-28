import { pgTable, text, jsonb, timestamp, unique, index } from "drizzle-orm/pg-core";
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

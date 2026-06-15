import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export type Fs3BatchSheetProduct = { name: string; qty: number; unitCost: number | null };
export type Fs3BatchSheet = { route: string; label: string; type: string; orderCount: number; products: Fs3BatchSheetProduct[] };

/**
 * Records each FS3 vendor-order batch submission.
 * Written by the fs3-submit endpoint; read by the batch history panel.
 * batchSnapshot stores the full per-route product breakdown for history regeneration.
 */
export const fs3SubmissionsTable = pgTable("fs3_submissions", {
  id: text("id").primaryKey(),
  gbId: text("gb_id").notNull(),
  submittedBy: text("submitted_by").notNull().default("admin"),
  totalOrders: integer("total_orders").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  includeUnconfirmed: text("include_unconfirmed").notNull().default("false"),
  notes: text("notes"),
  sheets: jsonb("sheets").$type<{ label: string; type: string; orderCount: number }[]>(),
  batchSnapshot: jsonb("batch_snapshot").$type<Fs3BatchSheet[]>(),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Fs3Submission = typeof fs3SubmissionsTable.$inferSelect;
export type NewFs3Submission = typeof fs3SubmissionsTable.$inferInsert;

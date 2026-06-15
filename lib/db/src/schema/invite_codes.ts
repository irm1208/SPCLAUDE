import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const inviteCodesTable = pgTable("invite_codes", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  maxUses: integer("max_uses"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InviteCode = typeof inviteCodesTable.$inferSelect;
export type NewInviteCode = typeof inviteCodesTable.$inferInsert;

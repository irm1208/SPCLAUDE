import { pgTable, text, numeric, integer, boolean, timestamp, foreignKey, unique } from "drizzle-orm/pg-core";

export const couponCodesTable = pgTable("coupon_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  // Nullable preserves existing global coupons. Never clear scope when a GB is deleted.
  groupBuyId: text("group_buy_id"),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percentage"), // "percentage" | "fixed"
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  maxUsesPerAccount: integer("max_uses_per_account"),
  minSubtotal: numeric("min_subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("coupon_codes_code_unique").on(table.code),
]);

export const couponRedemptionsTable = pgTable("coupon_redemptions", {
  id: text("id").primaryKey(),
  couponId: text("coupon_id").notNull(),
  couponCode: text("coupon_code").notNull(),
  orderId: text("order_id").notNull(),
  telegramUsername: text("telegram_username").notNull(),
  discountApplied: numeric("discount_applied", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    name: "coupon_redemptions_coupon_id_coupon_codes_id_fk",
    columns: [table.couponId],
    foreignColumns: [couponCodesTable.id],
  }).onDelete("cascade"),
]);

export type CouponCode = typeof couponCodesTable.$inferSelect;
export type NewCouponCode = typeof couponCodesTable.$inferInsert;
export type CouponRedemption = typeof couponRedemptionsTable.$inferSelect;

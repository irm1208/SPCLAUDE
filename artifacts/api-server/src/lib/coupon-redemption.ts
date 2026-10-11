import { db, couponCodesTable, couponRedemptionsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { calculateCouponDiscount, CouponError, couponProblem, type CouponContext } from "./group-buy-coupon-policy";

type CouponDb = Pick<typeof db, "select" | "insert" | "update">;
export async function couponAccountUses(tx: CouponDb, couponId: string, username: string): Promise<number> {
  const canonicalUsername = username.replace(/^@/, "").toLowerCase();
  const [row] = await tx.select({ count: sql<number>`count(*)::int` })
    .from(couponRedemptionsTable)
    .where(and(eq(couponRedemptionsTable.couponId, couponId),
      sql`lower(regexp_replace(${couponRedemptionsTable.telegramUsername}, '^@', '')) = ${canonicalUsername}`));
  return row?.count ?? 0;
}
/** Caller must hold this transaction through order writes and recordCouponRedemption. */
export async function claimCoupon(tx: CouponDb, couponId: string, username: string, context: CouponContext, expectedDiscount: number) {
  const [coupon] = await tx.select().from(couponCodesTable)
    .where(eq(couponCodesTable.id, couponId)).for("update");
  if (!coupon) throw new CouponError("This coupon no longer exists");
  const usesByAccount = coupon.maxUsesPerAccount != null ? await couponAccountUses(tx, couponId, username) : 0;
  const problem = couponProblem(coupon, { ...context, usesByAccount });
  if (problem) throw new CouponError(problem);
  if (calculateCouponDiscount(coupon, context) !== expectedDiscount) throw new CouponError("The coupon changed. Please reapply it before submitting");
  return coupon;
}
export async function recordCouponRedemption(tx: CouponDb, coupon: { id: string; code: string }, orderId: string, username: string, discount: number) {
  await tx.insert(couponRedemptionsTable).values({
    id: randomUUID(), couponId: coupon.id, couponCode: coupon.code,
    orderId, telegramUsername: username, discountApplied: discount.toFixed(2),
  });
  await tx.update(couponCodesTable).set({ usageCount: sql`${couponCodesTable.usageCount} + 1` })
    .where(eq(couponCodesTable.id, coupon.id));
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

// Opt-in development database test; fixtures never touch real orders or balances.
describe.runIf(process.env.GROUP_COUPON_DB_TESTS === "1")("coupon transaction integrity", () => {
  let store: typeof import("@workspace/db");
  let redemption: typeof import("./coupon-redemption");
  const ids: string[] = [];
  const scope = `coupon-test-${randomUUID()}`;
  const context = { groupBuyId: scope, productSubtotal: 100, total: 150 };
  beforeAll(async () => {
    store = await import("@workspace/db");
    redemption = await import("./coupon-redemption");
  });
  afterAll(async () => {
    for (const id of ids) await store.db.delete(store.couponCodesTable).where(eq(store.couponCodesTable.id, id));
    await store.pool.end();
  });
  async function fixture(overrides: Record<string, unknown> = {}) {
    const id = randomUUID(); ids.push(id);
    const [coupon] = await store.db.insert(store.couponCodesTable).values({
      id, code: `TEST_${id.replaceAll("-", "").slice(0, 20)}`, groupBuyId: scope,
      discountType: "percentage", discountValue: "10",
      maxUses: 1, maxUsesPerAccount: 1, minSubtotal: "0", ...overrides,
    }).returning();
    return coupon;
  }
  async function spend(id: string, username: string) {
    return store.db.transaction(async tx => {
      const coupon = await redemption.claimCoupon(tx, id, username, context, 10);
      await redemption.recordCouponRedemption(tx, coupon, `test-order-${randomUUID()}`, username, 10);
    });
  }
  it("allows only one redemption when two customers race for the last use", async () => {
    const coupon = await fixture();
    const outcomes = await Promise.allSettled([spend(coupon.id, "coupon-test-a"), spend(coupon.id, "coupon-test-b")]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const [saved] = await store.db.select().from(store.couponCodesTable).where(eq(store.couponCodesTable.id, coupon.id));
    expect(saved.usageCount).toBe(1);
    const rows = await store.db.select().from(store.couponRedemptionsTable).where(eq(store.couponRedemptionsTable.couponId, coupon.id));
    expect(rows).toHaveLength(1);
  });
  it("rolls back both the count and redemption when the enclosing order transaction fails", async () => {
    const coupon = await fixture();
    await expect(store.db.transaction(async tx => {
      const locked = await redemption.claimCoupon(tx, coupon.id, "coupon-test-a", context, 10);
      await redemption.recordCouponRedemption(tx, locked, "test-rollback", "coupon-test-a", 10);
      throw new Error("simulated order failure");
    })).rejects.toThrow("simulated order failure");
    const [saved] = await store.db.select().from(store.couponCodesTable).where(eq(store.couponCodesTable.id, coupon.id));
    expect(saved.usageCount).toBe(0);
    expect(await redemption.couponAccountUses(store.db, coupon.id, "coupon-test-a")).toBe(0);
  });
  it("normalizes @ and case when enforcing a customer's quota", async () => {
    const coupon = await fixture({ maxUses: null });
    await spend(coupon.id, "@COUPON-TEST-A");
    await expect(spend(coupon.id, "coupon-test-a")).rejects.toThrow(/customer/);
  });
  it("refuses a discount changed since checkout quoted it", async () => {
    const coupon = await fixture({ discountValue: "20" });
    await expect(spend(coupon.id, "coupon-test-a")).rejects.toThrow(/changed/);
  });
});

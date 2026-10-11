import { describe, expect, it } from "vitest";
import { calculateCouponDiscount, couponProblem, couponQuoteMatches, parseGroupCouponInput } from "./group-buy-coupon-policy";

const coupon = {
  groupBuyId: "gb-a", isActive: true, expiresAt: null,
  discountType: "percentage", discountValue: "10", usageCount: 0,
  maxUses: 2, maxUsesPerAccount: 1, minSubtotal: "20",
};
const context = {
  groupBuyId: "gb-a", productSubtotal: 100, total: 150, usesByAccount: 0,
  now: new Date("2026-10-11T12:00:00Z"),
};
describe("group-buy coupon eligibility", () => {
  it("honors checkout quotes and supports legacy clients without a quote", () => {
    expect(couponQuoteMatches(undefined, 10)).toBe(true);
    expect(couponQuoteMatches(10, 10)).toBe(true);
    expect(couponQuoteMatches(15, 10)).toBe(false);
    expect(couponQuoteMatches("10", 10)).toBe(false);
    expect(couponQuoteMatches(Infinity, 10)).toBe(false);
  });
  it("discounts products only for scoped coupons, preserving global coupon arithmetic", () => {
    expect(calculateCouponDiscount(coupon, context)).toBe(10);
    expect(calculateCouponDiscount({ ...coupon, groupBuyId: null }, context)).toBe(15);
    expect(calculateCouponDiscount({ ...coupon, discountType: "fixed", discountValue: "500" }, context)).toBe(100);
  });
  it.each([null, "gb-b"])("rejects another group or a non-group order (%s)", groupBuyId => {
    expect(couponProblem(coupon, { ...context, groupBuyId })).toMatch(/group buy/);
  });
  it("allows eligible coupons", () => expect(couponProblem(coupon, context)).toBeNull());
  it.each([
    { isActive: false }, { usageCount: 2 },
    { expiresAt: new Date("2026-10-11T12:00:00Z") },
    { discountValue: "Infinity" }, { discountValue: "101" },
  ])("rejects inactive, exhausted, expired or invalid coupons: %j", overrides => {
    expect(couponProblem({ ...coupon, ...overrides }, context)).not.toBeNull();
  });
  it("enforces customer limits and minimum product subtotal", () => {
    expect(couponProblem(coupon, { ...context, usesByAccount: 1 })).toMatch(/customer/);
    expect(couponProblem(coupon, { ...context, productSubtotal: 19.99 })).toMatch(/minimum/);
    expect(couponProblem(coupon, { ...context, productSubtotal: 20 })).toBeNull();
  });
});
describe("group-buy coupon settings", () => {
  const body = { code: " welcome10 ", discountType: "percentage", discountValue: 10 };
  it("normalizes codes and provides explicit, backward-compatible defaults", () => {
    const parsed = parseGroupCouponInput(body);
    expect(parsed.code).toBe("WELCOME10");
    expect(parsed.maxUses).toBeNull();
    expect(parsed.maxUsesPerAccount).toBe(1);
    expect(parsed.minSubtotal).toBe("0.00");
  });
  it("supports fixed discounts and unlimited or finite customer usage", () => {
    expect(parseGroupCouponInput({ ...body, discountType: "fixed", maxUses: 12, maxUsesPerAccount: null, discountValue: 5.5 }).discountValue).toBe("5.50");
  });
  it.each([
    { code: "" }, { code: "HAS SPACE" }, { discountValue: 0 },
    { discountValue: Infinity }, { discountValue: 101 }, { discountValue: 0.001 },
    { maxUses: 0 }, { maxUses: 1.5 }, { maxUsesPerAccount: -1 },
    { minSubtotal: -1 }, { expiresAt: "not-a-date" }, { isActive: "false" },
    { discountValue: true }, { maxUses: true }, { minSubtotal: [] },
  ])("rejects invalid input: %j", overrides => {
    expect(() => parseGroupCouponInput({ ...body, ...overrides })).toThrow();
  });
});

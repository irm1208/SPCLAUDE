import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatGroupCouponAmount, groupCouponCurrency } from "./group-buy-coupon-currency";

test("fixed amounts use the supplied group currency, without FX conversion", () => {
  assert.equal(formatGroupCouponAmount(10, "GBP"), "£10.00 GBP");
  assert.equal(formatGroupCouponAmount(10, "USD"), "$10.00 USD");
  assert.equal(formatGroupCouponAmount(10, "EUR"), "€10.00 EUR");
});

test("token and other currencies never silently display as dollars", () => {
  assert.equal(formatGroupCouponAmount(10, "USDT"), "10.00 USDT");
  assert.equal(formatGroupCouponAmount(10, "JPY"), "10.00 JPY");
  assert.equal(groupCouponCurrency(" gbp "), "GBP");
  assert.equal(groupCouponCurrency(null), "GBP");
});

test("coupon manager labels fixed discounts and minimum spend with the group currency", () => {
  const source = readFileSync(new URL("../components/GroupBuyCoupons.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Minimum product subtotal ({couponCurrency})"));
  assert.ok(source.includes("formatGroupCouponAmount(c.discountValue, couponCurrency)"));
});

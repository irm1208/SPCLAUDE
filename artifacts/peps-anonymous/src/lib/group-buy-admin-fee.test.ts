import assert from "node:assert/strict";
import test from "node:test";
import { resolveReviewAdminFee } from "./group-buy-admin-fee.ts";

test("review total uses the delivery-country admin-fee override", () => {
  assert.deepEqual(resolveReviewAdminFee({
    enabled: true,
    feeType: "fixed",
    baseAmount: 5,
    label: "Admin fee",
    countryOverrides: [
      { country: "United Kingdom", amount: 12.5, enabled: true },
    ],
    shippingCountry: "GB",
    productSubtotal: 100,
  }), {
    amount: 12.5,
    label: "Admin fee",
  });
});
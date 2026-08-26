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

test("review total falls back to the member country for normal group-buy delivery", () => {
  assert.deepEqual(resolveReviewAdminFee({
    enabled: false,
    feeType: "fixed",
    baseAmount: 0,
    label: "Admin fee",
    countryOverrides: [
      { country: "United Kingdom", amount: 5, enabled: true },
    ],
    shippingCountry: "",
    fallbackCountry: "UK",
    productSubtotal: 120,
  }), {
    amount: 5,
    label: "Admin fee",
  });
});

test("review does not use a disabled base fee for a non-matching country", () => {
  assert.deepEqual(resolveReviewAdminFee({
    enabled: false,
    feeType: "fixed",
    baseAmount: 9,
    label: "Admin fee",
    countryOverrides: [
      { country: "United Kingdom", amount: 5, enabled: true },
    ],
    shippingCountry: "DE",
    productSubtotal: 120,
  }), {
    amount: 0,
    label: null,
  });
});
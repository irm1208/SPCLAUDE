import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateShippingDifference,
  calculateShippingShortfall,
  normalizeShippingAmount,
} from "./shipping-split-model.ts";

test("normalizeShippingAmount converts database decimal strings into numbers", () => {
  assert.equal(normalizeShippingAmount("12.50"), 12.5);
});

test("normalizeShippingAmount uses zero for missing or invalid values", () => {
  assert.equal(normalizeShippingAmount(null), 0);
  assert.equal(normalizeShippingAmount(undefined), 0);
  assert.equal(normalizeShippingAmount("not-a-number"), 0);
});

test("calculateShippingDifference shows the per-order split shortfall", () => {
  assert.equal(calculateShippingDifference("0.00", "8.04"), 8.04);
  assert.equal(calculateShippingDifference("9.10", "6.24"), -2.86);
});

test("calculateShippingShortfall shows the remaining or excess split total", () => {
  assert.equal(calculateShippingShortfall(100, 92.5), 7.5);
  assert.equal(calculateShippingShortfall(100, 103.25), -3.25);
});
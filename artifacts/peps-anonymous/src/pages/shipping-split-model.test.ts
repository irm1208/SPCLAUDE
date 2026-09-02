import assert from "node:assert/strict";
import test from "node:test";
import { normalizeShippingAmount } from "./shipping-split-model.ts";

test("normalizeShippingAmount converts database decimal strings into numbers", () => {
  assert.equal(normalizeShippingAmount("12.50"), 12.5);
});

test("normalizeShippingAmount uses zero for missing or invalid values", () => {
  assert.equal(normalizeShippingAmount(null), 0);
  assert.equal(normalizeShippingAmount(undefined), 0);
  assert.equal(normalizeShippingAmount("not-a-number"), 0);
});
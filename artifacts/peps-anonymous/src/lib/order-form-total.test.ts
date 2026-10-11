import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateOrderFormTotal } from "./order-form-total";

const base = {
  lineTotals: [39, 40.5, 6],
  deliveryPrice: 3,
  vendorShipping: 0,
  tip: 0,
  testingContribution: 0,
  adminFee: 0,
  isTopUp: false,
};

test("includes all selected products and delivery", () => {
  assert.equal(calculateOrderFormTotal(base), 88.5);
});
test("responds to quantity changes and includes all known additional charges", () => {
  assert.equal(calculateOrderFormTotal({
    ...base, lineTotals: [78, 40.5, 6], vendorShipping: 12, tip: 5, testingContribution: 15, adminFee: 8,
  }), 167.5);
});
test("top-ups exclude delivery, vendor shipping and admin fee", () => {
  assert.equal(calculateOrderFormTotal({
    ...base, vendorShipping: 12, adminFee: 8, tip: 5, testingContribution: 15, isTopUp: true,
  }), 105.5);
});
test("rounds to currency precision and handles an empty order", () => {
  assert.equal(calculateOrderFormTotal({ ...base, lineTotals: [0.1, 0.2], deliveryPrice: 0 }), 0.3);
  assert.equal(calculateOrderFormTotal({ ...base, lineTotals: [], deliveryPrice: 0 }), 0);
});

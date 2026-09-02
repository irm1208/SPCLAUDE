import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateShippingSplit,
  calculateShippingDifference,
  calculateShippingShortfall,
  getShippingCalculationBreakdown,
  normalizeShippingAmount,
  totalOrderQuantity,
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

test("allocateShippingSplit preserves the normal split when single-vial mode is off", () => {
  assert.deepEqual(allocateShippingSplit(100, 50, [
    { id: "a", lineItems: [{ productId: "kit", quantity: 1 }] },
    { id: "b", lineItems: [{ productId: "kit", quantity: 3 }] },
  ]), {
    a: 37.5,
    b: 62.5,
  });
});

test("allocateShippingSplit divides a vial-only order's normal allocation by ten and rebalances the remainder", () => {
  assert.deepEqual(allocateShippingSplit(60, 100, [
    { id: "vial-order", lineItems: [{ productId: "vial-a", quantity: 5 }] },
    { id: "kit-order", lineItems: [{ productId: "kit", quantity: 5 }] },
  ], new Set(["vial-a"])), {
    "vial-order": 3,
    "kit-order": 57,
  });
});

test("allocateShippingSplit discounts only selected vial products in a mixed order", () => {
  assert.deepEqual(allocateShippingSplit(90, 100, [
    {
      id: "mixed-order",
      lineItems: [
        { productId: "vial-a", quantity: 5 },
        { productId: "kit", quantity: 5 },
      ],
    },
    { id: "kit-order-a", lineItems: [{ productId: "kit", quantity: 2 }] },
    { id: "kit-order-b", lineItems: [{ productId: "kit", quantity: 8 }] },
  ], new Set(["vial-a"])), {
    "mixed-order": 16.5,
    "kit-order-a": 36.75,
    "kit-order-b": 36.75,
  });
});

test("allocateShippingSplit supports multiple selected single-vial products", () => {
  assert.deepEqual(allocateShippingSplit(60, 100, [
    {
      id: "vial-order",
      lineItems: [
        { productId: "vial-a", quantity: 2 },
        { productId: "vial-b", quantity: 3 },
      ],
    },
    { id: "kit-order", lineItems: [{ productId: "kit", quantity: 5 }] },
  ], new Set(["vial-a", "vial-b"])), {
    "vial-order": 3,
    "kit-order": 57,
  });
});

test("totalOrderQuantity sums all line-item quantities", () => {
  assert.equal(totalOrderQuantity([
    { quantity: 2 },
    { quantity: "3" },
  ]), 5);
  assert.equal(totalOrderQuantity(undefined), 0);
});

test("getShippingCalculationBreakdown shows the vial quantity multiplier", () => {
  assert.deepEqual(getShippingCalculationBreakdown({
    lineItems: [{ productId: "vial-a", quantity: 3 }],
  }, 7.90, new Set(["vial-a"])), {
    hasSelectedVialProduct: true,
    normalOrderAmount: 7.9,
    totalQuantity: 3,
    vialQuantity: 3,
    regularProductAmount: 0,
    normalVialAmount: 7.9,
    perKitAmount: 2.6333,
    perVialAmount: 0.2633,
    adjustedVialAmount: 0.79,
    adjustedOrderAmount: 0.79,
  });
});

test("getShippingCalculationBreakdown keeps normal products at their regular rate", () => {
  assert.deepEqual(getShippingCalculationBreakdown({
    lineItems: [
      { productId: "vial-a", quantity: 5 },
      { productId: "kit", quantity: 5 },
    ],
  }, 30, new Set(["vial-a"])), {
    hasSelectedVialProduct: true,
    normalOrderAmount: 30,
    totalQuantity: 10,
    vialQuantity: 5,
    regularProductAmount: 15,
    normalVialAmount: 15,
    perKitAmount: 3,
    perVialAmount: 0.3,
    adjustedVialAmount: 1.5,
    adjustedOrderAmount: 16.5,
  });
});
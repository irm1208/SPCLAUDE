import assert from "node:assert/strict";
import { test } from "node:test";
import { clampOrderPanelQuantity } from "./order-panel-quantity";

test("accepts half kits only when enabled and snaps whole-kit inputs", () => {
  assert.equal(clampOrderPanelQuantity(1.5, 1, { allowHalfKits: true }), 1.5);
  assert.equal(clampOrderPanelQuantity(1.5, 1, { allowHalfKits: false }), 1);
  assert.equal(clampOrderPanelQuantity(0.2, 1, { allowHalfKits: true }), 0.5);
});
test("clamps typed quantities to the tightest remaining limit", () => {
  assert.equal(clampOrderPanelQuantity(99, 1, { allowHalfKits: true, maxQuantity: 2.5 }), 2.5);
  assert.equal(clampOrderPanelQuantity(99, 1, { allowHalfKits: false, maxQuantity: 2.5 }), 2);
  assert.equal(clampOrderPanelQuantity(1, 1, { allowHalfKits: false, maxQuantity: 0 }), null);
});
test("blocked increases still permit reductions", () => {
  assert.equal(clampOrderPanelQuantity(3, 2, { allowHalfKits: true, increaseDisabled: true }), 2);
  assert.equal(clampOrderPanelQuantity(1, 2, { allowHalfKits: true, increaseDisabled: true }), 1);
});
test("rejects invalid values rather than corrupting quantities and totals", () => {
  for (const value of [NaN, Infinity, -1, 0]) {
    assert.equal(clampOrderPanelQuantity(value, 1, { allowHalfKits: true }), null);
  }
});

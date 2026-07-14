import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOrders } from "./order.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";

test("shared sample orders satisfy the normalized order contract", () => {
  const normalized = normalizeOrders(SAMPLE_ORDERS);
  assert.deepEqual(
    normalized.map(order => order.id),
    ["ORD-001", "ORD-002", "ORD-003", "ORD-004"],
  );
  assert.equal(normalized.length, SAMPLE_ORDERS.length);
});

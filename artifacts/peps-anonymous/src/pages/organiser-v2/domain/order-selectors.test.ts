import assert from "node:assert/strict";
import test from "node:test";
import { countPendingPayments, toOverviewOrders } from "./order-selectors.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";

test("toOverviewOrders maps normalized products into display strings", () => {
  const rows = toOverviewOrders(SAMPLE_ORDERS);
  assert.equal(rows[0].products[0], "Semaglutide 5mg × 2");
  assert.equal(rows[0].memberName, "John D.");
});

test("countPendingPayments uses normalized pending status", () => {
  assert.equal(countPendingPayments(SAMPLE_ORDERS), 1);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  countPendingPayments,
  deriveOrderAttentionSummary,
  selectCompletedOrders,
  selectDispatchReadyOrders,
  selectNeedsActionOrders,
  selectPaymentAttentionOrders,
  toOverviewOrders,
} from "./order-selectors.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";
import type { OrganiserOrder } from "./order.ts";

function makeOrder(
  id: string,
  status: OrganiserOrder["status"],
  overrides: Partial<OrganiserOrder> = {},
): OrganiserOrder {
  return {
    id,
    code: `10${id.length}`,
    memberUsername: `${id}_user`,
    memberName: id,
    status,
    products: [{ name: "BPC-157", quantity: 1, price: 50 }],
    total: 50,
    paymentMethod: "Revolut",
    country: "United Kingdom",
    createdAt: "2026-07-10T12:00:00Z",
    shippingOption: "Tracked",
    ...overrides,
  };
}

test("toOverviewOrders maps normalized products into display strings", () => {
  const rows = toOverviewOrders(SAMPLE_ORDERS);
  assert.equal(rows[0].products[0], "Semaglutide 5mg × 2");
  assert.equal(rows[0].memberName, "John D.");
});

test("countPendingPayments uses normalized pending status", () => {
  assert.equal(countPendingPayments(SAMPLE_ORDERS), 1);
});

test("operational selectors respect live payment and fulfilment semantics", () => {
  const pending = makeOrder("pending", "pending", { total: 65 });
  const review = makeOrder("review", "pending", { paymentStatus: "pending_confirmation", total: 90 });
  const paid = makeOrder("paid", "paid");
  const processing = makeOrder("processing", "processing");
  const shipped = makeOrder("shipped", "shipped");
  const dispatched = makeOrder("dispatched", "dispatched");
  const delivered = makeOrder("delivered", "delivered");
  const cancelled = makeOrder("cancelled", "cancelled", { flagged: { note: "Old note" } });
  const flagged = makeOrder("flagged", "paid", { flagged: { note: "Address missing" } });
  const orders = [pending, review, paid, processing, shipped, dispatched, delivered, cancelled, flagged];

  assert.deepEqual(selectPaymentAttentionOrders(orders).map(order => order.id), ["pending", "review"]);
  assert.deepEqual(selectDispatchReadyOrders(orders).map(order => order.id), ["paid", "processing", "flagged"]);
  assert.deepEqual(selectCompletedOrders(orders).map(order => order.id), ["shipped", "dispatched", "delivered"]);
  assert.deepEqual(selectNeedsActionOrders(orders).map(order => order.id), ["pending", "review", "flagged"]);
  assert.deepEqual(deriveOrderAttentionSummary(orders), {
    paymentCount: 2,
    paymentTotal: 155,
    dispatchReadyCount: 3,
    needsActionCount: 3,
  });
});

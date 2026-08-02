import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOrder, normalizeOrders, normalizeOrdersWithIssues } from "./order.ts";

test("normalizeOrder preserves the complete legacy order shape", () => {
  const order = normalizeOrder({
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    paymentStatus: "pending_confirmation",
    products: [{ name: "Semaglutide 5mg", quantity: 2, price: 45 }],
    total: 90,
    paymentMethod: "USDT (TRC20)",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-10T15:00:00Z",
    shippingOption: "Standard Shipping (UK)",
    paymentProof: { type: "txid", value: "0xabc" },
    trackingNumber: "TRACK-1",
    internalNotes: "Use an ice pack",
    flagged: { note: "Express request", dueDate: "2026-07-15", dueTime: "12:00" },
  });

  assert.ok(order);
  assert.equal(order.status, "paid");
  assert.equal(order.paymentStatus, "pending_confirmation");
  assert.equal(order.products[0].quantity, 2);
  assert.equal(order.flagged?.note, "Express request");
  assert.equal(order.paymentProof?.value, "0xabc");
});

test("normalizeOrder accepts current statuses, maps the legacy payment alias, and rejects unknown statuses", () => {
  const base = {
    id: "ORD-002",
    memberUsername: "member",
    memberName: "Member",
    products: [],
    total: 0,
    paymentMethod: "Manual",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    shippingOption: "Collection",
  };

  assert.equal(normalizeOrder({ ...base, status: "dispatched" })?.status, "dispatched");
  assert.equal(normalizeOrder({ ...base, status: "awaiting_payment" })?.status, "pending");
  assert.equal(normalizeOrder({ ...base, status: "invented" }), null);
});

test("normalizeOrders drops malformed rows without dropping valid rows", () => {
  const result = normalizeOrdersWithIssues([
    {
      id: "ORD-003",
      memberUsername: "anna",
      memberName: "Anna P.",
      status: "processing",
      products: [{ name: "BPC-157", quantity: 2, price: 30 }],
      total: 60,
      paymentMethod: "PayPal",
      country: "Germany",
      createdAt: "2026-07-09T16:20:00Z",
      shippingOption: "EU Tracked",
    },
    { id: "broken" },
  ]);

  assert.deepEqual(result.orders.map(order => order.id), ["ORD-003"]);
  assert.deepEqual(result.issues, [{
    index: 1,
    code: "invalid_order",
    message: "Order record 2 could not be normalized",
  }]);
});

test("normalizeOrders gives valid id-less legacy rows a deterministic identifier", () => {
  const legacyRow = {
    memberUsername: "legacy_member",
    memberName: "Legacy Member",
    status: "awaiting_payment",
    products: [{ name: "BPC-157", quantity: 1, price: 30 }],
    total: 30,
    paymentMethod: "Manual",
    country: "UK",
    createdAt: "2026-07-01T09:00:00Z",
    shippingOption: "Collection",
  };

  const first = normalizeOrders([legacyRow])[0];
  const second = normalizeOrders([legacyRow])[0];
  assert.match(first.id, /^legacy-order-/);
  assert.equal(first.id, second.id);
});

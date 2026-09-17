import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalReshipperUsername,
  filterAssignedFulfilmentOrders,
} from "./reshipper-fulfilment";

test("canonicalReshipperUsername strips @, whitespace, and case", () => {
  assert.equal(canonicalReshipperUsername(" @Alice "), "alice");
});

test("filterAssignedFulfilmentOrders excludes unclaimed, other-reshipper, cancelled, and refunded orders", () => {
  const orders = [
    { id: "mine", reshipperUsername: "Alice", status: "Submitted", paymentStatus: "confirmed" },
    { id: "mine-case", reshipperUsername: "@ALICE", status: "Submitted", paymentStatus: "unpaid" },
    { id: "unclaimed", reshipperUsername: null, status: "Submitted", paymentStatus: "confirmed" },
    { id: "other", reshipperUsername: "Bob", status: "Submitted", paymentStatus: "confirmed" },
    { id: "cancelled", reshipperUsername: "Alice", status: "Cancelled", paymentStatus: "unpaid" },
    { id: "refunded", reshipperUsername: "Alice", status: "Submitted", paymentStatus: "refunded" },
  ];

  assert.deepEqual(
    filterAssignedFulfilmentOrders(orders, "@alice").map(order => order.id),
    ["mine", "mine-case"],
  );
});
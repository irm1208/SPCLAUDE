import assert from "node:assert/strict";
import test from "node:test";
import { buildOverviewSnapshot, type OverviewOrder } from "./overview-model.ts";

const orders: OverviewOrder[] = [
  {
    id: "ORD-001",
    status: "pending",
    total: 65,
    memberName: "Sarah M.",
    products: ["Tirzepatide 10mg × 1"],
    createdAt: "2026-07-11T09:15:00Z",
  },
  {
    id: "ORD-002",
    status: "paid",
    total: 120,
    memberName: "John D.",
    products: ["Semaglutide 5mg × 2"],
    createdAt: "2026-07-10T14:30:00Z",
  },
  {
    id: "ORD-003",
    status: "processing",
    total: 60,
    memberName: "Anna P.",
    products: ["BPC-157 5mg × 2"],
    createdAt: "2026-07-09T16:20:00Z",
  },
  {
    id: "ORD-004",
    status: "shipped",
    total: 135,
    memberName: "Mike F.",
    products: ["Semaglutide 5mg × 3"],
    createdAt: "2026-07-08T11:00:00Z",
  },
];

test("buildOverviewSnapshot groups orders into the approved board lanes", () => {
  const result = buildOverviewSnapshot(orders, 42, "GBP");

  assert.deepEqual(result.stageCounts, {
    awaiting: 1,
    paid: 1,
    packing: 1,
    dispatched: 1,
  });
  assert.equal(result.members, 42);
  assert.equal(result.revenue, 380);
  assert.equal(result.board[0].orders[0].memberName, "Sarah M.");
});

test("buildOverviewSnapshot returns stable zero states", () => {
  const result = buildOverviewSnapshot([], 0, "GBP");

  assert.equal(result.revenue, 0);
  assert.deepEqual(result.stageCounts, {
    awaiting: 0,
    paid: 0,
    packing: 0,
    dispatched: 0,
  });
  assert.equal(result.board.every(column => column.orders.length === 0), true);
});

test("buildOverviewSnapshot excludes cancelled orders from revenue and lanes", () => {
  const result = buildOverviewSnapshot([
    ...orders,
    {
      id: "ORD-005",
      status: "cancelled",
      total: 999,
      memberName: "Cancelled Member",
      products: ["Cancelled product"],
      createdAt: "2026-07-07T11:00:00Z",
    },
  ], 42, "GBP");

  assert.equal(result.revenue, 380);
  assert.equal(result.board.every(column => column.orders.every(order => order.id !== "ORD-005")), true);
});

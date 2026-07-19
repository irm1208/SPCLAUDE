import assert from "node:assert/strict";
import test from "node:test";
import { createMemberDirectory, mergeMemberDirectory } from "./member.ts";
import type { OrganiserOrder } from "./order.ts";

const orders: OrganiserOrder[] = [
  {
    id: "ORD-1", memberUsername: "alex", memberName: "Alex R.", status: "paid",
    products: [{ name: "BPC-157", quantity: 2, price: 30 }], total: 60,
    paymentMethod: "Bank", country: "UK", createdAt: "2026-07-01T10:00:00Z",
    paidAt: "2026-07-01T11:00:00Z", shippingOption: "Tracked",
  },
  {
    id: "ORD-2", memberUsername: "alex", memberName: "Alex R.", status: "dispatched",
    products: [{ name: "Semaglutide", quantity: 1, price: 45 }], total: 45,
    paymentMethod: "Bank", country: "UK", createdAt: "2026-07-02T10:00:00Z",
    paidAt: "2026-07-02T11:00:00Z", shippingOption: "Tracked", trackingNumber: "TRACK-2",
  },
  {
    id: "ORD-3", memberUsername: "sam", memberName: "Sam K.", status: "pending",
    products: [], total: 35, paymentMethod: "Crypto", country: "France",
    createdAt: "2026-07-03T10:00:00Z", shippingOption: "EU tracked",
  },
];

test("createMemberDirectory aggregates group-buy participation", () => {
  const members = createMemberDirectory(orders);
  assert.equal(members.length, 2);
  assert.deepEqual(members.find(member => member.id === "alex"), {
    id: "alex",
    username: "alex",
    name: "Alex R.",
    country: "UK",
    orderCount: 2,
    totalSpent: 105,
    paidCount: 2,
    pendingCount: 0,
    fulfilmentCount: 1,
    productCount: 3,
    lastOrderAt: "2026-07-02T10:00:00Z",
    orderIds: ["ORD-2", "ORD-1"],
    attention: false,
  });
  assert.equal(members.find(member => member.id === "sam")?.attention, true);
  assert.equal(members.find(member => member.id === "sam")?.pendingCount, 1);
});

test("mergeMemberDirectory includes joined members who have not ordered yet", () => {
  const members = mergeMemberDirectory(orders, [
    { telegramUsername: "alex", hasTelegram: true },
    { telegramUsername: "new_member", hasTelegram: false },
  ]);

  assert.equal(members.length, 3);
  assert.deepEqual(members.find(member => member.id === "new_member"), {
    id: "new_member",
    username: "new_member",
    name: "New Member",
    country: "Unknown",
    orderCount: 0,
    totalSpent: 0,
    paidCount: 0,
    pendingCount: 0,
    fulfilmentCount: 0,
    productCount: 0,
    lastOrderAt: null,
    orderIds: [],
    attention: false,
    hasTelegram: false,
  });
  assert.equal(members.find(member => member.id === "alex")?.hasTelegram, true);
});

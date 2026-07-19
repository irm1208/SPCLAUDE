import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiOrderRepository,
  toApiOrderPatch,
  type ApiOrderClient,
} from "./api-order-repository.ts";
import type { OrganiserOrder } from "./order.ts";

const pendingOrder: OrganiserOrder = {
  id: "order-1",
  code: "GB-1042",
  memberUsername: "member_one",
  memberName: "Member One",
  status: "pending",
  apiStatus: "Submitted",
  paymentStatus: "unpaid",
  products: [{ id: "line-1", productId: "product-1", name: "Tirzepatide 10mg", quantity: 1, price: 40 }],
  total: 45,
  paymentMethod: "Revolut",
  country: "United Kingdom",
  createdAt: "2026-07-15T10:00:00.000Z",
  shippingOption: "UK Tracked",
};

function setup() {
  const updates: Array<{ orderId: string; body: Record<string, unknown> }> = [];
  let loadCount = 0;
  const client: ApiOrderClient = {
    async listOrders() {
      loadCount += 1;
      return [{ ...pendingOrder, status: loadCount > 1 ? "paid" : "pending", paymentStatus: loadCount > 1 ? "confirmed" : "unpaid" }];
    },
    async updateOrder(orderId, body) {
      updates.push({ orderId, body });
    },
  };
  const repository = createApiOrderRepository({ groupBuyId: "gb-1", client });
  return { repository, updates, getLoadCount: () => loadCount };
}

test("API order repository hydrates and publishes the server snapshot", async () => {
  const { repository } = setup();
  let notifications = 0;
  repository.subscribe(() => { notifications += 1; });

  assert.equal(repository.getLoadState(), "idle");
  await repository.load();

  assert.equal(repository.getLoadState(), "ready");
  assert.deepEqual(repository.getSnapshot().map(order => order.id), ["order-1"]);
  assert.equal(repository.getSnapshot()[0].status, "pending");
  assert.ok(notifications >= 2);
});

test("replaceOne persists a minimal API patch and refreshes authoritative data", async () => {
  const { repository, updates, getLoadCount } = setup();
  await repository.load();
  const current = repository.getSnapshot()[0];

  await repository.replaceOne(
    { ...current, status: "paid", internalNotes: "Payment checked" },
    { type: "order.updated", actorId: "organiser", summary: "Updated order-1" },
  );

  assert.deepEqual(updates, [{
    orderId: "order-1",
    body: { paymentStatus: "confirmed", adminNotes: "Payment checked" },
  }]);
  assert.equal(getLoadCount(), 2);
  assert.equal(repository.getSnapshot()[0].status, "paid");
});

test("updateMany persists every changed order before one refresh", async () => {
  const { repository, updates, getLoadCount } = setup();
  await repository.load();

  await repository.updateMany(
    ["order-1"],
    order => ({ ...order, status: "shipped", trackingNumber: "TRACK-2" }),
    { type: "order.bulk_dispatched", actorId: "organiser", summary: "Dispatched one order" },
  );

  assert.deepEqual(updates, [{
    orderId: "order-1",
    body: { status: "Shipped", trackingNumber: "TRACK-2" },
  }]);
  assert.equal(getLoadCount(), 2);
});

test("toApiOrderPatch maps editable products using server line-item identifiers", () => {
  const next: OrganiserOrder = {
    ...pendingOrder,
    products: [{ ...pendingOrder.products[0], quantity: 2 }],
    paymentProof: { type: "txid", value: "0xabc" },
  };

  assert.deepEqual(toApiOrderPatch(pendingOrder, next), {
    paymentTxHash: "0xabc",
    lineItemUpdates: [{ id: "line-1", productId: "product-1", quantity: 2 }],
  });
});

test("failed loads expose an error without replacing the previous snapshot", async () => {
  const client: ApiOrderClient = {
    async listOrders() { throw new Error("Network unavailable"); },
    async updateOrder() {},
  };
  const repository = createApiOrderRepository({ groupBuyId: "gb-1", client });

  await assert.rejects(repository.load(), /Network unavailable/);
  assert.equal(repository.getLoadState(), "error");
  assert.equal(repository.getError()?.message, "Network unavailable");
  assert.deepEqual(repository.getSnapshot(), []);
});

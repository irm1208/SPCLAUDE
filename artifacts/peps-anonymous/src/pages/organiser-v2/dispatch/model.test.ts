import test from "node:test";
import assert from "node:assert/strict";
import {
  computeFulfilment,
  confirmDispatch,
  getReminderEligibleOrders,
  getReadyCount,
  getReachableStages,
  restoreDispatch,
  selectParcels,
  selectParcelsAndCompute,
  type DeskState,
} from "./model.ts";
import type { DeliveredParcel, DispatchOrder } from "./types.ts";

const baseState: DeskState = {
  stage: "receive",
  view: "desk",
  scopeType: "all",
  scopeId: "",
  parcels: [],
  orders: [],
  selectedParcelIds: [],
  fulfilment: null,
  selectedOrderIds: [],
  log: [],
};

const fixtureParcels: DeliveredParcel[] = [{
  id: "parcel-a",
  label: "Inbound 01",
  trackingNumber: "TRACK-01",
  carrier: "Royal Mail",
  status: "delivered",
  receivedAt: "2026-07-12T09:00:00Z",
  items: [{ productId: "product-a", name: "Semaglutide 5mg", quantity: 4, dispatchedQuantity: 0 }],
}];

const fixtureOrders: DispatchOrder[] = [
  {
    id: "order-a", code: "GB-1042", memberName: "Alice", telegramUsername: "alice",
    deliveryMethod: "Royal Mail", shippingCountry: "UK", qrState: "not_required",
    items: [{ productId: "product-a", name: "Semaglutide 5mg", quantity: 2 }],
  },
  {
    id: "order-b", code: "GB-1043", memberName: "Ben", telegramUsername: "ben",
    deliveryMethod: "InPost", shippingCountry: "UK", qrState: "reminder_needed",
    items: [{ productId: "product-a", name: "Semaglutide 5mg", quantity: 5 }],
  },
];

test("only Receive is reachable before parcels are selected", () => {
  assert.deepEqual(getReachableStages(baseState), ["receive"]);
});

test("Dispatch is reachable only when a computed ready order is selected", () => {
  const computedWithoutSelection: DeskState = {
    ...baseState,
    selectedParcelIds: ["parcel-a"],
    fulfilment: [],
    selectedOrderIds: [],
  };
  assert.deepEqual(getReachableStages(computedWithoutSelection), ["receive", "prepare"]);
  assert.deepEqual(getReachableStages({ ...computedWithoutSelection, selectedOrderIds: ["order-a"] }), ["receive", "prepare", "dispatch"]);
});

test("changing parcel selection clears stale fulfilment and selected orders", () => {
  const next = selectParcels({
    ...baseState,
    stage: "dispatch",
    selectedParcelIds: ["parcel-a"],
    fulfilment: [],
    selectedOrderIds: ["order-a"],
  }, ["parcel-b"]);

  assert.equal(next.stage, "receive");
  assert.deepEqual(next.selectedParcelIds, ["parcel-b"]);
  assert.equal(next.fulfilment, null);
  assert.deepEqual(next.selectedOrderIds, []);
});

test("selecting parcels immediately computes and selects ready orders", () => {
  const next = selectParcelsAndCompute({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
  }, ["parcel-a"]);

  assert.deepEqual(next.selectedParcelIds, ["parcel-a"]);
  assert.equal(next.fulfilment?.length, 2);
  assert.deepEqual(next.selectedOrderIds, ["order-a"]);
  assert.equal(getReadyCount(next), 1);
});

test("clearing parcels clears fulfilment and ready count", () => {
  const computed = selectParcelsAndCompute({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
  }, ["parcel-a"]);
  const next = selectParcelsAndCompute(computed, []);

  assert.equal(next.fulfilment, null);
  assert.deepEqual(next.selectedOrderIds, []);
  assert.equal(getReadyCount(next), 0);
});

test("computeFulfilment separates ready orders and selects them by default", () => {
  const next = computeFulfilment({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
    selectedParcelIds: ["parcel-a"],
  });
  assert.deepEqual(next.fulfilment?.map(row => [row.order.id, row.ready]), [["order-a", true], ["order-b", false]]);
  assert.deepEqual(next.selectedOrderIds, ["order-a"]);
  assert.equal(next.stage, "prepare");
});

test("QR reminders include only selected orders that still need a QR", () => {
  const selected = [
    { ...fixtureOrders[0], id: "a", qrState: "reminder_needed" as const },
    { ...fixtureOrders[0], id: "b", qrState: "uploaded" as const },
    { ...fixtureOrders[0], id: "c", qrState: "not_required" as const },
  ];
  assert.deepEqual(getReminderEligibleOrders(selected).map(order => order.id), ["a"]);
});

test("confirmDispatch moves selected orders to the log and deducts parcel stock", () => {
  const computed = computeFulfilment({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
    selectedParcelIds: ["parcel-a"],
  });
  const next = confirmDispatch(computed, "2026-07-12T12:00:00Z");
  assert.deepEqual(next.log.map(record => record.id), ["order-a"]);
  assert.equal(next.parcels[0].items[0].dispatchedQuantity, 2);
  assert.deepEqual(next.selectedOrderIds, []);
  assert.deepEqual(next.selectedParcelIds, []);
  assert.equal(next.stage, "receive");
});

test("restoreDispatch returns an order to the queue and restores parcel stock", () => {
  const computed = computeFulfilment({
    ...baseState,
    parcels: fixtureParcels,
    orders: fixtureOrders,
    selectedParcelIds: ["parcel-a"],
  });
  const dispatched = confirmDispatch(computed, "2026-07-12T12:00:00Z");
  const restored = restoreDispatch(dispatched, "order-a");
  assert.equal(restored.log.length, 0);
  assert.equal(restored.orders[0].id, "order-a");
  assert.equal(restored.parcels[0].items[0].dispatchedQuantity, 0);
});

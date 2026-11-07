import { describe, expect, it } from "vitest";
import { buildShipmentContext, linkedShipmentBlocker } from "./linked-shipment-context";

const order = (id: string, additionOfOrderId: string | null = null, extra = {}) => ({
  id, code: id, additionOfOrderId, groupBuyId: "gb", telegramUsername: "buyer",
  status: "Processing", paymentStatus: "confirmed", amountDue: "0", deliveryPrice: "0",
  currency: "USD", reshipperUsername: "shipper", ...extra,
});
const line = (orderId: string, quantity = 2) => ({ orderId, productId: "p", productName: "Product", quantity });
const batch = (id: string, ids: string[], state = "ordered") => ({
  id, reference: id, state, snapshot: { orders: ids.map(id => ({ id, items: [line(id)], kits: 2 })) },
});
const receipt = (batchId: string, ids: string[]) => ({
  batchId, recipientUsername: "shipper", receiptChecked: 1, cancelledAt: null,
  contents: ids.map(id => ({ ...line(id), code: id, username: "buyer" })),
  receipt: ids.map(orderId => ({ orderId, productId: "p", good: 2, damaged: 0 })),
});
const build = (orders: any[], batches: any[], shipments: any[] = []) =>
  buildShipmentContext(orders, orders.map(o => line(o.id)), batches, shipments);

describe("batch-aware linked shipment boundaries", () => {
  it("keeps a later-batch addition separate and allows the ready original", () => {
    const ctx = build([order("parent"), order("child", "parent")],
      [batch("one", ["parent"]), batch("two", ["child"])], [receipt("one", ["parent"]), receipt("two", ["child"])]);
    expect(ctx[0].shipmentOrderIds).toEqual(["parent"]);
    expect(ctx[0].separateOrderIds).toEqual(["child"]);
    expect(ctx[0].relatedOrderIds).toEqual(["child"]);
    expect(linkedShipmentBlocker(ctx, ["parent"])).toBeNull();
    expect(ctx[1].shippingTotal).toBe(0);
  });
  it("requires the combined workflow only for a fully allocated same-batch family", () => {
    const ctx = build([order("parent"), order("child", "parent")], [batch("one", ["parent", "child"])],
      [receipt("one", ["parent", "child"])]);
    expect(ctx[0].shipmentOrderIds).toEqual(["parent", "child"]);
    expect(linkedShipmentBlocker(ctx, ["parent"])).toMatch(/Linked orders/);
  });
  it("does not let an unpaid later addition block its paid original", () => {
    const ctx = build([order("parent"), order("child", "parent", { paymentStatus: "unpaid" })],
      [batch("one", ["parent"]), batch("two", ["child"])], [receipt("one", ["parent"])]);
    expect(linkedShipmentBlocker(ctx, ["parent"])).toBeNull();
    expect(linkedShipmentBlocker(ctx, ["child"])).toMatch(/payment/i);
  });
  it("shows a shipped original as context, never includes it in the new parcel", () => {
    const ctx = build([order("parent", null, { status: "Shipped" }), order("child", "parent")],
      [batch("one", ["parent", "child"])], [receipt("one", ["child"])]);
    expect(ctx[1].shipmentOrderIds).toEqual(["child"]);
    expect(ctx[1].separateOrderIds).toEqual(["parent"]);
    expect(linkedShipmentBlocker(ctx, ["child"])).toBeNull();
  });
  it("keeps later-batch siblings individually dispatchable when the original is in another batch", () => {
    const ctx = build([order("parent"), order("child", "parent"), order("second", "parent")],
      [batch("one", ["parent"]), batch("two", ["child", "second"])],
      [receipt("one", ["parent"]), receipt("two", ["child", "second"])]);
    expect(ctx[1].shipmentOrderIds).toEqual(["child"]);
    expect(linkedShipmentBlocker(ctx, ["child"])).toBeNull();
  });
  it("ignores released batches and blocks unallocated families for review", () => {
    const ctx = build([order("parent"), order("child", "parent")], [batch("old", ["parent", "child"], "released")]);
    expect(ctx[0].batches).toEqual([]);
    expect(linkedShipmentBlocker(ctx, ["parent"])).toMatch(/allocat/i);
  });
  it("does not invent a single allocation for quantities split across batches", () => {
    const first = batch("one", ["parent", "child"]);
    const second = batch("two", ["child"]);
    first.snapshot.orders[1].items[0].quantity = 1;
    second.snapshot.orders[0].items[0].quantity = 1;
    const ctx = build([order("parent"), order("child", "parent")], [first, second]);
    expect(ctx[1].batches.map(b => b.kits)).toEqual([1, 1]);
    expect(ctx[1].allocationComplete).toBe(true);
    expect(ctx[1].reviewReason).toMatch(/multiple/i);
    expect(linkedShipmentBlocker(ctx, ["parent"])).toMatch(/allocat/i);
  });
  it("compares allocation product identities and quantities rather than equal kit totals", () => {
    const b = batch("one", ["parent", "child"]);
    b.snapshot.orders[1].items[0].productId = "different";
    const ctx = build([order("parent"), order("child", "parent")], [b]);
    expect(ctx[1].allocationComplete).toBe(false);
  });
  it("does not expose a parent or siblings omitted by role authorization or with a different member", () => {
    const ctx = build([order("child", "hidden"), order("other", null, { telegramUsername: "other" })],
      [batch("one", ["child", "other"])]);
    expect(ctx[0].additionOfOrderId).toBeNull();
    expect(ctx[0].relatedOrderIds).toEqual([]);
    expect(ctx[0].reviewReason).toMatch(/unavailable/i);
  });
  it("requires checked usable receipts for the exact order, product, batch and reshipper", () => {
    const orders = [order("parent"), order("child", "parent")];
    for (const bad of [
      { ...receipt("one", ["parent"]), receiptChecked: 0 },
      { ...receipt("one", ["parent"]), recipientUsername: "other" },
      receipt("wrong-batch", ["parent"]),
      { ...receipt("one", ["parent"]), receipt: [{ orderId: "parent", productId: "p", good: 1, damaged: 1 }] },
    ]) {
      expect(linkedShipmentBlocker(build(orders, [batch("one", ["parent"]), batch("two", ["child"])], [bad]), ["parent"]))
        .toMatch(/receipt/i);
    }
  });
});

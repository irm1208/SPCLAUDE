import { describe, expect, it } from "vitest";
import { batchAdditions, splitBatchQuantities } from "./supplier-batch-additions";
import { splitOrderReadiness } from "./supplier-fulfilment-model";
const order = { id: "o", code: "123", username: "member", country: "GB", kits: 3,
  paidAt: "2026-10-20", orderingAt: "2026-10-20", historicalReviewed: false, money: ["450"],
  items: [{ productId: "p", productName: "HGH", quantity: 3, unitPrice: "150", lineTotal: "450" }] };
const batch: any = { id: "b", snapshot: { region: { id: "gb", targetKits: 50 }, token: "old", orders: [order], kits: 3 } };
describe("supplier batch quantity additions", () => {
  it("highlights only the positive product quantity increase recorded by a reviewed update", () => {
    const additions = batchAdditions(batch, [{ kind: "refreshed", detail: { batchId: "b",
      changes: [{ orderId: "o", before: { ...order, items: [{ ...order.items[0], quantity: 1 }] }, after: order }] } }]);
    expect(additions).toEqual([{ orderId: "o", productId: "p", productName: "HGH", quantity: 2 }]);
  });
  it("does not treat a newly appended whole order as extra customer quantities", () => {
    expect(batchAdditions(batch, [{ kind: "appended", detail: { batchId: "b", orderIds: ["o"] } }])).toEqual([]);
  });
  const edit = (quantity: string) => ({ metadata: { orderId: "o", before: {
    lineItems: [{ productName: "HGH", quantity }],
  }, after: { lineItems: [{ productName: "HGH", quantity: "3" }] } } });
  it("uses the original customer quantities even when the increase happened before batch allocation", () => {
    expect(batchAdditions(batch, [{ kind: "appended", detail: { batchId: "b", orderIds: ["o"] } }], [edit("1")]))
      .toEqual([{ orderId: "o", productId: "p", productName: "HGH", quantity: 2 }]);
  });
  it("deducts previously moved extras and retains the original kits in the source", () => {
    const history = [{ kind: "quantities_moved", detail: { batchId: "b", targetBatchId: "destination",
      lines: [{ orderId: "o", productId: "p", quantity: 1 }] } }];
    const source = { ...batch, snapshot: { ...batch.snapshot, orders: [{
      ...order, kits: 2, fullOrder: order, items: [{ ...order.items[0], quantity: 2 }],
    }] } };
    expect(batchAdditions(source, history, [edit("1")])[0].quantity).toBe(1);
    expect(batchAdditions({ ...batch, id: "destination" }, history, [edit("1")])).toEqual([]);
  });
  it("never advertises a duplicate product-name audit as a safe quantity to move", () => {
    const ambiguous = { ...batch, snapshot: { ...batch.snapshot, orders: [{ ...order,
      items: [...order.items, { ...order.items[0], productId: "another" }],
    }] } };
    expect(batchAdditions(ambiguous, [], [edit("1")])).toEqual([]);
  });
  it("does not count the same increase once in customer history and again in batch review", () => {
    const history = [{ kind: "refreshed", detail: { batchId: "b", changes: [{
      orderId: "o", before: { items: [{ ...order.items[0], quantity: 2 }] }, after: order,
    }] } }];
    expect(batchAdditions(batch, history, [edit("1")])[0].quantity).toBe(2);
  });
  it("uses the earliest original quantity rather than accumulating subsequent edits", () => {
    expect(batchAdditions(batch, [], [edit("1"), edit("2")])[0].quantity).toBe(2);
  });
  it("makes the true extras available again after their earlier move is undone", () => {
    const history = [
      { id: "move", kind: "quantities_moved", detail: { batchId: "b",
        lines: [{ orderId: "o", productId: "p", quantity: 2 }] } },
      { id: "undo", kind: "move_undone", detail: { moveEventId: "move", batchId: "b" } },
    ];
    expect(batchAdditions(batch, history, [edit("1")])[0].quantity).toBe(2);
  });
  it("does not turn a reduction followed by a partial restoration into an addition", () => {
    const history = [1, 2].map((q, index) => ({ kind: "refreshed", detail: { batchId: "b", changes: [{
      orderId: "o", before: { items: [{ ...order.items[0], quantity: index ? 1 : 3 }] },
      after: { items: [{ ...order.items[0], quantity: q }] },
    }] } }));
    expect(batchAdditions({ ...batch, snapshot: { ...batch.snapshot, orders: [{
      ...order, items: [{ ...order.items[0], quantity: 2 }],
    }] } }, history)).toEqual([]);
  });
  it("splits just one extra kit without splitting the customer's payment or order identity", () => {
    const r = splitBatchQuantities(batch, [{ orderId: "o", productId: "p", quantity: 1 }]);
    expect(r.remaining.kits).toBe(2);
    expect(r.moved.kits).toBe(1);
    expect(r.remaining.orders[0].id).toBe("o");
    expect(r.moved.orders[0].id).toBe("o");
    expect(r.moved.orders[0].fullOrder.money).toEqual(["450"]);
    expect(r.remaining.orders[0].items[0].lineTotal).toBe("300.00");
    expect(r.moved.orders[0].allocationRootBatchId).toBe("b");
    expect(order.items[0].quantity).toBe(3);
  });
  it.each([0, -1, 0.1, 4, NaN])("rejects invalid or excessive quantities %s", quantity => {
    expect(() => splitBatchQuantities(batch, [{ orderId: "o", productId: "p", quantity }])).toThrow();
  });
  it("does not move a product line twice", () => {
    const line = { orderId: "o", productId: "p", quantity: 1 };
    expect(() => splitBatchQuantities(batch, [line, line])).toThrow();
  });
  it("keeps dispatch blocked until every split portion is received, without inflating local counts", () => {
    const slice = splitBatchQuantities(batch, [{ orderId: "o", productId: "p", quantity: 1 }]).remaining.orders[0];
    const parcel = (q: number, good: number) => ({ receiptChecked: true,
      contents: [{ orderId: "o", productId: "p", productName: "HGH", username: "member", code: "123", quantity: q }],
      receipt: [{ orderId: "o", productId: "p", good, damaged: 0 }] });
    expect(splitOrderReadiness(slice, [parcel(2, 2)], [], [parcel(1, 0)]).ready).toBe(false);
    const ready = splitOrderReadiness(slice, [parcel(2, 2)], [], [parcel(1, 1)]);
    expect(ready.ready).toBe(true);
    expect(ready.items[0].quantity).toBe(2);
    expect(ready.items[0].received).toBe(2);
  });
});

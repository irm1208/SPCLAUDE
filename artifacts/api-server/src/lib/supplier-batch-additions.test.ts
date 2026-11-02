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
  it("treats a newly appended row as an addition to the batch", () => {
    expect(batchAdditions(batch, [{ kind: "appended", detail: { batchId: "b", orderIds: ["o"] } }])[0].quantity).toBe(3);
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

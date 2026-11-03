import { describe, expect, it } from "vitest";
import { planMoveUndo } from "./supplier-batch-undo";
import { splitBatchQuantities } from "./supplier-batch-additions";
const snapshot: any = {
  token: "original", region: { id: "gb", name: "UK", countries: ["GB"], targetKits: 50 },
  kits: 2, orders: [{ id: "order", code: "123", username: "synthetic", country: "GB",
    kits: 2, money: ["303"], paidAt: "2026-10-23", orderingAt: "2026-10-23", historicalReviewed: false,
    items: [{ productId: "p", productName: "HGH", quantity: 2, unitPrice: "150", lineTotal: "300" }],
  }],
};
function fixture(quantity = 2) {
  const lines = [{ orderId: "order", productId: "p", quantity }];
  const split = splitBatchQuantities({ id: "source", snapshot }, lines);
  return {
    source: { id: "source", groupBuyId: "group", state: "ordered", snapshot: split.remaining },
    target: { id: "target", groupBuyId: "group", state: "prepared", snapshot: split.moved },
    event: { id: "legacy", kind: "quantities_moved", detail: {
      batchId: "source", targetBatchId: "target", beforeSnapshot: snapshot,
      orderIds: ["order"], lines, packageChanges: [],
    } },
  };
}
describe("supplier move undo reconstruction", () => {
  it("supports historical quantity moves that mistakenly transferred the complete order", () => {
    const f = fixture();
    expect(planMoveUndo(f.source, f.target, f.event).moved.orders[0].fullOrder).toBeUndefined();
    expect(f.source.snapshot.kits).toBe(0);
    expect(f.target.snapshot.kits).toBe(2);
  });
  it("supports genuine partial moves without losing their full-order reservation", () => {
    const f = fixture(1);
    expect(planMoveUndo(f.source, f.target, f.event).moved.orders[0].fullOrder.kits).toBe(2);
  });
  it.each(["source", "target"] as const)("rejects later changes to the %s snapshot", which => {
    const f = fixture();
    f[which].snapshot.token = "later-change";
    expect(() => planMoveUndo(f.source, f.target, f.event)).toThrow(/changed/);
  });
  it("rejects a changed money or product snapshot even if a stale token was retained", () => {
    const f = fixture();
    f.target.snapshot.orders[0].items[0].quantity = 3;
    expect(() => planMoveUndo(f.source, f.target, f.event)).toThrow(/changed/);
  });
  it("rejects submitted, released and cross-group destinations", () => {
    for (const state of ["ordered", "released"]) {
      const f = fixture(); f.target.state = state;
      expect(() => planMoveUndo(f.source, f.target, f.event)).toThrow(/destination still prepared/);
    }
    const f = fixture(); f.target.groupBuyId = "another";
    expect(() => planMoveUndo(f.source, f.target, f.event)).toThrow();
  });
});

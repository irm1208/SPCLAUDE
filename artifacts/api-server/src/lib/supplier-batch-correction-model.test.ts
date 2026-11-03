import { describe, expect, it } from "vitest";
import { correctionSnapshots } from "./supplier-batch-correction-model";
const order = (id: string, kits: number) => ({
  id, code: id, username: id, country: "GB", kits, paidAt: "2026-10-20T00:00:00Z",
  orderingAt: "2026-10-20T00:00:00Z", historicalReviewed: false, money: [],
  items: [{ productId: "hgh", productName: "HGH 36IU", quantity: kits, unitPrice: "150", lineTotal: String(kits * 150) }],
});
const snapshot = { token: "old", region: { id: "gb", name: "GB", countries: ["GB"], targetKits: 50 },
  readyAt: null, orders: [order("other", 58), order("first", 2), order("second", 4)], kits: 64 };
describe("whole-order supplier batch correction", () => {
  it("moves six complete kits, leaving 58 plus the other batch's 11 = 69", () => {
    const result = correctionSnapshots(snapshot, ["first", "second"]);
    expect(result.remaining.kits).toBe(58);
    expect(result.remaining.kits + 11).toBe(69);
    expect(result.moved.kits).toBe(6);
    expect(result.remaining.products[0].quantity).toBe(58);
    expect(result.moved.products[0].quantity).toBe(6);
    expect(result.moved.orders.map(o => o.id)).toEqual(["first", "second"]);
    expect(snapshot.orders).toHaveLength(3);
    expect(result.remaining.token).not.toBe("old");
  });
  it.each([{ ids: [] }, { ids: ["missing"] }, { ids: ["first", "first"] }])("rejects invalid selections $ids", ({ ids }) => {
    expect(() => correctionSnapshots(snapshot, ids)).toThrow();
  });
});

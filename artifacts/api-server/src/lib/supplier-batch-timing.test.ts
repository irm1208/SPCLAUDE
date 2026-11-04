import { describe, expect, it } from "vitest";
import { appendedBatchOrders, postPreparationAdditions } from "./supplier-batch-additions";

const item = { productId: "p", productName: "HGH", quantity: 20, unitPrice: "150", lineTotal: "3000" };
const order = (id: string, kits: number) => ({ id, code: id, kits, items: [{ ...item, quantity: kits }] });
const batch: any = { id: "b", state: "ordered", createdAt: "2026-10-23T08:06:00Z",
  snapshot: { orders: [order("original", 20), order("late-one", 2), order("late-two", 4)] } };
const append = { kind: "appended", createdAt: "2026-10-23T13:20:34.000Z",
  detail: { batchId: "b", orderIds: ["late-one", "late-two"] } };
const edit = (orderId: string, quantity: number, createdAt: string) => ({
  createdAt, metadata: { orderId, before: { lineItems: [{ productName: "HGH", quantity }] },
    after: { lineItems: [{ productName: "HGH", quantity: 20 }] } },
});

describe("batch additions after preparation", () => {
  it("labels the two appended allocations as 2 and 4 kits, never the original 20-kit order", () => {
    expect(appendedBatchOrders(batch, [append])).toEqual([
      { orderId: "late-one", kits: 2, addedAt: append.createdAt },
      { orderId: "late-two", kits: 4, addedAt: append.createdAt },
    ]);
    expect(postPreparationAdditions(batch, [append], [
      edit("original", 10, "2026-10-22T15:31:00Z"),
      edit("late-one", 1, "2026-10-22T15:48:00Z"),
    ])).toEqual([]);
  });
  it("only offers quantity increases evidenced after preparation", () => {
    expect(postPreparationAdditions(batch, [], [
      edit("original", 10, "2026-10-22T15:31:00Z"),
      edit("original", 18, "2026-10-24T10:00:00Z"),
    ])).toEqual([{ orderId: "original", productId: "p", productName: "HGH", quantity: 2 }]);
  });
  it("does not also advertise a late whole order as a customer quantity increase", () => {
    expect(postPreparationAdditions(batch, [append], [edit("late-one", 1, "2026-10-24T10:00:00Z")])).toEqual([]);
  });
  it("stops showing allocations that have moved out, and uses remaining split quantities", () => {
    const current = { ...batch, snapshot: { orders: [
      order("original", 20), { ...order("late-two", 1), allocationRootBatchId: "b" },
    ] } };
    expect(appendedBatchOrders(current, [append])).toEqual([{ orderId: "late-two", kits: 1, addedAt: append.createdAt }]);
    expect(appendedBatchOrders({ ...current, id: "destination" }, [append])).toEqual([]);
  });
  it("does not flag released history or infer timings from missing evidence", () => {
    expect(appendedBatchOrders({ ...batch, state: "released" }, [append])).toEqual([]);
    expect(postPreparationAdditions({ ...batch, state: "released" }, [], [edit("original", 10, "2026-10-24")])).toEqual([]);
    expect(appendedBatchOrders(batch, [{ ...append, createdAt: undefined }])).toEqual([]);
    expect(postPreparationAdditions(batch, [], [edit("original", 10, "")])).toEqual([]);
  });
  it("does not treat pre-preparation or other-batch events as append evidence", () => {
    expect(appendedBatchOrders(batch, [
      { ...append, createdAt: "2026-10-22T10:00:00Z" },
      { ...append, detail: { ...append.detail, batchId: "other" } },
    ])).toEqual([]);
  });
});

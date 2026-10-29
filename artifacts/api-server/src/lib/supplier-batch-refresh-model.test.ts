import { describe, expect, it } from "vitest";
import { snapshotOrder, propose, fingerprint } from "./supplier-batches-model";
import { buildPreparedBatchRefresh } from "./supplier-batch-refresh-model";

const order = (id: string, quantity: number, extra: any = {}) => ({
  id, code: id, telegramUsername: `@${id}`, groupBuyId: "group", shippingCountry: "United Kingdom",
  status: "Submitted", paymentStatus: "confirmed", amountDue: "0", grandTotal: String(quantity * 150 + 3),
  productSubtotal: String(quantity * 150), vendorShipping: "0", creditsApplied: "0",
  paymentConfirmedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  lineItems: [{ productId: "hgh", productName: "HGH 36IU", quantity: String(quantity), unitPrice: "150", lineTotal: String(quantity * 150) }],
  ...extra,
});
const region = { id: "uk", name: "United Kingdom", countries: ["GB"], targetKits: 50 };
function setup() {
  const before = [order("changed", 3), order("unchanged", 71)];
  const batch = { id: "batch", groupBuyId: "group", reference: "GB-TEST / 004", state: "prepared",
    snapshot: { ...propose(before.map(o => snapshotOrder(o)), 50, true), region, token: "saved" } };
  const data = { config: { enabled: true, telegramAlerts: false, regions: [region] }, stored: { version: 1 },
    all: [order("changed", 5), before[1]], elig: [], used: before.map(o => ({ orderId: o.id, batchId: batch.id })) };
  return { batch, data, allocations: data.used };
}
describe("reviewing prepared batch changes", () => {
  it("reviews 74→76 kits, preserving every existing order and showing 3→5", () => {
    const f = setup(), review = buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD");
    expect(review).toMatchObject({ reference: "GB-TEST / 004", expectedBatchToken: "saved", canConfirm: true,
      before: { kits: 74, orderCount: 2 }, after: { kits: 76, orderCount: 2 }, blockers: [] });
    expect(review.changes).toHaveLength(1);
    expect(review.changes[0]).toMatchObject({ before: { kits: 3 }, after: { kits: 5 } });
    expect(review.orders.map(o => o.id).sort()).toEqual(["changed", "unchanged"]);
  });
  it.each([
    [{ paymentStatus: "unpaid" }, /payment/i],
    [{ amountDue: "300" }, /balance/i],
    [{ balancePaymentStatus: "verifying" }, /balance/i],
    [{ refundStatus: "requested" }, /refund/i],
    [{ activeRefund: true }, /refund/i],
    [{ deletedAt: "2026-01-02" }, /deleted/i],
    [{ routingType: "direct" }, /Direct Shipping/i],
    [{ shippingCountry: "Germany" }, /region/i],
    [{ status: "Processing" }, /Processing/i],
    [{ batchLocked: true }, /locked/i],
  ])("blocks unsafe updates %j without dropping the changed order", (extra, message) => {
    const f = setup(); Object.assign(f.data.all[0], extra);
    const review = buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD");
    expect(review.canConfirm).toBe(false);
    expect(review.blockers.some(b => message.test(b.reason))).toBe(true);
    expect(review.after?.orderCount).toBe(2);
  });
  it("blocks missing orders, inconsistent allocations and changed region definitions", () => {
    for (const mutate of [
      (f: ReturnType<typeof setup>) => { f.data.all.splice(0, 1); },
      (f: ReturnType<typeof setup>) => { f.allocations.splice(0, 1); },
      (f: ReturnType<typeof setup>) => { f.data.config.regions = [{ ...region, countries: ["DE"] }]; },
    ]) {
      const f = setup(); mutate(f);
      expect(buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").canConfirm).toBe(false);
    }
  });
  it("rejects terminal batches and does not consider settlement timestamps material changes", () => {
    const f = setup();
    for (const state of ["ordered", "released"]) {
      expect(() => buildPreparedBatchRefresh({ ...f.batch, state }, f.data, f.allocations, "USD")).toThrow(/prepared/i);
    }
    f.data.all[0] = order("changed", 3, { balanceConfirmedAt: "2026-01-02T00:00:00Z" });
    expect(buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").changes).toEqual([]);
  });
  it("hashes live routing, settings and snapshots, independently of JSONB key ordering", () => {
    const f = setup(), original = buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").token;
    // Canonicalisation is recursive, including the saved JSONB snapshot.
    expect(fingerprint({ x: 1, y: { a: 1, b: 2 } })).toBe(fingerprint({ y: { b: 2, a: 1 }, x: 1 }));
    expect(buildPreparedBatchRefresh(JSON.parse(JSON.stringify(f.batch)), f.data, f.allocations, "USD").token).toBe(original);
    Object.assign(f.data.all[0], { reshipperUsername: "another-reshipper" });
    expect(buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").token).not.toBe(original);
    delete (f.data.all[0] as any).reshipperUsername;
    f.data.stored.version++;
    expect(buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").token).not.toBe(original);
    f.data.all[0].updatedAt = new Date("2026-02-01T00:00:00Z") as any;
    const dateToken = buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").token;
    f.data.all[0].updatedAt = new Date("2026-02-02T00:00:00Z") as any;
    expect(buildPreparedBatchRefresh(f.batch, f.data, f.allocations, "USD").token).not.toBe(dateToken);
  });
});

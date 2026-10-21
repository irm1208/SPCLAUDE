import { describe, expect, it } from "vitest";
import { validateRegions, eligibleOrder, propose, snapshotOrder, fingerprint, csv, EU_COUNTRIES } from "./supplier-batches-model";

const order = (id: string, quantity = 1, extra: any = {}) => ({
  id, code: id, telegramUsername: id, shippingCountry: "Italy", status: "Submitted",
  paymentStatus: "confirmed", amountDue: "0", paymentConfirmedAt: "2026-10-01T00:00:00Z",
  lineItems: [{ id: `i${id}`, productId: "p", productName: "Product", quantity, unitPrice: "10", lineTotal: String(quantity * 10), isOos: false }],
  ...extra,
});
describe("supplier batching policy", () => {
  it("normalizes UK/GB and rejects overlapping countries", () => {
    expect(validateRegions([{ id: "uk", name: "UK", countries: ["UK"], targetKits: 100 }])[0].countries).toEqual(["GB"]);
    expect(() => validateRegions([{ id: "eu", name: "EU", countries: EU_COUNTRIES, targetKits: 100 }, { id: "it", name: "Italy", countries: ["Italy"], targetKits: 100 }])).toThrow(/overlap/i);
    expect(() => validateRegions([{ id: "x", name: "x", countries: ["unknown"], targetKits: 100 }])).toThrow();
  });
  it("uses full payment and settled balances, not test payments or onward charges", () => {
    expect(eligibleOrder(order("1"))).toBeNull();
    for (const extra of [{ paymentStatus: "test_confirmed" }, { amountDue: "1" }, { status: "Processing" }, { deletedAt: "now" }, { refundStatus: "requested" }, {batchLocked:true}]) {
      expect(eligibleOrder(order("1", 1, extra))).not.toBeNull();
    }
    expect(eligibleOrder(order("1", 1, { onwardPaymentStatus: "unpaid" }))).toBeNull();
    expect(eligibleOrder(order("1", 1, { paymentConfirmedAt: null }))).toMatch(/date/i);
  });
  it("excludes explicit and legacy Direct Shipping even when fully paid", () => {
    for (const extra of [
      { routingType: "direct", directShippingRequested: true },
      { routingType: "direct", directShippingRequested: false },
      { routingType: null, directShippingRequested: true },
    ]) {
      expect(eligibleOrder(order("direct", 30, extra))).toMatch(/Direct Shipping/);
      expect(eligibleOrder(order("direct", 30, { ...extra, status: "Processing" }), true)).toMatch(/Direct Shipping/);
    }
  });
  it("does not exclude large reshipper orders or trust stale direct flags over an assignment", () => {
    for (const extra of [
      { routingType: "reshipper", reshipperUsername: "synthetic-reshipper" },
      { routingType: "reshipper", directShippingRequested: true },
      { routingType: "direct", reshipperUsername: "synthetic-reshipper", directShippingRequested: true },
      { routingType: null, reshipperUsername: "synthetic-reshipper", directShippingRequested: true },
    ]) {
      expect(eligibleOrder(order("reshipper", 30, extra))).toBeNull();
      expect(eligibleOrder(order("reshipper", 100, extra))).toBeNull();
    }
  });
  it("preserves whole orders and chooses the shortest oldest-paid prefix", () => {
    const queue = [order("b", 10), order("a", 95, { paymentConfirmedAt: "2026-09-01T00:00:00Z" }), order("c", 20)];
    const result = propose(queue.map(o => snapshotOrder(o)), 100);
    expect(result.orders.map(o => o.id)).toEqual(["a", "b"]);
    expect(result.kits).toBe(105);
    expect(result.remainingKits).toBe(20);
    expect(result.products[0].quantity).toBe(105);
  });
  it("counts half kits and omits OOS lines", () => {
    const o = order("1", 0.5);
    o.lineItems.push({ ...o.lineItems[0], id: "oos", quantity: 5, isOos: true });
    expect(snapshotOrder(o).kits).toBe(0.5);
  });
  it("invalidates stale snapshots for country, products and amounts but not notes", () => {
    const a = snapshotOrder(order("1"));
    expect(fingerprint(a)).toBe(fingerprint(snapshotOrder(order("1", 1, { notes: "new" }))));
    expect(fingerprint(a)).not.toBe(fingerprint(snapshotOrder(order("1", 2))));
    expect(fingerprint(a)).not.toBe(fingerprint(snapshotOrder(order("1", 1, { shippingCountry: "GB" }))));
    expect(fingerprint(a)).not.toBe(fingerprint(snapshotOrder(order("1", 1, { grandTotal: "50" }))));
  });
  it("hashes JSONB round trips independent of object key order", () => {
    expect(fingerprint({ id: "a", items: [{ quantity: 1, name: "p" }] }))
      .toBe(fingerprint({ items: [{ name: "p", quantity: 1 }], id: "a" }));
  });
  it("escapes CSV and neutralizes spreadsheet formulas", () => {
    expect(csv([["=1+1", 'a,"b']])).toBe('"\'=1+1","a,""b"\r\n');
  });
});

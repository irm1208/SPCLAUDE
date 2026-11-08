import { describe, expect, it } from "vitest";
import {
  paymentOrderDetail, paymentOrderRow, paymentLedgerSummary, publicVendorReceipt, paymentReviewToken,
  paymentRemovalPermission,
} from "./vendor-payment-ledger";

const snapshot = {
  currency: "USD", items: [{ productName: "Sample", quantity: 2, unitCost: "10.10", lineTotal: "20.20" }],
  productCost: "20.20", shippingCost: "5.00", totalCost: "25.20",
  shipping: { email: "PRIVATE", address: "PRIVATE" }, customerPrice: "PRIVATE",
};
const row = (patch: Record<string, unknown> = {}) => ({
  id: "s1", vendorId: "v1", sourceKey: "order:o1", reference: "12656", orderIds: ["o1"],
  submittedAt: new Date("2026-11-01T10:00:00Z"), status: "Submitted", snapshot, ...patch,
});
const identities = new Map([["o1", { id: "o1", code: "12656", telegramUsername: "member" }]]);

describe("supplier payment ledger", () => {
  it("allows recalling unstarted supplier submissions, including stale ones, without guessing about payments or vendor work", () => {
    expect(paymentRemovalPermission(row(), false, false)).toEqual({ canRemove: true, removalReason: null });
    expect(paymentRemovalPermission(row({ status: "Processing" }), false, false)).toMatchObject({ canRemove: true, requiresRemovalOverride: true });
    expect(paymentRemovalPermission(row({ status: "Shipped" }), false, false)).toMatchObject({ canRemove: true, requiresRemovalOverride: true });
    expect(paymentRemovalPermission(row(), true, false).removalReason).toMatch(/void/i);
    expect(paymentRemovalPermission(row(), false, true).removalReason).toMatch(/photo/i);
    expect(paymentRemovalPermission(row(), false, true)).toMatchObject({ canRemove: true, requiresRemovalOverride: true });
  });
  it("projects only submitted supplier costs and allowed Admin order references", () => {
    const detail = paymentOrderDetail(row(), identities);
    expect(detail).toMatchObject({
      sourceType: "order", sourceId: "o1", submittedAt: "2026-11-01T10:00:00.000Z", currency: "USD",
      sourceOrders: [{ id: "o1", code: "12656", username: "member" }],
      items: [{ productName: "Sample", quantity: 2, unitCost: "10.10", lineTotal: "20.20" }],
      productCost: "20.20", shippingCost: "5.00", totalCost: "25.20",
    });
    expect(JSON.stringify(detail)).not.toContain("PRIVATE");
  });
  it("identifies constituent shared orders without adding their customer totals", () => {
    const detail = paymentOrderDetail(row({ sourceKey: "share:ABC:vendor:v1", sharedOrderId: "ABC", orderIds: ["o1", "o2"] }), identities);
    expect(detail.sourceType).toBe("shared"); expect(detail.sourceId).toBe("ABC");
    expect(detail.sourceOrders).toEqual([{ id: "o1", code: "12656", username: "member" }, { id: "o2", code: null, username: null }]);
    expect(detail.totalCost).toBe("25.20");
  });
  it("keeps missing and invalid cost fields explicitly unavailable", () => {
    const detail = paymentOrderDetail(row({ snapshot: { items: [{ productName: "Missing", quantity: "bad", unitCost: null, lineTotal: "NaN" }], totalCost: "invalid" } }));
    expect(detail).toMatchObject({ productCost: null, shippingCost: null, totalCost: null });
    expect(detail.items[0]).toMatchObject({ quantity: null, unitCost: null, lineTotal: null });
    expect(paymentOrderRow(row({ snapshot: {} }), false).eligible).toBe(false);
  });
  it("only offers unpaid, current, valid supplier orders for selection", () => {
    const eligible = paymentOrderRow(row(), false, null, identities);
    expect(eligible).toMatchObject({ eligible: true, paymentState: "owed", paymentId: null });
    for (const status of ["Submitted", "Processing", "Shipped", "Completed"])
      expect(paymentOrderRow(row({ status }), false).eligible).toBe(true);
    for (const status of ["On hold", "Recalled", "Cancelled", "unknown"])
      expect(paymentOrderRow(row({ status }), false).eligible).toBe(false);
    expect(paymentOrderRow(row(), true).paymentState).toBe("needs_review");
    expect(paymentOrderRow(row({ status: "Cancelled" }), true).paymentState).toBe("not_owed");
  });
  it("holds inconsistent snapshot totals instead of offering them as payable", () => {
    expect(paymentOrderRow(row({ snapshot: { ...snapshot, totalCost: "100.00" } }), false)).toMatchObject({ eligible: false, paymentState: "needs_review" });
    expect(paymentOrderRow(row({ snapshot: { ...snapshot, items: [] } }), false).eligible).toBe(false);
    expect(paymentOrderRow(row({ snapshot: { ...snapshot, shippingCost: "0" } }), false).eligible).toBe(false);
  });
  it("paid allocation amounts, not subsequently changed snapshots, determine paid totals", () => {
    const paid = paymentOrderRow(row({ snapshot: {} }), true, { paymentId: "p1", amountUsd: "25.20" }, identities);
    expect(paid).toMatchObject({ eligible: false, paymentState: "paid", paidAmountUsd: "25.20", paymentId: "p1" });
    expect(paymentLedgerSummary([paid]).paid).toEqual({ amount: "25.20", count: 1 });
  });
  it("summarises the complete ledger with exact cents and explicit unavailable costs", () => {
    const orders = [
      paymentOrderRow(row(), false),
      paymentOrderRow(row({ id: "s2" }), false, { paymentId: "p", amountUsd: "0.10" }),
      paymentOrderRow(row({ id: "s3" }), true),
      paymentOrderRow(row({ id: "s4", status: "Recalled" }), false),
      paymentOrderRow(row({ id: "s5", snapshot: {} }), false),
    ];
    expect(paymentLedgerSummary(orders)).toEqual({
      currency: "USD", owed: { amount: "25.20", count: 1 }, paid: { amount: "0.10", count: 1 },
      needsReview: { amount: "25.20", count: 2 }, notOwed: { amount: "25.20", count: 1 }, unavailableCount: 1,
    });
  });
  it("freezes receipt details independently of later source or identity changes", () => {
    const input = row(); const detail = paymentOrderDetail(input, identities);
    input.snapshot.items[0].productName = "Changed"; input.snapshot.items[0].quantity = 9;
    expect(detail.items[0]).toMatchObject({ productName: "Sample", quantity: 2 });
    input.snapshot.items[0].productName = "Sample"; input.snapshot.items[0].quantity = 2;
  });
  it("does not add Admin-only source identities or extended receipt details to the vendor history", () => {
    const receipt = publicVendorReceipt({
      id: "p1", vendorId: "v1", recordedBy: "PRIVATE_ADMIN", note: "PRIVATE_NOTE", activeTxKey: "PRIVATE_KEY",
      orders: [{ submissionId: "s1", reference: "12656", amountUsd: "25.20", detail: paymentOrderDetail(row(), identities) }],
      walletSnapshot: { address: "public-address", currency: "USDT", network: "ERC-20" },
    });
    expect(receipt.orders).toEqual([{ submissionId: "s1", reference: "12656", amountUsd: "25.20" }]);
    expect(JSON.stringify(receipt)).not.toContain("member");
    expect(JSON.stringify(receipt)).not.toContain("PRIVATE");
  });
  it("binds a review to the actual supplier snapshot and fulfilment state", () => {
    const original = row();
    const token = paymentReviewToken(original);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(paymentReviewToken({ ...original })).toBe(token);
    expect(paymentReviewToken({ ...original, snapshot: { ...snapshot, shippingCost: "6", totalCost: "26.20" } })).not.toBe(token);
    expect(paymentReviewToken({ ...original, status: "On hold" })).not.toBe(token);
    expect(paymentReviewToken({ ...original, sourceFingerprint: "changed" })).not.toBe(token);
  });
});

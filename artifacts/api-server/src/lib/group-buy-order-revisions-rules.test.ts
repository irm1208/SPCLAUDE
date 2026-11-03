import { describe, expect, it } from "vitest";
import { revisionEligibility, revisionSnapshot, planRevision } from "./group-buy-order-revisions-rules";

const order: any = { id: "o", groupBuyId: "g", telegramUsername: "member", status: "Submitted",
  paymentStatus: "unpaid", productSubtotal: "100", grandTotal: "123", adminFee: "10",
  deliveryPrice: "8", vendorShipping: "4", tip: "1", creditsApplied: 0, couponDiscount: "0" };
const lines: any[] = [{ id: "l", productId: "p", productName: "Own stock", quantity: "2", unitPrice: "50", lineTotal: "100", isOos: false }];
const group: any = { adminFeeEnabled: true, adminFeeType: "percent", adminFeeAmount: "10", currency: "USD" };
describe("own-stock order revisions", () => {
  it("requires strictly unpaid active orders with no payment evidence", () => {
    expect(revisionEligibility(order)).toBeNull();
    for (const patch of [{ paymentStatus: "confirmed" }, { paymentStatus: "test_confirmed" },
      { paymentTxHash: "pending" }, { testPaymentTxHash: "test" }, { amountDue: "1" },
      { status: "Shipped" }, { deletedAt: new Date() }, { refundStatus: "requested" }]) {
      expect(revisionEligibility({ ...order, ...patch })).not.toBeNull();
    }
  });
  it("plans prices and reductions without changing shipping, tips or credits", () => {
    const plan = planRevision(order, lines, [{ id: "l", quantity: 1, unitPrice: 80 }], new Set(["p"]), group);
    expect(plan.productSubtotal).toBe("80.00");
    expect(plan.adminFee).toBe("8.00");
    expect(plan.grandTotal).toBe("101.00");
    expect(plan.items[0].quantity).toBe(1);
  });
  it("never introduces an admin fee", () => {
    expect(planRevision({ ...order, adminFee: "0", grandTotal: "113" }, lines,
      [{ id: "l", quantity: 2, unitPrice: 80 }], new Set(["p"]), group).adminFee).toBe("0.00");
  });
  it("rejects other suppliers, increases, missing lines and invalid money", () => {
    for (const items of [[{ id: "l", quantity: 3, unitPrice: 50 }],
      [{ id: "l", quantity: 1, unitPrice: -1 }], [], [{ id: "other", quantity: 1, unitPrice: 5 }],
      [{ id: "l", quantity: 0.1, unitPrice: 10 }]]) {
      expect(() => planRevision(order, lines, items, new Set(["p"]), group)).toThrow();
    }
    expect(() => planRevision(order, lines, [{ id: "l", quantity: 1, unitPrice: 50 }], new Set(), group)).toThrow();
  });
  it("preserves unchanged non-owned lines but cannot edit them", () => {
    expect(planRevision(order, lines, [{ id: "l", quantity: 2, unitPrice: 50 }], new Set(), group).grandTotal).toBe("123.00");
  });
  it("rejects totals below allocated credits or discounts", () => {
    expect(() => planRevision({ ...order, creditsApplied: 120 }, lines,
      [{ id: "l", quantity: 1, unitPrice: 20 }], new Set(["p"]), group)).toThrow();
  });
  it("snapshot is order-independent but detects financial or line changes", () => {
    expect(revisionSnapshot(order, lines, group)).toBe(revisionSnapshot({ ...order, adminNotes: "irrelevant" }, lines, group));
    expect(revisionSnapshot(order, lines, group)).not.toBe(revisionSnapshot({ ...order, grandTotal: "124" }, lines, group));
    expect(revisionSnapshot(order, lines, group)).not.toBe(revisionSnapshot(order, [{ ...lines[0], quantity: "3" }], group));
    expect(revisionSnapshot(order, lines, group)).not.toBe(revisionSnapshot(order, lines, { ...group, adminFeeAmount: "15" }));
  });
});

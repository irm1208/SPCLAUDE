import { describe, expect, it } from "vitest";
import { hasRemainingHalf, claimAmounts, eligibleHalfKitOrder, halfKitClaimPaid, halfKitTakenMessage } from "./half-kit-rules";

describe("half-kit rules", () => {
  it("reports the real claim age, including sub-second and singular cases", () => {
    const claimed = new Date("2026-10-14T00:00:00Z");
    expect(halfKitTakenMessage(claimed, claimed.getTime() + 500)).toBe("Sorry, this half kit was taken less than a second ago.");
    expect(halfKitTakenMessage(claimed, claimed.getTime() + 1500)).toBe("Sorry, this half kit was taken 1 second ago.");
    expect(halfKitTakenMessage(claimed, claimed.getTime() + 5300)).toBe("Sorry, this half kit was taken 5 seconds ago.");
    expect(halfKitTakenMessage(new Date("invalid"))).toBe("Sorry, this half kit has already been taken.");
  });
  it.each([[3.5, true], [0.5, true], [3, false], [0, false], [3.25, false], [NaN, false], [-0.5, false]])(
    "only offers actual positive half remainder %s", (qty, expected) => expect(hasRemainingHalf(qty)).toBe(expected),
  );
  it("quotes final half price and both extra shipping charges, without coupons", () => {
    expect(claimAmounts(20, 2, 3, 10)).toEqual({ gross: 25, credit: 10, cash: 15 });
  });
  it("never spends more credits than the additional purchase", () => {
    expect(claimAmounts(20, 0, 0, 50)).toEqual({ gross: 20, credit: 20, cash: 0 });
  });
  it("rejects negative or nonfinite prices", () => {
    expect(() => claimAmounts(-1, 0, 0, 0)).toThrow();
    expect(() => claimAmounts(1, Infinity, 0, 0)).toThrow();
  });
  const order = { status: "Submitted", paymentStatus: "unpaid", amountDue: "0", balancePaymentStatus: null };
  it("accepts submitted unpaid and paid orders", () => {
    expect(eligibleHalfKitOrder(order)).toBe(true);
    expect(eligibleHalfKitOrder({ ...order, paymentStatus: "confirmed" })).toBe(true);
  });
  it.each(["Draft", "Shipped", "Completed", "Cancelled"])("rejects %s orders", status => {
    expect(eligibleHalfKitOrder({ ...order, status })).toBe(false);
  });
  it("blocks pending primary or balance payments, dispatch and deletion", () => {
    expect(eligibleHalfKitOrder({ ...order, paymentStatus: "pending_confirmation" })).toBe(false);
    expect(eligibleHalfKitOrder({ ...order, balancePaymentStatus: "verifying" })).toBe(false);
    expect(eligibleHalfKitOrder({ ...order, balanceTxHash: "tx" })).toBe(false);
    expect(eligibleHalfKitOrder({ ...order, dispatchConfirmedAt: new Date() })).toBe(false);
    expect(eligibleHalfKitOrder({ ...order, deletedAt: new Date() })).toBe(false);
  });
  it("an originally paid order does not make its unpaid additional half paid", () => {
    expect(halfKitClaimPaid({ cashDue: "15" }, { ...order, paymentStatus: "confirmed", amountDue: "15" })).toBe(false);
    expect(halfKitClaimPaid({ cashDue: "15" }, { ...order, paymentStatus: "confirmed", amountDue: "0" })).toBe(true);
    expect(halfKitClaimPaid({ cashDue: "0" }, order)).toBe(true);
  });
});

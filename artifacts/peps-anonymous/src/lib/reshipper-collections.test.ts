import { describe, expect, it } from "vitest";
import { reshipperCollections } from "./reshipper-collections";

const paid = {
  reshipperUsername: "@Alice", status: "Submitted", paymentStatus: "confirmed",
  adminFee: "10.00", deliveryPrice: "23.00", amountDue: "0.00",
};

describe("reshipper fee and postage collections", () => {
  it("adds actual order fees and member postage, not vendor shipping or order totals", () => {
    const result = reshipperCollections([
      { ...paid, vendorShipping: "99", grandTotal: "999" },
      { ...paid, reshipperUsername: " ALICE ", status: "Completed", adminFee: 2.5, deliveryPrice: 0 },
    ], "alice");
    expect(result).toEqual({ adminFeesCents: 1250, postageCents: 2300, paidOrderCount: 2, otherPostage: [] });
  });

  it("excludes unclaimed/other reshipper orders, test-only payments, pending balances and cancellations", () => {
    const result = reshipperCollections([
      paid,
      { ...paid, reshipperUsername: null },
      { ...paid, reshipperUsername: "Bob" },
      { ...paid, paymentStatus: "unpaid" },
      { ...paid, paymentStatus: "pending" },
      { ...paid, paymentStatus: "test_ready" },
      { ...paid, paymentStatus: "test_confirmed" },
      { ...paid, amountDue: "0.01" },
      { ...paid, status: "Cancelled" },
      { ...paid, status: "Refunded" },
      { ...paid, paymentStatus: "refunded" },
      { ...paid, refundedAt: "2026-10-20T12:00:00Z" },
      { ...paid, deletedAt: "2026-10-20T12:00:00Z" },
      { ...paid, directShippingRequested: true },
    ], "@ALICE");
    expect(result).toEqual({ adminFeesCents: 1000, postageCents: 2300, paidOrderCount: 1, otherPostage: [] });
    expect(reshipperCollections([paid], "")).toEqual({ adminFeesCents: 0, postageCents: 0, paidOrderCount: 0, otherPostage: [] });
  });

  it("sums in pennies and supports empty groups and free postage", () => {
    expect(reshipperCollections([
      { ...paid, adminFee: "0.10", deliveryPrice: "0.20" },
      { ...paid, adminFee: "0.20", deliveryPrice: "0.10" },
    ], "Alice")).toEqual({ adminFeesCents: 30, postageCents: 30, paidOrderCount: 2, otherPostage: [] });
    expect(reshipperCollections([], "Alice").paidOrderCount).toBe(0);
  });

  it("does not silently invent totals when financial fields are missing or malformed", () => {
    expect(() => reshipperCollections([{ ...paid, deliveryPrice: "not money" }], "Alice")).toThrow(/postage/i);
    expect(() => reshipperCollections([{ ...paid, adminFee: -1 }], "Alice")).toThrow(/admin/i);
    expect(() => reshipperCollections([{ ...paid, amountDue: "" }], "Alice")).toThrow(/balance/i);
    expect(() => reshipperCollections([{ ...paid, onwardPostageError: "Delivery receipts unavailable" }], "Alice")).toThrow(/receipts unavailable/);
  });
  it("includes confirmed separate onward postage without mixing currencies or requiring the product balance to be paid", () => {
    const result = reshipperCollections([
      { ...paid, onwardPostageCollected: [{ currency: "USD", amount: 7 }, { currency: "EUR", amount: 8 }] },
      { ...paid, paymentStatus: "unpaid", onwardPostageCollected: [{ currency: "USD", amount: 3 }] },
    ], "Alice", "USD");
    expect(result).toEqual({ adminFeesCents: 1000, postageCents: 3300, paidOrderCount: 1, otherPostage: [{ currency: "EUR", cents: 800 }] });
  });
});

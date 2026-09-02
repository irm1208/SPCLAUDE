import { describe, expect, it } from "vitest";
import {
  allocateShipping,
  reconcileShippingAdjustment,
  ShippingAdjustmentError,
} from "./group-buy-shipping-adjustment";

describe("allocateShipping", () => {
  it("splits the exact total using equal and quantity-weighted shares", () => {
    expect(allocateShipping(100, 50, 50, [
      { orderId: "a", quantity: 1 },
      { orderId: "b", quantity: 3 },
    ])).toEqual([
      { orderId: "a", amount: 37.5 },
      { orderId: "b", amount: 62.5 },
    ]);
  });

  it("assigns rounding remainder so allocations still equal the target", () => {
    const result = allocateShipping(10, 100, 0, [
      { orderId: "a", quantity: 1 },
      { orderId: "b", quantity: 1 },
      { orderId: "c", quantity: 1 },
    ]);

    expect(result).toEqual([
      { orderId: "a", amount: 3.33 },
      { orderId: "b", amount: 3.33 },
      { orderId: "c", amount: 3.34 },
    ]);
  });
});

describe("reconcileShippingAdjustment", () => {
  it("adds only the shipping increase to a confirmed order's outstanding balance", () => {
    expect(reconcileShippingAdjustment({
      paymentStatus: "confirmed",
      balancePaymentStatus: "unpaid",
      currentGrandTotal: 110,
      currentVendorShipping: 10,
      currentAmountDue: 10,
      newGrandTotal: 125,
      newVendorShipping: 25,
    })).toEqual({
      amountDue: 25,
      balancePaymentStatus: "unpaid",
      clearPrimaryPaymentLock: false,
    });
  });

  it("leaves amount due at zero for an unpaid primary order", () => {
    expect(reconcileShippingAdjustment({
      paymentStatus: "unpaid",
      balancePaymentStatus: null,
      currentGrandTotal: 110,
      currentVendorShipping: 10,
      currentAmountDue: 0,
      newGrandTotal: 125,
      newVendorShipping: 25,
    })).toEqual({
      amountDue: 0,
      balancePaymentStatus: null,
      clearPrimaryPaymentLock: true,
    });
  });

  it("rejects reducing a confirmed order total", () => {
    expect(() => reconcileShippingAdjustment({
      paymentStatus: "confirmed",
      balancePaymentStatus: "unpaid",
      currentGrandTotal: 125,
      currentVendorShipping: 25,
      currentAmountDue: 25,
      newGrandTotal: 115,
      newVendorShipping: 15,
    })).toThrowError(new ShippingAdjustmentError(
      "paid_order_decrease",
      "Shipping cannot reduce a confirmed order total",
    ));
  });

  it("rejects edits while a balance payment is being verified", () => {
    expect(() => reconcileShippingAdjustment({
      paymentStatus: "confirmed",
      balancePaymentStatus: "pending_confirmation",
      currentGrandTotal: 125,
      currentVendorShipping: 25,
      currentAmountDue: 25,
      newGrandTotal: 130,
      newVendorShipping: 30,
    })).toThrowError(new ShippingAdjustmentError(
      "balance_payment_pending",
      "Shipping cannot change while a balance payment is pending confirmation",
    ));
  });
});
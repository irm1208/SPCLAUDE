import { describe, expect, it } from "vitest";
import {
  buildOrganiserFeeOrderUpdate,
  type OrganiserFeeOrderInput,
} from "./shared-order-organiser-fees";

describe("shared-order organiser fee reconciliation", () => {
  it("updates an unpaid order total without creating a balance", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 0,
      newFee: 10,
      grandTotal: 145.6,
      amountDue: 0,
      paymentStatus: "unpaid",
    })).toEqual({
      changed: true,
      organiserFee: 10,
      grandTotal: 155.6,
      amountDue: 0,
      resetPaymentLock: true,
      resetBalancePayment: false,
    });
  });

  it("repairs an unpaid order when its recorded fee is missing from the total", () => {
    const partialHistoricalOrder: OrganiserFeeOrderInput = {
      oldFee: 10,
      newFee: 10,
      grandTotal: 218.4,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "unpaid",
    };

    expect(buildOrganiserFeeOrderUpdate(partialHistoricalOrder)).toEqual({
      changed: true,
      organiserFee: 10,
      grandTotal: 228.4,
      amountDue: 0,
      resetPaymentLock: true,
      resetBalancePayment: false,
    });
  });

  it("does not lower an unpaid order that is already above its calculated fee total", () => {
    const orderWithAnIndependentExtra: OrganiserFeeOrderInput = {
      oldFee: 10,
      newFee: 10,
      grandTotal: 230,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "unpaid",
    };

    expect(buildOrganiserFeeOrderUpdate(orderWithAnIndependentExtra)).toEqual({
      changed: false,
      organiserFee: 10,
      grandTotal: 230,
      amountDue: 0,
      resetPaymentLock: false,
      resetBalancePayment: false,
    });
  });

  it("preserves an unpaid order's independent extra when its organiser fee decreases", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 10,
      newFee: 8,
      grandTotal: 235,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "unpaid",
    })).toEqual({
      changed: true,
      organiserFee: 8,
      grandTotal: 233,
      amountDue: 0,
      resetPaymentLock: true,
      resetBalancePayment: false,
    });
  });

  it("preserves an unpaid order's independent extra when its organiser fee increases", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 8,
      newFee: 10,
      grandTotal: 233,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "unpaid",
    })).toEqual({
      changed: true,
      organiserFee: 10,
      grandTotal: 235,
      amountDue: 0,
      resetPaymentLock: true,
      resetBalancePayment: false,
    });
  });

  it.each(["confirmed", "test_confirmed", "pending_confirmation"])(
    "does not change a %s order during the unpaid-order reconciliation",
    paymentStatus => {
      expect(buildOrganiserFeeOrderUpdate({
        oldFee: 0,
        newFee: 10,
        grandTotal: 218.4,
        amountDue: 0,
        paymentStatus,
      })).toEqual({
        changed: false,
        organiserFee: 0,
        grandTotal: 218.4,
        amountDue: 0,
        resetPaymentLock: false,
        resetBalancePayment: false,
      });
    },
  );

  it("adds a missing fee to a payment-started order as a new balance", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 0,
      newFee: 10,
      grandTotal: 218.4,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "confirmed",
      allowPaymentProtectedFeeIncrease: true,
    })).toEqual({
      changed: true,
      organiserFee: 10,
      grandTotal: 228.4,
      amountDue: 10,
      resetPaymentLock: false,
      resetBalancePayment: true,
    });
  });

  it("refuses to add a fee when a payment-started total already has an unexplained excess", () => {
    expect(() => buildOrganiserFeeOrderUpdate({
      oldFee: 0,
      newFee: 10,
      grandTotal: 228.4,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "confirmed",
      allowPaymentProtectedFeeIncrease: true,
    })).toThrow("does not match its recorded components");
  });

  it("refuses to overwrite an existing balance payment lifecycle", () => {
    expect(() => buildOrganiserFeeOrderUpdate({
      oldFee: 0,
      newFee: 10,
      grandTotal: 218.4,
      baseGrandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "confirmed",
      allowPaymentProtectedFeeIncrease: true,
      hasExistingBalancePayment: true,
    })).toThrow("already has a balance payment");
  });

  it("leaves a payment-protected order unchanged when a fee is removed", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 10,
      newFee: 0,
      grandTotal: 228.4,
      amountDue: 4,
      paymentStatus: "confirmed",
    })).toEqual({
      changed: false,
      organiserFee: 10,
      grandTotal: 228.4,
      amountDue: 4,
      resetPaymentLock: false,
      resetBalancePayment: false,
    });
  });

  it("is idempotent when the materialised fee already matches", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 10,
      newFee: 10,
      grandTotal: 228.4,
      amountDue: 10,
      paymentStatus: "confirmed",
    })).toEqual({
      changed: false,
      organiserFee: 10,
      grandTotal: 228.4,
      amountDue: 10,
      resetPaymentLock: false,
      resetBalancePayment: false,
    });
  });
});
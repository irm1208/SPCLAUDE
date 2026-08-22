import { describe, expect, it } from "vitest";
import { buildOrganiserFeeOrderUpdate } from "./shared-order-organiser-fees";

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

  it("adds only the fee delta to a confirmed order balance", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 0,
      newFee: 10,
      grandTotal: 218.4,
      amountDue: 0,
      paymentStatus: "confirmed",
    })).toEqual({
      changed: true,
      organiserFee: 10,
      grandTotal: 228.4,
      amountDue: 10,
      resetPaymentLock: false,
      resetBalancePayment: true,
    });
  });

  it("never lowers a payment-protected order when a fee is removed", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 10,
      newFee: 0,
      grandTotal: 228.4,
      amountDue: 4,
      paymentStatus: "confirmed",
    })).toEqual({
      changed: true,
      organiserFee: 0,
      grandTotal: 228.4,
      amountDue: 4,
      resetPaymentLock: false,
      resetBalancePayment: false,
    });
  });

  it("treats pending payment as protected when a fee changes", () => {
    expect(buildOrganiserFeeOrderUpdate({
      oldFee: 10,
      newFee: 0,
      grandTotal: 228.4,
      amountDue: 0,
      paymentStatus: "pending_confirmation",
    })).toEqual({
      changed: true,
      organiserFee: 0,
      grandTotal: 228.4,
      amountDue: 0,
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
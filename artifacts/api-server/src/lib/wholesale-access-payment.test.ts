import { describe, expect, it } from "vitest";
import { getWholesaleAccessOutstandingAmount } from "./wholesale-access-payment";

describe("getWholesaleAccessOutstandingAmount", () => {
  it("charges the whole access fee when no verified test payment exists", () => {
    expect(getWholesaleAccessOutstandingAmount({
      amountUsd: 50,
      paymentTestAmount: 1.37,
      testPaymentTxHash: null,
    })).toBe(50);
  });

  it("deducts the verified test payment from the final payment", () => {
    expect(getWholesaleAccessOutstandingAmount({
      amountUsd: 50,
      paymentTestAmount: 1.37,
      testPaymentTxHash: "0xtest",
    })).toBe(48.63);
  });

  it("never returns a negative amount", () => {
    expect(getWholesaleAccessOutstandingAmount({
      amountUsd: 1,
      paymentTestAmount: 1.25,
      testPaymentTxHash: "0xtest",
    })).toBe(0);
  });
});
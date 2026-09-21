import { describe, expect, it } from "vitest";
import { evaluateOrganiserPaymentAutoConfirmation } from "./wholesale-organiser-payment-auto-policy";

describe("organiser platform payment auto-confirmation policy", () => {
  it("auto-confirms a full stablecoin payment without credits", () => {
    expect(evaluateOrganiserPaymentAutoConfirmation({
      amountDue: 3465,
      totalCreditsApplied: 0,
      currency: "USDT",
      verifiedAmount: 3465,
    })).toEqual({ autoConfirm: true });
  });

  it("requires manual confirmation for a partial payment", () => {
    expect(evaluateOrganiserPaymentAutoConfirmation({
      amountDue: 3465,
      totalCreditsApplied: 0,
      currency: "USDT",
      verifiedAmount: 3400,
    })).toEqual({ autoConfirm: false, reason: "not_fully_verified" });
  });

  it("requires manual confirmation whenever member credits were deducted", () => {
    expect(evaluateOrganiserPaymentAutoConfirmation({
      amountDue: 3365,
      totalCreditsApplied: 100,
      currency: "USDT",
      verifiedAmount: 3365,
    })).toEqual({ autoConfirm: false, reason: "credits_applied" });
  });

  it("keeps volatile-coin payments manual because the amount due is denominated in USD", () => {
    expect(evaluateOrganiserPaymentAutoConfirmation({
      amountDue: 3465,
      totalCreditsApplied: 0,
      currency: "BTC",
      verifiedAmount: 3465,
    })).toEqual({ autoConfirm: false, reason: "unsupported_currency" });
  });
});
import { describe, expect, it } from "vitest";
import { evaluateTransfer } from "./index.js";

describe("verification normalization", () => {
  it("does not turn a provider outage into a failed payment", () => {
    expect(evaluateTransfer({ available: false })).toMatchObject({ status: "unavailable", retryable: true });
  });
  it("checks chain, success, token, destination, amount, time and confirmations", () => {
    expect(evaluateTransfer({
      available: true, chainMatches: true, succeeded: true, tokenMatches: true,
      destinationMatches: true, timestampMatches: true, confirmations: 12, requiredConfirmations: 12,
      expectedBaseUnits: "100", observedBaseUnits: "100", underpayBps: 100, overpayBps: 200,
    })).toMatchObject({ status: "verified" });
    expect(evaluateTransfer({
      available: true, chainMatches: true, succeeded: true, tokenMatches: true,
      destinationMatches: true, timestampMatches: true, confirmations: 1, requiredConfirmations: 12,
      expectedBaseUnits: "100", observedBaseUnits: "100", underpayBps: 100, overpayBps: 200,
    })).toMatchObject({ status: "confirming" });
  });
});
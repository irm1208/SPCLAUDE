import { describe, expect, it } from "vitest";
import { evaluateTransfer, createEvmNativeAdapter } from "./index.js";

describe("verification normalization", () => {
  it("does not turn a provider outage into a failed payment", () => {
    expect(evaluateTransfer({ available: false })).toMatchObject({ status: "unavailable", retryable: true });
  });
  it("decodes an EVM native fixture against server-authoritative instructions", async () => {
    const verify = createEvmNativeAdapter({ getTransaction: async () => ({ chainId: "1", success: true, to: "0xabc", value: "100", timestamp: 1, confirmations: 2 }) });
    expect(await verify({ transactionHash: "0x1", chainId: "1", destination: "0xabc", expectedBaseUnits: "100", earliestTimestamp: 0, requiredConfirmations: 2, underpayBps: 0, overpayBps: 0 })).toMatchObject({ status: "verified" });
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
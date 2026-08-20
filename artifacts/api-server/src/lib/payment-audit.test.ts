import { describe, expect, it } from "vitest";
import {
  hasExpectedAuditAmount,
  paymentAuditScopeForOrder,
  walletHistoryForPayment,
} from "./payment-audit";

describe("payment audit wallet history", () => {
  it("uses the historical wallet that applied to the order date and scope", () => {
    const entries = walletHistoryForPayment([
      {
        scope: "group_buy",
        network: "ERC-20",
        address: "0xold",
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveUntil: new Date("2025-12-31T23:59:59Z"),
      },
      {
        scope: "group_buy",
        network: "ERC-20",
        address: "0xnew",
        effectiveFrom: new Date("2026-01-01T00:00:00Z"),
        effectiveUntil: null,
      },
    ], "group_buy", "erc-20", new Date("2025-06-01T00:00:00Z"));

    expect(entries.map(entry => entry.address)).toEqual(["0xold"]);
  });

  it("keeps a payment in review rather than treating a missing history entry as a mismatch", () => {
    const entries = walletHistoryForPayment([], "wholesale", "Bitcoin Mainnet", new Date());
    expect(entries).toEqual([]);
  });

  it("prefers an exact-scope wallet over a catch-all wallet and orders overlapping entries deterministically", () => {
    const entries = walletHistoryForPayment([
      { scope: "all", network: "ERC-20", address: "0xfallback", effectiveFrom: new Date("2025-01-01"), effectiveUntil: null },
      { scope: "group_buy", network: "ERC-20", address: "0xolder", effectiveFrom: new Date("2025-01-01"), effectiveUntil: null },
      { scope: "group_buy", network: "ERC-20", address: "0xcurrent", effectiveFrom: new Date("2026-01-01"), effectiveUntil: null },
    ], "group_buy", "ERC-20", new Date("2026-06-01"));

    expect(entries.map(entry => entry.address)).toEqual(["0xcurrent", "0xolder", "0xfallback"]);
  });

  it("allows the one-percent underpayment tolerance used by the live verifier", () => {
    expect(hasExpectedAuditAmount(99, 100)).toBe(true);
    expect(hasExpectedAuditAmount(98.9, 100)).toBe(false);
  });

  it("segments shared wholesale orders before wholesale orders", () => {
    expect(paymentAuditScopeForOrder({ groupBuyId: null, orderType: "wholesale_shared" })).toBe("shared_order");
  });
});
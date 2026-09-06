import { describe, expect, it } from "vitest";
import {
  PAYMENT_RAILS,
  canTransition,
  classifyAmount,
  createPaymentRequestSchema,
  fiatToBaseUnits,
} from "./index.js";

describe("payment domain", () => {
  it("exposes exactly the approved rails without receiving wallets", () => {
    expect(PAYMENT_RAILS).toHaveLength(12);
    expect(PAYMENT_RAILS.map((rail) => rail.id)).toEqual([
      "ethereum-eth", "ethereum-usdt", "ethereum-usdc", "bsc-usdt",
      "arbitrum-usdt", "arbitrum-usdc", "polygon-usdt", "polygon-usdc",
      "solana-usdt", "solana-usdc", "tron-usdt", "bitcoin-btc",
    ]);
    expect(JSON.stringify(PAYMENT_RAILS)).not.toMatch(/wallet|recipient/i);
  });

  it("makes paid irreversible", () => {
    expect(canTransition("confirming", "paid")).toBe(true);
    expect(canTransition("paid", "failed")).toBe(false);
    expect(canTransition("paid", "paid")).toBe(true);
  });

  it("classifies base units using bigint rather than floating point", () => {
    expect(classifyAmount(100n, 99n, 100, 200)).toBe("verified");
    expect(classifyAmount(100n, 98n, 100, 200)).toBe("underpaid");
    expect(classifyAmount(100n, 103n, 100, 200)).toBe("overpaid_review");
  });

  it("converts decimal fiat and asset prices to rounded-up integer base units", () => {
    expect(fiatToBaseUnits("12.34", "2.5", 6)).toBe(4_936_000n);
    expect(fiatToBaseUnits("1", "3", 6)).toBe(333_334n);
    expect(() => fiatToBaseUnits("1", "0", 6)).toThrow("price must be positive");
    expect(() => fiatToBaseUnits("1", "USD:ETH:1", 6)).toThrow("invalid decimal amount");
  });

  it("rejects unknown keys and an unsafe decimal amount", () => {
    expect(() => createPaymentRequestSchema.parse({
      merchantOrderReference: "order-1", fiatAmount: "12.50", fiatCurrency: "USD",
      rails: ["ethereum-eth"], extra: true,
    })).toThrow();
    expect(() => createPaymentRequestSchema.parse({
      merchantOrderReference: "order-1", fiatAmount: "1e3", fiatCurrency: "USD",
      rails: ["ethereum-eth"],
    })).toThrow();
  });
});
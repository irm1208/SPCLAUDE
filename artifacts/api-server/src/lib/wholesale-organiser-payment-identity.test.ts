import { describe, expect, it } from "vitest";
import {
  normalizeWholesaleOrganiserPaymentIdentity,
  wholesaleOrganiserPaymentIdentityKey,
} from "./wholesale-organiser-payment-identity";

describe("wholesale organiser payment identity", () => {
  it("normalizes prefixed and unprefixed EVM hashes to the same identity", () => {
    const prefixed = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "0xABC123",
      currency: "usdt",
      network: "ERC-20",
    });
    const unprefixed = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "abc123",
      currency: "USDT",
      network: "erc-20",
    });

    expect(prefixed).toEqual(unprefixed);
    expect(prefixed).toEqual({
      txHash: "abc123",
      currency: "USDT",
      network: "ethereum",
    });
  });

  it("normalizes semantic network aliases to one replay-protected chain identity", () => {
    const ethereum = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "0xABC123",
      currency: "USDT",
      network: "ethereum",
    });
    const erc20 = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "abc123",
      currency: "usdt",
      network: "ERC-20",
    });
    const bsc = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "ABC123",
      currency: "USDT",
      network: "bsc",
    });
    const bep20 = normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "abc123",
      currency: "usdt",
      network: "BEP-20",
    });

    expect(ethereum).toEqual(erc20);
    expect(bsc).toEqual(bep20);
    expect(ethereum.network).not.toBe(bsc.network);
  });

  it("preserves case-sensitive non-hex transaction signatures", () => {
    expect(normalizeWholesaleOrganiserPaymentIdentity({
      txHash: "SolanaCaseSensitiveSignatureZ9",
      currency: "usdc",
      network: "Solana",
    })).toEqual({
      txHash: "SolanaCaseSensitiveSignatureZ9",
      currency: "USDC",
      network: "solana",
    });
  });

  it("builds the same unique key for equivalent chain aliases and hash formats", () => {
    expect(wholesaleOrganiserPaymentIdentityKey({
      txHash: "0xABC123",
      currency: "usdt",
      network: "ERC-20",
    })).toBe(wholesaleOrganiserPaymentIdentityKey({
      txHash: "abc123",
      currency: "USDT",
      network: "ethereum",
    }));
  });
});
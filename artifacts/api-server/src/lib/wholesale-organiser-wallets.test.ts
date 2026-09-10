import { describe, expect, it } from "vitest";
import {
  canAdminEditOrganiserWallets,
  describeOrganiserWallets,
  normalizeOrganiserWallets,
  OrganiserWalletValidationError,
  type OrganiserWalletOption,
} from "./wholesale-organiser-wallets";

describe("organiser wallet validation", () => {
  it("normalizes complete wallet options and drops incomplete entries", () => {
    expect(normalizeOrganiserWallets([
      { currency: " usdt ", network: " ERC-20 ", walletAddress: " 0xabc " },
      { currency: "", network: "Solana", walletAddress: "ignored" },
      { currency: "BTC", network: "Bitcoin Mainnet", walletAddress: "" },
    ])).toEqual([
      { currency: "USDT", network: "ERC-20", walletAddress: "0xabc" },
    ]);
  });

  it("drops legacy partial rows with null, undefined, or blank wallet fields", () => {
    expect(normalizeOrganiserWallets([
      { currency: null, network: "ERC-20", walletAddress: "partial" },
      { currency: "USDT", network: undefined, walletAddress: "partial" },
      { currency: "USDT", network: "ERC-20", walletAddress: "" },
      { currency: "USDT", network: "ERC-20", walletAddress: "complete" },
    ])).toEqual([
      { currency: "USDT", network: "ERC-20", walletAddress: "complete" },
    ]);
  });

  it("preserves an explicit empty list so wallets can be cleared", () => {
    expect(normalizeOrganiserWallets([])).toEqual([]);
  });

  it("rejects a non-array wallet value", () => {
    expect(() => normalizeOrganiserWallets(null)).toThrow("Wallet options must be an array.");
  });

  it("throws for a non-empty wallet using an unsupported network", () => {
    try {
      normalizeOrganiserWallets([
        { currency: "USDT", network: "Unknown", walletAddress: "wallet" },
      ]);
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(OrganiserWalletValidationError);
      expect(error).toHaveProperty("message", "Unsupported crypto network: Unknown");
    }
  });

  it("rejects wallet fields that exceed their limits", () => {
    expect(() => normalizeOrganiserWallets([
      { currency: "A".repeat(11), network: "ERC-20", walletAddress: "wallet" },
    ])).toThrow(OrganiserWalletValidationError);
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: "A".repeat(51), walletAddress: "wallet" },
    ])).toThrow(OrganiserWalletValidationError);
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: "ERC-20", walletAddress: "A".repeat(201) },
    ])).toThrow(OrganiserWalletValidationError);
  });

  it("rejects non-string populated wallet fields", () => {
    expect(() => normalizeOrganiserWallets([
      { currency: 123, network: "ERC-20", walletAddress: "wallet" },
    ])).toThrow(OrganiserWalletValidationError);
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: ["ERC-20"], walletAddress: "wallet" },
    ])).toThrow(OrganiserWalletValidationError);
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: "ERC-20", walletAddress: { value: "wallet" } },
    ])).toThrow(OrganiserWalletValidationError);
  });

  it("allows admin wallet edits only for open and locked shares", () => {
    expect(canAdminEditOrganiserWallets("open")).toBe(true);
    expect(canAdminEditOrganiserWallets("locked")).toBe(true);
    expect(canAdminEditOrganiserWallets("submitted")).toBe(false);
    expect(canAdminEditOrganiserWallets("cancelled")).toBe(false);
  });

  it("describes wallets without exposing their addresses", () => {
    const wallets: OrganiserWalletOption[] = [
      { currency: "USDT", network: "ERC-20", walletAddress: "secret" },
    ];
    expect(describeOrganiserWallets(wallets)).toEqual([
      { currency: "USDT", network: "ERC-20" },
    ]);
  });

  it("redacts malformed legacy wallet options without throwing", () => {
    expect(describeOrganiserWallets([
      null,
      { currency: " USDT ", network: " ERC-20 ", walletAddress: "secret" },
      { currency: 123, network: "Solana", walletAddress: "secret" },
      { currency: "BTC", network: null, walletAddress: "secret" },
    ])).toEqual([{ currency: "USDT", network: "ERC-20" }]);
  });
});
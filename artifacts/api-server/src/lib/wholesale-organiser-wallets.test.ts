import { describe, expect, it } from "vitest";
import {
  canAdminEditOrganiserWallets,
  describeOrganiserWallets,
  normalizeOrganiserWallets,
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

  it("preserves an explicit empty list so wallets can be cleared", () => {
    expect(normalizeOrganiserWallets([])).toEqual([]);
  });

  it("rejects a non-array wallet value", () => {
    expect(() => normalizeOrganiserWallets(null)).toThrow("Wallet options must be an array.");
  });

  it("throws for a non-empty wallet using an unsupported network", () => {
    expect(() => normalizeOrganiserWallets([
      { currency: "USDT", network: "Unknown", walletAddress: "wallet" },
    ])).toThrow("Unsupported crypto network");
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
});
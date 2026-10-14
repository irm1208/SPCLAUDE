import { describe, expect, it } from "vitest";
import { resolveHalfKitPaymentMethods } from "./half-kit-payment-routing";

const organiserWallet = `0x${"1".repeat(40)}`;
const reshipperWallet = `0x${"2".repeat(40)}`;
const valid = (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address);
const organiser = { cryptoWalletAddress: organiserWallet, cryptoCurrency: "USDT", cryptoNetwork: "ERC-20" };

describe("half-kit payment destinations", () => {
  it("uses the organiser wallet when no reshipper collects crypto", () => {
    expect(resolveHalfKitPaymentMethods(organiser, null, valid).cryptoWalletAddress).toBe(organiserWallet);
  });
  it("prefers an enabled reshipper wallet", () => {
    const result = resolveHalfKitPaymentMethods(organiser, {
      reshipperUsername: "reshipper", enabledPaymentMethods: { cryptoEnabled: true },
      reshipperPaymentDetails: { cryptoWalletAddress: reshipperWallet, cryptoCurrency: "USDC", cryptoNetwork: "ERC-20" },
    }, valid);
    expect(result.cryptoWalletAddress).toBe(reshipperWallet);
    expect(result.cryptoCurrency).toBe("USDC");
    expect(result.collectedBy).toEqual({ type: "reshipper", username: "reshipper" });
  });
  it("does not use a disabled or invalid reshipper wallet", () => {
    for (const enabled of [false, true]) {
      expect(resolveHalfKitPaymentMethods(organiser, {
        enabledPaymentMethods: { cryptoEnabled: enabled },
        reshipperPaymentDetails: { cryptoWalletAddress: enabled ? "invalid" : reshipperWallet },
      }, valid).cryptoWalletAddress).toBe(organiserWallet);
    }
  });
  it("supports the reshipper's enabled legacy USDT wallet", () => {
    expect(resolveHalfKitPaymentMethods(null, {
      enabledPaymentMethods: { usdtEnabled: true }, reshipperPaymentDetails: { usdtWallet: reshipperWallet },
    }, valid).cryptoWalletAddress).toBe(reshipperWallet);
  });
  it("disables crypto rather than supplying any admin/global destination", () => {
    const result = resolveHalfKitPaymentMethods({ cryptoWalletAddress: "invalid" }, null, valid);
    expect(result.cryptoWalletAddress).toBeNull();
    expect(result.anonPayEnabled).toBe(false);
    expect(result.anonPayWallet).toBeNull();
  });
  it("requires a complete, explicitly enabled local AnonPay destination", () => {
    const rail = { anonPayEnabled: true, anonPayWallet: organiserWallet, anonPayTicker: "usdt", anonPayNetwork: "ERC20" };
    expect(resolveHalfKitPaymentMethods(rail, null, valid).anonPayWallet).toBe(organiserWallet);
    expect(resolveHalfKitPaymentMethods({ ...rail, anonPayWallet: "" }, null, valid).anonPayEnabled).toBe(false);
    expect(resolveHalfKitPaymentMethods({ ...rail, anonPayNetwork: "none" }, null, valid).anonPayEnabled).toBe(false);
    const result = resolveHalfKitPaymentMethods(rail, {
      enabledPaymentMethods: { anonPayEnabled: true },
      reshipperPaymentDetails: { ...rail, anonPayWallet: reshipperWallet },
    }, valid);
    expect(result.anonPayWallet).toBe(reshipperWallet);
  });
});

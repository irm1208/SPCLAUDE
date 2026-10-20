import { describe, it, expect } from "vitest";
import { deliveryContactError, samePaymentWallet } from "./eu-delivery-checkout";

const contact = { shippingName: "Jane Smith", shippingAddress: "1 Example Road, Rome, 00100", shippingCountry: "IT", shippingPhone: "+39 333 1234567", shippingEmail: "jane@example.com" };
describe("EU delivery checkout requirements", () => {
  it("requires every delivery contact field", () => {
    expect(deliveryContactError(contact)).toBeNull();
    for (const key of Object.keys(contact)) expect(deliveryContactError({ ...contact, [key]: " " })).toBeTruthy();
    expect(deliveryContactError({ ...contact, shippingEmail: "invalid" })).toMatch(/email/i);
    expect(deliveryContactError({ ...contact, shippingPhone: "abc" })).toMatch(/mobile/i);
  });
  it("combines only an identical wallet, token and network", () => {
    const wallet = { walletAddress: `0x${"a".repeat(40)}`, currency: "USDT", network: "Ethereum" };
    expect(samePaymentWallet(wallet, { ...wallet, network: "ERC-20", walletAddress: wallet.walletAddress.toUpperCase() })).toBe(true);
    expect(samePaymentWallet(wallet, { ...wallet, currency: "USDC" })).toBe(false);
    expect(samePaymentWallet(wallet, { ...wallet, network: "BSC" })).toBe(false);
    expect(samePaymentWallet(wallet, { ...wallet, walletAddress: `0x${"b".repeat(40)}` })).toBe(false);
    expect(samePaymentWallet({ ...wallet, walletAddress: "" }, { ...wallet, walletAddress: "" })).toBe(false);
    const sol = { walletAddress: "AbCd", currency: "USDT", network: "Solana" };
    expect(samePaymentWallet(sol, { ...sol, walletAddress: "abcd" })).toBe(false);
  });
});

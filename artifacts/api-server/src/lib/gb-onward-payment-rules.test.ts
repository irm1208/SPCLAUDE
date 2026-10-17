import { describe, expect, it } from "vitest";
import { parseOnwardPaymentSettings, onwardPaymentAmount, onwardTxIdentity, validateOnwardTx, canAutoConfirmOnward, assertOnwardTransition } from "./gb-onward-payment-rules";

const wallet = { enabled: true, currency: "USDT", network: "Ethereum", walletAddress: `0x${"a".repeat(40)}`, confirmationMode: "manual" };
describe("separate onward-payment rules", () => {
  it("validates separate wallets and defaults to manual confirmation", () => {
    expect(parseOnwardPaymentSettings({ ...wallet, confirmationMode: undefined }).confirmationMode).toBe("manual");
    expect(parseOnwardPaymentSettings({ ...wallet, confirmationMode: "automatic" }).confirmationMode).toBe("automatic");
    for (const change of [{ walletAddress: "" }, { network: "unknown" }, { currency: "XMR" }, { confirmationMode: "accept-anything" }, { enabled: "true" }]) {
      expect(() => parseOnwardPaymentSettings({ ...wallet, ...change })).toThrow();
    }
  });
  it("permits an empty disabled setting but validates configured addresses", () => {
    expect(parseOnwardPaymentSettings({ ...wallet, enabled: false, walletAddress: "" }).enabled).toBe(false);
    expect(() => parseOnwardPaymentSettings({ ...wallet, enabled: false, walletAddress: "bad" })).toThrow();
  });
  it("accepts supported tokens only on their supported chain", () => {
    expect(parseOnwardPaymentSettings({ ...wallet, currency: "USDC", network: "Polygon" }).network).toBe("Polygon");
    expect(() => parseOnwardPaymentSettings({ ...wallet, currency: "USDC", network: "TRON" })).toThrow();
  });
  it("rejects invalid, zero, negative, huge and fractional-cent prices", () => {
    expect(onwardPaymentAmount(17.3)).toBe(17.3);
    for (const v of [0, -1, NaN, Infinity, 0.001, 1000001, "", "17.30", null]) expect(() => onwardPaymentAmount(v)).toThrow();
  });
  it("keeps one transaction identity per chain regardless of token or hex casing", () => {
    const txHash = `0x${"a".repeat(64)}`;
    expect(onwardTxIdentity(txHash, "Ethereum")).toBe(onwardTxIdentity(txHash.toUpperCase(), "Ethereum"));
    expect(onwardTxIdentity(txHash, "Polygon")).not.toBe(onwardTxIdentity(txHash, "Ethereum"));
    const sol = "Ab".repeat(40);
    expect(onwardTxIdentity(sol, "Solana")).not.toBe(onwardTxIdentity(sol.toLowerCase(), "Solana"));
    expect(() => validateOnwardTx("anything", "Ethereum")).toThrow();
  });
  it("does not turn manual, unsupported, underpaid or unconfirmed results into paid", () => {
    expect(canAutoConfirmOnward("automatic", { verified: true })).toBe(true);
    for (const r of [{ verified: false }, { verified: false, manual: true }, { verified: false, pending: true }]) {
      expect(canAutoConfirmOnward("automatic", r)).toBe(false);
    }
    expect(canAutoConfirmOnward("manual", { verified: true })).toBe(false);
  });
  it("protects terminal/pending payments and allows only explicit transitions", () => {
    expect(() => assertOnwardTransition("unpaid", "submit")).not.toThrow();
    expect(() => assertOnwardTransition("pending_confirmation", "confirm")).not.toThrow();
    expect(() => assertOnwardTransition("pending_confirmation", "reject")).not.toThrow();
    expect(() => assertOnwardTransition("unpaid", "cancel")).not.toThrow();
    for (const action of ["submit", "confirm", "reject", "cancel"] as const) expect(() => assertOnwardTransition("paid", action)).toThrow();
    expect(() => assertOnwardTransition("pending_confirmation", "cancel")).toThrow();
    expect(() => assertOnwardTransition("unpaid", "confirm")).toThrow();
  });
});

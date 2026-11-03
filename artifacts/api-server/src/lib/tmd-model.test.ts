import { describe, expect, it } from "vitest";
import { normalisePaymentMethods, hasPaymentMethod, slugify, publicMember, privateMember, money, int, normaliseHandle, HANDLE_RE } from "./tmd-model";

describe("tmd payment methods", () => {
  it("keeps valid rails and drops incomplete or unknown ones", () => {
    const out = normalisePaymentMethods({
      crypto: [{ currency: "usdt", network: "Ethereum", address: "0xabc" }, { currency: "USDC", network: "mars", address: "0x1" }, { currency: "", network: "tron", address: "T1" }],
      paypal: { email: "not-an-email" }, revolut: { handle: "@someone" }, anonpay: { wallet: "0xabc", ticker: "USDC", network: "ERC20" },
    });
    expect(out.crypto).toEqual([{ currency: "USDT", network: "ethereum", address: "0xabc" }]);
    expect(out.paypal).toBeUndefined();
    expect(out.revolut).toEqual({ handle: "someone" });
    expect(out.anonpay).toEqual({ wallet: "0xabc", ticker: "usdc", network: "erc20" });
    expect(hasPaymentMethod(out)).toBe(true);
    expect(hasPaymentMethod(normalisePaymentMethods(null))).toBe(false);
  });
});

describe("tmd input helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("BPC-157 · Batch #2403 (purity + quantity)")).toBe("bpc-157-batch-2403-purity-quantity");
    expect(slugify("   ")).toBe("item");
  });
  it("bounds money and integers", () => {
    expect(money("12.345")).toBe(12.35);
    expect(money(-1, 7)).toBe(7);
    expect(int("3", 1, 1, 10)).toBe(3);
    expect(int("30", 1, 1, 10)).toBe(1);
  });
  it("normalises handles", () => {
    expect(normaliseHandle("@LabRat_1")).toBe("labrat_1");
    expect(HANDLE_RE.test("ab")).toBe(false);
    expect(HANDLE_RE.test("lab-rat")).toBe(true);
    expect(HANDLE_RE.test("-bad")).toBe(false);
  });
});

describe("tmd member shapes", () => {
  const member: any = { id: "m1", displayName: "Jess", anonymous: true, paymentStatus: "verified", amountUsd: "20.00", joinedAt: new Date(), verifiedAt: null, userId: "u1", guestContact: null, paymentMethod: "crypto", paymentCurrency: "USDT", paymentNetwork: "ethereum", paymentAddress: "0x", paymentRef: "0xhash", screenshotKey: null, note: null, submittedAt: null, claimToken: "secret" };
  it("hides the name of anonymous members publicly and never leaks the claim token", () => {
    const pub = publicMember(member);
    expect(pub.displayName).toBe("Anonymous");
    expect((pub as any).claimToken).toBeUndefined();
    expect((pub as any).paymentRef).toBeUndefined();
  });
  it("shows everything to the member and organiser", () => {
    const priv = privateMember(member);
    expect(priv.displayName).toBe("Jess");
    expect(priv.claimToken).toBe("secret");
  });
});

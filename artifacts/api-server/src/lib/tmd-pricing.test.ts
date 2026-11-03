import { describe, expect, it } from "vitest";
import { poolBreakdown, memberShare, fundingProgress } from "./tmd-pricing";

describe("tmd pricing", () => {
  it("adds tests × quantity, shipping and tip, then the platform fee", () => {
    const b = poolBreakdown([{ priceUsd: "120", quantity: 1 }, { priceUsd: 45.5, quantity: 2 }], { shippingUsd: "30", organiserTipUsd: 20, platformFeePct: 0 });
    expect(b).toMatchObject({ tests: 211, shipping: 30, tip: 20, subtotal: 261, fee: 0, target: 261 });
    const withFee = poolBreakdown([{ priceUsd: 100, quantity: 1 }], { shippingUsd: 0, organiserTipUsd: 0, platformFeePct: "5" });
    expect(withFee.fee).toBe(5);
    expect(withFee.target).toBe(105);
  });
  it("treats bad numbers and quantities below one as safe defaults", () => {
    const b = poolBreakdown([{ priceUsd: "abc", quantity: 0 }], { shippingUsd: "x", organiserTipUsd: null as any, platformFeePct: -3 });
    expect(b.target).toBe(0);
    expect(b.feePct).toBe(0);
  });
  it("splits evenly across expected members and never below one dollar", () => {
    expect(memberShare({ splitMode: "even", fixedShareUsd: null, targetUsd: "261", minMembers: 10 })).toBe(26.1);
    expect(memberShare({ splitMode: "even", fixedShareUsd: null, targetUsd: "3", minMembers: 10 })).toBe(1);
    expect(memberShare({ splitMode: "even", fixedShareUsd: null, targetUsd: "100", minMembers: 0 })).toBe(100);
  });
  it("uses the fixed share when set, otherwise falls back to even", () => {
    expect(memberShare({ splitMode: "fixed", fixedShareUsd: "15", targetUsd: "261", minMembers: 10 })).toBe(15);
    expect(memberShare({ splitMode: "fixed", fixedShareUsd: "0", targetUsd: "200", minMembers: 4 })).toBe(50);
  });
  it("reports funding progress", () => {
    expect(fundingProgress("200", "50")).toMatchObject({ pct: 25, remaining: 150, funded: false });
    expect(fundingProgress("200", "200")).toMatchObject({ pct: 100, remaining: 0, funded: true });
    expect(fundingProgress("0", "0").funded).toBe(false);
  });
});

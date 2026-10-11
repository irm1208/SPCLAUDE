import { describe, expect, it, vi } from "vitest";
import { groupBuyCreditsAllowed, validAllowCreditsSetting } from "./group-buy-credit-policy";

describe("group-buy store credit policy", () => {
  it("keeps ordinary orders independent of group-buy settings", async () => {
    const load = vi.fn();
    expect(await groupBuyCreditsAllowed(null, load)).toBe(true);
    expect(load).not.toHaveBeenCalled();
  });
  it("allows enabled groups, rejects disabled or missing settings", async () => {
    expect(await groupBuyCreditsAllowed("gb", async () => true)).toBe(true);
    expect(await groupBuyCreditsAllowed("gb", async () => false)).toBe(false);
    expect(await groupBuyCreditsAllowed("gb", async () => undefined)).toBe(false);
  });
  it("does not turn a failed policy lookup into permission to deduct money", async () => {
    await expect(groupBuyCreditsAllowed("gb", async () => { throw new Error("database unavailable"); })).rejects.toThrow("database unavailable");
  });
  it("accepts actual booleans and omitted fields only", () => {
    expect(validAllowCreditsSetting(false)).toBe(true);
    expect(validAllowCreditsSetting(true)).toBe(true);
    expect(validAllowCreditsSetting(undefined)).toBe(true);
    for (const value of ["false", "true", 0, 1, null, {}]) expect(validAllowCreditsSetting(value)).toBe(false);
  });
});

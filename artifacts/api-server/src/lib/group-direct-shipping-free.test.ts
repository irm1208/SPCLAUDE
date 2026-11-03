import { describe, expect, it } from "vitest";
import { hasFreeDirectHomeShipping, resolveDirectHomeShippingCost } from "@workspace/shipping/group-buy-direct";

describe("HGH 36IU direct-to-home policy", () => {
  it("recognises the specific group, not other groups or wholesale", () => {
    expect(hasFreeDirectHomeShipping("UAJBM")).toBe(true);
    for (const id of [null, undefined, "", "HGH 36IU", "OTHER", "wholesale"]) {
      expect(hasFreeDirectHomeShipping(id)).toBe(false);
    }
  });
  it("charges zero for the 93-kit direct shipment even if a stale quote is supplied", () => {
    expect(resolveDirectHomeShippingCost("UAJBM", 210)).toBe(0);
    expect(93 * 150 + resolveDirectHomeShippingCost("UAJBM", 210)).toBe(13950);
  });
  it("preserves other groups' quoted and free prices", () => {
    expect(resolveDirectHomeShippingCost("OTHER", 210)).toBe(210);
    expect(resolveDirectHomeShippingCost("OTHER", 0)).toBe(0);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stockAllocation, stockQuantity, stockSelection } from "./group-buy-stock";

describe("available stock quantities", () => {
  it("sets available stock without removing already ordered kits", () => {
    expect(stockAllocation("set", 10, 20, 5)).toBe(15);
    expect(stockAllocation("set", 0, 20, 5)).toBe(5);
    expect(stockAllocation("set", 4, null, 2.5)).toBe(6.5);
  });
  it("increases and decreases remaining quantities", () => {
    expect(stockAllocation("increase", 3, 20, 5)).toBe(23);
    expect(stockAllocation("decrease", 3, 20, 5)).toBe(17);
    expect(stockAllocation("increase", 3, 2, 5)).toBe(8);
  });
  it("rejects invalid quantities and negative available stock", () => {
    for (const value of [NaN, Infinity, -1, .25, "", null, true]) expect(() => stockQuantity(value)).toThrow();
    expect(() => stockAllocation("decrease", 6, 10, 5)).toThrow("below zero");
    expect(() => stockAllocation("increase", 0, 10, 5)).toThrow("greater than zero");
  });
  it("requires explicit set when stock is unlimited", () => {
    expect(() => stockAllocation("increase", 5, null, 0)).toThrow("Unlimited");
    expect(() => stockAllocation("decrease", 5, null, 0)).toThrow("Unlimited");
  });
  it("deduplicates selection and rejects empty or malformed IDs", () => {
    expect(stockSelection(["a", "a", "b"])).toEqual(["a", "b"]);
    expect(stockSelection("all")).toBe("all");
    for (const value of [[], null, [" "], [4]]) expect(() => stockSelection(value)).toThrow();
  });
});

describe("group-only organiser stock wiring", () => {
  it("stores overrides on the group/product link, not the shared catalogue", () => {
    const schema = readFileSync(new URL("../../../../lib/db/src/schema/group_buys.ts", import.meta.url), "utf8");
    expect(schema).toContain('stockOverride: numeric("stock_override"');
  });
  it("offers scoped bulk stock updates and separate selection scopes", () => {
    const ui = readFileSync(new URL("../../../peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx", import.meta.url), "utf8");
    expect(ui).toContain("organiserApi.updateStock");
    expect(ui).toContain("Select visible");
    expect(ui).toContain("Select all");
  });
});

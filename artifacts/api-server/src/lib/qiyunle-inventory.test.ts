import { describe, expect, it } from "vitest";
import { filterNonPositiveStockItems } from "./qiyunle-inventory";

describe("filterNonPositiveStockItems", () => {
  it("removes zero and negative stock while preserving positive and invalid values", () => {
    const items = [
      { code: "positive", nums: "12" },
      { code: "zero", nums: "0" },
      { code: "negative", nums: "-3" },
      { code: "invalid", nums: "not-a-number" },
    ];

    expect(filterNonPositiveStockItems(items)).toEqual([
      { code: "positive", nums: "12" },
      { code: "invalid", nums: "not-a-number" },
    ]);
  });
});
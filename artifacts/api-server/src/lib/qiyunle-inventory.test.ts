import { describe, expect, it } from "vitest";
import {
  filterNonPositiveStockItems,
  findUnavailableMappedCodes,
} from "./qiyunle-inventory";

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

describe("findUnavailableMappedCodes", () => {
  it("finds mappings absent from the current positive-stock feed", () => {
    expect(findUnavailableMappedCodes(
      ["BP10-0712", "BP10-0823", "CAG10-0802"],
      ["BP10-0823", "CAG10-0802"],
    )).toEqual(["BP10-0712"]);
  });
});
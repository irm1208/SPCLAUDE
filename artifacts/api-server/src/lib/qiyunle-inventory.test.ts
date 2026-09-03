import { describe, expect, it } from "vitest";
import {
  filterNonPositiveStockItems,
  findUnavailableMappedCodes,
  findUniqueBatchProductId,
  normalizeQiyunleStock,
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

describe("findUniqueBatchProductId", () => {
  const mappings = [
    { qiyunleCode: "KS10-0731", productId: "kiss" },
    { qiyunleCode: "Mito120-0524", productId: "mitoprime" },
    { qiyunleCode: "ZE30-0831", productId: "tir30" },
  ];

  it("carries an existing product mapping to a newer dated batch code", () => {
    expect(findUniqueBatchProductId("KS10-0903", mappings)).toBe("kiss");
    expect(findUniqueBatchProductId("MITO120-0902", mappings)).toBe("mitoprime");
    expect(findUniqueBatchProductId("ZE30-0903", mappings)).toBe("tir30");
  });

  it("does not guess when the same base code maps to multiple products", () => {
    expect(findUniqueBatchProductId("KS10-0903", [
      ...mappings,
      { qiyunleCode: "KS10-0801", productId: "different-product" },
    ])).toBeNull();
  });

  it("does not match a different product base or dose", () => {
    expect(findUniqueBatchProductId("KS20-0903", mappings)).toBeNull();
  });
});

describe("normalizeQiyunleStock", () => {
  it("keeps positive stock and turns zero or negative stock into the OOS value", () => {
    expect(normalizeQiyunleStock("12")).toBe(12);
    expect(normalizeQiyunleStock("0")).toBe(0);
    expect(normalizeQiyunleStock("-3")).toBe(0);
  });

  it("returns null for an invalid stock value", () => {
    expect(normalizeQiyunleStock("not-a-number")).toBeNull();
  });
});
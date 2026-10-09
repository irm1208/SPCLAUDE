import { describe, expect, it } from "vitest";
import { ListLabTestsResponseItem } from "../../../../../lib/api-zod/src/generated/api";
import { parseLabTestBatchCode } from "../lab-test-warehouse";

describe("parseLabTestBatchCode", () => {
  it("derives an explicit warehouse while preserving the product batch code", () => {
    expect(parseLabTestBatchCode("  us-SS50-0831  ")).toEqual({
      warehouse: "US",
      productBatchCode: "SS50-0831",
    });
    expect(parseLabTestBatchCode("Uk-OZ10-0612")).toEqual({
      warehouse: "UK",
      productBatchCode: "OZ10-0612",
    });
  });

  it("does not infer a warehouse from unrecognized prefixes", () => {
    expect(parseLabTestBatchCode("EU-SS50-0831")).toEqual({
      warehouse: null,
      productBatchCode: "EU-SS50-0831",
    });
    expect(parseLabTestBatchCode("SS50-0831")).toEqual({
      warehouse: null,
      productBatchCode: "SS50-0831",
    });
    expect(parseLabTestBatchCode(null)).toEqual({
      warehouse: null,
      productBatchCode: null,
    });
  });
});

describe("generated LabTest API contract", () => {
  const baseRecord = {
    id: 1,
    url: "https://example.test/coa",
    peptideName: "SS-31",
    supplier: "Uther",
    labName: "Janoshik",
    isThirdPartyTest: true,
    pending: false,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  };

  it("accepts US, UK, and nullable warehouse values and rejects unknown values", () => {
    expect(ListLabTestsResponseItem.safeParse({ ...baseRecord, warehouse: "US" }).success).toBe(true);
    expect(ListLabTestsResponseItem.safeParse({ ...baseRecord, warehouse: "UK" }).success).toBe(true);
    expect(ListLabTestsResponseItem.safeParse({ ...baseRecord, warehouse: null }).success).toBe(true);
    expect(ListLabTestsResponseItem.safeParse({ ...baseRecord, warehouse: "EU" }).success).toBe(false);
  });
});

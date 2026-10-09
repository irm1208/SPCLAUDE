import { describe, expect, it } from "vitest";
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

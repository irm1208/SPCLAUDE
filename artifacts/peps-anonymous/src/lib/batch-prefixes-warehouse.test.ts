import { describe, expect, it } from "vitest";
import {
  batchCodeMatchesPrefix,
  doseForBatchCode,
  getLabTestWarehouse,
  resolveBatchPrefixName,
  stripWarehousePrefix,
} from "./batch-prefixes";
import { resolveUtherName } from "./uther-batch-codes";

describe("warehouse-aware batch code matching", () => {
  it("identifies and removes only leading US/UK warehouse prefixes", () => {
    expect(getLabTestWarehouse("  uS-SS50-0831 ")).toBe("US");
    expect(getLabTestWarehouse("uk-OZ10-0612")).toBe("UK");
    expect(getLabTestWarehouse("EU-SS50-0831")).toBeNull();
    expect(stripWarehousePrefix("US-SS50-0831")).toBe("SS50-0831");
    expect(stripWarehousePrefix("EU-SS50-0831")).toBe("EU-SS50-0831");
  });

  it("matches product prefixes after removing a warehouse, with exact dose boundaries", () => {
    expect(batchCodeMatchesPrefix("US-SS50-0831", "SS50")).toBe(true);
    expect(batchCodeMatchesPrefix("US-SS50-0831", "SS30")).toBe(false);
    expect(doseForBatchCode("US-SS50-0831")).toBe("50mg");
    expect(resolveBatchPrefixName("US-SS50-0831")?.dose).toBe("50mg");
    expect(batchCodeMatchesPrefix("UK-RE10-0603", "RE10")).toBe(true);
    expect(batchCodeMatchesPrefix("EU-RE10-0603", "RE10")).toBe(false);
    expect(resolveUtherName("Uther", "US-SS50-0831", "")).toBe("SS-31 (Elamipretide) 50mg");
  });
});

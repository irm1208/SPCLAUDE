import { describe, it, expect } from "vitest";
import { groupByVendor, isMultiVendor } from "./vendor-grouping";

describe("groupByVendor", () => {
  it("groups by vendor preserving first-seen order", () => {
    const g = groupByVendor([
      { id: 1, vendorId: "b", vendorName: "Beta" },
      { id: 2, vendorId: "a", vendorName: "Alpha" },
      { id: 3, vendorId: "b", vendorName: "Beta" },
    ]);
    expect(g.map(x => x.vendorId)).toEqual(["b", "a"]);
    expect(g[0].items.map(i => i.id)).toEqual([1, 3]);
  });
  it("puts untagged items in one group and reports multi-vendor correctly", () => {
    expect(groupByVendor([{ id: 1 }, { id: 2 }])).toHaveLength(1);
    expect(isMultiVendor([{ vendorId: "a" }, { vendorId: "a" }])).toBe(false);
    expect(isMultiVendor([{ vendorId: "a" }, { vendorId: "b" }])).toBe(true);
  });
});

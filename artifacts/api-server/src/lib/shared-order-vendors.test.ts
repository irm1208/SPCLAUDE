import { describe, expect, it } from "vitest";
import { parseSharedOrderVendors, sharedOrderAllowsVendor, sharedOrderVendorConflict } from "./shared-order-vendors";

describe("shared-order supplier selection", () => {
  const vendors = [{ id: "uther" }, { id: "jbg" }];
  it("accepts either supplier or both, never an empty or unavailable selection", () => {
    expect(parseSharedOrderVendors(["uther"], vendors)).toEqual(["uther"]);
    expect(parseSharedOrderVendors(["jbg"], vendors)).toEqual(["jbg"]);
    expect(parseSharedOrderVendors(["uther", "jbg", "uther"], vendors)).toEqual(["uther", "jbg"]);
    for (const value of [[], null, "uther", ["unknown"], [1]]) {
      expect(() => parseSharedOrderVendors(value, vendors)).toThrow();
    }
  });
  it("preserves legacy all-supplier orders but enforces explicit restrictions", () => {
    expect(sharedOrderAllowsVendor(null, "jbg")).toBe(true);
    expect(sharedOrderAllowsVendor(["uther"], "jbg")).toBe(false);
    expect(sharedOrderAllowsVendor(["uther", "jbg"], "jbg")).toBe(true);
  });
  it("blocks excluding any saved member items, including legacy items", () => {
    expect(sharedOrderVendorConflict(["uther"], [[{ quantity: 2, vendorId: "jbg" }]], "uther")).toBe(true);
    expect(sharedOrderVendorConflict(["jbg"], [[{ quantity: 1 }]], "uther")).toBe(true);
    expect(sharedOrderVendorConflict(["uther", "jbg"], [[{ quantity: 2, vendorId: "jbg" }]], "uther")).toBe(false);
    expect(sharedOrderVendorConflict(["jbg"], [[], [{ quantity: 0, vendorId: "uther" }]], "uther")).toBe(false);
  });
});

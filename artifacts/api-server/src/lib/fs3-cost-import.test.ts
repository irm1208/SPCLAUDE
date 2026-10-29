import { describe, expect, it } from "vitest";
import { planFs3CostImport } from "./fs3-cost-import";

const vendors = [
  { id: "ur", name: "UR", legacyCatalogueVendor: "Uther" },
  { id: "other", name: "Other" },
];
const products = [
  { id: "a", name: "Semaglutide 10mg", vendor: "UTHER", wholesaleVendorId: null, wholesaleCost: null },
  { id: "b", name: "Na Semax 10mg", vendor: "Uther", wholesaleVendorId: "ur", wholesaleCost: null },
  { id: "c", name: "Semaglutide 10mg", vendor: "Uther", wholesaleVendorId: "other", wholesaleCost: null },
  { id: "d", name: "Semaglutide 10mg", vendor: "Uther", wholesaleVendorId: null, wholesaleCost: "0.00" },
  { id: "e", name: "Unknown 10mg", vendor: "Uther", wholesaleVendorId: null, wholesaleCost: null },
];
const costs = [
  { productName: "semaglutide 10mg", unitCost: "50.00" },
  { productName: "Na Semax", unitCost: "60.00" },
];

describe("reviewed UR cost import", () => {
  it("fills only missing costs for the selected UR vendor, preserving zero and other vendors", () => {
    const result = planFs3CostImport(products, vendors, "ur", costs);
    expect(result.matches).toEqual([
      { id: "a", name: "Semaglutide 10mg", cost: "50.00" },
      { id: "b", name: "Na Semax 10mg", cost: "60.00" },
    ]);
    expect(result.preserved).toBe(1);
    expect(result.skipped.map(p => p.id)).toEqual(["e"]);
    expect(products[0].wholesaleCost).toBeNull();
  });
  it("requires a new review when prices, names, assignments or existing costs change", () => {
    const before = planFs3CostImport(products, vendors, "ur", costs).previewToken;
    expect(planFs3CostImport(products, vendors, "ur", [...costs.slice(0, 1), { productName: "Na Semax", unitCost: "65" }]).previewToken).not.toBe(before);
    expect(planFs3CostImport(products.map(p => p.id === "a" ? { ...p, wholesaleCost: "49" } : p), vendors, "ur", costs).previewToken).not.toBe(before);
    expect(planFs3CostImport(products.map(p => p.id === "a" ? { ...p, wholesaleVendorId: "other" } : p), vendors, "ur", costs).previewToken).not.toBe(before);
    expect(planFs3CostImport([...products].reverse(), vendors, "ur", costs).previewToken).toBe(before);
  });
  it("does not let another supplier borrow the legacy FS3 price list", () => {
    expect(() => planFs3CostImport(products, vendors, "other", costs)).toThrow(/UR/);
    expect(() => planFs3CostImport(products, vendors, "missing", costs)).toThrow();
  });
  it("skips conflicting prices and never guesses another strength", () => {
    const result = planFs3CostImport(products, vendors, "ur", [...costs, { productName: "Semaglutide 10mg", unitCost: "99" }]);
    expect(result.matches.map(p => p.id)).toEqual(["b"]);
    expect(result.skipped.map(p => p.id)).toEqual(["a", "e"]);
  });
});

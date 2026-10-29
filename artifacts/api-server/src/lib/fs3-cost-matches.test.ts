import { describe, expect, it } from "vitest";
import { resolveFs3Cost, resolveFs3SupplierId, type Fs3CostMatch } from "@workspace/api-zod/fs3-costs";

const costs = [{ productName: "KPV 30mg", unitCost: "110" }];
const match: Fs3CostMatch = {
  vendorId: null, productName: "NA KPV 30mg", costName: "KPV 30mg",
  reviewedAt: "2026-10-29T00:00:00.000Z", reviewedBy: "Admin", reviewNote: "Confirmed equivalent", active: true,
};
describe("reviewed FS3 cost matches", () => {
  it("resolves supplier identity from line, share, order and legacy catalogue metadata without guessing", () => {
    const vendors = [{ id: "a", name: "Supplier A", legacyCatalogueVendor: "Legacy A" }, { id: "b", name: "Supplier B" }];
    expect(resolveFs3SupplierId({ vendorId: "b", shareVendorId: "a" }, {}, vendors)).toBe("b");
    expect(resolveFs3SupplierId({ shareVendorId: "a" }, {}, vendors)).toBe("a");
    expect(resolveFs3SupplierId({ wholesaleVendorId: "b" }, {}, vendors)).toBe("b");
    expect(resolveFs3SupplierId({}, { vendor: " Legacy A " }, vendors)).toBe("a");
    expect(resolveFs3SupplierId({ legacyVendor: "Supplier B" }, {}, vendors)).toBe("b");
    expect(resolveFs3SupplierId({}, {}, vendors)).toBeNull();
    expect(resolveFs3SupplierId({}, { vendor: "Unknown" }, vendors)).not.toBeNull();
    expect(resolveFs3SupplierId({}, { vendor: "Legacy A" }, [...vendors, { id: "c", name: "Legacy A" }])).not.toBe("a");
  });
  it("requires an explicit active review and never infers strengths or modifications", () => {
    expect(resolveFs3Cost(costs, [], match.productName)).toBeNull();
    expect(resolveFs3Cost(costs, [match], match.productName)).toBe(110);
    expect(resolveFs3Cost(costs, [{ ...match, active: false }], match.productName)).toBeNull();
    expect(resolveFs3Cost(costs, [{ ...match, reviewedAt: "" }], match.productName)).toBeNull();
    expect(resolveFs3Cost(costs, [match], "NA KPV 40mg")).toBeNull();
    expect(resolveFs3Cost(costs, [match], "Acetyl KPV 30mg")).toBeNull();
  });
  it("isolates vendor matches and never falls back to legacy for an explicit vendor", () => {
    expect(resolveFs3Cost(costs, [match], match.productName, "supplier-a")).toBeNull();
    const scoped = { ...match, vendorId: "supplier-a" };
    expect(resolveFs3Cost(costs, [scoped], match.productName, "supplier-a")).toBe(110);
    expect(resolveFs3Cost(costs, [scoped], match.productName, "supplier-b")).toBeNull();
    expect(resolveFs3Cost(costs, [scoped], match.productName)).toBeNull();
  });
  it("keeps exact costs authoritative, including conflicting or invalid exact costs", () => {
    expect(resolveFs3Cost([...costs, { productName: match.productName, unitCost: "125" }], [match], match.productName)).toBe(125);
    expect(resolveFs3Cost([...costs, { productName: match.productName, unitCost: "bad" }], [match], match.productName)).toBeNull();
    expect(resolveFs3Cost([...costs, { productName: "kpv 30mg", unitCost: "95" }], [match], match.productName)).toBeNull();
    expect(resolveFs3Cost(costs, [], "KPV 30mg", "supplier-a", true)).toBe(110);
    expect(resolveFs3Cost(costs, [], "KPV 30mg", "supplier-a", false)).toBeNull();
  });
  it("does not chain matches or tolerate conflicting targets", () => {
    expect(resolveFs3Cost(costs, [{ ...match, costName: "intermediate" }, { ...match, productName: "intermediate" }], match.productName)).toBeNull();
    expect(resolveFs3Cost(costs, [match, { ...match, costName: "other" }], match.productName)).toBeNull();
    expect(resolveFs3Cost([], [match], match.productName)).toBeNull();
  });
});

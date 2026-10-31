import { describe, it, expect } from "vitest";
import { quoteVendorShipping, resolveProductVendor, parseVendorShippingSplit } from "./multi-vendor-shipping";

const vendors = ["uther", "second"].map((id) => ({
  id, name: id, tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25,
  regions: [{ name: "UK", countries: ["GB"], prices: [id === "uther" ? 50 : 30] }],
}));
describe("multi-vendor shipping", () => {
  it("validates organiser shipping rules and preserves legacy buyer-only defaults", () => {
    expect(parseVendorShippingSplit({ uther: "buyers", second: "all_members" }, vendors))
      .toEqual({ uther: "buyers", second: "all_members" });
    expect(parseVendorShippingSplit(null, vendors)).toEqual({});
    for (const value of [[], "all_members", { missing: "buyers" }, { uther: "free" }]) {
      expect(() => parseVendorShippingSplit(value, vendors)).toThrow();
    }
  });
  const members = [
    [{ vendorId: "uther", quantity: 2 }],
    [{ vendorId: "second", quantity: 1 }],
    [{ vendorId: "uther", quantity: 1 }, { vendorId: "second", quantity: 1 }],
    [],
  ];
  it("lets the organiser share both suppliers across everyone with items", () => {
    const result = quoteVendorShipping(vendors, members, "GB", "even", null, null,
      { uther: "all_members", second: "all_members" });
    expect(result.total).toBe(80);
    expect(result.members.map(parts => Number(parts.reduce((s, p) => s + (p.shipping ?? 0), 0).toFixed(2))))
      .toEqual([26.67, 26.67, 26.66, 0]);
    expect(result.members[1].find(p => p.vendorId === "uther")?.kits).toBe(0);
    expect(result.members.flat().reduce((s, p) => s + Math.round((p.shipping ?? 0) * 100), 0)).toBe(8000);
  });
  it("supports independent choices for Uther and JBG shipping", () => {
    const result = quoteVendorShipping(vendors, members, "GB", "even", null, null,
      { uther: "buyers", second: "all_members" });
    expect(result.members.map(parts => parts.reduce((s, p) => s + (p.shipping ?? 0), 0))).toEqual([35, 10, 35, 0]);
  });
  it("uses each participant's total order size when sharing a supplier across everyone", () => {
    const result = quoteVendorShipping(vendors, members, "GB", "by_size", null, null,
      { uther: "all_members", second: "all_members" });
    expect(result.members.map(parts => parts.reduce((s, p) => s + (p.shipping ?? 0), 0))).toEqual([32, 16, 32, 0]);
    expect(result.breakdown.map(p => p.kits)).toEqual([3, 2]);
  });
  it("splits only among members ordering from each vendor", () => {
    const result = quoteVendorShipping(vendors, [
      [{ vendorId: "uther", quantity: 2 }],
      [{ vendorId: "second", quantity: 1 }],
      [{ vendorId: "uther", quantity: 1 }, { vendorId: "second", quantity: 1 }],
    ], "GB", "even");
    expect(result.total).toBe(80);
    expect(result.members.map(m => m.reduce((s, v) => s + (v.shipping ?? 0), 0))).toEqual([25, 15, 40]);
  });
  it("uses by-size allocation and preserves cents", () => {
    const r = quoteVendorShipping(vendors, [[{vendorId:"uther",quantity:2}], [{vendorId:"uther",quantity:1}]], "GB", "by_size");
    expect(r.members.flat().reduce((s,v)=>s+(v.shipping ?? 0),0)).toBe(50);
    expect(r.members[0][0].shipping).toBe(33.33);
  });
  it("never treats an unknown vendor or unsupported destination as free shipping", () => {
    expect(quoteVendorShipping(vendors, [[{vendorId:"missing",quantity:1}]], "GB", "even").total).toBeNull();
    expect(quoteVendorShipping(vendors, [[{vendorId:"uther",quantity:1}]], "ZZ", "even").total).toBeNull();
  });
  it("resolves legacy names only unambiguously and never substitutes another vendor for an explicit id", () => {
    expect(resolveProductVendor({vendor:"uther"},vendors)?.id).toBe("uther");
    expect(resolveProductVendor({vendor:"uther",wholesaleVendorId:"deleted"},vendors)).toBeNull();
    expect(resolveProductVendor({vendor:"uther"},[...vendors, {...vendors[0],id:"duplicate"}])).toBeNull();
  });
});

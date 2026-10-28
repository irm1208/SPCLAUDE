import { describe, it, expect } from "vitest";
import { quoteVendorShipping, resolveProductVendor } from "./multi-vendor-shipping";

const vendors = ["uther", "second"].map((id) => ({
  id, name: id, tiers: ["1–25"], tierBounds: [25], maxKitsPerPackage: 25,
  regions: [{ name: "UK", countries: ["GB"], prices: [id === "uther" ? 50 : 30] }],
}));
describe("multi-vendor shipping", () => {
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

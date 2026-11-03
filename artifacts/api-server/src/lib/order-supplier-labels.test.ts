import { describe, expect, it } from "vitest";
import { orderSupplierLabels } from "./order-supplier-labels";
const vendors = [{ id: "u", name: "Uther", legacyCatalogueVendor: "UR" }, { id: "j", name: "JBG/YT" }];
describe("Admin order supplier labels", () => {
  it("shows the chosen order supplier without needing a product lookup", () => {
    expect(orderSupplierLabels({ orderType: "wholesale", wholesaleVendorId: "j" }, [{}], [], vendors)).toEqual(["JBG/YT"]);
  });
  it("shows both actual line suppliers and deduplicates repeated lines", () => {
    expect(orderSupplierLabels({ orderType: "wholesale_shared" }, [{ vendorId: "j" }, { vendorId: "u" }, { vendorId: "j" }], [], vendors)).toEqual(["JBG/YT", "Uther"]);
  });
  it("uses the share vendor for legacy shared lines", () => {
    expect(orderSupplierLabels({ orderType: "wholesale_shared" }, [{}], [], vendors, "u")).toEqual(["Uther"]);
  });
  it("resolves catalogue supplier identities by persisted product ID, not product name", () => {
    expect(orderSupplierLabels({ orderType: "wholesale" }, [{ productId: "p" }], [{ id: "p", vendor: "UR" }], vendors)).toEqual(["Uther"]);
    expect(orderSupplierLabels({ orderType: "wholesale" }, [{}], [{ id: "p", vendor: "UR" }], vendors)).toEqual(["Supplier not recorded"]);
  });
  it("does not invent a supplier for unknown orders or show wholesale badges on group buys", () => {
    expect(orderSupplierLabels({ orderType: "wholesale", wholesaleVendorId: "missing" }, [{}], [], vendors)).toEqual(["Supplier not recorded"]);
    expect(orderSupplierLabels({ orderType: "group_buy" }, [{ vendorId: "u" }], [], vendors)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { JBG_YT_CATALOGUE, isJbgYtVendor, jbgYtProductId } from "./jbg-yt-catalogue";

describe("JBG/YT supplied catalogue", () => {
  it("contains all 56 unique SKUs, each with 100,000 stock and valid separate prices", () => {
    expect(JBG_YT_CATALOGUE).toHaveLength(56);
    expect(new Set(JBG_YT_CATALOGUE.map(row => row.sku)).size).toBe(56);
    for (const row of JBG_YT_CATALOGUE) {
      expect(row.stock).toBe(100000);
      expect(Number(row.wholesaleCost)).toBeGreaterThan(0);
      expect(Number(row.wholesalePrice)).toBeGreaterThan(0);
    }
  });
  it("uses the corrected supplier costs and selling prices without borrowing FS3 prices", () => {
    const row = (sku: string) => JBG_YT_CATALOGUE.find(p => p.sku === sku)!;
    expect(row("50AM")).toMatchObject({ wholesaleCost: "46.00", wholesalePrice: "60.00" });
    expect(row("BAC10")).toMatchObject({ wholesaleCost: "10.00", wholesalePrice: "15.00" });
    expect(row("BAC3")).toMatchObject({ wholesaleCost: "7.00", wholesalePrice: "10.00" });
    expect(row("AHK-CU100")).toMatchObject({ wholesaleCost: "46.00", wholesalePrice: "50.00" });
    expect(row("RT30")).toMatchObject({ wholesaleCost: "88.00", wholesalePrice: "95.00" });
    expect(row("TR100")).toMatchObject({ wholesaleCost: "180.00", wholesalePrice: "200.00" });
    expect(row("MS40")).toMatchObject({ wholesaleCost: "134.40", wholesalePrice: "160.00" });
    expect(row("BB10").name).toContain("(17-23) Fragment");
  });
  it("recognises only JBG/YT and keeps product identities vendor scoped and repeatable", () => {
    expect(isJbgYtVendor(" JBG / YT ")).toBe(true);
    for (const name of ["Uther", "UR", "JBG", "Other JBG/YT"]) expect(isJbgYtVendor(name)).toBe(false);
    expect(jbgYtProductId("vendor-one", "RT10")).not.toBe(jbgYtProductId("vendor-two", "RT10"));
    expect(jbgYtProductId("vendor-one", "RT10")).toBe("jbg-yt:vendor-one:RT10");
  });
});

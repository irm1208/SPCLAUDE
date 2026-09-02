import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../group-buys-admin.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(
  new URL("../../../../../lib/db/src/schema/group_buys.ts", import.meta.url),
  "utf8",
);
const startupSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const shippingTabSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/ShippingSplitTab.tsx", import.meta.url),
  "utf8",
);
const adminShellSource = readFileSync(
  new URL("../../../../peps-anonymous/src/components/admin/group-buys/GbDetailShell.tsx", import.meta.url),
  "utf8",
);

describe("saved Group Buy shipping splits", () => {
  it("defines and migrates a JSONB field for the last applied split", () => {
    expect(schemaSource).toContain(
      'vendorShippingSplit: jsonb("vendor_shipping_split")',
    );
    expect(startupSource).toMatch(
      /ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_split jsonb/,
    );
  });

  it("returns the saved split from organiser settings and persists it during apply", () => {
    expect(organiserSource).toContain(
      "vendorShippingSplit: groupBuysTable.vendorShippingSplit",
    );
    expect(organiserSource).toContain("res.json({ excludedProductIds, split: gb.vendorShippingSplit ?? null })");
    expect(organiserSource).toContain("vendorShippingSplit: savedSplit");
    expect(organiserSource).toContain("singleVialProductIds?: string[]");
  });

  it("exposes admin-protected settings routes and persists the same split contract", () => {
    const getRouteStart = adminSource.indexOf(
      'router.get("/admin/group-buys/:id/shipping-settings"',
    );
    const putRouteStart = adminSource.indexOf(
      'router.put("/admin/group-buys/:id/shipping-settings"',
    );

    expect(getRouteStart).toBeGreaterThan(-1);
    expect(putRouteStart).toBeGreaterThan(-1);
    expect(adminSource.slice(getRouteStart, getRouteStart + 300)).toContain("requireAdmin(req, res)");
    expect(adminSource.slice(putRouteStart, putRouteStart + 300)).toContain("requireAdmin(req, res)");
    expect(adminSource).toContain("vendorShippingSplit: savedSplit");
  });

  it("hydrates and applies the shared tab through role-specific API paths", () => {
    expect(shippingTabSource).toContain('accessMode?: "organiser" | "admin"');
    expect(shippingTabSource).toContain("settingsData.split");
    expect(shippingTabSource).toContain("singleVialProductIds,");
    expect(shippingTabSource).toContain('"x-admin-secret": adminSecret');
  });

  it("adds the shared Shipping Split tab to the admin Group Buy detail", () => {
    expect(adminShellSource).toContain('"shippingsplit"');
    expect(adminShellSource).toContain('label: "Shipping Split"');
    expect(adminShellSource).toContain("<ShippingSplitTab");
  });
});
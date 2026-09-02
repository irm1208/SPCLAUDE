import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(
  new URL("../../../../../lib/db/src/schema/group_buys.ts", import.meta.url),
  "utf8",
);

describe("organiser shipping product exclusions", () => {
  it("defines the persisted Group Buy JSONB field", () => {
    expect(schemaSource).toContain(
      'vendorShippingExcludedProductIds: jsonb("vendor_shipping_excluded_product_ids").$type<string[]>().notNull().default([])',
    );
  });

  it("exposes organiser-scoped GET and PUT settings routes", () => {
    expect(organiserSource).toContain(
      'router.get("/organiser/group-buys/:id/shipping-settings", requireOrganiser',
    );
    expect(organiserSource).toContain(
      'router.put("/organiser/group-buys/:id/shipping-settings", requireOrganiser',
    );
    expect(organiserSource.match(/gbOwner\(req, id\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("validates saved IDs against products belonging to the Group Buy", () => {
    const routeStart = organiserSource.indexOf(
      'router.put("/organiser/group-buys/:id/shipping-settings"',
    );
    const routeEnd = organiserSource.indexOf("\n});", routeStart);
    const routeSource = organiserSource.slice(routeStart, routeEnd);

    expect(routeSource).toContain("groupBuyProductsTable.groupBuyId");
    expect(routeSource).toContain("inArray(groupBuyProductsTable.productId, productIds)");
    expect(routeSource).toContain("vendorShippingExcludedProductIds: productIds");
  });
});
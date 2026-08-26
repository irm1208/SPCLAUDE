import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ordersSource = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../group-buys-admin.ts", import.meta.url), "utf8");
const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const groupBuysSource = readFileSync(new URL("../group-buys.ts", import.meta.url), "utf8");

describe("country-specific group-buy admin fee routes", () => {
  it("resolves a new order fee using the stored country overrides and delivery country", () => {
    const createStart = ordersSource.indexOf('router.post("/orders"');
    const createEnd = ordersSource.indexOf('router.get("/orders/');
    const createRoute = ordersSource.slice(createStart, createEnd);

    expect(createRoute).toContain("adminFeeCountries: groupBuysTable.adminFeeCountries");
    expect(createRoute).toContain("resolveGroupBuyAdminFee({");
    expect(createRoute).toContain("shippingCountry: clientShippingCountry");
  });

  it("recomputes an existing percentage fee using the order delivery country", () => {
    const editStart = ordersSource.indexOf('router.put("/orders/:orderId"');
    const editEnd = ordersSource.indexOf('router.post("/orders/:orderId/shipping-address"');
    const editRoute = ordersSource.slice(editStart, editEnd);

    expect(editRoute).toContain("adminFeeCountries: groupBuysTable.adminFeeCountries");
    expect(editRoute).toContain("resolveGroupBuyAdminFee({");
    expect(editRoute).toContain("shippingCountry: clientShippingCountry ?? order.shippingCountry");
  });

  it.each([
    ["admin", adminSource, 'router.post("/admin/group-buys/:gbId/backfill-admin-fee"'],
    ["organiser", organiserSource, 'router.post("/organiser/group-buys/:id/backfill-admin-fee"'],
  ])("%s backfill resolves each order using its shipping country", (_role, source, marker) => {
    const start = source.indexOf(marker);
    const route = source.slice(start, source.indexOf("\n});", start) + 4);

    expect(route).toContain("shippingCountry: ordersTable.shippingCountry");
    expect(route).toContain("resolveGroupBuyAdminFee({");
  });

  it("persists country overrides when an admin creates a group buy", () => {
    const createStart = adminSource.indexOf('router.post("/admin/group-buys"');
    const createEnd = adminSource.indexOf('router.patch("/admin/group-buys/:id"');
    const createRoute = adminSource.slice(createStart, createEnd);

    expect(createRoute).toContain("adminFeeCountries");
    expect(createRoute).toContain("JSON.stringify(adminFeeCountries)");
  });

  it("includes country overrides in the customer group-buy payload", () => {
    expect(groupBuysSource).toContain("adminFeeCountries: groupBuysTable.adminFeeCountries");
  });
});
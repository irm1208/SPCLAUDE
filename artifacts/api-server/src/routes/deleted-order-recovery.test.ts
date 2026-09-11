import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSource = readFileSync(new URL("./account.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");
const ordersSource = readFileSync(new URL("./orders.ts", import.meta.url), "utf8");

describe("soft-deleted order recovery", () => {
  it("keeps customer and admin recovery available for the full 14-day retention period", () => {
    const accountDeletedOrders = accountSource.slice(
      accountSource.indexOf('router.get("/account/orders/deleted"'),
      accountSource.indexOf("// GET /api/account/order-by-code"),
    );
    const accountRestore = accountSource.slice(
      accountSource.indexOf('router.post("/account/orders/:id/restore"'),
      accountSource.indexOf("// PATCH /api/account/health-consent"),
    );
    const adminTrash = adminSource.slice(
      adminSource.indexOf('router.get("/admin/orders/trash"'),
      adminSource.indexOf("// ─── GET /api/admin/orders/:id ─"),
    );

    expect(accountDeletedOrders).toContain("14 * 24 * 60 * 60 * 1000");
    expect(accountRestore).toContain("14 * 24 * 60 * 60 * 1000");
    expect(adminTrash).toContain("14 * 24 * 60 * 60 * 1000");
  });

  it("does not let a signed-in customer edit a soft-deleted order", () => {
    const updateHandler = ordersSource.slice(
      ordersSource.indexOf('router.put("/orders/:orderId"'),
      ordersSource.indexOf('router.post("/orders/:orderId/shipping-address"'),
    );
    const orderLookup = updateHandler.slice(
      updateHandler.indexOf("const [order]"),
      updateHandler.indexOf("// Timing-safe code comparison"),
    );

    expect(orderLookup).toContain("isNull(ordersTable.deletedAt)");
  });
});
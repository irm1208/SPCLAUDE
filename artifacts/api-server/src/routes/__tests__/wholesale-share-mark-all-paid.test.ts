import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.resolve(here, "../wholesale-shares.ts"), "utf8");
const adminSource = fs.readFileSync(
  path.resolve(here, "../../../../peps-anonymous/src/pages/Admin.tsx"),
  "utf8",
);

describe("admin whole shared-order payment", () => {
  it("adds an admin-only atomic endpoint for marking every member order paid", () => {
    const routeStart = routeSource.indexOf(
      'router.post("/admin/wholesale-shares/:id/mark-all-paid"',
    );
    expect(routeStart).toBeGreaterThanOrEqual(0);
    const route = routeSource.slice(routeStart, routeSource.indexOf(
      "\nrouter.",
      routeStart + 1,
    ));

    expect(route).toContain("if (!requireAdmin(req, res)) return;");
    expect(route).toContain("db.transaction(async (tx)");
    expect(route).toContain('.for("update")');
    expect(route).toContain("assertNoActiveRefunds(tx, orderIds)");
    expect(route).toContain("refundMutableOrderWhere");
    expect(route).toContain('paymentStatus: "confirmed"');
    expect(route).toContain("const paymentConfirmedAt = new Date()");
    expect(route).toContain("paymentConfirmedAt,");
    expect(route).toContain('locked.status !== "locked" && locked.status !== "submitted"');
    expect(route).toContain('status: "submitted"');
    expect(route).toContain("wholesale_share_admin_all_member_payments_marked");
    expect(route).toContain("organiserPaymentStatus");
  });

  it("puts the whole-order action beside the aggregate payment summary", () => {
    expect(adminSource).toContain("/admin/wholesale-shares/${row.id}/mark-all-paid");
    expect(adminSource).toContain("Mark all paid");
    expect(adminSource).toContain("Could not confirm whole shared-order payment");
    expect(adminSource).toContain("Whole shared order was marked paid, but refreshing");
    expect(adminSource).toContain("mark the entire shared order as paid");
  });
});
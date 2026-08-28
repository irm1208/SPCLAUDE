import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  new URL("../wholesale-shares.ts", import.meta.url),
  "utf8",
);

describe("shared-order organiser fee reconciliation wiring", () => {
  it("reconciles every fee save when an open share already has materialised orders", () => {
    expect(routeSource).toContain("hasMaterialisedMember");
    expect(routeSource).toContain("member.orderId");
    expect(routeSource).toContain("if (hasMaterialisedMember)");
    expect(routeSource).not.toContain("changedMaterialisedFee");
  });

  it("persists the configured organiser fee when preserving a payment-started order on relock", () => {
    const preservedOrderBranch = routeSource.slice(
      routeSource.indexOf("if (existingOrder && preservedOrderIds.has(existingOrder.id))"),
      routeSource.indexOf("if (existingOrder) {", routeSource.indexOf("if (existingOrder && preservedOrderIds.has(existingOrder.id))")),
    );
    expect(preservedOrderBranch).toContain("organiserFee: organiserFee.toFixed(2)");
  });

  it("allows admin reconciliation while a materialised share is reopened", () => {
    const adminReconciliationRoute = routeSource.slice(
      routeSource.indexOf('router.post("/admin/wholesale-shares/:id/reconcile-organiser-fees"'),
      routeSource.indexOf('router.post("/admin/wholesale-shares/reconcile-organiser-fees"'),
    );
    expect(adminReconciliationRoute).toContain('if (share.status !== "open" && share.status !== "locked")');
  });

  it("passes existing balance-payment evidence into the fail-closed money helper", () => {
    expect(routeSource).toContain("hasExistingBalancePayment:");
    expect(routeSource).toContain("order.balancePaymentStatus");
    expect(routeSource).toContain("order.balanceTxHash");
    expect(routeSource).toContain("order.balanceConfirmedAt");
  });
});
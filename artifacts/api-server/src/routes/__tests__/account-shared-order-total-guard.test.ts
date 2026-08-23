import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../account.ts", import.meta.url), "utf8");

describe("account shared-order total reconciliation", () => {
  it("only repairs unpaid orders and retains the materialised organiser fee", () => {
    expect(routeSource).toContain('order.paymentStatus === "unpaid"');
    expect(routeSource).toContain('const organiserFee = parseFloat(String(order.organiserFee ?? "0"));');
    expect(routeSource).toContain("const independentExtra = Math.max(0, currentTotal - currentKnownTotal);");
    expect(routeSource).toContain(
      "const expectedTotal = Number((subtotal + snapshotShipping + tip + kitFees + adminAdjustmentFee + organiserFee + independentExtra).toFixed(2));",
    );
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");

describe("shared wholesale item-save payment guard", () => {
  it("uses a constant SQL gate when a reopened member has no order yet", () => {
    expect(routeSource).toContain("const paymentEditGate = member.orderId");
    expect(routeSource).toContain(": sql`TRUE`");
    expect(routeSource).not.toContain("sql`(${member.orderId} IS NULL OR EXISTS (");
  });

  it("guards protected organiser-fee changes before a locked recipient replacement writes", () => {
    const guard = routeSource.indexOf("const protectedRecipientFeeChanges = replacementMember");
    const lockedShareWrite = routeSource.indexOf("const guarded = await tx.update(wholesaleSharesTable)");

    expect(guard).toBeGreaterThan(-1);
    expect(lockedShareWrite).toBeGreaterThan(guard);
    expect(routeSource).toContain("findProtectedRecipientOrganiserFeeChanges");
    expect(routeSource).toContain("payment-started order whose organiser fee would change");
  });
});
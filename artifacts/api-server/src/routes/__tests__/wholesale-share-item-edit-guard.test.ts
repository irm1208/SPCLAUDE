import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");

describe("shared wholesale item-save payment guard", () => {
  it("uses a constant SQL gate when a reopened member has no order yet", () => {
    expect(routeSource).toContain("const paymentEditGate = member.orderId");
    expect(routeSource).toContain(": sql`TRUE`");
    expect(routeSource).not.toContain("sql`(${member.orderId} IS NULL OR EXISTS (");
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public order lookup emergency shutdown", () => {
  it("rejects every lookup before reading credentials or querying an order", () => {
    const source = readFileSync(new URL("./orders.ts", import.meta.url), "utf8");
    const handler = source.slice(
      source.indexOf('router.post("/orders/lookup"'),
      source.indexOf("// ──", source.indexOf('router.post("/orders/lookup"') + 1),
    );
    const rejection = handler.indexOf("res.status(410)");
    expect(rejection).toBeGreaterThan(0);
    expect(rejection).toBeLessThan(handler.indexOf("req.body"));
    expect(rejection).toBeLessThan(handler.indexOf("ordersTable"));
    expect(handler).toContain('"Public order lookup is temporarily disabled."');
  });
});
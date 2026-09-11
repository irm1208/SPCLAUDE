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

  it("blocks every legacy PIN-authenticated order route at the router boundary", () => {
    const source = readFileSync(new URL("./orders.ts", import.meta.url), "utf8");
    const guard = source.slice(
      source.indexOf("const LEGACY_ORDER_ACCESS_DISABLED"),
      source.indexOf("// ── POST /api/orders/claim-pin"),
    );
    for (const path of [
      "/orders/claim-pin",
      "/orders/lookup",
      "/orders/change-username",
      "/orders/my-orders",
      "/orders/my-profile",
    ]) {
      expect(guard).toContain(path);
    }
    for (const suffix of [
      "pin",
      "inpost-qr",
      "royal-mail-qr",
      "qr-upload",
      "shipping-address",
      "payment-screenshot",
      "confirm-fiat",
    ]) {
      expect(guard).toContain(suffix);
    }
    expect(guard).toContain('req.method === "PUT"');
    expect(guard).toContain('req.method === "DELETE"');
    expect(guard).toContain("res.status(410)");
  });

  it("allows signed-in owners through the update boundary without restoring legacy access", () => {
    const source = readFileSync(new URL("./orders.ts", import.meta.url), "utf8");
    const guard = source.slice(
      source.indexOf("const LEGACY_ORDER_ACCESS_DISABLED"),
      source.indexOf("// ── POST /api/orders/claim-pin"),
    );
    const updateHandler = source.slice(
      source.indexOf('router.put("/orders/:orderId"'),
      source.indexOf('router.post("/orders/:orderId/shipping-address"'),
    );

    expect(guard).toContain('req.cookies?.account_session');
    expect(guard).toContain("legacyOrderMutation && !signedInOrderUpdate");
    expect(updateHandler).toContain('router.put("/orders/:orderId", requireAccount');
    expect(updateHandler).toContain("req.account!.telegramUsername");
    expect(updateHandler).toContain('"You can only update your own order"');
  });
});
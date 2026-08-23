import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../account.ts", import.meta.url), "utf8");

describe("account order detail response", () => {
  it("includes the materialised organiser fee for the customer summary", () => {
    expect(routeSource).toContain('organiserFee: parseFloat(String(order.organiserFee ?? "0")),');
  });

  it("includes the organiser fee in the orders-list payload used by the order detail page", () => {
    const listEndpointStart = routeSource.indexOf('router.get("/account/orders"');
    const listEndpointEnd = routeSource.indexOf('router.get("/account/hidden-orders"');
    const listEndpoint = routeSource.slice(listEndpointStart, listEndpointEnd);

    expect(listEndpoint).toContain('organiserFee: parseFloat(String(order.organiserFee ?? "0")),');
  });
});
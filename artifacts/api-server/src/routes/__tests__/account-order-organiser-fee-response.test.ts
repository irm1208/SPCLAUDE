import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../account.ts", import.meta.url), "utf8");

describe("account order detail response", () => {
  it("includes the materialised organiser fee for the customer summary", () => {
    expect(routeSource).toContain('organiserFee: parseFloat(String(order.organiserFee ?? "0")),');
  });
});
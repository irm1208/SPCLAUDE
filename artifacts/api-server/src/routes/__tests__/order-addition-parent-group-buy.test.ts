import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");

describe("order addition group-buy authority", () => {
  it("derives an addition's group buy from its validated parent order", () => {
    expect(routeSource).toContain("let normalizedGroupBuyId");
    expect(routeSource).toContain("normalizedGroupBuyId = parent.groupBuyId ?? null;");
    expect(routeSource).not.toContain(
      'error: "Addition must belong to the same group buy as the original order"',
    );
  });
});
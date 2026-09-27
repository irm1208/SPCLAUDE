import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./WholesaleOrder.tsx", import.meta.url)), "utf8");

describe("regular wholesale current order", () => {
  it("shows selected products above the catalogue with quantity controls tied to the same order state", () => {
    expect(source).toMatch(/const selectedProducts = activeProducts\.filter\(p => \(quantities\[p\.id\] \?\? 0\) > 0\)/);
    expect(source).toMatch(/selectedProducts\.length > 0 && \([\s\S]*?Current order[\s\S]*?selectedProducts\.map/);
    expect(source).toMatch(/selectedProducts\.map\([\s\S]*?setQty\(product\.id, qty - 1\)[\s\S]*?setQty\(product\.id, [\s\S]*?setQty\(product\.id, qty \+ 1\)/);
    expect(source.indexOf("Current order")).toBeLessThan(source.indexOf("Object.entries(categoryGroups)"));
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vial Shop seller details", () => {
  it("renders the selected seller panel inline with the selected row", () => {
    const source = readFileSync(new URL("./VialShopTab.tsx", import.meta.url), "utf8");
    const sellersList = source.slice(
      source.indexOf('{sellers.map(s => ('),
      source.indexOf("{sellers.length === 0"),
    );

    expect(sellersList).toContain("selectedId === s.id &&");
    expect(sellersList).toContain("<SellerDetailPanel");
  });
});
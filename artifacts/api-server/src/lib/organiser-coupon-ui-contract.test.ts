import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settings = readFileSync(new URL("../../../peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx", import.meta.url), "utf8");

describe("current organiser settings coupon entry point", () => {
  it("exposes Coupons in the current settings navigation", () => {
    expect(settings).toMatch(/id: "coupons",\s*label: "Coupons"/);
  });

  it("renders the existing manager for the selected group buy", () => {
    expect(settings).toMatch(/activeSection === "coupons"/);
    expect(settings).toContain("<GroupBuyCoupons");
    expect(settings).toContain("/api/organiser/group-buys/${encodeURIComponent(selectedGbId)}/coupons");
    expect(settings).toContain("key={selectedGbId}");
  });
});

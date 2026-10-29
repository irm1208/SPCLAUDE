import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");
describe("Wholesale setup Admin entry point", () => {
  it("registers the tab for navigation and direct hash links", () => {
    const metadata = source.slice(source.indexOf("const ALL_TABS_META"), source.indexOf("const DEFAULT_HOME_SECTIONS"));
    expect(metadata).toMatch(/id: "wholesale-setup",\s*label: "Wholesale setup"/);
    expect(source).toMatch(/id: "wholesale-setup",\s*label: "Wholesale setup",.*keywords:/);
  });
  it("renders the real setup with the existing vendor editor", () => {
    expect(source).toMatch(/activeTab === "wholesale-setup"/);
    expect(source).toMatch(/<AdminWholesaleSetup\s+secret=\{secret\}/);
    expect(source).toMatch(/renderVendorModal=\{.*<VendorModal/s);
  });
});

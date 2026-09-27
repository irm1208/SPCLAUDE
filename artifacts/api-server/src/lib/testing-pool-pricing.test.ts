import { describe, expect, it } from "vitest";
import { computeTestingPoolTarget, parseStrictPoolMoney } from "./testing-pool-pricing";

describe("standalone testing pool pricing", () => {
  it("rejects invalid, negative, and over-precision money values", () => {
    expect(parseStrictPoolMoney("12.34")).toBe(12.34);
    expect(parseStrictPoolMoney("1e2")).toBeNull();
    expect(parseStrictPoolMoney("-1")).toBeNull();
    expect(parseStrictPoolMoney("1.234")).toBeNull();
    expect(parseStrictPoolMoney("")).toBeNull();
  });

  it("adds pool costs to selected test costs and preserves the legacy extra-vial charge", () => {
    expect(computeTestingPoolTarget(
      [{ unitPriceUsd: "10.00" }, { unitPriceUsd: "5.00" }],
      2,
      { vialCostUsd: 2, shippingCostUsd: 3, organiserTipUsd: 4 },
    )).toBe(84);
  });
});
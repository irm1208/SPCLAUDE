import { describe, expect, it } from "vitest";
import { computeTestingPoolTarget, fitsTestingPoolTarget, parsePoolVialCount, validatePoolVialQuantities, parseStrictPoolMoney } from "./testing-pool-pricing";

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

  it("uses the pool's extra-vial price once, not once per test", () => {
    expect(computeTestingPoolTarget(
      [{ unitPriceUsd: "10.00" }, { unitPriceUsd: "5.00" }],
      3,
      { vialCostUsd: 2, shippingCostUsd: 3, organiserTipUsd: 4, extraVialPriceUsd: 12.5 },
    )).toBe(49);
  });

  it("accepts only whole vial limits between 1 and 20", () => {
    expect(parsePoolVialCount(20)).toBe(20);
    expect(parsePoolVialCount("4")).toBe(4);
    for (const invalid of [0, 21, 1.5, "2.5", "4x", null]) expect(parsePoolVialCount(invalid)).toBeNull();
  });

  it("requires every test to share a vial count within the pool limit", () => {
    expect(validatePoolVialQuantities([{ quantity: 3 }, { quantity: 3 }], 5)).toBe(3);
    expect(validatePoolVialQuantities([{ quantity: 3 }, { quantity: 2 }], 5)).toBeNull();
    expect(validatePoolVialQuantities([{ quantity: 6 }], 5)).toBeNull();
    expect(validatePoolVialQuantities([{ quantity: 2.5 }], 5)).toBeNull();
  });

  it("rejects totals that cannot fit the pool goal column", () => {
    expect(fitsTestingPoolTarget(99_999_999.99)).toBe(true);
    expect(fitsTestingPoolTarget(computeTestingPoolTarget(
      [{ unitPriceUsd: 1 }], 2,
      { vialCostUsd: 0, shippingCostUsd: 0, organiserTipUsd: 0, extraVialPriceUsd: 99_999_999.99 },
    ))).toBe(false);
  });
});
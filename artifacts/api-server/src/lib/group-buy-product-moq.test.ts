import { describe, expect, it } from "vitest";
import { moqSnapshot, parseMoqInput, readMoqSettings } from "./group-buy-moq-model";

const input = {
  enabled: true, targetKits: null, showToMembers: true, expectedUpdatedAt: null,
  countMode: "both", productTargets: [{ productId: "hgh36", targetKits: 50 }],
};
const products = [
  { productId: "hgh36", name: "HGH 36IU", orderedKits: 65.5, paidKits: 34 },
  { productId: "hgh24", name: "HGH 24IU", orderedKits: 10, paidKits: 10 },
];

describe("per-product MOQ", () => {
  it("supports product-only targets and all three progress modes", () => {
    for (const countMode of ["active", "paid", "both"]) {
      expect(parseMoqInput({ ...input, countMode })).toMatchObject({ countMode, productTargets: input.productTargets });
    }
    expect(() => parseMoqInput({ ...input, countMode: "unpaid" })).toThrow();
    expect(() => parseMoqInput({ ...input, productTargets: [] })).toThrow();
    for (const targetKits of [0, -1, 0.25, NaN, "50"]) {
      expect(() => parseMoqInput({ ...input, productTargets: [{ productId: "hgh36", targetKits }] })).toThrow();
    }
    expect(() => parseMoqInput({ ...input, productTargets: [...input.productTargets, ...input.productTargets] })).toThrow();
  });
  it("round-trips settings without dropping per-product targets or mode", () => {
    const settings = { ...input, updatedAt: "2026-10-26T10:00:00.000Z" };
    expect(readMoqSettings(JSON.stringify(settings))).toMatchObject({
      countMode: "both", productTargets: input.productTargets, updatedAt: settings.updatedAt,
    });
  });
  it("keeps product strengths separate and exposes active and paid totals accurately", () => {
    const settings = { ...input, updatedAt: null };
    const snapshot = moqSnapshot(settings, 75.5, false, 44, products)!;
    expect(snapshot.products).toEqual([
      expect.objectContaining({ productId: "hgh36", targetKits: 50, orderedKits: 65.5, paidKits: 34 }),
    ]);
    expect(snapshot.countMode).toBe("both");
    expect(moqSnapshot({ ...settings, showToMembers: false }, 75.5, false, 44, products)).toBeNull();
    expect(moqSnapshot(settings, 75.5, true, 44, products)?.products).toHaveLength(2);
  });
  it("keeps a missing target product visible at zero and never guesses another strength", () => {
    const snapshot = moqSnapshot({ ...input, updatedAt: null }, 0, false, 0, [])!;
    expect(snapshot.products).toEqual([
      expect.objectContaining({ productId: "hgh36", targetKits: 50, orderedKits: 0, paidKits: 0 }),
    ]);
  });
});

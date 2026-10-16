import { describe, expect, it } from "vitest";
import { normalizeWholesalePriceNote } from "./wholesale-price-note";

describe("wholesale product price notes", () => {
  it("trims a plain text explanation and preserves line breaks", () => {
    expect(normalizeWholesalePriceNote("  Extra packaging.\nIncludes cold storage. ")).toBe("Extra packaging.\nIncludes cold storage.");
  });
  it("clears notes with null or blank text", () => {
    expect(normalizeWholesalePriceNote(null)).toBeNull();
    expect(normalizeWholesalePriceNote(" \n ")).toBeNull();
  });
  it("rejects non-text and oversized input", () => {
    for (const value of [42, {}, [], true, undefined, "a".repeat(1001)]) {
      expect(() => normalizeWholesalePriceNote(value)).toThrow();
    }
    expect(normalizeWholesalePriceNote("a".repeat(1000))).toHaveLength(1000);
  });
});

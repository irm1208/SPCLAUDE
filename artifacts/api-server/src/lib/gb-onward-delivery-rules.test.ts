import { describe, expect, it } from "vitest";
import { parseOnwardMatrix, estimateOnwardDelivery, normalizeEuCountry, suppliedEuMatrix, validOnwardMethod } from "./gb-onward-delivery-rules";

describe("EU onward-delivery estimates", () => {
  const matrix = suppliedEuMatrix();
  it("uses kits including halves and the approved band boundaries", () => {
    for (const qty of [0.5, 1, 5]) expect(estimateOnwardDelivery(matrix, "Austria", qty).options).toEqual([
      { method: "pickup", amount: 17.3 }, { method: "home", amount: 19.6 },
    ]);
    for (const qty of [5.5, 6, 25]) expect(estimateOnwardDelivery(matrix, "AT", qty).options[0].amount).toBe(23);
    expect(estimateOnwardDelivery(matrix, "AT", 25.5).status).toBe("quote_required");
  });
  it("handles blank pickup cells as unavailable, never zero", () => {
    expect(estimateOnwardDelivery(matrix, "Croatia", 2).options).toEqual([{ method: "home", amount: 21.3 }]);
    expect(matrix.rates).toHaveLength(27);
  });
  it("normalizes destination names and ISO country codes", () => {
    expect(normalizeEuCountry("Czech Republic")).toBe("CZ");
    expect(normalizeEuCountry("Rep. of Ireland")).toBe("IE");
    expect(normalizeEuCountry("Germany (DE)")).toBe("DE");
    expect(normalizeEuCountry("GB")).toBeNull();
    expect(estimateOnwardDelivery(matrix, "GB", 1).status).toBe("unavailable");
  });
  it("requires a positive half-kit quantity and does not guess unknown/disabled rates", () => {
    for (const qty of [0, -1, NaN, Infinity, 1.2]) expect(() => estimateOnwardDelivery(matrix, "AT", qty)).toThrow();
    expect(estimateOnwardDelivery({ ...matrix, enabled: false }, "AT", 1).status).toBe("unavailable");
    expect(estimateOnwardDelivery({ ...matrix, rates: [] }, "AT", 1).status).toBe("unavailable");
  });
  it("strictly validates prices, currency and duplicate countries", () => {
    expect(parseOnwardMatrix(matrix)).toEqual(matrix);
    for (const amount of [-1, "17.30", Infinity, 1.234]) {
      expect(() => parseOnwardMatrix({ ...matrix, rates: [{ country: "AT", pickupSmall: amount, pickupLarge: null, homeSmall: 2, homeLarge: 3 }] })).toThrow();
    }
    expect(() => parseOnwardMatrix({ ...matrix, currency: "BAD" })).toThrow();
    expect(() => parseOnwardMatrix({ ...matrix, rates: [matrix.rates[0], matrix.rates[0]] })).toThrow();
    expect(() => parseOnwardMatrix({ ...matrix, enabled: "false" })).toThrow();
  });
  it("preserves explicit zero rates and never mutates source rates", () => {
    const free = { ...matrix, rates: [{ country: "AT", pickupSmall: 0, pickupLarge: null, homeSmall: null, homeLarge: null }] };
    expect(estimateOnwardDelivery(free, "AT", 1).options).toEqual([{ method: "pickup", amount: 0 }]);
    expect(matrix.rates[0].pickupSmall).toBe(17.3);
  });
  it("accepts only an optional pickup/home preference, never client prices", () => {
    for (const value of [undefined, null, "pickup", "home"]) expect(validOnwardMethod(value)).toBe(true);
    for (const value of ["", "free", 0, true, { method: "home", amount: 1 }]) expect(validOnwardMethod(value)).toBe(false);
  });
});

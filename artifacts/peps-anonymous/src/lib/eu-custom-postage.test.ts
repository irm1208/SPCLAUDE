import { describe, expect, it } from "vitest";
import { importEuCustomPostage, customPostagePrice } from "./country-shipping-options";

describe("EU custom postage import", () => {
  const matrix = { enabled: true, currency: "USD", rates: [
    { country: "IT", pickupSmall: 7.5, pickupLarge: 11.5, homeSmall: 15, homeLarge: 20 },
    { country: "HR", pickupSmall: null, pickupLarge: null, homeSmall: 21.3, homeLarge: 27.3 },
  ] };
  it("imports country/home/pickup options, omits unavailable pickup and preserves UK/US", () => {
    const original = [{ id: "royal", label: "Royal Mail", country: "GB", price: 3 }];
    const options = importEuCustomPostage(original, matrix, "USDT");
    expect(options).toHaveLength(4);
    expect(options[0]).toEqual(original[0]);
    expect(options.find(o => o.id === "eu-postage-IT-pickup")).toMatchObject({
      label: "Italy — Pickup point", country: "IT", kitPrices: { upTo5: 7.5, upTo25: 11.5 }, requiresAddress: true,
    });
    expect(importEuCustomPostage(options, matrix, "USD")).toEqual(options);
    expect(() => importEuCustomPostage(original, matrix, "GBP")).toThrow(/currency/i);
  });
  it("uses the correct band including halves and never guesses over 25", () => {
    const option = importEuCustomPostage([], matrix, "USD").find(o => o.id === "eu-postage-IT-home")!;
    expect(customPostagePrice(option, 5)).toBe(15);
    expect(customPostagePrice(option, 5.5)).toBe(20);
    expect(customPostagePrice(option, 25.5)).toBeNull();
  });
});

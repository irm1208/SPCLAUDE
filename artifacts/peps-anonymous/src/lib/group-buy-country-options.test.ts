import { describe, expect, it } from "vitest";
import { groupBuyCountryOptions } from "./group-buy-country-options";
import { normalizeShippingCountry } from "./country-shipping-options";
describe("group-buy destination choices", () => {
  it("shows only allowed countries, with UK and GB as one choice", () => {
    expect(groupBuyCountryOptions({ allowedCountries: ["IT", "US", "UK", "GB"], excludedCountries: [] }))
      .toEqual(["Italy", "United Kingdom", "United States"]);
  });
  it("exclusions take precedence and recognise country names and aliases", () => {
    expect(groupBuyCountryOptions({ allowedCountries: ["Italy", "UK", "US"], excludedCountries: ["GB", "United States"] }))
      .toEqual(["Italy"]);
  });
  it("allows all countries by default but still applies exclusions", () => {
    const all = groupBuyCountryOptions({});
    expect(all).toContain("Germany");
    expect(groupBuyCountryOptions({ allowedCountries: [], excludedCountries: ["DE"] })).not.toContain("Germany");
  });
  it("does not fall back to all countries for an invalid allowlist", () => {
    expect(groupBuyCountryOptions({ allowedCountries: ["not-a-country"] })).toEqual([]);
  });
  it("offers exactly the EU countries, United Kingdom and United States for the supplied setup", () => {
    const eu = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
    const options = groupBuyCountryOptions({ allowedCountries: [...eu, "GB", "UK", "US"] });
    expect(options).toHaveLength(29);
    expect(new Set(options.map(normalizeShippingCountry))).toEqual(new Set([...eu, "GB", "US"]));
  });
});

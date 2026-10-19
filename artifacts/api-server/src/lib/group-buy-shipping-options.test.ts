import { describe, expect, it } from "vitest";
import { shippingOptionMatchesCountry, validateGroupBuyShippingOptions } from "./group-buy-shipping-options";

describe("country-scoped custom shipping options", () => {
  it("matches a country-specific option only to that destination", async () => {
    const option = { id: "uk-label", country: "GB" };

    expect(shippingOptionMatchesCountry(option, "United Kingdom")).toBe(true);
    expect(shippingOptionMatchesCountry(option, "UK")).toBe(true);
    expect(shippingOptionMatchesCountry(option, "Germany")).toBe(false);
  });

  it("keeps legacy options with no country available everywhere", () => {
    const option = { id: "legacy", country: null };

    expect(shippingOptionMatchesCountry(option, "Germany")).toBe(true);
    expect(shippingOptionMatchesCountry(option, null)).toBe(true);
  });

  it("accepts known country codes and rejects unknown country targets", () => {
    const base = { id: "option", label: "Tracked", price: 4 };

    expect(validateGroupBuyShippingOptions([{ ...base, country: "GB" }])).toBeNull();
    expect(validateGroupBuyShippingOptions([{ ...base, country: "ZZ" }])).toContain("country");
  });
});

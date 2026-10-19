import { describe, expect, it } from "vitest";
import { filterShippingOptionsForCountry, isEuOnwardDestination, resolveShippingDestinationCountry } from "./country-shipping-options";

describe("country-scoped group-buy shipping options", () => {
  it("shows only global and matching-country options", async () => {
    const options = [
      { id: "default", label: "Standard", price: 5 },
      { id: "uk-qr", label: "UK QR label", price: 3, country: "GB", requiresQrCode: true },
      { id: "de-address", label: "Germany address", price: 8, country: "DE", requiresAddress: true },
    ];

    expect(filterShippingOptionsForCountry(options, "United Kingdom").map(option => option.id)).toEqual(["default", "uk-qr"]);
    expect(filterShippingOptionsForCountry(options, "GB").map(option => option.id)).toEqual(["default", "uk-qr"]);
    expect(filterShippingOptionsForCountry(options, "Germany").map(option => option.id)).toEqual(["default", "de-address"]);
  });

  it("does not expose country-specific options when destination is unknown", () => {
    const options = [{ id: "uk-qr", label: "UK QR label", price: 3, country: "GB" }];

    expect(filterShippingOptionsForCountry(options, null)).toEqual([]);
  });

  it("uses the same destination fallback for checkout display and order submission", () => {
    expect(resolveShippingDestinationCountry(null, "United Kingdom", "GB")).toBe("United Kingdom");
    expect(resolveShippingDestinationCountry("", null, "GB")).toBe("GB");
    expect(resolveShippingDestinationCountry("DE", "GB", "FR")).toBe("DE");
  });

  it("classifies UK/GB as non-EU destinations while allowing EU matrix countries", () => {
    expect(isEuOnwardDestination("IT")).toBe(true);
    expect(isEuOnwardDestination("Italy")).toBe(true);
    expect(isEuOnwardDestination("UK")).toBe(false);
    expect(isEuOnwardDestination("GB")).toBe(false);
    expect(isEuOnwardDestination("United Kingdom")).toBe(false);
  });
});

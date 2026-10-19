import { describe, expect, it } from "vitest";
import { filterShippingOptionsForCountry } from "./country-shipping-options";

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
});

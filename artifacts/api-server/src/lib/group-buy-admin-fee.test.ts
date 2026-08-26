import { describe, expect, it } from "vitest";
import { resolveGroupBuyAdminFee } from "./group-buy-admin-fee";

describe("group-buy admin fee resolution", () => {
  it("uses an enabled country override for the member delivery country", () => {
    expect(resolveGroupBuyAdminFee({
      enabled: true,
      feeType: "fixed",
      baseAmount: 5,
      label: "Admin fee",
      countryOverrides: JSON.stringify([
        { country: "United Kingdom", amount: 12.5, enabled: true },
      ]),
      shippingCountry: "UK",
      productSubtotal: 100,
    })).toEqual({
      amount: 12.5,
      label: "Admin fee",
    });
  });

  it("uses the member country when normal group-buy delivery has no shipping-country field", () => {
    expect(resolveGroupBuyAdminFee({
      enabled: false,
      feeType: "fixed",
      baseAmount: 0,
      label: "Admin fee",
      countryOverrides: [
        { country: "United Kingdom", amount: 5, enabled: true },
      ],
      shippingCountry: null,
      fallbackCountry: "GB",
      productSubtotal: 120,
    })).toEqual({
      amount: 5,
      label: "Admin fee",
    });
  });

  it("does not use the disabled base fee when no enabled country override matches", () => {
    expect(resolveGroupBuyAdminFee({
      enabled: false,
      feeType: "fixed",
      baseAmount: 9,
      label: "Admin fee",
      countryOverrides: [
        { country: "United Kingdom", amount: 5, enabled: true },
      ],
      shippingCountry: "DE",
      productSubtotal: 120,
    })).toEqual({
      amount: 0,
      label: null,
    });
  });
});
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
});
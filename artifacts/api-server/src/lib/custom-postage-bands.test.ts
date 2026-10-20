import { describe, expect, it } from "vitest";
import { customPostagePrice, customPostagePatch, usesCustomEuPostage, validateGroupBuyShippingOptions, resolveCustomPostage } from "./group-buy-shipping-options";

describe("country-specific EU custom postage", () => {
  const option = { id: "eu-postage-IT-home", label: "Italy — Home delivery", country: "IT",
    price: 15, source: "eu-postage", kitPrices: { upTo5: 15, upTo25: 20 } };
  it("prices half kits and the 5/5.5/25 boundaries without an over-25 fallback", () => {
    expect(customPostagePrice(option, 0.5)).toBe(15);
    expect(customPostagePrice(option, 5)).toBe(15);
    expect(customPostagePrice(option, 5.5)).toBe(20);
    expect(customPostagePrice(option, 25)).toBe(20);
    expect(customPostagePrice(option, 25.5)).toBeNull();
    expect(customPostagePrice(option, NaN)).toBeNull();
    expect(customPostagePrice({ ...option, kitPrices: { upTo5: null, upTo25: 0 } }, 5)).toBeNull();
    expect(customPostagePrice({ ...option, kitPrices: { upTo5: null, upTo25: 0 } }, 6)).toBe(0);
    expect(customPostagePrice({ price: 3 }, 30)).toBe(3);
  });
  it("replaces the EU matrix only for the country's configured custom options", () => {
    expect(usesCustomEuPostage(JSON.stringify([option]), "Italy")).toBe(true);
    expect(usesCustomEuPostage(JSON.stringify([option]), "GB")).toBe(false);
    expect(usesCustomEuPostage(JSON.stringify([option]), "Germany")).toBe(false);
  });
  it("rejects invalid rates, duplicate ids and missing EU country scope", () => {
    expect(validateGroupBuyShippingOptions([option])).toBeNull();
    expect(validateGroupBuyShippingOptions([option, option])).toMatch(/unique/i);
    for (const kitPrices of [{ upTo5: -1, upTo25: 20 }, { upTo5: 15.001, upTo25: 20 }, { upTo5: null, upTo25: null }, { upTo5: 15 }])
      expect(validateGroupBuyShippingOptions([{ ...option, kitPrices }])).not.toBeNull();
    expect(validateGroupBuyShippingOptions([{ ...option, country: "" }])).not.toBeNull();
  });
  it("reconciles shipping increases without recharging a paid product order", () => {
    const order = { deliveryPrice: "15", grandTotal: "115", amountDue: "0", paymentStatus: "confirmed" };
    expect(customPostagePatch(order, 20)).toMatchObject({ deliveryPrice: "20.00", grandTotal: "120.00", amountDue: "5.00", balancePaymentStatus: "unpaid" });
    expect(() => customPostagePatch(order, 10)).toThrow(/paid/i);
    expect(() => customPostagePatch({ ...order, paymentStatus: "pending" }, 20)).toThrow(/payment/i);
    expect(customPostagePatch({ ...order, paymentStatus: "unpaid" }, 10)).toMatchObject({ deliveryPrice: "10.00", grandTotal: "110.00", paymentUsdAmount: null });
  });
  it("uses server prices and country/contact checks rather than a submitted price", () => {
    const body = { shippingCountry: "Italy", shippingName: "Example Member", shippingAddress: "1 Example Street",
      shippingPhone: "+39 123456789", shippingEmail: "example@example.test",
      lineItems: [{ productId: "P", quantity: 5.5 }], deliveryPrice: 0 };
    expect(resolveCustomPostage([option], option.id, body)).toEqual({ id: option.id, name: option.label, price: "20" });
    expect(resolveCustomPostage([option], "global-free", body)).toBeNull();
    expect(resolveCustomPostage([option], option.id, { ...body, shippingCountry: "GB" })).toBeNull();
    expect(() => resolveCustomPostage([option], option.id, { ...body, shippingEmail: "" })).toThrow(/email/i);
  });
});

import { describe, expect, it } from "vitest";
import { assertHalfKitCheckoutItems, parseHalfKitCheckout } from "./half-kit-new-order-rules";

const intent = { offerId: "offer", productId: "product", version: 2, requestId: "12345678-1234-1234-1234-123456789abc", price: 25 };
describe("new-order half-kit checkout", () => {
  it("leaves normal orders unchanged", () => expect(parseHalfKitCheckout(undefined)).toBeNull());
  it("validates the version, server price quote and retry identity", () => {
    expect(parseHalfKitCheckout(intent)).toEqual(intent);
    for (const value of [{ ...intent, price: -1 }, { ...intent, version: 0 }, { ...intent, requestId: "bad" }, {}]) {
      expect(() => parseHalfKitCheckout(value)).toThrow();
    }
  });
  it("only accepts exactly the selected half kit", () => {
    expect(() => assertHalfKitCheckoutItems(intent, [{ productId: "product", quantity: 0.5 }], {})).not.toThrow();
    for (const items of [[], [{ productId: "other", quantity: 0.5 }], [{ productId: "product", quantity: 1 }]]) {
      expect(() => assertHalfKitCheckoutItems(intent, items, {})).toThrow();
    }
  });
  it("accepts several distinct half-kit offers, but no extra items or duplicate claims", () => {
    const second = { ...intent, offerId: "offer2", productId: "product2", requestId: "22345678-1234-1234-1234-123456789abc", price: 40 };
    const basket = parseHalfKitCheckout({ ...intent, additionalOffers: [second] })!;
    expect(basket.additionalOffers).toEqual([second]);
    expect(() => assertHalfKitCheckoutItems(basket, [
      { productId: "product2", quantity: 0.5 }, { productId: "product", quantity: 0.5 },
    ], {})).not.toThrow();
    expect(() => assertHalfKitCheckoutItems(basket, [{ productId: "product", quantity: 0.5 }], {})).toThrow();
    for (const duplicate of [intent, { ...second, productId: intent.productId }, { ...second, requestId: intent.requestId }]) {
      expect(() => parseHalfKitCheckout({ ...intent, additionalOffers: [duplicate] })).toThrow();
    }
  });
  it("does not permit coupons or free-shipping top-up/wholesale shortcuts", () => {
    for (const body of [{ couponCode: "DISCOUNT" }, { additionOfOrderId: "parent" }, { orderType: "wholesale" }]) {
      expect(() => assertHalfKitCheckoutItems(intent, [{ productId: "product", quantity: 0.5 }], body)).toThrow();
    }
  });
});

import { describe, expect, it } from "vitest";
import { combinedShippingReason, allocateCombinedStock, combineShippingLines } from "./combined-order-shipping";

const parent = { id: "parent", additionOfOrderId: null, groupBuyId: "gb", telegramUsername: "@buyer",
  shippingName: "Test Buyer", shippingAddress: "1 Example Street", shippingCountry: "GB",
  shippingCity: "London", shippingPostcode: "W1", reshipperUsername: "@shipper", countryLegId: "uk",
  routingType: "reshipper", deliveryMethodId: "post", directShippingRequested: false,
  status: "Processing", paymentStatus: "confirmed", amountDue: "0", refundStatus: "none" };
const child = { ...parent, id: "child", additionOfOrderId: "parent" };

describe("combined parent/add-on shipping", () => {
  it("accepts a paid family with matching destination and case-normalised identity", () => {
    expect(combinedShippingReason([parent, { ...child, telegramUsername: "BUYER", reshipperUsername: "SHIPPER" }])).toBeNull();
  });
  it.each([
    { shippingAddress: "Another address" }, { shippingCountry: "DE" }, { telegramUsername: "other" },
    { reshipperUsername: "other" }, { groupBuyId: "other" }, { paymentStatus: "unpaid" },
    { amountDue: "2" }, { refundStatus: "requested" }, { status: "Shipped" },
    { additionOfOrderId: "another-parent" },
  ])("blocks an unsafe family: %j", change => {
    expect(combinedShippingReason([parent, { ...child, ...change }])).toBeTruthy();
  });
  it("aggregates shared products before checking stock, without mutating input on shortage", () => {
    const lines = combineShippingLines([{ productName: "Product 10mg", quantity: 2 },
      { productName: "Product 10mg", quantity: 3 }]);
    expect(lines).toEqual([{ productName: "Product 10mg", quantity: 5 }]);
    const parcels = [{ id: "one", items: [{ name: "Product 10mg", qty: 4, dispatchedQty: 0 }] }];
    expect(() => allocateCombinedStock(lines, parcels)).toThrow(/stock/i);
    expect(parcels[0].items[0].dispatchedQty).toBe(0);
  });
  it("deducts the complete combined quantity once across parcels using exact product matching", () => {
    const parcels = [{ id: "one", items: [{ name: "Product 10mg", qty: 4, dispatchedQty: 1 }] },
      { id: "two", items: [{ name: "Product 10mg", qty: 4, dispatchedQty: 0 }] }];
    const updated = allocateCombinedStock([{ productName: "Product 10mg", quantity: 5 }], parcels);
    expect(updated[0].items[0].dispatchedQty).toBe(4);
    expect(updated[1].items[0].dispatchedQty).toBe(2);
    expect(() => allocateCombinedStock([{ productName: "Product", quantity: 1 }], parcels)).toThrow();
    expect(parcels[0].items[0].dispatchedQty).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { buildGroupBuyBreakdown } from "./group-buy-breakdown";

describe("buildGroupBuyBreakdown", () => {
  it("groups account countries into regions and products while deduplicating orders", () => {
    const result = buildGroupBuyBreakdown([
      {
        id: "order-1",
        code: "1001",
        telegramUsername: "@alice",
        accountCountry: "United Kingdom",
        paymentStatus: "confirmed",
        productSubtotal: 330,
        lineItems: [
          { productId: "ss31", productName: "SS-31 180mg", quantity: 2, lineTotal: 220 },
          { productId: "bpc", productName: "BPC-157", quantity: 1, lineTotal: 110 },
        ],
      },
      {
        id: "order-2",
        code: "1002",
        telegramUsername: "@bob",
        accountCountry: "DE",
        paymentStatus: "unpaid",
        productSubtotal: 110,
        lineItems: [
          { productId: "ss31", productName: "SS-31 180mg", quantity: 1, lineTotal: 110 },
        ],
      },
      {
        id: "order-3",
        code: "1003",
        telegramUsername: "@carol",
        accountCountry: null,
        paymentStatus: "confirmed",
        productSubtotal: 55,
        lineItems: [
          { productId: "ss31", productName: "SS-31 180mg", quantity: 0.5, lineTotal: 55 },
        ],
      },
    ]);

    expect(result.regions.map(region => region.key)).toEqual(["UK", "EU", "UNKNOWN"]);
    expect(result.regions[0]).toMatchObject({
      key: "UK",
      orderCount: 1,
      kitCount: 3,
      subtotal: 330,
    });
    expect(result.regions[0]?.countries[0]).toMatchObject({
      key: "GB",
      label: "United Kingdom",
      orderCount: 1,
      kitCount: 3,
      subtotal: 330,
    });
    expect(result.regions[0]?.countries[0]?.products[0]).toMatchObject({
      productId: "bpc",
      orderCount: 1,
      kitCount: 1,
      subtotal: 110,
    });
    expect(result.regions[1]?.countries[0]?.products[0]).toMatchObject({
      productId: "ss31",
      orderCount: 1,
      kitCount: 1,
      subtotal: 110,
      orders: [{ code: "1002", telegramUsername: "@bob", quantity: 1, lineTotal: 110, paymentStatus: "unpaid" }],
    });
    expect(result.regions[2]?.countries[0]?.label).toBe("Unknown / Not set");
  });

  it("supports payment, region, country, product, and search filters", () => {
    const orders = [
      {
        id: "order-1",
        code: "1001",
        telegramUsername: "@alice",
        accountCountry: "United Kingdom",
        paymentStatus: "confirmed",
        productSubtotal: 330,
        lineItems: [{ productId: "ss31", productName: "SS-31 180mg", quantity: 2, lineTotal: 220 }],
      },
      {
        id: "order-2",
        code: "1002",
        telegramUsername: "@bob",
        accountCountry: "DE",
        paymentStatus: "unpaid",
        productSubtotal: 110,
        lineItems: [{ productId: "ss31", productName: "SS-31 180mg", quantity: 1, lineTotal: 110 }],
      },
    ];

    const result = buildGroupBuyBreakdown(orders, {
      paymentStatus: "unpaid",
      region: "EU",
      productId: "ss31",
      search: "bob",
    });

    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]).toMatchObject({
      key: "EU",
      orderCount: 1,
      kitCount: 1,
      subtotal: 110,
    });
  });
});
import { describe, expect, it } from "vitest";
import { halfKitLegacyMutation } from "./half-kit-protection-rules";
describe("half-kit legacy mutation protection", () => {
  it("matches Express case-insensitive and decoded paths without changing ID case", () => {
    expect(halfKitLegacyMutation("PUT", "/ORDERS/%41bc")?.orderId).toBe("Abc");
    expect(halfKitLegacyMutation("PATCH", "/ADMIN/ORDERS/%41bc", { clearBalance: true })?.block).toBe(true);
    expect(halfKitLegacyMutation("POST", "/ORGANISER/GROUP-BUYS/G1/apply-shipping")?.block).toBe(false);
  });
  it("serializes customer edits so the endpoint can preserve claimed lines while adding products", () => {
    expect(halfKitLegacyMutation("PUT", "/orders/o1", {})).toEqual({ kind: "order", orderId: "o1", role: "member", block: false });
  });
  it("protects admin product changes without blocking payment confirmation", () => {
    expect(halfKitLegacyMutation("PATCH", "/admin/orders/o1", { lineItems: [] })?.block).toBe(true);
    expect(halfKitLegacyMutation("PATCH", "/admin/orders/o1", { paymentStatus: "confirmed" })?.block).toBe(false);
  });
  it("never blocks status/tracking updates or the half-kit/payment endpoints", () => {
    expect(halfKitLegacyMutation("PATCH", "/admin/orders/o1", { status: "Shipped", trackingNumber: "abc" })?.block).toBe(false);
    expect(halfKitLegacyMutation("POST", "/group-buys/g1/half-kit-offers/h1/claim", {})).toBeNull();
    expect(halfKitLegacyMutation("POST", "/account/orders/o1/balance-pay", {})?.block).toBe(false);
  });
  it("serializes normal additions and cancellation without forbidding them", () => {
    expect(halfKitLegacyMutation("POST", "/orders", { additionOfOrderId: "o1" })?.block).toBe(false);
    expect(halfKitLegacyMutation("DELETE", "/orders/o1", {})?.block).toBe(false);
  });
  it("scopes organiser monetary changes to their own GB", () => {
    expect(halfKitLegacyMutation("PATCH", "/organiser/group-buys/g1/orders/o1", { vendorShipping: 0 }))
      .toEqual({ kind: "order", orderId: "o1", groupId: "g1", role: "organiser", block: true });
  });
  it("delegates organiser item edits to the claim-preserving handler but still blocks other money edits", () => {
    expect(halfKitLegacyMutation("PATCH", "/organiser/group-buys/g1/orders/o1", {
      lineItems: [{ id: "half", quantity: 0.5 }, { productId: "vial", quantity: 4 }],
      status: "Submitted", paymentStatus: "unpaid", trackingNumbers: [], paymentTxHashes: [],
    })?.block).toBe(false);
    expect(halfKitLegacyMutation("PATCH", "/organiser/group-buys/g1/orders/o1", {
      lineItems: [], vendorShipping: 0,
    })?.block).toBe(true);
  });
  it("protects bulk OOS/stock refunds and shipping allocation", () => {
    expect(halfKitLegacyMutation("POST", "/admin/orders/mark-oos", {})?.block).toBe(true);
    expect(halfKitLegacyMutation("POST", "/organiser/group-buys/g1/orders/apply-intl-shipping", {})?.groupId).toBe("g1");
  });
});

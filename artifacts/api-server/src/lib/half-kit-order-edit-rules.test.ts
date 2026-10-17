import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { planHalfKitOrderEdit } from "./half-kit-order-edit-rules";

const order = {
  status: "Submitted", paymentStatus: "unpaid", productSubtotal: "717.50", grandTotal: "730.50",
  deliveryMethodId: "royal", deliveryPrice: "3", vendorShipping: "0", tip: "0",
  testingContribution: "0", adminFee: "10", directShippingRequested: false, creditsApplied: "20",
};
const half = { id: "half-line", productId: "half", productName: "Reserved half", quantity: "0.50", unitPrice: "60", lineTotal: "30" };
const normal = { id: "normal-line", productId: "normal", productName: "Normal kit", quantity: "1", unitPrice: "200", lineTotal: "200" };
const catalogue = [{ productId: "vial", productName: "Genetek 30ml vial", price: "7", priceOverride: null }];
const input = {
  deliveryMethodId: "royal", tip: 0, testingContribution: 0,
  lineItems: [
    { productId: "half", quantity: 0.5, unitPrice: 60 },
    { productId: "normal", quantity: 1, unitPrice: 200 },
    { productId: "vial", quantity: 4, unitPrice: 0.01 },
  ],
};
const plan = (body = input, parent = order, products = catalogue) =>
  planHalfKitOrderEdit(parent, [half, normal], ["half-line"], body, products);

describe("ordinary additions to orders containing claimed halves", () => {
  it("adds four vials at the server price without rebuilding the claimed half or existing totals", () => {
    const result = plan();
    expect(result.lines[0]).toEqual(half);
    expect(result.lines[1]).toEqual(normal);
    expect(result.lines[2]).toMatchObject({ productId: "vial", quantity: "4.00", unitPrice: "7.00", lineTotal: "28.00" });
    expect(result.orderPatch).toMatchObject({ productSubtotal: "745.50", grandTotal: "758.50", paymentUsdAmount: null });
    for (const key of ["creditsApplied", "couponDiscount", "deliveryPrice", "vendorShipping", "adminFee", "paymentStatus"]) {
      expect(result.orderPatch).not.toHaveProperty(key);
    }
  });
  it("does not remove, resize or replace claimed halves", () => {
    expect(() => plan({ ...input, lineItems: input.lineItems.slice(1) })).toThrow(/reserved|half/i);
    expect(() => plan({ ...input, lineItems: input.lineItems.map(li => li.productId === "half" ? { ...li, quantity: 1 } : li) })).toThrow(/half/i);
    expect(() => planHalfKitOrderEdit(order, [normal], ["missing"], input, catalogue)).toThrow(/half/i);
  });
  it("allows increasing an ordinary line at its saved price, but not removing existing items", () => {
    const result = plan({ ...input, lineItems: input.lineItems.map(li => li.productId === "normal" ? { ...li, quantity: 2, unitPrice: 0 } : li) });
    expect(result.lines[1]).toMatchObject({ id: "normal-line", quantity: "2.00", unitPrice: "200", lineTotal: "400.00" });
    expect(result.orderPatch.grandTotal).toBe("958.50");
    expect(() => plan({ ...input, lineItems: input.lineItems.filter(li => li.productId !== "normal") })).toThrow(/remove|existing/i);
  });
  it("keeps a changed offered price and excludes new coupon or credit redemptions", () => {
    const result = plan({ ...input, lineItems: input.lineItems.map(li => ({ ...li, unitPrice: 999 })) });
    expect(result.lines[0]).toEqual(half);
    expect(() => plan({ ...input, couponCode: "NEW" } as any)).toThrow(/coupon/i);
  });
  it("uses the GB price override and rejects unavailable new products and invalid quantities", () => {
    expect(plan(input, order, [{ ...catalogue[0], priceOverride: "9" } as any]).orderPatch.grandTotal).toBe("766.50");
    expect(() => plan(input, order, [])).toThrow(/available/i);
    for (const quantity of [NaN, Infinity, -1, 0, 0.7, 1001]) {
      expect(() => plan({ ...input, lineItems: input.lineItems.map(li => li.productId === "vial" ? { ...li, quantity } : li) })).toThrow();
    }
  });
  it("rejects changes to delivery, tips and contribution rather than overwriting offer charges", () => {
    expect(() => plan({ ...input, deliveryMethodId: "other" })).toThrow(/delivery/i);
    expect(() => plan({ ...input, tip: 2 })).toThrow(/charges/i);
    expect(() => plan({ ...input, testingContribution: 15 })).toThrow(/charges/i);
  });
  it("keeps confirmed payment and increases only the additional balance", () => {
    const result = plan(input, { ...order, paymentStatus: "confirmed", amountDue: "5", balancePaymentStatus: "unpaid" } as any);
    expect(result.orderPatch).toMatchObject({ amountDue: "33.00", balancePaymentStatus: "unpaid", balanceCryptoQuote: null });
    expect(result.orderPatch).not.toHaveProperty("paymentStatus");
    expect(result.orderPatch).not.toHaveProperty("paymentUsdAmount");
  });
  it("does not edit while original or additional payments are being checked, or after dispatch", () => {
    for (const patch of [
      { paymentStatus: "pending_confirmation" }, { paymentTxHash: "tx" }, { paymentScreenshot: "image" },
      { balancePaymentStatus: "verifying" }, { balanceTxHash: "tx" }, { dispatchConfirmedAt: new Date() },
    ]) expect(() => plan(input, { ...order, ...patch } as any)).toThrow(/payment|dispatch|edited/i);
  });
  it("does not charge twice when the same edit is retried", () => {
    const first = plan();
    const second = planHalfKitOrderEdit({ ...order, ...first.orderPatch }, first.lines, ["half-line"], input, catalogue);
    expect(second.orderPatch.grandTotal).toBe("758.50");
    expect(second.addedSubtotal).toBe(0);
  });
  it("routes authenticated edits through snapshot preservation before the destructive legacy replacement", () => {
    const source = readFileSync(new URL("../routes/orders.ts", import.meta.url), "utf8");
    const edit = source.slice(source.indexOf('router.put("/orders/:orderId", requireAccount'), source.indexOf("// ── POST /api/orders/:orderId/shipping-address"));
    expect(edit).toContain('eq(gbHalfKitClaimsTable.state, "active")');
    const preservingCall = edit.indexOf("await editOrderWithHalfKits(");
    const legacyDelete = edit.indexOf("await tx.delete(orderLineItemsTable)");
    expect(preservingCall).toBeGreaterThan(-1);
    expect(preservingCall).toBeLessThan(legacyDelete);
    expect(edit.slice(preservingCall, legacyDelete)).toContain("return result;");
    expect(edit).toContain("order_total: editSym + updatedOrder.grandTotal");
  });
});

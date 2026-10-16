import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { organiserHalfKitEditInput } from "./half-kit-organiser-edit";
import { planHalfKitOrderEdit } from "./half-kit-order-edit-rules";

const order = {
  status: "Submitted", paymentStatus: "unpaid", deliveryMethodId: "royal", tip: "0",
  testingContribution: "0", directShippingRequested: false, notes: "Customer note",
  productSubtotal: "30", grandTotal: "43", trackingNumber: null, paymentTxHash: null,
};
const line = { id: "half-line", productId: "half", productName: "Half",
  quantity: "0.50", unitPrice: "60", lineTotal: "30" };
const body = { status: "Submitted", paymentStatus: "unpaid", adminNotes: "Staff note",
  trackingNumbers: [], paymentTxHashes: [],
  lineItems: [{ id: "half-line", quantity: 0.5 }, { productId: "vial", quantity: 4 }] };

describe("organiser additions to reserved-half orders", () => {
  it("accepts the actual organiser edit form and retains the customer's note and claimed line", () => {
    const input = organiserHalfKitEditInput(order, [line], body);
    expect(input.notes).toBe("Customer note");
    const result = planHalfKitOrderEdit(order, [line], ["half-line"], input, [
      { productId: "vial", productName: "Genetek 30ml vial", price: "7", priceOverride: null },
    ]);
    expect(result.lines[0]).toEqual(line);
    expect(result.orderPatch.grandTotal).toBe("71.00");
  });
  it("supports partial organiser item requests without dropping unmentioned lines", () => {
    expect(organiserHalfKitEditInput(order, [line], {
      lineItems: [{ productId: "vial", quantity: 4 }],
    }).lineItems).toEqual([{ productId: "half", quantity: "0.50" }, { productId: "vial", quantity: 4 }]);
  });
  it("rejects foreign line IDs, ID spoofing and duplicate IDs", () => {
    for (const lineItems of [
      [{ id: "foreign", quantity: 1 }],
      [{ id: "half-line", productId: "other", quantity: 0.5 }],
      [{ id: "half-line", quantity: 0.5 }, { id: "half-line", quantity: 0.5 }],
    ]) expect(() => organiserHalfKitEditInput(order, [line], { lineItems })).toThrow(/line/i);
  });
  it("does not combine additions with payment, tracking or status changes", () => {
    for (const change of [
      { paymentStatus: "confirmed" }, { status: "Shipped" },
      { paymentTxHashes: ["new-proof"] }, { trackingNumbers: ["new-tracking"] },
      { vendorShipping: 0 }, { couponCode: "NEW" },
    ]) expect(() => organiserHalfKitEditInput(order, [line], { ...body, ...change })).toThrow(/separately|unsupported/i);
  });
  it("accepts unchanged legacy single transaction and tracking values represented as arrays", () => {
    expect(() => organiserHalfKitEditInput({ ...order, paymentTxHash: "tx", trackingNumber: "parcel" },
      [line], { ...body, paymentTxHashes: ["tx"], trackingNumbers: ["parcel"] })).not.toThrow();
  });
  it("connects the authorised organiser route to the preserving transaction before legacy writes", () => {
    const source = readFileSync(new URL("../routes/organiser.ts", import.meta.url), "utf8");
    const route = source.slice(source.indexOf('router.patch("/organiser/group-buys/:gbId/orders/:orderId"'));
    expect(route.indexOf("editOrderWithHalfKits(")).toBeGreaterThan(0);
    expect(route.indexOf("editOrderWithHalfKits(")).toBeLessThan(route.indexOf("const existingUpdates"));
    expect(route.slice(0, route.indexOf("editOrderWithHalfKits("))).toContain("gb.organiserCanEditQuantities");
  });
});

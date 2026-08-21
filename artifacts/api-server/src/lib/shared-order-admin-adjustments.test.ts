import { describe, expect, it } from "vitest";
import { calculateSharedOrderAdjustment } from "./shared-order-admin-adjustments";

describe("shared-order admin adjustments", () => {
  it("recalculates every member's shipping and total when an admin changes the shared shipping fee", () => {
    const result = calculateSharedOrderAdjustment({
      members: [
        { id: "a", items: [{ quantity: 1, unitPrice: 30 }], tip: 0, adjustmentFee: 0 },
        { id: "b", items: [{ quantity: 3, unitPrice: 20 }], tip: 0, adjustmentFee: 5, adjustmentMessage: "Handling adjustment" },
      ],
      splitMode: "by_size",
      totalShipping: 20,
    });

    expect(result).toEqual([
      { id: "a", subtotal: 30, shippingShare: 5, grandTotal: 35 },
      { id: "b", subtotal: 60, shippingShare: 15, grandTotal: 80 },
    ]);
  });

  it("rejects an unexplained required fee", () => {
    expect(() => calculateSharedOrderAdjustment({
      members: [{ id: "a", items: [], tip: 0, adjustmentFee: 4, adjustmentMessage: "" }],
      splitMode: "even",
      totalShipping: 0,
    })).toThrow("explanation");
  });
});
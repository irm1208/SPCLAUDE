import { describe, expect, it } from "vitest";
import { preserveHalfKitShipping } from "./half-kit-shipping-rules";
describe("half-kit charges survive shipping finalisation", () => {
  it("keeps the extra vendor charge and changes only base shipping", () => {
    expect(preserveHalfKitShipping({ grandTotal: "42", vendorShipping: "7", deliveryPrice: "5", adminFee: "2" },
      { vendor: 3, delivery: 2 }, { vendor: 6 })).toEqual({ vendorShipping: 9, deliveryPrice: 5, grandTotal: 44, adminFee: 2 });
  });
  it("keeps the extra delivery charge without repricing products, credits or coupons", () => {
    expect(preserveHalfKitShipping({ grandTotal: "42", vendorShipping: "7", deliveryPrice: "5", adminFee: "2" },
      { vendor: 3, delivery: 2 }, { delivery: 10 })).toEqual({ vendorShipping: 7, deliveryPrice: 12, grandTotal: 49, adminFee: 2 });
  });
  it("does not change ordinary orders", () => {
    expect(preserveHalfKitShipping({ grandTotal: "42", vendorShipping: "7", deliveryPrice: "5", adminFee: "2" },
      undefined, { vendor: 6 })).toBeNull();
  });
});

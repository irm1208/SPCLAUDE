import { describe, expect, it } from "vitest";
import { eligibleTestingOrder, resolveTestingSupplier, supplierTestingIdentity } from "./supplier-testing";

const vendors = [{ id: "u", name: "Uther" }, { id: "j", name: "JBG/YT" }];
describe("supplier testing eligibility and identity", () => {
  it("allows unpaid and paid placed own orders across all three flows", () => {
    for (const orderType of ["wholesale", "wholesale_shared", null]) {
      for (const paymentStatus of ["unpaid", "confirmed"]) {
        expect(eligibleTestingOrder({ telegramUsername: "@Member", status: "Submitted", paymentStatus, orderType, groupBuyId: orderType ? null : "gb" }, "member")).toBe(true);
      }
    }
  });
  it("rejects drafts, cancelled, refunded, deleted, unrelated and other members' orders", () => {
    const base = { telegramUsername: "member", status: "Submitted", paymentStatus: "unpaid", orderType: "wholesale" };
    for (const patch of [{ status: "Draft" }, { status: "Cancelled" }, { paymentStatus: "refunded" }, { deletedAt: new Date() }, { telegramUsername: "other" }, { orderType: "vial" }, { refundStatus: "pending" }]) {
      expect(eligibleTestingOrder({ ...base, ...patch }, "member")).toBe(false);
    }
  });
  it("uses explicit supplier identities, with authoritative GB supplier override", () => {
    expect(resolveTestingSupplier({ vendorId: "j", productVendorId: "u" }, vendors)?.id).toBe("j");
    expect(resolveTestingSupplier({ vendorId: "u", productVendorId: "j" }, vendors)).toBeNull();
    expect(resolveTestingSupplier({ vendorId: "missing", productVendorId: "j" }, vendors)).toBeNull();
    expect(resolveTestingSupplier({ groupSupplier: "JBG/YT", productVendorId: "u" }, vendors)?.id).toBe("j");
    expect(resolveTestingSupplier({ groupSupplier: "Uther", productVendorId: "j" }, vendors)).toBeNull();
    expect(resolveTestingSupplier({ productVendor: "JBG/YT" }, vendors)?.id).toBe("j");
  });
  it("isolates suppliers, product strengths and batches while normalizing batch whitespace/case", () => {
    expect(supplierTestingIdentity("j", "p10", " BATCH-A ")).toBe(supplierTestingIdentity("j", "p10", "batch-a"));
    expect(new Set([supplierTestingIdentity("j", "p10", "a"), supplierTestingIdentity("j", "p20", "a"), supplierTestingIdentity("u", "p10", "a"), supplierTestingIdentity("j", "p10", "b")]).size).toBe(4);
  });
});

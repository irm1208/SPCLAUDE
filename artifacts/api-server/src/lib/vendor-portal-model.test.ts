import { describe, it, expect } from "vitest";
import { supplierItems, sourceFingerprint, previewFingerprint, publicVendorOrder, requiredShipping, VendorPortalError } from "./vendor-portal-model";

describe("vendor order privacy and pricing", () => {
  it("preserves idempotency after PostgreSQL JSONB reorders snapshot keys", () => {
    expect(previewFingerprint({ snapshot: { items: [], currency: "USD" } }))
      .toBe(previewFingerprint({ snapshot: { currency: "USD", items: [] } }));
  });
  it("prices only from saved supplier costs, not customer unit prices", () => {
    expect(supplierItems([{ productName: "HGH", quantity: "2", unitPrice: "999" }], [{ productName: "HGH", unitCost: "50.00" }])).toEqual([
      { productName: "HGH", quantity: 2, unitCost: "50.00", lineTotal: "100.00" },
    ]);
  });
  it("rejects missing, ambiguous, invalid costs and invalid quantities", () => {
    for (const costs of [[], [{ productName: "HGH", unitCost: "-1" }], [{ productName: "HGH", unitCost: "NaN" }]]) {
      expect(() => supplierItems([{ productName: "HGH", quantity: 1 }], costs)).toThrow(VendorPortalError);
    }
    expect(() => supplierItems([{ productName: "HGH", quantity: 0 }], [{ productName: "HGH", unitCost: "1" }])).toThrow();
  });
  it("fingerprints ignore customer sale prices but detect quantities and addresses", () => {
    const base = { items: [{ productName: "HGH", quantity: "1", unitPrice: "100" }], shipping: { address: "A" } };
    expect(sourceFingerprint(base)).toBe(sourceFingerprint({ ...base, items: [{ ...base.items[0], unitPrice: "200" }] }));
    expect(sourceFingerprint(base)).not.toBe(sourceFingerprint({ ...base, shipping: { address: "B" } }));
    expect(sourceFingerprint(base)).not.toBe(sourceFingerprint({ ...base, items: [{ ...base.items[0], quantity: "2" }] }));
  });
  it("uses a strict allowlist rather than leaking a submission or snapshot", () => {
    const view = publicVendorOrder({
      id: "s", reference: "123", status: "Submitted", submittedAt: new Date(0),
      snapshot: { items: [], shipping: {}, productCost: "1", shippingCost: "0", totalCost: "1", grandTotal: 999, paymentTxHash: "SECRET", adminNotes: "PRIVATE" },
      vendorId: "private", orderIds: ["hidden"], sourceKey: "hidden",
    } as any, false, []);
    const text = JSON.stringify(view);
    for (const secret of ["grandTotal", "paymentTxHash", "adminNotes", "SECRET", "PRIVATE", "orderIds", "sourceKey", "vendorId"]) expect(text).not.toContain(secret);
  });
  it("includes separate city and postcode in the supplier address once", () => {
    expect(requiredShipping({ shippingName: "N", shippingAddress: "17 Road", shippingCity: "London", shippingPostcode: "W1 1AA", shippingCountry: "UK", shippingPhone: "1", shippingEmail: "n@example.test" }).address)
      .toBe("17 Road, London, W1 1AA");
    expect(requiredShipping({ shippingName: "N", shippingAddress: "17 Road, London, W1 1AA", shippingCity: "London", shippingPostcode: "W1 1AA", shippingCountry: "UK", shippingPhone: "1", shippingEmail: "n@example.test" }).address)
      .toBe("17 Road, London, W1 1AA");
  });
});

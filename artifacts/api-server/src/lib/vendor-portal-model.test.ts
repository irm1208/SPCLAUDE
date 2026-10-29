import { describe, it, expect } from "vitest";
import { supplierCatalogueCosts, supplierItems, sourceFingerprint, previewFingerprint, publicVendorOrder, requiredShipping, VendorPortalError } from "./vendor-portal-model";
import type { Fs3CostMatch } from "@workspace/api-zod/fs3-costs";

const approvedMatches: Fs3CostMatch[] = [
  ["Na Semax 10mg", "Na Semax"], ["Na Selank 10mg", "Na Selank"], ["NA KPV 30mg", "KPV 30mg"],
].map(([productName, costName]) => ({
  productName, costName, vendorId: null, active: true, reviewedBy: "Owner",
  reviewedAt: "2026-10-29", reviewNote: "Confirmed equivalent",
}));

describe("vendor order privacy and pricing", () => {
  it("finds saved FS3 costs despite capitalisation and harmless spacing differences", () => {
    expect(supplierCatalogueCosts(
      [{ productId: "legacy", productName: "CJC No Dac / IPA 10/10mg" }],
      [{ id: "legacy" }],
      [{ productName: " CJC No DAC / Ipa 10/10mg ", unitCost: "130.00" }],
    )).toEqual([{ productName: "CJC No Dac / IPA 10/10mg", unitCost: "130.00" }]);
  });
  it("accepts identical duplicate price names but rejects conflicting prices", () => {
    const lines = [{ productName: "KPV 30mg" }];
    expect(supplierCatalogueCosts(lines, [], [
      { productName: "KPV 30mg", unitCost: "110" }, { productName: "Kpv 30mg", unitCost: "110.00" },
    ])[0].unitCost).toBe("110.00");
    expect(() => supplierCatalogueCosts(lines, [], [
      { productName: "KPV 30mg", unitCost: "110" }, { productName: "Kpv 30mg", unitCost: "95" },
    ])).toThrow(/KPV 30mg/);
  });
  it("lists every missing product and never guesses strengths, modifications or sale prices", () => {
    expect(() => supplierCatalogueCosts([
      { productName: "Na Semax 20mg", unitPrice: 999 }, { productName: "NA KPV 40mg" },
    ], [], [
      { productName: "Na Semax", unitCost: "60" }, { productName: "KPV 30mg", unitCost: "110" },
    ])).toThrow(/Na Semax 20mg.*NA KPV 40mg/);
  });
  it("applies only the user-confirmed aliases, preserves TXT names, and prefers exact prices", () => {
    const prices = [
      { productName: "Na Semax", unitCost: "60" }, { productName: "Na semax", unitCost: "60" },
      { productName: "Na Selank", unitCost: "60" }, { productName: "KPV 30mg", unitCost: "110" },
    ];
    expect(supplierCatalogueCosts([
      { productName: "Na Semax 10mg" }, { productName: "Na Selank 10mg" }, { productName: "NA KPV 30mg" },
    ], [], prices, approvedMatches)).toEqual([
      { productName: "Na Semax 10mg", unitCost: "60.00" },
      { productName: "Na Selank 10mg", unitCost: "60.00" },
      { productName: "NA KPV 30mg", unitCost: "110.00" },
    ]);
    expect(supplierCatalogueCosts([{ productName: "Na Semax 10mg" }], [], [
      ...prices, { productName: "Na Semax 10mg", unitCost: "65" },
    ], approvedMatches)[0].unitCost).toBe("65.00");
  });
  it("shares reviewed supplier matches with exports without overriding catalogue costs", () => {
    const match = { ...approvedMatches[2], vendorId: "supplier-a" };
    const line = [{ productId: "p", productName: match.productName }];
    const products = [{ id: "p", wholesaleVendorId: "supplier-a" }];
    const prices = [{ productName: match.costName, unitCost: "110" }];
    expect(supplierCatalogueCosts(line, products, prices, [match])).toEqual([
      { productName: "NA KPV 30mg", unitCost: "110.00" },
    ]);
    expect(supplierCatalogueCosts(line, [{ ...products[0], wholesaleCost: "130" }], prices, [match])[0].unitCost).toBe("130.00");
    expect(() => supplierCatalogueCosts(line, [{ ...products[0], wholesaleVendorId: "supplier-b" }], prices, [match])).toThrow(/NA KPV/);
  });
  it("keeps vendor-specific costs authoritative instead of borrowing the legacy cost", () => {
    expect(() => supplierCatalogueCosts(
      [{ productId: "new", productName: "HGH" }],
      [{ id: "new", wholesaleVendorId: "new-vendor", wholesaleCost: null }],
      [{ productName: "HGH", unitCost: "50" }],
    )).toThrow(/HGH/);
    expect(supplierCatalogueCosts(
      [{ productId: "new", productName: "HGH" }],
      [{ id: "new", wholesaleVendorId: "new-vendor", wholesaleCost: "75" }],
      [{ productName: "HGH", unitCost: "50" }],
    )[0].unitCost).toBe("75.00");
  });
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
  it("allows incomplete contact details only for exports, retaining strict submission checks", () => {
    const source = { shippingName: "N", shippingAddress: "17 Road", shippingCountry: "UK" };
    expect(requiredShipping(source, "export")).toEqual({ name: "N", address: "17 Road", country: "UK", phone: "", email: "" });
    expect(() => requiredShipping(source)).toThrow(/phone, email/);
    expect(() => requiredShipping(source, "submission")).toThrow(/phone, email/);
  });
});

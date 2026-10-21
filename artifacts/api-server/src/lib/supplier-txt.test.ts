import { describe, expect, it } from "vitest";
import { supplierTxt, validateSupplierContact } from "./supplier-txt";

const contact = { name: "Recipient", address: "12 Test Street\nTest City 12345", country: "GB", email: "delivery@example.com", phone: "+441234567890" };
const order = { id: "o1", code: "123", username: "member", items: [{ productName: "HGH 36IU", quantity: 0.5 }] };
const block = { title: "BATCH-EU-001", orders: [order], contact, recipient: "reshipper", packagePrices: [70] };
describe("supplier TXT", () => {
  it("aggregates kit quantities and supplier cost, retains order references", () => {
    const text = supplierTxt([{ ...block, orders: [order, { ...order, id: "o2", code: "124" }] }], [{ productName: "hgh 36iu", unitCost: 40 }]);
    expect(text).toContain("HGH 36IU x1 = $40.00");
    expect(text).toContain("Total QTY: 1");
    expect(text).toContain("Grand Total: $110.00");
    expect(text).toContain("123");
    expect(text).toContain("124");
    expect(text).toContain("BATCH-EU-001");
    expect(text).toContain("delivery@example.com");
  });
  it("preserves half kits", () => {
    expect(supplierTxt([block], [{ productName: "HGH 36IU", unitCost: 40 }])).toContain("x0.5 = $20.00");
  });
  it("blocks missing prices rather than matching a different dose or retail price", () => {
    expect(() => supplierTxt([block], [{ productName: "HGH", unitCost: 5 }])).toThrow(/supplier cost.*HGH 36IU/i);
  });
  it("blocks incomplete contacts for the whole download", () => {
    expect(() => supplierTxt([{ ...block, contact: { ...contact, email: "" } }], [])).toThrow(/email/i);
  });
  it("does not leak arbitrary member delivery data into reshipper blocks", () => {
    const text = supplierTxt([{ ...block, orders: [{ ...order, shippingAddress: "PRIVATE MEMBER ADDRESS" } as any] }], [{ productName: "HGH 36IU", unitCost: 40 }]);
    expect(text).not.toContain("PRIVATE MEMBER ADDRESS");
  });
  it("requires a real country and all contact fields", () => {
    expect(validateSupplierContact({ ...contact, country: "UK" }).country).toBe("GB");
    expect(() => validateSupplierContact({ ...contact, country: "ZZ" })).toThrow(/country/i);
    for (const key of ["name", "address", "email", "phone"]) {
      expect(() => validateSupplierContact({ ...contact, [key]: "" })).toThrow();
    }
  });
  it("rejects invalid quantities and costs", () => {
    expect(() => supplierTxt([{ ...block, orders: [{ ...order, items: [{ productName: "HGH 36IU", quantity: -1 }] }] }], [])).toThrow();
    expect(() => supplierTxt([block], [{ productName: "HGH 36IU", unitCost: NaN }])).toThrow();
  });
  it("keeps multiple recipients separate and supports tier-priced direct packages", () => {
    const text = supplierTxt([block, { ...block, recipient: "second", contact: { ...contact, name: "Second Recipient" }, packagePrices: [10, 20] }],
      [{ productName: "HGH 36IU", unitCost: 40 }]);
    expect(text.split("----------------------------------------")).toHaveLength(2);
    expect(text).toContain("Package: $10.00 + $20.00 = $30.00");
    expect(text).toContain("Second Recipient");
  });
  it("does not allow line injection in contact fields or ambiguous cost matches", () => {
    expect(() => validateSupplierContact({ ...contact, name: "Recipient\nGrand Total: $0" })).toThrow();
    expect(() => supplierTxt([block], [
      { productName: "HGH 36IU", unitCost: 40 }, { productName: "hgh 36iu", unitCost: 45 },
    ])).toThrow(/exact supplier cost/i);
  });
});

import { describe, expect, it } from "vitest";
import { parseSupplierList, reviewSupplierList, supplierListTxt, reviewSupplierDelivery } from "./fs3-pasted-list";

const delivery = { shipping: "12.50", name: "Test Recipient", address: "Example street\nExample city, ZZ1", country: "Test country", phone: "+1 000 000 0000" };

const costs = [
  { id: 1, productName: "HGH 36IU", unitCost: 95.25 },
  { id: 2, productName: "Tirzepatide 30mg", unitCost: 80 },
  { id: 3, productName: "BPC 10mg / TB4 10mg blend", unitCost: 120 },
  { id: 4, productName: "Free item", unitCost: 0 },
];

describe("FS3 pasted supplier lists", () => {
  it("parses x, × and spreadsheet columns, leaving strengths and blends intact", () => {
    const rows = parseSupplierList("HGH 36IU x 10\r\nTirzepatide 30mg × 5\nBPC 10mg / TB4 10mg blend\t2\n\n");
    expect(rows.map(r => [r.productName, r.quantity])).toEqual([
      ["HGH 36IU", "10"], ["Tirzepatide 30mg", "5"], ["BPC 10mg / TB4 10mg blend", "2"],
    ]);
    expect(rows[0].original).toBe("HGH 36IU x 10");
    const review = reviewSupplierList(rows, costs);
    expect(review.ready).toBe(true);
    expect(review.totalCents).toBe(159250n);
  });

  it("does not infer a quantity from a strength or a number inside a product", () => {
    const rows = parseSupplierList("HGH 36IU\nBPC 10mg / TB4 10mg blend\nHMG 75IU X 10vials GMP");
    expect(rows.map(r => r.quantity)).toEqual(["", "", ""]);
    expect(reviewSupplierList(rows, costs).ready).toBe(false);
    expect(reviewSupplierList(rows, costs).lines.every(r => r.errors.length > 0)).toBe(true);
  });

  it("never drops invalid non-empty rows and rejects invalid quantities", () => {
    for (const quantity of ["", "0", "-1", "NaN", "Infinity", "1e3", "1,000", "2 kits", "0.0000001", "1000001"]) {
      const [draft] = parseSupplierList(`HGH 36IU\t${quantity}`);
      const review = reviewSupplierList([{ ...draft, productName: "HGH 36IU", quantity }], costs);
      expect(review.ready, quantity).toBe(false);
      expect(review.lines[0].errors.join(" ")).toMatch(/quantity/i);
      expect(() => supplierListTxt(review)).toThrow();
    }
    expect(parseSupplierList("nonsense\nHGH 36IU\t2\textra").length).toBe(2);
  });

  it("matches only unique whole names after normalising case and whitespace", () => {
    expect(reviewSupplierList(parseSupplierList(" hgh   36iu x 1"), costs).ready).toBe(true);
    const missing = reviewSupplierList(parseSupplierList("HGH x 1"), costs);
    expect(missing.ready).toBe(false);
    expect(missing.lines[0].cost).toBeNull();
    const duplicate = reviewSupplierList(parseSupplierList("HGH 36IU x 1"),
      [...costs, { id: 5, productName: "hgh 36iu", unitCost: 99 }]);
    expect(duplicate.ready).toBe(false);
    expect(duplicate.lines[0].errors.join(" ")).toMatch(/multiple/i);
  });

  it("allows an explicit product selection and quantity correction without changing the catalogue", () => {
    const [row] = parseSupplierList("HGH\tunknown");
    const fixed = reviewSupplierList([{ ...row, costId: 1, quantity: "2" }], costs);
    expect(fixed.ready).toBe(true);
    expect(fixed.lines[0].cost?.productName).toBe("HGH 36IU");
    expect(fixed.totalCents).toBe(19050n);
    expect(costs[0].unitCost).toBe(95.25);
  });

  it("does not substitute another product when an explicitly selected entry is removed", () => {
    const [row] = parseSupplierList("HGH 36IU x 1");
    const review = reviewSupplierList([{ ...row, costId: 123 }], costs);
    expect(review.ready).toBe(false);
    expect(review.lines[0].errors.join(" ")).toMatch(/no longer/i);
  });

  it("preserves duplicate lines and computes exact cents, rounding half-up per line", () => {
    const catalogue = [{ id: 1, productName: "P", unitCost: 0.1 }, { id: 2, productName: "Q", unitCost: 0.01 }];
    const review = reviewSupplierList(parseSupplierList("P x 3\nP x 3\nQ x 0.5"), catalogue);
    expect(review.lines.map(r => r.lineCents)).toEqual([30n, 30n, 1n]);
    expect(review.totalCents).toBe(61n);
    expect(supplierListTxt(review, { ...delivery, shipping: "0" })).toContain("Grand Total: $0.61");
  });

  it("distinguishes free products from missing or invalid costs", () => {
    expect(reviewSupplierList(parseSupplierList("Free item x 2"), costs).ready).toBe(true);
    for (const unitCost of [-1, Infinity, NaN, 0.001, "", "bad"]) {
      const review = reviewSupplierList(parseSupplierList("P x 1"), [{ id: 1, productName: "P", unitCost }]);
      expect(review.ready).toBe(false);
      expect(review.lines[0].errors.join(" ")).toMatch(/saved cost/i);
    }
  });

  it("uses refreshed saved prices and refuses an empty or incomplete export", () => {
    const rows = parseSupplierList("HGH 36IU x 2");
    expect(reviewSupplierList(rows, [{ ...costs[0], unitCost: 100 }]).totalCents).toBe(20000n);
    const text = supplierListTxt(reviewSupplierList(rows, costs), delivery);
    expect(text).toBe("New Order:\n\nHGH 36IU x2 = $190.50\n\nTotal QTY: 2\nTotal: $190.50\nPackage: $12.50\nGrand Total: $203.00\n\nAddress:\nTest Recipient\nExample street\nExample city, ZZ1\nTest country\nPhone: +1 000 000 0000\n");
    expect(() => supplierListTxt(reviewSupplierList([], costs))).toThrow();
    expect(() => supplierListTxt(reviewSupplierList([...rows, ...parseSupplierList("Unknown x 1")], costs))).toThrow();
  });

  it("fails explicitly on excessively large input and totals", () => {
    expect(() => parseSupplierList("P x 1\n".repeat(1001))).toThrow(/1000/);
    const review = reviewSupplierList(parseSupplierList("P x 1000000"), [{ id: 1, productName: "P", unitCost: 90071992547409 }]);
    expect(review.ready).toBe(false);
  });

  it("requires explicit shipping and complete delivery details, without assuming free shipping", () => {
    const review = reviewSupplierList(parseSupplierList("HGH 36IU x 1"), costs);
    for (const field of ["shipping", "name", "address", "country", "phone"]) {
      const incomplete = { ...delivery, [field]: "" };
      expect(reviewSupplierDelivery(incomplete, review.totalCents).errors.length).toBeGreaterThan(0);
      expect(() => supplierListTxt(review, incomplete)).toThrow();
    }
    for (const shipping of ["-1", "1.001", "NaN", "1e3", "1,000", "90071992547409.91"]) {
      expect(() => supplierListTxt(review, { ...delivery, shipping })).toThrow();
    }
    expect(() => supplierListTxt(review, { ...delivery, name: "Name\nGrand Total: $0" })).toThrow();
    expect(supplierListTxt(review, { ...delivery, shipping: "0" })).toContain("Package: $0.00");
  });

  it("keeps exact fractional quantities in wholesale lines and total quantity", () => {
    const review = reviewSupplierList(parseSupplierList("HGH 36IU x 0.123456\nHGH 36IU x 0.5"), costs);
    const text = supplierListTxt(review, delivery);
    expect(text).toContain("HGH 36IU x0.123456 = $11.76");
    expect(text).toContain("Total QTY: 0.623456");
    expect(text).toContain("Grand Total: $71.89");
    expect(text).not.toContain("|");
  });
});

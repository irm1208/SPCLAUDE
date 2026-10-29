import { describe, expect, it } from "vitest";
import { aggregateFs3Orders, findFs3SavedCost, matchesFs3Order, inferFs3Supplier, fs3ProfitRowKey } from "./fs3-order-tools";

const products = [
  { id: "p1", name: "BPC 10mg", wholesaleVendorId: "uther", wholesaleCost: 45 },
  { id: "p2", name: "BPC 10mg", wholesaleVendorId: "other", wholesaleCost: 70 },
  { id: "old", name: "Water 3ml", vendor: "Uther" },
];
const vendors = [{ id: "uther", name: "UR", legacyCatalogueVendor: "Uther" }, { id: "other", name: "Other" }];
const cost = (name: string) => name === "Water 3ml" ? 10 : null;
describe("FS3 selected-order profit", () => {
  it("never guesses a different product strength from a partial saved-cost match", () => {
    expect(findFs3SavedCost([{ productName: "BPC 10mg", unitCost: 45 }], "BPC")).toBeNull();
    expect(findFs3SavedCost([{ productName: "BPC 10mg", unitCost: 45 }], " bpc 10mg ")).toBe(45);
  });
  it("accepts duplicate saved names only when their prices agree", () => {
    expect(findFs3SavedCost([{ productName: "KPV 30mg", unitCost: 110 }, { productName: "Kpv 30mg", unitCost: 110 }], "KPV 30mg")).toBe(110);
    expect(findFs3SavedCost([{ productName: "KPV 30mg", unitCost: 110 }, { productName: "Kpv 30mg", unitCost: 95 }], "KPV 30mg")).toBeNull();
  });
  it("uses the approved FS3 aliases without relabelling product names", () => {
    const costs = [
      { productName: "Na Semax", unitCost: 60 }, { productName: "Na semax", unitCost: 60 },
      { productName: "Na Selank", unitCost: 60 }, { productName: "KPV 30mg", unitCost: 110 },
    ];
    expect(findFs3SavedCost(costs, "Na Semax 10mg")).toBe(60);
    expect(findFs3SavedCost(costs, "Na Selank 10mg")).toBe(60);
    expect(findFs3SavedCost(costs, "NA KPV 30mg")).toBe(110);
    expect(findFs3SavedCost(costs, "Na Semax 20mg")).toBeNull();
    expect(findFs3SavedCost([...costs, { productName: "Na Semax 10mg", unitCost: 65 }], "Na Semax 10mg")).toBe(65);
  });
  it("uses only selected order lines and their saved line revenue, not the full summary", () => {
    const rows = aggregateFs3Orders([{ lineItems: [
      { productId: "p1", productName: "BPC 10mg", quantity: 2, unitPrice: 60, lineTotal: 110 },
      { productId: "p1", productName: "BPC 10mg", quantity: 0.5, unitPrice: 60, lineTotal: 30 },
    ] }], products, cost);
    expect(rows).toEqual([expect.objectContaining({ totalQty: 2.5, totalRevenue: 140, totalCost: 112.5, profit: 27.5 })]);
  });
  it("does not merge same-named products from different vendors or borrow their costs", () => {
    const rows = aggregateFs3Orders([{ lineItems: [
      { productId: "p1", productName: "BPC 10mg", quantity: 1, unitPrice: 60 },
      { productId: "p2", productName: "BPC 10mg", quantity: 1, unitPrice: 90 },
    ] }], products, cost);
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.profit)).toEqual([15, 20]);
    expect(fs3ProfitRowKey(rows[0], 0)).not.toBe(fs3ProfitRowKey(rows[1], 1));
  });
  it("retains legacy FS3 costs but never guesses an ambiguous product's cost", () => {
    const rows = aggregateFs3Orders([{ lineItems: [
      { productId: "", productName: "Water 3ml", quantity: 2, unitPrice: 18.3 },
      { productId: "", productName: "BPC 10mg", quantity: 1, unitPrice: 60 },
    ] }], products, cost);
    expect(rows.find(r => r.name === "Water 3ml")?.totalCost).toBe(20);
    expect(rows.find(r => r.name === "BPC 10mg")?.totalCost).toBeNull();
  });
  it("keeps supplier costs unknown when a scoped product has no saved cost", () => {
    const rows = aggregateFs3Orders([{ lineItems: [
      { productId: "p3", productName: "BPC 10mg", quantity: 1, unitPrice: 60 },
    ] }], [{ id: "p3", name: "BPC 10mg", wholesaleVendorId: "other", wholesaleCost: null }], () => 45);
    expect(rows[0].cost).toBeNull();
    expect(rows[0].profit).toBeNull();
  });
  it("merges duplicate catalogue IDs belonging to the same legacy supplier", () => {
    const duplicateProducts = [
      { id: "old1", name: "BPC 10mg", vendor: "Uther" },
      { id: "old2", name: "BPC 10mg", vendor: "Uther" },
    ];
    const rows = aggregateFs3Orders([{ lineItems: [
      { productId: "old1", productName: "BPC 10mg", quantity: 2, unitPrice: 50 },
      { productId: "old2", productName: "BPC 10mg", quantity: 1, unitPrice: 50 },
      { productId: "", productName: " bpc 10mg ", quantity: 1, unitPrice: 50 },
    ] }], duplicateProducts, () => 45);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ totalQty: 4, totalRevenue: 200, totalCost: 180, profit: 20 });
  });
});
describe("FS3 wholesale filters", () => {
  it("Paid + Submitted excludes unpaid, processing, shipped and completed orders", () => {
    const orders = [
      { id: "yes", paymentStatus: "confirmed", status: "Submitted" },
      { id: "test", paymentStatus: "test_confirmed", status: "Submitted" },
      { id: "unpaid", paymentStatus: "unpaid", status: "Submitted" },
      { id: "processing", paymentStatus: "confirmed", status: "Processing" },
      { id: "shipped", paymentStatus: "confirmed", status: "Shipped" },
      { id: "completed", paymentStatus: "confirmed", status: "Completed" },
    ];
    expect(orders.filter(o => matchesFs3Order(o, "paid", "Submitted")).map(o => o.id)).toEqual(["yes", "test"]);
    expect(orders.filter(o => matchesFs3Order(o, "unpaid", "")).map(o => o.id)).toEqual(["unpaid"]);
    expect(orders.filter(o => matchesFs3Order(o, "", ""))).toHaveLength(6);
  });
});
describe("FS3 supplier selection", () => {
  it("auto-selects an unambiguous supplier, including legacy Uther products", () => {
    expect(inferFs3Supplier([{ lineItems: [{ productId: "old", productName: "Water 3ml" }] }], products, vendors)).toBe("uther");
    expect(inferFs3Supplier([{ lineItems: [{ productId: "p2", productName: "BPC 10mg" }] }], products, vendors)).toBe("other");
  });
  it("requires a supplier choice for mixed or ambiguous selections", () => {
    expect(inferFs3Supplier([{ lineItems: [
      { productId: "p1", productName: "BPC 10mg" }, { productId: "p2", productName: "BPC 10mg" },
    ] }], products, vendors)).toBe("");
    expect(inferFs3Supplier([{ lineItems: [{ productName: "BPC 10mg" }] }], products, vendors)).toBe("");
    expect(inferFs3Supplier([], products, vendors)).toBe("");
  });
});

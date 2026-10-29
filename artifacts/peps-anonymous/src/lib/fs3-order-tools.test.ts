import { describe, expect, it } from "vitest";
import { aggregateFs3Orders, findFs3SavedCost, fs3ProductCost, matchesFs3Order, inferFs3Supplier, fs3ProfitRowKey } from "./fs3-order-tools";
import type { Fs3CostMatch } from "@workspace/api-zod/fs3-costs";

const approvedMatches: Fs3CostMatch[] = [
  ["Na Semax 10mg", "Na Semax"], ["Na Selank 10mg", "Na Selank"], ["NA KPV 30mg", "KPV 30mg"],
].map(([productName, costName]) => ({
  productName, costName, vendorId: null, active: true, reviewedBy: "Owner",
  reviewedAt: "2026-10-29", reviewNote: "Confirmed equivalent",
}));

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
    ].map(c => ({ ...c, matches: approvedMatches }));
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
    ] }], [{ id: "p3", name: "BPC 10mg", wholesaleVendorId: "other", wholesaleCost: null }],
    (name, vendorId) => findFs3SavedCost([{ productName: name, unitCost: 45 }], name, vendorId));
    expect(rows[0].cost).toBeNull();
    expect(rows[0].profit).toBeNull();
  });
  it("uses only the reviewed supplier match for margins and keeps exact supplier costs authoritative", () => {
    const match = { ...approvedMatches[2], vendorId: "supplier-a" };
    const costs = [{ productName: "KPV 30mg", unitCost: 110, matches: [match] }];
    const offers = [
      { id: "a", name: match.productName, wholesaleVendorId: "supplier-a", wholesaleCost: null },
      { id: "b", name: match.productName, wholesaleVendorId: "supplier-b", wholesaleCost: null },
      { id: "c", name: match.productName, wholesaleVendorId: "supplier-c", wholesaleCost: 130 },
    ];
    const rows = aggregateFs3Orders([{ lineItems: offers.map(p => ({
      productId: p.id, productName: match.productName, quantity: 2, unitPrice: 150,
    })) }], offers, (name, vendorId, allowExact) => findFs3SavedCost(costs, name, vendorId, allowExact));
    expect(rows.find(r => r.vendorId === "supplier-a")?.totalCost).toBe(220);
    expect(rows.find(r => r.vendorId === "supplier-b")?.totalCost).toBeNull();
    expect(rows.find(r => r.vendorId === "supplier-c")?.totalCost).toBe(260);
    expect(rows.every(r => r.name === "NA KPV 30mg")).toBe(true);
  });
  it("prices legacy order/share/catalogue suppliers with the same reviewed scope as exports", () => {
    const match = { ...approvedMatches[2], vendorId: "supplier-a" };
    const catalogue = [{ id: "old", name: match.productName, vendor: "Legacy A" }];
    const supplierList = [{ id: "supplier-a", name: "Supplier A", legacyCatalogueVendor: "Legacy A" }];
    const costs = [{ productName: match.costName, unitCost: 110, matches: [match] }];
    const lookup = (name: string, id?: string | null, exact?: boolean) => findFs3SavedCost(costs, name, id, exact);
    const line = { productName: match.productName, quantity: 2, unitPrice: 150 };
    for (const order of [
      { wholesaleVendorId: "supplier-a", lineItems: [line] },
      { shareVendorId: "supplier-a", lineItems: [line] },
      { lineItems: [{ ...line, productId: "old" }] },
      { lineItems: [{ ...line, costVendorId: "supplier-a" }] },
    ]) {
      const [row] = aggregateFs3Orders([order], catalogue, lookup, supplierList);
      expect(row.vendorId).toBe("supplier-a"); expect(row.totalCost).toBe(220);
    }
    const legacyOnly = [{ ...costs[0], matches: [{ ...match, vendorId: null }] }];
    const [unreviewed] = aggregateFs3Orders([{ wholesaleVendorId: "supplier-a", lineItems: [line] }],
      [], (name, id, exact) => findFs3SavedCost(legacyOnly, name, id, exact), supplierList);
    expect(unreviewed.cost).toBeNull();
  });
  it("never borrows a same-name catalogue cost for an unlinked historical supplier line", () => {
    const match = { ...approvedMatches[2], vendorId: "supplier-a" };
    const costs = [{ productName: match.costName, unitCost: 110, matches: [match] }];
    const offers = [{ id: "b-only", name: match.productName, wholesaleVendorId: "supplier-b", wholesaleCost: 25 }];
    const lookup = (name: string, id?: string | null, exact?: boolean) => findFs3SavedCost(costs, name, id, exact);
    const [selected] = aggregateFs3Orders([{ lineItems: [{
      productName: match.productName, quantity: 2, costVendorId: "supplier-a", unitPrice: 150,
    }] }], offers, lookup);
    expect(selected.cost).toBe(110); expect(selected.totalCost).toBe(220);
    expect(selected.productId).toBeNull();
    // Same helper prices the member/order TXT documents.
    expect(fs3ProductCost(match.productName, null, offers, lookup, "supplier-a")).toBe(110);
    expect(fs3ProductCost(match.productName, "missing-old-id", offers, lookup, "supplier-a")).toBe(110);
    expect(fs3ProductCost(match.productName, null, offers, lookup)).toBeNull();
  });
  it("merges duplicate catalogue IDs belonging to the same legacy supplier", () => {
    const duplicateProducts = [
      { id: "old1", name: "BPC 10mg", vendor: "Uther" },
      { id: "old2", name: "BPC 10mg", vendor: "Uther" },
    ];
    const rows = aggregateFs3Orders([{ wholesaleVendorId: "uther", lineItems: [
      { productId: "old1", productName: "BPC 10mg", quantity: 2, unitPrice: 50 },
      { productId: "old2", productName: "BPC 10mg", quantity: 1, unitPrice: 50 },
      { productId: "", productName: " bpc 10mg ", quantity: 1, unitPrice: 50 },
    ] }], duplicateProducts, () => 45, [{ id: "uther", name: "Uther" }]);
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

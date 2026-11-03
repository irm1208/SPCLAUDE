import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", () => ({
  db: {}, productsTable: { id: "products" }, wholesaleSharesTable: { id: "shares" },
  groupBuysTable: { id: "groups" }, fs3CostsTable: { id: "costs" },
}));
vi.mock("drizzle-orm", () => ({ inArray: () => ({}) }));
vi.mock("../routes/config", () => ({ getVendors: async () => [
  { id: "a", name: "Supplier A" }, { id: "b", name: "Supplier B" },
] }));
vi.mock("./fs3-cost-matches", () => ({ loadFs3CostMatches: vi.fn(() => { throw new Error("Costs must not load"); }) }));
import { loadFs3PricingContext } from "./fs3-pricing-context";

const orders = [
  { id: "mixed", wholesaleVendorId: "a" }, { id: "shared", sharedOrderId: "share" },
  { id: "legacy", groupBuyId: "gb" }, { id: "missing" }, { id: "empty", wholesaleVendorId: "b" },
];
const lines = [
  { orderId: "mixed", productName: "Same name", productId: "p", vendorId: "b" },
  { orderId: "mixed", productName: "Same name", productId: "p", vendorId: "a" },
  { orderId: "mixed", productName: "Repeat", vendorId: "b" },
  { orderId: "shared", productName: "Item" },
  { orderId: "legacy", productName: "Historical item" },
  { orderId: "missing", productName: "Item", productId: "p", vendorId: "deleted" },
];
async function context() {
  const rows: Record<string, unknown[]> = {
    products: [{ id: "p", vendor: "Supplier A" }], shares: [{ id: "share", vendorId: "b" }],
    groups: [{ id: "gb", manufacturer: "Historical Supplier" }],
  };
  const tx = { select: () => ({ from: (table: { id: string }) => ({
    where: async () => rows[table.id] ?? [],
  }) }) };
  return loadFs3PricingContext(orders, lines, tx, false);
}
describe("order vendor labels without supplier costs", () => {
  it("uses line assignments for identically named products and removes duplicate vendors", async () => {
    expect((await context()).vendorNamesFor("mixed")).toEqual(["Supplier A", "Supplier B"]);
  });
  it("supports shared-order and order-level vendor assignments", async () => {
    const ctx = await context();
    expect(ctx.vendorNamesFor("shared")).toEqual(["Supplier B"]);
    expect(ctx.vendorNamesFor("empty")).toEqual(["Supplier B"]);
  });
  it("preserves historical group-buy vendor names", async () => {
    expect((await context()).vendorNamesFor("legacy")).toEqual(["Historical Supplier"]);
  });
  it("does not mislabel a deleted assigned vendor with the current product vendor", async () => {
    expect((await context()).vendorNamesFor("missing")).toEqual(["Unknown"]);
  });
});

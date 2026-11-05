import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", () => import("../../../../lib/db/src/schema"));
vi.mock("../routes/config", () => ({ getVendors: async () => [{
  id: "uther", name: "Uther", tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
  regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
}] }));
vi.mock("./fs3-cost-matches", () => ({ loadFs3CostMatches: async () => [] }));
vi.mock("./refund-mutation-guard", () => ({ assertNoActiveRefunds: vi.fn(), refundMutationPredicate: vi.fn() }));
import { ordersTable, orderLineItemsTable, productsTable, fs3CostsTable, vendorSubmissionsTable, wholesaleSharesTable, wholesaleShareMembersTable } from "@workspace/db";
import { prepareVendorShipments } from "./vendor-portal-service";
import { sourceFingerprint } from "./vendor-portal-model";
import { vendorSupplierCsv, vendorSupplierText } from "./vendor-supplier-export";

describe("FS3 download of orders with stale vendor submissions", () => {
  let order: any, item: any, submission: any, tx: any, share: any, cost: string | null;
  beforeEach(() => {
    share = null;
    cost = "10.00";
    order = { id: "order-a", code: "12731", orderType: "wholesale", sharedOrderId: null,
      wholesaleVendorId: "uther", groupBuyId: null, status: "Submitted", paymentStatus: "confirmed",
      shippingName: "Synthetic recipient", shippingAddress: "1 Synthetic Street",
      shippingCountry: "United Kingdom", shippingPhone: "000000000", shippingEmail: "" };
    item = { orderId: order.id, productId: "product-a", productName: "Synthetic 10mg", quantity: "3", vendorId: "uther" };
    const oldShipping = { name: order.shippingName, address: order.shippingAddress, country: order.shippingCountry, phone: order.shippingPhone, email: "" };
    submission = { id: "submission-a", vendorId: "uther", sourceKey: `order:${order.id}`,
      sourceFingerprint: sourceFingerprint({ items: [{ ...item, quantity: "2" }], shipping: oldShipping, orderIds: [order.id] }),
      reference: order.code, snapshot: { shipping: oldShipping, items: [{
        productName: item.productName, quantity: 2, unitCost: "10.00", lineTotal: "20.00",
      }], productCost: "20.00", shippingCost: "50.00", totalCost: "70.00", currency: "USD" },
      status: "Processing" };
    tx = { execute: vi.fn(async () => []), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
      select: () => ({ from: (table: any) => {
        const rows = table === ordersTable ? [order] : table === orderLineItemsTable ? [item] :
          table === productsTable ? [{ id: item.productId, name: item.productName, wholesaleVendorId: "uther", wholesaleCost: cost }] :
          table === wholesaleSharesTable ? (share ? [share] : []) :
          table === wholesaleShareMembersTable ? [{ orderId: order.id }] :
          table === fs3CostsTable ? [] : table === vendorSubmissionsTable ? [submission] : [];
        const query: any = { then: (resolve: any) => Promise.resolve(rows).then(resolve) };
        for (const method of ["where", "orderBy", "for"]) query[method] = () => query;
        return query;
      } }),
    };
  });
  it("downloads current quantities and costs without recalling or changing the submitted snapshot", async () => {
    const saved = structuredClone(submission);
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(rows[0].snapshot.totalCost).toBe("80.00");
    expect(vendorSupplierText(rows, "Uther")).toContain("Synthetic 10mg x3 = $30.00");
    expect(vendorSupplierCsv(rows, "Uther")).toContain("Synthetic 10mg");
    expect(submission).toEqual(saved);
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
  });
  it("still blocks stale actual vendor submission", async () => {
    await expect(prepareVendorShipments(tx, "uther", [order.code])).rejects.toThrow("This submission is stale");
  });
  it("preserves the committed snapshot when the order has not changed", async () => {
    item.quantity = "2";
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot).toEqual(submission.snapshot);
    expect(rows[0].alreadySubmitted).toBe(true);
  });
  it("does not let an export bypass vendor ownership", async () => {
    submission.vendorId = "another-vendor";
    await expect(prepareVendorShipments(tx, "uther", [order.code], "export")).rejects.toThrow("another vendor");
  });
  it("exports stale shared orders without requiring the organiser platform payment", async () => {
    order.sharedOrderId = "shared-a"; order.orderType = "wholesale_shared";
    share = { ...order, id: "shared-a", vendorId: "uther", status: "submitted", organiserPaymentStatus: "unpaid" };
    submission.sourceKey = "share:shared-a";
    const saved = structuredClone(submission);
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].sharedOrderId).toBe("shared-a");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(submission).toEqual(saved);
    expect(tx.delete).not.toHaveBeenCalled();
  });
  it("still rejects missing supplier costs instead of substituting customer prices", async () => {
    cost = null;
    await expect(prepareVendorShipments(tx, "uther", [order.code], "export")).rejects.toThrow(/supplier costs/);
    expect(tx.update).not.toHaveBeenCalled();
  });
  it.each(["unpaid", "pending", "confirmed"])("exports stale %s orders without payment or fulfilment writes", async paymentStatus => {
    order.paymentStatus = paymentStatus;
    order.amountDue = "5";
    const rows = await prepareVendorShipments(tx, "uther", [order.code], "export");
    expect(rows[0].snapshot.items[0].quantity).toBe(3);
    expect(tx.update).not.toHaveBeenCalled();
  });
});

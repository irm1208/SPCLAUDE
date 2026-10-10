import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transformSync } from "esbuild";
import { runInNewContext } from "node:vm";
import { resolveEditedProductId } from "./admin-order-product-links";

describe("admin line-item replacement product links", () => {
  it("does not erase every product ID when saving an edited order", () => {
    const source = readFileSync(new URL("../routes/admin.ts", import.meta.url), "utf8");
    const route = source.slice(source.indexOf('router.put("/admin/orders/:id/line-items"'), source.indexOf("// ─── GET /api/admin/orders/:id/routing-history"));
    expect(route).not.toContain('productId: ""');
    expect(route).toContain("resolveEditedProductId");
  });

  it("preserves an existing product link, including products no longer in the catalogue", () => {
    expect(resolveEditedProductId(" BPC 157 10mg ", [
      { productName: "BPC 157 10mg", productId: "original-id" },
    ], [{ id: "new-id", name: "BPC 157 10mg" }])).toBe("original-id");
  });

  it("restores a legacy empty ID using a unique exact catalogue name", () => {
    expect(resolveEditedProductId("bpc 157 10mg", [
      { productName: "BPC 157 10mg", productId: "" },
    ], [{ id: "p1", name: "BPC 157 10mg" }])).toBe("p1");
  });

  it("links newly added catalogue products", () => {
    expect(resolveEditedProductId("GHK-CU 50mg", [], [
      { id: "p2", name: "GHK-CU 50mg" },
    ])).toBe("p2");
  });

  it("does not link custom names or a different strength by partial matching", () => {
    const catalog = [{ id: "p1", name: "BPC 157 10mg" }];
    expect(resolveEditedProductId("BPC 157", [], catalog)).toBe("");
    expect(resolveEditedProductId("BPC 157 5mg", [], catalog)).toBe("");
    expect(resolveEditedProductId("Custom kit", [], catalog)).toBe("");
  });

  it("does not guess when catalogue or historical names have conflicting IDs", () => {
    expect(resolveEditedProductId("BPC 157 10mg", [], [
      { id: "p1", name: "BPC 157 10mg" },
      { id: "p2", name: "bpc 157 10mg" },
    ])).toBe("");
    expect(resolveEditedProductId("BPC 157 10mg", [
      { productId: "p1", productName: "BPC 157 10mg" },
      { productId: "p2", productName: "BPC 157 10mg" },
    ], [{ id: "p1", name: "BPC 157 10mg" }])).toBe("");
  });

  it("duplicate rows of the same linked product retain their link", () => {
    expect(resolveEditedProductId("BPC 157 10mg", [
      { productId: "p1", productName: "BPC 157 10mg" },
      { productId: "p1", productName: "BPC 157 10mg" },
    ], [])).toBe("p1");
  });

  it.each(["confirmed", "unpaid"])("saving a %s order preserves edited prices, quantities, custom items and payment rules", async paymentStatus => {
    const source = readFileSync(new URL("../routes/admin.ts", import.meta.url), "utf8");
    const route = source.slice(source.indexOf('router.put("/admin/orders/:id/line-items"'), source.indexOf("// ─── GET /api/admin/orders/:id/routing-history"));
    let handler: any;
    let inserted: any[] = [];
    let orderUpdate: any;
    const originalOrder = { id: "order1", deliveryPrice: "10", vendorShipping: "20", tip: "5", paymentStatus, paymentUsdAmount: "200" };
    const oldItems = [{ productName: "BPC 157 10mg", productId: "p1" }];
    const catalog = [{ id: "p2", name: "GHK-CU 50mg" }];
    const ordersTable = { id: "orders.id" };
    const orderLineItemsTable = { orderId: "items.orderId", productName: "items.name", productId: "items.productId" };
    const productsTable = { id: "products.id", name: "products.name" };
    let itemReads = 0;
    const tx = {
      select: () => ({
        from: (table: any) => table === productsTable ? Promise.resolve(catalog) : {
          where: async () => ++itemReads === 1 ? oldItems : inserted,
        },
      }),
      delete: () => ({ where: async () => {} }),
      insert: () => ({ values: async (values: any[]) => { inserted = values; } }),
      update: () => ({
        set: (values: any) => {
          orderUpdate = values;
          return { where: () => ({ returning: async () => [{ ...originalOrder, ...values }] }) };
        },
      }),
    };
    const result: any[] = [];
    const response = { status: () => response, json: (value: any) => { result.push(value); } };
    runInNewContext(transformSync(route, { loader: "ts", target: "node20" }).code, {
      router: { put: (_path: string, callback: any) => { handler = callback; } },
      db: { select: () => ({ from: () => ({ where: async () => [originalOrder] }) }), transaction: async (fn: any) => fn(tx) },
      ordersTable, orderLineItemsTable, productsTable,
      requireAdmin: () => true,
      assertNoActiveRefund: async () => {},
      refundMutableOrderWhere: (where: any) => where,
      eq: () => ({}),
      randomUUID: () => "line-id",
      resolveEditedProductId,
      fmtOrder: (order: any, lineItems: any[]) => ({ ...order, lineItems }),
    });
    await handler({ params: { id: "order1" }, body: { lineItems: [
      { productName: "BPC 157 10mg", quantity: 2, unitPrice: 47.5 },
      { productName: "GHK-CU 50mg", quantity: 1, unitPrice: 42 },
      { productName: "Custom gift", quantity: 1, unitPrice: 0 },
    ] } }, response);
    expect(inserted.map(item => item.productId)).toEqual(["p1", "p2", ""]);
    expect(inserted.map(item => item.unitPrice)).toEqual(["47.50", "42.00", "0.00"]);
    expect(inserted.map(item => item.quantity)).toEqual(["2.00", "1.00", "1.00"]);
    expect(orderUpdate.productSubtotal).toBe("137.00");
    expect(orderUpdate.grandTotal).toBe("172.00");
    expect(result[0].lineItems).toHaveLength(3);
    if (paymentStatus === "confirmed") expect(orderUpdate).not.toHaveProperty("paymentUsdAmount");
    else expect(orderUpdate.paymentUsdAmount).toBeNull();
  });
});

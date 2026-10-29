import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real = await vi.importActual<any>("@workspace/db");
  return { ...real, db: {
    select: (...args: any[]) => state.tx.select(...args),
    insert: (...args: any[]) => state.tx.insert(...args),
    execute: (...args: any[]) => state.tx.execute(...args),
    update: (...args: any[]) => state.tx.update(...args),
    delete: (...args: any[]) => state.tx.delete(...args),
    transaction: (fn: any) => fn(state.tx),
  } };
});
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => {
    if (req.get("x-test-admin") === "yes") {
      res.locals.adminUsername = "reviewing-admin"; res.locals.adminAuthorized = true; return true;
    }
    res.status(403).json({ error: "Admin required" }); return false;
  },
  setAdminMutationSummary: vi.fn(),
  getAdminUsername: () => "reviewing-admin",
}));
vi.mock("../config", async () => ({
  ...await vi.importActual<any>("../config"),
  getVendors: async () => [
    { id: "supplier-a", name: "Supplier A", legacyCatalogueVendor: "Legacy A" },
    { id: "supplier-b", name: "Supplier B" },
  ],
}));

describe.skipIf(process.env.FS3_COST_MATCH_DB_TESTS !== "1")("FS3 matches / real PostgreSQL rollback", () => {
  let store: any, realDb: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const router = (await import("../admin")).default;
    const app = express(); app.use(express.json()); app.use(router);
    server = app.listen(0);
    await new Promise<void>(r => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  }, 60_000);
  afterAll(async () => { if (server) await new Promise<void>(r => server.close(() => r())); });
  async function request(method = "GET", body?: any, admin = true, path = "/admin/fs3-cost-matches") {
    const res = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json", ...(admin ? { "x-test-admin": "yes" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data: any = await res.json();
    return { status: res.status, data };
  }
  async function fixture(run: (body: any) => Promise<void>) {
    const rollback = new Error("rollback fixture");
    await realDb.transaction(async (tx: any) => {
      state.tx = tx;
      const suffix = randomUUID();
      const costName = `Saved cost ${suffix}`;
      await tx.insert(store.fs3CostsTable).values({ productName: costName, unitCost: "60" });
      await run({ productName: `Ordered name ${suffix}`, costName, vendorId: "supplier-a",
        reviewNote: "Supplier confirmed identical compound and dose", reviewed: true });
      throw rollback;
    }).catch((e: any) => { if (e !== rollback) throw e; });
  }
  it("requires Admin for reads and writes and explicit review for every approval", async () => fixture(async body => {
    for (const method of ["GET", "POST", "DELETE"]) expect((await request(method, method === "GET" ? undefined : body, false)).status).toBe(403);
    for (const patch of [{ reviewed: false }, { reviewNote: "" }, { vendorId: "unknown" }, { costName: "missing" }, { productName: body.costName }, { vendorId: undefined }]) {
      expect((await request("POST", { ...body, ...patch })).status).toBe(400);
    }
  }));
  it("persists reviewed matches, replaces one identity, and preserves other supplier scopes", async () => fixture(async body => {
    const saved = await request("POST", body);
    expect(saved.status).toBe(200); expect(saved.data.reviewedBy).toBe("reviewing-admin");
    expect(saved.data.reviewedAt).toMatch(/T/);
    await request("POST", { ...body, reviewNote: "Rechecked" });
    await request("POST", { ...body, vendorId: "supplier-b" });
    const loaded = (await request()).data.filter((m: any) => m.productName === body.productName);
    expect(loaded).toHaveLength(2);
    expect(loaded.find((m: any) => m.vendorId === "supplier-a").reviewNote).toBe("Rechecked");
    await request("DELETE", body);
    const after = (await request()).data.filter((m: any) => m.productName === body.productName);
    expect(after).toHaveLength(1); expect(after[0].vendorId).toBe("supplier-b");
  }));
  it("imports prior approvals once and never restores a revoked approval on reload", async () => fixture(async () => {
    expect((await request()).data.some((m: any) => m.productName === "Na Semax 10mg" && m.vendorId === null)).toBe(true);
    await request("DELETE", { vendorId: null, productName: "na semax 10mg" });
    for (let i = 0; i < 2; i++) expect((await request()).data.some((m: any) => m.productName === "Na Semax 10mg" && m.vendorId === null)).toBe(false);
  }));
  it("uses the same group supplier match in batch sheets, summary, P&L and selected orders", async () => fixture(async body => {
    await request("POST", body);
    const suffix = randomUUID(), gbId = `gb-${suffix}`, productId = `p-${suffix}`, username = `member-${suffix}`;
    const orderId = randomUUID();
    await state.tx.insert(store.accountsTable).values({ telegramUsername: username });
    await state.tx.insert(store.groupBuysTable).values({ id: gbId, name: "Pricing test", manufacturer: "Supplier A" });
    // No product supplier identity: the group-buy manufacturer establishes it.
    await state.tx.insert(store.ordersTable).values({ id: orderId, code: `T${suffix}`, telegramUsername: username,
      deliveryMethod: "Direct", status: "Submitted", groupBuyId: gbId, routingType: "direct", grandTotal: "200", productSubtotal: "200" });
    await state.tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId,
      productName: body.productName, quantity: "2", unitPrice: "100", lineTotal: "200" });
    // A sole current same-name offer from B must not become an implicit link
    // for this unlinked historical A order on any FS3 pricing surface.
    await state.tx.insert(store.productsTable).values({ id: `other-${suffix}`, name: body.productName,
      vendor: "Supplier B", wholesaleVendorId: "supplier-b", wholesaleCost: "25", price: "100" });
    const batch = await request("POST", {}, true, `/admin/group-buys/${gbId}/fs3-generate`);
    expect(batch.status).toBe(200);
    expect(batch.data.sheets[0].products[0]).toMatchObject({ name: body.productName, qty: 2, unitCost: 60, vendorId: "supplier-a" });
    const summary = await request("GET", undefined, true, `/admin/fs3-summary?groupBuyId=${gbId}`);
    expect(summary.status).toBe(200);
    expect(summary.data.rows[0]).toMatchObject({ name: body.productName, vendorId: "supplier-a", supplierCost: 60 });
    const pnl = await request("GET", undefined, true, "/admin/fs3-pnl");
    expect(pnl.status).toBe(200);
    expect(pnl.data.orders.find((o: any) => o.id === orderId).lineItems[0].supplierUnitCost).toBe(60);
    const selected = await request("GET", undefined, true, `/admin/orders?groupBuyId=${gbId}&fs3Pricing=true`);
    expect(selected.status).toBe(200);
    expect(selected.data.orders[0].lineItems[0].costVendorId).toBe("supplier-a");
  }), 30_000);
});

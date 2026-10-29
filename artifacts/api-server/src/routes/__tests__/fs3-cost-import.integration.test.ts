import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  const database: any = {};
  for (const method of ["select", "insert", "update", "delete", "execute"]) database[method] = (...args: any[]) => state.tx[method](...args);
  database.transaction = (callback: any) => callback(state.tx);
  return { ...real, db: database };
});
vi.mock("../config", () => ({ getVendors: async () => [
  { id: "existing-legacy-owner", name: "Existing", legacyCatalogueVendor: "Uther" },
  { id: "fixture-ur", name: "UR", legacyCatalogueVendor: "Uther" },
  { id: "fixture-other", name: "Other" },
] }));
vi.mock("../../middleware/require-admin", () => ({ requireAdmin: (req: any, res: any) => {
  if (req.headers["x-fixture-admin"] === "yes") return true;
  res.status(401).json({ error: "Unauthorized" }); return false;
} }));

describe.skipIf(process.env.FS3_COST_IMPORT_DB_TESTS !== "1")("FS3 cost import rollback-only database workflow", () => {
  let store: any, realDb: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const router = (await import("../fs3-cost-import")).default;
    const app = express(); app.use(express.json()); app.use(router);
    server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (store?.pool) await store.pool.end();
  });
  async function request(body: any, admin = true) {
    const response = await fetch(`${base}/admin/wholesale-products/import-fs3-costs`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(admin ? { "x-fixture-admin": "yes" } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  }
  it("reviews without writes, rejects stale prices, applies costs only, and preserves other data", async () => {
    const rollback = new Error("rollback test fixture");
    await realDb.transaction(async (tx: any) => {
      state.tx = tx;
      const prefix = `FS3 import fixture ${randomUUID()}`;
      const ids = ["match", "existing", "unknown", "other"].map(() => randomUUID());
      await tx.insert(store.productsTable).values(ids.map((id, index) => ({
        id, name: `${prefix} ${index}`, vendor: "Uther", wholesaleVendorId: index === 3 ? "fixture-other" : "fixture-ur",
        wholesaleCost: index === 1 ? "0.00" : null, wholesalePrice: "90.00", price: "100.00",
        stock: 7, wholesaleEnabled: true, active: true,
      })));
      await tx.insert(store.fs3CostsTable).values({ productName: `${prefix} 0`.toLowerCase(), unitCost: "20.00" });
      const input = { vendorId: "fixture-ur", apply: false };
      expect((await request(input, false)).status).toBe(401);
      expect((await request({ vendorId: "fixture-other", apply: false })).status).toBe(400);
      let preview = await request(input);
      expect(preview.status).toBe(200);
      expect(preview.body.matches).toEqual([{ id: ids[0], name: `${prefix} 0`, cost: "20.00" }]);
      expect(preview.body.preserved).toBe(1);
      expect(preview.body.skipped.map((p: any) => p.id)).toEqual([ids[2]]);
      let [product] = await tx.select().from(store.productsTable).where(eq(store.productsTable.id, ids[0]));
      expect(product.wholesaleCost).toBeNull();
      expect((await request({ ...input, apply: true })).status).toBe(400);
      await tx.update(store.fs3CostsTable).set({ unitCost: "21.00" }).where(eq(store.fs3CostsTable.productName, `${prefix} 0`.toLowerCase()));
      expect((await request({ ...input, apply: true, previewToken: preview.body.previewToken })).status).toBe(409);
      [product] = await tx.select().from(store.productsTable).where(eq(store.productsTable.id, ids[0]));
      expect(product.wholesaleCost).toBeNull();
      preview = await request(input);
      const applied = await request({ ...input, apply: true, previewToken: preview.body.previewToken });
      expect(applied.status).toBe(200);
      expect(applied.body.updated).toBe(1);
      const rows = await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, ids));
      for (const row of rows) {
        expect(row.wholesalePrice).toBe("90.00");
        expect(row.price).toBe("100.00");
        expect(row.stock).toBe(7);
        expect(row.wholesaleVendorId).toBe(row.id === ids[3] ? "fixture-other" : "fixture-ur");
        expect(row.wholesaleCost).toBe(row.id === ids[0] ? "21.00" : row.id === ids[1] ? "0.00" : null);
      }
      expect((await request({ ...input, apply: true, previewToken: preview.body.previewToken })).status).toBe(409);
      const after = await request(input);
      expect(after.body.matches).toEqual([]);
      expect(after.body.preserved).toBe(2);
      const audit = await tx.select().from(store.auditLogsTable).where(eq(store.auditLogsTable.action, "wholesale_fs3_cost_import"));
      expect(audit.some((row: any) => row.metadata?.products?.some((p: any) => p.id === ids[0]))).toBe(true);
      throw rollback;
    }).catch((error: unknown) => { if (error !== rollback) throw error; });
  });
});

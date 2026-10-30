import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";
import { JBG_YT_CATALOGUE, jbgYtProductId } from "../../lib/jbg-yt-catalogue";

const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: { transaction: (callback: any) => callback(state.tx) } };
});
vi.mock("../../middleware/require-admin", () => ({ requireAdmin: (req: any, res: any) => {
  if (req.headers["x-fixture-admin"] === "yes") return true;
  res.status(401).json({ error: "Unauthorized" }); return false;
} }));

describe.skipIf(process.env.JBG_IMPORT_DB_TESTS !== "1")("JBG/YT import — development rollback-only integration", () => {
  let store: any, realDb: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const app = express(); app.use(express.json()); app.use((await import("../jbg-yt-catalogue-import")).default);
    server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (store?.pool) await store.pool.end();
  });
  async function request(body: any, admin = true) {
    const response = await fetch(`${base}/admin/wholesale-products/import-jbg-yt`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(admin ? { "x-fixture-admin": "yes" } : {}) }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  }
  it("requires Admin, scopes products, preserves both vendors and shipping, and is repeat safe", async () => {
    expect((await request({ vendorId: "test", apply: false }, false)).status).toBe(401);
    expect((await request({ vendorId: "test", apply: true })).status).toBe(400);
    const rollback = new Error("rollback fixture");
    await expect(realDb.transaction(async (tx: any) => {
      state.tx = tx;
      const vendorId = randomUUID();
      const existingId = jbgYtProductId(vendorId, "VIP10");
      const utherId = randomUUID();
      const configValue = JSON.stringify([
        { id: vendorId, name: "JBG/YT", regions: [{ name: "UK", prices: [60] }] },
        { id: "uther", name: "Uther", regions: [{ name: "UK", prices: [50] }] },
      ]);
      await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: configValue })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: configValue } });
      await tx.insert(store.productsTable).values([
        { id: existingId, name: "VIP 10mg", vendor: "JBG/YT", wholesaleVendorId: vendorId, price: "222", wholesalePrice: "222", wholesaleCost: "111", stock: 7 },
        { id: utherId, name: "Retatrutide 30mg", vendor: "Uther", price: "200", wholesalePrice: "200", wholesaleCost: "123", stock: 9 },
      ]);
      expect((await request({ vendorId: "uther", apply: false })).status).toBe(400);
      const preview = await request({ vendorId, apply: false });
      expect(preview.status).toBe(200);
      expect(preview.body.products).toHaveLength(56);
      expect(preview.body.preserved).toBe(1);
      expect((await tx.select().from(store.productsTable).where(eq(store.productsTable.wholesaleVendorId, vendorId)))).toHaveLength(1);
      // Changes after review must reject the old token.
      await tx.update(store.productsTable).set({ stock: 8 }).where(eq(store.productsTable.id, existingId));
      expect((await request({ vendorId, apply: true, previewToken: preview.body.previewToken })).status).toBe(409);
      const updated = await request({ vendorId, apply: false });
      const applied = await request({ vendorId, apply: true, previewToken: updated.body.previewToken });
      expect(applied.status).toBe(200);
      expect(applied.body.created).toBe(55);
      const rows = await tx.select().from(store.productsTable).where(eq(store.productsTable.wholesaleVendorId, vendorId));
      expect(rows).toHaveLength(56);
      for (const row of JBG_YT_CATALOGUE.filter(row => row.sku !== "VIP10")) {
        expect(rows.find((p: any) => p.id === jbgYtProductId(vendorId, row.sku))).toMatchObject({
          name: row.name, wholesaleCost: row.wholesaleCost, wholesalePrice: row.wholesalePrice, stock: 100000, vendor: "JBG/YT",
        });
      }
      const preserved = await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [existingId, utherId]));
      expect(preserved.find((p: any) => p.id === existingId)).toMatchObject({ wholesaleCost: "111.00", wholesalePrice: "222.00", stock: 8 });
      expect(preserved.find((p: any) => p.id === utherId)).toMatchObject({ wholesaleCost: "123.00", wholesalePrice: "200.00", stock: 9, wholesaleVendorId: null });
      const [config] = await tx.select().from(store.siteConfigTable).where(eq(store.siteConfigTable.key, "wholesale_vendors"));
      expect(config.value).toBe(configValue);
      const again = await request({ vendorId, apply: false });
      const replay = await request({ vendorId, apply: true, previewToken: again.body.previewToken });
      expect(replay.body.created).toBe(0);
      expect(replay.body.preserved).toBe(56);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});

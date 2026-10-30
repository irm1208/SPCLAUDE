import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";
import { JBG_YT_CATALOGUE, jbgYtProductId } from "../../lib/jbg-yt-catalogue";

const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: { transaction: (callback: any) => callback(state.tx), select: (...args: any[]) => state.tx.select(...args) } };
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
    app.use((await import("../wholesale-vendor-messages")).default);
    app.use((await import("../config")).default);
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
  it("requires Admin, corrects only JBG/YT prices, preserves stock and shipping, and is repeat safe", async () => {
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
      expect(preview.body.products.find((p: any) => p.sku === "VIP10").needsUpdate).toBe(true);
      expect((await tx.select().from(store.productsTable).where(eq(store.productsTable.wholesaleVendorId, vendorId)))).toHaveLength(1);
      // Changes after review must reject the old token.
      await tx.update(store.productsTable).set({ stock: 8 }).where(eq(store.productsTable.id, existingId));
      expect((await request({ vendorId, apply: true, previewToken: preview.body.previewToken })).status).toBe(409);
      const updated = await request({ vendorId, apply: false });
      const applied = await request({ vendorId, apply: true, previewToken: updated.body.previewToken });
      expect(applied.status).toBe(200);
      expect(applied.body.created).toBe(55);
      expect(applied.body.updated).toBe(1);
      const rows = await tx.select().from(store.productsTable).where(eq(store.productsTable.wholesaleVendorId, vendorId));
      expect(rows).toHaveLength(56);
      for (const row of JBG_YT_CATALOGUE.filter(row => row.sku !== "VIP10")) {
        expect(rows.find((p: any) => p.id === jbgYtProductId(vendorId, row.sku))).toMatchObject({
          name: row.name, wholesaleCost: row.wholesaleCost, wholesalePrice: row.wholesalePrice, stock: 100000, vendor: "JBG/YT",
        });
      }
      const preserved = await tx.select().from(store.productsTable).where(inArray(store.productsTable.id, [existingId, utherId]));
      expect(preserved.find((p: any) => p.id === existingId)).toMatchObject({ wholesaleCost: "100.00", wholesalePrice: "105.00", price: "105.00", stock: 8 });
      expect(preserved.find((p: any) => p.id === utherId)).toMatchObject({ wholesaleCost: "123.00", wholesalePrice: "200.00", stock: 9, wholesaleVendorId: null });
      const [config] = await tx.select().from(store.siteConfigTable).where(eq(store.siteConfigTable.key, "wholesale_vendors"));
      expect(config.value).toBe(configValue);
      const again = await request({ vendorId, apply: false });
      const replay = await request({ vendorId, apply: true, previewToken: again.body.previewToken });
      expect(replay.body.created).toBe(0);
      expect(replay.body.updated).toBe(0);
      expect(replay.body.preserved).toBe(56);
      throw rollback;
    })).rejects.toBe(rollback);
  });
  it("saves, publishes and clears supplier-specific messages without changing shipping or another supplier", async () => {
    async function save(vendorId: string, message: unknown, admin = true) {
      const response = await fetch(`${base}/admin/wholesale-vendors/${vendorId}/message`, {
        method: "PATCH", headers: { "Content-Type": "application/json", ...(admin ? { "x-fixture-admin": "yes" } : {}) },
        body: JSON.stringify({ message }),
      });
      return { status: response.status, body: await response.json() as any };
    }
    expect((await save("any", "text", false)).status).toBe(401);
    expect((await save("any", 123)).status).toBe(400);
    expect((await save("any", "x".repeat(2001))).status).toBe(400);
    const rollback = new Error("rollback message fixture");
    await expect(realDb.transaction(async (tx: any) => {
      state.tx = tx;
      const a = randomUUID(), b = randomUUID();
      const configValue = JSON.stringify([
        { id: a, name: "JBG/YT", enabled: true, regions: [{ name: "UK", prices: [60] }] },
        { id: b, name: "Uther", enabled: true, regions: [{ name: "EU", prices: [80] }] },
      ]);
      await tx.insert(store.siteConfigTable).values({ key: "wholesale_vendors", value: configValue })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: configValue } });
      expect((await save("unknown-vendor", "no")).status).toBe(404);
      expect((await save(b, "Uther message")).status).toBe(200);
      expect((await save(a, "  JBG/YT lead time\nFive days  ")).body).toEqual({ vendorId: a, message: "JBG/YT lead time\nFive days" });
      const visible = await (await fetch(`${base}/wholesale-vendors`)).json() as any;
      expect(visible.vendors.find((v: any) => v.id === a).wholesaleMessage).toBe("JBG/YT lead time\nFive days");
      expect(visible.vendors.find((v: any) => v.id === b).wholesaleMessage).toBe("Uther message");
      expect((await save(a, "  ")).status).toBe(200);
      const cleared = await (await fetch(`${base}/wholesale-vendors`)).json() as any;
      expect(cleared.vendors.find((v: any) => v.id === a).wholesaleMessage).toBe("");
      expect(cleared.vendors.find((v: any) => v.id === b).wholesaleMessage).toBe("Uther message");
      const [config] = await tx.select().from(store.siteConfigTable).where(eq(store.siteConfigTable.key, "wholesale_vendors"));
      expect(config.value).toBe(configValue);
      throw rollback;
    })).rejects.toBe(rollback);
  });
});

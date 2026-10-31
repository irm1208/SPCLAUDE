import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({ tx: null as any, beforeTransaction: null as null | (() => Promise<void>) }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: new Proxy({}, {
    get: (_, key) => key === "transaction"
      ? async (callback: any) => {
        const before = state.beforeTransaction; state.beforeTransaction = null;
        if (before) await before();
        return callback(state.tx);
      }
      : (...args: any[]) => state.tx[key](...args),
  }) };
});
vi.mock("../../middleware/require-wholesale", () => {
  const auth = (req: any, res: any, next: any) => {
    if (!req.headers["x-fixture-user"]) return res.status(401).json({ error: "Unauthorized" });
    req.wholesale = { telegramUsername: req.headers["x-fixture-user"] };
    next();
  };
  return { requireWholesale: auth, requireWholesaleOrAdmin: auth };
});
vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn() }));

describe.skipIf(process.env.SHARED_VENDOR_DB_TESTS !== "1")("shared supplier policy — rollback-only development integration", () => {
  let store: any, realDb: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const app = express(); app.use(express.json());
    app.use((await import("../wholesale-shares")).default);
    server = await new Promise<Server>(resolve => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (store?.pool) await store.pool.end();
  });
  async function request(path: string, body: any, user = "supplier-fixture-owner", method = "PUT") {
    const response = await fetch(`${base}${path}`, {
      method, headers: { "Content-Type": "application/json", "x-fixture-user": user },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  }
  it("creates explicit policies, filters writes, protects existing baskets, and restricts settings to the organiser", async () => {
    const rollback = new Error("rollback supplier fixture");
    await expect(realDb.transaction(async (tx: any) => {
      state.tx = tx;
      await tx.execute(sql`ALTER TABLE wholesale_shares ADD COLUMN IF NOT EXISTS allowed_vendor_ids jsonb`);
      const a = randomUUID(), b = randomUUID(), productId = randomUUID();
      await tx.insert(store.siteConfigTable).values({
        key: "wholesale_vendors",
        value: JSON.stringify([
          { id: a, name: "Uther", enabled: true, tiers: ["1-100"], tierBounds: [100], regions: [] },
          { id: b, name: "JBG/YT", enabled: true, tiers: ["1-100"], tierBounds: [100], regions: [] },
        ]),
      }).onConflictDoUpdate({ target: store.siteConfigTable.key, set: {
        value: JSON.stringify([
          { id: a, name: "Uther", enabled: true, tiers: ["1-100"], tierBounds: [100], regions: [] },
          { id: b, name: "JBG/YT", enabled: true, tiers: ["1-100"], tierBounds: [100], regions: [] },
        ]),
      } });
      await tx.insert(store.productsTable).values({
        id: productId, name: "Fixture product", vendor: "JBG/YT", wholesaleVendorId: b,
        price: "60", wholesalePrice: "60", wholesaleCost: "46", active: true, wholesaleEnabled: true,
      });
      expect((await request("/wholesale-shares", { allowedVendorIds: [] }, undefined, "POST")).status).toBe(400);
      expect((await request("/wholesale-shares", { allowedVendorIds: ["disabled"] }, undefined, "POST")).status).toBe(400);
      const created = await request("/wholesale-shares", { allowedVendorIds: [a] }, undefined, "POST");
      expect(created.status).toBe(201);
      const id = created.body.id;
      expect(created.body.settings.allowedVendorIds).toEqual([a]);
      expect((await request(`/wholesale-shares/${id}/items`, { items: [{ productId, quantity: 1 }] })).status).toBe(400);
      expect((await request(`/wholesale-shares/${id}/settings`, { allowedVendorIds: [a, b] }, "supplier-fixture-other")).status).toBe(403);
      const both = await request(`/wholesale-shares/${id}/settings`, { allowedVendorIds: [a, b] });
      expect(both.status).toBe(200);
      expect(both.body.settings.allowedVendorIds).toEqual([a, b]);
      // Simulate the supplier selection changing after the initial item-route
      // read but before the write transaction takes its parent-row lock.
      state.beforeTransaction = async () => {
        await tx.update(store.wholesaleSharesTable).set({ allowedVendorIds: [a] })
          .where(eq(store.wholesaleSharesTable.id, id));
      };
      const raced = await request(`/wholesale-shares/${id}/items`, { items: [{ productId, quantity: 1 }] });
      expect(raced.status).toBe(409);
      const [untouched] = await tx.select().from(store.wholesaleShareMembersTable)
        .where(eq(store.wholesaleShareMembersTable.shareId, id));
      expect(untouched.items).toEqual([]);
      expect((await request(`/wholesale-shares/${id}/settings`, { allowedVendorIds: [a, b] })).status).toBe(200);
      const saved = await request(`/wholesale-shares/${id}/items`, { items: [{ productId, quantity: 1 }] });
      expect(saved.status).toBe(200);
      expect((await request(`/wholesale-shares/${id}/settings`, { allowedVendorIds: [a] })).status).toBe(409);
      const [after] = await tx.select().from(store.wholesaleSharesTable).where(eq(store.wholesaleSharesTable.id, id));
      expect(after.allowedVendorIds).toEqual([a, b]);
      const onlyB = await request(`/wholesale-shares/${id}/settings`, { allowedVendorIds: [b] });
      expect(onlyB.status).toBe(200);
      expect(onlyB.body.settings.allowedVendorIds).toEqual([b]);
      throw rollback;
    })).rejects.toBe(rollback);
  }, 30000);
});

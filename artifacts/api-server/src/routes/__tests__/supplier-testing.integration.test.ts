import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import express from "express";
import type { Server } from "node:http";
import { ensureSupplierTestingSchema } from "../../lib/supplier-testing-migration";

const state = vi.hoisted(() => ({ tx: null as any }));
vi.mock("@workspace/db", async () => {
  const real: any = await vi.importActual("@workspace/db");
  return { ...real, db: new Proxy({}, {
    get: (_, key) => key === "transaction" ? async (cb: any) => cb(state.tx) : (...args: any[]) => state.tx[key](...args),
  }) };
});
vi.mock("../config", () => ({ getVendors: async () => [
  { id: "supplier-test-j", name: "JBG/YT" }, { id: "supplier-test-u", name: "Uther" },
] }));
vi.mock("../../middleware/account-auth", () => ({
  getOptionalAccountSession: async (req: any) => req.headers["x-fixture-user"] ? { telegramUsername: req.headers["x-fixture-user"] } : null,
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.headers["x-fixture-user"]) return res.status(401).json({ error: "Unauthorized" });
    req.account = { telegramUsername: req.headers["x-fixture-user"] }; next();
  },
}));
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => {
    if (req.headers["x-fixture-admin"] === "yes") return true;
    res.status(401).json({ error: "Unauthorized" }); return false;
  },
  requireAdminForRequest: async (req: any, res: any) => {
    if (req.headers["x-fixture-admin"] === "yes") return true;
    res.status(401).json({ error: "Unauthorized" }); return false;
  },
  getAdminUsername: () => "fixture-admin",
}));
vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn() }));
vi.mock("../../lib/telegram", () => ({
  sendAdminFromTemplate: vi.fn(), notifyUserFromTemplate: vi.fn(), notifyUser: vi.fn(),
}));

describe.skipIf(process.env.SUPPLIER_TESTING_DB_TESTS !== "1")("supplier testing API — real database, rolled back", () => {
  let server: Server, base: string, store: any, realDb: any;
  beforeAll(async () => {
    store = await vi.importActual("@workspace/db"); realDb = store.db;
    const app = express(); app.use(express.json());
    app.use((await import("../supplier-testing")).default);
    app.use((await import("../testing-pools")).default);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  }, 30000);
  afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); if (store?.pool) await store.pool.end(); });
  async function request(path: string, body?: unknown, user?: string, admin = false, method?: string) {
    const response = await fetch(`${base}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(user ? { "x-fixture-user": user } : {}), ...(admin ? { "x-fixture-admin": "yes" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() as any };
  }
  it("isolates suppliers, owns joining, retains history, binds batches and never changes order money", async () => {
    const rollback = new Error("rollback supplier testing fixture");
    await expect(realDb.transaction(async (tx: any) => {
      state.tx = tx;
      await ensureSupplierTestingSchema(tx);
      const user = `supplier-testing-${randomUUID()}`, other = `supplier-testing-${randomUUID()}`;
      await tx.insert(store.accountsTable).values([{ telegramUsername: user }, { telegramUsername: other }]);
      const j = randomUUID(), u = randomUUID(), differentStrength = randomUUID();
      await tx.insert(store.productsTable).values([
        { id: j, name: "Identical compound 10mg", vendor: "JBG/YT", wholesaleVendorId: "supplier-test-j", price: "60", mgSize: "10mg" },
        { id: u, name: "Identical compound 10mg", vendor: "Uther", wholesaleVendorId: "supplier-test-u", price: "60" },
        { id: differentStrength, name: "Identical compound 20mg", vendor: "JBG/YT", wholesaleVendorId: "supplier-test-j", price: "90", mgSize: "20mg" },
      ]);
      const orderId = randomUUID(), draftId = randomUUID(), cancelledId = randomUUID(), gbId = randomUUID(), gbOrderId = randomUUID();
      await tx.insert(store.groupBuysTable).values({ id: gbId, name: "JBG fixture", pin: "1234", labTestSupplier: "JBG/YT" });
      await tx.insert(store.ordersTable).values([
        { id: orderId, code: `T${randomUUID()}`, telegramUsername: user, deliveryMethod: "vendor", productSubtotal: "120", grandTotal: "150", status: "Submitted", orderType: "wholesale", paymentStatus: "unpaid" },
        { id: draftId, code: `T${randomUUID()}`, telegramUsername: user, deliveryMethod: "vendor", productSubtotal: "60", grandTotal: "60", status: "Draft", orderType: "wholesale" },
        { id: cancelledId, code: `T${randomUUID()}`, telegramUsername: user, deliveryMethod: "vendor", productSubtotal: "60", grandTotal: "60", status: "Cancelled", orderType: "wholesale" },
        { id: gbOrderId, code: `T${randomUUID()}`, telegramUsername: user, deliveryMethod: "vendor", productSubtotal: "60", grandTotal: "60", status: "Processing", groupBuyId: gbId, paymentStatus: "confirmed" },
      ]);
      await tx.insert(store.orderLineItemsTable).values([
        { id: randomUUID(), orderId, productId: j, productName: "Identical compound 10mg", vendorId: "supplier-test-j", quantity: "1", unitPrice: "60", lineTotal: "60" },
        { id: randomUUID(), orderId, productId: u, productName: "Identical compound 10mg", vendorId: "supplier-test-u", quantity: "1", unitPrice: "60", lineTotal: "60" },
        ...[draftId, cancelledId].map(id => ({ id: randomUUID(), orderId: id, productId: j, productName: "Identical compound 10mg", vendorId: "supplier-test-j", quantity: "1", unitPrice: "60", lineTotal: "60" })),
        { id: randomUUID(), orderId: gbOrderId, productId: u, productName: "Identical compound 10mg", quantity: "1", unitPrice: "60", lineTotal: "60" },
      ]);
      expect((await request("/account/supplier-testing")).status).toBe(401);
      expect((await request("/admin/supplier-testing", undefined, user)).status).toBe(401);
      const before = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId));
      const list = await request("/account/supplier-testing", undefined, user);
      expect(list.status).toBe(200);
      expect(list.body.items.map((i: any) => i.orderId).sort()).toEqual([orderId, gbOrderId].sort());
      expect(list.body.items.find((i: any) => i.orderId === orderId).productId).toBe(j);
      expect((await request("/account/supplier-testing/join", { orderId, productId: j }, other)).status).toBe(409);
      for (const id of [draftId, cancelledId]) expect((await request("/account/supplier-testing/join", { orderId: id, productId: j }, user)).status).toBe(409);
      expect((await request("/account/supplier-testing/join", { orderId, productId: u }, user)).status).toBe(409);
      const first = await request("/account/supplier-testing/join", { orderId, productId: j }, user);
      const second = await request("/account/supplier-testing/join", { orderId, productId: j }, user);
      expect(first.status).toBe(200); expect(first.body.state).toBe("awaiting_batch");
      expect(second.body.interestId).toBe(first.body.interestId);
      // A shared order qualifies only while its active membership points at this exact order.
      const sharedId = randomUUID(), sharedOrderId = randomUUID(), sharedMemberId = randomUUID();
      await tx.insert(store.wholesaleSharesTable).values({ id: sharedId, creatorUsername: user, status: "locked" });
      await tx.insert(store.ordersTable).values({
        id: sharedOrderId, code: `T${randomUUID()}`, telegramUsername: user, deliveryMethod: "vendor",
        productSubtotal: "120", grandTotal: "150", status: "Submitted", orderType: "wholesale_shared", sharedOrderId: sharedId,
      });
      await tx.insert(store.orderLineItemsTable).values([
        { id: randomUUID(), orderId: sharedOrderId, productId: j, productName: "Identical compound 10mg", vendorId: "supplier-test-j", quantity: "1", unitPrice: "60", lineTotal: "60" },
        { id: randomUUID(), orderId: sharedOrderId, productId: u, productName: "Identical compound 10mg", vendorId: "supplier-test-u", quantity: "1", unitPrice: "60", lineTotal: "60" },
      ]);
      expect((await request("/account/supplier-testing/join", { orderId: sharedOrderId, productId: j }, user)).status).toBe(409);
      await tx.insert(store.wholesaleShareMembersTable).values({ id: sharedMemberId, shareId: sharedId, username: user, orderId: sharedOrderId });
      const sharedJoin = await request("/account/supplier-testing/join", { orderId: sharedOrderId, productId: j }, user);
      expect(sharedJoin.status).toBe(200);
      expect((await request("/account/supplier-testing/join", { orderId: sharedOrderId, productId: u }, user)).status).toBe(409);
      const poolId = randomUUID(), wrongPoolId = randomUUID(), anotherBatchPool = randomUUID();
      await tx.insert(store.testingPoolsTable).values([poolId, wrongPoolId, anotherBatchPool].map(id =>
        ({ id, slug: id, leaderUsername: "__admin__", title: "Testing fixture", status: "draft" })));
      const bind = (poolId: string, productId = j, batchNumber = "PHYSICAL-A") => request("/admin/supplier-testing/groups",
        { poolId, productId, supplierId: "supplier-test-j", batchNumber }, undefined, true);
      const group = await bind(poolId);
      expect(group.status).toBe(201);
      const memberOwnedPool = randomUUID();
      await tx.insert(store.testingPoolsTable).values({ id: memberOwnedPool, slug: memberOwnedPool, leaderUsername: other, title: "Unassigned member's pool", status: "draft" });
      const rejectedMemberLink = await bind(memberOwnedPool, j, "MEMBER-OWNED-BATCH");
      expect(rejectedMemberLink.status).toBe(409);
      expect(rejectedMemberLink.body.error).toContain("Admin-owned");
      expect((await bind(anotherBatchPool, j, " physical-a ")).status).toBe(409);
      const different = await bind(wrongPoolId, differentStrength);
      expect(different.status).toBe(201);
      const assign = (groupId: string) => request(`/admin/supplier-testing/interests/${first.body.interestId}/assign`,
        { groupId, note: "Matched supplier's physical batch code to this order." }, undefined, true, "PUT");
      expect((await assign(different.body.id)).status).toBe(409);
      expect((await assign(group.body.id)).status).toBe(200);
      // Membership survives completed contribution workflows, but cannot leak another batch's results.
      await tx.update(store.testingPoolsTable).set({ status: "open", approvalStatus: "approved" }).where(eq(store.testingPoolsTable.id, poolId));
      const freshPool = await request(`/testing-pools/${poolId}`, undefined, user);
      expect(freshPool.status).toBe(200);
      expect(freshPool.body.myContribution).toBeNull();
      expect((await request(`/testing-pools/${poolId}`, undefined, other)).status).toBe(403);
      // Even a legacy or later-edited leader identity conveys no supplier-batch privileges.
      await tx.update(store.testingPoolsTable).set({ leaderUsername: other }).where(eq(store.testingPoolsTable.id, poolId));
      expect((await request(`/testing-pools/${poolId}`, undefined, other)).status).toBe(403);
      expect((await request(`/testing-pools/${poolId}/results-unlock`, { password: "anything" }, other)).status).toBe(403);
      expect((await request(`/account/pool-leader/pools/${poolId}/participants`, undefined, other)).status).toBe(403);
      expect((await request(`/account/pool-leader/pools/${poolId}`, { resultNotes: "unauthorised" }, other, false, "PATCH")).status).toBe(403);
      expect((await request("/account/pool-leader/pools", undefined, other)).body.some((p: any) => p.id === poolId)).toBe(false);
      expect((await request(`/testing-pools/${poolId}`)).status).toBe(401);
      const contribute = () => request(`/testing-pools/${poolId}/opt-in`, { amountUsd: 10, contactTelegram: user, paymentMethod: "crypto", isPublic: false }, user);
      const payment = await contribute();
      expect(payment.status).toBe(201);
      expect((await request(`/admin/supplier-testing/interests/${sharedJoin.body.interestId}/assign`, {
        groupId: group.body.id, note: "Same exact JBG physical batch for this shared order.",
      }, undefined, true, "PUT")).status).toBe(200);
      expect(await tx.select().from(store.supplierTestingMembershipsTable).where(eq(store.supplierTestingMembershipsTable.groupId, group.body.id))).toHaveLength(1);
      expect((await contribute()).status).toBe(409);
      expect((await request(`/testing-pools/${poolId}`, undefined, user)).body.myContribution.id).toBe(payment.body.participantId);
      expect((await request("/testing-pools")).body.some((p: any) => p.id === poolId)).toBe(false);
      expect((await request(`/admin/testing-pools/${poolId}`, { batchNumber: "WRONG-BATCH" }, undefined, true, "PATCH")).status).toBe(409);
      expect((await request(`/admin/testing-pools/${poolId}`, undefined, undefined, true, "DELETE")).status).toBe(409);
      expect((await assign(group.body.id)).status).toBe(200);
      expect((await assign(group.body.id)).status).toBe(200);
      expect((await assign(different.body.id)).status).toBe(409);
      const fresh = await request("/account/supplier-testing", undefined, user);
      expect(fresh.body.items.find((i: any) => i.orderId === orderId).state).toBe("assigned");
      expect(fresh.body.groups.filter((g: any) => g.joined)).toHaveLength(1);
      expect((await request("/account/supplier-testing", undefined, other)).body.groups).toHaveLength(0);
      expect(await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId))).toEqual(before);
      expect(await tx.select().from(store.poolParticipantsTable).where(eq(store.poolParticipantsTable.poolId, poolId))).toHaveLength(1);
      await tx.update(store.ordersTable).set({ status: "Cancelled" }).where(eq(store.ordersTable.id, orderId));
      await tx.update(store.ordersTable).set({ status: "Cancelled" }).where(eq(store.ordersTable.id, sharedOrderId));
      const retained = await request("/account/supplier-testing", undefined, user);
      expect(retained.body.items.find((i: any) => i.orderId === orderId).state).toBe("retained_ineligible");
      expect(retained.body.groups.find((g: any) => g.id === group.body.id).joined).toBe(true);
      expect((await request("/account/supplier-testing/join", { orderId, productId: j }, user)).status).toBe(409);
      expect((await contribute()).status).toBe(403);
      // FK username updates retain ownership without reassigning testing history.
      const renamed = `${user}-new`;
      await tx.update(store.accountsTable).set({ telegramUsername: renamed }).where(eq(store.accountsTable.telegramUsername, user));
      expect((await request("/account/supplier-testing", undefined, renamed)).body.groups.find((g: any) => g.id === group.body.id).joined).toBe(true);
      throw rollback;
    })).rejects.toBe(rollback);
  }, 60000);
});

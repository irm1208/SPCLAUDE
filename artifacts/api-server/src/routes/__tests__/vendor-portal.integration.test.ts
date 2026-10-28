import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
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
vi.mock("../../middleware/account-auth", () => ({
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.get("x-test-user")) return res.status(401).json({ error: "Sign in" });
    req.account = { telegramUsername: req.get("x-test-user") }; next();
  },
}));
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => {
    if (req.get("x-test-admin") === "yes") return true;
    res.status(403).json({ error: "Admin required" }); return false;
  },
  getAdminUsername: () => "test-admin",
}));
vi.mock("../config", () => ({
  getVendors: async () => ["vendor-a", "vendor-b"].map(id => ({
    id, name: id, tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
    regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
  })),
}));
vi.mock("../../lib/telegram", () => ({ notifyUser: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../lib/tracking-auto-refresh", () => ({ refreshWholesaleMainParcelForShare: vi.fn(async () => ({ updated: true })) }));
vi.mock("../../lib/wholesale-update-images", () => ({
  storePageUpdateImage: vi.fn(async () => "vendor-dispatch/test.webp"),
  downloadWholesaleUpdateImage: vi.fn(async () => Buffer.from("synthetic image")),
  deleteWholesaleUpdateImage: vi.fn(async () => {}),
}));

describe.skipIf(process.env.VENDOR_PORTAL_DB_TESTS !== "1")("vendor portal / real PostgreSQL with rollback fixtures", () => {
  let store: any, realDb: any, server: Server, base: string;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const router = (await import("../vendor-portal")).default;
    const app = express(); app.use(express.json()); app.use(router);
    server = app.listen(0);
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
  async function request(path: string, user?: string, body?: unknown, admin = false, method?: string) {
    const result = await fetch(base + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { ...(user ? { "x-test-user": user } : {}), ...(admin ? { "x-test-admin": "yes" } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data: any = (result.headers.get("Content-Type") ?? "").includes("application/json") ? await result.json() : await result.text();
    return { status: result.status, data };
  }
  async function fixture(run: (f: any) => Promise<void>) {
    const rollback = new Error("fixture rollback");
    await realDb.transaction(async (tx: any) => {
      state.tx = tx;
      const suffix = randomUUID().slice(0, 8);
      const a = `fixture-vendor-a-${suffix}`, b = `fixture-vendor-b-${suffix}`, member = `fixture-member-${suffix}`, other = `fixture-other-${suffix}`;
      await tx.insert(store.accountsTable).values([a, b, member, other].map(telegramUsername => ({ telegramUsername })));
      await tx.insert(store.vendorPortalAccessTable).values([
        { username: a, vendorId: "vendor-a", grantedBy: "fixture" },
        { username: b, vendorId: "vendor-b", grantedBy: "fixture" },
      ]);
      const name = `Fixture product ${suffix}`;
      await tx.insert(store.fs3CostsTable).values({ productName: name, unitCost: "20.00" });
      const orderId = randomUUID(), code = String(800000000 + Math.floor(Math.random() * 100000000));
      await tx.insert(store.ordersTable).values({
        id: orderId, code, telegramUsername: member, deliveryMethod: "Vendor",
        status: "Submitted", paymentStatus: "confirmed", productSubtotal: "1998", grandTotal: "2048",
        orderType: "wholesale", shippingName: "Fixture Recipient", shippingAddress: "Fixture Road, London AB1",
        shippingCountry: "United Kingdom", shippingPhone: "+441234567890", shippingEmail: "fixture@example.invalid",
      });
      await tx.insert(store.orderLineItemsTable).values({
        id: randomUUID(), orderId, productId: name, productName: name, quantity: "2", unitPrice: "999", lineTotal: "1998",
      });
      try { await run({ a, b, member, other, orderId, code, name, tx }); }
      catch (error) { throw error; }
      throw rollback;
    }).catch((error: unknown) => { if (error !== rollback) throw error; });
    state.tx = null;
  }
  async function submit(f: any) {
    const input = { vendorId: "vendor-a", orderCodes: [f.code] };
    const preview = await request("/admin/vendor-portal/preview", undefined, input, true);
    expect(preview.status).toBe(200);
    const body = { ...input, previewToken: preview.data.previewToken };
    expect((await request("/admin/vendor-portal/submit", undefined, body, true)).status).toBe(200);
    return { body, preview: preview.data, row: (await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `order:${f.orderId}`)))[0] };
  }
  it("gates all orders by explicit Admin submission, exposes only costs and retries idempotently", () => fixture(async f => {
    expect((await request("/vendor/orders")).status).toBe(401);
    expect((await request("/vendor/orders", f.member)).status).toBe(403);
    expect((await request("/admin/vendor-portal", f.a)).status).toBe(403);
    expect((await request("/vendor/orders", f.a)).data.orders).toEqual([]);
    const { body } = await submit(f);
    expect((await request("/admin/vendor-portal/submit", undefined, body, true)).status).toBe(200);
    const result = await request("/vendor/orders", f.a);
    expect(result.status).toBe(200);
    expect(result.data.orders).toHaveLength(1);
    expect(result.data.orders[0].items[0]).toMatchObject({ unitCost: "20.00", lineTotal: "40.00" });
    expect(result.data.orders[0].totalCost).toBe("90.00");
    const text = JSON.stringify(result.data);
    for (const hidden of ["1998", "2048", "999", "grandTotal", "paymentStatus", "telegramUsername", "sourceFingerprint"]) expect(text).not.toContain(hidden);
    expect((await request("/vendor/orders", f.b)).data.orders).toEqual([]);
  }));
  it("blocks another vendor's IDs, tampered price writes, suspension and immediate revocation", () => fixture(async f => {
    const { row } = await submit(f);
    expect((await request(`/vendor/orders/${row.id}`, f.b, { action: "processing" }, false, "PATCH")).status).toBe(404);
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing", grandTotal: 0 }, false, "PATCH")).status).toBe(400);
    await f.tx.update(store.accountsTable).set({ accountStatus: "suspended" }).where(eq(store.accountsTable.telegramUsername, f.a));
    expect((await request("/vendor/orders", f.a)).status).toBe(403);
    await f.tx.update(store.accountsTable).set({ accountStatus: "active" }).where(eq(store.accountsTable.telegramUsername, f.a));
    await f.tx.delete(store.vendorPortalAccessTable).where(eq(store.vendorPortalAccessTable.username, f.a));
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing" }, false, "PATCH")).status).toBe(403);
  }));
  it("detects stale previews and post-submission product edits", () => fixture(async f => {
    const input = { vendorId: "vendor-a", orderCodes: [f.code] };
    const preview = await request("/admin/vendor-portal/preview", undefined, input, true);
    await f.tx.update(store.fs3CostsTable).set({ unitCost: "21.00" }).where(eq(store.fs3CostsTable.productName, f.name));
    expect((await request("/admin/vendor-portal/submit", undefined, { ...input, previewToken: preview.data.previewToken }, true)).status).toBe(409);
    const { row } = await submit(f);
    await f.tx.update(store.orderLineItemsTable).set({ quantity: "3" }).where(eq(store.orderLineItemsTable.orderId, f.orderId));
    expect((await request("/vendor/orders", f.a)).data.orders[0].stale).toBe(true);
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing" }, false, "PATCH")).status).toBe(409);
  }));
  it("persists processing and tracking to member orders without changing money, and audits actor", () => fixture(async f => {
    const { row } = await submit(f);
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing" }, false, "PATCH")).status).toBe(200);
    expect((await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId)))[0].status).toBe("Processing");
    const input = { action: "tracking", carrier: "Royal Mail", trackingNumber: "TRACK123456" };
    expect((await request(`/vendor/orders/${row.id}`, f.a, input, false, "PATCH")).status).toBe(200);
    const [updated] = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
    expect(updated).toMatchObject({ status: "Shipped", trackingNumber: "TRACK123456", grandTotal: "2048.00", paymentStatus: "confirmed" });
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing" }, false, "PATCH")).status).toBe(409);
    const audits = await f.tx.select().from(store.vendorAuditTable).where(eq(store.vendorAuditTable.submissionId, row.id));
    expect(audits.filter((a: any) => a.actor === f.a).map((a: any) => a.action)).toEqual(["processing", "tracking"]);
  }));
  it("authorizes images on upload, listing and guessed direct URLs", () => fixture(async f => {
    const { row } = await submit(f);
    const form = new FormData(); form.append("file", new Blob(["fake jpeg"], { type: "image/jpeg" }), "packing.jpg");
    const uploaded = await fetch(`${base}/vendor/orders/${row.id}/images`, { method: "POST", headers: { "x-test-user": f.a }, body: form });
    expect(uploaded.status).toBe(201);
    const list = await request(`/account/orders/${f.orderId}/vendor-images`, f.member);
    expect(list.status).toBe(200); expect(list.data.images).toHaveLength(1);
    const image = list.data.images[0];
    expect((await request(image.url.replace("/api", ""), f.member)).status).toBe(200);
    expect((await request(image.url.replace("/api", ""), f.other)).status).toBe(404);
    expect((await request(`/vendor/vendor-images/${image.id}`, f.b)).status).toBe(404);
  }));
  it("rejects missing supplier costs, incomplete delivery and unpaid orders", () => fixture(async f => {
    const input = { vendorId: "vendor-a", orderCodes: [f.code] };
    await f.tx.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.name));
    let result = await request("/admin/vendor-portal/preview", undefined, input, true);
    expect(result.status).toBe(400); expect(result.data.error).toContain("FS3 supplier cost");
    await f.tx.insert(store.fs3CostsTable).values({ productName: f.name, unitCost: "20" });
    await f.tx.update(store.ordersTable).set({ shippingPhone: null }).where(eq(store.ordersTable.id, f.orderId));
    result = await request("/admin/vendor-portal/preview", undefined, input, true);
    expect(result.status).toBe(400); expect(result.data.error).toContain("phone");
    await f.tx.update(store.ordersTable).set({ shippingPhone: "+441234", paymentStatus: "unpaid" }).where(eq(store.ordersTable.id, f.orderId));
    expect((await request("/admin/vendor-portal/preview", undefined, input, true)).status).toBe(409);
  }));
  it("recalls an unstarted shipment but protects started fulfilment and completed member orders", () => fixture(async f => {
    const { row } = await submit(f);
    expect((await request(`/admin/vendor-portal/orders/${row.id}`, undefined, undefined, true, "DELETE")).status).toBe(200);
    expect((await request("/vendor/orders", f.a)).data.orders).toEqual([]);
    const { row: second } = await submit(f);
    await request(`/vendor/orders/${second.id}`, f.a, { action: "processing" }, false, "PATCH");
    expect((await request(`/admin/vendor-portal/orders/${second.id}`, undefined, undefined, true, "DELETE")).status).toBe(409);
    await f.tx.update(store.ordersTable).set({ status: "Completed" }).where(eq(store.ordersTable.id, f.orderId));
    expect((await request(`/vendor/orders/${second.id}`, f.a, { action: "tracking", carrier: "Fixture", trackingNumber: "TRACK123" }, false, "PATCH")).status).toBe(409);
  }));
  it("combines a shared order once and keeps onward addresses and combined photos private", () => fixture(async f => {
    const shareId = `TEST${randomUUID().slice(0, 6).toUpperCase()}`;
    const secondOrder = randomUUID(), secondCode = String(Number(f.code) + 1);
    await f.tx.insert(store.wholesaleSharesTable).values({
      id: shareId, creatorUsername: f.member, status: "submitted", vendorId: "vendor-a",
      organiserPaymentStatus: "confirmed", deliveryUsername: f.member,
      shippingName: "Shared Recipient", shippingAddress: "Combined supplier address",
      shippingCountry: "United Kingdom", shippingEmail: "recipient@example.invalid", shippingPhone: "+441234",
    });
    await f.tx.update(store.ordersTable).set({ orderType: "wholesale_shared", sharedOrderId: shareId }).where(eq(store.ordersTable.id, f.orderId));
    await f.tx.insert(store.ordersTable).values({
      id: secondOrder, code: secondCode, telegramUsername: f.other, deliveryMethod: "Vendor",
      status: "Submitted", paymentStatus: "confirmed", productSubtotal: "999", grandTotal: "999",
      orderType: "wholesale_shared", sharedOrderId: shareId,
      shippingAddress: "PRIVATE ONWARD ADDRESS",
    });
    await f.tx.insert(store.orderLineItemsTable).values({
      id: randomUUID(), orderId: secondOrder, productId: f.name, productName: f.name, quantity: "1", unitPrice: "999", lineTotal: "999",
    });
    await f.tx.insert(store.wholesaleShareMembersTable).values([
      { id: randomUUID(), shareId, username: f.member, orderId: f.orderId },
      { id: randomUUID(), shareId, username: f.other, orderId: secondOrder, onwardAddress: "PRIVATE ONWARD ADDRESS" },
    ]);
    const input = { vendorId: "vendor-a", orderCodes: [f.code, secondCode] };
    const preview = await request("/admin/vendor-portal/preview", undefined, input, true);
    expect(preview.status).toBe(200); expect(preview.data.shipments).toHaveLength(1);
    expect(preview.data.shipments[0].items[0].quantity).toBe(3);
    expect(JSON.stringify(preview.data)).not.toContain("PRIVATE ONWARD ADDRESS");
    expect((await request("/admin/vendor-portal/submit", undefined, { ...input, previewToken: preview.data.previewToken }, true)).status).toBe(200);
    const [row] = await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `share:${shareId}`));
    await f.tx.insert(store.vendorImagesTable).values({ id: randomUUID(), submissionId: row.id, objectPath: "synthetic", filename: "packing.webp", uploadedBy: f.a });
    const recipientPhotos = await request(`/account/orders/${f.orderId}/vendor-images`, f.member);
    expect(recipientPhotos.data.images).toHaveLength(1);
    expect((await request(`/account/orders/${secondOrder}/vendor-images`, f.other)).data.images).toEqual([]);
    const privateUrl = recipientPhotos.data.images[0].url.replace("/api", "");
    expect((await request(privateUrl, f.other)).status).toBe(404);
    const tracking = { action: "tracking", carrier: "Fixture", trackingNumber: "SHARED1234" };
    expect((await request(`/vendor/orders/${row.id}`, f.a, tracking, false, "PATCH")).status).toBe(200);
    const [other] = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, secondOrder));
    expect(other).toMatchObject({ trackingNumber: "SHARED1234", status: "Shipped", grandTotal: "999.00" });
  }));
});

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
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
vi.mock("../config", async () => ({
  ...await vi.importActual<any>("../config"),
  getVendors: async () => ["vendor-a", "vendor-b"].map(id => ({
    id, name: id, tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
    regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
  })),
}));
vi.mock("../../lib/audit-log", () => ({writeLog:vi.fn(async()=>{})}));
vi.mock("../../lib/wholesale-share-chat", () => ({postWholesaleChatMessage:vi.fn(async()=>{})}));
vi.mock("../../lib/telegram", () => ({ notifyUser: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../lib/tracking-auto-refresh", () => ({ refreshWholesaleMainParcelForShare: vi.fn(async () => ({ updated: true })) }));
vi.mock("../../lib/wholesale-update-images", () => ({
  storePageUpdateImage: vi.fn(async () => "vendor-dispatch/test.webp"),
  downloadWholesaleUpdateImage: vi.fn(async () => Buffer.from("synthetic image")),
  deleteWholesaleUpdateImage: vi.fn(async () => {}),
}));

describe.skipIf(process.env.VENDOR_PORTAL_DB_TESTS !== "1")("vendor portal / real PostgreSQL with rollback fixtures", () => {
  let store: any, realDb: any, server: Server, base: string, lockShare:any;
  beforeAll(async () => {
    store = await import("@workspace/db");
    realDb = (await vi.importActual<any>("@workspace/db")).db;
    const router = (await import("../vendor-portal")).default;
    lockShare = (await import("../wholesale-shares")).attemptLockShare;
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
        orderType: "wholesale", wholesaleVendorId:"vendor-a", shippingName: "Fixture Recipient", shippingAddress: "Fixture Road, London AB1",
        shippingCountry: "United Kingdom", shippingPhone: "+441234567890", shippingEmail: "fixture@example.invalid",
      });
      await tx.insert(store.orderLineItemsTable).values({
        id: randomUUID(), orderId, vendorId:"vendor-a", productId: name, productName: name, quantity: "2", unitPrice: "999", lineTotal: "1998",
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
    return { body, preview: preview.data, row: (await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, preview.data.shipments[0].id)))[0] };
  }
  it("upgrades an older database twice without changing legacy rows or money",()=>fixture(async f=>{
    const namespace=`mv_migration_${randomUUID().replaceAll("-","")}`;
    await f.tx.execute(sql`CREATE SCHEMA ${sql.identifier(namespace)}`);
    const tables=["products","orders","order_line_items","wholesale_shares","wholesale_share_members"];
    for (const table of tables) {
      await f.tx.execute(sql`CREATE TABLE ${sql.identifier(namespace)}.${sql.identifier(table)} (
        id text PRIMARY KEY, marker text
      )`);
      await f.tx.execute(sql`INSERT INTO ${sql.identifier(namespace)}.${sql.identifier(table)} VALUES ('legacy','untouched')`);
    }
    await f.tx.execute(sql`ALTER TABLE ${sql.identifier(namespace)}.orders
      ADD COLUMN grand_total numeric(10,2) DEFAULT 123.45,
      ADD COLUMN payment_status text DEFAULT 'confirmed'`);
    await f.tx.execute(sql`SELECT set_config('search_path',${namespace},true)`);
    const file=readFileSync(new URL("../../../../../lib/db/drizzle/0021_multi_vendor_wholesale.sql",import.meta.url),"utf8");
    const statements=file.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean);
    for(let run=0;run<2;run++) for(const statement of statements) await f.tx.execute(sql.raw(statement));
    const columns=await f.tx.execute(sql`SELECT table_name,column_name,data_type,is_nullable,numeric_precision,numeric_scale
      FROM information_schema.columns WHERE table_schema=${namespace}
      AND column_name IN ('wholesale_vendor_id','wholesale_cost','vendor_id','vendor_shipping_breakdown','vendor_shipping_shares')`);
    expect(columns.rows).toHaveLength(6);
    expect(columns.rows.every((c:any)=>c.is_nullable==="YES")).toBe(true);
    expect(columns.rows.find((c:any)=>c.column_name==="wholesale_cost")).toMatchObject({data_type:"numeric",numeric_precision:10,numeric_scale:2});
    expect(columns.rows.filter((c:any)=>c.column_name.includes("shipping")).every((c:any)=>c.data_type==="jsonb")).toBe(true);
    for(const table of tables) {
      const rows=await f.tx.execute(sql`SELECT id,marker FROM ${sql.identifier(namespace)}.${sql.identifier(table)}`);
      expect(rows.rows).toEqual([{id:"legacy",marker:"untouched"}]);
    }
    const oldOrder=await f.tx.execute(sql`SELECT grand_total,payment_status,wholesale_vendor_id FROM ${sql.identifier(namespace)}.orders`);
    expect(oldOrder.rows).toEqual([{grand_total:"123.45",payment_status:"confirmed",wholesale_vendor_id:null}]);
  }));
  it("snapshots separate vendor shipping shares and line ownership when locking", () => fixture(async f => {
    const id=`LK${randomUUID().slice(0,7)}`;
    await f.tx.insert(store.wholesaleSharesTable).values({
      id,creatorUsername:f.member,deliveryUsername:f.member,vendorId:"vendor-a",status:"open",
      shippingName:"Fixture",shippingAddress:"Fixture road",shippingCountry:"United Kingdom",shippingPhone:"+441234",shippingEmail:"fixture@example.invalid",
    });
    await f.tx.insert(store.wholesaleShareMembersTable).values([
      {id:randomUUID(),shareId:id,username:f.member,isCreator:true,confirmedAt:new Date(),items:[{productId:"a",productName:"A",quantity:2,unitPrice:100,vendorId:"vendor-a",vendorName:"A"}]},
      {id:randomUUID(),shareId:id,username:f.other,confirmedAt:new Date(),items:[{productId:"b",productName:"B",quantity:1,unitPrice:200,vendorId:"vendor-b",vendorName:"B"}]},
    ]);
    const [share]=await f.tx.select().from(store.wholesaleSharesTable).where(eq(store.wholesaleSharesTable.id,id));
    const result=await lockShare(share,f.member,"manual");
    expect(result).toEqual({ok:true});
    const members=await f.tx.select().from(store.wholesaleShareMembersTable).where(eq(store.wholesaleShareMembersTable.shareId,id));
    expect(members.map((m:any)=>Number(m.shippingShare))).toEqual([50,50]);
    expect(members.every((m:any)=>m.vendorShippingShares.length===1)).toBe(true);
    const [locked]=await f.tx.select().from(store.wholesaleSharesTable).where(eq(store.wholesaleSharesTable.id,id));
    expect(Number(locked.totalVendorShipping)).toBe(100);
    expect(locked.vendorShippingBreakdown).toHaveLength(2);
    const orders=await f.tx.select().from(store.ordersTable).where(inArray(store.ordersTable.id,members.map((m:any)=>m.orderId)));
    expect(members.every((m:any)=>Number(orders.find((o:any)=>o.id===m.orderId).grandTotal)===250)).toBe(true);
    const lines=await f.tx.select().from(store.orderLineItemsTable).where(inArray(store.orderLineItemsTable.orderId,members.map((m:any)=>m.orderId)));
    expect(lines.some((l:any)=>l.vendorId==="vendor-b" && l.productId==="b")).toBe(true);
  }),60000);
  it("isolates mixed-vendor shared shipments, exports, photos and aggregate shipping status", () => fixture(async f => {
    const shareId = `MV${randomUUID().slice(0,7)}`;
    const secondName = `${f.name} second`;
    await f.tx.insert(store.fs3CostsTable).values({productName:secondName,unitCost:"30"});
    await f.tx.insert(store.wholesaleSharesTable).values({
      id:shareId,creatorUsername:f.member,deliveryUsername:f.member,vendorId:"vendor-a",
      status:"submitted",organiserPaymentStatus:"confirmed",shippingName:"Fixture recipient",
      shippingAddress:"Fixture Road",shippingCountry:"United Kingdom",shippingPhone:"+441234567890",shippingEmail:"fixture@example.invalid",
      vendorShippingBreakdown:[{vendorId:"vendor-a",vendorName:"A",kits:2,shipping:50},{vendorId:"vendor-b",vendorName:"B",kits:1,shipping:50}],
    });
    await f.tx.update(store.ordersTable).set({orderType:"wholesale_shared",sharedOrderId:shareId}).where(eq(store.ordersTable.id,f.orderId));
    await f.tx.insert(store.wholesaleShareMembersTable).values({id:randomUUID(),shareId,username:f.member,orderId:f.orderId});
    await f.tx.insert(store.orderLineItemsTable).values({
      id:randomUUID(),orderId:f.orderId,vendorId:"vendor-b",productId:secondName,productName:secondName,quantity:"1",unitPrice:"888",lineTotal:"888",
    });
    const exportA = await request("/admin/vendor-portal/export",undefined,{vendorId:"vendor-a",orderCodes:[f.code]},true);
    expect(exportA.status).toBe(200);
    expect(exportA.data.text).toContain("$40.00");
    expect(exportA.data.text).not.toContain(secondName);
    expect(exportA.data.text).not.toContain("999");
    const {row:a} = await submit(f);
    const previewB = await request("/admin/vendor-portal/preview",undefined,{vendorId:"vendor-b",orderCodes:[f.code]},true);
    expect(previewB.status).toBe(200);
    expect((await request("/admin/vendor-portal/submit",undefined,{vendorId:"vendor-b",orderCodes:[f.code],previewToken:previewB.data.previewToken},true)).status).toBe(200);
    const listB = await request("/vendor/orders",f.b);
    expect(listB.data.orders).toHaveLength(1);
    expect(JSON.stringify(listB.data)).not.toContain(f.name+'\"');
    const b=listB.data.orders[0];
    expect((await request(`/vendor/orders/${a.id}`,f.a,{action:"tracking",trackingNumber:"TESTA12345",carrier:"Fixture carrier"},false,"PATCH")).status).toBe(200);
    const [partlyShipped] = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id,f.orderId));
    expect(partlyShipped.status).toBe("Processing");
    expect(partlyShipped.trackingNumber).toBeNull();
    expect((await request(`/vendor/orders/${b.id}`,f.b,{action:"tracking",trackingNumber:"TESTB12345",carrier:"Fixture carrier"},false,"PATCH")).status).toBe(200);
    const [fullyShipped] = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id,f.orderId));
    expect(fullyShipped.status).toBe("Shipped");
    expect(Number(fullyShipped.grandTotal)).toBe(2048);
    const shipments = await request(`/account/orders/${f.orderId}/vendor-shipments`,f.member);
    expect(shipments.data.shipments).toHaveLength(2);
    expect(shipments.data.shipments.map((s:any)=>s.trackingNumber).sort()).toEqual(["TESTA12345","TESTB12345"]);
    expect((await request(`/account/orders/${f.orderId}/vendor-shipments`,f.other)).status).toBe(404);
  }));
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
    expect(result.status).toBe(400); expect(result.data.error).toContain("supplier cost");
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
    const [row] = await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `share:${shareId}:vendor:vendor-a`));
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

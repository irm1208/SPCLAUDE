import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
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
vi.mock("../../middleware/vendor-auth", () => ({
  vendorSameOrigin: (_req: any, _res: any, next: any) => next(),
  requireVendorAccount: (req: any, res: any, next: any) => {
    if (!req.get("x-test-user")) return res.status(401).json({ error: "Vendor sign-in required" });
    req.vendor = { username: req.get("x-test-user") }; next();
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
    id, name: id, legacyCatalogueVendor: `Legacy ${id}`, tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
    regions: [{ name: "UK", countries: ["United Kingdom"], prices: [50] }],
  })),
}));
vi.mock("../../lib/audit-log", () => ({writeLog:vi.fn(async()=>{})}));
vi.mock("../../lib/wholesale-share-chat", () => ({postWholesaleChatMessage:vi.fn(async()=>{})}));
vi.mock("../../lib/telegram", () => ({ notifyUser: vi.fn(async () => ({ ok: true })), sendAdminMessage: vi.fn(async () => true) }));
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
    app.use((await import("../vendor-accounts-admin")).default);
    app.use((await import("../vendor-portal-extras")).default);
    app.use((await import("../vendor-telegram")).default);
    app.use((await import("../vendor-threads")).default);
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
      await (await import("../../lib/vendor-account-schema")).ensureVendorAccountSchema(tx);
      const suffix = randomUUID().slice(0, 8);
      const a = `fixture-vendor-a-${suffix}`, b = `fixture-vendor-b-${suffix}`, member = `fixture-member-${suffix}`, other = `fixture-other-${suffix}`;
      await tx.insert(store.accountsTable).values([a, b, member, other].map(telegramUsername => ({ telegramUsername })));
      await tx.insert(store.vendorPortalAccessTable).values([
        { username: a, vendorId: "vendor-a", grantedBy: "fixture" },
        { username: b, vendorId: "vendor-b", grantedBy: "fixture" },
      ]);
      await tx.insert(store.vendorAccountsTable).values([
        { username: a, vendorId: "vendor-a", passwordHash: "fixture-only-not-used", status: "active" },
        { username: b, vendorId: "vendor-b", passwordHash: "fixture-only-not-used", status: "active" },
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
  it("previews and submits a paid order without an email address", () => fixture(async f => {
    await f.tx.update(store.ordersTable).set({ shippingEmail: null }).where(eq(store.ordersTable.id, f.orderId));
    const { preview, row } = await submit(f);
    expect(preview.shipments[0].shipping.email).toBe("");
    expect(row.snapshot.shipping.email).toBe("");
    const orders = await request("/vendor/orders", f.a);
    expect(orders.status).toBe(200);
  }));
  it("automatically submits a paid order without email once", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    await f.tx.update(store.ordersTable).set({ shippingEmail: null }).where(eq(store.ordersTable.id, f.orderId));
    const { pendingVendorRoutingPredicate } = await import("../../lib/vendor-portal-worker");
    const pending = () => f.tx.select({ id: store.ordersTable.id }).from(store.ordersTable).where(and(eq(store.ordersTable.id, f.orderId), pendingVendorRoutingPredicate()));
    expect(await pending()).toHaveLength(1);
    await autoSubmitPaidVendorOrder(f.orderId);
    await autoSubmitPaidVendorOrder(f.orderId);
    expect(await pending()).toHaveLength(0);
    const rows = await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `order:${f.orderId}`));
    expect(rows).toHaveLength(1);
    expect(rows[0].vendorId).toBe("vendor-a");
    expect(rows[0].snapshot.shipping.email).toBe("");
    expect(rows[0].submittedBy).toBe("system:paid-order");
    expect(rows[0].snapshot.items[0].unitCost).toBe("20.00");
  }), 60000);
  it("never automatically submits an unpaid order", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    await f.tx.update(store.ordersTable).set({ paymentStatus: "pending" }).where(eq(store.ordersTable.id, f.orderId));
    await expect(autoSubmitPaidVendorOrder(f.orderId)).rejects.toThrow(/fully paid/);
    expect(await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `order:${f.orderId}`))).toHaveLength(0);
  }), 60000);
  it("does not automatically resend an admin-recalled shipment", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    const { row } = await submit(f);
    expect((await request(`/admin/vendor-portal/orders/${row.id}`, undefined, undefined, true, "DELETE")).status).toBe(200);
    await autoSubmitPaidVendorOrder(f.orderId);
    expect(await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `order:${f.orderId}`))).toHaveLength(0);
    const { pendingVendorRoutingPredicate } = await import("../../lib/vendor-portal-worker");
    expect(await f.tx.select().from(store.ordersTable).where(and(eq(store.ordersTable.id, f.orderId), pendingVendorRoutingPredicate()))).toHaveLength(0);
  }), 60000);
  it("holds automatic routing while a balance remains unpaid", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    await f.tx.update(store.ordersTable).set({ amountDue: "10.00", balancePaymentStatus: "pending" }).where(eq(store.ordersTable.id, f.orderId));
    await expect(autoSubmitPaidVendorOrder(f.orderId)).rejects.toThrow(/fully paid/);
    expect(await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sourceKey, `order:${f.orderId}`))).toHaveLength(0);
  }), 60000);
  it("routes a ready shared-order vendor when another vendor lacks saved costs", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    const shareId = `AUTO${randomUUID().slice(0, 7)}`;
    const secondName = `${f.name} ready`;
    await f.tx.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.name));
    await f.tx.insert(store.fs3CostsTable).values({ productName: secondName, unitCost: "30" });
    await f.tx.insert(store.wholesaleSharesTable).values({
      id: shareId, creatorUsername: f.member, deliveryUsername: f.member, vendorId: "vendor-a",
      status: "submitted", organiserPaymentStatus: "confirmed", shippingName: "Fixture recipient",
      shippingAddress: "Fixture Road", shippingCountry: "United Kingdom", shippingPhone: "+441234567890",
    });
    await f.tx.update(store.ordersTable).set({ orderType: "wholesale_shared", sharedOrderId: shareId }).where(eq(store.ordersTable.id, f.orderId));
    await f.tx.insert(store.wholesaleShareMembersTable).values({ id: randomUUID(), shareId, username: f.member, orderId: f.orderId });
    await f.tx.insert(store.orderLineItemsTable).values({
      id: randomUUID(), orderId: f.orderId, vendorId: "vendor-b", productId: secondName,
      productName: secondName, quantity: "1", unitPrice: "888", lineTotal: "888",
    });
    await expect(autoSubmitPaidVendorOrder(f.orderId)).rejects.toThrow(/vendor-a/);
    const rows = await f.tx.select().from(store.vendorSubmissionsTable).where(eq(store.vendorSubmissionsTable.sharedOrderId, shareId));
    expect(rows).toHaveLength(1);
    expect(rows[0].vendorId).toBe("vendor-b");
    expect(rows[0].snapshot.shipping.email).toBe("");
  }), 60000);
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
    // Legacy lines use the share's vendor assignment when no line vendor was saved.
    await f.tx.update(store.orderLineItemsTable).set({ vendorId: null }).where(and(eq(store.orderLineItemsTable.orderId, f.orderId), eq(store.orderLineItemsTable.productName, f.name)));
    const {row:a} = await submit(f);
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    await autoSubmitPaidVendorOrder(f.orderId);
    await autoSubmitPaidVendorOrder(f.orderId);
    const { pendingVendorRoutingPredicate } = await import("../../lib/vendor-portal-worker");
    expect(await f.tx.select().from(store.ordersTable).where(and(eq(store.ordersTable.id, f.orderId), pendingVendorRoutingPredicate()))).toHaveLength(0);
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
  it("exports saved costs with case-variant names without changing calculated vendor shipping", () => fixture(async f => {
    await f.tx.update(store.fs3CostsTable).set({ productName: f.name.toLowerCase() }).where(eq(store.fs3CostsTable.productName, f.name));
    const result = await request("/admin/vendor-portal/export", undefined, { vendorId: "vendor-a", orderCodes: [f.code], format: "txt" }, true);
    expect(result.status).toBe(200);
    expect(result.data.text).toContain(f.name);
    expect(result.data.text).toContain("40.00");
    expect(result.data.text).toContain("50.00");
    expect(result.data.text).toContain("90.00");
    expect(result.data.text).not.toContain("1998");
    expect(result.data.text).toContain(`Order no. ${f.code} (@${f.member})\nNew Order 1:`);
    expect(result.data.text).toContain("Package: 1 x $50.00 = $50.00");
    expect(result.data.text).toContain("================================\n\nGrand total for all orders = Order 1 $90.00 = $90.00");
    expect(result.data.text).not.toContain("Email:");
    expect(result.data.text).not.toContain("fixture@example.invalid");
    expect(result.data.text).not.toContain("Vendor:");
    expect((await request("/vendor/orders", f.a)).data.orders).toEqual([]);
  }));

  it("downloads TXT without optional contact details, without submitting or changing the order", () => fixture(async f => {
    await f.tx.update(store.ordersTable).set({ shippingEmail: null, shippingPhone: null }).where(eq(store.ordersTable.id, f.orderId));
    const input = { vendorId: "vendor-a", orderCodes: [f.code], format: "txt" };
    expect((await request("/admin/vendor-portal/export", undefined, input)).status).toBe(403);
    const result = await request("/admin/vendor-portal/export", undefined, input, true);
    expect(result.status).toBe(200);
    expect(result.data.filename).toMatch(/\.txt$/);
    for (const text of [f.code, f.name, "Fixture Recipient", "Fixture Road", "Package: 1 x $50.00 = $50.00", "Grand Total: $90.00", "Phone: Not provided"]) {
      expect(result.data.text).toContain(text);
    }
    expect(result.data.text).not.toContain("Email:");
    expect(result.data.text).not.toContain("1998");
    expect((await request("/vendor/orders", f.a)).data.orders).toEqual([]);
    const [order] = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
    expect(order.status).toBe("Submitted");
    expect(order.paymentStatus).toBe("confirmed");
    expect(order.shippingEmail).toBeNull();
    expect((await request("/admin/vendor-portal/preview", undefined, input, true)).status).toBe(400);
  }));
  it.each(["order", "share", "legacy catalogue"])("uses reviewed matches when supplier identity comes from %s", source => fixture(async f => {
    const { fs3MatchKey } = await import("../../lib/fs3-cost-matches");
    const { loadFs3PricingContext } = await import("../../lib/fs3-pricing-context");
    const costName = `${f.name} supplier cost`;
    await f.tx.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.name));
    await f.tx.insert(store.fs3CostsTable).values({ productName: costName, unitCost: "35" });
    await f.tx.insert(store.siteConfigTable).values({
      key: fs3MatchKey("vendor-a", f.name),
      value: JSON.stringify({ productName: f.name, costName, vendorId: "vendor-a", active: true,
        reviewedBy: "fixture-admin", reviewedAt: new Date().toISOString(), reviewNote: "Confirmed supplier product" }),
    });
    await f.tx.update(store.orderLineItemsTable).set({ vendorId: null }).where(eq(store.orderLineItemsTable.orderId, f.orderId));
    if (source === "share") {
      const shareId = `alias-${randomUUID()}`;
      await f.tx.insert(store.wholesaleSharesTable).values({ id: shareId, creatorUsername: f.member, deliveryUsername: f.member,
        vendorId: "vendor-a", status: "submitted", organiserPaymentStatus: "confirmed",
        shippingName: "Fixture recipient", shippingAddress: "Fixture Road", shippingCountry: "United Kingdom",
        shippingPhone: "+441234567890", shippingEmail: "fixture@example.invalid" });
      await f.tx.update(store.ordersTable).set({ orderType: "wholesale_shared", sharedOrderId: shareId, wholesaleVendorId: null }).where(eq(store.ordersTable.id, f.orderId));
      await f.tx.insert(store.wholesaleShareMembersTable).values({ id: randomUUID(), shareId, username: f.member, orderId: f.orderId });
    } else if (source === "legacy catalogue") {
      await f.tx.update(store.ordersTable).set({ wholesaleVendorId: null }).where(eq(store.ordersTable.id, f.orderId));
      await f.tx.insert(store.productsTable).values({ id: f.name, name: f.name, vendor: "Legacy vendor-a", price: "999" });
    }
    const exported = await request("/admin/vendor-portal/export", undefined, { vendorId: "vendor-a", orderCodes: [f.code] }, true);
    expect(exported.status).toBe(200); expect(exported.data.text).toContain(`${f.name} x2 = $70.00`);
    const orders = await f.tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
    const lines = await f.tx.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, f.orderId));
    const pricing = await loadFs3PricingContext(orders, lines, f.tx);
    expect(pricing.vendorIdFor(lines[0])).toBe("vendor-a"); expect(pricing.unitCostFor(lines[0])).toBe(35);
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
  it("uses independent vendor accounts and retires member-based access grants", () => fixture(async f => {
    expect((await request("/vendor/apply", f.other, { companyName: "Legacy" })).status).toBe(410);
    expect((await request("/admin/vendor-portal/access", undefined, { username: f.other, vendorId: "vendor-a" }, true, "PUT")).status).toBe(410);
    expect((await request("/vendor/me", f.other)).status).toBe(403);
    await f.tx.update(store.accountsTable).set({ accountStatus: "suspended" }).where(eq(store.accountsTable.telegramUsername, f.a));
    expect((await request("/vendor/me", f.a)).status).toBe(200);
  }), 60000);
  it("admin creates independent vendor credentials, links orders and revokes sessions on access changes", () => fixture(async f => {
    const username = `vendoronly-${randomUUID().slice(0,8)}`;
    expect((await request("/admin/vendor-accounts", undefined, { username, password: "vendor-test-password123", vendorId: "vendor-a" }, false)).status).toBe(403);
    const created = await request("/admin/vendor-accounts", undefined, { username, password: "vendor-test-password123", vendorId: "vendor-a" }, true);
    expect(created.status).toBe(201);
    expect(created.data.account).toMatchObject({ username, vendorId: "vendor-a", status: "active" });
    expect(created.data.account).not.toHaveProperty("passwordHash");
    expect(await f.tx.select().from(store.accountsTable).where(eq(store.accountsTable.telegramUsername, username))).toHaveLength(0);
    await submit(f);
    expect((await request("/vendor/orders", username)).data.orders).toHaveLength(1);
    const tokenHash = `fixture-session-${username}`;
    await f.tx.insert(store.vendorSessionsTable).values({ username, tokenHash, expiresAt: new Date(Date.now() + 60000) });
    const updated = await request(`/admin/vendor-accounts/${username}`, undefined, { status: "disabled", vendorId: "vendor-a" }, true, "PUT");
    expect(updated.status).toBe(200);
    expect(await f.tx.select().from(store.vendorSessionsTable).where(eq(store.vendorSessionsTable.username, username))).toHaveLength(0);
    expect((await request("/vendor/orders", username)).status).toBe(403);
    const reassigned = await request(`/admin/vendor-accounts/${username}`, undefined, { status: "active", vendorId: "vendor-b", password: "new-vendor-password123" }, true, "PUT");
    expect(reassigned.status).toBe(200);
    const { vendorAccess } = await import("../../lib/vendor-portal-service");
    await expect(vendorAccess(f.tx, username, true, tokenHash)).rejects.toThrow(/session expired or revoked/);
    expect((await request("/vendor/orders", username)).data.orders).toHaveLength(0);
  }), 60000);
  it("links a Telegram chat with a one-time code and announces new shipments to it exactly once", () => fixture(async f => {
    const tg = await import("../../lib/vendor-telegram");
    const sent: Array<{ method: string; payload: any }> = [];
    tg.setVendorTelegramTransport(async (method, payload) => { sent.push({ method, payload }); return method === "getMe" ? { ok: true, result: { username: "PepsVendorBot" } } : { ok: true, result: { message_id: sent.length } }; });
    const previousToken = process.env.VENDOR_TELEGRAM_BOT_TOKEN; process.env.VENDOR_TELEGRAM_BOT_TOKEN = "123:fixture";
    const secret = tg.vendorWebhookSecret("123:fixture");
    const webhook = (body: unknown, header = secret) => fetch(base + "/vendor-telegram/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-bot-api-secret-token": header }, body: JSON.stringify(body) });
    // The webhook acknowledges before doing database work, so wait for the bot's reply rather than a fixed delay.
    const replied = async (before: number) => { const start = Date.now(); while (sent.length <= before && Date.now() - start < 15_000) await new Promise(r => setTimeout(r, 50)); };
    try {
      expect((await request("/vendor/telegram/link", undefined, {})).status).toBe(401);
      const link = await request("/vendor/telegram/link", f.a, {});
      expect(link.status).toBe(200); expect(link.data.url).toBe(`https://t.me/PepsVendorBot?start=${link.data.token}`);
      // Wrong secret is refused; a bad code is answered politely; the right code links the chat.
      expect((await webhook({ message: { chat: { id: 555 }, text: `/start ${link.data.token}` } }, "nope")).status).toBe(401);
      let before = sent.length;
      expect((await webhook({ message: { chat: { id: 555, type: "group", title: "Fixture packing team" }, text: "/start wrongcode" } })).status).toBe(200);
      await replied(before);
      expect(sent.at(-1)?.payload.text).toContain("expired");
      before = sent.length;
      expect((await webhook({ message: { chat: { id: 555, type: "group", title: "Fixture packing team" }, text: `/start ${link.data.token}` } })).status).toBe(200);
      await replied(before);
      expect(sent.at(-1)?.payload).toMatchObject({ chat_id: "555" }); expect(sent.at(-1)?.payload.text).toContain("Linked to <b>vendor-a</b>");
      const mine = await request("/vendor/telegram", f.a);
      expect(mine.data.chats).toHaveLength(1); expect(mine.data.chats[0]).toMatchObject({ chatId: "555", title: "Fixture packing team", linkedBy: f.a });
      expect((await request("/vendor/telegram", f.b)).data.chats).toHaveLength(0);
      // A code cannot be reused.
      before = sent.length;
      expect((await webhook({ message: { chat: { id: 556 }, text: `/start ${link.data.token}` } })).status).toBe(200);
      await replied(before);
      expect(sent.at(-1)?.payload.chat_id).toBe("556"); expect(sent.at(-1)?.payload.text).toContain("expired");
      // New shipment -> one announcement; a second pass sends nothing more.
      const { row } = await submit(f);
      sent.length = 0;
      await tg.notifyVendorEvents(new Date(), { vendorIds: ["vendor-a", "vendor-b"] });
      const announced = sent.filter(s => s.method === "sendMessage" && s.payload.chat_id === "555");
      expect(announced).toHaveLength(1); expect(announced[0].payload.text).toContain(`#${row.reference}`); expect(announced[0].payload.text).not.toContain("Fixture Recipient");
      await tg.notifyVendorEvents(new Date(), { vendorIds: ["vendor-a", "vendor-b"] });
      expect(sent.filter(s => s.method === "sendMessage" && s.payload.chat_id === "555")).toHaveLength(1);
      // Overdue reminder once the order is old enough, honouring a muted preference.
      const chatRowId = mine.data.chats[0].id;
      expect((await request(`/vendor/telegram/chats/${chatRowId}/prefs`, f.b, { overdue: false }, false, "PUT")).status).toBe(404);
      const muted = await request(`/vendor/telegram/chats/${chatRowId}/prefs`, f.a, { overdue: false }, false, "PUT");
      expect(muted.data.chat.prefs).toEqual({ overdue: false });
      sent.length = 0;
      await tg.notifyVendorEvents(new Date(Date.now() + 3 * 86_400_000), { vendorIds: ["vendor-a", "vendor-b"] });
      expect(sent.filter(s => s.method === "sendMessage" && s.payload.chat_id === "555")).toHaveLength(0);
      expect(await f.tx.select().from(store.vendorTelegramEventsTable).where(and(eq(store.vendorTelegramEventsTable.submissionId, row.id), eq(store.vendorTelegramEventsTable.kind, "overdue")))).toHaveLength(1);
      // /orders summary and disconnecting.
      sent.length = 0;
      await webhook({ message: { chat: { id: 555 }, text: "/orders@PepsVendorBot" } });
      await replied(0);
      expect(sent.at(-1)?.payload.text).toContain("open shipment"); expect(sent.at(-1)?.payload.text).toContain(`#${row.reference}`);
      const adminList = await request("/admin/vendor-telegram", undefined, undefined, true);
      expect(adminList.status).toBe(200); expect(adminList.data.configured).toBe(true);
      expect(adminList.data.chats.find((c: any) => c.chatId === "555")).toMatchObject({ vendorId: "vendor-a", vendorName: "vendor-a" });
      expect((await request(`/vendor/telegram/chats/${chatRowId}`, f.a, undefined, false, "DELETE")).status).toBe(200);
      expect((await request("/vendor/telegram", f.a)).data.chats).toHaveLength(0);
      before = sent.length;
      await webhook({ message: { chat: { id: 555 }, text: "/orders" } });
      await replied(before);
      expect(sent.at(-1)?.payload.text).toContain("not linked");
    } finally {
      tg.setVendorTelegramTransport(null);
      if (previousToken === undefined) delete process.env.VENDOR_TELEGRAM_BOT_TOKEN; else process.env.VENDOR_TELEGRAM_BOT_TOKEN = previousToken;
    }
  }));

  it("carries a conversation between a vendor and Admin, mirrors Admin replies to Telegram and routes Telegram replies back", () => fixture(async f => {
    const tg = await import("../../lib/vendor-telegram");
    const sent: Array<{ method: string; payload: any }> = [];
    let nextMessageId = 100;
    tg.setVendorTelegramTransport(async (method, payload) => { sent.push({ method, payload }); return method === "getMe" ? { ok: true, result: { username: "PepsVendorBot" } } : { ok: true, result: { message_id: ++nextMessageId } }; });
    const previousToken = process.env.VENDOR_TELEGRAM_BOT_TOKEN; process.env.VENDOR_TELEGRAM_BOT_TOKEN = "123:fixture";
    const secret = tg.vendorWebhookSecret("123:fixture");
    const webhook = (body: unknown) => fetch(base + "/vendor-telegram/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-bot-api-secret-token": secret }, body: JSON.stringify(body) });
    const replied = async (before: number) => { const start = Date.now(); while (sent.length <= before && Date.now() - start < 15_000) await new Promise(r => setTimeout(r, 50)); };
    try {
      const { row } = await submit(f);
      // Vendor opens a thread about its order; the other vendor cannot reference that order.
      expect((await request("/vendor/threads", undefined, { subject: "Stock", body: "hi" })).status).toBe(401);
      expect((await request("/vendor/threads", f.b, { subject: "Not mine", body: "hi", submissionId: row.id })).status).toBe(404);
      expect((await request("/vendor/threads", f.a, { subject: "S", body: "hi" })).status).toBe(400);
      const opened = await request("/vendor/threads", f.a, { subject: "Only 1 of 2 in stock", body: "Can we ship one now?", submissionId: row.id });
      expect(opened.status).toBe(201);
      expect(opened.data.thread).toMatchObject({ status: "open", openedBy: "vendor", reference: row.reference, adminUnread: 1, vendorUnread: 0 });
      const threadId = opened.data.thread.id;
      // Admin sees it as unread, reads it, replies; vendor's unread count rises and the reply is mirrored to the linked chat.
      const adminList = await request("/admin/vendor-threads?status=open", undefined, undefined, true);
      expect(adminList.data.threads.find((t: any) => t.id === threadId)).toMatchObject({ vendorName: "vendor-a", adminUnread: 1 });
      const adminView = await request(`/admin/vendor-threads/${threadId}`, undefined, undefined, true);
      expect(adminView.data.messages).toHaveLength(1); expect(adminView.data.messages[0]).toMatchObject({ authorRole: "vendor", body: "Can we ship one now?" });
      expect((await request(`/admin/vendor-threads/${threadId}`, undefined, undefined, true)).data.thread.adminUnread).toBe(0);
      const link = await request("/vendor/telegram/link", f.a, {});
      let before = sent.length;
      await webhook({ message: { chat: { id: 777, type: "private", first_name: "Pat" }, text: `/start ${link.data.token}` } });
      await replied(before);
      sent.length = 0;
      const reply = await request(`/admin/vendor-threads/${threadId}/messages`, undefined, { body: "Yes, ship the one you have; we will refund the other." }, true);
      expect(reply.status).toBe(201); expect(reply.data.telegramDelivered).toBe(1);
      const mirrored = sent.find(s => s.method === "sendMessage" && s.payload.chat_id === "777");
      expect(mirrored?.payload.text).toContain("ship the one you have"); expect(mirrored?.payload.text).toContain("Only 1 of 2 in stock");
      const mine = await request("/vendor/threads", f.a);
      expect(mine.data.unread).toBe(1); expect(mine.data.threads[0]).toMatchObject({ id: threadId, vendorUnread: 1 });
      expect((await request("/vendor/threads", f.b)).data.threads).toHaveLength(0);
      expect((await request(`/vendor/threads/${threadId}`, f.b)).status).toBe(404);
      const read = await request(`/vendor/threads/${threadId}`, f.a);
      expect(read.data.messages).toHaveLength(2); expect(read.data.messages[1]).toMatchObject({ authorRole: "admin", body: "Yes, ship the one you have; we will refund the other." });
      expect((await request("/vendor/threads", f.a)).data.unread).toBe(0);
      // A native Telegram reply to the mirrored message lands in the thread as a vendor message.
      before = sent.length;
      await webhook({ message: { message_id: 5000, chat: { id: 777, type: "private" }, from: { username: "pat_packs", first_name: "Pat" }, reply_to_message: { message_id: mirrored!.payload && nextMessageId }, text: "Will do, shipping today." } });
      await replied(before);
      const afterReply = await request(`/admin/vendor-threads/${threadId}`, undefined, undefined, true);
      expect(afterReply.data.messages.at(-1)).toMatchObject({ authorRole: "vendor", authorName: "@pat_packs (Telegram)", body: "Will do, shipping today.", via: "telegram" });
      expect(sent.at(-1)?.payload.text).toContain("Sent to Peps Anonymous");
      // Closing blocks admin replies but a vendor message reopens it.
      expect((await request(`/admin/vendor-threads/${threadId}/status`, undefined, { status: "closed" }, true, "PUT")).data.thread.status).toBe("closed");
      expect((await request(`/admin/vendor-threads/${threadId}/messages`, undefined, { body: "late" }, true)).status).toBe(409);
      expect((await request(`/vendor/threads/${threadId}/messages`, f.a, { body: "One more thing" })).status).toBe(201);
      // Reading a thread clears its unread counter, so check the list rather than the detail view.
      expect((await request("/admin/vendor-threads?status=open", undefined, undefined, true)).data.threads.find((t: any) => t.id === threadId)).toMatchObject({ status: "open", adminUnread: 1 });
      // Admin can start a conversation too; it arrives unread for the vendor and is mirrored.
      sent.length = 0;
      const started = await request("/admin/vendor-threads", undefined, { vendorId: "vendor-a", subject: "Holiday cover", body: "Who covers next week?" }, true);
      expect(started.status).toBe(201); expect(started.data.thread).toMatchObject({ openedBy: "admin", vendorUnread: 1 }); expect(started.data.telegramDelivered).toBe(1);
      expect((await request("/vendor/threads", f.a)).data.unread).toBe(1);
      expect((await request("/admin/vendor-threads", undefined, { vendorId: "vendor-zzz", subject: "Nope", body: "x" }, true)).status).toBe(404);
    } finally {
      tg.setVendorTelegramTransport(null);
      if (previousToken === undefined) delete process.env.VENDOR_TELEGRAM_BOT_TOKEN; else process.env.VENDOR_TELEGRAM_BOT_TOKEN = previousToken;
    }
  }));

  it("holiday mode pauses automatic routing until the vendor reopens, and Admin can see and override it", () => fixture(async f => {
    const { autoSubmitPaidVendorOrder } = await import("../../lib/vendor-portal-service");
    const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
    expect((await request("/vendor/settings")).status).toBe(401);
    const initial = await request("/vendor/settings", f.a);
    expect(initial.status).toBe(200); expect(initial.data.settings).toMatchObject({ vendorId: "vendor-a", closedNow: false, closedUntil: null });
    expect((await request("/vendor/settings", f.a, { closedUntil: days(-1) }, false, "PUT")).status).toBe(400);
    const closed = await request("/vendor/settings", f.a, { closedUntil: days(3), closedNote: "Stocktake", handlingDays: 2, defaultCarrier: "DPD" }, false, "PUT");
    expect(closed.status).toBe(200); expect(closed.data.settings).toMatchObject({ closedNow: true, closedNote: "Stocktake", handlingDays: 2, defaultCarrier: "DPD" });
    // Paid order for a closed vendor is left alone without being reported as a failure.
    await autoSubmitPaidVendorOrder(f.orderId);
    expect(await f.tx.select().from(store.vendorSubmissionsTable).where(sql`${store.vendorSubmissionsTable.orderIds} @> ${JSON.stringify([f.orderId])}::jsonb`)).toHaveLength(0);
    const adminView = await request("/admin/vendor-portal/issues", undefined, undefined, true);
    expect(adminView.status).toBe(200);
    expect(adminView.data.settings.find((v: any) => v.vendorId === "vendor-a")).toMatchObject({ closedNow: true, vendorName: "vendor-a" });
    // Reopening (no end date) resumes routing on the next pass.
    const reopened = await request("/vendor/settings", f.a, { handlingDays: 2 }, false, "PUT");
    expect(reopened.data.settings).toMatchObject({ closedNow: false, closedUntil: null, handlingDays: 2 });
    await autoSubmitPaidVendorOrder(f.orderId);
    expect(await f.tx.select().from(store.vendorSubmissionsTable).where(sql`${store.vendorSubmissionsTable.orderIds} @> ${JSON.stringify([f.orderId])}::jsonb`)).toHaveLength(1);
    // Admin can close a vendor too; unknown vendors and non-admins are refused.
    expect((await request("/admin/vendor-portal/settings/vendor-b", undefined, { closedUntil: days(1) }, false, "PUT")).status).toBe(403);
    expect((await request("/admin/vendor-portal/settings/vendor-zzz", undefined, { closedUntil: days(1) }, true, "PUT")).status).toBe(404);
    const adminClose = await request("/admin/vendor-portal/settings/vendor-b", undefined, { closedUntil: days(1) }, true, "PUT");
    expect(adminClose.status).toBe(200); expect(adminClose.data.settings.closedNow).toBe(true);
    expect((await request("/vendor/settings", f.b)).data.settings.closedNow).toBe(true);
    const audit = await f.tx.select().from(store.vendorAuditTable).where(and(eq(store.vendorAuditTable.action, "settings_updated"), eq(store.vendorAuditTable.actor, f.a)));
    expect(audit).toHaveLength(2);
  }));

  it("lets a vendor report a problem on its own order once, and Admin resolve it with a note the vendor can read", () => fixture(async f => {
    const { row } = await submit(f);
    const path = `/vendor/orders/${row.id}/issues`;
    expect((await request(path, undefined, { type: "out_of_stock" })).status).toBe(401);
    expect((await request(path, f.b, { type: "out_of_stock" })).status).toBe(404);
    expect((await request(path, f.a, { type: "other" })).status).toBe(400);
    expect((await request(path, f.a, { type: "nope" })).status).toBe(400);
    const reported = await request(path, f.a, { type: "partial_stock", note: "Only 1 of 2 in stock" });
    expect(reported.status).toBe(201);
    expect(reported.data.issue).toMatchObject({ type: "partial_stock", label: "Only part of the order is in stock", note: "Only 1 of 2 in stock", open: true, reference: row.reference, reportedBy: f.a });
    expect((await request(path, f.a, { type: "out_of_stock" })).status).toBe(409);
    const mine = await request("/vendor/issues", f.a);
    expect(mine.status).toBe(200); expect(mine.data.issues).toHaveLength(1); expect(mine.data.issues[0].submissionId).toBe(row.id);
    expect((await request("/vendor/issues", f.b)).data.issues).toHaveLength(0);
    const list = await request("/admin/vendor-portal/issues", undefined, undefined, true);
    const issue = list.data.issues.find((i: any) => i.id === reported.data.issue.id);
    expect(issue).toMatchObject({ open: true, vendorId: "vendor-a", reference: row.reference });
    const resolvePath = `/admin/vendor-portal/issues/${issue.id}/resolve`;
    expect((await request(resolvePath, undefined, { resolution: "x" }, false)).status).toBe(403);
    const resolved = await request(resolvePath, undefined, { resolution: "Ship the one in stock; we refunded the other." }, true);
    expect(resolved.status).toBe(200); expect(resolved.data.issue).toMatchObject({ open: false, resolvedBy: "test-admin", resolution: "Ship the one in stock; we refunded the other." });
    expect((await request(resolvePath, undefined, { resolution: "again" }, true)).status).toBe(409);
    expect((await request(`/admin/vendor-portal/issues/not-an-id/resolve`, undefined, {}, true)).status).toBe(404);
    const after = await request("/vendor/issues", f.a);
    expect(after.data.issues[0]).toMatchObject({ open: false, resolution: "Ship the one in stock; we refunded the other." });
    // Once resolved, a new problem can be raised on the same order.
    expect((await request(path, f.a, { type: "damaged", note: "Returned by courier" })).status).toBe(201);
    const audit = await f.tx.select().from(store.vendorAuditTable).where(and(eq(store.vendorAuditTable.submissionId, row.id), inArray(store.vendorAuditTable.action, ["issue_reported", "issue_resolved"])));
    expect(audit).toHaveLength(3);
  }));

  it("blocks another vendor's IDs, tampered price writes, suspension and immediate revocation", () => fixture(async f => {
    const { row } = await submit(f);
    expect((await request(`/vendor/orders/${row.id}`, f.b, { action: "processing" }, false, "PATCH")).status).toBe(404);
    expect((await request(`/vendor/orders/${row.id}`, f.a, { action: "processing", grandTotal: 0 }, false, "PATCH")).status).toBe(400);
    await f.tx.update(store.vendorAccountsTable).set({ status: "disabled" }).where(eq(store.vendorAccountsTable.username, f.a));
    expect((await request("/vendor/orders", f.a)).status).toBe(403);
    await f.tx.update(store.vendorAccountsTable).set({ status: "active" }).where(eq(store.vendorAccountsTable.username, f.a));
    await f.tx.update(store.vendorAccountsTable).set({ vendorId: null, status: "pending" }).where(eq(store.vendorAccountsTable.username, f.a));
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

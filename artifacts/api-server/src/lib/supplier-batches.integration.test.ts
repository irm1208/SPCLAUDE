import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
vi.mock("./telegram", () => ({ notifyUserFull: vi.fn(async () => ({ok:true})) }));

// Only synthetic, isolated fixtures; never mutate a real member's orders.
describe.skipIf(process.env.SUPPLIER_BATCH_DB_TESTS !== "1")("regional supplier batches / PostgreSQL transactions", () => {
  let store: any, api: any, protect: any;
  const fixtures: string[] = [];
  const admin = { username: "synthetic-admin", admin: true };
  beforeAll(async () => {
    store = await import("@workspace/db");
    api = await import("./supplier-batches");
    protect = await import("./supplier-batch-protection");
  });
  afterEach(async () => {
    for (const id of fixtures.splice(0)) {
      await store.db.transaction(async (tx: any) => {
        await tx.delete(store.telegramMessageLogsTable).where(sql`${store.telegramMessageLogsTable.eventKey} IN
          (SELECT 'supplier-ready:' || id FROM gb_supplier_events WHERE group_buy_id = ${id})`);
        await tx.delete(store.auditLogsTable).where(sql`${store.auditLogsTable.metadata}->>'groupBuyId' = ${id}`);
        await tx.delete(store.gbSupplierAllocationsTable).where(sql`${store.gbSupplierAllocationsTable.batchId} IN
          (SELECT id FROM gb_supplier_batches WHERE group_buy_id = ${id})`);
        await tx.delete(store.ordersTable).where(eq(store.ordersTable.groupBuyId, id));
        await tx.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, id));
      });
    }
  });
  async function fixture(qtys = [95, 10, 20]) {
    const id = randomUUID(); fixtures.push(id);
    await store.db.insert(store.groupBuysTable).values({ id, name: "Synthetic regional batching test", status: "draft", currency: "USD", organiserId: "synthetic-organiser", organiserCanEditStatus: true });
    const ids: string[] = [];
    for (let k = 0; k < qtys.length; k++) {
      const oid = randomUUID(); ids.push(oid);
      await store.db.insert(store.ordersTable).values({
        id: oid, code: `test-${k}`, telegramUsername: `synthetic-${k}`, deliveryMethod: "Synthetic",
        productSubtotal: String(qtys[k] * 10), grandTotal: String(qtys[k] * 10),
        groupBuyId: id, shippingCountry: "Italy", paymentStatus: "confirmed", paymentConfirmedAt: new Date(2026, 0, 1 + k),
      });
      await store.db.insert(store.orderLineItemsTable).values({
        id: randomUUID(), orderId: oid, productId: "synthetic-product", productName: "Synthetic product",
        quantity: String(qtys[k]), unitPrice: "10", lineTotal: String(qtys[k] * 10),
      });
    }
    const result = await api.saveSupplierConfig(id, admin, {expectedVersion: 0, config: {enabled:true,telegramAlerts:false,regions:[{id:"eu",name:"EU",countries:["IT","DE"],targetKits:100}]}});
    return {id, ids, result};
  }
  it("reserves only a whole-order prefix, survives two concurrent confirmations, and starts the next queue", async () => {
    const f = await fixture();
    const p = f.result.proposals[0];
    expect(p.kits).toBe(105); expect(p.remainingKits).toBe(20);
    const results = await Promise.all([1,2].map(() => api.confirmSupplierBatch(f.id, admin, {regionId:"eu",token:p.token})));
    expect(results[0].batches).toHaveLength(1); expect(results[1].batches).toHaveLength(1);
    expect(results[0].batches[0].snapshot.orders.map((o: any) => o.id)).toEqual(f.ids.slice(0,2));
    expect(results[1].proposals[0].queuedKits).toBe(20);
    const rows = await store.db.select().from(store.gbSupplierAllocationsTable).where(inArray(store.gbSupplierAllocationsTable.orderId, f.ids));
    expect(rows).toHaveLength(2);
    await expect(protect.assertSupplierOrderEditable(store.db, [f.ids[0]])).rejects.toThrow(/Release the unsent batch/);
  });
  it("atomically marks only batch members Processing; payment fields and next queue stay unchanged; retry is idempotent", async () => {
    const f = await fixture();
    const prepared = await api.confirmSupplierBatch(f.id, admin, {regionId:"eu",token:f.result.proposals[0].token});
    const b = prepared.batches[0];
    const before = await store.db.select().from(store.ordersTable).where(inArray(store.ordersTable.id,f.ids));
    await Promise.all([1,2].map(() => api.orderSupplierBatch(f.id,b.id,admin,{confirm:true})));
    const after = await store.db.select().from(store.ordersTable).where(inArray(store.ordersTable.id,f.ids));
    for (const old of before) {
      const next = after.find((o:any)=>o.id===old.id);
      expect(next.status).toBe(old.id===f.ids[2]?"Submitted":"Processing");
      expect([next.grandTotal,next.paymentStatus,next.amountDue,next.paymentConfirmedAt]).toEqual([old.grandTotal,old.paymentStatus,old.amountDue,old.paymentConfirmedAt]);
    }
    const audits = await store.db.select().from(store.gbSupplierEventsTable).where(and(eq(store.gbSupplierEventsTable.groupBuyId,f.id),eq(store.gbSupplierEventsTable.kind,"ordered")));
    expect(audits).toHaveLength(1);
    await expect(api.releaseSupplierBatch(f.id,b.id,admin,{confirm:true,reason:"no"})).rejects.toThrow(/cannot be released/);
    const exported = await api.exportSupplierBatch(f.id,b.id,admin);
    expect(exported.csv).toContain("105");
  });
  it("rejects stale previews and stale settings without allocating anything", async () => {
    const f = await fixture();
    await store.db.update(store.ordersTable).set({amountDue:"1"}).where(eq(store.ordersTable.id,f.ids[0]));
    await expect(api.confirmSupplierBatch(f.id,admin,{regionId:"eu",token:f.result.proposals[0].token})).rejects.toThrow(/preview changed/);
    await expect(api.saveSupplierConfig(f.id,admin,{expectedVersion:0,config:f.result.config})).rejects.toThrow(/another session/);
    expect((await api.supplierData(f.id,admin)).batches).toHaveLength(0);
  });
  it("blocks send/export on a payment exception and rolls back supplier placement", async () => {
    const f = await fixture();
    const prepared = await api.confirmSupplierBatch(f.id,admin,{regionId:"eu",token:f.result.proposals[0].token});
    const b=prepared.batches[0];
    await store.db.update(store.ordersTable).set({amountDue:"5"}).where(eq(store.ordersTable.id,f.ids[0]));
    const state = await api.supplierData(f.id,admin);
    expect(state.batches[0].exceptions[0].reason).toMatch(/balance/);
    await expect(api.orderSupplierBatch(f.id,b.id,admin,{confirm:true})).rejects.toThrow(/exceptions/);
    await expect(api.exportSupplierBatch(f.id,b.id,admin)).rejects.toThrow(/blocked/);
    const [stored]=await store.db.select().from(store.gbSupplierBatchesTable).where(eq(store.gbSupplierBatchesTable.id,b.id));
    expect(stored.state).toBe("prepared"); expect(stored.orderedAt).toBeNull();
    const orders=await store.db.select().from(store.ordersTable).where(inArray(store.ordersTable.id,f.ids));
    expect(orders.every((o:any)=>o.status==="Submitted")).toBe(true);
  });
  it("flags cancelled, moved or modified orders; releases unsent snapshots without erasing history", async () => {
    const f = await fixture();
    const prepared=await api.confirmSupplierBatch(f.id,admin,{regionId:"eu",token:f.result.proposals[0].token});
    const b=prepared.batches[0];
    await store.db.update(store.ordersTable).set({status:"Cancelled"}).where(eq(store.ordersTable.id,f.ids[0]));
    expect((await api.supplierData(f.id,admin)).batches[0].exceptions[0].reason).toMatch(/Cancelled/);
    const released=await api.releaseSupplierBatch(f.id,b.id,admin,{confirm:true,reason:"Member cancelled before purchase"});
    expect(released.batches[0].state).toBe("released");
    expect(released.batches[0].snapshot.kits).toBe(105);
    await protect.assertSupplierOrderEditable(store.db,[f.ids[1]]);
    expect(released.proposals[0].queuedKits).toBe(30);
  });
  it("uses order destination, excludes tests/balances/history/OOS, and requires an explicit historical timestamp review", async () => {
    const f=await fixture([100,100,100]);
    await store.db.update(store.ordersTable).set({paymentStatus:"test_confirmed"}).where(eq(store.ordersTable.id,f.ids[0]));
    await store.db.update(store.ordersTable).set({status:"Processing"}).where(eq(store.ordersTable.id,f.ids[1]));
    await store.db.update(store.ordersTable).set({paymentConfirmedAt:null,shippingCountry:"UK"}).where(eq(store.ordersTable.id,f.ids[2]));
    let s=await api.saveSupplierConfig(f.id,admin,{expectedVersion:1,config:{...f.result.config,regions:[{id:"uk",name:"UK",countries:["GB"],targetKits:100}]}});
    expect(s.proposals[0].queuedKits).toBe(0);
    expect(s.review.find((r:any)=>r.id===f.ids[2]).canReviewHistorical).toBe(true);
    s=await api.reviewHistoricalSupplierOrder(f.id,f.ids[2],admin,{confirm:true});
    expect(s.proposals[0].kits).toBe(100);
    expect(s.proposals[0].orders[0]).toMatchObject({paidAt:null,historicalReviewed:true,country:"GB"});
    expect(s.proposals[0].orders[0].orderingAt).toBeTruthy();
    expect(s.review.some((r:any)=>r.id===f.ids[1])).toBe(false);
  });
  it("persists a single readiness event and timestamp across reads/reconciliation without sending member messages", async () => {
    const f=await fixture();
    await api.reconcileSupplierGroup(f.id); await api.reconcileSupplierGroup(f.id);
    const s=await api.supplierData(f.id,admin);
    expect(s.proposals[0].readyAt).toBe(f.result.proposals[0].readyAt);
    expect(s.events.filter((e:any)=>e.kind==="ready")).toHaveLength(1);
    expect(s.events.find((e:any)=>e.kind==="ready").recipient).toBe("synthetic-organiser");
    const logs=await store.db.select().from(store.telegramMessageLogsTable).where(eq(store.telegramMessageLogsTable.eventKey,`supplier-ready:${s.events.find((e:any)=>e.kind==="ready").id}`));
    expect(logs).toHaveLength(1);
    expect(logs[0].recipientUsername).toBe("synthetic-organiser");
  });
  it("enforces organiser ownership and admin-scoped sessions", async () => {
    const f=await fixture();
    await expect(api.supplierData(f.id,{username:"someone-else"})).rejects.toMatchObject({status:403});
    await expect(api.supplierData(f.id,{...admin,adminGbId:"other"})).rejects.toMatchObject({status:403});
    expect((await api.supplierData(f.id,{username:"@synthetic-organiser"})).groupBuy.id).toBe(f.id);
  });
  it("leases private readiness alerts across two workers without duplicate website or Telegram delivery", async () => {
    const f=await fixture();
    const event=f.result.events.find((e:any)=>e.kind==="ready");
    await store.db.update(store.gbSupplierEventsTable).set({telegram:"pending"}).where(eq(store.gbSupplierEventsTable.id,event.id));
    const {drainSupplierAlerts}=await import("./supplier-batch-worker");
    const {notifyUserFull}=await import("./telegram");
    vi.mocked(notifyUserFull).mockClear();
    await Promise.all([drainSupplierAlerts(),drainSupplierAlerts()]);
    expect(notifyUserFull).toHaveBeenCalledTimes(1);
    expect(notifyUserFull).toHaveBeenCalledWith("synthetic-organiser","status",expect.any(String),undefined,
      expect.objectContaining({websiteAlreadyRecorded:true,eventKey:`supplier-ready:${event.id}`}));
    const [stored]=await store.db.select().from(store.gbSupplierEventsTable).where(eq(store.gbSupplierEventsTable.id,event.id));
    expect(stored.telegram).toBe("delivered");
  });
  it("does not blindly resend an interrupted Telegram delivery", async () => {
    const f=await fixture(); const event=f.result.events.find((e:any)=>e.kind==="ready");
    await store.db.update(store.gbSupplierEventsTable).set({telegram:"sending",availableAt:new Date(0)}).where(eq(store.gbSupplierEventsTable.id,event.id));
    const {drainSupplierAlerts}=await import("./supplier-batch-worker");
    const {notifyUserFull}=await import("./telegram");
    vi.mocked(notifyUserFull).mockClear();
    await drainSupplierAlerts();
    expect(notifyUserFull).not.toHaveBeenCalled();
    const [stored]=await store.db.select().from(store.gbSupplierEventsTable).where(eq(store.gbSupplierEventsTable.id,event.id));
    expect(stored.telegram).toBe("delivery_uncertain");
  });
});

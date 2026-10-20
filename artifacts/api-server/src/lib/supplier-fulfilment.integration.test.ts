import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
vi.mock("./telegram", () => ({ notifyUserFull: vi.fn(async () => ({ ok: true })) }));

// Development only, synthetic records with explicit cleanup. Never a real member.
describe.skipIf(process.env.SUPPLIER_BATCH_DB_TESTS !== "1")("supplier shipment transactions", () => {
  let s: any, api: any, tracker: any, model: any;
  const groups: string[] = [], users: string[] = [];
  const admin = { username: "synthetic-admin", admin: true };
  beforeAll(async () => {
    s = await import("@workspace/db"); api = await import("./supplier-fulfilment");
    tracker = await import("./supplier-shipment-tracking"); model = await import("./supplier-batches-model");
  });
  afterAll(async () => {
    for (const id of groups) await s.db.transaction(async (tx: any) => {
      await tx.delete(s.gbSupplierShipmentsTable).where(sql`${s.gbSupplierShipmentsTable.batchId} IN (SELECT id FROM gb_supplier_batches WHERE group_buy_id = ${id})`);
      await tx.delete(s.gbSupplierAllocationsTable).where(sql`${s.gbSupplierAllocationsTable.batchId} IN (SELECT id FROM gb_supplier_batches WHERE group_buy_id = ${id})`);
      await tx.delete(s.auditLogsTable).where(sql`${s.auditLogsTable.metadata}->>'groupBuyId' = ${id}`);
      await tx.delete(s.ordersTable).where(eq(s.ordersTable.groupBuyId, id));
      await tx.delete(s.groupBuysTable).where(eq(s.groupBuysTable.id, id));
    });
    if (users.length) await s.db.delete(s.accountsTable).where(inArray(s.accountsTable.telegramUsername, users));
  });
  async function fixture() {
    const id = randomUUID(); groups.push(id);
    const reshippers = [0, 1].map(() => `synthetic-${randomUUID()}`); users.push(...reshippers);
    await s.db.insert(s.accountsTable).values(reshippers.map(telegramUsername => ({ telegramUsername, reshipperStatus: "approved" })));
    await s.db.insert(s.groupBuysTable).values({ id, name: "Synthetic supplier receipt test", status: "closed", currency: "USD", organiserId: "synthetic-organiser" });
    await s.db.insert(s.gbReshippersTable).values(reshippers.map(reshipperUsername => ({ id: randomUUID(), gbId: id, country: "IT", reshipperUsername })));
    const purchased: any[] = [], ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const oid = randomUUID(); ids.push(oid);
      const [order] = await s.db.insert(s.ordersTable).values({
        id: oid, code: `synthetic-${randomUUID()}`, telegramUsername: `synthetic-member-${i}`,
        deliveryMethod: "Synthetic", productSubtotal: "25", grandTotal: "25", groupBuyId: id,
        shippingCountry: "Italy", paymentStatus: "confirmed", status: "Processing", reshipperUsername: reshippers[i],
        paymentConfirmedAt: new Date("2026-01-01T00:00:00Z"),
      }).returning();
      const [line] = await s.db.insert(s.orderLineItemsTable).values({
        id: randomUUID(), orderId: oid, productId: "test-product", productName: "Synthetic product",
        quantity: "2.5", unitPrice: "10", lineTotal: "25",
      }).returning();
      purchased.push(model.snapshotOrder({ ...order, lineItems: [line] }));
    }
    const bid = randomUUID(), region = { id: "eu", name: "EU", countries: ["IT"], targetKits: 5 };
    await s.db.insert(s.gbSupplierBatchesTable).values({
      id: bid, groupBuyId: id, sequence: 1, reference: `Synthetic ${id}`, previewToken: randomUUID(), state: "ordered", createdBy: admin.username,
      orderedAt: new Date(), snapshot: { region, kits: 5, orders: purchased, products: [] },
    });
    await s.db.insert(s.gbSupplierAllocationsTable).values(ids.map(orderId => ({ orderId, batchId: bid })));
    const body = (which = 0, q = 2.5) => ({
      requestKey: randomUUID(), label: `Supplier package ${which}`, recipientUsername: reshippers[which], directOrderId: null,
      contents: [{ orderId: ids[which], productId: "test-product", quantity: q }], carrier: 0, trackingNumber: null,
    });
    return { id, bid, ids, reshippers, body };
  }
  it("supports two packages, partial/damaged receipt, replay-safe creation and unchanged member finance/status", async () => {
    const f = await fixture(), body = f.body(0, 1.5);
    const before = await s.db.select().from(s.ordersTable).where(inArray(s.ordersTable.id, f.ids));
    let d = await api.createSupplierShipment(f.id, f.bid, admin, body);
    expect(d.orders[0].exceptions).toEqual([]);
    expect((await api.createSupplierShipment(f.id, f.bid, admin, body)).shipments).toHaveLength(1);
    await expect(api.createSupplierShipment(f.id, f.bid, admin, { ...body, label: "different" })).rejects.toThrow(/request key/);
    d = await api.createSupplierShipment(f.id, f.bid, admin, f.body(0, 1));
    const p = d.shipments[0];
    d = await api.changeSupplierShipment(f.id, f.bid, p.id, { username: f.reshippers[0], reshipper: true }, "receive", {
      expectedVersion: p.version, receipt: [{ orderId: f.ids[0], productId: "test-product", good: 1, damaged: 0.5 }], notes: "Half a kit damaged",
    });
    expect(d.orders[0].ready).toBe(false);
    expect(d.batch.receivedKits).toBe(1);
    expect(d.batch.damagedKits).toBe(0.5);
    await expect(api.changeSupplierShipment(f.id, f.bid, p.id, admin, "cancel", { expectedVersion: 1, reason: "Would lose received stock" })).rejects.toThrow(/inspected/);
    const after = await s.db.select().from(s.ordersTable).where(inArray(s.ordersTable.id, f.ids));
    expect(after).toEqual(before);
  });
  it("serializes overlapping staff allocations and receipt corrections", async () => {
    const f = await fixture();
    const allocations = await Promise.allSettled([1, 2].map(() => api.createSupplierShipment(f.id, f.bid, admin, f.body())));
    expect(allocations.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const d = await api.supplierFulfilmentDetail(f.id, f.bid, admin), p = d.shipments[0];
    const writes = await Promise.allSettled([1, 2].map(good => api.changeSupplierShipment(f.id, f.bid, p.id, admin, "receive", {
      expectedVersion: 0, receipt: [{ orderId: f.ids[0], productId: "test-product", good, damaged: 0 }],
    })));
    expect(writes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const current = await api.supplierFulfilmentDetail(f.id, f.bid, admin);
    expect(current.shipments[0].version).toBe(1);
  });
  it("records full direct-member receipt idempotently without completing or charging the member", async () => {
    const f = await fixture();
    await s.db.update(s.ordersTable).set({ reshipperUsername: null, routingType: "direct", directShippingRequested: true }).where(eq(s.ordersTable.id, f.ids[0]));
    const before = await s.db.select().from(s.ordersTable).where(eq(s.ordersTable.id, f.ids[0]));
    const d = await api.createSupplierShipment(f.id, f.bid, { username: "synthetic-organiser" }, { ...f.body(), recipientUsername: null, directOrderId: f.ids[0] });
    const shipment = d.shipments[0], receipt = { expectedVersion: 0, receipt: [{ orderId: f.ids[0], productId: "test-product", good: 2.5, damaged: 0 }] };
    await api.changeSupplierShipment(f.id, f.bid, shipment.id, admin, "receive", receipt);
    const replay = await api.changeSupplierShipment(f.id, f.bid, shipment.id, admin, "receive", receipt);
    expect(replay.orders[0].ready).toBe(true);
    expect(replay.orders[0].status).toBe("Processing");
    expect(replay.shipments[0].version).toBe(1);
    expect(replay.history.filter((e: any) => e.kind === "shipment_receive")).toHaveLength(1);
    const after = await s.db.select().from(s.ordersTable).where(eq(s.ordersTable.id, f.ids[0]));
    expect(after).toEqual(before);
  });
  it("restricts reshippers to their shipment/member subset and denies unrelated staff", async () => {
    const f = await fixture();
    let d = await api.createSupplierShipment(f.id, f.bid, admin, f.body(0));
    d = await api.createSupplierShipment(f.id, f.bid, admin, f.body(1));
    const recipient = { username: f.reshippers[0], reshipper: true };
    const own = await api.supplierFulfilmentDetail(f.id, f.bid, recipient);
    expect(own.orders.map((o: any) => o.id)).toEqual([f.ids[0]]);
    expect(own.shipments).toHaveLength(1);
    expect(own.batch.kits).toBe(2.5);
    expect(JSON.stringify(own)).not.toContain(f.ids[1]);
    expect(JSON.stringify(own)).not.toContain("grandTotal");
    await expect(api.createSupplierShipment(f.id, f.bid, recipient, f.body())).rejects.toThrow(/Only Admin/);
    await expect(api.changeSupplierShipment(f.id, f.bid, d.shipments[1].id, recipient, "receive", { expectedVersion: 0, receipt: [] })).rejects.toThrow(/not found/);
    await expect(api.supplierFulfilmentDetail(f.id, f.bid, { username: "stranger" })).rejects.toThrow(/do not manage/);
    await expect(api.supplierFulfilmentDetail(f.id, f.bid, { username: "stranger", reshipper: true })).rejects.toThrow(/not assigned/);
    await expect(api.supplierFulfilmentDetail(f.id, f.bid, { username: "admin", admin: true, adminGbId: "different" })).rejects.toThrow(/another group buy/);
  });
  it("flags rerouting and blocks an old recipient recording new stock", async () => {
    const f = await fixture();
    const d = await api.createSupplierShipment(f.id, f.bid, admin, f.body());
    await s.db.update(s.ordersTable).set({ reshipperUsername: f.reshippers[1] }).where(eq(s.ordersTable.id, f.ids[0]));
    const changed = await api.supplierFulfilmentDetail(f.id, f.bid, admin);
    expect(changed.orders[0].exceptions.join()).toMatch(/Routing changed/);
    await expect(api.changeSupplierShipment(f.id, f.bid, d.shipments[0].id, { username: f.reshippers[0], reshipper: true }, "receive", {
      expectedVersion: 0, receipt: [{ orderId: f.ids[0], productId: "test-product", good: 2.5, damaged: 0 }],
    })).rejects.toThrow(/Routing changed/);
  });
  it("ignores late carrier results after tracking edits and never turns delivered into received", async () => {
    const f = await fixture(), body = { ...f.body(), trackingNumber: "SYNTHETIC-OLD" };
    const d = await api.createSupplierShipment(f.id, f.bid, admin, body), p = d.shipments[0];
    let finish!: (v: any) => void, started!: () => void;
    const pending = new Promise<void>(resolve => { started = resolve; });
    const refresh = tracker.refreshSupplierShipment(f.id, f.bid, p.id, admin, { expectedVersion: 0 }, s.db, false, async () => {
      started(); return new Promise(resolve => { finish = resolve; });
    });
    await pending;
    await api.changeSupplierShipment(f.id, f.bid, p.id, admin, "update", {
      expectedVersion: 1, label: p.label, carrier: 0, trackingNumber: "SYNTHETIC-NEW", reason: "Wrong supplier tracking supplied",
    });
    finish({ status: "delivered", events: [] });
    const current = await refresh;
    expect(current.shipments[0].trackingNumber).toBe("SYNTHETIC-NEW");
    expect(current.shipments[0].trackingStatus).toBe("pending");
    const delivered = await tracker.refreshSupplierShipment(f.id, f.bid, p.id, admin, { expectedVersion: 2 }, s.db, false,
      async () => ({ status: "delivered", events: [] }));
    expect(delivered.orders[0].ready).toBe(false);
    expect(delivered.orders[0].status).toBe("Processing");
    expect(delivered.shipments[0].receiptChecked).toBe(false);
    await expect(tracker.refreshSupplierShipment(f.id, f.bid, p.id, admin, { expectedVersion: 3 }, s.db, false,
      async () => { throw new Error("must not call provider"); })).rejects.toMatchObject({ status: 429 });
  });
});

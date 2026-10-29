import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
vi.mock("./telegram", () => ({ notifyUserFull: vi.fn(async () => ({ ok: true })) }));
vi.mock("../routes/config", () => ({ getActiveWholesaleVendor: vi.fn(async () => ({
  id: "synthetic", name: "Synthetic", tiers: ["1-25"], tierBounds: [25], maxKitsPerPackage: 25,
  regions: [{ name: "Italy", countries: ["Italy"], prices: [20] }],
})) }));

describe.skipIf(process.env.SUPPLIER_BATCH_DB_TESTS !== "1")("supplier TXT / isolated development DB fixtures", () => {
  let store: any, api: any;
  const cleanup: { group: string; account: string; product: string }[] = [];
  const admin = { username: "synthetic-admin", admin: true };
  beforeAll(async () => { store = await import("@workspace/db"); api = await import("./supplier-batches"); });
  afterEach(async () => {
    for (const f of cleanup.splice(0)) {
      await store.db.transaction(async (tx: any) => {
        await tx.delete(store.auditLogsTable).where(sql`${store.auditLogsTable.metadata}->>'groupBuyId' = ${f.group}`);
        const orders = await tx.select({ id: store.ordersTable.id }).from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.group));
        if (orders.length) {
          await tx.delete(store.gbSupplierAllocationsTable).where(inArray(store.gbSupplierAllocationsTable.orderId, orders.map((o: any) => o.id)));
          await tx.delete(store.orderLineItemsTable).where(inArray(store.orderLineItemsTable.orderId, orders.map((o: any) => o.id)));
        }
        await tx.delete(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.group));
        await tx.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, f.group));
        await tx.delete(store.accountsTable).where(eq(store.accountsTable.telegramUsername, f.account));
        await tx.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.product));
      });
    }
  });
  async function fixture() {
    const group = randomUUID(), account = `synthetic-${randomUUID()}`, product = `Synthetic ${randomUUID()}`;
    cleanup.push({ group, account, product });
    await store.db.insert(store.groupBuysTable).values({ id: group, name: "Synthetic TXT", status: "draft", currency: "USD" });
    await store.db.insert(store.accountsTable).values({ telegramUsername: account, reshipperSettings: {
      supplierDelivery: { name: "Supplier Recipient", address: "Synthetic Street\nSynthetic City", country: "IT", email: "test@example.com", phone: "+3912345678" },
    } });
    await store.db.insert(store.fs3CostsTable).values({ productName: product, unitCost: "40" });
    const ids = [];
    for (let n = 0; n < 3; n++) {
      const id = randomUUID(); ids.push(id);
      await store.db.insert(store.ordersTable).values({ id, code: `synthetic-${n}`, telegramUsername: "synthetic-member",
        groupBuyId: group, deliveryMethod: "Synthetic", productSubtotal: "2000", grandTotal: "2000",
        shippingCountry: "Italy", paymentStatus: "confirmed", paymentConfirmedAt: new Date(),
        routingType: n === 2 ? "direct" : "reshipper", reshipperUsername: n === 2 ? null : account,
        directShippingRequested: n === 2, shippingName: "Direct Recipient", shippingAddress: "PRIVATE MEMBER ADDRESS",
        shippingEmail: "direct@example.com", shippingPhone: "+3911111111",
      });
      await store.db.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId: id, productId: product, productName: product,
        quantity: "50", unitPrice: "100", lineTotal: "5000" });
    }
    await api.saveSupplierConfig(group, admin, { expectedVersion: 0, config: { enabled: true, telegramAlerts: false,
      regions: [{ id: "eu", name: "EU", countries: ["IT"], targetKits: 100 }] } });
    const current = await api.supplierData(group, admin);
    const confirmed = await api.confirmSupplierBatch(group, admin, { regionId: "eu", token: current.proposals[0].token });
    return { group, account, product, ids, batch: confirmed.batches[0] };
  }
  it("exports only the allocated batch and its reshipper, without member address leaks or status changes", async () => {
    const f = await fixture();
    const text = await api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id });
    expect(text).toContain(f.batch.reference);
    expect(text).toContain("Total QTY: 100");
    expect(text).toContain("Total: $4000.00");
    expect(text).toContain("Package: 4 x $70.00 = $280.00");
    expect(text).toContain("Supplier Recipient");
    expect(text).not.toContain("PRIVATE MEMBER ADDRESS");
    expect(text).not.toContain("synthetic-2");
    const states = await store.db.select({ status: store.ordersTable.status, payment: store.ordersTable.paymentStatus }).from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.group));
    expect(states.every((o: any) => o.status === "Submitted" && o.payment === "confirmed")).toBe(true);
  });
  it("includes newly appended paid orders in the same batch supplier TXT", async () => {
    const f = await fixture();
    const id = randomUUID();
    await store.db.insert(store.ordersTable).values({
      id, code: "synthetic-appended", telegramUsername: "synthetic-member", groupBuyId: f.group,
      deliveryMethod: "Synthetic", productSubtotal: "200", grandTotal: "200",
      shippingCountry: "Italy", paymentStatus: "confirmed", paymentConfirmedAt: new Date(),
      routingType: "reshipper", reshipperUsername: f.account,
    });
    await store.db.insert(store.orderLineItemsTable).values({
      id: randomUUID(), orderId: id, productId: f.product, productName: f.product,
      quantity: "2", unitPrice: "100", lineTotal: "200",
    });
    const current = await api.supplierData(f.group, admin);
    await api.appendSupplierBatch(f.group, f.batch.id, admin, {
      regionId: "eu", token: current.proposals[0].token,
      expectedBatchToken: current.batches[0].snapshot.token,
    });
    const text = await api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id });
    expect(text).toContain(f.batch.reference);
    expect(text).toContain("synthetic-appended");
    expect(text).toContain("Total QTY: 102");
    expect(text).toContain("Total: $4080.00");
  });
  it("exports reviewed quantity changes using current supplier costs and the kept batch reference", async () => {
    const f = await fixture();
    await store.db.update(store.orderLineItemsTable).set({ quantity: "52", lineTotal: "5200" })
      .where(eq(store.orderLineItemsTable.orderId, f.ids[0]));
    await store.db.update(store.ordersTable).set({ productSubtotal: "5200", grandTotal: "5200", balanceConfirmedAt: new Date() })
      .where(eq(store.ordersTable.id, f.ids[0]));
    await expect(api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id })).rejects.toThrow(/exceptions/i);
    const p = await api.previewSupplierBatchRefresh(f.group, f.batch.id, admin, { expectedBatchToken: f.batch.snapshot.token });
    await api.refreshSupplierBatch(f.group, f.batch.id, admin, { confirm: true, expectedBatchToken: p.expectedBatchToken, token: p.token });
    const text = await api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id });
    expect(text).toContain(f.batch.reference);
    expect(text).toContain("Total QTY: 102");
    expect(text).toContain("Total: $4080.00");
    expect(text).toContain("Package: 5 x $70.00 = $350.00");
    expect(text).toContain("Supplier Recipient");
    expect(text).not.toContain("PRIVATE MEMBER ADDRESS");
    await store.db.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.product));
    await expect(api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id })).rejects.toThrow(/setup|cost/i);
  });
  it("selects direct orders separately, uses vendor tiers and refuses cross-routing selections", async () => {
    const f = await fixture();
    expect((await api.supplierDirectOrders(f.group, admin)).orders.map((o: any) => o.id)).toEqual([f.ids[2]]);
    const text = await api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[2]] });
    expect(text).toContain("Direct Recipient");
    expect(text).toContain("PRIVATE MEMBER ADDRESS");
    expect(text).toContain("Package: 2 x $20.00 = $40.00");
    await expect(api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[0]] })).rejects.toThrow(/no longer eligible/);
    await expect(api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[2], f.ids[2]] })).rejects.toThrow(/distinct/);
    await store.db.update(store.ordersTable).set({ directShippingRequested: false }).where(eq(store.ordersTable.id, f.ids[2]));
    expect((await api.supplierDirectOrders(f.group, admin)).orders).toHaveLength(0);
    await expect(api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[2]] })).rejects.toThrow(/no longer eligible/);
    await store.db.update(store.ordersTable).set({ directShippingRequested: true }).where(eq(store.ordersTable.id, f.ids[2]));
    await store.db.update(store.ordersTable).set({ paymentStatus: "unpaid" }).where(eq(store.ordersTable.id, f.ids[2]));
    await expect(api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[2]] })).rejects.toThrow(/no longer eligible/);
  });
  it("fails closed on missing contacts/costs, batch exceptions, wrong group and non-admin access", async () => {
    const f = await fixture();
    await expect(api.exportSupplierTxt(f.group, { username: "someone", admin: false }, { batchId: f.batch.id })).rejects.toMatchObject({ status: 403 });
    await expect(api.exportSupplierTxt(f.group, admin, { batchId: randomUUID() })).rejects.toMatchObject({ status: 404 });
    await store.db.update(store.accountsTable).set({ reshipperSettings: null }).where(eq(store.accountsTable.telegramUsername, f.account));
    await expect(api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id })).rejects.toThrow(/supplier delivery name/i);
    await store.db.delete(store.fs3CostsTable).where(eq(store.fs3CostsTable.productName, f.product));
    await expect(api.exportSupplierTxt(f.group, admin, { orderIds: [f.ids[2]] })).rejects.toThrow(/exact supplier cost/i);
    await store.db.update(store.ordersTable).set({ paymentStatus: "unpaid" }).where(eq(store.ordersTable.id, f.ids[0]));
    await expect(api.exportSupplierTxt(f.group, admin, { batchId: f.batch.id })).rejects.toThrow(/exceptions/i);
  });
});

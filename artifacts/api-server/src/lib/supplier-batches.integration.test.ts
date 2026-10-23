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
  async function fixture(qtys = [95, 10, 20], routes: Record<string, unknown>[] = []) {
    const id = randomUUID(); fixtures.push(id);
    await store.db.insert(store.groupBuysTable).values({ id, name: "Synthetic regional batching test", status: "draft", currency: "USD", organiserId: "synthetic-organiser", organiserCanEditStatus: true });
    const ids: string[] = [];
    for (let k = 0; k < qtys.length; k++) {
      const oid = randomUUID(); ids.push(oid);
      await store.db.insert(store.ordersTable).values({
        id: oid, code: `test-${k}`, telegramUsername: `synthetic-${k}`, deliveryMethod: "Synthetic",
        productSubtotal: String(qtys[k] * 10), grandTotal: String(qtys[k] * 10),
        groupBuyId: id, shippingCountry: "Italy", paymentStatus: "confirmed", paymentConfirmedAt: new Date(2026, 0, 1 + k),
        ...routes[k],
      });
      await store.db.insert(store.orderLineItemsTable).values({
        id: randomUUID(), orderId: oid, productId: "synthetic-product", productName: "Synthetic product",
        quantity: String(qtys[k]), unitPrice: "10", lineTotal: String(qtys[k] * 10),
      });
    }
    const result = await api.saveSupplierConfig(id, admin, {expectedVersion: 0, config: {enabled:true,telegramAlerts:false,regions:[{id:"eu",name:"EU",countries:["IT","DE"],targetKits:100}]}});
    return {id, ids, result};
  }
  it("keeps member batch visibility off by default and persists an explicit choice", async () => {
    const f = await fixture([100]);
    const initial = await api.supplierData(f.id, admin);
    expect(initial.config.showToMembers).toBe(false);
    const saved = await api.saveSupplierConfig(f.id, admin, { expectedVersion: initial.version, config: { ...initial.config, showToMembers: true } });
    expect(saved.config.showToMembers).toBe(true);
    const { showToMembers, ...oldClient } = saved.config;
    const preserved = await api.saveSupplierConfig(f.id, admin, { expectedVersion: saved.version, config: oldClient });
    expect(preserved.config.showToMembers).toBe(true);
  });
  it("adds below-target queued orders to a prepared batch and updates its exports idempotently", async () => {
    const f = await fixture([100, 15]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: f.result.proposals[0].token });
    const batch = prepared.batches[0];
    const queued = prepared.proposals[0];
    expect(queued.ready).toBe(false);
    const body = { regionId: "eu", token: queued.token, expectedBatchToken: batch.snapshot.token };
    const result = await api.appendSupplierBatch(f.id, batch.id, admin, body);
    const merged = result.batches[0];
    expect(result.batches).toHaveLength(1);
    expect(merged.reference).toBe(batch.reference);
    expect(merged.snapshot.kits).toBe(115);
    expect(merged.snapshot.orders.map((o: any) => o.id)).toEqual(f.ids);
    expect(merged.exceptions).toEqual([]);
    expect(result.proposals[0].queuedKits).toBe(0);
    const exported = await api.exportSupplierBatch(f.id, batch.id, admin);
    for (const code of ["test-0", "test-1"]) expect(exported.csv).toContain(code);
    const replay = await api.appendSupplierBatch(f.id, batch.id, admin, body);
    expect(replay.batches[0].snapshot.orders).toHaveLength(2);
    const rows = await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.id));
    expect(rows.every((o: any) => o.status === "Submitted" && o.paymentStatus === "confirmed")).toBe(true);
    const ordered = await api.orderSupplierBatch(f.id, batch.id, admin, { confirm: true });
    expect(ordered.batches[0].state).toBe("ordered");
    const processed = await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.id));
    expect(processed.every((o: any) => o.status === "Processing")).toBe(true);
  });

  it("rejects stale target snapshots, wrong regions, released and already ordered batches", async () => {
    const f = await fixture([100, 15]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: f.result.proposals[0].token });
    const batch = prepared.batches[0];
    const body = { regionId: "eu", token: prepared.proposals[0].token, expectedBatchToken: batch.snapshot.token };
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, { ...body, expectedBatchToken: "stale" })).rejects.toThrow(/batch changed/i);
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, { ...body, regionId: "uk" })).rejects.toThrow(/region|preview/i);
    await api.orderSupplierBatch(f.id, batch.id, admin, { confirm: true });
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, body)).rejects.toThrow(/prepared/i);
    const other = await fixture([100, 15]);
    const otherPrepared = await api.confirmSupplierBatch(other.id, admin, { regionId: "eu", token: other.result.proposals[0].token });
    const otherBatch = otherPrepared.batches[0];
    await api.releaseSupplierBatch(other.id, otherBatch.id, admin, { confirm: true, reason: "Synthetic release" });
    await expect(api.appendSupplierBatch(other.id, otherBatch.id, admin, {
      regionId: "eu", token: otherPrepared.proposals[0].token, expectedBatchToken: otherBatch.snapshot.token,
    })).rejects.toThrow(/prepared/i);
  });

  it("does not append an outdated queue or bypass refund flags, permissions or group boundaries", async () => {
    const f = await fixture([100, 15]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: f.result.proposals[0].token });
    const batch = prepared.batches[0];
    const body = { regionId: "eu", token: prepared.proposals[0].token, expectedBatchToken: batch.snapshot.token };
    await expect(api.appendSupplierBatch(f.id, batch.id, { username: "stranger", admin: false }, body)).rejects.toMatchObject({ status: 403 });
    await expect(api.appendSupplierBatch(f.id, randomUUID(), admin, body)).rejects.toMatchObject({ status: 404 });
    await store.db.update(store.ordersTable).set({ paymentStatus: "unpaid" }).where(eq(store.ordersTable.id, f.ids[1]));
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, body)).rejects.toThrow(/preview changed/i);
    await store.db.update(store.ordersTable).set({ paymentStatus: "confirmed", refundStatus: "requested" })
      .where(eq(store.ordersTable.id, f.ids[1]));
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, body)).rejects.toThrow(/preview changed/i);
    const result = await api.supplierData(f.id, admin);
    expect(result.batches[0].snapshot.kits).toBe(100);
    expect(result.batches[0].snapshot.orders).toHaveLength(1);
  });
  it("serializes concurrent repeat additions and records the allocation once", async () => {
    const f = await fixture([100, 15]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: f.result.proposals[0].token });
    const batch = prepared.batches[0];
    const body = { regionId: "eu", token: prepared.proposals[0].token, expectedBatchToken: batch.snapshot.token };
    const results = await Promise.all([
      api.appendSupplierBatch(f.id, batch.id, admin, body),
      api.appendSupplierBatch(f.id, batch.id, admin, body),
    ]);
    expect(results.every(r => r.batches[0].snapshot.kits === 115)).toBe(true);
    const assigned = await store.db.select().from(store.gbSupplierAllocationsTable)
      .where(eq(store.gbSupplierAllocationsTable.batchId, batch.id));
    expect(assigned).toHaveLength(2);
  });
  it("rejects additions from a different configured region and destination batch exceptions", async () => {
    const f = await fixture([100, 15], [{ shippingCountry: "Italy" }, { shippingCountry: "UK" }]);
    const initial = await api.supplierData(f.id, admin);
    const configured = await api.saveSupplierConfig(f.id, admin, {
      expectedVersion: initial.version, config: { ...initial.config, regions: [
        { id: "eu", name: "EU", countries: ["IT"], targetKits: 100 },
        { id: "uk", name: "UK", countries: ["GB"], targetKits: 100 },
      ] },
    });
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: configured.proposals.find((p: any) => p.region.id === "eu").token });
    const batch = prepared.batches[0];
    const uk = prepared.proposals.find((p: any) => p.region.id === "uk");
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, {
      regionId: "uk", token: uk.token, expectedBatchToken: batch.snapshot.token,
    })).rejects.toThrow(/same region/i);
    await store.db.update(store.ordersTable).set({ amountDue: "10" }).where(eq(store.ordersTable.id, f.ids[0]));
    await expect(api.appendSupplierBatch(f.id, batch.id, admin, {
      regionId: "uk", token: uk.token, expectedBatchToken: batch.snapshot.token,
    })).rejects.toThrow(/exceptions/i);
  });
  it("confirms all queued paid orders with its own stale-safe preview token", async () => {
    const f = await fixture([50, 50, 15]);
    const current = await api.supplierData(f.id, admin);
    const preview = current.proposals[0];
    expect(preview.orders).toHaveLength(2);
    expect(preview.allQueued.orders).toHaveLength(3);
    expect(preview.allQueued.kits).toBe(115);
    expect(preview.allQueued.region.targetKits).toBe(100);
    expect(preview.allQueued.token).not.toBe(preview.token);
    await expect(api.confirmSupplierBatch(f.id, admin, {
      regionId: "eu", token: preview.token, includeAll: true,
    })).rejects.toThrow(/preview changed/);
    const saved = await api.confirmSupplierBatch(f.id, admin, {
      regionId: "eu", token: preview.allQueued.token, includeAll: true,
    });
    expect(saved.batches).toHaveLength(1);
    expect(saved.batches[0].snapshot.kits).toBe(115);
    expect(saved.proposals[0].queuedKits).toBe(0);
    const replay = await api.confirmSupplierBatch(f.id, admin, {
      regionId: "eu", token: preview.allQueued.token, includeAll: true,
    });
    expect(replay.batches).toHaveLength(1);
  });
  it("rejects an all-queue preview if another paid order joins before confirmation", async () => {
    const f = await fixture([100, 15]);
    const current = await api.supplierData(f.id, admin);
    await store.db.update(store.orderLineItemsTable).set({ quantity: "16", lineTotal: "160" })
      .where(eq(store.orderLineItemsTable.orderId, f.ids[1]));
    await expect(api.confirmSupplierBatch(f.id, admin, {
      regionId: "eu", token: current.proposals[0].allQueued.token, includeAll: true,
    })).rejects.toThrow(/preview changed/);
    const after = await api.supplierData(f.id, admin);
    expect(after.batches).toHaveLength(0);
  });
  it("gates member summaries on membership and visibility, and highlights only active allocations", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([100]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0"] }).where(eq(store.groupBuysTable.id, f.id));
    await expect(memberSupplierBatches(f.id, "synthetic-0")).rejects.toMatchObject({ status: 403 });
    const initial = await api.supplierData(f.id, admin);
    const visible = await api.saveSupplierConfig(f.id, admin, { expectedVersion: initial.version, config: { ...initial.config, showToMembers: true } });
    await expect(memberSupplierBatches(f.id, "not-a-member")).rejects.toMatchObject({ status: 404 });
    expect((await memberSupplierBatches(f.id, "synthetic-0")).batches).toEqual([]);
    const preview = visible.proposals[0];
    await api.confirmSupplierBatch(f.id, admin, { regionId: preview.region.id, token: preview.token });
    const summary = await memberSupplierBatches(f.id, "synthetic-0");
    expect(summary.batches).toHaveLength(1);
    expect(summary.batches[0]).toMatchObject({ isYourBatch: true, status: "Prepared", kits: 100 });
    expect(JSON.stringify(summary)).not.toMatch(/synthetic-0|grandTotal|trackingNumber|snapshot|productName|createdBy/);
    const joined = `batch-view-${f.id}`;
    await store.db.insert(store.accountsTable).values({ telegramUsername: joined });
    try {
      await store.db.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: joined, groupBuyId: f.id });
      const joinedView = await memberSupplierBatches(f.id, joined);
      expect(joinedView).toMatchObject({ batches: [], regions: [], countryRequired: true });
      await store.db.update(store.accountsTable).set({ country: "Germany" }).where(eq(store.accountsTable.telegramUsername, joined));
      const euView = await memberSupplierBatches(f.id, joined);
      expect(euView.batches).toEqual([]);
      expect(euView.regions[0].name).toBe("EU");
      expect(JSON.stringify(euView)).not.toContain(summary.batches[0].reference);
      await store.db.update(store.accountsTable).set({ country: "United States" }).where(eq(store.accountsTable.telegramUsername, joined));
      expect((await memberSupplierBatches(f.id, joined)).batches).toEqual([]);
    } finally {
      await store.db.delete(store.accountGroupBuysTable).where(and(eq(store.accountGroupBuysTable.accountId, joined), eq(store.accountGroupBuysTable.groupBuyId, f.id)));
      await store.db.delete(store.accountsTable).where(eq(store.accountsTable.telegramUsername, joined));
    }
    const current = await api.supplierData(f.id, admin);
    await api.saveSupplierConfig(f.id, admin, { expectedVersion: current.version, config: { ...current.config, showToMembers: false } });
    await expect(memberSupplierBatches(f.id, "synthetic-0")).rejects.toMatchObject({ status: 403 });
  });
  it("returns only Direct shipping for a member's active direct order, without requiring a country", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([30, 100], [{ routingType: "direct", directShippingRequested: true, shippingCountry: null }]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0"] }).where(eq(store.groupBuysTable.id, f.id));
    await expect(memberSupplierBatches(f.id, "synthetic-0")).rejects.toMatchObject({ status: 403 });
    const enabled = await api.saveSupplierConfig(f.id, admin, {
      expectedVersion: f.result.version, config: { ...f.result.config, showToMembers: true },
    });
    await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: enabled.proposals[0].token });
    const view = await memberSupplierBatches(f.id, "synthetic-0");
    expect(view).toMatchObject({ directShipping: true, directShippingOnly: true, countryRequired: false, batches: [], regions: [] });
    await expect(memberSupplierBatches(f.id, "outsider")).rejects.toMatchObject({ status: 404 });
  });
  it("does not mistake stale direct flags or cancelled direct orders for a direct-only member", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([30, 15], [
      { routingType: "direct", directShippingRequested: true, reshipperUsername: "synthetic-reshipper" },
      { routingType: "direct", directShippingRequested: true, status: "Cancelled", telegramUsername: "synthetic-0" },
    ]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0"] }).where(eq(store.groupBuysTable.id, f.id));
    await api.saveSupplierConfig(f.id, admin, { expectedVersion: f.result.version, config: { ...f.result.config, showToMembers: true } });
    const view = await memberSupplierBatches(f.id, "synthetic-0");
    expect(view).toMatchObject({ directShipping: false, directShippingOnly: false });
    expect(view.regions[0]).toMatchObject({ kits: 30, yourOrderStatus: "included" });
  });
  it("shows mixed-route members only the non-direct order's regional progress", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([30, 15], [
      { routingType: "direct", directShippingRequested: true, shippingCountry: "UK" },
      { routingType: "reshipper", telegramUsername: "synthetic-0", shippingCountry: "Italy" },
    ]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0"] }).where(eq(store.groupBuysTable.id, f.id));
    await api.saveSupplierConfig(f.id, admin, {
      expectedVersion: f.result.version, config: { ...f.result.config, showToMembers: true,
        regions: [...f.result.config.regions, { id: "uk", name: "UK", countries: ["GB"], targetKits: 100 }] },
    });
    const view = await memberSupplierBatches(f.id, "synthetic-0");
    expect(view).toMatchObject({ directShipping: true, directShippingOnly: false });
    expect(view.regions.map((r: any) => r.id)).toEqual(["eu"]);
    expect(view.regions[0].kits).toBe(15);
  });
  it("shares only each destination's queue and historical batches, without altering readiness or orders", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([100, 100, 100, 18.5, 34], [
      { shippingCountry: "Italy" }, { shippingCountry: "UK" }, { shippingCountry: "United States" },
      { shippingCountry: "Germany" }, { shippingCountry: "United Kingdom" },
    ]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0", "synthetic-1", "synthetic-2", "synthetic-3", "synthetic-4"] })
      .where(eq(store.groupBuysTable.id, f.id));
    const initial = await api.supplierData(f.id, admin);
    await api.saveSupplierConfig(f.id, admin, { expectedVersion: initial.version, config: { ...initial.config, showToMembers: true,
      regions: [
        { id: "eu", name: "EU", countries: ["IT", "DE"], targetKits: 100 },
        { id: "uk", name: "UK", countries: ["GB"], targetKits: 100 },
        { id: "us", name: "US", countries: ["US"], targetKits: 100 },
      ] } });
    for (const regionId of ["eu", "uk", "us"]) {
      const current = await api.supplierData(f.id, admin);
      const proposal = current.proposals.find((p: any) => p.region.id === regionId);
      await api.confirmSupplierBatch(f.id, admin, { regionId, token: proposal.token });
    }
    const before = await store.db.select().from(store.gbSupplierSettingsTable).where(eq(store.gbSupplierSettingsTable.groupBuyId, f.id));
    const statusesBefore = await store.db.select({ id: store.ordersTable.id, status: store.ordersTable.status })
      .from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.id));
    const eu = await memberSupplierBatches(f.id, "synthetic-0");
    const de = await memberSupplierBatches(f.id, "synthetic-3");
    const uk = await memberSupplierBatches(f.id, "synthetic-1");
    const us = await memberSupplierBatches(f.id, "synthetic-2");
    expect(eu.regions).toEqual([{ id: "eu", name: "EU", kits: 18.5, targetKits: 100, status: "Filling", yourOrderStatus: "not_included" }]);
    expect(de.regions).toEqual([{ ...eu.regions[0], yourOrderStatus: "included" }]);
    expect(uk.regions).toEqual([{ id: "uk", name: "UK", kits: 34, targetKits: 100, status: "Filling", yourOrderStatus: "not_included" }]);
    expect(us.regions).toEqual([{ id: "us", name: "US", kits: 0, targetKits: 100, status: "Filling", yourOrderStatus: "not_included" }]);
    const ukWaiting = await memberSupplierBatches(f.id, "synthetic-4");
    expect(ukWaiting.regions[0]).toMatchObject({ id: "uk", yourOrderStatus: "included" });
    for (const [view, region] of [[eu, "EU"], [uk, "UK"], [us, "US"]] as const) {
      expect(view.batches).toHaveLength(1);
      expect(view.batches[0]).toMatchObject({ region, kits: 100, targetKits: 100, isYourBatch: true, status: "Prepared" });
      expect(JSON.stringify(view)).not.toMatch(/synthetic-|snapshot|telegramUsername|trackingNumber|productName|token/);
    }
    expect(de.batches).toEqual([]);
    expect(await store.db.select().from(store.gbSupplierSettingsTable).where(eq(store.gbSupplierSettingsTable.groupBuyId, f.id))).toEqual(before);
    expect(await store.db.select({ id: store.ordersTable.id, status: store.ordersTable.status }).from(store.ordersTable)
      .where(eq(store.ordersTable.groupBuyId, f.id))).toEqual(statusesBefore);
  });
  it("does not let 30 direct kits make a 70-kit regional queue ready", async () => {
    const f = await fixture([70, 30], [{}, { routingType: "direct", directShippingRequested: true }]);
    const p = f.result.proposals[0];
    expect(p.queuedKits).toBe(70);
    expect(p.ready).toBe(false);
    expect(p.readyAt).toBeNull();
    expect(p.orders.map((o: any) => o.id)).toEqual([f.ids[0]]);
    expect(f.result.review.some((o: any) => o.id === f.ids[1])).toBe(false);
    expect(f.result.events.some((e: any) => e.kind === "ready")).toBe(false);
    await expect(api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: p.token })).rejects.toThrow(/no longer ready/);
  });
  it("returns only each member's assigned batches, never other batches in the same region", async () => {
    const { memberSupplierBatches } = await import("./member-supplier-batches");
    const f = await fixture([100, 100, 15], [{}, {}, { telegramUsername: "synthetic-0" }]);
    await store.db.update(store.groupBuysTable).set({ forcedUsernames: ["synthetic-0", "synthetic-1"] })
      .where(eq(store.groupBuysTable.id, f.id));
    let current = await api.saveSupplierConfig(f.id, admin, {
      expectedVersion: f.result.version, config: { ...f.result.config, showToMembers: true },
    });
    for (let i = 0; i < 2; i++) current = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: current.proposals[0].token });
    const first = current.batches.find((b: any) => b.snapshot.orders.some((o: any) => o.id === f.ids[0]));
    const second = current.batches.find((b: any) => b.id !== first.id);
    const a = await memberSupplierBatches(f.id, "synthetic-0");
    const b = await memberSupplierBatches(f.id, "synthetic-1");
    expect(a.batches.map((batch: any) => batch.reference)).toEqual([first.reference]);
    expect(b.batches.map((batch: any) => batch.reference)).toEqual([second.reference]);
    expect(JSON.stringify(a)).not.toContain(second.reference);
    expect(JSON.stringify(b)).not.toContain(first.reference);
    await api.appendSupplierBatch(f.id, first.id, admin, {
      regionId: "eu", token: current.proposals[0].token, expectedBatchToken: first.snapshot.token,
    });
    expect((await memberSupplierBatches(f.id, "synthetic-0")).batches[0]).toMatchObject({ reference: first.reference, kits: 115 });
    await api.releaseSupplierBatch(f.id, first.id, admin, { confirm: true, reason: "Synthetic release" });
    expect((await memberSupplierBatches(f.id, "synthetic-0")).batches).toEqual([]);
    expect((await memberSupplierBatches(f.id, "synthetic-1")).batches[0].reference).toBe(second.reference);
  });
  it("processes and exports 100 reshipper kits without including the separate direct order", async () => {
    const f = await fixture([70, 30, 30], [{}, { routingType: "direct", directShippingRequested: true }, { routingType: "reshipper" }]);
    const p = f.result.proposals[0];
    expect(p.kits).toBe(100);
    expect(p.orders.map((o: any) => o.id)).toEqual([f.ids[0], f.ids[2]]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: p.token });
    const b = prepared.batches[0];
    expect((await api.exportSupplierBatch(f.id, b.id, admin)).csv).not.toContain("test-1");
    await api.orderSupplierBatch(f.id, b.id, admin, { confirm: true });
    const [direct] = await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.ids[1]));
    expect(direct.status).toBe("Submitted");
    const allocations = await store.db.select().from(store.gbSupplierAllocationsTable).where(eq(store.gbSupplierAllocationsTable.orderId, f.ids[1]));
    expect(allocations).toHaveLength(0);
  });
  it("blocks an unsent batch changed to Direct Shipping without rewriting its saved history", async () => {
    const f = await fixture([100, 10]);
    const prepared = await api.confirmSupplierBatch(f.id, admin, { regionId: "eu", token: f.result.proposals[0].token });
    const b = prepared.batches[0];
    await store.db.update(store.ordersTable).set({ routingType: "direct", directShippingRequested: true }).where(eq(store.ordersTable.id, f.ids[0]));
    const current = await api.supplierData(f.id, admin);
    expect(current.batches[0].exceptions[0].reason).toMatch(/Direct Shipping/);
    await expect(api.orderSupplierBatch(f.id, b.id, admin, { confirm: true })).rejects.toThrow(/exceptions/);
    await expect(api.exportSupplierBatch(f.id, b.id, admin)).rejects.toThrow(/blocked/);
    const released = await api.releaseSupplierBatch(f.id, b.id, admin, { confirm: true, reason: "Direct order must be handled separately" });
    expect(released.batches[0].snapshot.kits).toBe(100);
    expect(released.proposals[0].queuedKits).toBe(10);
  });
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

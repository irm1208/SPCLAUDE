import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ username: "" }));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (req: any, _res: any, next: any) => {
    req.account = { telegramUsername: req.headers["x-test-owner"] ?? identity.username }; next();
  },
}));
vi.mock("./telegram", () => ({
  notifyUserFromTemplate: vi.fn(async () => {}), sendAdminFromTemplate: vi.fn(async () => {}),
  invalidateTelegramCache: vi.fn(), getTelegramStatus: vi.fn(), sendAdminTestMessage: vi.fn(),
  setWebhook: vi.fn(), buildWebhookUrl: vi.fn(),
}));
vi.mock("./audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("./activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
vi.mock("./create-alert", () => ({ createAlert: vi.fn(async () => {}) }));

// Fail after the real child rows/credit debit to verify the whole submission rolls back.
const failure = vi.hoisted(() => ({ failRecord: false,
  locked: null as null | (() => void), resume: null as null | Promise<void> }));
vi.mock("./order-addition-submission", async original => {
  const actual = await original<typeof import("./order-addition-submission")>();
  return { ...actual, lockAddition: async (...args: Parameters<typeof actual.lockAddition>) => {
    const result = await actual.lockAddition(...args);
    if (failure.resume) { failure.locked?.(); await failure.resume; }
    return result;
  }, recordAddition: async (...args: Parameters<typeof actual.recordAddition>) => {
    if (failure.failRecord) throw new Error("Synthetic transaction failure");
    return actual.recordAddition(...args);
  } };
});

describe.runIf(process.env.SUPPLIER_BATCH_DB_TESTS === "1")("batch-aware additions / real checkout and PostgreSQL", () => {
  let store: any, batches: any, server: Server, base: string;
  const fixtures: Array<{ groupId: string; productId: string }> = [];
  const admin = { username: "synthetic-addition-admin", admin: true };
  beforeAll(async () => {
    identity.username = `addition-test-${randomUUID()}`;
    store = await import("@workspace/db");
    batches = await import("./supplier-batches");
    await store.db.insert(store.accountsTable).values({ telegramUsername: identity.username, country: "Italy" });
    const { default: router } = await import("../routes/orders");
    const { halfKitProtection } = await import("../middleware/half-kit-protection");
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.cookies = { account_session: "synthetic" }; next(); });
    app.use("/api", halfKitProtection, router);
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status ?? 409).json({ error: error.message }));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (!store) return;
    for (const f of fixtures) await store.db.transaction(async (tx: any) => {
      await tx.delete(store.telegramMessageLogsTable).where(sql`${store.telegramMessageLogsTable.eventKey} IN
        (SELECT 'supplier-ready:' || id FROM gb_supplier_events WHERE group_buy_id = ${f.groupId})`);
      await tx.delete(store.auditLogsTable).where(sql`${store.auditLogsTable.metadata}->>'groupBuyId' = ${f.groupId}`);
      await tx.delete(store.gbSupplierAllocationsTable).where(sql`${store.gbSupplierAllocationsTable.batchId} IN
        (SELECT id FROM gb_supplier_batches WHERE group_buy_id = ${f.groupId})`);
      await tx.delete(store.creditTransactionsTable).where(eq(store.creditTransactionsTable.accountUsername, identity.username));
      await tx.delete(store.couponCodesTable).where(eq(store.couponCodesTable.groupBuyId, f.groupId));
      await tx.delete(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.groupId));
      await tx.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, f.groupId));
      await tx.delete(store.productsTable).where(eq(store.productsTable.id, f.productId));
    });
    await store.db.delete(store.accountsTable).where(eq(store.accountsTable.telegramUsername, identity.username));
  });
  async function fixture(state: "prepared" | "ordered" | "released" | "legacy" | "unbatched" = "prepared") {
    const groupId = randomUUID(), productId = randomUUID(), parentId = randomUUID();
    fixtures.push({ groupId, productId });
    await store.db.insert(store.groupBuysTable).values({
      id: groupId, name: "Synthetic addition test", status: "active", currency: "USD", organiserCanEditStatus: true,
    });
    await store.db.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: identity.username, groupBuyId: groupId });
    await store.db.insert(store.productsTable).values({ id: productId, name: "Synthetic canonical product", price: "10" });
    await store.db.insert(store.groupBuyProductsTable).values({ groupBuyId: groupId, productId, id: randomUUID() });
    await store.db.insert(store.ordersTable).values({
      id: parentId, code: `synthetic-${parentId}`, telegramUsername: `@${identity.username}`, groupBuyId: groupId,
      deliveryMethod: "Synthetic delivery", deliveryMethodId: "synthetic", shippingCountry: "Italy",
      shippingName: "Synthetic Member", shippingAddress: "Synthetic address", reshipperUsername: "synthetic-reshipper",
      routingType: "reshipper", productSubtotal: "100", grandTotal: "115", deliveryPrice: "5", vendorShipping: "10",
      paymentStatus: "confirmed", paymentConfirmedAt: new Date("2026-01-01T00:00:00Z"), paymentTxHash: "synthetic-payment-proof",
      paymentTxHashes: ["synthetic-additional-proof"], paymentUsdAmount: "115", paymentCryptoNetwork: "ethereum",
      refundStatus: "none", batchLocked: state === "legacy",
    });
    await store.db.insert(store.orderLineItemsTable).values({
      id: randomUUID(), orderId: parentId, productId, productName: "Synthetic canonical product",
      quantity: "10", unitPrice: "10", lineTotal: "100",
    });
    const configured = await batches.saveSupplierConfig(groupId, admin, { expectedVersion: 0,
      config: { enabled: true, telegramAlerts: false, regions: [{ id: "eu", name: "EU", countries: ["IT"], targetKits: 10 }] } });
    let batch: any;
    if (["prepared", "ordered", "released"].includes(state)) {
      batch = (await batches.confirmSupplierBatch(groupId, admin, { regionId: "eu", token: configured.proposals[0].token })).batches[0];
      if (state === "ordered") await batches.orderSupplierBatch(groupId, batch.id, admin, { confirm: true });
      if (state === "released") await batches.releaseSupplierBatch(groupId, batch.id, admin, { confirm: true, reason: "Synthetic release" });
    }
    const body = {
      telegramUsername: `@${identity.username}`, groupBuyId: "stale-browser-group", deliveryMethodId: "synthetic",
      additionOfOrderId: parentId, additionRequestId: randomUUID(), shippingCountry: "Italy",
      shippingAddress: "Do not trust client address", vendorShipping: 999,
      lineItems: [{ productId, productName: "Client name", quantity: 2, unitPrice: 0.01 }],
    };
    return { groupId, productId, parentId, batch, body, configured };
  }
  async function submit(body: any, username?: string) {
    const response = await fetch(`${base}/orders`, { method: "POST",
      headers: { "content-type": "application/json", ...(username ? { "x-test-owner": username } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() as Record<string, any> };
  }
  async function snapshot(f: any) {
    return {
      order: (await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.parentId)))[0],
      lines: await store.db.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, f.parentId)),
      allocations: await store.db.select().from(store.gbSupplierAllocationsTable).where(eq(store.gbSupplierAllocationsTable.orderId, f.parentId)),
      batches: await store.db.select().from(store.gbSupplierBatchesTable).where(eq(store.gbSupplierBatchesTable.groupBuyId, f.groupId)),
    };
  }
  it.each(["prepared", "ordered", "legacy"] as const)("creates an independent payable order for %s parents without changing any original field", async state => {
    const f = await fixture(state), before = await snapshot(f);
    const result = await submit(f.body);
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data).toMatchObject({
      additionOutcome: "separate", mergedIntoExistingOrder: false, additionOfOrderId: f.parentId,
      grandTotal: 20, productSubtotal: 20, paymentStatus: "unpaid", deliveryPrice: 0, vendorShipping: 0,
      shippingAddress: "Synthetic address", batchLocked: false, status: "Submitted",
      paymentTxHash: null, testPaymentTxHash: null,
    });
    expect(result.data.id).not.toBe(f.parentId);
    expect(result.data.code).not.toBe(before.order.code);
    expect(result.data.lineItems).toHaveLength(1);
    expect(result.data.lineItems[0]).toMatchObject({ quantity: 2, unitPrice: 10, productName: "Synthetic canonical product" });
    expect(await snapshot(f)).toEqual(before);
    const [child] = await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.id, result.data.id));
    for (const key of ["paymentTxHashes", "paymentUsdAmount", "paymentConfirmedAt", "refundStatus", "batchLockedAt", "trackingNumber", "balanceTxHash"]) expect(child[key]).toBeNull();
    expect(await store.db.select().from(store.gbSupplierAllocationsTable).where(eq(store.gbSupplierAllocationsTable.orderId, child.id))).toEqual([]);
    expect((await batches.supplierData(f.groupId, admin)).proposals[0].orders).toEqual([]);
    await store.db.update(store.ordersTable).set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date() }).where(eq(store.ordersTable.id, child.id));
    const queued = await batches.supplierData(f.groupId, admin);
    expect(queued.proposals[0].orders.map((o: any) => o.id)).toContain(child.id);
  });
  it.each(["unbatched", "released"] as const)("retains merge and incremental balance for %s parents", async state => {
    const f = await fixture(state);
    const result = await submit(f.body);
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data).toMatchObject({ id: f.parentId, additionOutcome: "merged", mergedIntoExistingOrder: true,
      grandTotal: 135, amountDue: 20, paymentStatus: "confirmed", paymentTxHash: "synthetic-payment-proof" });
    expect(result.data.lineItems[0].quantity).toBe(12);
    expect(await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.groupId))).toHaveLength(1);
  });
  it("replays duplicate requests, rejects changed reuse and serializes independent concurrent additions", async () => {
    const f = await fixture();
    const results = await Promise.all([submit(f.body), submit(f.body)]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(results[0].data.id).toBe(results[1].data.id);
    const reused = await submit({ ...f.body, tip: 1 });
    expect(reused.status).toBe(409);
    const next = await Promise.all([submit({ ...f.body, additionRequestId: randomUUID() }), submit({ ...f.body, additionRequestId: randomUUID() })]);
    expect(new Set(next.map(r => r.data.code)).size).toBe(2);
    expect(await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.groupId))).toHaveLength(4);
  });
  it("replays merged requests without adding a second balance", async () => {
    const f = await fixture("unbatched");
    const results = await Promise.all([submit(f.body), submit(f.body)]);
    expect(results.every(r => r.data.amountDue === 20)).toBe(true);
    expect((await snapshot(f)).order.grandTotal).toBe("135.00");
  });
  it("uses credits only on the child, settles it with its own date, and never spends again on replay", async () => {
    const f = await fixture(), before = await snapshot(f);
    await store.db.update(store.groupBuysTable).set({ allowCredits: true }).where(eq(store.groupBuysTable.id, f.groupId));
    await store.db.update(store.accountsTable).set({ credits: 50 }).where(eq(store.accountsTable.telegramUsername, identity.username));
    const body = { ...f.body, creditsApplied: 20 };
    const result = await submit(body);
    expect(result.data).toMatchObject({ paymentStatus: "confirmed", creditsApplied: 20, grandTotal: 20 });
    expect(await snapshot(f)).toEqual(before);
    const replay = await submit(body);
    expect(replay.data.id).toBe(result.data.id);
    const [account] = await store.db.select().from(store.accountsTable).where(eq(store.accountsTable.telegramUsername, identity.username));
    expect(Number(account.credits)).toBe(30);
    const ledger = await store.db.select().from(store.creditTransactionsTable).where(eq(store.creditTransactionsTable.orderId, result.data.id));
    expect(ledger).toHaveLength(1);
    expect((await batches.supplierData(f.groupId, admin)).proposals[0].orders.map((o: any) => o.id)).toContain(result.data.id);
  });
  it("rolls back a child, line items, credits and submission key when saving fails", async () => {
    const f = await fixture(), before = await snapshot(f);
    await store.db.update(store.groupBuysTable).set({ allowCredits: true }).where(eq(store.groupBuysTable.id, f.groupId));
    await store.db.update(store.accountsTable).set({ credits: 50 }).where(eq(store.accountsTable.telegramUsername, identity.username));
    failure.failRecord = true;
    let result;
    try { result = await submit({ ...f.body, creditsApplied: 20 }); } finally { failure.failRecord = false; }
    expect(result.status).toBe(409);
    expect(await snapshot(f)).toEqual(before);
    expect(await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.groupId))).toHaveLength(1);
    const [account] = await store.db.select().from(store.accountsTable).where(eq(store.accountsTable.telegramUsername, identity.username));
    expect(Number(account.credits)).toBe(50);
    const retry = await submit({ ...f.body, creditsApplied: 20 });
    expect(retry.data.additionOutcome).toBe("separate");
  });
  it("redeems coupons once and replays even after the successful order exhausts stock and coupon uses", async () => {
    const f = await fixture();
    const couponId = randomUUID(), couponCode = `ADDITION-${couponId}`.toUpperCase();
    await store.db.insert(store.couponCodesTable).values({ id: couponId, code: couponCode,
      groupBuyId: f.groupId, discountType: "fixed", discountValue: "5", maxUses: 1, maxUsesPerAccount: 1 });
    await store.db.update(store.groupBuyProductsTable).set({ stockOverride: "12" }).where(and(
      eq(store.groupBuyProductsTable.groupBuyId, f.groupId), eq(store.groupBuyProductsTable.productId, f.productId)));
    const body = { ...f.body, couponCode, couponDiscountQuoted: 5 };
    const result = await submit(body);
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data).toMatchObject({ grandTotal: 15, productSubtotal: 20 });
    expect((await submit(body)).data.id).toBe(result.data.id);
    const [coupon] = await store.db.select().from(store.couponCodesTable).where(eq(store.couponCodesTable.id, couponId));
    expect(coupon.usageCount).toBe(1);
    expect(await store.db.select().from(store.couponRedemptionsTable).where(eq(store.couponRedemptionsTable.orderId, result.data.id))).toHaveLength(1);
    const denied = await submit({ ...f.body, additionRequestId: randomUUID() });
    expect(denied.status).toBe(409);
    expect(await store.db.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, f.groupId))).toHaveLength(2);
  });
  it("does not alter the parent's outstanding balance or previous balance evidence on split", async () => {
    const f = await fixture();
    await store.db.update(store.ordersTable).set({ amountDue: "7", balancePaymentStatus: "unpaid",
      balanceTxHash: "synthetic-old-balance-proof" }).where(eq(store.ordersTable.id, f.parentId));
    const before = await snapshot(f);
    expect((await submit(f.body)).data.additionOutcome).toBe("separate");
    expect(await snapshot(f)).toEqual(before);
  });
  it("authorizes the parent and exposes only an advisory outcome, independent of member batch visibility", async () => {
    const f = await fixture();
    const own = await fetch(`${base}/orders/${f.parentId}/addition-eligibility`);
    expect(await own.json()).toEqual({ additionOutcome: "separate" });
    const other = await fetch(`${base}/orders/${f.parentId}/addition-eligibility`, { headers: { "x-test-owner": "intruder" } });
    expect(other.status).toBe(404);
    expect((await submit(f.body, "intruder")).status).toBe(400);
  });
  it.each([{ balancePaymentStatus: "verifying" }, { balancePaymentStatus: "pending_confirmation" }, { refundStatus: "requested" },
    { paymentStatus: "unpaid" }, { status: "Cancelled" }, { deletedAt: new Date() }])("rejects unsafe parents %j without writing", async change => {
    const f = await fixture();
    await store.db.update(store.ordersTable).set(change).where(eq(store.ordersTable.id, f.parentId));
    const before = await snapshot(f);
    expect((await submit(f.body)).status).toBeGreaterThanOrEqual(400);
    expect(await snapshot(f)).toEqual(before);
  });
  it("honours a stale unbatched advisory when confirmation wins the shared mutex", async () => {
    const f = await fixture("unbatched");
    expect(await (await fetch(`${base}/orders/${f.parentId}/addition-eligibility`)).json()).toEqual({ additionOutcome: "merged" });
    await batches.confirmSupplierBatch(f.groupId, admin, { regionId: "eu", token: f.configured.proposals[0].token });
    expect((await submit({ ...f.body, additionOutcome: "merged" })).data.additionOutcome).toBe("separate");
  });
  it("serializes addition and batch confirmation: either split or stale preview, never changes a committed snapshot", async () => {
    const f = await fixture("unbatched");
    const [addition, confirmation] = await Promise.all([
      submit(f.body),
      batches.confirmSupplierBatch(f.groupId, admin, { regionId: "eu", token: f.configured.proposals[0].token })
        .then((value: any) => ({ value }), (error: any) => ({ error })),
    ]);
    expect(addition.status).toBe(200);
    if ("value" in confirmation) {
      expect(addition.data.additionOutcome).toBe("separate");
      expect(confirmation.value.batches[0].snapshot.kits).toBe(10);
      expect((await snapshot(f)).order.grandTotal).toBe("115.00");
    } else {
      expect(addition.data.additionOutcome).toBe("merged");
      expect(confirmation.error.status).toBe(409);
      expect((await snapshot(f)).batches).toEqual([]);
    }
  });
  it("holds the monetary mutex throughout an addition, so concurrent confirmation must reject the old preview", async () => {
    const f = await fixture("unbatched");
    let resume!: () => void, reached!: () => void;
    failure.resume = new Promise<void>(resolve => { resume = resolve; });
    const reachedLock = new Promise<void>(resolve => { reached = resolve; });
    failure.locked = reached;
    const addition = submit(f.body);
    await reachedLock;
    const confirmation = batches.confirmSupplierBatch(f.groupId, admin, { regionId: "eu", token: f.configured.proposals[0].token })
      .then((value: any) => ({ value }), (error: any) => ({ error }));
    try {
      // Another DB connection cannot acquire the shared lock until submission commits.
      const lock = await store.db.transaction(async (tx: any) => {
        const result = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${`half-kit-money:${f.groupId}`},0)) AS acquired`);
        return result.rows[0].acquired;
      });
      expect(lock).toBe(false);
    } finally { failure.resume = null; failure.locked = null; resume(); }
    expect((await addition).data.additionOutcome).toBe("merged");
    expect((await confirmation).error.status).toBe(409);
  });
});

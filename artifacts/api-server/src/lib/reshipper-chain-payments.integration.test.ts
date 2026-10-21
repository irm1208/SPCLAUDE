import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { payoutLedgerKey, payoutReferenceKey } from "./reshipper-payout-rules";
const chain = vi.hoisted(() => ({ prepare: vi.fn(), verify: vi.fn(), broadcast: vi.fn() }));
vi.mock("./payout-chain-provider", async original => ({
  ...await original<typeof import("./payout-chain-provider")>(),
  prepareChainTransaction: chain.prepare, verifyChainIntent: chain.verify, broadcastChainTransaction: chain.broadcast,
}));
describe.skipIf(process.env.RUN_PAYOUT_DB_TESTS !== "1")("connected payouts — development DB with simulated blockchain", () => {
  let tables: typeof import("@workspace/db"), service: typeof import("./reshipper-payouts"), connected: typeof import("./reshipper-chain-payments");
  const prefix = `chain_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const username = `${prefix}_r`, gb = `${prefix}_gb`, ids = [1, 2, 3].map(n => `${prefix}_${n}`);
  const sender = `0x${randomUUID().replaceAll("-", "")}aaaaaaaa`, address = `0x${"b".repeat(40)}`;
  const hashes = [1, 2].map(() => `0x${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`);
  const wallet = { address, network: "ERC-20", currency: "USDC" };
  const body = (n: number) => ({ operationId: randomUUID(), sender, currency: "USD", allocations: [{ orderId: ids[n], adminFee: "15.00", postage: "20.00" }] });
  let accountId = "";
  beforeAll(async () => {
    if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("Development only.");
    tables = await import("@workspace/db"); service = await import("./reshipper-payouts"); connected = await import("./reshipper-chain-payments");
    const { db, accountsTable, groupBuysTable, gbReshippersTable, ordersTable } = tables;
    await db.insert(accountsTable).values({ telegramUsername: username, reshipperStatus: "approved" });
    await db.insert(groupBuysTable).values({ id: gb, name: prefix, currency: "USD" });
    await db.insert(gbReshippersTable).values({ id: `${prefix}_a`, gbId: gb, reshipperUsername: username, country: "US" });
    await db.insert(ordersTable).values(ids.map(id => ({
      id, code: id, telegramUsername: "fixture-member", groupBuyId: gb, reshipperUsername: username,
      deliveryMethod: "US delivery", deliveryPrice: "20.00", adminFee: "15.00", productSubtotal: "100.00", grandTotal: "135.00",
      paymentStatus: "confirmed", amountDue: "0.00", routingType: "reshipper", status: "Submitted",
    })));
    await service.saveReshipperPayoutWallet(username, gb, wallet, "fixture-admin");
    const [a] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, username)); accountId = a.reshipperPayoutId!;
    await service.reviewReshipperFees(username, gb, { reason: "Collected by Admin", orders: ids.map(orderId => ({ orderId, collector: "admin", adminFee: "15.00", postage: "20.00" })) }, "fixture-admin");
    chain.prepare.mockImplementation(async () => ({ from: sender, nonce: "0x1" }));
    chain.verify.mockResolvedValue({ state: "pending", reason: "Waiting for confirmations" });
    chain.broadcast.mockResolvedValue(undefined);
  }, 30000);
  afterAll(async () => {
    if (!tables) return;
    const { db, siteConfigTable, ordersTable, gbReshippersTable, groupBuysTable, accountsTable, pool } = tables;
    try {
      await db.delete(siteConfigTable).where(inArray(siteConfigTable.key, [payoutLedgerKey(gb), `reshipper_payout_wallet:v1:${accountId}`,
        `reshipper_chain_nonce:v1:1:${sender.toLowerCase()}:0x1`, ...hashes.map(payoutReferenceKey), ...ids.map(id => `reshipper_payout_order_owner:v1:${id}`)]));
      await db.delete(ordersTable).where(inArray(ordersTable.id, ids));
      await db.delete(gbReshippersTable).where(eq(gbReshippersTable.gbId, gb));
      await db.delete(groupBuysTable).where(eq(groupBuysTable.id, gb));
      await db.delete(accountsTable).where(eq(accountsTable.telegramUsername, username));
    } finally { await pool.end(); }
  }, 30000);
  it("reserves once under concurrent prepare; confirms once and shares a private, immutable receipt", async () => {
    const input = body(0);
    await Promise.all([connected.prepareReshipperChainPayment(username, gb, input, "fixture-admin"), connected.prepareReshipperChainPayment(username, gb, input, "fixture-admin")]);
    let result = await service.readReshipperPayouts(username, gb, true);
    expect(result.chainPayments).toHaveLength(1);
    expect(result.orders.find(o => o.orderId === ids[0])).toMatchObject({ eligible: false, pendingPayoutId: input.operationId });
    await expect(connected.prepareReshipperChainPayment(username, gb, { ...input, operationId: randomUUID() }, "fixture-admin")).rejects.toThrow(/pending/);
    await connected.approveReshipperChainPayment(username, gb, input.operationId, "fixture-admin");
    await connected.submitReshipperChainPayment(username, gb, input.operationId, { txid: hashes[0] }, "fixture-admin");
    result = await service.readReshipperPayouts(username, gb, true);
    expect(result.payouts).toHaveLength(0);
    expect(result.chainPayments[0].state).toBe("broadcast");
    await expect(connected.cancelReshipperChainPayment(username, gb, input.operationId, "fixture-admin")).rejects.toThrow(/already have been sent/);
    await service.saveReshipperPayoutWallet(username, gb, { address: sender, network: "Polygon", currency: "USDT" }, "fixture-admin");
    // Once approval began, a member cancellation must not erase money actually sent to the reshipper.
    await tables.db.update(tables.ordersTable).set({ status: "Cancelled" }).where(eq(tables.ordersTable.id, ids[0]));
    chain.verify.mockResolvedValue({ state: "confirmed", reason: "Exact payment confirmed" });
    await Promise.all([connected.checkReshipperChainPayment(username, gb, input.operationId, "fixture-admin"), connected.checkReshipperChainPayment(username, gb, input.operationId, "fixture-admin")]);
    const ownerView = await service.readReshipperPayouts(username, gb), adminView = await service.readReshipperPayouts(username, gb, true);
    expect(ownerView.payouts).toHaveLength(1); expect(ownerView.payouts).toEqual(adminView.payouts);
    expect(ownerView.payouts[0]).toMatchObject({ destination: address, network: "ERC-20", token: "USDC", tokenUnits: "35000000", chainVerified: true, amountMinor: 3500 });
    expect(ownerView.chainPayments[0]).not.toHaveProperty("transaction");
    expect(ownerView.chainPayments[0]).not.toHaveProperty("sender");
    expect(ownerView.chainPayments[0]).not.toHaveProperty("signedRaw");
    await expect(service.voidReshipperPayout(username, gb, input.operationId, "Attempt to undo real money", "fixture-admin")).rejects.toThrow(/cannot be undone/);
  });
  it("allows cancellation before approval and refuses to approve an order that is no longer payable", async () => {
    await service.saveReshipperPayoutWallet(username, gb, wallet, "fixture-admin");
    // A new on-chain nonce after the confirmed first transaction.
    chain.prepare.mockImplementation(async () => ({ from: sender, nonce: "0x2" }));
    const input = body(1);
    await connected.prepareReshipperChainPayment(username, gb, input, "fixture-admin");
    await tables.db.update(tables.ordersTable).set({ amountDue: "1.00" }).where(eq(tables.ordersTable.id, ids[1]));
    await expect(connected.approveReshipperChainPayment(username, gb, input.operationId, "fixture-admin")).rejects.toThrow();
    const cancelled = await connected.cancelReshipperChainPayment(username, gb, input.operationId, "fixture-admin");
    expect(cancelled.chainPayments[0].state).toBe("cancelled");
    await tables.db.update(tables.ordersTable).set({ amountDue: "0.00" }).where(eq(tables.ordersTable.id, ids[1]));
    expect((await service.readReshipperPayouts(username, gb)).orders.find(o => o.orderId === ids[1])?.eligible).toBe(true);
    await tables.db.delete(tables.siteConfigTable).where(eq(tables.siteConfigTable.key, `reshipper_chain_nonce:v1:1:${sender.toLowerCase()}:0x2`));
  });
  it("holds fees on provider failure and releases them only on a confirmed revert", async () => {
    chain.prepare.mockImplementation(async () => ({ from: sender, nonce: "0x3" }));
    const input = body(2);
    await connected.prepareReshipperChainPayment(username, gb, input, "fixture-admin");
    await connected.approveReshipperChainPayment(username, gb, input.operationId, "fixture-admin");
    chain.verify.mockRejectedValueOnce(new Error("RPC down"));
    await connected.submitReshipperChainPayment(username, gb, input.operationId, { txid: hashes[1] }, "fixture-admin");
    expect((await service.readReshipperPayouts(username, gb)).orders.find(o => o.orderId === ids[2])?.eligible).toBe(false);
    chain.verify.mockResolvedValue({ state: "failed", reason: "Confirmed revert" });
    await connected.checkReshipperChainPayment(username, gb, input.operationId, "fixture-admin");
    const after = await service.readReshipperPayouts(username, gb);
    expect(after.orders.find(o => o.orderId === ids[2])?.eligible).toBe(true);
    expect(after.payouts).toHaveLength(1);
    await tables.db.delete(tables.siteConfigTable).where(eq(tables.siteConfigTable.key, `reshipper_chain_nonce:v1:1:${sender.toLowerCase()}:0x3`));
  });
});

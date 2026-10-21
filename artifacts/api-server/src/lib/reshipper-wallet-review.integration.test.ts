import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { payoutLedgerKey, payoutReferenceKey } from "./reshipper-payout-rules";

const chain = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("./payment-verify", async original => ({
  ...await original<typeof import("./payment-verify")>(), verifyTransaction: chain.verify,
}));

describe.skipIf(process.env.RUN_PAYOUT_DB_TESTS !== "1")("automatic payout collection — development DB, simulated chain evidence", () => {
  let tables: typeof import("@workspace/db");
  let service: typeof import("./reshipper-payouts");
  const prefix = `wallet_check_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const username = `${prefix}_r`, gb = `${prefix}_gb`, gb2 = `${prefix}_gb2`, ids = [1, 2, 3, 4, 5].map(n => `${prefix}_${n}`);
  const payoutTxid = `0x${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
  const adminAddress = `0x${"a".repeat(40)}`, reshipperAddress = `0x${"b".repeat(40)}`;
  const hashes = [1, 2, 3, 4, 6].map(n => `0x${String(n).repeat(64)}`);
  const declaration = (collector: "admin" | "reshipper") => ({
    collector, network: "ERC-20", address: collector === "admin" ? adminAddress : reshipperAddress,
    effectiveFrom: "2020-01-01T00:00:00.000Z", effectiveUntil: null, confirmed: true,
  });
  let initialOrders: unknown;
  beforeAll(async () => {
    if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("Development only.");
    tables = await import("@workspace/db"); service = await import("./reshipper-payouts");
    const { db, accountsTable, groupBuysTable, gbReshippersTable, ordersTable } = tables;
    await db.insert(accountsTable).values({ telegramUsername: username, reshipperStatus: "approved" });
    await db.insert(groupBuysTable).values({ id: gb, name: prefix, currency: "USD" });
    await db.insert(groupBuysTable).values({ id: gb2, name: `${prefix} second`, currency: "USD" });
    await db.insert(gbReshippersTable).values({ id: `${prefix}_assignment`, gbId: gb, reshipperUsername: username, country: "DE" });
    await db.insert(gbReshippersTable).values({ id: `${prefix}_assignment2`, gbId: gb2, reshipperUsername: username, country: "DE" });
    await db.insert(ordersTable).values(ids.map((id, i) => ({
      id, code: id, telegramUsername: "test-member", groupBuyId: gb, reshipperUsername: username,
      deliveryMethod: "Test home delivery", deliveryPrice: "20.00", adminFee: "15.00",
      productSubtotal: "100.00", grandTotal: "135.00", paymentStatus: "confirmed", amountDue: "0.00",
      routingType: "reshipper", status: "Submitted", paymentTxHash: hashes[i],
      paymentTxHashes: i === 2 ? [`0x${"5".repeat(64)}`] : null,
      paymentCryptoNetwork: "ERC-20", paymentCryptoCurrency: "USDT", paymentUsdAmount: "135.00",
      paymentCryptoRate: "1.00", paymentConfirmedAt: new Date("2026-10-01"),
    })));
    initialOrders = await db.select().from(ordersTable).where(inArray(ordersTable.id, ids)).orderBy(ordersTable.id);
    chain.verify.mockImplementation(async (txid: string, address: string) => {
      const target = txid === hashes[1] ? reshipperAddress : adminAddress;
      return address === target ? { verified: true, amountUsdt: 135, recipientAddress: target, blockConfirmations: 5 }
        : { verified: false, reason: "Wrong wallet" };
    });
    await service.saveCollectionWallet(username, gb, declaration("admin"), "Admin-test");
    await service.saveCollectionWallet(username, gb, declaration("reshipper"), "Admin-test");
  }, 30000);
  afterAll(async () => {
    if (!tables) return;
    const { db, ordersTable, groupBuysTable, gbReshippersTable, accountsTable, siteConfigTable, pool } = tables;
    try {
      const [account] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, username));
      await db.delete(siteConfigTable).where(inArray(siteConfigTable.key, [payoutLedgerKey(gb), payoutLedgerKey(gb2),
        `reshipper_payout_wallet:v1:${account?.reshipperPayoutId}`, payoutReferenceKey(payoutTxid), ...ids.map(id => `reshipper_payout_order_owner:v1:${id}`)]));
      await db.delete(ordersTable).where(inArray(ordersTable.id, ids));
      await db.delete(gbReshippersTable).where(inArray(gbReshippersTable.gbId, [gb, gb2]));
      await db.delete(groupBuysTable).where(inArray(groupBuysTable.id, [gb, gb2]));
      await db.delete(accountsTable).where(eq(accountsTable.telegramUsername, username));
    } finally { await pool.end(); }
  }, 30000);
  it("persists Admin/reshipper classifications and holds split payments without changing customer orders", async () => {
    // Two tabs checking the same orders cannot create duplicate entitlements.
    await Promise.all([
      service.checkReshipperCollectionWallets(username, gb, { orderIds: ids.slice(0, 3) }, "Admin-test"),
      service.checkReshipperCollectionWallets(username, gb, { orderIds: ids.slice(0, 3) }, "Admin-test"),
    ]);
    const checked = await service.readReshipperPayouts(username, gb, true);
    expect(checked.orders.find(o => o.orderId === ids[0])).toMatchObject({ collector: "admin", status: "owed", remainingAdminMinor: 1500, remainingPostageMinor: 2000 });
    expect(checked.orders.find(o => o.orderId === ids[1])).toMatchObject({ collector: "reshipper", status: "not_owed" });
    expect(checked.orders.find(o => o.orderId === ids[2])).toMatchObject({ status: "needs_review", eligible: false });
    const reloaded = await service.readReshipperPayouts(username, gb, true);
    expect(reloaded.orders.find(o => o.orderId === ids[0])?.collectionEvidence?.address).toBe(adminAddress);
    const privateView = await service.readReshipperPayouts(username, gb);
    expect(privateView).not.toHaveProperty("collectionWallets");
    expect(privateView.orders.every(o => !("collectionEvidence" in o) && !("paymentTxids" in o))).toBe(true);
    const { db, ordersTable } = tables;
    expect(await db.select().from(ordersTable).where(inArray(ordersTable.id, ids)).orderBy(ordersTable.id)).toEqual(initialOrders);
    const calls = chain.verify.mock.calls.length;
    await service.checkReshipperCollectionWallets(username, gb, { orderIds: ids.slice(0, 2) }, "Admin-test");
    expect(chain.verify.mock.calls.length).toBe(calls);
    const ledger = await db.select().from(tables.siteConfigTable).where(eq(tables.siteConfigTable.key, payoutLedgerKey(gb)));
    expect(JSON.parse(ledger[0].value!).audit.filter((entry: { action: string }) => entry.action === "automatic_wallet_review")).toHaveLength(2);
  });
  it("reuses a saved payout wallet across group buys and preserves one bulk receipt for both sides after wallet changes", async () => {
    await expect(service.saveReshipperPayoutWallet(username, gb, { address: "bad", network: "ERC-20" }, "Admin-test")).rejects.toThrow("valid wallet");
    const wallet = { address: reshipperAddress, network: "ERC-20" };
    await service.saveReshipperPayoutWallet(username, gb, wallet, "Admin-test");
    expect((await service.readReshipperPayouts(username, gb2, true)).payoutWallet).toEqual(wallet);
    await service.checkReshipperCollectionWallets(username, gb, { orderIds: [ids[4]] }, "Admin-test");
    const payload = { operationId: randomUUID(), amount: "70.00", currency: "USD",
      paidAt: new Date().toISOString().slice(0, 10), method: "crypto", reference: payoutTxid,
      destination: wallet.address, network: wallet.network, confirmedDestination: true,
      allocations: [ids[0], ids[4]].map(orderId => ({ orderId, adminFee: "15.00", postage: "20.00" })),
    };
    await service.recordReshipperPayout(username, gb, payload, "Admin-test");
    await service.recordReshipperPayout(username, gb, payload, "Admin-test"); // Retry, not a second payout.
    await service.saveReshipperPayoutWallet(username, gb, { address: adminAddress, network: "Polygon" }, "Admin-test");
    const memberView = await service.readReshipperPayouts(username, gb);
    const adminView = await service.readReshipperPayouts(username, gb, true);
    expect(memberView.payouts).toHaveLength(1);
    expect(memberView.payouts).toEqual(adminView.payouts);
    expect(memberView.payouts[0]).toMatchObject({ amountMinor: 7000, network: "ERC-20", destination: reshipperAddress, reference: payoutTxid });
    expect(memberView.payouts[0].allocations.map(a => a.orderId).sort()).toEqual([ids[0], ids[4]].sort());
    expect(memberView.payoutWallet).toEqual({ address: adminAddress, network: "Polygon" });
    expect(memberView.orders.filter(o => [ids[0], ids[4]].includes(o.orderId)).every(o => o.status === "paid" && !o.eligible)).toBe(true);
  });
  it("lets a reshipper update their wallet without exposing Admin evidence, and rejects disabled assignments", async () => {
    const wallet = { address: reshipperAddress, network: "ERC-20" };
    const before = await service.readReshipperPayouts(username, gb);
    const saved = await service.saveReshipperPayoutWallet(username, gb, wallet, `reshipper:${username}`, false);
    expect(saved.payoutWallet).toEqual(wallet);
    expect(saved).not.toHaveProperty("collectionWallets");
    expect(saved.orders.every(o => !("collectionEvidence" in o) && !("paymentTxids" in o))).toBe(true);
    expect(saved.payouts).toEqual(before.payouts);
    expect((await service.readReshipperPayouts(username, gb, true)).payoutWallet).toEqual(wallet);
    await tables.db.update(tables.gbReshippersTable).set({ enabled: false }).where(eq(tables.gbReshippersTable.gbId, gb2));
    await expect(service.saveReshipperPayoutWallet(username, gb2, wallet, `reshipper:${username}`, false)).rejects.toMatchObject({ status: 403 });
    expect((await service.readReshipperPayouts(username, gb2)).canManagePayoutWallet).toBe(false);
    expect((await service.readReshipperPayouts(username, gb)).payoutWallet).toEqual(wallet);
  });
  it("rejects changes made while the chain check is in flight", async () => {
    let release!: () => void, started!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    const begin = new Promise<void>(resolve => { started = resolve; });
    chain.verify.mockImplementation(async (_txid: string, address: string) => {
      started(); await wait;
      return address === adminAddress ? { verified: true, amountUsdt: 135, recipientAddress: adminAddress }
        : { verified: false, reason: "Wrong wallet" };
    });
    const checking = service.checkReshipperCollectionWallets(username, gb, { orderIds: [ids[3]] }, "Admin-test");
    await begin;
    await tables.db.update(tables.ordersTable).set({ amountDue: "10.00" }).where(eq(tables.ordersTable.id, ids[3]));
    release();
    const result = await checking;
    expect(result.walletCheckResults[0]).toMatchObject({ collector: null });
    expect(result.walletCheckResults[0].reason).toContain("changed");
    const ledger = await tables.db.select().from(tables.siteConfigTable).where(eq(tables.siteConfigTable.key, payoutLedgerKey(gb)));
    expect(JSON.parse(ledger[0].value!).entitlements[ids[3]]).toBeUndefined();
  });
  it("puts automatic entitlements on hold if a wallet declaration is withdrawn", async () => {
    const result = await service.saveCollectionWallet(username, gb, declaration("admin"), "Admin-test", true);
    expect(result.orders.find(o => o.orderId === ids[0])).toMatchObject({ status: "needs_review", eligible: false });
  });
});

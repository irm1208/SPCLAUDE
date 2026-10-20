import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { payoutLedgerKey, payoutReferenceKey } from "./reshipper-payout-rules";

// Explicitly opt-in: normal unit-test runs never connect to a database.
describe.skipIf(process.env.RUN_PAYOUT_DB_TESTS !== "1")("payout ledger — real development PostgreSQL", () => {
  let tables: typeof import("@workspace/db");
  let service: typeof import("./reshipper-payouts");
  const prefix = `payout_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const a = `${prefix}_a`, b = `${prefix}_b`, renamed = `${prefix}_renamed`;
  const gb = `${prefix}_gb`, gb2 = `${prefix}_gb2`;
  const order1 = `${prefix}_1`, order2 = `${prefix}_2`, order3 = `${prefix}_3`;
  const keys = new Set([payoutLedgerKey(gb), payoutLedgerKey(gb2),
    `reshipper_payout_order_owner:v1:${order1}`, `reshipper_payout_order_owner:v1:${order2}`, `reshipper_payout_order_owner:v1:${order3}`]);
  let initialOrders: unknown;
  const review = (id: string, fee = "10.00", postage = "20.00") => ({
    reason: "Checked actual Admin collection records", orders: [{ orderId: id, collector: "admin", adminFee: fee, postage }],
  });
  function payment(id: string, amount: string, fee: string, postage: string, reference = `${prefix}_${randomUUID()}`) {
    keys.add(payoutReferenceKey(reference));
    return {
      operationId: randomUUID(), amount, currency: "USD", paidAt: new Date().toISOString().slice(0, 10),
      method: "External transfer", reference, destination: "Confirmed test recipient", confirmedDestination: true,
      allocations: [{ orderId: id, adminFee: fee, postage }],
    };
  }
  beforeAll(async () => {
    if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("Database payout tests are development-only.");
    tables = await import("@workspace/db");
    service = await import("./reshipper-payouts");
    const { db, accountsTable, groupBuysTable, gbReshippersTable, ordersTable } = tables;
    await db.insert(accountsTable).values([
      { telegramUsername: a, reshipperStatus: "approved" }, { telegramUsername: b, reshipperStatus: "approved" },
    ]);
    await db.insert(groupBuysTable).values([{ id: gb, name: prefix, currency: "USD" }, { id: gb2, name: `${prefix} other`, currency: "EUR" }]);
    await db.insert(gbReshippersTable).values([
      { id: `${prefix}_as1`, gbId: gb, reshipperUsername: a, country: "DE" },
      { id: `${prefix}_as2`, gbId: gb, reshipperUsername: b, country: "IT" },
      { id: `${prefix}_as3`, gbId: gb2, reshipperUsername: a, country: "DE" },
    ]);
    await db.insert(ordersTable).values([order1, order2].map(id => ({
      id, code: id, telegramUsername: "test-member", groupBuyId: gb, reshipperUsername: a,
      deliveryMethod: "Test home delivery", deliveryPrice: "20.00", adminFee: "10.00",
      productSubtotal: "100.00", vendorShipping: "500.00", grandTotal: "630.00",
      paymentStatus: "confirmed", amountDue: "0.00", routingType: "reshipper", status: "Submitted",
    })));
    initialOrders = await db.select().from(ordersTable).where(inArray(ordersTable.id, [order1, order2])).orderBy(ordersTable.id);
  }, 30000);
  afterAll(async () => {
    if (!tables) return;
    const { db, siteConfigTable, ordersTable, gbReshippersTable, groupBuysTable, accountsTable, pool } = tables;
    try {
      await db.delete(siteConfigTable).where(inArray(siteConfigTable.key, [...keys]));
      await db.delete(ordersTable).where(inArray(ordersTable.id, [order1, order2, order3]));
      await db.delete(gbReshippersTable).where(inArray(gbReshippersTable.gbId, [gb, gb2]));
      await db.delete(groupBuysTable).where(inArray(groupBuysTable.id, [gb, gb2]));
      await db.delete(accountsTable).where(inArray(accountsTable.telegramUsername, [a, b, renamed]));
    } finally { await pool.end(); }
  }, 30000);
  it("persists explicit entitlement and exact order allocations, excluding vendor shipping", async () => {
    const before = await service.readReshipperPayouts(a, gb);
    expect(before.needsReviewCount).toBe(2);
    await service.reviewReshipperFees(a, gb, review(order1), "Admin");
    const body = payment(order1, "15.00", "10.00", "5.00");
    const recorded = await service.recordReshipperPayout(a, gb, body, "Admin");
    expect(recorded.payouts[0].allocations[0]).toMatchObject({ orderId: order1, adminFeeMinor: 1000, postageMinor: 500 });
    const reloaded = await service.readReshipperPayouts(a, gb);
    expect(reloaded.totals[0]).toMatchObject({ entitledMinor: 3000, paidMinor: 1500, owedMinor: 1500 });
    await service.recordReshipperPayout(a, gb, body, "Admin");
    expect((await service.readReshipperPayouts(a, gb)).payouts).toHaveLength(1);
    expect((await service.readReshipperPayouts(b, gb)).payouts).toHaveLength(0);
    expect((await service.readReshipperPayouts(b, gb)).orders).toHaveLength(0);
  });
  it("serializes concurrent submissions and rolls back an over-allocation completely", async () => {
    const body = payment(order1, "15.00", "0.00", "15.00");
    const results = await Promise.allSettled([
      service.recordReshipperPayout(a, gb, body, "Admin"),
      service.recordReshipperPayout(a, gb, { ...body, operationId: randomUUID(), reference: `${body.reference}_other` }, "Admin"),
    ]);
    keys.add(payoutReferenceKey(`${body.reference}_other`));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const view = await service.readReshipperPayouts(a, gb);
    expect(view.orders.find(o => o.orderId === order1)?.status).toBe("paid");
    expect(view.totals[0].paidMinor).toBe(3000);
    expect(view.payouts).toHaveLength(2);
  });
  it("supports direct-payment review, corrections, and source-specific history without changing customer orders", async () => {
    await service.reviewReshipperFees(a, gb, {
      reason: "Postage and admin fee already received by reshipper",
      orders: [{ orderId: order2, collector: "reshipper", adminFee: "10", postage: "20" }],
    }, "Admin");
    const view = await service.readReshipperPayouts(a, gb);
    expect(view.orders.find(o => o.orderId === order2)?.status).toBe("not_owed");
    const payout = view.payouts[0];
    await service.voidReshipperPayout(a, gb, payout.id, "Allocated to wrong receipt", "Admin");
    await service.voidReshipperPayout(a, gb, payout.id, "Idempotent retry", "Admin");
    const corrected = await service.readReshipperPayouts(a, gb);
    expect(corrected.payouts.find(p => p.id === payout.id)?.voidReason).toBe("Allocated to wrong receipt");
    expect(corrected.orders.find(o => o.orderId === order1)?.remainingPostageMinor).toBe(1500);
    const { db, ordersTable } = tables;
    expect(await db.select().from(ordersTable).where(inArray(ordersTable.id, [order1, order2])).orderBy(ordersTable.id)).toEqual(initialOrders);
  });
  it("retains stable ownership across username changes and freezes later fee edits", async () => {
    const { db, accountsTable, gbReshippersTable, ordersTable } = tables;
    const [before] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, a));
    await db.transaction(async tx => {
      await tx.update(accountsTable).set({ telegramUsername: renamed }).where(eq(accountsTable.telegramUsername, a));
      await tx.update(gbReshippersTable).set({ reshipperUsername: renamed }).where(eq(gbReshippersTable.reshipperUsername, a));
      await tx.update(ordersTable).set({ reshipperUsername: renamed }).where(inArray(ordersTable.id, [order1, order2]));
    });
    const [after] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, renamed));
    expect(after.reshipperPayoutId).toBe(before.reshipperPayoutId);
    expect((await service.readReshipperPayouts(renamed, gb)).payouts).toHaveLength(2);
    expect((await service.readReshipperPayouts(renamed, gb)).orders.find(o => o.orderId === order1)?.status).toBe("part_paid");
    await db.update(ordersTable).set({ deliveryPrice: "25.00" }).where(eq(ordersTable.id, order1));
    const changed = await service.readReshipperPayouts(renamed, gb);
    expect(changed.orders.find(o => o.orderId === order1)?.status).toBe("needs_review");
    expect(changed.payouts.find(p => !p.voidedAt)?.amountMinor).toBe(1500);
    await expect(service.recordReshipperPayout(renamed, gb, payment(order1, "1.00", "0", "1.00"), "Admin")).rejects.toThrow(/review/i);
    await service.reviewReshipperFees(renamed, gb, review(order1, "10", "25"), "Admin");
  });
  it("prevents moving an order into a second group from creating a duplicate entitlement", async () => {
    const { db, ordersTable } = tables;
    await db.update(ordersTable).set({ groupBuyId: gb2 }).where(eq(ordersTable.id, order1));
    await expect(service.reviewReshipperFees(renamed, gb2, review(order1), "Admin")).rejects.toThrow(/another group/i);
    await db.update(ordersTable).set({ groupBuyId: gb }).where(eq(ordersTable.id, order1));
    expect((await service.listReshipperPayoutGroups(renamed)).groups.map(g => g.id)).toContain(gb);
    await db.delete(tables.gbReshippersTable).where(and(eq(tables.gbReshippersTable.gbId, gb), eq(tables.gbReshippersTable.reshipperUsername, renamed)));
    expect((await service.readReshipperPayouts(renamed, gb)).payouts).toHaveLength(2);
  });
  it("deduplicates a transfer reference across groups and currencies without partially saving a second payout", async () => {
    const { db, ordersTable } = tables;
    await db.insert(ordersTable).values({
      id: order3, code: order3, telegramUsername: "test-member", groupBuyId: gb2, reshipperUsername: renamed,
      deliveryMethod: "Test", deliveryPrice: "20", adminFee: "10", productSubtotal: "100", grandTotal: "130",
      paymentStatus: "confirmed", amountDue: "0", routingType: "reshipper",
    });
    await service.reviewReshipperFees(renamed, gb2, review(order3), "Admin");
    const active = (await service.readReshipperPayouts(renamed, gb)).payouts.find(p => !p.voidedAt)!;
    await expect(service.recordReshipperPayout(renamed, gb2, {
      ...payment(order3, "30", "10", "20", active.reference), currency: "EUR",
    }, "Admin")).rejects.toThrow(/reference.*already/i);
    const unchanged = await service.readReshipperPayouts(renamed, gb2);
    expect(unchanged.payouts).toHaveLength(0);
    expect(unchanged.totals[0]).toMatchObject({ currency: "EUR", owedMinor: 3000, paidMinor: 0 });
    await service.recordReshipperPayout(renamed, gb2, { ...payment(order3, "30", "10", "20"), currency: "EUR" }, "Admin");
    expect((await service.readReshipperPayouts(renamed, gb2)).totals[0]).toMatchObject({ currency: "EUR", paidMinor: 3000, owedMinor: 0 });
  });
  it("preserves a new group's reservation when correcting an old zero entitlement", async () => {
    const { db, ordersTable, siteConfigTable } = tables;
    await db.update(ordersTable).set({ groupBuyId: gb2 }).where(eq(ordersTable.id, order2));
    await service.reviewReshipperFees(renamed, gb2, review(order2), "Admin");
    await service.reviewReshipperFees(renamed, gb, review(order2, "0", "0"), "Admin");
    const [owner] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, `reshipper_payout_order_owner:v1:${order2}`));
    expect(JSON.parse(owner.value!).gbId).toBe(gb2);
  });
  it("reviews a batch and records one multi-order payout exactly once under concurrent retries", async () => {
    await service.reviewReshipperFees(renamed, gb2, {
      reason: "Confirmed collection for both orders", orders: [order2, order3].map(orderId => ({
        orderId, collector: "admin", adminFee: "10.00", postage: "20.00",
      })),
    }, "Admin");
    const existing = (await service.readReshipperPayouts(renamed, gb2)).payouts.find(p => !p.voidedAt)!;
    await service.voidReshipperPayout(renamed, gb2, existing.id, "Replace with combined receipt", "Admin");
    const { db, ordersTable } = tables;
    const before = await db.select().from(ordersTable).where(inArray(ordersTable.id, [order2, order3])).orderBy(ordersTable.id);
    const combined = {
      ...payment(order2, "45.00", "10.00", "20.00"), currency: "EUR",
      allocations: [
        { orderId: order2, adminFee: "10.00", postage: "20.00" },
        { orderId: order3, adminFee: "5.00", postage: "10.00" },
      ],
    };
    await Promise.all([
      service.recordReshipperPayout(renamed, gb2, combined, "Admin"),
      service.recordReshipperPayout(renamed, gb2, combined, "Admin"),
    ]);
    const recorded = await service.readReshipperPayouts(renamed, gb2);
    expect(recorded.payouts.filter(p => !p.voidedAt)).toHaveLength(1);
    expect(recorded.payouts[0].allocations).toHaveLength(2);
    expect(recorded.totals[0]).toMatchObject({ currency: "EUR", paidMinor: 4500, owedMinor: 1500 });
    expect(await db.select().from(ordersTable).where(inArray(ordersTable.id, [order2, order3])).orderBy(ordersTable.id)).toEqual(before);
  });
  it("upgrades a legacy accounts table additively and idempotently with a unique nullable identity", async () => {
    const migration = await readFile(new URL("../../../../lib/db/drizzle/reshipper-payout-identity.sql", import.meta.url), "utf8");
    await tables.db.transaction(async tx => {
      // Session-local shadow table: never alter or drop the real accounts table.
      await tx.execute(sql`CREATE TEMPORARY TABLE accounts (telegram_username text PRIMARY KEY) ON COMMIT DROP`);
      await tx.execute(sql`INSERT INTO accounts (telegram_username) VALUES ('legacy-member')`);
      await tx.execute(sql.raw(migration));
      await tx.execute(sql.raw(migration));
      expect((await tx.execute(sql`SELECT reshipper_payout_identity FROM accounts WHERE telegram_username = 'legacy-member'`)).rows[0])
        .toEqual({ reshipper_payout_identity: null });
      await tx.execute(sql`INSERT INTO accounts (telegram_username, reshipper_payout_identity) VALUES ('first-owner', 'unique-payout-owner')`);
      await tx.execute(sql`SAVEPOINT payout_identity_uniqueness`);
      let duplicateCode: string | undefined;
      try {
        await tx.execute(sql`INSERT INTO accounts (telegram_username, reshipper_payout_identity) VALUES ('duplicate-owner', 'unique-payout-owner')`);
      } catch (error) {
        duplicateCode = (error as { cause?: { code?: string } }).cause?.code;
      }
      await tx.execute(sql`ROLLBACK TO SAVEPOINT payout_identity_uniqueness`);
      expect(duplicateCode).toBe("23505");
    });
  });
});

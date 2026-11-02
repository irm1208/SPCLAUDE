import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import * as store from "@workspace/db";
import {
  adminCoaList, coaPaymentInstructions, getMemberCoa, inviteCoa, manageCoa,
  saveCoaSettings, saveMemberCoa, submitCoaPayment, withdrawCoa,
} from "./group-buy-coa";
import { coaTransactionConflict } from "./coa-payment-claim";

const rail = { currency: "USDT", network: "ERC-20", walletAddress: `0x${"a".repeat(40)}` };
vi.mock("../routes/payments", () => ({ getAdminCryptoOptions: async () => [rail] }));
const details = { client: "Synthetic client", sample: "Synthetic sample", manufacturer: "Synthetic supplier", batch: "test-batch" };
const cfg = { mode: "open", fee: 25, currency: "USD", cap: 2, rails: [rail], manualInstructions: "Synthetic manual payment details" };
const rollback = new Error("ROLLBACK_COA_TEST");
function access(tx: any) { return { ...store.db, select: tx.select.bind(tx), transaction: (fn: any) => fn(tx) } as typeof store.db; }
async function fixture(fn: (ctx: { tx: any; database: typeof store.db; group: string; ids: string[]; users: string[] }) => Promise<void>) {
  try {
    await store.db.transaction(async tx => {
      const group = `test-coa-${randomUUID()}`;
      const ids = [randomUUID(), randomUUID(), randomUUID()];
      const users = ids.map((_, i) => `test-coa-member-${i}-${group}`);
      await tx.insert(store.groupBuysTable).values({ id: group, name: "Synthetic COA group" });
      await tx.insert(store.ordersTable).values(ids.map((id, i) => ({ id, code: `test-coa-${i}`, groupBuyId: group,
        telegramUsername: users[i], status: "Submitted", paymentStatus: "unpaid", grandTotal: "123.45",
        productSubtotal: "120", deliveryPrice: "3.45", deliveryMethod: "Synthetic delivery" })));
      await tx.insert(store.groupBuyCoaSettingsTable).values({ ...cfg, groupBuyId: group, fee: "25" });
      await fn({ tx, database: access(tx), group, ids, users });
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
}

describe.skipIf(process.env.COA_DB_TESTS !== "1")("group-buy COA persistence (synthetic rollback fixtures)", () => {
  it("supports all fields, own-account privacy and separate order finances through manual receipt and completion", async () => {
    await fixture(async ({ tx, database, ids, users, group }) => {
      const before = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, ids[0]));
      expect((await getMemberCoa(ids[0], users[0], database)).eligible).toBe(true);
      await expect(getMemberCoa(ids[0], users[1], database)).rejects.toThrow("not found");
      const saved = await saveMemberCoa(ids[0], users[0], details, database);
      expect(saved.request).toMatchObject({ ...details, fee: 25, currency: "USD", status: "reserved" });
      await submitCoaPayment(ids[0], users[0], { reference: "test-bank-transfer" }, database);
      const admin = await adminCoaList({ groupBuyId: group, batch: "test-batch", search: "Synthetic client", status: "review" }, database);
      expect(admin.requests).toHaveLength(1);
      const requestId = saved.request!.id;
      await manageCoa(requestId, "synthetic-admin", { action: "notes", internalNotes: "Private test note" }, database);
      expect((await getMemberCoa(ids[0], users[0], database)).request).not.toHaveProperty("internalNotes");
      await expect(manageCoa(requestId, "synthetic-admin", { action: "confirm", note: "" }, database)).rejects.toThrow("note");
      await manageCoa(requestId, "synthetic-admin", { action: "confirm", note: "Synthetic receipt checked" }, database);
      await manageCoa(requestId, "synthetic-admin", { action: "processing" }, database);
      await manageCoa(requestId, "synthetic-admin", { action: "completed" }, database);
      expect((await getMemberCoa(ids[0], users[0], database)).request!.status).toBe("completed");
      await expect(withdrawCoa(ids[0], users[0], database)).rejects.toThrow("cannot be withdrawn");
      expect(await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, ids[0]))).toEqual(before);
    });
  });
  it("counts invitations once, preserves committed fees, and rejects limits below existing commitments", async () => {
    await fixture(async ({ tx, database, group, ids, users }) => {
      await saveCoaSettings(group, "test-admin", { ...cfg, mode: "selected", cap: 1 }, database);
      await expect(saveMemberCoa(ids[1], users[1], details, database)).rejects.toThrow("not open");
      await inviteCoa(group, "test-admin", { orderIds: [ids[0]] }, database);
      await inviteCoa(group, "test-admin", { orderIds: [ids[0]] }, database);
      expect((await saveMemberCoa(ids[0], users[0], details, database)).request!.fee).toBe(25);
      await expect(inviteCoa(group, "test-admin", { orderIds: [ids[1]] }, database)).rejects.toThrow("limit");
      await saveCoaSettings(group, "test-admin", { ...cfg, fee: 99, mode: "disabled" }, database);
      expect((await getMemberCoa(ids[0], users[0], database)).config!.fee).toBe(25);
      await tx.update(store.groupBuyCoaSettingsTable).set({ cap: 2 }).where(eq(store.groupBuyCoaSettingsTable.groupBuyId, group));
      await saveCoaSettings(group, "test-admin", { ...cfg, cap: 2 }, database);
      await saveMemberCoa(ids[1], users[1], details, database);
      await expect(saveCoaSettings(group, "test-admin", { ...cfg, cap: 1 }, database)).rejects.toThrow("committed");
    });
  });
  it("expires public reservations, protects submitted payments, and holds late receipts for explicit capacity review", async () => {
    await fixture(async ({ tx, database, group, ids, users }) => {
      await saveCoaSettings(group, "test-admin", { ...cfg, cap: 1 }, database);
      const old = await saveMemberCoa(ids[0], users[0], details, database);
      await tx.update(store.groupBuyCoaRequestsTable).set({ expiresAt: new Date(0) }).where(eq(store.groupBuyCoaRequestsTable.id, old.request!.id));
      await saveMemberCoa(ids[1], users[1], details, database);
      const late = await submitCoaPayment(ids[0], users[0], { reference: "test-late-transfer" }, database);
      expect(late.request).toMatchObject({ status: "expired", reference: "test-late-transfer" });
      await expect(manageCoa(old.request!.id, "test-admin", { action: "confirm", note: "Late test receipt" }, database)).rejects.toThrow("capacity");
      await submitCoaPayment(ids[1], users[1], { reference: "test-current-receipt" }, database);
      await tx.update(store.groupBuyCoaRequestsTable).set({ expiresAt: new Date(0) }).where(eq(store.groupBuyCoaRequestsTable.orderId, ids[1]));
      expect((await getMemberCoa(ids[1], users[1], database)).request!.status).toBe("review");
      expect((await adminCoaList({ groupBuyId: group }, database)).committed).toBe(1);
      await expect(withdrawCoa(ids[1], users[1], database)).rejects.toThrow("cannot be withdrawn");
    });
  });
  it("uses server payment snapshots, verifies at 1%, prevents product and cross-COA replays, and safely retries", async () => {
    await fixture(async ({ tx, database, group, ids, users }) => {
      await saveMemberCoa(ids[0], users[0], details, database);
      await expect(coaPaymentInstructions(ids[0], users[0], { currency: "USDC", network: "ERC-20" }, database)).rejects.toThrow("available");
      const quoted = await coaPaymentInstructions(ids[0], users[0], rail, database);
      expect(quoted.request!.payment).toMatchObject({ ...rail, amount: 25, quotedAt: expect.any(String) });
      const hash = `0x${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
      const verifier = vi.fn().mockResolvedValue({ verified: true, amountUsdt: 25, blockConfirmations: 20 });
      const result = await submitCoaPayment(ids[0], users[0], { txHash: hash, amount: 0 }, database, verifier, async () => Date.now());
      expect(result.request!.status).toBe("paid");
      expect(verifier).toHaveBeenCalledWith(hash, rail.walletAddress, 25, "USDT", "ERC-20", 0.01, result.request!.id);
      const guardDb = { ...database, select: tx.select.bind(tx) } as typeof store.db;
      expect(await coaTransactionConflict(hash.toUpperCase().replace("0X", "0x"), undefined, guardDb)).toBe(true);
      expect(await coaTransactionConflict(hash, result.request!.id, guardDb)).toBe(false);
      await submitCoaPayment(ids[0], users[0], { txHash: hash }, database, verifier);
      expect(verifier).toHaveBeenCalledTimes(1);
      await saveMemberCoa(ids[1], users[1], details, database);
      await coaPaymentInstructions(ids[1], users[1], rail, database);
      await expect(submitCoaPayment(ids[1], users[1], { txHash: hash }, database, verifier)).rejects.toThrow("reserved");
      const productHash = `0x${"1".repeat(64)}`;
      await tx.update(store.ordersTable).set({ paymentTxHash: productHash }).where(eq(store.ordersTable.id, ids[2]));
      await expect(submitCoaPayment(ids[1], users[1], { txHash: productHash }, database, verifier)).rejects.toThrow("another payment");
      expect((await adminCoaList({ groupBuyId: group }, database)).requests).toHaveLength(2);
    });
  });
  it("retains old or undated matched transfers for review rather than automatically spending them", async () => {
    await fixture(async ({ database, ids, users }) => {
      await saveMemberCoa(ids[0], users[0], details, database);
      await coaPaymentInstructions(ids[0], users[0], rail, database);
      const hash = `0x${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
      const verifier = vi.fn().mockResolvedValue({ verified: true, amountUsdt: 25, blockConfirmations: 20 });
      const old = await submitCoaPayment(ids[0], users[0], { txHash: hash }, database, verifier, async () => 0);
      expect(old.request).toMatchObject({ status: "review", verificationMessage: expect.stringContaining("predates") });
      const undated = await submitCoaPayment(ids[0], users[0], { txHash: hash }, database, verifier, async () => null);
      expect(undated.request).toMatchObject({ status: "review", verificationMessage: expect.stringContaining("date") });
    });
  });
  it("ignores wholesale and cancelled orders, and allows unpaid withdrawal without a refund", async () => {
    await fixture(async ({ tx, database, group, ids, users }) => {
      await tx.update(store.ordersTable).set({ orderType: "wholesale_shared" }).where(eq(store.ordersTable.id, ids[0]));
      await expect(getMemberCoa(ids[0], users[0], database)).rejects.toThrow("group-buy");
      await saveMemberCoa(ids[1], users[1], details, database);
      expect((await withdrawCoa(ids[1], users[1], database)).request!.status).toBe("withdrawn");
      await saveCoaSettings(group, "test-admin", { ...cfg, fee: 99 }, database);
      const resumed = await saveMemberCoa(ids[1], users[1], details, database);
      expect(resumed.request!.status).toBe("reserved");
      expect(resumed.request!.fee).toBe(25);
    });
  });
});

describe.skipIf(process.env.COA_DB_TESTS !== "1")("COA final-place concurrency", () => {
  it("admits exactly one independent claimant for the final slot", async () => {
    const group = `test-coa-race-${randomUUID()}`;
    const ids = [randomUUID(), randomUUID()];
    const users = ids.map((_, i) => `test-coa-race-${group}-${i}`);
    try {
      await store.db.insert(store.groupBuysTable).values({ id: group, name: "Synthetic COA concurrency" });
      await store.db.insert(store.ordersTable).values(ids.map((id, i) => ({ id, code: `test-coa-race-${i}`, groupBuyId: group,
        telegramUsername: users[i], deliveryMethod: "Synthetic", productSubtotal: "1", grandTotal: "1" })));
      await store.db.insert(store.groupBuyCoaSettingsTable).values({ ...cfg, fee: "25", groupBuyId: group, cap: 1 });
      const result = await Promise.allSettled(ids.map((id, i) => saveMemberCoa(id, users[i], details)));
      expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect((await adminCoaList({ groupBuyId: group })).committed).toBe(1);
    } finally {
      await store.db.delete(store.groupBuyCoaRequestsTable).where(eq(store.groupBuyCoaRequestsTable.groupBuyId, group));
      await store.db.delete(store.groupBuyCoaSettingsTable).where(eq(store.groupBuyCoaSettingsTable.groupBuyId, group));
      await store.db.delete(store.ordersTable).where(inArray(store.ordersTable.id, ids));
      await store.db.delete(store.auditLogsTable).where(and(eq(store.auditLogsTable.action, "coa_details"),
        sqlIdIn(ids)));
      await store.db.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, group));
    }
  });
});

function sqlIdIn(ids: string[]) {
  // Synthetic audit rows only; never delete unrelated audit history.
  return inArray(sql`${store.auditLogsTable.metadata}->>'id'`, ids);
}

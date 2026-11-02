import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./telegram", () => ({
  notifyUserFull: vi.fn(async () => ({ ok: true })),
  sendAdminMessageFull: vi.fn(async () => ({ ok: true })),
}));

describe.skipIf(process.env.SUPPLIER_BATCH_DB_TESTS !== "1")("batch messaging / PostgreSQL", () => {
  let store: any, api: any;
  const admin = { username: "synthetic-admin", admin: true };
  beforeAll(async () => { store = await import("@workspace/db"); api = await import("./supplier-batch-messages"); });
  beforeEach(() => vi.clearAllMocks());
  async function fixture(test: (f: any) => Promise<void>) {
    const rollback = new Error("fixture rollback");
    try {
      await store.db.transaction(async (tx: any) => {
        const id = randomUUID(), otherId = randomUUID(), alice = `synthetic-${randomUUID()}`, bob = `synthetic-${randomUUID()}`;
        await tx.insert(store.groupBuysTable).values([
          { id, name: "Synthetic HGH messaging", status: "draft", organiserId: "synthetic-organiser" },
          { id: otherId, name: "Synthetic other group", status: "draft" },
        ]);
        await tx.insert(store.accountsTable).values([
          { telegramUsername: alice, telegramChatId: "synthetic-not-real", telegramNotifications: { status: true } },
          { telegramUsername: bob, telegramNotifications: { status: false } },
        ]);
        const orderIds = [randomUUID(), randomUUID(), randomUUID()];
        await tx.insert(store.ordersTable).values(orderIds.map((orderId, i) => ({
          id: orderId, groupBuyId: id, code: `synthetic-${orderId}`, telegramUsername: i === 2 ? bob : alice,
          status: "Submitted", paymentStatus: "unpaid", deliveryMethod: "Synthetic",
          productSubtotal: "100", grandTotal: "100",
        })));
        const batchIds = [randomUUID(), randomUUID()];
        await tx.insert(store.gbSupplierBatchesTable).values(batchIds.map((batchId, i) => ({
          id: batchId, groupBuyId: id, sequence: i + 1, reference: `GB / 00${i + 1}`, createdBy: "synthetic-admin",
          previewToken: randomUUID(), state: i === 0 ? "ordered" : "prepared",
          snapshot: { orders: (i === 0 ? orderIds.slice(0, 2) : [orderIds[0], orderIds[2]]).map(oid => ({ id: oid })) },
        })));
        await test({ tx, id, otherId, batchIds, orderIds, alice, bob });
        throw rollback;
      });
    } catch (e) { if (e !== rollback) throw e; }
  }
  it("previews without sending; queues once per member and safely replays, without changing orders", async () => {
    await fixture(async ({ tx, id, batchIds, orderIds }: any) => {
      const body = { batchIds, message: '<b>Hello</b>\nYour batch is arriving.' };
      const before = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, id));
      const preview = await api.previewBatchMessage(id, admin, body, tx);
      expect(preview).toMatchObject({ recipientCount: 2, telegramCount: 1, missingAccounts: 0 });
      expect(await tx.select().from(store.gbSupplierEventsTable).where(eq(store.gbSupplierEventsTable.groupBuyId, id))).toEqual([]);
      const send = { ...body, previewToken: preview.token, requestKey: randomUUID(), confirm: true };
      const result = await api.queueBatchMessage(id, admin, send, tx);
      expect(result.recipientCount).toBe(2);
      expect(await api.queueBatchMessage(id, admin, send, tx)).toMatchObject({ ...result, replay: true });
      const events = await tx.select().from(store.gbSupplierEventsTable).where(eq(store.gbSupplierEventsTable.groupBuyId, id));
      expect(events.filter((e: any) => e.kind === "member_message")).toHaveLength(2);
      expect(events.filter((e: any) => e.telegram === "pending")).toHaveLength(1);
      const logs = await tx.select().from(store.telegramMessageLogsTable)
        .where(eq(store.telegramMessageLogsTable.eventKey, `supplier-message:${events.find((e: any) => e.kind === "member_message").id}`));
      expect(logs).toHaveLength(1);
      expect(logs[0].messageText).toContain("&lt;b&gt;Hello&lt;/b&gt;");
      expect(await tx.select().from(store.ordersTable).where(eq(store.ordersTable.groupBuyId, id))).toEqual(before);
      expect((await api.batchMessageHistory(id, admin, tx))[0]).toMatchObject({
        recipientCount: 2, delivery: { pending: 1, skipped: 1 },
      });
      await expect(api.queueBatchMessage(id, admin, { ...send, message: "changed" }, tx)).rejects.toMatchObject({ status: 409 });
      expect(orderIds).toHaveLength(3);
    });
  });
  it("requires Admin, correct group ownership, explicit confirmation, and a fresh audience", async () => {
    await fixture(async ({ tx, id, otherId, batchIds, orderIds }: any) => {
      const body = { batchIds, message: "Update" };
      await expect(api.previewBatchMessage(id, { username: "synthetic-organiser", admin: false }, body, tx)).rejects.toMatchObject({ status: 403 });
      await expect(api.previewBatchMessage(id, { ...admin, adminGbId: otherId }, body, tx)).rejects.toMatchObject({ status: 403 });
      await expect(api.previewBatchMessage(otherId, admin, body, tx)).rejects.toMatchObject({ status: 409 });
      const preview = await api.previewBatchMessage(id, admin, body, tx);
      await expect(api.queueBatchMessage(id, admin, { ...body, previewToken: preview.token, requestKey: randomUUID() }, tx)).rejects.toMatchObject({ status: 400 });
      await tx.update(store.ordersTable).set({ deletedAt: new Date() }).where(eq(store.ordersTable.id, orderIds[2]));
      await expect(api.queueBatchMessage(id, admin, { ...body, previewToken: preview.token, requestKey: randomUUID(), confirm: true }, tx)).rejects.toMatchObject({ status: 409 });
      expect(await tx.select().from(store.gbSupplierEventsTable).where(eq(store.gbSupplierEventsTable.groupBuyId, id))).toEqual([]);
      await tx.update(store.gbSupplierBatchesTable).set({ state: "released" }).where(eq(store.gbSupplierBatchesTable.id, batchIds[0]));
      await expect(api.previewBatchMessage(id, admin, body, tx)).rejects.toMatchObject({ status: 409 });
    });
  });
  it("delivers queued messages through the worker without duplicates or extra website notifications", async () => {
    await fixture(async ({ tx, id, batchIds, alice }: any) => {
      const body = { batchIds, message: "<b>Not HTML</b>" };
      const preview = await api.previewBatchMessage(id, admin, body, tx);
      await api.queueBatchMessage(id, admin, { ...body, previewToken: preview.token, requestKey: randomUUID(), confirm: true }, tx);
      const { drainSupplierAlerts } = await import("./supplier-batch-worker");
      const { notifyUserFull } = await import("./telegram");
      await drainSupplierAlerts(id, tx);
      await drainSupplierAlerts(id, tx);
      expect(notifyUserFull).toHaveBeenCalledTimes(1);
      expect(notifyUserFull).toHaveBeenCalledWith(alice, "status", expect.stringContaining("&lt;b&gt;Not HTML&lt;/b&gt;"), undefined,
        { eventKey: expect.stringContaining("supplier-message:"), websiteAlreadyRecorded: true });
      const history = await api.batchMessageHistory(id, admin, tx);
      expect(history[0].delivery).toEqual({ delivered: 1, skipped: 1 });
      const logs = await tx.select().from(store.telegramMessageLogsTable).where(eq(store.telegramMessageLogsTable.recipientUsername, alice));
      expect(logs).toHaveLength(1);
    });
  });
});

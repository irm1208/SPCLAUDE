import { afterEach, describe, expect, it, vi } from "vitest";
import { coaNotificationContent, drainCoaNotifications, queueCoaNotification } from "./coa-notifications";
import { accountsTable, ordersTable, siteConfigTable, telegramMessageLogsTable, emailTemplatesTable } from "@workspace/db";

// No transports in this suite: production sends are injected or forbidden.
vi.mock("./telegram", () => ({ notifyUserFull: vi.fn(() => { throw new Error("Real Telegram forbidden"); }) }));
vi.mock("./email", () => ({ sendTemplatedEmail: vi.fn(() => { throw new Error("Real email forbidden"); }) }));

const request = { id: "request", orderId: "order", fee: "25", currency: "USD" };
const order = { id: "order", code: "GB-1", telegramUsername: "@Renamed", deletedAt: null };
function memory(options: { activeEmail?: boolean; owner?: string; emailAddress?: string | null; claimable?: boolean } = {}) {
  const markers = new Map<string, any>();
  const logs: any[] = [];
  const db: any = {
    transaction: async (fn: any) => fn(db),
    select: () => ({
      from: (table: any) => ({
        where: () => ({
          limit: async () => table === siteConfigTable ? [...markers.values()].filter(r => !JSON.parse(r.value).done)
            : table === ordersTable ? [{ ...order, telegramUsername: options.owner ?? order.telegramUsername }] : table === accountsTable
              ? [{ telegramUsername: options.owner?.replace(/^@/, "").toLowerCase() ?? "renamed",
                email: options.emailAddress === undefined ? "synthetic@example.invalid" : options.emailAddress }]
              : table === emailTemplatesTable ? [{ isActive: options.activeEmail !== false }] : [],
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (value: any) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (markers.has(value.key)) return [];
            markers.set(value.key, { ...value }); return [value];
          },
        }),
        then: (resolve: any) => { if (table === telegramMessageLogsTable) logs.push(value); resolve(); },
      }),
    }),
    update: () => ({
      set: (value: any) => ({
        where: () => ({
          returning: async () => {
            if (options.claimable === false) return [];
            const row = [...markers.values()][0];
            if (!row) return [];
            Object.assign(row, value); return [row];
          },
        }),
      }),
    }),
  };
  return { db, markers, logs };
}
afterEach(() => vi.unstubAllEnvs());
describe("COA notifications", () => {
  it("creates one durable event and one website entry for invitation retries", async () => {
    const { db, markers, logs } = memory();
    await queueCoaNotification(db, request, "invited");
    await queueCoaNotification(db, request, "invited");
    expect(markers.size).toBe(1);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ recipientUsername: "renamed", delivered: false });
    expect(logs[0].messageText).toContain("#coa");
  });
  it("uses distinct once-only markers for receipt, processing and completion", async () => {
    const { db, markers, logs } = memory();
    for (const event of ["paid", "processing", "completed"] as const) {
      await queueCoaNotification(db, request, event);
      await queueCoaNotification(db, request, event);
    }
    expect(markers.size).toBe(3);
    expect(logs).toHaveLength(3);
  });
  it("escapes content and never claims a certificate download exists", () => {
    const content = coaNotificationContent("completed", { ...request, currency: "<USD>" }, { ...order, code: "<script>" });
    expect(content.text).toContain("&lt;script&gt;");
    expect(content.text).not.toMatch(/download|certificate (is )?(ready|available)/i);
    expect(content.vars.order_url).toContain("/account/orders/order#coa");
    expect(content.vars).not.toHaveProperty("client");
  });
  it.each(["development", "test"])("never sends real messages in %s", async env => {
    vi.stubEnv("NODE_ENV", env);
    const { db } = memory();
    await queueCoaNotification(db, request, "invited");
    expect(await drainCoaNotifications(db)).toBe(0);
  });
  it.each([{ activeEmail: false }, { emailAddress: null }])("does not attempt unavailable email channels: %j", async options => {
    const { db, markers } = memory(options);
    await queueCoaNotification(db, request, "invited");
    const telegram = vi.fn().mockResolvedValue({ ok: false, skipped: true });
    const email = vi.fn();
    await drainCoaNotifications(db, { telegram, email });
    expect(email).not.toHaveBeenCalled();
    expect(JSON.parse([...markers.values()][0].value).done).toBe(true);
  });
  it("does not send a job claimed by another worker", async () => {
    const options = { claimable: true };
    const { db } = memory(options);
    await queueCoaNotification(db, request, "invited");
    options.claimable = false;
    const telegram = vi.fn();
    const email = vi.fn();
    await drainCoaNotifications(db, { telegram, email });
    expect(telegram).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
  });
  it("uses the new owner after a rename between enqueue and delivery", async () => {
    const options = { owner: "@old" };
    const { db } = memory(options);
    await queueCoaNotification(db, request, "invited");
    options.owner = "@new";
    const telegram = vi.fn().mockResolvedValue({ ok: true });
    const email = vi.fn().mockResolvedValue({ ok: true });
    await drainCoaNotifications(db, { telegram, email });
    expect(telegram.mock.calls[0][0]).toBe("new");
  });
  it("keeps successful channels complete when the other channel must retry, resolving renamed owners", async () => {
    const { db, logs } = memory();
    await queueCoaNotification(db, request, "paid");
    const telegram = vi.fn().mockResolvedValue({ ok: false, skipped: true });
    const email = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true });
    const now = Date.now();
    await drainCoaNotifications(db, { telegram, email, now });
    await drainCoaNotifications(db, { telegram, email, now: now + 3_600_000 });
    await drainCoaNotifications(db, { telegram, email, now: now + 7_200_000 });
    expect(telegram).toHaveBeenCalledTimes(1);
    expect(telegram).toHaveBeenCalledWith("renamed", "payment", expect.any(String), undefined,
      expect.objectContaining({ websiteAlreadyRecorded: true }));
    // Telegram rejects relative anchor URLs even though the in-app feed accepts them.
    expect(telegram.mock.calls[0][2]).toMatch(/href="https?:\/\/[^"]+\/account\/orders\/order#coa"/);
    expect(email).toHaveBeenCalledTimes(2);
    expect(email).toHaveBeenCalledWith("coa_paid", "synthetic@example.invalid", expect.any(Object),
      expect.objectContaining({ idempotencyKey: "coa:request:paid" }));
    expect(logs).toHaveLength(1);
  });
});

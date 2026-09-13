import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: { telegramUsername: "buyer", credits: 0 },
  order: {
    id: "order-1",
    code: "GB-001",
    telegramUsername: "@buyer",
    groupBuyId: "gb-1",
    orderType: null,
    deletedAt: null,
    status: "Submitted",
    refundStatus: null,
    paymentStatus: "confirmed",
    paymentTxHash: "0x" + "a".repeat(64),
    paymentTxHashes: null,
    paymentConfirmedAt: new Date("2025-01-01T00:00:00.000Z"),
    paymentCryptoCurrency: "USDT",
    paymentCryptoNetwork: "ERC-20",
    grandTotal: "123.45",
    refundedAt: null,
  } as Record<string, any>,
  groupBuy: { id: "gb-1", cryptoRefundsEnabled: true, organiserId: "organiser" },
  refunds: [] as Array<Record<string, any>>,
  ledger: [] as Array<Record<string, any>>,
  auditOutbox: [] as Array<Record<string, any>>,
  notificationMarkers: [] as Array<Record<string, any>>,
  failAfterNotificationInsert: false,
  resolverDatabases: [] as unknown[],
}));

let schema: any;

const fakeDb = vi.hoisted(() => {
  const rowsFor = (table: unknown): Array<Record<string, any>> => {
    if (table === schema.accountsTable) return [state.account];
    if (table === schema.ordersTable) return [state.order];
    if (table === schema.groupBuysTable) return [state.groupBuy];
    if (table === schema.groupBuyRefundsTable) return state.refunds;
    if (table === schema.siteConfigTable || table === schema.gbReshippersTable || table === schema.wholesaleSharesTable) return [];
    // The operation's outboxes are deliberately left pending for the drainer.
    // This models a worker that has not run yet while preserving committed rows.
    if (table === schema.groupBuyRefundTransitionOutboxTable) return state.auditOutbox;
    if (table === schema.groupBuyRefundNotificationsTable) return state.notificationMarkers;
    return [];
  };

  const insertRow = (table: unknown, value: Record<string, any>): Record<string, any>[] => {
    if (table === schema.groupBuyRefundsTable) {
      if (state.refunds.some(refund =>
        refund.orderId === value.orderId
        && ["requested", "verifying", "verification_failed"].includes(String(refund.status)))) return [];
      state.refunds.push(value);
      return [value];
    }
    if (table === schema.creditTransactionsTable) {
      state.ledger.push(value);
      return [value];
    }
    if (table === schema.groupBuyRefundTransitionOutboxTable) {
      const duplicate = state.auditOutbox.find(row =>
        row.refundId === value.refundId && row.attemptId === value.attemptId && row.transition === value.transition);
      if (duplicate) return [];
      state.auditOutbox.push(value);
      return [value];
    }
    if (table === schema.groupBuyRefundNotificationsTable) {
      const duplicate = state.notificationMarkers.find(row =>
        row.refundId === value.refundId
        && row.accountId === value.accountId
        && row.status === value.status
        && row.transitionKey === value.transitionKey);
      if (duplicate) return [];
      state.notificationMarkers.push({ claimToken: null, claimedAt: null, sentAt: null, ...value });
      if (state.failAfterNotificationInsert) throw new Error("notification enqueue failed");
      return [state.notificationMarkers.at(-1)!];
    }
    return [];
  };

  const db: any = {
    select: () => {
      const query: any = {
        table: null as unknown,
        locking: false,
        from(table: unknown) {
          query.table = table;
          return query;
        },
        where() { return query; },
        orderBy() { return query; },
        limit() { return query; },
        rows() {
          if (
            query.locking
            && (query.table === schema.groupBuyRefundTransitionOutboxTable
              || query.table === schema.groupBuyRefundNotificationsTable)
          ) return [];
          return rowsFor(query.table).map(row => ({ ...row }));
        },
        for() {
          query.locking = true;
          return Promise.resolve(query.rows());
        },
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(query.rows()).then(resolve, reject);
        },
      };
      return query;
    },
    update(table: unknown) {
      return {
        set(values: Record<string, any>) {
          return {
            where() {
              const apply = async () => {
                const rows = rowsFor(table);
                for (const row of rows) Object.assign(row, values);
                return rows.map(row => ({ ...row }));
              };
              return {
                returning: apply,
                then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
                  return apply().then(resolve, reject);
                },
              };
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(value: Record<string, any>) {
          const operation: any = {
            onConflictDoNothing() { return operation; },
            async returning() { return insertRow(table, value); },
          };
          operation.then = (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
            Promise.resolve(insertRow(table, value)).then(resolve, reject);
          operation.catch = (reject: (error: unknown) => unknown) =>
            Promise.resolve(insertRow(table, value)).catch(reject);
          return operation;
        },
      };
    },
    transaction(callback: (tx: any) => unknown) {
      const snapshot = structuredClone({
        account: state.account,
        order: state.order,
        groupBuy: state.groupBuy,
        refunds: state.refunds,
        ledger: state.ledger,
        auditOutbox: state.auditOutbox,
        notificationMarkers: state.notificationMarkers,
      });
      return Promise.resolve().then(() => callback(db)).catch((error) => {
        Object.assign(state.account, snapshot.account);
        Object.assign(state.order, snapshot.order);
        Object.assign(state.groupBuy, snapshot.groupBuy);
        state.refunds = snapshot.refunds;
        state.ledger = snapshot.ledger;
        state.auditOutbox = snapshot.auditOutbox;
        state.notificationMarkers = snapshot.notificationMarkers;
        throw error;
      });
    },
  };
  return db;
});

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return { ...actual, db: fakeDb };
});
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
  isValidTxHash: (value: string) => /^(?:0x)?[0-9a-fA-F]{64}$/.test(value),
  verifyTransaction: vi.fn(async () => ({
    verified: true,
    amountUsdt: 123.45,
    blockConfirmations: 8,
    recipientAddress: "0x" + "b".repeat(40),
  })),
}));
vi.mock("../routes/payments", () => ({
  resolveEffectiveOrderCrypto: vi.fn(async (_order: unknown, database: unknown) => {
    state.resolverDatabases.push(database);
    return { walletAddress: "0x" + "b".repeat(40), currency: "USDT", network: "ERC-20" };
  }),
}));

import * as importedSchema from "@workspace/db";
import { createRefundRequest, completeCreditRefund } from "./group-buy-refund";
import { notifyRefundTransition } from "./refund-notifications";

schema = importedSchema;

describe("refund transition outbox atomicity", () => {
  beforeEach(() => {
    state.account.credits = 0;
    Object.assign(state.order, {
      status: "Submitted",
      refundStatus: null,
      paymentStatus: "confirmed",
      paymentConfirmedAt: new Date("2025-01-01T00:00:00.000Z"),
      refundedAt: null,
      groupBuyId: "gb-1",
      telegramUsername: "@buyer",
      paymentTxHash: "0x" + "a".repeat(64),
      paymentTxHashes: null,
      grandTotal: "123.45",
    });
    state.refunds = [];
    state.ledger = [];
    state.auditOutbox = [];
    state.notificationMarkers = [];
    state.failAfterNotificationInsert = false;
    state.resolverDatabases.length = 0;
  });

  const request = () => createRefundRequest(fakeDb, {
    accountId: "buyer",
    orderId: "order-1",
    input: { method: "credit" },
  });

  it("commits one request transition and makes duplicate notification retries no-ops", async () => {
    expect(importedSchema.groupBuyRefundTransitionOutboxTable).toBeTruthy();
    expect(importedSchema.groupBuyRefundNotificationsTable).toBeTruthy();

    const first = await request();
    expect(first).toMatchObject({ status: "requested", method: "credit", amountUsd: "123.45" });
    expect(state.refunds).toHaveLength(1);
    expect(state.auditOutbox).toHaveLength(1);
    expect(state.notificationMarkers).toHaveLength(1);

    const auditCount = state.auditOutbox.length;
    const notificationCount = state.notificationMarkers.length;
    await expect(request()).resolves.toMatchObject({ id: first.id, status: "requested" });
    expect(state.auditOutbox).toHaveLength(auditCount);
    expect(state.notificationMarkers).toHaveLength(notificationCount);

    // Exercise the public post-commit helper against the same actual marker.
    await expect(notifyRefundTransition(fakeDb, {
      refundId: first.id,
      accountId: "buyer",
      status: "requested",
      orderCode: "GB-001",
      amountUsd: "123.45",
    }, { sender: async () => ({ ok: true }) })).resolves.toBe(false);
    expect(state.notificationMarkers).toHaveLength(notificationCount);
  });

  it("rolls back a request when notification enqueue fails after both markers were written", async () => {
    state.failAfterNotificationInsert = true;
    await expect(request()).rejects.toThrow("notification enqueue failed");
    expect(state.refunds).toHaveLength(0);
    expect(state.auditOutbox).toHaveLength(0);
    expect(state.notificationMarkers).toHaveLength(0);
    expect(state.account.credits).toBe(0);
    expect(state.ledger).toHaveLength(0);
    expect(state.order).toMatchObject({ status: "Submitted", paymentStatus: "confirmed", refundStatus: null });
  });

  it("commits credit completion once, then duplicate completion adds no ledger or markers", async () => {
    const created = await request();
    const beforeAudit = state.auditOutbox.length;
    const beforeNotifications = state.notificationMarkers.length;

    const completed = await completeCreditRefund(fakeDb, {
      refundId: created.id,
      username: "admin",
      role: "admin",
    });
    expect(completed).toMatchObject({ id: created.id, status: "completed", amountUsd: "123.45" });
    expect(state.account.credits).toBe(123.45);
    expect(state.ledger).toHaveLength(1);
    expect(state.order).toMatchObject({ status: "Cancelled", paymentStatus: "refunded", refundStatus: "refunded" });
    expect(state.auditOutbox).toHaveLength(beforeAudit + 1);
    expect(state.notificationMarkers).toHaveLength(beforeNotifications + 1);

    const auditCount = state.auditOutbox.length;
    const notificationCount = state.notificationMarkers.length;
    await expect(completeCreditRefund(fakeDb, {
      refundId: created.id,
      username: "admin",
      role: "admin",
    })).resolves.toMatchObject({ id: created.id, status: "completed" });
    expect(state.account.credits).toBe(123.45);
    expect(state.ledger).toHaveLength(1);
    expect(state.auditOutbox).toHaveLength(auditCount);
    expect(state.notificationMarkers).toHaveLength(notificationCount);
  });

  it("rolls back completion state, balance, ledger, and both marker collections", async () => {
    const created = await request();
    const before = {
      audits: state.auditOutbox.length,
      notifications: state.notificationMarkers.length,
    };
    state.failAfterNotificationInsert = true;

    await expect(completeCreditRefund(fakeDb, {
      refundId: created.id,
      username: "admin",
      role: "admin",
    })).rejects.toThrow("notification enqueue failed");

    expect(state.refunds[0]).toMatchObject({ id: created.id, status: "requested" });
    expect(state.account.credits).toBe(0);
    expect(state.ledger).toHaveLength(0);
    expect(state.order).toMatchObject({ status: "Submitted", paymentStatus: "confirmed", refundStatus: null });
    expect(state.auditOutbox).toHaveLength(before.audits);
    expect(state.notificationMarkers).toHaveLength(before.notifications);
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const tables = vi.hoisted(() => ({
  accounts: { telegramUsername: "telegramUsername", telegramChatId: "telegramChatId", telegramNotifications: "telegramNotifications" },
  siteConfig: { key: "key", value: "value" },
  notifications: {
    id: "id",
    refundId: "refundId",
    status: "status",
    accountId: "accountId",
    transitionKey: "transitionKey",
    sentAt: "sentAt",
    claimedAt: "claimedAt",
    claimToken: "claimToken",
    attemptCount: "attemptCount",
    createdAt: "createdAt",
  },
  logs: {},
  telegramMessageLogs: {},
}));

const state = vi.hoisted(() => ({
  account: {
    telegramUsername: "buyer",
    telegramChatId: "chat-1",
    telegramNotifications: { payment: false },
  },
  notifications: [] as Array<Record<string, any>>,
  logs: [] as Array<Record<string, any>>,
}));

const fakeDb = vi.hoisted(() => {
  const db: any = {
    select: () => {
      const query: any = {
        table: null as unknown,
        from(table: unknown) {
          query.table = table;
          return query;
        },
        where() { return query; },
        orderBy() { return query; },
        limit() { return query; },
        rows() {
          if (query.table === tables.accounts) return [state.account];
          if (query.table === tables.notifications) {
            return state.notifications
              .filter(row => !row.sentAt && (!row.claimedAt || Date.now() - new Date(row.claimedAt).getTime() > 5 * 60 * 1000))
              .slice(0, 1);
          }
          return [];
        },
        for() { return Promise.resolve(query.rows()); },
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(query.rows()).then(resolve, reject);
        },
      };
      return query;
    },
    insert(table: unknown) {
      return {
        values(value: Record<string, any>) {
          const operation: any = {
            onConflictDoNothing() { return operation; },
            async returning() {
              if (table === tables.notifications) {
                const duplicate = state.notifications.find(row =>
                  row.refundId === value.refundId
                  && row.status === value.status
                  && row.accountId === value.accountId
                  && row.transitionKey === value.transitionKey);
                if (duplicate) return [];
                const marker = { claimToken: null, claimedAt: null, sentAt: null, ...value };
                state.notifications.push(marker);
                return [marker];
              }
              state.logs.push(value);
              return [value];
            },
          };
          operation.then = (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
            operation.returning().then(resolve, reject);
          operation.catch = (reject: (error: unknown) => unknown) =>
            operation.returning().catch(reject);
          return operation;
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, any>) {
          return {
            where() {
              const apply = async () => {
                const row = table === tables.notifications
                  ? state.notifications.find(candidate => !candidate.sentAt)
                  : undefined;
                if (!row) return [];
                Object.assign(row, values);
                return [row];
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
    transaction(callback: (tx: any) => unknown) {
      return callback(db);
    },
  };
  return db;
});

vi.mock("@workspace/db", () => ({
  accountsTable: tables.accounts,
  siteConfigTable: tables.siteConfig,
  groupBuyRefundNotificationsTable: tables.notifications,
  telegramMessageLogsTable: tables.telegramMessageLogs,
  groupBuyRefundTransitionOutboxTable: {},
  auditLogsTable: {},
  db: fakeDb,
}));

import { drainRefundNotifications, enqueueRefundNotification } from "./refund-notifications";

describe("refund notification default sender", () => {
  beforeEach(() => {
    state.notifications.length = 0;
    state.logs.length = 0;
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses the real preference-disabled Telegram path without a sender override", async () => {
    await enqueueRefundNotification(fakeDb, {
      refundId: "refund-disabled",
      accountId: "buyer",
      status: "requested",
      orderCode: "GB-1",
      amountUsd: "1.00",
    });

    expect(await drainRefundNotifications(fakeDb, {
      limit: 1,
      tokenFactory: () => "claim-1",
    })).toBe(1);

    const transport = vi.mocked(fetch);
    expect(transport).not.toHaveBeenCalled();
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      recipientType: "user",
      recipientUsername: "buyer",
      delivered: false,
    });
    expect(state.notifications[0]).toMatchObject({
      sentAt: expect.any(Date),
      claimToken: null,
      claimedAt: null,
      lastError: "skipped",
    });

    expect(await drainRefundNotifications(fakeDb, {
      limit: 1,
      tokenFactory: () => "claim-2",
    })).toBe(0);
    expect(transport).not.toHaveBeenCalled();
    expect(state.logs).toHaveLength(1);
  });
});
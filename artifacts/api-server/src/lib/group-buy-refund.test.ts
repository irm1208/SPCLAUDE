import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const tables = {
    accounts: { telegramUsername: "telegramUsername" },
    orders: {
      id: "id", telegramUsername: "telegramUsername", groupBuyId: "groupBuyId",
      orderType: "orderType", deletedAt: "deletedAt", status: "status",
      refundStatus: "refundStatus", paymentStatus: "paymentStatus",
      paymentConfirmedAt: "paymentConfirmedAt", grandTotal: "grandTotal",
      paymentScreenshot: "paymentScreenshot", refundedAt: "refundedAt",
    },
    groupBuys: { id: "id", cryptoRefundsEnabled: "cryptoRefundsEnabled", organiserId: "organiserId" },
    refunds: {
      id: "id", orderId: "orderId", groupBuyId: "groupBuyId", accountId: "accountId",
      method: "method", status: "status", amountUsd: "amountUsd", asset: "asset",
      network: "network", destinationWallet: "destinationWallet", amountBaseUnits: "amountBaseUnits",
      completedAt: "completedAt", processorUsername: "processorUsername", processorRole: "processorRole",
      requestedAt: "requestedAt",
    },
    credit: { accountUsername: "accountUsername", amount: "amount", reason: "reason", orderId: "orderId", refundId: "refundId", adminUsername: "adminUsername" },
    audit: "audit",
    outbox: { id: "id", deliveredAt: "deliveredAt", createdAt: "createdAt" },
    notifications: {
      id: "notification.id", refundId: "notification.refundId", status: "notification.status",
      accountId: "notification.accountId", transitionKey: "notification.transitionKey",
      createdAt: "notification.createdAt", sentAt: "notification.sentAt",
      claimedAt: "notification.claimedAt", claimToken: "notification.claimToken",
    },
  };
  const state = {
    account: { telegramUsername: "buyer", credits: 0 },
    order: {
      id: "order-1", code: "GB-001", telegramUsername: "@buyer", groupBuyId: "gb-1", orderType: null,
      deletedAt: null, status: "Submitted", refundStatus: null, paymentStatus: "confirmed",
      paymentConfirmedAt: new Date(), grandTotal: "123.45", paymentScreenshot: null,
      refundedAt: null,
    },
    groupBuy: { id: "gb-1", cryptoRefundsEnabled: true, organiserId: "organiser" },
    refunds: [] as Array<Record<string, unknown>>,
    credits: [] as Array<Record<string, unknown>>,
    audits: [] as Array<Record<string, unknown>>,
    outbox: [] as Array<Record<string, unknown>>,
    notifications: [] as Array<Record<string, unknown>>,
    locks: [] as string[],
    updates: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
    beforeRefundUpdate: null as null | (() => void),
    failLedger: false,
    failOrder: false,
    failAudit: false,
    transactionTail: Promise.resolve(),
    serializeTransactions: true,
  };
  // This adapter models predicates, savepoints, and deterministic interleaving
  // only; PostgreSQL lock/index behavior remains covered by Task 10.
  function eq(column: unknown, value: unknown) {
    return { kind: "eq", column, value };
  }
  function rowsFor(table: unknown, predicate: any) {
    const rows = table === tables.accounts ? [state.account]
      : table === tables.orders ? [state.order]
          : table === tables.groupBuys ? [state.groupBuy]
          : table === tables.refunds ? state.refunds
          : table === tables.outbox ? state.outbox
          : table === tables.notifications ? state.notifications
          : [];
    function matches(row: Record<string, unknown>, condition: any): boolean {
      if (!condition) return true;
      if (condition.kind === "eq") return row[condition.column] === condition.value;
      if (condition.kind === "inArray") return condition.value.includes(row[condition.column]);
      if (condition.kind === "isNull") return row[condition.column] == null;
      if (condition.kind === "and") return condition.predicates.every((item: any) => matches(row, item));
      return true;
    }
    return rows.filter(row => matches(row, predicate));
  }
  function project(row: Record<string, unknown>, selection: any) {
    if (!selection) return { ...row };
    return Object.fromEntries(Object.entries(selection).map(([key, column]) => [key, row[column as string]]));
  }
  function selectBuilder(selection?: any) {
    return {
      from: (table: unknown) => ({
        where: (predicate: any) => {
          const query: any = {
            then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
              Promise.resolve(rowsFor(table, predicate).map(row => project(row, selection))).then(resolve, reject),
          };
          query.for = () => {
            state.locks.push(String(
              table === tables.accounts ? "account"
                : table === tables.orders ? "order"
                  : table === tables.groupBuys ? "groupBuy"
                    : table === tables.refunds ? "refund"
                      : table === tables.outbox ? "outbox"
                        : table === tables.notifications ? "notification" : "unknown",
            ));
            return query;
          };
          query.orderBy = () => query;
          query.limit = () => query;
          return query;
        },
      }),
    };
  }
  const transaction = {
    select: vi.fn((selection?: any) => selectBuilder(selection)),
    update: vi.fn((table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (predicate: any) => {
          if (table === tables.credit && state.failLedger) throw new Error("ledger insert failed");
          if (table === tables.orders && state.failOrder) throw new Error("order update failed");
          state.beforeRefundUpdate?.();
          state.beforeRefundUpdate = null;
          const rows = rowsFor(table, predicate);
          state.updates.push({ table, values });
          for (const row of rows) Object.assign(row, values);
          return {
          returning: async () => rows.map(row => ({ id: (row as any).id })),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(rows.map(row => ({ id: (row as any).id }))).then(resolve),
          };
        },
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        const save = () => {
          if (table === tables.credit && state.failLedger) throw new Error("ledger insert failed");
          if (table === tables.audit && state.failAudit) throw new Error("audit insert failed");
          if (table === tables.refunds) state.refunds.push(values);
          if (table === tables.credit) state.credits.push(values);
          if (table === tables.audit) state.audits.push(values);
          if (table === tables.outbox) state.outbox.push(values);
          if (table === tables.notifications) state.notifications.push(values);
        };
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
              if (
                table === tables.refunds
                && state.refunds.some(refund =>
                  refund.orderId === values.orderId
                  && ["requested", "verifying", "verification_failed"].includes(String(refund.status)))) return [];
              save();
              return [values];
            },
          }),
          then: (resolve: (value: unknown) => unknown) => {
            save();
            return Promise.resolve(undefined).then(resolve);
          },
        };
      },
    })),
  };
  const db = {
    select: vi.fn((selection?: any) => selectBuilder(selection)),
    transaction: vi.fn((callback: (tx: unknown) => unknown) => {
      const execute = async () => {
        const snapshot = JSON.parse(JSON.stringify({
          account: state.account,
          order: state.order,
          groupBuy: state.groupBuy,
          refunds: state.refunds,
          credits: state.credits,
          audits: state.audits,
          outbox: state.outbox,
          notifications: state.notifications,
          updates: state.updates,
        }));
        try {
          return await callback(transaction);
        } catch (error) {
          Object.assign(state.account, snapshot.account);
          Object.assign(state.order, snapshot.order);
          Object.assign(state.groupBuy, snapshot.groupBuy);
          state.refunds = snapshot.refunds;
          state.credits = snapshot.credits;
          state.audits = snapshot.audits;
          state.outbox = snapshot.outbox;
          state.notifications = snapshot.notifications;
          state.updates = snapshot.updates;
          throw error;
        }
      };
      const run = state.serializeTransactions ? state.transactionTail.then(execute) : execute();
      state.transactionTail = run.then(() => undefined, () => undefined);
      return run;
    }),
    insert: transaction.insert,
    update: transaction.update,
  };
  function reset() {
    state.refunds.length = 0;
    state.credits.length = 0;
    state.audits.length = 0;
    state.outbox.length = 0;
    state.notifications.length = 0;
    state.locks.length = 0;
    state.updates.length = 0;
    state.beforeRefundUpdate = null;
    state.failLedger = false;
    state.failOrder = false;
    state.failAudit = false;
    state.transactionTail = Promise.resolve();
    state.serializeTransactions = true;
    state.account.credits = 0;
    state.order.refundStatus = null;
    state.order.status = "Submitted";
    state.order.groupBuyId = "gb-1";
    state.order.orderType = null;
    state.order.telegramUsername = "@buyer";
    state.order.paymentStatus = "confirmed";
    state.order.paymentConfirmedAt = new Date();
    state.order.deletedAt = null;
    state.order.grandTotal = "123.45";
    state.groupBuy.cryptoRefundsEnabled = true;
  }
  return { db, tables, state, reset };
});

vi.mock("@workspace/db", () => ({
  accountsTable: harness.tables.accounts,
  ordersTable: harness.tables.orders,
  groupBuysTable: harness.tables.groupBuys,
  groupBuyRefundsTable: harness.tables.refunds,
  creditTransactionsTable: harness.tables.credit,
  auditLogsTable: harness.tables.audit,
  groupBuyRefundNotificationsTable: harness.tables.notifications,
  groupBuyRefundTransitionOutboxTable: harness.tables.outbox,
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...predicates: unknown[]) => ({ kind: "and", predicates })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: "eq", column, value })),
  inArray: vi.fn((column: unknown, value: unknown[]) => ({ kind: "inArray", column, value })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
  asc: vi.fn((column: unknown) => ({ kind: "asc", column })),
  count: vi.fn(() => "count"),
  isNull: vi.fn((column: unknown) => ({ kind: "isNull", column })),
  lt: vi.fn((column: unknown, value: unknown) => ({ kind: "lt", column, value })),
  or: vi.fn((...predicates: unknown[]) => ({ kind: "or", predicates })),
}));
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
}));

import {
  createRefundRequest,
  completeCreditRefund,
  drainRefundTransitionOutbox,
} from "./group-buy-refund";

describe("transactional group-buy refunds", () => {
  beforeEach(() => harness.reset());

  const createCredit = () => createRefundRequest(harness.db as any, {
    accountId: "buyer",
    orderId: "order-1",
    input: { method: "credit" },
  });

  it("keeps a credit audit marker pending after drain failure and delivers it once on retry", async () => {
    harness.state.failAudit = true;
    await createCredit();
    expect(harness.state.outbox).toHaveLength(1);
    expect(harness.state.outbox[0].deliveredAt).toBeNull();
    expect(harness.state.audits).toHaveLength(0);

    harness.state.failAudit = false;
    await expect(drainRefundTransitionOutbox(harness.db as any, { limit: 1 })).resolves.toBe(1);
    expect(harness.state.outbox[0].deliveredAt).toBeInstanceOf(Date);
    expect(harness.state.audits).toHaveLength(1);

    await expect(drainRefundTransitionOutbox(harness.db as any, { limit: 1 })).resolves.toBe(0);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.outbox).toHaveLength(1);
  });

  it("creates a crypto refund from the locked grand total", async () => {
    const result = await createRefundRequest(harness.db as any, {
      accountId: "buyer",
      orderId: "order-1",
      input: {
        method: "crypto",
        asset: "USDC",
        network: "Ethereum ERC-20",
        destinationWallet: "0x" + "C".repeat(40),
      },
    });

    expect(result).toMatchObject({
      status: "requested",
      method: "crypto",
      amountUsd: "123.45",
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: "0x" + "c".repeat(40),
      amountBaseUnits: "123450000",
    });
    expect(harness.state.refunds).toHaveLength(1);
    expect(harness.state.locks.filter(lock => ["account", "order", "groupBuy"].includes(lock)))
      .toEqual(["account", "order", "groupBuy"]);
  });

  it("creates a refund for a confirmed order without an incoming payment hash", async () => {
    await expect(createCredit()).resolves.toMatchObject({
      status: "requested",
      method: "credit",
      amountUsd: "123.45",
    });
  });

  it("snapshots the locked order's current edited grand total", async () => {
    harness.state.order.grandTotal = "200.00";

    await expect(createCredit()).resolves.toMatchObject({
      status: "requested",
      amountUsd: "200.00",
    });
    expect(harness.state.refunds[0]).toMatchObject({ amountUsd: "200.00" });
  });

  it("normalizes account identity once for @-prefixed callers", async () => {
    await expect(createRefundRequest(harness.db as any, {
      accountId: "@BUYER",
      orderId: "order-1",
      input: { method: "credit" },
    })).resolves.toMatchObject({ status: "requested" });
    expect(harness.state.refunds[0].accountId).toBe("buyer");
  });

  it("credits once, records the refund-linked ledger row, and cancels the order", async () => {
    const request = await createCredit();

    const result = await completeCreditRefund(harness.db as any, {
      refundId: request.id,
      username: "admin",
      role: "admin",
    });

    expect(result).toMatchObject({ id: request.id, status: "completed", amountUsd: "123.45" });
    expect(harness.state.account.credits).toBe(123.45);
    expect(harness.state.credits).toHaveLength(1);
    expect(harness.state.credits[0]).toMatchObject({
      amount: 123.45,
      refundId: request.id,
      orderId: "order-1",
      reason: "Group-buy refund for order #GB-001",
    });
    expect(harness.state.order).toMatchObject({ status: "Cancelled", paymentStatus: "refunded", refundStatus: "refunded" });
    expect(harness.state.updates
      .filter(update => update.table === harness.tables.refunds)
      .map(update => update.values.status)
      .filter(Boolean)).toEqual(["completed"]);
  });

  it("completes a hashless request as an account credit", async () => {
    const request = await createCredit();

    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id,
      username: "admin",
      role: "admin",
    })).resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    expect(harness.state.credits).toHaveLength(1);
  });

  it.each(["0.00", "not-a-number"])(
    "rejects a legacy credit row with malformed or non-positive amount %s",
    async amountUsd => {
      const request = await createCredit();
      harness.state.refunds[0].amountUsd = amountUsd;

      await expect(completeCreditRefund(harness.db as any, {
        refundId: request.id,
        username: "admin",
        role: "admin",
      })).rejects.toMatchObject({ code: "invalid_refund_amount" });
      expect(harness.state.credits).toHaveLength(0);
      expect(harness.state.order.refundStatus).toBeNull();
    },
  );

  it("canonicalizes a legacy credit amount before ledgering it", async () => {
    const request = await createCredit();
    harness.state.refunds[0].amountUsd = "123.4";

    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id,
      username: "admin",
      role: "admin",
    })).resolves.toMatchObject({ status: "completed", amountUsd: "123.40" });
    expect(harness.state.credits[0].amount).toBe(123.4);
  });

  it("uses the persisted credit snapshot after the order total changes", async () => {
    const request = await createCredit();
    harness.state.order.grandTotal = "999.99";

    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id,
      username: "admin",
      role: "admin",
    })).resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    expect(harness.state.credits[0].amount).toBe(123.45);
    expect(harness.state.refunds[0].amountUsd).toBe("123.45");
  });

  it.each([
    ["invalid wallet", { method: "crypto", asset: "USDC", network: "Ethereum ERC-20", destinationWallet: "not-an-address" }, "invalid_destination_wallet"],
    ["invalid asset", { method: "crypto", asset: "DAI", network: "Ethereum ERC-20", destinationWallet: "0x" + "c".repeat(40) }, "invalid_asset"],
    ["invalid network", { method: "crypto", asset: "USDC", network: "Polygon", destinationWallet: "0x" + "c".repeat(40) }, "invalid_network"],
  ] as const)("rejects %s before creating a row", async (_name, input, code) => {
    await expect(createRefundRequest(harness.db as any, {
      accountId: "buyer", orderId: "order-1", input: input as any,
    })).rejects.toMatchObject({ code });
    expect(harness.state.refunds).toHaveLength(0);
  });

  it.each([
    ["disabled", () => { harness.state.groupBuy.cryptoRefundsEnabled = false; }, "refunds_disabled"],
    ["cancelled", () => { harness.state.order.status = "Cancelled"; }, "already_cancelled"],
    ["test-confirmed", () => { harness.state.order.paymentStatus = "test_confirmed"; }, "ineligible_payment_evidence"],
    ["pending", () => { harness.state.order.paymentStatus = "pending"; }, "ineligible_payment_evidence"],
    ["unpaid", () => { (harness.state.order as any).paymentConfirmedAt = null; }, "ineligible_payment_evidence"],
    ["wholesale", () => { (harness.state.order as any).orderType = "wholesale"; }, "not_group_buy_order"],
    ["non-positive total", () => { harness.state.order.grandTotal = "0.00"; }, "non_positive_total"],
    ["already refunded", () => { (harness.state.order as any).refundStatus = "refunded"; }, "already_refunded"],
    ["non-group-buy", () => { (harness.state.order as any).groupBuyId = null; }, "not_group_buy_order"],
    ["non-owner", () => { harness.state.order.telegramUsername = "@other"; }, "not_owner"],
  ] as const)("rejects %s without a refund row", async (_name, change, code) => {
    change();
    await expect(createCredit()).rejects.toMatchObject({ code });
    expect(harness.state.refunds).toHaveLength(0);
  });

  it("does not create a second row for an existing active refund", async () => {
    harness.state.refunds.push({
      id: "existing-refund",
      orderId: "order-1",
      groupBuyId: "gb-1",
      accountId: "buyer",
      method: "credit",
      status: "requested",
      amountUsd: "123.45",
      asset: null,
      network: null,
      destinationWallet: null,
      amountBaseUnits: null,
    });

    await expect(createCredit()).resolves.toMatchObject({
      id: "existing-refund",
      status: "requested",
    });
    expect(harness.state.refunds).toHaveLength(1);
  });

  it("models two request transactions contending on the partial unique constraint", async () => {
    harness.state.serializeTransactions = false;
    const results = await Promise.all([
      createCredit(),
      createCredit(),
    ]);
    expect(new Set(results.map(result => result.id)).size).toBe(1);
    expect(harness.state.refunds).toHaveLength(1);
    expect(harness.state.refunds[0].status).toBe("requested");
  });

  it("handles an active-to-completed race without duplicate credit", async () => {
    const request = await createCredit();
    harness.state.beforeRefundUpdate = () => { harness.state.refunds[0].status = "completed"; };
    harness.state.updates.length = 0;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "completed_refund_linkage_mismatch" });
    expect(harness.state.account.credits).toBe(0);
    expect(harness.state.credits).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(1);
  });

  it("rejects crypto completion with the stable method-mismatch code", async () => {
    const request = await createCredit();
    harness.state.refunds[0].method = "crypto";
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "refund_method_mismatch" });
    expect(harness.state.credits).toHaveLength(0);
  });

  it.each([
    ["deleted", () => { (harness.state.order as any).deletedAt = new Date(); }],
    ["cancelled", () => { harness.state.order.status = "Cancelled"; }],
    ["already refunded", () => { (harness.state.order as any).refundStatus = "refunded"; }],
    ["payment status changed", () => { harness.state.order.paymentStatus = "pending"; }],
  ] as const)("rejects completion when the %s order state changes", async (_name, change) => {
    const request = await createCredit();
    change();
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "payment_state_changed" });
    expect(harness.state.credits).toHaveLength(0);
  });

  it("allows an active request to complete after crypto refunds are disabled", async () => {
    const request = await createCredit();
    harness.state.groupBuy.cryptoRefundsEnabled = false;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ status: "completed" });
  });


  it("rejects completion without payment confirmation time and makes no financial writes", async () => {
    const request = await createCredit();
    (harness.state.order as any).paymentConfirmedAt = null;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "payment_state_changed" });
    expect(harness.state.credits).toHaveLength(0);
  });

  it("rejects a verifying refund without financial writes", async () => {
    const request = await createCredit();
    harness.state.refunds[0].status = "verifying";
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "invalid_refund_transition" });
    expect(harness.state.credits).toHaveLength(0);
  });

  it("completes a verification-failed refund", async () => {
    const request = await createCredit();
    harness.state.refunds[0].status = "verification_failed";
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ id: request.id, status: "completed" });
  });

  it.each([
    ["account", () => { harness.state.refunds[0].accountId = "other"; }],
    ["group buy", () => { harness.state.refunds[0].groupBuyId = "other-gb"; }],
    ["refund order", () => { harness.state.refunds[0].orderId = "other-order"; }],
  ] as const)("rejects %s linkage mismatch without financial writes", async (_name, change) => {
    const request = await createCredit();
    change();
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: expect.stringMatching(/not_found|refund_linkage_mismatch/) });
    expect(harness.state.credits).toHaveLength(0);
  });

  it("models serialized fake transactions so only one balance and ledger write commits", async () => {
    const request = await createCredit();
    const results = await Promise.all([
      completeCreditRefund(harness.db as any, { refundId: request.id, username: "admin", role: "admin" }),
      completeCreditRefund(harness.db as any, { refundId: request.id, username: "admin", role: "admin" }),
    ]);
    expect(results.filter(result => result.status === "completed")).toHaveLength(2);
    expect(harness.state.account.credits).toBe(123.45);
    expect(harness.state.credits).toHaveLength(1);
  });

  it("rolls back ledger failures and can retry from requested", async () => {
    const request = await createCredit();
    harness.state.failLedger = true;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toThrow("ledger insert failed");
    expect(harness.state.refunds[0].status).toBe("requested");
    expect(harness.state.account.credits).toBe(0);
    harness.state.failLedger = false;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ status: "completed" });
  });

  it("rolls back order failures atomically", async () => {
    const request = await createCredit();
    harness.state.failOrder = true;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toThrow();
    expect(harness.state.refunds[0].status).toBe("requested");
    expect(harness.state.account.credits).toBe(0);
    expect(harness.state.credits).toHaveLength(0);
    harness.state.failOrder = false;
    harness.state.failAudit = false;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ status: "completed" });
  });

  it("enforces organiser scope and locks completion in global order", async () => {
    const request = await createCredit();
    harness.state.locks.length = 0;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "wrong", role: "organiser",
    })).rejects.toMatchObject({ code: "forbidden" });
    expect(harness.state.locks.filter(lock => ["account", "order", "groupBuy", "refund"].includes(lock))).toEqual([]);
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "organiser", role: "organiser", groupBuyId: "other",
    })).rejects.toMatchObject({ code: "group_buy_scope" });
    await completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    });
    expect(harness.state.locks.filter(lock => ["account", "order", "groupBuy", "refund"].includes(lock)))
      .toEqual(["account", "order", "groupBuy", "refund"]);
  });

  it("returns a completed row unchanged on duplicate completion but still enforces scope", async () => {
    const request = await createCredit();
    await completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    });
    const credits = harness.state.credits.length;
    const audits = harness.state.audits.length;
    const updates = harness.state.updates.filter(update =>
      update.table !== harness.tables.outbox && update.table !== harness.tables.notifications,
    ).length;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ id: request.id, status: "completed" });
    expect(harness.state.credits).toHaveLength(credits);
    expect(harness.state.audits).toHaveLength(audits);
    expect(harness.state.updates.filter(update =>
      update.table !== harness.tables.outbox && update.table !== harness.tables.notifications,
    )).toHaveLength(updates);
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "wrong", role: "organiser",
    })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns a completed refund idempotently on retry", async () => {
    const request = await createCredit();
    await completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    });
    const credits = harness.state.credits.length;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ id: request.id, status: "completed" });
    expect(harness.state.credits).toHaveLength(credits);
  });

  it("returns forbidden for an unauthorized organiser", async () => {
    const request = await createCredit();
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "not-organiser", role: "organiser",
    })).rejects.toMatchObject({ code: "forbidden" });
  });
});
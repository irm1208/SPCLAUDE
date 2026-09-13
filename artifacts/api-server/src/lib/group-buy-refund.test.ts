import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const tables = {
    accounts: { telegramUsername: "telegramUsername" },
    orders: {
      id: "id", telegramUsername: "telegramUsername", groupBuyId: "groupBuyId",
      orderType: "orderType", deletedAt: "deletedAt", status: "status",
      refundStatus: "refundStatus", paymentStatus: "paymentStatus",
      paymentTxHash: "paymentTxHash", paymentTxHashes: "paymentTxHashes",
      paymentConfirmedAt: "paymentConfirmedAt", paymentCryptoCurrency: "paymentCryptoCurrency",
      paymentCryptoNetwork: "paymentCryptoNetwork", grandTotal: "grandTotal",
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
  };
  const state = {
    account: { telegramUsername: "buyer", credits: 0 },
    order: {
      id: "order-1", telegramUsername: "@buyer", groupBuyId: "gb-1", orderType: null,
      deletedAt: null, status: "Submitted", refundStatus: null, paymentStatus: "confirmed",
      paymentTxHash: "0x" + "a".repeat(64), paymentTxHashes: null,
      paymentConfirmedAt: new Date(), paymentCryptoCurrency: "USDT",
      paymentCryptoNetwork: "ERC-20", grandTotal: "123.45", paymentScreenshot: null,
      refundedAt: null,
    },
    groupBuy: { id: "gb-1", cryptoRefundsEnabled: true, organiserId: "organiser" },
    refunds: [] as Array<Record<string, unknown>>,
    credits: [] as Array<Record<string, unknown>>,
    audits: [] as Array<Record<string, unknown>>,
    locks: [] as string[],
    updates: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  };
  function eq(column: unknown, value: unknown) {
    return { kind: "eq", column, value };
  }
  function rowsFor(table: unknown, predicate: any) {
    const rows = table === tables.accounts ? [state.account]
      : table === tables.orders ? [state.order]
        : table === tables.groupBuys ? [state.groupBuy]
          : table === tables.refunds ? state.refunds : [];
    if (!predicate || predicate.kind !== "eq") return rows;
    return rows.filter(row => row[predicate.column] === predicate.value);
  }
  function project(row: Record<string, unknown>, selection: any) {
    if (!selection) return { ...row };
    return Object.fromEntries(Object.entries(selection).map(([key, column]) => [key, row[column as string]]));
  }
  function selectBuilder(selection?: any) {
    return {
      from: (table: unknown) => ({
        where: (predicate: any) => {
          const query = {
            for: vi.fn(async () => {
              state.locks.push(String(table === tables.accounts ? "account" : table === tables.orders ? "order" : table === tables.groupBuys ? "groupBuy" : "refund"));
              return rowsFor(table, predicate).map(row => project(row, selection));
            }),
            then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
              Promise.resolve(rowsFor(table, predicate).map(row => project(row, selection))).then(resolve, reject),
          };
          return query;
        },
      }),
    };
  }
  const transaction = {
    select: vi.fn((selection?: any) => selectBuilder(selection)),
    update: vi.fn((table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          state.updates.push({ table, values });
          if (table === tables.accounts) Object.assign(state.account, values);
          if (table === tables.orders) Object.assign(state.order, values);
          if (table === tables.refunds) Object.assign(state.refunds[0], values);
          return {
            returning: async () => [{ id: "refund-1" }],
            then: (resolve: (value: unknown) => unknown) => Promise.resolve([{ id: "refund-1" }]).then(resolve),
          };
        },
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        const save = () => {
          if (table === tables.refunds) state.refunds.push(values);
          if (table === tables.credit) state.credits.push(values);
          if (table === tables.audit) state.audits.push(values);
        };
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
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
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(transaction)),
  };
  function reset() {
    state.refunds.length = 0;
    state.credits.length = 0;
    state.audits.length = 0;
    state.locks.length = 0;
    state.updates.length = 0;
    state.account.credits = 0;
    state.order.refundStatus = null;
    state.order.status = "Submitted";
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
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...predicates: unknown[]) => ({ kind: "and", predicates })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: "eq", column, value })),
  inArray: vi.fn((column: unknown, value: unknown[]) => ({ kind: "inArray", column, value })),
}));
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
  isValidTxHash: (value: string) => /^(?:0x)?[0-9a-fA-F]{64}$/.test(value),
  verifyTransaction: vi.fn(async () => ({ verified: true, amountUsdt: 123.45, blockConfirmations: 8 })),
}));
vi.mock("../routes/payments", () => ({
  resolveEffectiveOrderCrypto: vi.fn(async () => ({
    walletAddress: "0x" + "b".repeat(40), currency: "USDT", network: "ERC-20",
  })),
}));

import { createRefundRequest, completeCreditRefund } from "./group-buy-refund";

describe("transactional group-buy refunds", () => {
  beforeEach(() => harness.reset());

  it("creates a crypto refund from the locked grand total and verified original payment", async () => {
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
    expect(harness.state.locks.slice(0, 3)).toEqual(["account", "order", "groupBuy"]);
  });

  it("credits once, records the refund-linked ledger row, and cancels the order", async () => {
    const request = await createRefundRequest(harness.db as any, {
      accountId: "buyer",
      orderId: "order-1",
      input: { method: "credit" },
    });

    const result = await completeCreditRefund(harness.db as any, {
      refundId: request.id,
      username: "admin",
      role: "admin",
    });

    expect(result).toMatchObject({ id: request.id, status: "completed", amountUsd: "123.45" });
    expect(harness.state.account.credits).toBe(123.45);
    expect(harness.state.credits).toHaveLength(1);
    expect(harness.state.credits[0]).toMatchObject({ amount: 123.45, refundId: request.id, orderId: "order-1" });
    expect(harness.state.order).toMatchObject({ status: "Cancelled", paymentStatus: "refunded", refundStatus: "refunded" });
  });
});
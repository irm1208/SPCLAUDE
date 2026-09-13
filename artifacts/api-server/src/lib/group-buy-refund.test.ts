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
      id: "order-1", code: "GB-001", telegramUsername: "@buyer", groupBuyId: "gb-1", orderType: null,
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
    forceConflict: false,
    claimNoRows: false,
    failLedger: false,
    failOrder: false,
    failAudit: false,
    beforeVerify: null as null | (() => void),
    resolvedWallet: "0x" + "b".repeat(40),
    resolvedCurrency: "USDT",
    resolvedNetwork: "ERC-20",
  };
  function eq(column: unknown, value: unknown) {
    return { kind: "eq", column, value };
  }
  function rowsFor(table: unknown, predicate: any) {
    const rows = table === tables.accounts ? [state.account]
      : table === tables.orders ? [state.order]
        : table === tables.groupBuys ? [state.groupBuy]
          : table === tables.refunds ? state.refunds : [];
    function matches(row: Record<string, unknown>, condition: any): boolean {
      if (!condition) return true;
      if (condition.kind === "eq") return row[condition.column] === condition.value;
      if (condition.kind === "inArray") return condition.value.includes(row[condition.column]);
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
          if (table === tables.credit && state.failLedger) throw new Error("ledger insert failed");
          if (table === tables.orders && state.failOrder) throw new Error("order update failed");
          if (table === tables.refunds && state.claimNoRows) {
            return {
              returning: async () => [],
              then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve),
            };
          }
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
          if (table === tables.credit && state.failLedger) throw new Error("ledger insert failed");
          if (table === tables.audit && state.failAudit) throw new Error("audit insert failed");
          if (table === tables.refunds) state.refunds.push(values);
          if (table === tables.credit) state.credits.push(values);
          if (table === tables.audit) state.audits.push(values);
        };
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
              if (table === tables.refunds && state.forceConflict) return [];
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
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => {
      const snapshot = JSON.parse(JSON.stringify({
        account: state.account,
        order: state.order,
        groupBuy: state.groupBuy,
        refunds: state.refunds,
        credits: state.credits,
        audits: state.audits,
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
        state.updates = snapshot.updates;
        throw error;
      }
    }),
  };
  function reset() {
    state.refunds.length = 0;
    state.credits.length = 0;
    state.audits.length = 0;
    state.locks.length = 0;
    state.updates.length = 0;
    state.forceConflict = false;
    state.claimNoRows = false;
    state.failLedger = false;
    state.failOrder = false;
    state.failAudit = false;
    state.beforeVerify = null;
    state.resolvedWallet = "0x" + "b".repeat(40);
    state.resolvedCurrency = "USDT";
    state.resolvedNetwork = "ERC-20";
    state.account.credits = 0;
    state.order.refundStatus = null;
    state.order.status = "Submitted";
    state.order.groupBuyId = "gb-1";
    state.order.telegramUsername = "@buyer";
    state.order.paymentStatus = "confirmed";
    state.order.paymentTxHash = "0x" + "a".repeat(64);
    state.order.paymentTxHashes = null;
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
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...predicates: unknown[]) => ({ kind: "and", predicates })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: "eq", column, value })),
  inArray: vi.fn((column: unknown, value: unknown[]) => ({ kind: "inArray", column, value })),
}));
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
  isValidTxHash: (value: string) => /^(?:0x)?[0-9a-fA-F]{64}$/.test(value),
  verifyTransaction: vi.fn(async () => {
    const mutation = harness.state.beforeVerify;
    harness.state.beforeVerify = null;
    mutation?.();
    return {
      verified: true,
      amountUsdt: 123.45,
      blockConfirmations: 8,
      recipientAddress: "0x" + "b".repeat(40),
    };
  }),
}));
vi.mock("../routes/payments", () => ({
  resolveEffectiveOrderCrypto: vi.fn(async () => ({
    walletAddress: harness.state.resolvedWallet,
    currency: harness.state.resolvedCurrency,
    network: harness.state.resolvedNetwork,
  })),
}));

import { createRefundRequest, completeCreditRefund } from "./group-buy-refund";

describe("transactional group-buy refunds", () => {
  beforeEach(() => harness.reset());

  const createCredit = () => createRefundRequest(harness.db as any, {
    accountId: "buyer",
    orderId: "order-1",
    input: { method: "credit" },
  });

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
    ["screenshot-only", () => { (harness.state.order as any).paymentTxHash = null; (harness.state.order as any).paymentTxHashes = null; }, "ineligible_payment_evidence"],
    ["non-group-buy", () => { (harness.state.order as any).groupBuyId = null; }, "not_group_buy_order"],
    ["non-owner", () => { harness.state.order.telegramUsername = "@other"; }, "not_owner"],
  ] as const)("rejects %s without a refund row", async (_name, change, code) => {
    change();
    await expect(createCredit()).rejects.toMatchObject({ code });
    expect(harness.state.refunds).toHaveLength(0);
  });

  it("returns an existing active refund and recovers a concurrent unique conflict safely", async () => {
    const existing = {
      id: "existing", orderId: "order-1", groupBuyId: "gb-1", accountId: "buyer",
      method: "credit", status: "requested", amountUsd: "123.45",
      asset: null, network: null, destinationWallet: null, amountBaseUnits: null,
    };
    harness.state.refunds.push(existing);
    await expect(createCredit()).resolves.toMatchObject({ id: "existing", status: "requested" });
    harness.reset();
    harness.state.forceConflict = true;
    harness.state.refunds.push({ ...existing, id: "winner" });
    await expect(createCredit()).resolves.toMatchObject({ id: "winner", status: "requested" });
  });

  it.each([
    ["transaction identity", () => { harness.state.order.paymentTxHash = "0x" + "d".repeat(64); }],
    ["expected payment amount", () => { (harness.state.order as any).paymentUsdAmount = "99.99"; }],
    ["effective recipient wallet", () => { harness.state.resolvedWallet = "0x" + "e".repeat(40); }],
    ["effective currency rail", () => { harness.state.resolvedCurrency = "USDC"; }],
    ["effective network rail", () => { harness.state.resolvedNetwork = "Ethereum Mainnet"; }],
  ] as const)("rejects a %s TOCTOU change under the lock", async (_name, change) => {
    harness.state.beforeVerify = change;
    await expect(createCredit()).rejects.toMatchObject({ code: "payment_evidence_changed" });
    expect(harness.state.refunds).toHaveLength(0);
  });

  it("claims directly to completed and performs no writes when the conditional claim loses", async () => {
    const request = await createCredit();
    harness.state.claimNoRows = true;
    harness.state.updates.length = 0;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).rejects.toMatchObject({ code: "refund_claim_lost" });
    expect(harness.state.account.credits).toBe(0);
    expect(harness.state.credits).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.updates).toHaveLength(0);
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

  it.each([
    ["order", () => { harness.state.failOrder = true; }],
    ["audit", () => { harness.state.failAudit = true; }],
  ] as const)("rolls back %s failures atomically", async (_name, fail) => {
    const request = await createCredit();
    fail();
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
    expect(harness.state.locks).toEqual(["account", "order", "groupBuy", "refund"]);
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "organiser", role: "organiser", groupBuyId: "other",
    })).rejects.toMatchObject({ code: "group_buy_scope" });
  });

  it("returns a completed row unchanged on duplicate completion but still enforces scope", async () => {
    const request = await createCredit();
    await completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    });
    const credits = harness.state.credits.length;
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "admin", role: "admin",
    })).resolves.toMatchObject({ id: request.id, status: "completed" });
    expect(harness.state.credits).toHaveLength(credits);
    await expect(completeCreditRefund(harness.db as any, {
      refundId: request.id, username: "wrong", role: "organiser",
    })).rejects.toMatchObject({ code: "forbidden" });
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  const tables = {
    accounts: { telegramUsername: "account.username" },
    orders: { id: "order.id" },
    groups: { id: "group.id" },
    refunds: {
      id: "refund.id", orderId: "refund.order", groupBuyId: "refund.group",
      accountId: "refund.account", status: "refund.status", method: "refund.method",
      asset: "refund.asset", network: "refund.network", destinationWallet: "refund.wallet",
      amountBaseUnits: "refund.amount", outgoingTxid: "refund.txid",
      processorUsername: "refund.processor", processorRole: "refund.role",
      processingAttemptId: "refund.attempt", verifyingAt: "refund.verifyingAt",
    },
    attempts: {
      id: "attempt.id", refundId: "attempt.refund", submittedTxid: "attempt.txid",
    },
    claims: { txid: "claim.txid" },
    audit: "audit",
  };
  type Row = Record<string, any>;
  const state = {
    account: { telegramUsername: "buyer" },
    order: { id: "order-1", telegramUsername: "@buyer", groupBuyId: "gb-1", status: "Submitted", refundStatus: null, paymentStatus: "confirmed" },
    group: { id: "gb-1", organiserId: "organiser" },
    refunds: [] as Row[],
    attempts: [] as Row[],
    claims: [] as Row[],
    audits: [] as Row[],
    verify: { verified: true, confirmationCount: 12 } as any,
    failAudit: false,
    failOrder: false,
    failAttemptUpdate: false,
    serial: Promise.resolve(),
  };
  const eq = (column: unknown, value: unknown) => ({ kind: "eq", column, value });
  const and = (...predicates: unknown[]) => ({ kind: "and", predicates });
  const inArray = (column: unknown, value: unknown[]) => ({ kind: "inArray", column, value });
  function rowsFor(table: unknown, predicate: any): Row[] {
    const rows = table === tables.accounts ? [state.account]
      : table === tables.orders ? [state.order]
        : table === tables.groups ? [state.group]
          : table === tables.refunds ? state.refunds
            : table === tables.attempts ? state.attempts
              : table === tables.claims ? state.claims
                : [];
    const matches = (row: Row, condition: any): boolean => {
      if (!condition) return true;
      if (condition.kind === "eq") return Object.values(row).includes(condition.value)
        || (table === tables.refunds && (
          (condition.column === tables.refunds.id && row.id === condition.value)
          || (condition.column === tables.refunds.orderId && row.orderId === condition.value)
          || (condition.column === tables.refunds.outgoingTxid && row.outgoingTxid === condition.value)
          || (condition.column === tables.refunds.processingAttemptId && row.processingAttemptId === condition.value)
          || (condition.column === tables.refunds.status && row.status === condition.value)
          || (condition.column === tables.refunds.accountId && row.accountId === condition.value)
          || (condition.column === tables.refunds.groupBuyId && row.groupBuyId === condition.value)
        ))
        || (table === tables.attempts && (
          (condition.column === tables.attempts.id && row.id === condition.value)
          || (condition.column === tables.attempts.refundId && row.refundId === condition.value)
          || (condition.column === tables.attempts.submittedTxid && row.submittedTxid === condition.value)
        ))
        || (table === tables.claims && condition.column === tables.claims.txid && row.txid === condition.value);
      if (condition.kind === "inArray") return condition.value.includes(
        table === tables.refunds ? row.status : row.value,
      );
      if (condition.kind === "and") return condition.predicates.every((item: any) => matches(row, item));
      return true;
    };
    return rows.filter(row => matches(row, predicate));
  }
  function builder(selection?: any) {
    return {
      from: (table: unknown) => ({
        where: (predicate: any) => {
          const result = rowsFor(table, predicate).map(row => selection
            ? Object.fromEntries(Object.entries(selection).map(([key, column]) => [key, row[column as string]]))
            : row);
          return {
            for: vi.fn(async () => result),
            then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
          };
        },
      }),
    };
  }
  function mutation(table: unknown, values: Row) {
    if (table === tables.audit && state.failAudit) throw new Error("audit failed");
    if (table === tables.orders && state.failOrder) throw new Error("order failed");
    if (table === tables.attempts && state.failAttemptUpdate) throw new Error("attempt failed");
    const rows = rowsFor(table, null);
    const inserted = table === tables.refunds ? state.refunds.push(values)
      : table === tables.attempts ? state.attempts.push(values)
        : table === tables.claims ? state.claims.push(values)
          : table === tables.audit ? state.audits.push(values)
            : 0;
    return inserted;
  }
  const tx = {
    select: vi.fn((selection?: any) => builder(selection)),
    update: vi.fn((table: unknown) => ({
      set: (values: Row) => ({
        where: (predicate: any) => {
          if (table === tables.orders && state.failOrder) throw new Error("order failed");
          if (table === tables.attempts && state.failAttemptUpdate) throw new Error("attempt failed");
          const rows = rowsFor(table, predicate);
          rows.forEach(row => Object.assign(row, values));
          const result = rows.map(row => ({ ...row }));
          return {
            returning: async () => result,
            then: (resolve: any) => Promise.resolve(result).then(resolve),
          };
        },
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: (values: Row) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (table === tables.claims && state.claims.some(row => row.txid === values.txid)) return [];
            mutation(table, values);
            return [values];
          },
        }),
        then: (resolve: any) => {
          mutation(table, values);
          return Promise.resolve(undefined).then(resolve);
        },
      }),
    })),
  };
  const db = {
    select: vi.fn((selection?: any) => builder(selection)),
    transaction: vi.fn((callback: (database: any) => unknown) => {
      const run = async () => {
        const snapshot = JSON.parse(JSON.stringify({
          account: state.account, order: state.order, refunds: state.refunds,
          attempts: state.attempts, claims: state.claims, audits: state.audits,
        }));
        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(state.account, snapshot.account);
          Object.assign(state.order, snapshot.order);
          state.refunds = snapshot.refunds;
          state.attempts = snapshot.attempts;
          state.claims = snapshot.claims;
          state.audits = snapshot.audits;
          throw error;
        }
      };
      const runAfter = state.serial.then(run, run);
      state.serial = runAfter.then(() => undefined, () => undefined);
      return runAfter;
    }),
  };
  function reset() {
    state.refunds = [{
      id: "refund-1", orderId: "order-1", groupBuyId: "gb-1", accountId: "buyer",
      method: "crypto", asset: "USDC", network: "Ethereum ERC-20",
      destinationWallet: `0x${"b".repeat(40)}`, amountBaseUnits: "123450000",
      status: "requested", outgoingTxid: null, processorUsername: null,
      processorRole: null, processingAttemptId: null, verifyingAt: null,
    }];
    state.attempts = [];
    state.claims = [];
    state.audits = [];
    state.order.status = "Submitted";
    state.order.refundStatus = null;
    state.order.paymentStatus = "confirmed";
    state.verify = { verified: true, confirmationCount: 12 };
    state.failAudit = false;
    state.failOrder = false;
    state.failAttemptUpdate = false;
    state.serial = Promise.resolve();
  }
  return { tables, state, db, eq, and, inArray, reset, verify: vi.fn(async () => state.verify) };
});

vi.mock("@workspace/db", () => ({
  accountsTable: fake.tables.accounts, ordersTable: fake.tables.orders, groupBuysTable: fake.tables.groups,
  groupBuyRefundsTable: fake.tables.refunds, groupBuyRefundAttemptsTable: fake.tables.attempts,
  groupBuyRefundTxClaimsTable: fake.tables.claims, auditLogsTable: fake.tables.audit,
}));
vi.mock("drizzle-orm", () => ({ eq: fake.eq, and: fake.and, inArray: fake.inArray }));
vi.mock("../routes/payments", () => ({ resolveEffectiveOrderCrypto: vi.fn(async () => ({
  walletAddress: `0x${"c".repeat(40)}`, currency: "USDT", network: "ERC-20",
})) }));
vi.mock("./payment-verify", () => ({ isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value) }));
vi.mock("./refund-crypto-verifier", () => ({
  normalizeEthereumTxid: (value: string) => value.toLowerCase(),
  verifyRefundCryptoTransfer: fake.verify,
}));

import { GroupBuyRefundError, submitCryptoRefund } from "./group-buy-refund";

const tx1 = `0x${"1".repeat(64)}`;
const tx2 = `0x${"2".repeat(64)}`;
const processor = { username: "admin", role: "admin" };

describe("submitCryptoRefund transactional lifecycle", () => {
  beforeEach(() => fake.reset());

  it("completes, cancels the order, and audits normalized outgoing TXID", async () => {
    const result = await submitCryptoRefund(fake.db, processor, "refund-1", tx1.toUpperCase());
    expect(result).toMatchObject({ status: "completed", outgoingTxid: tx1.toLowerCase() });
    expect(fake.state.order).toMatchObject({ status: "Cancelled", refundStatus: "refunded", paymentStatus: "refunded" });
    expect(fake.state.audits.at(-1)!.metadata.outgoingTxid).toBe(tx1);
  });

  it("leaves the order untouched and closes the attempt for verifier failure", async () => {
    fake.state.verify = { verified: false, code: "insufficient_confirmations", message: "wait" };
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1)).rejects.toMatchObject({
      code: "insufficient_confirmations",
    });
    expect(fake.state.order.status).toBe("Submitted");
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.attempts[0]).toMatchObject({ resultCode: "insufficient_confirmations" });
    expect(fake.state.attempts[0].endedAt).toBeTruthy();
  });

  it.each([
    "invalid_txid", "wrong_network", "wrong_token", "wrong_recipient",
    "wrong_amount", "failed_transaction", "transaction_not_found",
    "insufficient_confirmations", "provider_unavailable",
  ] as const)("keeps the order untouched for verifier code %s", async code => {
    fake.state.verify = { verified: false, code, message: "safe failure" };
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code });
    expect(fake.state.order).toMatchObject({ status: "Submitted", refundStatus: null, paymentStatus: "confirmed" });
    expect(fake.state.refunds[0]).toMatchObject({
      status: "verification_failed",
      verificationErrorCode: code,
    });
    expect(fake.state.attempts[0]).toMatchObject({ resultCode: code });
    expect(fake.state.attempts[0].endedAt).toBeTruthy();
  });

  it("allows the same TXID to retry after insufficient confirmations", async () => {
    fake.state.verify = { verified: false, code: "insufficient_confirmations", message: "wait" };
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1)).rejects.toThrow();
    fake.state.verify = { verified: true, confirmationCount: 12 };
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1)).resolves.toMatchObject({ status: "completed" });
    expect(fake.state.attempts).toHaveLength(2);
  });

  it("returns immutable/idempotent completed results and blocks replay", async () => {
    await submitCryptoRefund(fake.db, processor, "refund-1", tx1);
    const verifyCalls = fake.verify.mock.calls.length;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1)).resolves.toMatchObject({ status: "completed" });
    expect(fake.verify.mock.calls.length).toBe(verifyCalls);
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx2)).rejects.toMatchObject({ code: "completed_txid_immutable" });
  });

  it("rejects an organiser outside the exact group-buy owner scope", async () => {
    await expect(submitCryptoRefund(fake.db, { username: "someone", role: "organiser", groupBuyId: "gb-1" }, "refund-1", tx1))
      .rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows only one cross-refund owner of a concurrent TXID claim", async () => {
    fake.state.refunds.push({
      ...fake.state.refunds[0],
      id: "refund-2",
      orderId: "order-1",
      accountId: "buyer",
    });
    const results = await Promise.allSettled([
      submitCryptoRefund(fake.db, processor, "refund-1", tx2),
      submitCryptoRefund(fake.db, processor, "refund-2", tx2),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")
      .map(result => (result as PromiseRejectedResult).reason.code)).toContain("txid_replay");
  });

  it("reports fresh verification as in progress and reclaims a stale lease", async () => {
    const attempt = {
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: new Date(), endedAt: null,
    };
    fake.state.attempts.push(attempt);
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = attempt.id;
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = new Date();
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "in_progress" });

    fake.state.attempts[0].startedAt = new Date(Date.now() - 16 * 60 * 1000);
    fake.state.refunds[0].verifyingAt = fake.state.attempts[0].startedAt;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.attempts[0].resultCode).toBe("processing_failure");
    expect(fake.state.attempts).toHaveLength(2);
  });

  it("compensates order failure and audit failure without stranding verification", async () => {
    fake.state.failOrder = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "processing_failure" });
    expect(fake.state.order.status).toBe("Submitted");
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.attempts[0].resultCode).toBe("processing_failure");

    fake.reset();
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "processing_failure" });
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.order.status).toBe("Submitted");
    fake.state.failAudit = false;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
  });
});
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
      processorUsername: "attempt.processor", endedAt: "attempt.ended",
    },
    claims: { txid: "claim.txid" },
    outbox: { id: "outbox.id", refundId: "outbox.refund", attemptId: "outbox.attempt", deliveredAt: "outbox.delivered" },
    audit: "audit",
  };
  type Row = Record<string, any>;
  const state = {
    account: { telegramUsername: "buyer" },
    order: {
      id: "order-1", telegramUsername: "@buyer", groupBuyId: "gb-1", status: "Submitted",
      refundStatus: null, paymentStatus: "confirmed", paymentConfirmedAt: new Date(),
      deletedAt: null, grandTotal: "123.45", paymentUsdAmount: null as string | null,
      paymentTxHash: `0x${"a".repeat(64)}`, paymentCryptoCurrency: "USDT",
      paymentCryptoNetwork: "ERC-20",
    },
    group: { id: "gb-1", organiserId: "organiser" },
    refunds: [] as Row[],
    attempts: [] as Row[],
    claims: [] as Row[],
    outbox: [] as Row[],
    audits: [] as Row[],
    verify: { verified: true, confirmationCount: 12 } as any,
    failAudit: false,
    failOrder: false,
    failAttemptUpdate: false,
    failOutboxUpdate: false,
    paymentVerifierAvailable: true,
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
                : table === tables.outbox ? state.outbox
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
          || (condition.column === tables.refunds.processorUsername && row.processorUsername === condition.value)
        ))
        || (table === tables.attempts && (
          (condition.column === tables.attempts.id && row.id === condition.value)
          || (condition.column === tables.attempts.refundId && row.refundId === condition.value)
          || (condition.column === tables.attempts.submittedTxid && row.submittedTxid === condition.value)
          || (condition.column === tables.attempts.processorUsername && row.processorUsername === condition.value)
        ))
        || (table === tables.claims && condition.column === tables.claims.txid && row.txid === condition.value)
        || (table === tables.outbox && (
          (condition.column === tables.outbox.id && row.id === condition.value)
          || (condition.column === tables.outbox.refundId && row.refundId === condition.value)
          || (condition.column === tables.outbox.attemptId && row.attemptId === condition.value)
        ));
      if (condition.kind === "inArray") return condition.value.includes(
        table === tables.refunds ? row.status : row.value,
      );
      if (condition.kind === "isNull") {
        return condition.column === tables.outbox.deliveredAt ? row.deliveredAt == null : row.endedAt == null;
      }
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
          const query: any = {
            for: vi.fn(async () => result),
            then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
          };
          query.orderBy = () => query;
          query.limit = () => query;
          return query;
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
          : table === tables.outbox ? state.outbox.push(values)
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
          if (table === tables.outbox && state.failOutboxUpdate) throw new Error("outbox update failed");
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
            if (table === tables.outbox && state.outbox.some(row =>
              row.refundId === values.refundId
              && row.attemptId === values.attemptId
              && row.transition === values.transition
            )) return [];
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
          outbox: state.outbox,
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
          state.outbox = snapshot.outbox;
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
      processorRole: null, processingAttemptId: null, verifyingAt: null, updatedAt: null,
    }];
    state.attempts = [];
    state.claims = [];
    state.outbox = [];
    state.audits = [];
    state.order.status = "Submitted";
    state.order.refundStatus = null;
    state.order.paymentStatus = "confirmed";
    state.order.paymentConfirmedAt = new Date();
    state.order.deletedAt = null;
    state.order.grandTotal = "123.45";
    state.order.paymentUsdAmount = null;
    state.order.paymentTxHash = `0x${"a".repeat(64)}`;
    state.order.paymentCryptoCurrency = "USDT";
    state.order.paymentCryptoNetwork = "ERC-20";
    state.verify = { verified: true, confirmationCount: 12 };
    state.failAudit = false;
    state.failOrder = false;
    state.failAttemptUpdate = false;
    state.failOutboxUpdate = false;
    state.paymentVerifierAvailable = true;
    state.serial = Promise.resolve();
  }
  return { tables, state, db, eq, and, inArray, reset, verify: vi.fn(async () => state.verify) };
});

vi.mock("@workspace/db", () => ({
  accountsTable: fake.tables.accounts, ordersTable: fake.tables.orders, groupBuysTable: fake.tables.groups,
  groupBuyRefundsTable: fake.tables.refunds, groupBuyRefundAttemptsTable: fake.tables.attempts,
  groupBuyRefundTxClaimsTable: fake.tables.claims, auditLogsTable: fake.tables.audit,
  siteConfigTable: {}, gbReshippersTable: {}, wholesaleSharesTable: {},
  groupBuyRefundTransitionOutboxTable: fake.tables.outbox,
}));
vi.mock("drizzle-orm", () => ({
  eq: fake.eq,
  and: fake.and,
  inArray: fake.inArray,
  asc: (column: unknown) => ({ kind: "asc", column }),
  isNull: (column: unknown) => ({ kind: "isNull", column }),
}));
vi.mock("../routes/payments", () => ({ resolveEffectiveOrderCrypto: vi.fn(async () => ({
  walletAddress: `0x${"c".repeat(40)}`, currency: "USDT", network: "ERC-20",
})) }));
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
  verifyTransaction: vi.fn(async () => {
    if (!fake.state.paymentVerifierAvailable) throw new Error("payment provider unavailable");
    return {
      verified: true,
      amountUsdt: 123.45,
      recipientAddress: `0x${"c".repeat(40)}`,
    };
  }),
}));
vi.mock("./refund-crypto-verifier", () => ({
  normalizeEthereumTxid: (value: unknown) => typeof value === "string" ? value.toLowerCase() : null,
  verifyRefundCryptoTransfer: fake.verify,
}));

import { drainRefundTransitionOutbox, GroupBuyRefundError, submitCryptoRefund } from "./group-buy-refund";

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
    fake.state.refunds[0].verifyingAt = "malformed";
    fake.state.refunds[0].updatedAt = new Date();
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "in_progress" });

    fake.state.attempts[0].startedAt = new Date(Date.now() - 16 * 60 * 1000);
    fake.state.refunds[0].verifyingAt = fake.state.attempts[0].startedAt;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.attempts[0].resultCode).toBe("stale_processing_state");
    expect(fake.state.attempts).toHaveLength(2);
  });

  it("commits stale recovery before a conflicting TXID claim is rejected", async () => {
    const staleAttempt = {
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: new Date(Date.now() - 16 * 60 * 1000), endedAt: null,
    };
    fake.state.attempts.push(staleAttempt);
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = staleAttempt.id;
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = staleAttempt.startedAt;
    fake.state.refunds.push({ ...fake.state.refunds[0], id: "refund-2", status: "requested" });
    fake.state.claims.push({ txid: tx2, refundId: "refund-2" });

    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx2))
      .rejects.toMatchObject({ code: "txid_replay" });
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.attempts[0].resultCode).toBe("stale_processing_state");
  });

  it("commits stale recovery when the separate audit write fails", async () => {
    const staleAttempt = {
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: new Date(Date.now() - 16 * 60 * 1000), endedAt: null,
    };
    fake.state.attempts.push(staleAttempt);
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = staleAttempt.id;
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = staleAttempt.startedAt;
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "processing_failure" });
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.attempts[0].resultCode).toBe("stale_processing_state");
  });

  it("recovers legacy verifying state with no processing attempt or lease timestamp", async () => {
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].processorRole = "admin";
    fake.state.refunds[0].processingAttemptId = null;
    fake.state.refunds[0].verifyingAt = null;
    fake.state.refunds[0].updatedAt = null;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.refunds[0].status).toBe("completed");
  });

  it("keeps legacy verifying state in progress while its fallback lease is fresh", async () => {
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].processorRole = "admin";
    fake.state.refunds[0].processingAttemptId = null;
    fake.state.refunds[0].verifyingAt = new Date();
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "in_progress" });
    expect(fake.state.refunds[0].status).toBe("verifying");
  });

  it("recovers stale state before an incoming payment-provider outage", async () => {
    fake.state.attempts.push({
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: new Date(Date.now() - 16 * 60 * 1000), endedAt: null,
    });
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = "old-attempt";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = fake.state.attempts[0].startedAt;
    fake.state.paymentVerifierAvailable = false;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "payment_verification_failed" });
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.attempts[0].resultCode).toBe("stale_processing_state");
  });

  it("reuses the existing transition marker ID after an idempotent outbox conflict", async () => {
    fake.state.attempts.push({
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: new Date(Date.now() - 16 * 60 * 1000), endedAt: null,
    });
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = "old-attempt";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = fake.state.attempts[0].startedAt;
    fake.state.outbox.push({
      id: "existing-marker", refundId: "refund-1", attemptId: "old-attempt",
      transition: "verifying_to_verification_failed", processorUsername: "other",
      processorRole: "admin", submittedTxid: tx1, resultCode: "stale_processing_state",
    });
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.outbox).toHaveLength(1);
    expect(fake.state.outbox[0].id).toBe("existing-marker");
  });

  it("recovers malformed legacy attempt timestamps using the refund lease", async () => {
    fake.state.attempts.push({
      id: "old-attempt", refundId: "refund-1", submittedTxid: tx1,
      processorUsername: "other", processorRole: "admin",
      startedAt: null, endedAt: null,
    });
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = "old-attempt";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].verifyingAt = null;
    fake.state.refunds[0].updatedAt = null;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.attempts[0].resultCode).toBe("stale_processing_state");
  });

  it("recovers a stale dangling processingAttemptId without an attempt row", async () => {
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = "dangling-attempt";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].processorRole = "admin";
    fake.state.refunds[0].verifyingAt = new Date(Date.now() - 16 * 60 * 1000);
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.refunds[0].status).toBe("completed");
    expect(fake.state.outbox[0].submittedTxid).toBeNull();
  });

  it("keeps a fresh dangling processingAttemptId in progress", async () => {
    fake.state.refunds[0].status = "verifying";
    fake.state.refunds[0].processingAttemptId = "dangling-attempt";
    fake.state.refunds[0].processorUsername = "other";
    fake.state.refunds[0].processorRole = "admin";
    fake.state.refunds[0].verifyingAt = new Date();
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "in_progress" });
    expect(fake.state.refunds[0].status).toBe("verifying");
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
    expect(fake.state.outbox.some(marker => marker.deliveredAt == null)).toBe(true);
    fake.state.failAudit = false;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed" });
    expect(fake.state.outbox[0].deliveredAt).toBeTruthy();
    expect(fake.state.audits.filter(audit => audit.action === "group_buy_refund_processing_failed")).toHaveLength(1);
  });

  it("does not complete after a concurrent legacy cancellation/refund interleaving", async () => {
    fake.verify.mockImplementationOnce(async () => {
      fake.state.order.status = "Cancelled";
      return fake.state.verify;
    });
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "order_state_changed" });
    expect(fake.state.order.status).toBe("Cancelled");
    expect(fake.state.refunds[0].status).toBe("verification_failed");
    expect(fake.state.audits.some(audit => audit.action === "group_buy_refund_completed")).toBe(false);
  });

  it("rejects a paymentUsdAmount that differs from locked grandTotal", async () => {
    fake.state.order.paymentUsdAmount = "99.99";
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "ineligible_payment_evidence" });
    expect(fake.state.refunds[0].status).toBe("requested");
  });

  it("drains a pending recovery marker exactly once after inline audit failure", async () => {
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "processing_failure" });
    fake.state.failAudit = false;
    expect(await drainRefundTransitionOutbox(fake.db, { limit: 1 })).toBe(1);
    expect(await drainRefundTransitionOutbox(fake.db, { limit: 1 })).toBe(0);
    expect(fake.state.audits).toHaveLength(1);
    expect(fake.state.outbox[0].deliveredAt).toBeTruthy();
  });

  it("serializes concurrent drains and retries a marker update failure safely", async () => {
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "processing_failure" });
    fake.state.failAudit = false;
    fake.state.failOutboxUpdate = true;
    expect(await drainRefundTransitionOutbox(fake.db, { limit: 1 })).toBe(0);
    expect(fake.state.outbox[0].deliveredAt == null).toBe(true);
    fake.state.failOutboxUpdate = false;
    const results = await Promise.all([
      drainRefundTransitionOutbox(fake.db, { limit: 1 }),
      drainRefundTransitionOutbox(fake.db, { limit: 1 }),
    ]);
    expect(results.sort()).toEqual([0, 1]);
    expect(fake.state.audits).toHaveLength(1);
  });
});
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
    notifications: {
      id: "notification.id", refundId: "notification.refundId", status: "notification.status",
      accountId: "notification.accountId", transitionKey: "notification.transitionKey",
      createdAt: "notification.createdAt", sentAt: "notification.sentAt",
      claimedAt: "notification.claimedAt", claimToken: "notification.claimToken",
    },
    audit: "audit",
  };
  type Row = Record<string, any>;
  const state = {
    account: { telegramUsername: "buyer" },
    order: {
      id: "order-1", code: "GB-001", telegramUsername: "@buyer", groupBuyId: "gb-1", status: "Submitted",
      refundStatus: null, paymentStatus: "confirmed", paymentConfirmedAt: new Date(),
      deletedAt: null, grandTotal: "123.45", refundedAt: null,
    },
    group: { id: "gb-1", organiserId: "organiser", cryptoRefundsEnabled: true },
    refunds: [] as Row[],
    attempts: [] as Row[],
    claims: [] as Row[],
    outbox: [] as Row[],
    notifications: [] as Row[],
    audits: [] as Row[],
    verify: { verified: true, confirmationCount: 12 } as any,
    failAudit: false,
    failOrder: false,
    failAttemptUpdate: false,
    failOutboxInsert: false,
    failNotificationInsert: false,
    failClaimUnique: false,
    failOutgoingUnique: false,
    failOutboxUpdate: false,
    orderUpdateReturnsEmpty: false,
    serial: Promise.resolve(),
    forUpdateTables: [] as unknown[],
  };
  const eq = (column: unknown, value: unknown) => ({ kind: "eq", column, value });
  const ne = (column: unknown, value: unknown) => ({ kind: "ne", column, value });
  const isNotNull = (column: unknown) => ({ kind: "isNotNull", column });
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
                    : table === tables.notifications ? state.notifications
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
        ))
        || (table === tables.notifications && (
          (condition.column === tables.notifications.id && row.id === condition.value)
          || (condition.column === tables.notifications.refundId && row.refundId === condition.value)
          || (condition.column === tables.notifications.status && row.status === condition.value)
          || (condition.column === tables.notifications.accountId && row.accountId === condition.value)
          || (condition.column === tables.notifications.transitionKey && row.transitionKey === condition.value)
          || (condition.column === tables.notifications.claimToken && row.claimToken === condition.value)
        ));
      if (condition.kind === "inArray") return condition.value.includes(
        table === tables.refunds ? row.status : row.value,
      );
      if (condition.kind === "isNull") {
        if (condition.column === tables.outbox.deliveredAt) return row.deliveredAt == null;
        if (condition.column === tables.notifications.sentAt) return row.sentAt == null;
        return row.endedAt == null;
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
            for: vi.fn(async () => {
              state.forUpdateTables.push(table);
              return result;
            }),
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
    if (table === tables.outbox && state.failOutboxInsert) throw new Error("audit enqueue failed");
    if (table === tables.notifications && state.failNotificationInsert) throw new Error("notification enqueue failed");
    const rows = rowsFor(table, null);
    const inserted = table === tables.refunds ? state.refunds.push(values)
      : table === tables.attempts ? state.attempts.push(values)
        : table === tables.claims ? state.claims.push(values)
          : table === tables.outbox ? state.outbox.push(values)
          : table === tables.notifications ? state.notifications.push(values)
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
          if (table === tables.refunds && state.failOutgoingUnique) {
            const error = Object.assign(new Error("duplicate outgoing_txid"), {
              code: "23505",
              constraint: "group_buy_refunds_outgoing_txid_unique",
            });
            throw error;
          }
          const rows = rowsFor(table, predicate);
          if (table === tables.orders && state.orderUpdateReturnsEmpty) {
            return {
              returning: async () => [],
              then: (resolve: any) => Promise.resolve([]).then(resolve),
            };
          }
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
            if (table === tables.claims && state.failClaimUnique) {
              const error = Object.assign(new Error("duplicate tx claim"), {
                code: "23505",
                constraint: "group_buy_refund_tx_claims_pkey",
              });
              throw error;
            }
            if (table === tables.claims && state.claims.some(row => row.txid === values.txid)) return [];
            if (table === tables.outbox && state.outbox.some(row =>
              row.refundId === values.refundId
              && row.attemptId === values.attemptId
              && row.transition === values.transition
            )) return [];
            if (table === tables.notifications && state.notifications.some(row =>
              row.refundId === values.refundId
              && row.status === values.status
              && row.accountId === values.accountId
              && row.transitionKey === values.transitionKey
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
        const snapshot = structuredClone({
          account: state.account, order: state.order, refunds: state.refunds,
          attempts: state.attempts, claims: state.claims, audits: state.audits,
          outbox: state.outbox, notifications: state.notifications,
        });
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
          state.notifications = snapshot.notifications;
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
      amountUsd: "123.45",
      destinationWallet: `0x${"b".repeat(40)}`, amountBaseUnits: "123450000",
       status: "requested", outgoingTxid: null, outgoingTxid2: null, processorUsername: null,
      processorRole: null, processingAttemptId: null, verifyingAt: null, updatedAt: null,
    }];
    state.attempts = [];
    state.claims = [];
    state.outbox = [];
    state.notifications = [];
    state.audits = [];
    state.order.status = "Submitted";
    state.order.groupBuyId = "gb-1";
    state.order.telegramUsername = "@buyer";
    state.order.refundStatus = null;
    state.order.paymentStatus = "confirmed";
    state.order.paymentConfirmedAt = new Date();
    state.order.deletedAt = null;
    state.order.grandTotal = "123.45";
    state.order.refundedAt = null;
    state.failClaimUnique = false;
    state.failOutgoingUnique = false;
    state.verify = { verified: true, confirmationCount: 12 };
    state.failAudit = false;
    state.failOrder = false;
    state.failAttemptUpdate = false;
    state.failOutboxInsert = false;
    state.failNotificationInsert = false;
    state.failOutboxUpdate = false;
    state.orderUpdateReturnsEmpty = false;
    state.forUpdateTables = [];
    state.serial = Promise.resolve();
  }
  return { tables, state, db, eq, ne, isNotNull, and, inArray, reset, verify: vi.fn(async () => state.verify) };
});

vi.mock("@workspace/db", () => ({
  accountsTable: fake.tables.accounts, ordersTable: fake.tables.orders, groupBuysTable: fake.tables.groups,
  groupBuyRefundsTable: fake.tables.refunds, groupBuyRefundAttemptsTable: fake.tables.attempts,
  groupBuyRefundTxClaimsTable: fake.tables.claims, auditLogsTable: fake.tables.audit,
  groupBuyRefundNotificationsTable: fake.tables.notifications,
  groupBuyRefundTransitionOutboxTable: fake.tables.outbox,
}));
vi.mock("drizzle-orm", () => ({
  eq: fake.eq,
  ne: fake.ne,
  isNotNull: fake.isNotNull,
  and: fake.and,
  inArray: fake.inArray,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  asc: (column: unknown) => ({ kind: "asc", column }),
  count: () => "count",
  isNull: (column: unknown) => ({ kind: "isNull", column }),
  lt: (column: unknown, value: unknown) => ({ kind: "lt", column, value }),
  or: (...predicates: unknown[]) => ({ kind: "or", predicates }),
}));
vi.mock("./payment-verify", () => ({
  isValidEthAddress: (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value),
}));
vi.mock("./refund-crypto-verifier", () => ({
  normalizeEthereumTxid: (value: unknown) => typeof value === "string"
    && /^(?:0x)?[0-9a-fA-F]{64}$/i.test(value)
    ? (/^0x/i.test(value) ? value : `0x${value}`).toLowerCase()
    : null,
  verifyRefundCryptoTransfer: fake.verify,
}));
vi.mock("./telegram", () => ({
  notifyUserFromTemplateFull: vi.fn(async () => ({ ok: true })),
}));

import {
  createRefundRequest,
  completeManualCryptoRefund,
  drainRefundTransitionOutbox,
  GroupBuyRefundError,
  submitCryptoRefund,
} from "./group-buy-refund";

const tx1 = `0x${"1".repeat(64)}`;
const tx2 = `0x${"2".repeat(64)}`;
const tx3 = `0x${"3".repeat(64)}`;
const processor = { username: "admin", role: "admin" };

describe("submitCryptoRefund transactional lifecycle", () => {
  beforeEach(() => fake.reset());

  it("creates and completes a hashless crypto refund from the current locked total", async () => {
    fake.state.refunds = [];
    fake.state.order.grandTotal = "234.56";

    const request = await createRefundRequest(fake.db as any, {
      accountId: "buyer",
      orderId: "order-1",
      input: {
        method: "crypto",
        asset: "USDC",
        network: "Ethereum ERC-20",
        destinationWallet: `0x${"b".repeat(40)}`,
      },
    });
    expect(request).toMatchObject({
      method: "crypto",
      status: "requested",
      amountUsd: "234.56",
      amountBaseUnits: "234560000",
    });
    expect(fake.state.refunds).toHaveLength(1);
    expect(fake.state.refunds[0]).toMatchObject({
      amountUsd: "234.56",
      amountBaseUnits: "234560000",
    });
    fake.state.order.grandTotal = "999.99";

    await expect(submitCryptoRefund(fake.db, processor, request.id, tx1))
      .resolves.toMatchObject({
        status: "completed",
        amountUsd: "234.56",
        outgoingTxid: tx1,
      });
  });

  it("completes, cancels the order, and audits normalized outgoing TXID", async () => {
    const result = await submitCryptoRefund(fake.db, processor, "refund-1", tx1);
    expect(result).toMatchObject({ status: "completed", outgoingTxid: tx1.toLowerCase() });
    expect(result).not.toHaveProperty("outgoingTxid2");
    expect(fake.state.order).toMatchObject({ status: "Cancelled", refundStatus: "refunded", paymentStatus: "refunded" });
    expect(fake.state.audits.at(-1)!.metadata.txid).toBe(tx1);
    expect(fake.state.audits.at(-1)!.metadata).not.toHaveProperty("txid2");
    expect(fake.state.notifications.at(-1)!).not.toHaveProperty("txid2");
  });

  it("rejects automatic verification when a legacy outgoing TXID2 collides without a claim row", async () => {
    fake.state.refunds.push({
      id: "legacy-refund",
      orderId: "legacy-order",
      groupBuyId: "gb-1",
      accountId: "legacy-buyer",
      method: "crypto",
      outgoingTxid2: tx1.slice(2).toUpperCase(),
      status: "completed",
    });
    const before = structuredClone({
      refunds: fake.state.refunds,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
      audits: fake.state.audits,
    });
    const verifyCallsBefore = fake.verify.mock.calls.length;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "txid_replay" });
    expect(fake.verify.mock.calls.length).toBe(verifyCallsBefore);
    expect({
      refunds: fake.state.refunds,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
      audits: fake.state.audits,
    }).toEqual(before);
  });

  it.each(["not-a-txid", `0x${"a".repeat(63)}`, `0x${"g".repeat(64)}`])(
    "rejects invalid outgoing TXID %s before payout",
    async invalidTxid => {
      await expect(submitCryptoRefund(fake.db, processor, "refund-1", invalidTxid))
        .rejects.toMatchObject({ code: "invalid_txid" });
      expect(fake.state.refunds[0].status).toBe("requested");
      expect(fake.state.attempts).toHaveLength(0);
      expect(fake.state.claims).toHaveLength(0);
    },
  );

  it("completes a hashless crypto request through the outgoing payout verifier", async () => {
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed", outgoingTxid: tx1 });
    expect(fake.state.order).toMatchObject({
      status: "Cancelled",
      refundStatus: "refunded",
      paymentStatus: "refunded",
    });
  });

  it.each([
    ["zero USD", "0.00", "123450000"],
    ["malformed USD", "not-a-number", "123450000"],
    ["mismatched base units", "123.45", "123460000"],
  ])("rejects a legacy crypto row with %s before payout", async (_label, amountUsd, amountBaseUnits) => {
    fake.state.refunds[0].amountUsd = amountUsd;
    fake.state.refunds[0].amountBaseUnits = amountBaseUnits;
    fake.verify.mockClear();

    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "invalid_refund_amount" });
    expect(fake.state.refunds[0].status).toBe("requested");
    expect(fake.state.attempts).toHaveLength(0);
    expect(fake.state.claims).toHaveLength(0);
    expect(fake.verify).not.toHaveBeenCalled();
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

  it("rejects a completed retry when terminal order linkage changes", async () => {
    await submitCryptoRefund(fake.db, processor, "refund-1", tx1);
    const updates = fake.state.order.status;
    const attempts = fake.state.attempts.length;
    const claims = fake.state.claims.length;
    fake.state.order.status = "Submitted";
    fake.state.outbox.length = 0;

    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .rejects.toMatchObject({ code: "completed_refund_linkage_mismatch" });
    expect(fake.state.order.status).toBe("Submitted");
    expect(fake.state.refunds[0].status).toBe("completed");
    expect(updates).toBe("Cancelled");
    expect(fake.state.outbox).toHaveLength(0);
    expect(fake.state.attempts).toHaveLength(attempts);
    expect(fake.state.claims).toHaveLength(claims);
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
      .resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    expect(fake.state.refunds[0].status).toBe("completed");
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
    expect(fake.state.outbox.some(marker => marker.id === "existing-marker")).toBe(true);
    expect(new Set(fake.state.outbox.map(marker => marker.id)).size).toBe(fake.state.outbox.length);
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
      .resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    expect(fake.state.refunds[0].status).toBe("completed");
    expect(fake.state.order.status).toBe("Cancelled");
    fake.state.failAudit = false;
    expect(fake.state.outbox.some(marker => marker.deliveredAt == null)).toBe(true);
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

  it("drains a pending recovery marker exactly once after inline audit failure", async () => {
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    fake.state.failAudit = false;
    expect(await drainRefundTransitionOutbox(fake.db, { limit: 1 })).toBeGreaterThanOrEqual(1);
    expect(fake.state.outbox.some(marker => marker.deliveredAt)).toBe(true);
  });

  it("serializes concurrent drains and retries a marker update failure safely", async () => {
    fake.state.failAudit = true;
    await expect(submitCryptoRefund(fake.db, processor, "refund-1", tx1))
      .resolves.toMatchObject({ status: "completed", amountUsd: "123.45" });
    fake.state.failAudit = false;
    fake.state.failOutboxUpdate = true;
    expect(await drainRefundTransitionOutbox(fake.db, { limit: 1 })).toBe(0);
    expect(fake.state.outbox[0].deliveredAt == null).toBe(true);
    fake.state.failOutboxUpdate = false;
    const results = await Promise.all([
      drainRefundTransitionOutbox(fake.db, { limit: 1 }),
      drainRefundTransitionOutbox(fake.db, { limit: 1 }),
    ]);
    expect(results.sort()).toEqual([1, 1]);
    expect(fake.state.audits.length).toBeGreaterThanOrEqual(1);
  });
});

describe("completeManualCryptoRefund transactional lifecycle", () => {
  beforeEach(() => fake.reset());

  it("completes without invoking the blockchain verifier and records admin reason", async () => {
    fake.verify.mockClear();
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      reason: "Provider outage; independently confirmed payout.",
    })).resolves.toMatchObject({
      status: "completed",
      outgoingTxid: tx1,
      explorerUrl: `https://etherscan.io/tx/${tx1}`,
    });
    expect(fake.verify).not.toHaveBeenCalled();
    expect(fake.state.order).toMatchObject({
      status: "Cancelled",
      refundStatus: "refunded",
      paymentStatus: "refunded",
    });
    expect(fake.state.audits.at(-1)!.metadata).toMatchObject({
      source: "admin",
      reason: "Provider outage; independently confirmed payout.",
      txid: tx1,
    });
  });

  it("accepts requested, failed, and verifying states while superseding an active attempt", async () => {
    for (const status of ["requested", "verification_failed", "verifying"] as const) {
      fake.reset();
      fake.state.refunds[0].status = status;
      if (status === "verifying") {
        fake.state.refunds[0].processingAttemptId = "attempt-1";
        fake.state.refunds[0].processorUsername = "other";
        fake.state.attempts.push({
          id: "attempt-1",
          refundId: "refund-1",
          submittedTxid: tx2,
          processorUsername: "other",
          processorRole: "admin",
          endedAt: null,
        });
      }
      await expect(completeManualCryptoRefund(fake.db, {
        refundId: "refund-1",
        username: "admin",
        role: "admin",
        txid: tx1,
        reason: "Manual reconciliation",
      })).resolves.toMatchObject({ status: "completed" });
      if (status === "verifying") {
        expect(fake.state.attempts[0]).toMatchObject({
          endedAt: expect.anything(),
          resultCode: "manual_completed",
          failureReason: "Manual reconciliation",
        });
      }
    }
  });

  it("preserves canonical replay claims and completed idempotency", async () => {
    const mixedCaseTxid = `0x${"A".repeat(64)}`;
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: mixedCaseTxid,
      reason: "Confirmed by treasury",
    });
    const claims = fake.state.claims.length;
    const audits = fake.state.audits.length;
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: mixedCaseTxid.toLowerCase(),
      reason: "Retry after timeout",
    })).resolves.toMatchObject({ status: "completed", outgoingTxid: mixedCaseTxid.toLowerCase() });
    expect(fake.state.claims).toHaveLength(claims);
    expect(fake.state.audits.length).toBe(audits);
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx2,
      reason: "Wrong transfer",
    })).rejects.toMatchObject({ code: "completed_txid_immutable" });
  });

  it.each([
    { role: "organiser", reason: "reason", code: "forbidden" },
    { role: "admin", reason: " ", code: "invalid_reason" },
    { role: "admin", reason: "x".repeat(1001), code: "invalid_reason" },
  ])("rejects unsafe manual completion input", async ({ role, reason, code }) => {
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "actor",
      role,
      txid: tx1,
      reason,
    })).rejects.toMatchObject({ code });
    expect(fake.state.refunds[0].status).toBe("requested");
    expect(fake.verify).not.toHaveBeenCalled();
  });

  it.each([
    ["attempt supersession", "failAttemptUpdate"],
    ["order update", "failOrder"],
    ["audit enqueue", "failOutboxInsert"],
    ["notification enqueue", "failNotificationInsert"],
  ] as const)("rolls back all manual completion state after %s failure", async (_label, failure) => {
    fake.state.refunds[0].status = failure === "failAttemptUpdate" ? "verifying" : "requested";
    if (failure === "failAttemptUpdate") {
      fake.state.refunds[0].processingAttemptId = "attempt-1";
      fake.state.attempts.push({
        id: "attempt-1",
        refundId: "refund-1",
        submittedTxid: tx1,
        processorUsername: "other",
        processorRole: "admin",
        endedAt: null,
      });
    }
    const before = structuredClone({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    fake.state[failure] = true;
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      reason: "Manual reconciliation",
    })).rejects.toThrow();
    expect({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    }).toEqual(before);
  });

  it("enqueues the completed customer notification with canonical transfer evidence", async () => {
    const mixedCaseTxid = `0x${"B".repeat(64)}`;
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: mixedCaseTxid,
      reason: "Confirmed by treasury",
    });
    expect(fake.state.notifications).toContainEqual(expect.objectContaining({
      refundId: "refund-1",
      accountId: "buyer",
      status: "completed",
      amountUsd: "123.45",
      orderCode: "GB-001",
      txid: mixedCaseTxid.toLowerCase(),
      explorerUrl: `https://etherscan.io/tx/${mixedCaseTxid.toLowerCase()}`,
    }));
  });

  it("supports an optional second manual outgoing transfer and persists both canonical IDs", async () => {
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1.toUpperCase(),
      txid2: tx2.slice(2).toUpperCase(),
      reason: "Split payout confirmed",
    });
    expect(fake.state.refunds[0]).toMatchObject({ outgoingTxid: tx1, outgoingTxid2: tx2 });
    expect(fake.state.claims.map(claim => claim.txid)).toEqual(expect.arrayContaining([tx1, tx2]));
    expect(fake.state.outbox).toContainEqual(expect.objectContaining({
      submittedTxid: tx1,
      submittedTxid2: tx2,
    }));
    expect(fake.state.notifications).toContainEqual(expect.objectContaining({ txid: tx1, txid2: tx2 }));
  });

  it("claims a reversed pair in canonical order while preserving payout order", async () => {
    const results = await Promise.all([
      completeManualCryptoRefund(fake.db, {
        refundId: "refund-1", username: "admin", role: "admin",
        txid: tx2, txid2: tx1, reason: "Reversed pair ordering",
      }),
      completeManualCryptoRefund(fake.db, {
        refundId: "refund-1", username: "admin", role: "admin",
        txid: tx2, txid2: tx1, reason: "Concurrent reversed retry",
      }),
    ]);
    expect(results).toHaveLength(2);
    expect(fake.state.claims.map(claim => claim.txid)).toEqual([tx1, tx2]);
    expect(fake.state.refunds[0]).toMatchObject({ outgoingTxid: tx2, outgoingTxid2: tx1 });
    expect(fake.state.outbox).toContainEqual(expect.objectContaining({
      submittedTxid: tx2,
      submittedTxid2: tx1,
    }));
    expect(fake.state.notifications).toContainEqual(expect.objectContaining({ txid: tx2, txid2: tx1 }));
  });

  it("normalizes a blank second TXID to absent and rejects equivalent first/second TXIDs", async () => {
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      txid2: "  ",
      reason: "Single payout",
    });
    expect(fake.state.refunds[0].outgoingTxid2).toBeNull();
    expect(fake.state.notifications[0]).not.toHaveProperty("txid2");

    fake.reset();
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin",
      txid: tx1, txid2: tx1.slice(2).toUpperCase(), reason: "Duplicate IDs",
    })).rejects.toMatchObject({ code: "invalid_txid_pair" });
  });

  it.each([123, { txid: tx2 }])("rejects a non-string second TXID (%s) before any write", async txid2 => {
    const before = structuredClone({
      refunds: fake.state.refunds,
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      txid2,
      reason: "Invalid second transfer input",
    } as any)).rejects.toMatchObject({ code: "invalid_txid" });
    expect({
      refunds: fake.state.refunds,
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    }).toEqual(before);
  });

  it("requires the same first and second pair for completed idempotency", async () => {
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin", txid: tx1, txid2: tx2, reason: "First completion",
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin", txid: tx1, txid2: tx2, reason: "Retry completion",
    })).resolves.toMatchObject({ status: "completed", outgoingTxid: tx1 });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin", txid: tx1, txid2: tx3, reason: "Changed top-up",
    })).rejects.toMatchObject({ code: "completed_txid_immutable" });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin", txid: tx1, reason: "Removed top-up",
    })).rejects.toMatchObject({ code: "completed_txid_immutable" });
  });

  it("rolls back both claims when the second TXID is already claimed", async () => {
    fake.state.claims.push({ txid: tx2, refundId: "other-refund" });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1", username: "admin", role: "admin", txid: tx1, txid2: tx2, reason: "Replay pair",
    })).rejects.toMatchObject({ code: "txid_replay" });
    expect(fake.state.claims).toEqual([{ txid: tx2, refundId: "other-refund" }]);
    expect(fake.state.refunds[0].status).toBe("requested");
    expect(fake.state.order.paymentStatus).toBe("confirmed");
  });

  it("cannot be overwritten by a delayed automatic verifier finalization", async () => {
    let releaseVerifier!: () => void;
    fake.verify.mockImplementationOnce(async () => {
      await new Promise<void>(resolveRelease => { releaseVerifier = resolveRelease; });
      return { verified: true, confirmationCount: 12 };
    });
    const automatic = submitCryptoRefund(fake.db, processor, "refund-1", tx1);
    await vi.waitFor(() => expect(fake.verify).toHaveBeenCalled());
    await completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx2,
      reason: "Provider unavailable",
    });
    releaseVerifier();
    await expect(automatic).rejects.toMatchObject({ code: "attempt_ownership_lost" });
    expect(fake.state.refunds[0]).toMatchObject({ status: "completed", outgoingTxid: tx2 });
    expect(fake.state.order).toMatchObject({ status: "Cancelled", paymentStatus: "refunded" });
    expect(fake.state.audits.some(audit => audit.action === "group_buy_refund_completed")).toBe(false);
    expect(fake.state.notifications.filter(marker => marker.status === "completed")).toHaveLength(1);
  });

  it("rejects a TXID already claimed by another refund without writes", async () => {
    fake.state.claims.push({ txid: tx1, refundId: "other-refund" });
    const before = structuredClone({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      reason: "Replay check",
    })).rejects.toMatchObject({ code: "txid_replay" });
    expect({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    }).toEqual(before);
  });

  it.each([
    ["first", tx1],
    ["second", tx2],
  ])("rejects a legacy outgoing TXID2 replay matching the proposed %s ID without any claim row or historical refund lock", async (_label, legacyTxid) => {
    fake.state.refunds.push({
      id: "legacy-refund",
      orderId: "legacy-order",
      groupBuyId: "gb-1",
      accountId: "legacy-buyer",
      method: "crypto",
      outgoingTxid2: legacyTxid.slice(2).toUpperCase(),
      status: "completed",
    });
    const before = structuredClone({
      refund: fake.state.refunds,
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      txid2: tx2,
      reason: "Legacy second-transfer replay check",
    })).rejects.toMatchObject({ code: "txid_replay" });
    expect(fake.state.forUpdateTables.filter(table => table === fake.tables.refunds)).toHaveLength(1);
    expect(fake.state.refunds).toEqual(before.refund);
    expect(fake.state.claims).toEqual(before.claims);
    expect(fake.state.order).toEqual(before.order);
    expect(fake.state.outbox).toEqual(before.outbox);
    expect(fake.state.notifications).toEqual(before.notifications);
  });

  it("rejects a legacy first outgoing TXID claim using case and prefix-insensitive comparison", async () => {
    const legacyTxid = tx1.slice(2).toUpperCase();
    fake.state.refunds.push({
      id: "legacy-refund",
      orderId: "legacy-order",
      groupBuyId: "gb-1",
      accountId: "legacy-buyer",
      method: "crypto",
      outgoingTxid: legacyTxid,
      status: "completed",
    });
    const before = structuredClone({
      refund: fake.state.refunds[0],
      claims: fake.state.claims,
      order: fake.state.order,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: `0x${tx1.slice(2).toLowerCase()}`,
      reason: "Legacy replay check",
    })).rejects.toMatchObject({ code: "txid_replay" });
    expect(fake.state.refunds[0]).toEqual(before.refund);
    expect(fake.state.claims).toEqual(before.claims);
    expect(fake.state.order).toEqual(before.order);
    expect(fake.state.outbox).toEqual(before.outbox);
    expect(fake.state.notifications).toEqual(before.notifications);
  });

  it("maps concurrent claim and outgoing-TXID unique violations to txid_replay", async () => {
    fake.state.failClaimUnique = true;
    const claimResults = await Promise.allSettled([
      completeManualCryptoRefund(fake.db, {
        refundId: "refund-1", username: "admin", role: "admin", txid: tx1, reason: "Concurrent claim",
      }),
      completeManualCryptoRefund(fake.db, {
        refundId: "refund-1", username: "admin", role: "admin", txid: tx1, reason: "Concurrent claim",
      }),
    ]);
    expect(claimResults.every(result =>
      result.status === "rejected" && (result.reason as GroupBuyRefundError).code === "txid_replay"
    )).toBe(true);
    fake.state.failClaimUnique = false;
    fake.state.failOutgoingUnique = true;
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      reason: "Outgoing uniqueness",
    })).rejects.toMatchObject({ code: "txid_replay" });
  });

  it.each([
    ["terminal order", () => { fake.state.order.status = "Cancelled"; }, "payment_state_changed"],
    ["payment state", () => { fake.state.order.paymentStatus = "pending"; }, "payment_state_changed"],
    ["asset", () => { fake.state.refunds[0].asset = "DAI"; }, "invalid_refund_configuration"],
    ["base units", () => { fake.state.refunds[0].amountBaseUnits = "123450001"; }, "invalid_refund_amount"],
    ["linkage", () => { fake.state.order.groupBuyId = "other-group"; }, "refund_linkage_mismatch"],
    ["conditional order race", () => { fake.state.orderUpdateReturnsEmpty = true; }, "order_state_changed"],
  ] as const)("fails closed for manual completion %s", async (_label, mutate, code) => {
    mutate();
    const before = structuredClone({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    });
    await expect(completeManualCryptoRefund(fake.db, {
      refundId: "refund-1",
      username: "admin",
      role: "admin",
      txid: tx1,
      reason: "Invariant check",
    })).rejects.toMatchObject({ code });
    expect({
      refund: fake.state.refunds,
      order: fake.state.order,
      attempts: fake.state.attempts,
      claims: fake.state.claims,
      outbox: fake.state.outbox,
      notifications: fake.state.notifications,
    }).toEqual(before);
  });
});
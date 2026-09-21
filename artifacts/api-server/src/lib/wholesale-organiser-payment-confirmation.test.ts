import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const tables = {
    shares: {
      id: "id",
      status: "status",
      creatorUsername: "creatorUsername",
      organiserPaymentStatus: "organiserPaymentStatus",
      organiserPaymentTxHash: "organiserPaymentTxHash",
      organiserPaymentCurrency: "organiserPaymentCurrency",
      organiserPaymentNetwork: "organiserPaymentNetwork",
      totalVendorShipping: "totalVendorShipping",
      leadCryptoOptions: "leadCryptoOptions",
    },
    members: {
      id: "id",
      shareId: "shareId",
      username: "username",
      isCreator: "isCreator",
      orderId: "orderId",
      items: "items",
    },
    orders: {
      id: "id",
      orderType: "orderType",
      sharedOrderId: "sharedOrderId",
      telegramUsername: "telegramUsername",
      paymentStatus: "paymentStatus",
      creditsApplied: "creditsApplied",
    },
    refunds: {
      id: "id",
      orderId: "orderId",
      status: "status",
    },
    audit: "audit",
  };

  const state = {
    share: {} as Record<string, unknown>,
    members: [] as Array<Record<string, unknown>>,
    orders: [] as Array<Record<string, unknown>>,
    refunds: [] as Array<Record<string, unknown>>,
    audits: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ table: unknown; values: Record<string, unknown>; rows: unknown[] }>,
    locks: [] as Array<{ table: unknown; predicates: unknown[] }>,
    failAudit: false,
    transactionTail: Promise.resolve(),
  };

  function reset() {
    state.share = {
      id: "SHARE1",
      creatorUsername: "@creator",
      status: "submitted",
      organiserPaymentStatus: "pending",
      organiserPaymentTxHash: "0xhash",
      organiserPaymentCurrency: "USDT",
      organiserPaymentNetwork: "ERC-20",
      totalVendorShipping: "5.00",
      leadCryptoOptions: [{ currency: "USDT", network: "ERC-20", walletAddress: "creator-wallet" }],
    };
    state.members = [
      {
        id: "creator-member",
        shareId: "SHARE1",
        username: "@creator",
        isCreator: true,
        orderId: "creator-order",
        items: [{ quantity: 2, unitPrice: "10.00" }],
      },
      {
        id: "ordinary-member",
        shareId: "SHARE1",
        username: "@member",
        isCreator: false,
        orderId: "ordinary-order",
        items: [{ quantity: 1, unitPrice: "3.00" }],
      },
    ];
    state.orders = [
      {
        id: "creator-order",
        telegramUsername: "@creator",
        orderType: "wholesale_shared",
        sharedOrderId: "SHARE1",
        paymentStatus: "pending",
        paymentTxHash: "0xexisting-order-payment",
        paymentTxHashes: ["0xexisting-order-payment"],
        paymentTestAmount: "0.01",
        testPaymentTxHash: "0xtest-payment",
        paymentScreenshot: "stored-screenshot-token",
        paymentRejectionReason: "previous-attempt-rejected",
        paymentUsdAmount: "25.00",
        paymentCryptoCurrency: "USDT",
        paymentCryptoRate: "2500.00000000",
        paymentCryptoNetwork: "ERC-20",
        amountDue: "4.50",
        paymentConfirmedAt: null,
      },
      {
        id: "ordinary-order",
        telegramUsername: "@member",
        orderType: "wholesale_shared",
        sharedOrderId: "SHARE1",
        paymentStatus: "unpaid",
        paymentTxHash: "0xmember-payment",
        paymentTxHashes: ["0xmember-payment"],
        paymentTestAmount: "0.02",
        testPaymentTxHash: "0xmember-test-payment",
        paymentScreenshot: "member-screenshot-token",
        paymentRejectionReason: "member-previous-attempt-rejected",
        paymentUsdAmount: "18.00",
        paymentCryptoCurrency: "USDT",
        paymentCryptoRate: "2499.50000000",
        paymentCryptoNetwork: "ERC-20",
        amountDue: "2.75",
        paymentConfirmedAt: null,
      },
    ];
    state.refunds = [];
    state.audits = [];
    state.updates = [];
    state.locks = [];
    state.failAudit = false;
    state.transactionTail = Promise.resolve();
  }

  function matches(row: Record<string, unknown>, predicate: unknown): boolean {
    if (!predicate) return true;
    const value = predicate as { kind?: string; column?: string; value?: unknown; predicates?: unknown[] };
    if (value.kind === "eq") return row[value.column!] === value.value;
    if (value.kind === "inArray") return (value.value as unknown[]).includes(row[value.column!]);
    if (value.kind === "and") return (value.predicates ?? []).every(item => matches(row, item));
    return true;
  }

  function rowsFor(table: unknown, predicate: unknown): Array<Record<string, unknown>> {
    const rows = table === tables.shares
      ? [state.share]
      : table === tables.members
        ? state.members
        : table === tables.orders
          ? state.orders
          : table === tables.refunds
            ? state.refunds
          : [];
    return rows.filter(row => matches(row, predicate));
  }

  function project(row: Record<string, unknown>, selection: unknown): Record<string, unknown> {
    if (!selection || typeof selection !== "object") return { ...row };
    const result: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(selection)) result[key] = row[column as string];
    return result;
  }

  const tx = {
    select: vi.fn((selection?: unknown) => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn((predicate: unknown) => {
          const result = {
            for: vi.fn(async () => {
              state.locks.push({ table, predicates: [predicate] });
              return rowsFor(table, predicate).map(row => project(row, selection));
            }),
            then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
              Promise.resolve(rowsFor(table, predicate).map(row => project(row, selection))).then(resolve, reject),
          };
          return {
            ...result,
            orderBy: vi.fn(() => result),
          };
        }),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn((predicate: unknown) => ({
          returning: vi.fn(async () => {
            const rows = rowsFor(table, predicate);
            state.updates.push({ table, values, rows });
            for (const row of rows) Object.assign(row, values);
            return rows.map(row => ({ id: row.id }));
          }),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        if (state.failAudit) throw new Error("audit insert failed");
        state.audits.push({ table, ...values });
      }),
    })),
  };

  const db = {
    transaction: vi.fn((callback: (transaction: unknown) => unknown) => {
      const run = state.transactionTail.then(async () => {
        const snapshot = JSON.parse(JSON.stringify({
          share: state.share,
          members: state.members,
          orders: state.orders,
          refunds: state.refunds,
          audits: state.audits,
          updates: state.updates,
          locks: state.locks,
        }));
        try {
          return await callback(tx);
        } catch (error) {
          state.share = snapshot.share;
          state.members = snapshot.members;
          state.orders = snapshot.orders;
          state.refunds = snapshot.refunds;
          state.audits = snapshot.audits;
          state.updates = snapshot.updates;
          state.locks = snapshot.locks;
          throw error;
        }
      });
      state.transactionTail = run.then(() => undefined, () => undefined);
      return run;
    }),
  };

  reset();
  return { db, tables, state, reset };
});

vi.mock("@workspace/db", () => ({
  db: harness.db,
  auditLogsTable: harness.tables.audit,
  ordersTable: harness.tables.orders,
  wholesaleShareMembersTable: harness.tables.members,
  wholesaleSharesTable: harness.tables.shares,
  groupBuyRefundsTable: harness.tables.refunds,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...predicates: unknown[]) => ({ kind: "and", predicates })),
  asc: vi.fn((column: unknown) => ({ kind: "asc", column })),
  eq: vi.fn((column: unknown, value: unknown) => ({ kind: "eq", column, value })),
  inArray: vi.fn((column: unknown, value: unknown[]) => ({ kind: "inArray", column, value })),
  sql: vi.fn(() => ({ kind: "sql" })),
}));

import { confirmWholesaleOrganiserPayment } from "./wholesale-organiser-payment-confirmation";

const pendingInput = {
  shareId: "SHARE1",
  source: "admin" as const,
  expectedCurrentParentStatus: "pending" as const,
};

describe("confirmWholesaleOrganiserPayment", () => {
  beforeEach(() => harness.reset());

  it("confirms only the organiser order and parent atomically", async () => {
    const creatorOrderBefore = { ...harness.state.orders[0] };
    const ordinaryMemberOrderBefore = { ...harness.state.orders[1] };

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toEqual({
      kind: "confirmed",
      shareId: "SHARE1",
      organiserOrderId: "creator-order",
      creatorUsername: "@creator",
      orderChanged: true,
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "confirmed",
    });
    expect(harness.state.share.organiserPaymentStatus).toBe("confirmed");
    expect(harness.state.orders[0].paymentStatus).toBe("confirmed");
    expect(harness.state.orders[1].paymentStatus).toBe("unpaid");
    expect(harness.state.orders[0]).toEqual({
      ...creatorOrderBefore,
      paymentStatus: "confirmed",
      paymentConfirmedAt: expect.any(Date),
    });
    expect(harness.state.orders[1]).toEqual(ordinaryMemberOrderBefore);
    expect(harness.state.audits).toHaveLength(1);
    expect(harness.state.audits[0]).toMatchObject({
      action: "wholesale_share_organiser_order_payment_confirmed",
      metadata: {
        source: "admin",
        reason: "organiser_platform_payment_confirmed",
        shareId: "SHARE1",
        organiserOrderId: "creator-order",
         idempotencyKey: "wholesale_share_organiser_order_payment_confirmed:SHARE1:creator-order",
      },
    });
    expect(harness.state.updates.map(update => update.table)).toEqual([
      harness.tables.shares,
      harness.tables.orders,
    ]);
  });

  it("blocks the organiser order when its refund is active without touching the ordinary member", async () => {
    harness.state.refunds.push({
      id: "refund-1",
      orderId: "creator-order",
      status: "requested",
    });

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code: "refund_active" });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
    expect(harness.state.orders[1].paymentStatus).toBe("unpaid");
    expect(harness.state.updates).toHaveLength(0);
  });

  it("locks the share, member payment snapshot, filtered creator candidate, and organiser order", async () => {
    await confirmWholesaleOrganiserPayment(pendingInput);

    expect(harness.state.locks.map(lock => lock.table)).toEqual([
      harness.tables.shares,
      harness.tables.orders,
      harness.tables.members,
      harness.tables.orders,
      harness.tables.members,
      expect.anything(),
    ]);
    expect(harness.state.locks[2].predicates[0]).toMatchObject({
      kind: "and",
      predicates: expect.arrayContaining([
        { kind: "eq", column: "shareId", value: "SHARE1" },
        { kind: "eq", column: "isCreator", value: true },
      ]),
    });
    expect(harness.state.locks[3].predicates[0]).toMatchObject({
      kind: "eq",
      column: "id",
      value: "creator-order",
    });
    expect(harness.state.locks[4].predicates[0]).toMatchObject({
      kind: "and",
      predicates: expect.arrayContaining([
        { kind: "eq", column: "shareId", value: "SHARE1" },
        { kind: "eq", column: "orderId", value: "creator-order" },
      ]),
    });
  });

  it("returns already_confirmed on repeated admin/automatic calls after validating linkage", async () => {
    await confirmWholesaleOrganiserPayment(pendingInput);
    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "admin",
    });

    expect(result).toEqual({
      kind: "already_confirmed",
      shareId: "SHARE1",
      organiserOrderId: "creator-order",
      creatorUsername: "@creator",
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "confirmed",
    });
    expect(harness.state.updates).toHaveLength(2);
    expect(harness.state.audits).toHaveLength(1);
  });

  it("returns confirmed for a parent-only transition", async () => {
    harness.state.orders[0].paymentStatus = "confirmed";

    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "admin",
    });

    expect(result).toEqual({
      kind: "confirmed",
      shareId: "SHARE1",
      organiserOrderId: "creator-order",
      creatorUsername: "@creator",
      orderChanged: false,
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "confirmed",
    });
    expect(harness.state.share.organiserPaymentStatus).toBe("confirmed");
    expect(harness.state.updates).toHaveLength(1);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("preserves test_confirmed while confirming a pending parent", async () => {
    harness.state.orders[0].paymentStatus = "test_confirmed";

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toEqual({
      kind: "confirmed",
      shareId: "SHARE1",
      organiserOrderId: "creator-order",
      creatorUsername: "@creator",
      orderChanged: false,
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "test_confirmed",
    });
    expect(harness.state.orders[0].paymentStatus).toBe("test_confirmed");
    expect(harness.state.audits).toHaveLength(0);

    const repeated = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "admin",
    });
    expect(repeated).toEqual({
      kind: "already_confirmed",
      shareId: "SHARE1",
      organiserOrderId: "creator-order",
      creatorUsername: "@creator",
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "test_confirmed",
    });
  });

  it("rejects an unknown share without changing persisted state", async () => {
    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      shareId: "WRONG-SHARE",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "not_found" });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("rejects an open parent before touching its linked order", async () => {
    harness.state.share.status = "open";

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_share_status" });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("rejects an automatic verification whose transaction identity changed before the share lock", async () => {
    harness.state.share.organiserPaymentTxHash = "0xtransaction-b";

    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "automatic",
      expectedPaymentIdentity: {
        txHash: "0xtransaction-a",
        currency: "USDT",
        network: "ERC-20",
      },
      expectedAmountDue: 28,
      requireNoCredits: true,
    });

    expect(result).toMatchObject({ kind: "rejected", code: "payment_identity_mismatch" });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("automatically confirms when the locked amount still matches and no credits were applied", async () => {
    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "automatic",
      expectedPaymentIdentity: {
        txHash: "0xhash",
        currency: "USDT",
        network: "ERC-20",
      },
      expectedAmountDue: 28,
      requireNoCredits: true,
    });

    expect(result).toMatchObject({ kind: "confirmed", organiserPaymentStatus: "confirmed" });
    expect(harness.state.orders[0].paymentStatus).toBe("confirmed");
    expect(harness.state.orders[1].paymentStatus).toBe("unpaid");
  });

  it("keeps an automatically verified payment pending when credits were applied", async () => {
    harness.state.orders[1].creditsApplied = "3.00";

    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "automatic",
      expectedPaymentIdentity: {
        txHash: "0xhash",
        currency: "USDT",
        network: "ERC-20",
      },
      expectedAmountDue: 25,
      requireNoCredits: true,
    });

    expect(result).toMatchObject({
      kind: "rejected",
      code: "automatic_manual_review_required",
    });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
  });

  it("keeps an automatically verified payment pending when the amount changes during verification", async () => {
    const result = await confirmWholesaleOrganiserPayment({
      ...pendingInput,
      source: "automatic",
      expectedPaymentIdentity: {
        txHash: "0xhash",
        currency: "USDT",
        network: "ERC-20",
      },
      expectedAmountDue: 27,
      requireNoCredits: true,
    });

    expect(result).toMatchObject({ kind: "rejected", code: "automatic_amount_changed" });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
  });

  it("rejects confirmation when the share has no organiser-owned wallet", async () => {
    harness.state.share.leadCryptoOptions = [];

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code: "missing_organiser_wallet" });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("accepts historical creator and order usernames with harmless casing and @ differences", async () => {
    harness.state.share.creatorUsername = " @Creator ";
    harness.state.members[0].username = "creator";
    harness.state.orders[0].telegramUsername = " @CREATOR ";

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "confirmed", creatorUsername: " @Creator " });
  });

  it("rejects duplicate order linkage before changing the parent or physical order", async () => {
    harness.state.members.push({
      id: "corrupt-member",
      shareId: "SHARE1",
      username: "@member",
      isCreator: false,
      orderId: "creator-order",
      items: [],
    });

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_creator_order" });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
    expect(harness.state.audits).toHaveLength(0);
  });

  it("rejects when the linked order row is missing", async () => {
    harness.state.orders = [];

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_creator_order" });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("backfills a confirmed parent and reports the order transition", async () => {
    harness.state.share.organiserPaymentStatus = "confirmed";
    const result = await confirmWholesaleOrganiserPayment({
      shareId: "SHARE1",
      source: "backfill",
      expectedCurrentParentStatus: "confirmed",
    });

    expect(result).toMatchObject({ kind: "confirmed", orderChanged: true });
    expect(harness.state.updates).toHaveLength(1);
    expect(harness.state.audits).toHaveLength(1);
  });

  it("accepts a positive shipping-only total", async () => {
    harness.state.members.forEach(member => { member.items = []; });
    harness.state.share.totalVendorShipping = "1.00";

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result.kind).toBe("confirmed");
  });

  it("uses two-decimal rounding for every product line", async () => {
    harness.state.members = [harness.state.members[0]];
    harness.state.members[0].items = [{ quantity: 3, unitPrice: "0.333" }];
    harness.state.share.totalVendorShipping = "0";

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result.kind).toBe("confirmed");
  });

  const mismatches = [
    ["creator username", () => { harness.state.share.creatorUsername = "@other"; }, "invalid_creator_member"],
    ["duplicate creator member", () => { harness.state.members.push({ ...harness.state.members[0], id: "duplicate" }); }, "invalid_creator_member"],
    ["missing linked order", () => { delete harness.state.members[0].orderId; }, "invalid_creator_member"],
    ["wrong order type", () => { harness.state.orders[0].orderType = "ordinary"; }, "invalid_creator_order"],
    ["wrong shared order ID", () => { harness.state.orders[0].sharedOrderId = "OTHER"; }, "invalid_creator_order"],
    ["wrong order username", () => { harness.state.orders[0].telegramUsername = "@other"; }, "invalid_creator_order"],
    ["cancelled share", () => { harness.state.share.status = "cancelled"; }, "invalid_share_status"],
    ["locked share", () => { harness.state.share.status = "locked"; }, "invalid_share_status"],
    ["missing transaction hash", () => { harness.state.share.organiserPaymentTxHash = ""; }, "missing_transaction_identity"],
    ["missing currency", () => { harness.state.share.organiserPaymentCurrency = null; }, "missing_transaction_identity"],
    ["missing network", () => { harness.state.share.organiserPaymentNetwork = null; }, "missing_transaction_identity"],
    ["zero amount", () => { harness.state.members.forEach(member => { member.items = []; }); harness.state.share.totalVendorShipping = "0"; }, "invalid_amount"],
    ["negative shipping", () => { harness.state.share.totalVendorShipping = "-1"; }, "invalid_amount"],
    ["wrong parent state", () => { harness.state.share.organiserPaymentStatus = "unpaid"; }, "invalid_parent_status"],
  ] as const;

  it.each(mismatches)("rejects %s without changing persisted state", async (_name, change, code) => {
    change();
    const before = JSON.stringify({
      share: harness.state.share,
      members: harness.state.members,
      orders: harness.state.orders,
    });

    const result = await confirmWholesaleOrganiserPayment(pendingInput);

    expect(result).toMatchObject({ kind: "rejected", code });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
    expect(JSON.stringify({
      share: harness.state.share,
      members: harness.state.members,
      orders: harness.state.orders,
    })).toBe(before);
  });

  it("rejects a pending parent in backfill mode without changing it", async () => {
    const before = JSON.stringify(harness.state);

    const result = await confirmWholesaleOrganiserPayment({
      shareId: "SHARE1",
      source: "backfill",
      expectedCurrentParentStatus: "confirmed",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_parent_status" });
    expect(JSON.stringify(harness.state.share)).toBe(JSON.stringify(JSON.parse(before).share));
    expect(harness.state.updates).toHaveLength(0);
  });

  it("cannot make backfill transition a pending parent when given a malicious expected status", async () => {
    const result = await confirmWholesaleOrganiserPayment({
      shareId: "SHARE1",
      source: "backfill",
      expectedCurrentParentStatus: "pending",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_parent_status" });
    expect(harness.state.share.organiserPaymentStatus).toBe("pending");
    expect(harness.state.orders[0].paymentStatus).toBe("pending");
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("rejects a mismatched confirmed parent after validating its linkage", async () => {
    await confirmWholesaleOrganiserPayment(pendingInput);
    harness.state.orders[0].telegramUsername = "@tampered";

    const result = await confirmWholesaleOrganiserPayment({
      shareId: "SHARE1",
      source: "admin",
      expectedCurrentParentStatus: "pending",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_creator_order" });
    expect(harness.state.updates).toHaveLength(2);
    expect(harness.state.audits).toHaveLength(1);
  });

  it("rolls back the creator and parent transitions if the transactional audit fails", async () => {
    harness.state.failAudit = true;
    const before = JSON.stringify({
      share: harness.state.share,
      members: harness.state.members,
      orders: harness.state.orders,
    });

    await expect(confirmWholesaleOrganiserPayment(pendingInput)).rejects.toThrow("audit insert failed");

    expect(JSON.stringify({
      share: harness.state.share,
      members: harness.state.members,
      orders: harness.state.orders,
    })).toBe(before);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("serializes concurrent confirmations and creates one transition and audit", async () => {
    const results = await Promise.all([
      confirmWholesaleOrganiserPayment(pendingInput),
      confirmWholesaleOrganiserPayment(pendingInput),
    ]);

    expect(results.filter(result => result.kind === "confirmed")).toHaveLength(1);
    expect(results.filter(result => result.kind === "already_confirmed")).toHaveLength(1);
    expect(harness.state.share.organiserPaymentStatus).toBe("confirmed");
    expect(harness.state.orders[0].paymentStatus).toBe("confirmed");
    expect(harness.state.updates).toHaveLength(2);
    expect(harness.state.updates.map(update => update.table)).toEqual([
      harness.tables.shares,
      harness.tables.orders,
    ]);
    expect(harness.state.audits).toHaveLength(1);
  });
});
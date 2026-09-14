/**
 * Route-level contract tests for Task 5.
 *
 * The database is deliberately replaced with a small SQL-shaped adapter.  It
 * records the predicates supplied by each handler and returns rows as a
 * database would; it never lets a handler "scope" a result by filtering an
 * already-fetched array.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { refundMutationConflictResponse } from "../../lib/refund-mutation-guard";

function sqlParams(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (record.constructor?.name === "Param" && "value" in record) return [record.value];
  if (Array.isArray(record.queryChunks)) return record.queryChunks.flatMap(sqlParams);
  return [];
}

const mocks = vi.hoisted(() => {
  type Query = { table: string; where?: unknown; joins: string[]; limit?: number; offset?: number };
  const state = {
    selectRows: ((_query: Query): unknown[] => []) as (query: Query) => unknown[],
    refundRow: null as Record<string, unknown> | null,
    queries: [] as Query[],
    updates: [] as Array<{ table: string; values: unknown; where?: unknown }>,
    inserts: [] as Array<{ table: string; values: unknown }>,
    deletes: [] as string[],
    audits: [] as unknown[],
    createRefundRequest: vi.fn(),
    completeCreditRefund: vi.fn(),
    submitCryptoRefund: vi.fn(),
    failAudit: false,
    groupBuyCryptoRefundsEnabled: false,
  };
  const tableName = (value: unknown): string => {
    try { return getTableName(value as never); } catch { return "unknown"; }
  };
  const select = (columns?: unknown) => {
    const query: Query = { table: "unknown", joins: [] };
    const builder: Record<string, unknown> = {
      from(table: unknown) { query.table = tableName(table); return builder; },
      innerJoin(table: unknown) { query.joins.push(tableName(table)); return builder; },
      leftJoin(table: unknown) { query.joins.push(tableName(table)); return builder; },
      where(predicate: unknown) { query.where = predicate; return builder; },
      orderBy() { return builder; },
      limit(value: number) { query.limit = value; return builder; },
      offset(value: number) { query.offset = value; return builder; },
      for() { return builder; },
      groupBy() { return builder; },
      then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
        if (!mocks.state.queries.includes(query)) mocks.state.queries.push(query);
        return Promise.resolve(mocks.state.selectRows(query)).then(resolve, reject);
      },
      catch(reject: (error: unknown) => unknown) {
        if (!mocks.state.queries.includes(query)) mocks.state.queries.push(query);
        return Promise.resolve(mocks.state.selectRows(query)).catch(reject);
      },
    };
    void columns;
    return builder;
  };
  const fakeDb = {
    select,
    insert(table: unknown) {
      const name = tableName(table);
      return {
        values(values: unknown) {
          if (name === "audit_logs" && mocks.state.failAudit) throw new Error("audit failed");
          mocks.state.inserts.push({ table: name, values });
          const result = {
            returning: () => Promise.resolve([values]),
            onConflictDoNothing: () => ({
              returning: () => Promise.resolve([values]),
            }),
            then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
              Promise.resolve([]).then(resolve, reject),
          };
          return result;
        },
      };
    },
    update(table: unknown) {
      const name = tableName(table);
      return {
        set(values: unknown) {
          const write: { table: string; values: unknown; where?: unknown } = { table: name, values };
          mocks.state.updates.push(write);
          const result = {
            where(where: unknown) {
              write.where = where;
              return {
                returning: () => {
                  const record = values as Record<string, unknown>;
                  if (name === "group_buys" && typeof record.cryptoRefundsEnabled === "boolean") {
                    mocks.state.groupBuyCryptoRefundsEnabled = record.cryptoRefundsEnabled;
                  }
                  return Promise.resolve([values]);
                },
                then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
                  Promise.resolve([]).then(resolve, reject),
              };
            },
            returning: () => {
              const record = values as Record<string, unknown>;
              if (name === "group_buys" && typeof record.cryptoRefundsEnabled === "boolean") {
                mocks.state.groupBuyCryptoRefundsEnabled = record.cryptoRefundsEnabled;
              }
              return Promise.resolve([values]);
            },
          };
          return result;
        },
      };
    },
    delete(table: unknown) {
      const name = tableName(table);
      return {
        where: () => {
          mocks.state.deletes.push(name);
          const result = {
            returning: () => Promise.resolve([{ id: "line-item-1" }]),
            then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
              Promise.resolve([]).then(resolve, reject),
          };
          return result;
        },
      };
    },
    transaction(callback: (tx: Record<string, unknown>) => Promise<unknown>) {
      const insertCount = mocks.state.inserts.length;
      const updateCount = mocks.state.updates.length;
      const deleteCount = mocks.state.deletes.length;
      const settingBefore = mocks.state.groupBuyCryptoRefundsEnabled;
      return callback(fakeDb as unknown as Record<string, unknown>).catch((error: unknown) => {
        mocks.state.inserts.splice(insertCount);
        mocks.state.updates.splice(updateCount);
        mocks.state.deletes.splice(deleteCount);
        mocks.state.groupBuyCryptoRefundsEnabled = settingBefore;
        throw error;
      });
    },
  };
  return { state, fakeDb };
});

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mocks.fakeDb, pool: {} };
});

vi.mock("../../middleware/account-auth", () => ({
  requireAccount: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const account = req.headers["x-test-account"];
    if (!account) { res.status(401).json({ error: "Authentication required" }); return; }
    req.account = { telegramUsername: String(account), jti: "test-jti", verificationRequired: false };
    next();
  },
}));

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: express.Request, res: express.Response) => {
    if (!req.headers["x-test-admin"]) { res.status(401).json({ error: "Unauthorized" }); return false; }
    res.locals.adminUsername = String(req.headers["x-test-admin"]);
    return true;
  },
  setAdminMutationSummary: vi.fn(),
  adminAuthorizationMiddleware: (_req: express.Request, _res: express.Response, next: () => void) => next(),
}));

vi.mock("../../middleware/require-organiser", () => ({
  requireOrganiser: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const organiser = req.headers["x-test-organiser"];
    if (!organiser) { res.status(401).json({ error: "organiser required" }); return; }
    req.organiser = { telegramUsername: String(organiser), organiserStatus: "approved" };
    next();
  },
}));

vi.mock("../../lib/group-buy-refund", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../lib/group-buy-refund");
  return {
    ...actual,
    createRefundRequest: mocks.state.createRefundRequest,
    completeCreditRefund: mocks.state.completeCreditRefund,
    submitCryptoRefund: mocks.state.submitCryptoRefund,
  };
});

vi.mock("../../lib/audit-log", () => ({
  writeLog: (...args: unknown[]) => { mocks.state.audits.push(args); return Promise.resolve(); },
}));
vi.mock("../../lib/create-alert", () => ({ createAlert: vi.fn(() => Promise.resolve()) }));
vi.mock("../../lib/telegram", () => ({
  notifyUser: vi.fn(() => Promise.resolve()), sendTelegramMessage: vi.fn(() => Promise.resolve()), sendAdminMessage: vi.fn(() => Promise.resolve()),
  notifyUserFromTemplate: vi.fn(() => Promise.resolve()), sendAdminFromTemplate: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../lib/google-genai", () => ({ GoogleGenAI: class {} }));
vi.mock("../../lib/sage-ai", () => ({ callSageAI: vi.fn() }));
vi.mock("../../lib/gemini-lab-extract", () => ({ toSageContentParts: vi.fn() }));
vi.mock("../../lib/gb-entry-fee", () => ({ confirmEntryFeePayment: vi.fn(), rejectEntryFeePayment: vi.fn() }));

import groupBuyRefundsRouter from "../group-buy-refunds";
import groupBuysAdminRouter from "../group-buys-admin";
import organiserRouter from "../organiser";
import { GroupBuyRefundError } from "../../lib/group-buy-refund";

const refund = {
  id: "refund-1",
  orderId: "order-1",
  orderCode: "GB-001",
  groupBuyId: "owned-gb",
  groupBuyName: "Owned GB",
  accountId: "buyer",
  customerUsername: "buyer",
  method: "crypto",
  status: "requested",
  amountUsd: "123.45",
  amountBaseUnits: "123450000",
  asset: "USDC",
  network: "Ethereum ERC-20",
  destinationWallet: "0x1111111111111111111111111111111111111111",
  requestedAt: new Date("2026-01-01T00:00:00Z"),
  verifyingAt: null,
  failedAt: null,
  completedAt: null,
  outgoingTxid: null,
  confirmationCount: null,
  explorerUrl: null,
  verificationErrorCode: null,
  verificationErrorMessage: null,
  proof: "must-not-leak",
  outboxSecret: "must-not-leak",
};

const attempt = {
  id: "attempt-1", refundId: "refund-1", submittedTxid: "0x" + "a".repeat(64),
  processorUsername: "organiser", processorRole: "organiser",
  startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null,
  resultCode: null, failureReason: null,
};
const originalPaymentTxid = `0x${"C".repeat(64)}`;
const additionPaymentTxid = `0x${"2".repeat(64)}`;
const plainPaymentTxid = "b".repeat(64);
const balancePaymentTxid = `0x${"3".repeat(64)}`;
const outgoingRefundTxid = `0x${"A".repeat(64)}`;
const solanaPaymentTxid = `1${"A".repeat(87)}`;

function buildApp(...routers: Express["router"][]): Express {
  const app = express();
  app.use(express.json());
  for (const router of routers) app.use(router);
  return app;
}

function buildAppWithRefundErrorHandler(...routers: Express["router"][]): Express {
  const app = buildApp(...routers);
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const conflict = refundMutationConflictResponse(error);
    if (conflict) {
      res.status(conflict.status).json(conflict.body);
      return;
    }
    next(error);
  });
  return app;
}

async function withServer<T>(app: Express, callback: (base: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const address = server.address() as AddressInfo;
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

async function request(app: Express, path: string, options: RequestInit = {}) {
  const headers = (options.headers ?? {}) as Record<string, unknown>;
  const embeddedBody = typeof headers.body === "string" ? headers.body : undefined;
  const cleanHeaders = Object.fromEntries(Object.entries(headers).filter(([key]) => key !== "body"));
  return withServer(app, base => fetch(base + path, {
    ...options,
    headers: cleanHeaders as Record<string, string>,
    ...(embeddedBody !== undefined ? { body: embeddedBody } : {}),
  }));
}

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  ...headers, "content-type": "application/json", body: JSON.stringify(body),
});

beforeEach(() => {
  mocks.state.queries.length = 0;
  mocks.state.refundRow = refund;
  mocks.state.updates.length = 0;
  mocks.state.inserts.length = 0;
  mocks.state.deletes.length = 0;
  mocks.state.audits.length = 0;
  mocks.state.selectRows = query => {
    if (query.table === "group_buy_refund_attempts") return [attempt];
    const params = sqlParams(query.where);
    if (query.table === "group_buy_refunds" && query.joins.length > 0 && params.includes("outside")) return [];
    if (query.table === "group_buy_refunds" && query.joins.length > 0) {
      const joined = mocks.state.refundRow ?? refund;
      const {
        paymentTxHash,
        paymentTxHashes,
        balanceTxHash,
        balancePaymentStatus,
        testPaymentTxHash,
        ...refundWithoutPaymentFields
      } = joined;
      return [{
        refund: refundWithoutPaymentFields,
      customerUsername: "buyer",
      groupBuyName: "Owned GB",
      orderCode: "GB-001",
        paymentTxHash,
        paymentTxHashes,
        balanceTxHash,
        balancePaymentStatus,
        testPaymentTxHash,
      }];
    }
    if (query.table === "group_buys" && params.includes("not-owned")) return [];
    if (query.table === "group_buys" && (params.includes("owned-gb") || params.includes("organiser"))) return [{
      id: "owned-gb", name: "Owned GB", organiserId: "organiser",
      approvalStatus: "approved", status: "draft", cryptoRefundsEnabled: mocks.state.groupBuyCryptoRefundsEnabled,
    }];
    return [];
  };
  mocks.state.createRefundRequest.mockReset();
  mocks.state.completeCreditRefund.mockReset();
  mocks.state.submitCryptoRefund.mockReset();
  mocks.state.failAudit = false;
  mocks.state.groupBuyCryptoRefundsEnabled = false;
  mocks.state.createRefundRequest.mockResolvedValue({
    id: "refund-1", status: "requested", method: "crypto", amountUsd: "123.45",
    asset: "USDC", network: "Ethereum ERC-20",
    destinationWallet: refund.destinationWallet, amountBaseUnits: "123450000",
  });
  mocks.state.completeCreditRefund.mockResolvedValue({ ...refund, status: "completed" });
  mocks.state.submitCryptoRefund.mockResolvedValue({ ...refund, status: "completed", outgoingTxid: attempt.submittedTxid });
});

describe("group-buy refund route contracts", () => {
  it("exposes every exact endpoint and uses server-owned amount", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    const account = await request(app, "/account/orders/order-1/refund", {
      method: "POST", headers: json({
        method: "crypto", asset: "USDC", network: "Ethereum ERC-20",
        destinationWallet: refund.destinationWallet,
      }, { "x-test-account": "buyer" }),
    });
    expect(account.status).toBe(201);
    expect(mocks.state.createRefundRequest).toHaveBeenCalledWith(expect.anything(), {
      accountId: "buyer", orderId: "order-1", input: {
        method: "crypto", asset: "USDC", network: "Ethereum ERC-20",
        destinationWallet: refund.destinationWallet,
      },
    });
    const accountBody = await account.json() as Record<string, unknown>;
    expect(accountBody.amountUsd).toBe("123.45");
    expect(accountBody.paymentTxids).toBeUndefined();

    const adminList = await request(app, "/admin/group-buy-refunds?groupBuyId=owned-gb&status=requested&page=1&limit=10", {
      headers: { "x-test-admin": "admin" },
    });
    expect(adminList.status).toBe(200);
    const adminDetail = await request(app, "/admin/group-buy-refunds/refund-1", { headers: { "x-test-admin": "admin" } });
    expect(adminDetail.status).toBe(200);
    const credit = await request(app, "/admin/group-buy-refunds/refund-1/credit-complete", {
      method: "POST", headers: { "x-test-admin": "admin" },
    });
    expect(credit.status).toBe(200);
    const verify = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
      method: "POST", headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
    });
    expect(verify.status).toBe(200);

    const orgList = await request(app, "/organiser/group-buy-refunds?groupBuyId=owned-gb&status=requested", {
      headers: { "x-test-organiser": "organiser" },
    });
    expect(orgList.status).toBe(200);
    const orgDetail = await request(app, "/organiser/group-buy-refunds/refund-1", {
      headers: { "x-test-organiser": "organiser" },
    });
    expect(orgDetail.status).toBe(200);
    const orgCredit = await request(app, "/organiser/group-buy-refunds/refund-1/credit-complete", {
      method: "POST", headers: { "x-test-organiser": "organiser" },
    });
    expect(orgCredit.status).toBe(200);
    const orgVerify = await request(app, "/organiser/group-buy-refunds/refund-1/verify", {
      method: "POST", headers: json({ txid: attempt.submittedTxid }, { "x-test-organiser": "organiser" }),
    });
    expect(orgVerify.status).toBe(200);
  });

  it("rejects amount, token, proof and other injected customer fields", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    for (const extra of [{ amountUsd: "0.01" }, { token: "secret" }, { paymentProof: "fake" }, { accountId: "victim" }]) {
      const response = await request(app, "/account/orders/order-1/refund", {
        method: "POST",
        headers: json({
          method: "crypto", asset: "USDC", network: "Ethereum ERC-20",
          destinationWallet: refund.destinationWallet, ...extra,
        }, { "x-test-account": "buyer" }),
      });
      expect(response.status).toBe(400);
    }
    expect(mocks.state.createRefundRequest).not.toHaveBeenCalled();
  });

  it("accepts only strict txid verification and never accepts client credit amounts", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    for (const body of [{ txid: attempt.submittedTxid, amountUsd: "1" }, { txid: attempt.submittedTxid, proof: "x" }, { txid: 42 }]) {
      const response = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
        method: "POST", headers: json(body, { "x-test-admin": "admin" }),
      });
      expect(response.status).toBe(400);
    }
    const response = await request(app, "/admin/group-buy-refunds/refund-1/credit-complete", {
      method: "POST", headers: json({ amountUsd: "0.01" }, { "x-test-admin": "admin" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.state.completeCreditRefund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      refundId: "refund-1", username: "admin", role: "admin",
    }));
  });

  it("maps disabled, unsupported and ownership failures to stable HTTP codes", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    const failures: Array<[string, number, string]> = [
      ["refunds_disabled", 403, "refunds_disabled"],
      ["not_owner", 403, "not_owner"],
      ["ineligible_payment_evidence", 400, "ineligible_payment_evidence"],
      ["invalid_asset", 400, "invalid_asset"],
      ["invalid_network", 400, "invalid_network"],
      ["invalid_destination_wallet", 400, "invalid_destination_wallet"],
      ["active_refund_exists", 409, "active_refund_exists"],
    ];
    for (const [code, status, stable] of failures) {
      mocks.state.createRefundRequest.mockRejectedValueOnce(new GroupBuyRefundError(code));
      const response = await request(app, "/account/orders/order-1/refund", {
        method: "POST", headers: json({ method: "credit" }, { "x-test-account": "buyer" }),
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code: stable, error: stable });
    }
  });

  it("returns safe detail fields, attempts and no proof/outbox/private fields", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    const response = await request(app, "/admin/group-buy-refunds/refund-1", {
      headers: { "x-test-admin": "admin" },
    });
    const body = await response.json() as Record<string, any>;
    expect(body).toMatchObject({
      id: "refund-1", orderId: "order-1", orderCode: "GB-001",
      groupBuyId: "owned-gb", customerUsername: "buyer",
      amountUsd: "123.45", destinationWallet: refund.destinationWallet,
      attempts: [{ id: "attempt-1", submittedTxid: attempt.submittedTxid }],
    });
    expect(body.proof).toBeUndefined();
    expect(body.outboxSecret).toBeUndefined();
    expect(body.attempts[0].privateKey).toBeUndefined();
  });

  it("projects trimmed, deduplicated incoming payment TXIDs to protected list and detail views", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    mocks.state.refundRow = {
      ...refund,
      paymentTxHash: `  ${originalPaymentTxid}  `,
      paymentTxHashes: [
        originalPaymentTxid.slice(2).toLowerCase(),
        `  ${additionPaymentTxid}  `,
        plainPaymentTxid,
        `  ${outgoingRefundTxid.slice(2).toLowerCase()}  `,
        "",
        originalPaymentTxid,
        solanaPaymentTxid,
      ],
      balanceTxHash: `  ${balancePaymentTxid}  `,
      balancePaymentStatus: "pending_confirmation",
      testPaymentTxHash: "test-payment-must-not-leak",
      outgoingTxid: outgoingRefundTxid,
    };

    const surfaces = [
      { path: "/admin/group-buy-refunds", headers: { "x-test-admin": "admin" }, list: true },
      { path: "/admin/group-buy-refunds/refund-1", headers: { "x-test-admin": "admin" }, list: false },
      { path: "/organiser/group-buy-refunds?groupBuyId=owned-gb", headers: { "x-test-organiser": "organiser" }, list: true },
      { path: "/organiser/group-buy-refunds/refund-1", headers: { "x-test-organiser": "organiser" }, list: false },
    ];
    for (const surface of surfaces) {
      const response = await request(app, surface.path, { headers: surface.headers });
      expect(response.status, surface.path).toBe(200);
      const body = await response.json() as Record<string, unknown> | Array<Record<string, unknown>>;
      const row = surface.list ? (body as Array<Record<string, unknown>>)[0] : body as Record<string, unknown>;
      expect(row.paymentTxids, surface.path).toEqual([
        originalPaymentTxid, additionPaymentTxid, plainPaymentTxid, solanaPaymentTxid, balancePaymentTxid,
      ]);
      expect(row.outgoingTxid, surface.path).toBe(outgoingRefundTxid);
      expect(row.testPaymentTxHash, surface.path).toBeUndefined();
    }
  });

  it("excludes fiat, AnonPay, and other manual payment markers from payment TXIDs", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    mocks.state.refundRow = {
      ...refund,
      paymentTxHash: "fiat:revolut",
      paymentTxHashes: ["anonpay:payment-session", "fiat:paypal"],
      balanceTxHash: "fiat:paypal",
      balancePaymentStatus: "pending_confirmation",
    };

    const response = await request(app, "/admin/group-buy-refunds/refund-1", {
      headers: { "x-test-admin": "admin" },
    });

    expect(response.status).toBe(200);
    expect((await response.json() as Record<string, unknown>).paymentTxids).toEqual([]);
  });

  it("returns no payment TXIDs for a manually paid order without recorded references", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    mocks.state.refundRow = {
      ...refund,
      paymentTxHash: null,
      paymentTxHashes: null,
      balanceTxHash: " ",
      balancePaymentStatus: "pending_confirmation",
      testPaymentTxHash: "test-payment-must-not-leak",
    };

    const response = await request(app, "/admin/group-buy-refunds/refund-1", {
      headers: { "x-test-admin": "admin" },
    });

    expect(response.status).toBe(200);
    expect((await response.json() as Record<string, unknown>).paymentTxids).toEqual([]);
  });

  it("validates status, groupBuyId, and deterministic pagination inputs", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    for (const query of [
      "?status=unknown", "?status=requested&status=completed", "?groupBuyId=",
      "?page=0", "?page=abc", "?page=10001", "?page=1&page=2",
      "?limit=0", "?limit=101", "?limit=1.2", "?limit=1&limit=2",
    ]) {
      const response = await request(app, `/admin/group-buy-refunds${query}`, {
        headers: { "x-test-admin": "admin" },
      });
      expect(response.status).toBe(400);
      expect((await response.json() as Record<string, unknown>).code).toBe("invalid_query");
    }
    const response = await request(app, "/admin/group-buy-refunds?page=2&limit=10", {
      headers: { "x-test-admin": "admin" },
    });
    expect(response.status).toBe(200);
    const query = mocks.state.queries.find(item => item.table === "group_buy_refunds");
    expect(query?.limit).toBe(10);
    expect(query?.offset).toBe(10);
  });

  it("loads queue attempts in one batch query after the scoped refund query", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    const response = await request(app, "/admin/group-buy-refunds?limit=10", {
      headers: { "x-test-admin": "admin" },
    });
    expect(response.status).toBe(200);
    expect(mocks.state.queries.filter(query => query.table === "group_buy_refund_attempts")).toHaveLength(1);
  });

  it("scopes organiser SQL queries and mutations, with outside scope returning 404", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    const outside = await request(app, "/organiser/group-buy-refunds?groupBuyId=not-owned", {
      headers: { "x-test-organiser": "organiser" },
    });
    expect(outside.status).toBe(404);
    const outsideMutation = await request(app, "/organiser/group-buy-refunds/outside/credit-complete", {
      method: "POST", headers: { "x-test-organiser": "organiser" },
    });
    expect(outsideMutation.status).toBe(404);
    const list = await request(app, "/organiser/group-buy-refunds?groupBuyId=owned-gb", {
      headers: { "x-test-organiser": "organiser" },
    });
    expect(list.status).toBe(200);
    const scopedQuery = mocks.state.queries.find(query => query.table === "group_buy_refunds");
    expect(scopedQuery?.where).toBeTruthy();
    await request(app, "/organiser/group-buy-refunds/refund-1/credit-complete", {
      method: "POST", headers: { "x-test-organiser": "organiser" },
    });
    await request(app, "/organiser/group-buy-refunds/refund-1/verify", {
      method: "POST", headers: json({ txid: attempt.submittedTxid }, { "x-test-organiser": "organiser" }),
    });
    expect(mocks.state.completeCreditRefund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      role: "organiser", username: "organiser",
    }));
    expect(mocks.state.submitCryptoRefund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      role: "organiser", username: "organiser",
    }), "refund-1", attempt.submittedTxid);
  });

  it("keeps duplicate active requests idempotent and permits verification_failed retry", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    mocks.state.createRefundRequest.mockResolvedValueOnce({
      id: "refund-existing", status: "verification_failed", method: "crypto", amountUsd: "123.45",
    });
    const duplicate = await request(app, "/account/orders/order-1/refund", {
      method: "POST", headers: json({ method: "credit" }, { "x-test-account": "buyer" }),
    });
    expect(duplicate.status).toBe(201);
    expect((await duplicate.json() as Record<string, unknown>).id).toBe("refund-existing");

    mocks.state.submitCryptoRefund.mockRejectedValueOnce(new GroupBuyRefundError("wrong_recipient"));
    const failed = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
      method: "POST", headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
    });
    expect(failed.status).toBe(400);
    mocks.state.submitCryptoRefund.mockResolvedValueOnce({ ...refund, status: "completed" });
    const retry = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
      method: "POST", headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
    });
    expect(retry.status).toBe(200);
  });

  it("does not let role middleware intercept sibling paths", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    expect((await request(app, "/account/orders/order-1/refund", { method: "POST" })).status).toBe(401);
    expect((await request(app, "/admin/group-buy-refunds")).status).toBe(401);
    expect((await request(app, "/organiser/group-buy-refunds")).status).toBe(401);
  });
});

describe("admin-only refund setting", () => {
  it("defaults false, validates booleans, audits actual changes, and preserves history", async () => {
    const app = buildApp(groupBuysAdminRouter, groupBuyRefundsRouter);
    const created = await request(app, "/admin/group-buys", {
      method: "POST", headers: json({ name: "GB" }, { "x-test-admin": "admin" }),
    });
    expect(created.status, await created.clone().text()).toBe(201);
    const inserted = mocks.state.inserts.find(item => item.table === "group_buys");
    expect((inserted?.values as Record<string, unknown>).cryptoRefundsEnabled).toBe(false);

    const invalid = await request(app, "/admin/group-buys/owned-gb", {
      method: "PATCH", headers: json({ cryptoRefundsEnabled: "true" }, { "x-test-admin": "admin" }),
    });
    expect(invalid.status).toBe(400);

    const toggled = await request(app, "/admin/group-buys/owned-gb", {
      method: "PATCH", headers: json({ cryptoRefundsEnabled: true }, { "x-test-admin": "admin" }),
    });
    expect(toggled.status).toBe(200);
    expect(mocks.state.inserts.some(item =>
      item.table === "audit_logs"
      && String((item.values as Record<string, unknown>).action).includes("crypto_refunds_setting_changed"),
    )).toBe(true);
    const auditCount = mocks.state.inserts.filter(item => item.table === "audit_logs").length;
    const unchanged = await request(app, "/admin/group-buys/owned-gb", {
      method: "PATCH", headers: json({ cryptoRefundsEnabled: true }, { "x-test-admin": "admin" }),
    });
    expect(unchanged.status).toBe(200);
    expect(mocks.state.inserts.filter(item => item.table === "audit_logs")).toHaveLength(auditCount);

    const disabled = await request(app, "/admin/group-buys/owned-gb", {
      method: "PATCH", headers: json({ cryptoRefundsEnabled: false }, { "x-test-admin": "admin" }),
    });
    expect(disabled.status).toBe(200);
    expect((await (await request(app, "/admin/group-buy-refunds/refund-1", { headers: { "x-test-admin": "admin" } })).json() as Record<string, unknown>).id).toBe("refund-1");
  });

  it("rolls back group-buy setting writes when the in-transaction audit fails", async () => {
    const app = buildApp(groupBuysAdminRouter);
    mocks.state.failAudit = true;
    const created = await request(app, "/admin/group-buys", {
      method: "POST",
      headers: json({ name: "Atomic GB", cryptoRefundsEnabled: true }, { "x-test-admin": "admin" }),
    });
    expect(created.status).toBe(503);
    expect(await created.json()).toMatchObject({ code: "audit_failure", error: "audit_failure" });
    expect(mocks.state.inserts.some(item => item.table === "group_buys")).toBe(false);

    mocks.state.failAudit = false;
    const updatesBefore = mocks.state.updates.length;
    mocks.state.failAudit = true;
    const updated = await request(app, "/admin/group-buys/owned-gb", {
      method: "PATCH",
      headers: json({ cryptoRefundsEnabled: true }, { "x-test-admin": "admin" }),
    });
    expect(updated.status).toBe(503);
    expect(await updated.json()).toMatchObject({ code: "audit_failure", error: "audit_failure" });
    expect(mocks.state.updates.length).toBe(updatesBefore);
    expect(mocks.state.groupBuyCryptoRefundsEnabled).toBe(false);
  });

  it("maps refund state and provider failures to stable statuses", async () => {
    const app = buildApp(groupBuyRefundsRouter);
    for (const code of [
      "completed_txid_immutable", "invalid_refund_transition", "refund_claim_lost",
      "attempt_ownership_lost", "order_state_changed", "payment_state_changed", "payment_evidence_changed",
      "txid_replay", "in_progress",
    ]) {
      mocks.state.submitCryptoRefund.mockRejectedValueOnce(new GroupBuyRefundError(code));
      const response = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
        method: "POST",
        headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code, error: code });
    }
    for (const code of ["completed_refund_linkage_mismatch", "invalid_refund_configuration", "invalid_refund_amount"]) {
      mocks.state.submitCryptoRefund.mockRejectedValueOnce(new GroupBuyRefundError(code, "sensitive internal detail"));
      const response = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
        method: "POST",
        headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ code, error: code });
    }
    for (const code of ["provider_unavailable", "processing_failure"]) {
      mocks.state.submitCryptoRefund.mockRejectedValueOnce(new GroupBuyRefundError(code));
      const response = await request(app, "/admin/group-buy-refunds/refund-1/verify", {
        method: "POST",
        headers: json({ txid: attempt.submittedTxid }, { "x-test-admin": "admin" }),
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code, error: code });
    }
  });

  it("rejects setting presence on organiser create and update with no persistence", async () => {
    const app = buildApp(organiserRouter);
    for (const path of ["/organiser/group-buys", "/organiser/group-buys/owned-gb"]) {
      const method = path.endsWith("owned-gb") ? "PATCH" : "POST";
      const response = await request(app, path, {
        method, headers: json(method === "POST"
          ? { name: "GB", cryptoRefundsEnabled: true }
          : { cryptoRefundsEnabled: false }, { "x-test-organiser": "organiser" }),
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "admin_only_setting" });
    }
    expect(mocks.state.inserts.some(item => item.table === "group_buys")).toBe(false);
    expect(mocks.state.updates.some(item => item.table === "group_buys")).toBe(false);
  });

  it("executes the real organiser quantity edit handler and leaves every row unchanged when refund is active", async () => {
    const parentOrder = {
      id: "order-1",
      groupBuyId: "owned-gb",
      telegramUsername: "@buyer",
      code: "GB-001",
      grandTotal: "12.00",
      productSubtotal: "10.00",
      deliveryPrice: "2.00",
      vendorShipping: "0.00",
      tip: "0.00",
      testingContribution: "0.00",
      adminFee: "0.00",
      adminFeeLabel: null,
      paymentStatus: "confirmed",
      trackingNumber: null,
      trackingNumbers: [],
      trackingPackages: [],
      trackingDetails: null,
      trackingStatus: null,
      trackingEvents: [],
      trackingLastChecked: null,
      trackingShippedItems: null,
      orderType: "standard",
      sharedOrderId: null,
      deliveryMethod: "shipping",
    };
    const lineItems = [{
      id: "line-1",
      orderId: "order-1",
      productId: "product-1",
      productName: "Widget",
      quantity: "1.00",
      unitPrice: "10.00",
      lineTotal: "10.00",
      isOos: false,
    }];
    const groupBuy = {
      id: "owned-gb",
      name: "Owned GB",
      organiserId: "organiser",
      currency: "USD",
      organiserOrderEditEnabled: true,
      organiserCanEditStatus: true,
      organiserCanEditPaymentStatus: true,
      organiserCanEditTracking: true,
      organiserCanEditNotes: true,
      organiserCanEditTxId: true,
      organiserCanEditQuantities: true,
      adminFeeEnabled: false,
      adminFeeType: null,
      adminFeeAmount: null,
      adminFeeLabel: null,
    };
    const before = structuredClone({ parentOrder, lineItems });
    mocks.state.selectRows = query => {
      if (query.table === "group_buys") return [groupBuy];
      if (query.table === "orders") return [parentOrder];
      if (query.table === "order_line_items") return lineItems;
      if (query.table === "group_buy_refunds") {
        return [{ id: "refund-1", orderId: "order-1", status: "requested" }];
      }
      return [];
    };

    const app = buildAppWithRefundErrorHandler(organiserRouter);
    const response = await request(app, "/organiser/group-buys/owned-gb/orders/order-1", {
      method: "PATCH",
      headers: json({ lineItems: [{ id: "line-1", quantity: 2 }] }, { "x-test-organiser": "organiser" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "refund_active",
      orderId: "order-1",
    });
    expect({ parentOrder, lineItems }).toEqual(before);
    expect(mocks.state.updates).toEqual([]);
    expect(mocks.state.inserts).toEqual([]);
    expect(mocks.state.deletes).toEqual([]);
  });

  it("allows the same real organiser quantity edit when no refund is active", async () => {
    const parentOrder = {
      id: "order-1",
      groupBuyId: "owned-gb",
      telegramUsername: "@buyer",
      code: "GB-001",
      grandTotal: "12.00",
      productSubtotal: "10.00",
      deliveryPrice: "2.00",
      vendorShipping: "0.00",
      tip: "0.00",
      testingContribution: "0.00",
      adminFee: "0.00",
      adminFeeLabel: null,
      paymentStatus: "confirmed",
      trackingNumber: null,
      trackingNumbers: [],
      trackingPackages: [],
      trackingDetails: null,
      trackingStatus: null,
      trackingEvents: [],
      trackingLastChecked: null,
      trackingShippedItems: null,
      orderType: "standard",
      sharedOrderId: null,
      deliveryMethod: "shipping",
    };
    const lineItems = [{
      id: "line-1",
      orderId: "order-1",
      productId: "product-1",
      productName: "Widget",
      quantity: "1.00",
      unitPrice: "10.00",
      lineTotal: "10.00",
      isOos: false,
    }];
    const groupBuy = {
      id: "owned-gb",
      name: "Owned GB",
      organiserId: "organiser",
      currency: "USD",
      organiserOrderEditEnabled: true,
      organiserCanEditStatus: true,
      organiserCanEditPaymentStatus: true,
      organiserCanEditTracking: true,
      organiserCanEditNotes: true,
      organiserCanEditTxId: true,
      organiserCanEditQuantities: true,
      adminFeeEnabled: false,
      adminFeeType: null,
      adminFeeAmount: null,
      adminFeeLabel: null,
    };
    mocks.state.selectRows = query => {
      if (query.table === "group_buys") return [groupBuy];
      if (query.table === "orders") return [parentOrder];
      if (query.table === "order_line_items") return lineItems;
      return [];
    };

    const app = buildAppWithRefundErrorHandler(organiserRouter);
    const response = await request(app, "/organiser/group-buys/owned-gb/orders/order-1", {
      method: "PATCH",
      headers: json({ lineItems: [{ id: "line-1", quantity: 2 }] }, { "x-test-organiser": "organiser" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.state.updates.some(write => write.table === "order_line_items")).toBe(true);
    expect(mocks.state.updates.some(write => write.table === "orders")).toBe(true);
  });
});
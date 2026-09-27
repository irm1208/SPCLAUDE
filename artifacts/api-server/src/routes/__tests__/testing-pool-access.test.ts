import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { notifyUser } from "../../lib/telegram";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => {
  const tableName = (table: unknown): string => {
    try { return getTableName(table as never); } catch { return "unknown"; }
  };
  const state: {
    pools: any[];
    pool: any;
    tests: any[];
    participants: any[];
    results: any[];
    writes: Array<{ table: string; values: any }>;
    admin: boolean;
    revokedJtis: Set<string>;
    leaderApproved: boolean;
  } = { pools: [], pool: null, tests: [], participants: [], results: [], writes: [], admin: true, revokedJtis: new Set(), leaderApproved: true };

  function extractParams(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(extractParams);
    if (value.constructor?.name === "Param" && typeof value.value === "string") return [value.value];
    if (Array.isArray(value.queryChunks)) return value.queryChunks.flatMap(extractParams);
    return [];
  }

  const fakeDb = {
    select: (selection?: unknown) => {
      const ctx: { table: string; selection: any; ordered: boolean } = { table: "unknown", selection, ordered: false };
      const builder: any = {
        from(table: unknown) { ctx.table = tableName(table); return builder; },
        where() { return builder; },
        orderBy() { ctx.ordered = true; return builder; },
        leftJoin() { return builder; },
        innerJoin() { return builder; },
        groupBy() { return builder; },
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(readRows(ctx)).then(resolve, reject);
        },
      };
      return builder;
    },
    insert: (table: unknown) => ({
      values(values: any) {
        const name = tableName(table);
        state.writes.push({ table: name, values });
        if (name === "testing_pools") {
          state.pool = { namedReportPriceUsd: "30", vialCostUsd: "0", shippingCostUsd: "0", organiserTipUsd: "0", targetAmountUsd: "0", ...values };
          state.pools.push(state.pool);
        }
        if (name === "pool_tests") state.tests.push(values);
        if (name === "pool_participants") state.participants.push(values);
        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set(values: any) {
        const name = tableName(table);
        state.writes.push({ table: name, values });
        return {
          where: (condition: unknown) => {
            if (name === "testing_pools" && state.pool) Object.assign(state.pool, values);
            if (name === "pool_participants" && state.participants[0]) Object.assign(state.participants[0], values);
            if (name === "pool_tests") {
              const id = extractParams(condition)[0];
              const row = state.tests.find(item => item.id === id);
              if (row) Object.assign(row, values);
            }
            return Promise.resolve([]);
          },
        };
      },
    }),
    delete: (table: unknown) => ({
      where(condition: unknown) {
        const name = tableName(table);
        const ids = extractParams(condition);
        if (name === "pool_tests") {
          const removedIds = ids.filter(id => state.tests.some(test => test.id === id));
          state.tests = state.tests.filter(test => !removedIds.includes(test.id));
          state.results = state.results.filter(result => !removedIds.includes(result.poolTestId));
        }
        return Promise.resolve([]);
      },
    }),
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback(fakeDb),
  };

  function readRows(ctx: { table: string; selection: any; ordered: boolean }): any[] {
    if (ctx.table === "testing_pools") return ctx.ordered ? state.pools : (state.pool ? [state.pool] : []);
    if (ctx.table === "accounts") return state.leaderApproved ? [{ status: "approved" }] : [];
    if (ctx.table === "pool_tests") return state.tests;
    if (ctx.table === "pool_test_results") return state.results;
    if (ctx.table === "pool_participants") {
      const keys = Object.keys(ctx.selection ?? {});
      if (keys.includes("contributors") || keys.includes("raised") || keys.includes("pending")) {
        return [{ contributors: "0", raised: "0", pending: "0" }];
      }
      if (keys.includes("count")) {
        return [{ count: String(state.participants.filter(row => ["submitted", "verified"].includes(row.paymentStatus)).length) }];
      }
      if (ctx.ordered) return [];
      return state.participants;
    }
    return [];
  }

  return { state, fakeDb };
});

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mockState.fakeDb, pool: {} };
});

vi.mock("../../middleware/account-auth", () => ({
  requireAccount: (req: any, _res: unknown, next: () => void) => {
    req.account = { telegramUsername: String(req.headers["x-test-account"] ?? "pool-leader"), jti: "test-session" };
    next();
  },
  getJwtSecret: () => "pool-access-test-secret",
  getOptionalAccountSession: async (req: any) => {
    const token = req.cookies?.account_session;
    if (!token) return null;
    try {
      const jwt = await import("jsonwebtoken");
      const payload = jwt.default.verify(token, "pool-access-test-secret") as any;
      if (
        typeof payload.telegramUsername !== "string"
        || typeof payload.jti !== "string"
        || typeof payload.iat !== "number"
        || Date.now() - payload.iat * 1000 >= 24 * 60 * 60 * 1000
        || payload.verificationRequired === true
        || mockState.state.revokedJtis.has(payload.jti)
      ) return null;
      return { telegramUsername: payload.telegramUsername, jti: payload.jti, verificationRequired: false };
    } catch {
      return null;
    }
  },
}));

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, res: express.Response) => {
    if (mockState.state.admin) return true;
    res.status(403).json({ error: "Admin access required" });
    return false;
  },
}));

vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/telegram", () => ({
  sendAdminFromTemplate: vi.fn().mockResolvedValue(undefined),
  notifyUserFromTemplate: vi.fn().mockResolvedValue(undefined),
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));

import testingPoolsRouter from "../testing-pools";

const ACCESS_CODE = "private-sesame";
const SECRET = "pool-access-test-secret";

function privatePool(overrides: Record<string, unknown> = {}) {
  return {
    id: "pool-private",
    slug: "private-pool",
    leaderUsername: "pool-leader",
    title: "Private pool",
    description: null,
    compoundName: null,
    labName: "Lab A",
    manufacturer: null,
    batchNumber: null,
    status: "open",
    votingMode: "leader_decides",
    targetAmountUsd: "10.00",
    namedReportPriceUsd: "30.00",
    vialCostUsd: "0.00",
    shippingCostUsd: "0.00",
    organiserTipUsd: "0.00",
    inviteOnly: true,
    accessCodeHash: bcrypt.hashSync(ACCESS_CODE, 4),
    resultsPasswordHash: null,
    payoutWalletAddress: null,
    payoutCurrency: null,
    payoutNetwork: null,
    paymentMethods: [],
    contributorNamedReportEnabled: false,
    namedReportCap: null,
    allowVialContribution: false,
    stopOnFunded: false,
    fixedOptInFeeUsd: null,
    capColor: null,
    mgSize: null,
    manufacturingDate: null,
    imageUrl: null,
    resultPostedAt: null,
    groupBuyId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    approvalStatus: "approved",
    hiddenFromList: false,
    ...overrides,
  };
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(testingPoolsRouter);
  return app;
}

async function withServer<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise(resolve => {
    const value = buildApp().listen(0, () => resolve(value));
  });
  try {
    return await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

async function request(base: string, path: string, options: RequestInit = {}) {
  return fetch(`${base}${path}`, options);
}

function codeHeaders(code?: string): Record<string, string> {
  return code ? { "x-pool-access-code": code } : {};
}

beforeEach(() => {
  mockState.state.pool = privatePool();
  mockState.state.pools = [mockState.state.pool];
  mockState.state.tests = [];
  mockState.state.results = [];
  mockState.state.participants = [{
    id: "participant-1",
    poolId: "pool-private",
    paymentStatus: "verified",
    amountUsd: "10.00",
    isPublic: false,
    displayName: null,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    paymentTxHash: null,
  }];
  mockState.state.writes = [];
  mockState.state.revokedJtis = new Set();
  mockState.state.admin = true;
  mockState.state.leaderApproved = true;
  vi.mocked(notifyUser).mockClear();
});

describe("invite-only testing pool access gates", () => {
  it("hides invite-only pools from listing even when not hiddenFromList", async () => {
    mockState.state.pools = [
      privatePool({ hiddenFromList: false }),
      privatePool({
        id: "pool-public",
        slug: "public-pool",
        title: "Public pool",
        inviteOnly: false,
        accessCodeHash: null,
      }),
    ];
    await withServer(async base => {
      const response = await request(base, "/testing-pools");
      expect(response.status).toBe(200);
      expect(((await response.json()) as any[]).map((pool: any) => pool.slug)).toEqual(["public-pool"]);
    });
  });

  it("requires a correct code for private detail and opt-in, without exposing hashes", async () => {
    await withServer(async base => {
      for (const code of [undefined, "wrong"]) {
        const detail = await request(base, "/testing-pools/private-pool", { headers: codeHeaders(code) });
        expect(detail.status).toBe(403);
        expect(await detail.json()).toEqual({ error: "access_code_required", code: "access_code_required" });
        const optIn = await request(base, "/testing-pools/private-pool/opt-in", {
          method: "POST",
          headers: { "content-type": "application/json", ...codeHeaders(code) },
          body: JSON.stringify({ amountUsd: 10, contactTelegram: "@guest" }),
        });
        expect(optIn.status).toBe(403);
        expect(((await optIn.json()) as any).error).toBe("access_code_required");
      }

      const detail = await request(base, "/testing-pools/private-pool", { headers: codeHeaders(ACCESS_CODE) });
      expect(detail.status).toBe(200);
      const body = await detail.text();
      expect(body).not.toContain("accessCodeHash");
      expect(body).not.toContain(mockState.state.pool.accessCodeHash);
      expect(body).toContain('"inviteOnly":true');

      const adminDetail = await request(base, "/admin/testing-pools/pool-private/detail");
      expect(adminDetail.status).toBe(200);
      const adminBody = await adminDetail.text();
      expect(adminBody).not.toContain("accessCodeHash");
      expect(adminBody).not.toContain(mockState.state.pool.accessCodeHash);
      expect(adminBody).not.toContain("resultsPasswordHash");

      const optIn = await request(base, "/testing-pools/private-pool/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json", ...codeHeaders(ACCESS_CODE) },
        body: JSON.stringify({ amountUsd: 10, contactTelegram: "@guest" }),
      });
      expect(optIn.status).toBe(201);
    });
  });

  it("requires a correct code on participant status and payment/session paths", async () => {
    const endpoints: Array<{ path: string; method?: string; body?: unknown; expectedWithCode: number }> = [
      { path: "/testing-pools/participants/participant-1/status", expectedWithCode: 200 },
      { path: "/testing-pools/participants/participant-1/submit-tx", method: "POST", body: { txHash: "transaction-123" }, expectedWithCode: 200 },
      { path: "/testing-pools/participants/participant-1/submit-screenshot", method: "POST", body: { screenshot: "data:image/png;base64,YQ==" }, expectedWithCode: 200 },
      { path: "/testing-pools/participants/participant-1/init-anonpay", method: "POST", body: {}, expectedWithCode: 400 },
      { path: "/testing-pools/participants/participant-1/confirm-anonpay-initiation", method: "POST", body: {}, expectedWithCode: 200 },
      { path: "/testing-pools/participants/participant-1/anonpay-status", expectedWithCode: 200 },
    ];
    await withServer(async base => {
      for (const endpoint of endpoints) {
        for (const code of [undefined, "wrong"]) {
          const response = await request(base, endpoint.path, {
            method: endpoint.method,
            headers: { ...(endpoint.body ? { "content-type": "application/json" } : {}), ...codeHeaders(code) },
            body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
          });
          expect(response.status, `${endpoint.path} without valid code`).toBe(403);
          expect(((await response.json()) as any).error).toBe("access_code_required");
        }
        const response = await request(base, endpoint.path, {
          method: endpoint.method,
          headers: { ...(endpoint.body ? { "content-type": "application/json" } : {}), ...codeHeaders(ACCESS_CODE) },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        });
        expect(response.status, `${endpoint.path} with valid code`).toBe(endpoint.expectedWithCode);
      }
    });
  });

  it("allows the authenticated pool leader to bypass the code", async () => {
    const cookie = jwt.sign({ telegramUsername: "pool-leader", jti: "leader-session" }, SECRET);
    await withServer(async base => {
      const detail = await request(base, "/testing-pools/private-pool", { headers: { cookie: `account_session=${cookie}` } });
      expect(detail.status).toBe(200);
      const participantStatus = await request(base, "/testing-pools/participants/participant-1/status", {
        headers: { cookie: `account_session=${cookie}` },
      });
      expect(participantStatus.status).toBe(200);
      const optIn = await request(base, "/testing-pools/private-pool/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `account_session=${cookie}` },
        body: JSON.stringify({ amountUsd: 10, contactTelegram: "@leader-test" }),
      });
      expect(optIn.status).toBe(201);
    });
  });

  it("does not grant the owner bypass to expired, revoked, or verification-restricted sessions", async () => {
    const expiredIat = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
    const expiredCookie = jwt.sign({
      telegramUsername: "pool-leader",
      jti: "expired-session",
      iat: expiredIat,
    }, SECRET, { expiresIn: 7 * 24 * 60 * 60 });
    const revokedCookie = jwt.sign({ telegramUsername: "pool-leader", jti: "revoked-session" }, SECRET);
    const restrictedCookie = jwt.sign({
      telegramUsername: "pool-leader",
      jti: "restricted-session",
      verificationRequired: true,
    }, SECRET);
    mockState.state.revokedJtis.add("revoked-session");

    await withServer(async base => {
      for (const cookie of [expiredCookie, revokedCookie, restrictedCookie]) {
        const denied = await request(base, "/testing-pools/private-pool", {
          headers: { cookie: `account_session=${cookie}` },
        });
        expect(denied.status).toBe(403);
        const guestAccess = await request(base, "/testing-pools/private-pool", {
          headers: { cookie: `account_session=${cookie}`, ...codeHeaders(ACCESS_CODE) },
        });
        expect(guestAccess.status).toBe(200);
      }
    });
  });

  it("keeps public pools accessible without a header and protects approval/draft restrictions", async () => {
    mockState.state.pool = privatePool({ inviteOnly: false, accessCodeHash: null, resultPostedAt: new Date() });
    await withServer(async base => {
      const detail = await request(base, "/testing-pools/private-pool");
      expect(detail.status).toBe(200);
      const optIn = await request(base, "/testing-pools/private-pool/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountUsd: 10, contactTelegram: "@public" }),
      });
      expect(optIn.status).toBe(201);
      const results = await request(base, "/testing-pools/private-pool/results-unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(results.status).toBe(200);
    });

    for (const pool of [
      privatePool({ approvalStatus: "pending", resultPostedAt: new Date() }),
      privatePool({ status: "draft", resultPostedAt: new Date() }),
    ]) {
      mockState.state.pool = pool;
      mockState.state.pools = [pool];
      await withServer(async base => {
        const detail = await request(base, "/testing-pools/private-pool", { headers: codeHeaders(ACCESS_CODE) });
        expect(detail.status).toBe(404);
        const optIn = await request(base, "/testing-pools/private-pool/opt-in", {
          method: "POST",
          headers: { "content-type": "application/json", ...codeHeaders(ACCESS_CODE) },
          body: JSON.stringify({ amountUsd: 10, contactTelegram: "@blocked" }),
        });
        expect(optIn.status).not.toBe(201);
        const results = await request(base, "/testing-pools/private-pool/results-unlock", {
          method: "POST",
          headers: { "content-type": "application/json", ...codeHeaders(ACCESS_CODE) },
          body: JSON.stringify({}),
        });
        expect(results.status).toBe(404);
      });
    }
  });
});

describe("admin testing-pool target recomputation", () => {
  it("includes configured costs on create and recomputes target after admin cost edits", async () => {
    mockState.state.pool = null;
    mockState.state.pools = [];
    mockState.state.tests = [];
    mockState.state.participants[0].paymentStatus = "pending";
    await withServer(async base => {
      const created = await request(base, "/admin/testing-pools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Target pool",
          vialCostUsd: "1.00",
          shippingCostUsd: "2.00",
          organiserTipUsd: "1.00",
          tests: [{ code: "CUSTOM", name: "Custom test", unitPriceUsd: "10.00" }],
        }),
      });
      expect(created.status).toBe(201);
      expect(mockState.state.pool.targetAmountUsd).toBe("14.00");
      const updated = await request(base, `/admin/testing-pools/${mockState.state.pool.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vialCostUsd: "2.00" }),
      });
      expect(updated.status).toBe(200);
      expect(mockState.state.pool.targetAmountUsd).toBe("15.00");
    });
  });
});

describe("strict test unit-price validation", () => {
  it("rejects invalid prices before leader/admin pool creation or replacement writes", async () => {
    const invalidPrices: unknown[] = [-1, "NaN", "1.234", "1e3", 100_000_000, null, ""];
    mockState.state.pool = null;
    mockState.state.pools = [];
    mockState.state.tests = [];
    mockState.state.participants[0].paymentStatus = "pending";

    await withServer(async base => {
      for (const price of invalidPrices) {
        const payload = {
          title: "Invalid price pool",
          walletAddress: "wallet",
          tests: [{ code: "T1", name: "Test one", unitPriceUsd: price }],
        };
        mockState.state.writes = [];
        const adminCreate = await request(base, "/admin/testing-pools", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(adminCreate.status, `admin create ${String(price)}`).toBe(400);
        expect(mockState.state.writes).toEqual([]);

        const leaderCreate = await request(base, "/account/pool-leader/pools", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(leaderCreate.status, `leader create ${String(price)}`).toBe(400);
        expect(mockState.state.writes).toEqual([]);
      }

      mockState.state.pool = privatePool();
      mockState.state.pools = [mockState.state.pool];
      mockState.state.tests = [{
        id: "test-existing", poolId: "pool-private", catalogId: "catalog-1",
        code: "T1", name: "Test one", unitPriceUsd: "1.00", quantity: 1, selected: true,
      }];
      for (const path of [
        "/admin/testing-pools/pool-private/tests",
        "/account/pool-leader/pools/pool-private/tests",
      ]) {
        mockState.state.writes = [];
        const response = await request(base, path, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tests: [{ id: "test-existing", catalogId: "catalog-1", code: "T1", name: "Test one", unitPriceUsd: "-0.01" }] }),
        });
        expect(response.status).toBe(400);
        expect(mockState.state.writes).toEqual([]);
        expect(mockState.state.tests[0].unitPriceUsd).toBe("1.00");
      }
    });
  });
});

describe("invite-code edit preservation", () => {
  it("preserves an existing hash for omitted/blank edits and requires code when re-enabling without a hash", async () => {
    const originalHash = mockState.state.pool.accessCodeHash;
    await withServer(async base => {
      const omitted = await request(base, "/admin/testing-pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteOnly: true }),
      });
      expect(omitted.status).toBe(200);
      expect(mockState.state.pool.accessCodeHash).toBe(originalHash);

      const blank = await request(base, "/account/pool-leader/pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteOnly: true, accessCode: "  " }),
      });
      expect(blank.status).toBe(200);
      expect(mockState.state.pool.accessCodeHash).toBe(originalHash);

      const disabled = await request(base, "/admin/testing-pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteOnly: false }),
      });
      expect(disabled.status).toBe(200);
      expect(mockState.state.pool.accessCodeHash).toBeNull();

      const missing = await request(base, "/admin/testing-pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteOnly: true }),
      });
      expect(missing.status).toBe(400);

      const enabled = await request(base, "/admin/testing-pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteOnly: true, accessCode: ACCESS_CODE }),
      });
      expect(enabled.status).toBe(200);
      expect(mockState.state.pool.accessCodeHash).not.toBeNull();
      expect(await bcrypt.compare(ACCESS_CODE, mockState.state.pool.accessCodeHash)).toBe(true);
    });
  });
});

describe("testing-pool fixed contribution fee edits", () => {
  it("strictly validates fixedOptInFeeUsd and locks changes after submitted/verified payments for leaders and admins", async () => {
    const invalidFees: unknown[] = ["-1", "0", "NaN", "1.234", "1e2", ""];
    await withServer(async base => {
      for (const fee of invalidFees) {
        const leaderResponse = await request(base, "/account/pool-leader/pools/pool-private", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fixedOptInFeeUsd: fee }),
        });
        expect(leaderResponse.status, `leader fee ${String(fee)}`).toBe(400);
        const adminResponse = await request(base, "/admin/testing-pools/pool-private", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fixedOptInFeeUsd: fee }),
        });
        expect(adminResponse.status, `admin fee ${String(fee)}`).toBe(400);
      }

      mockState.state.participants[0].paymentStatus = "pending";
      const leaderValid = await request(base, "/account/pool-leader/pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixedOptInFeeUsd: "1.25" }),
      });
      expect(leaderValid.status).toBe(200);
      expect(mockState.state.pool.fixedOptInFeeUsd).toBe("1.25");

      const adminValid = await request(base, "/admin/testing-pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixedOptInFeeUsd: "2.00" }),
      });
      expect(adminValid.status).toBe(200);
      expect(mockState.state.pool.fixedOptInFeeUsd).toBe("2.00");

      mockState.state.participants[0].paymentStatus = "submitted";
      for (const [path, body] of [
        ["/account/pool-leader/pools/pool-private", { fixedOptInFeeUsd: "3.00" }],
        ["/admin/testing-pools/pool-private", { fixedOptInFeeUsd: "3.00" }],
      ] as const) {
        const response = await request(base, path, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        expect(response.status).toBe(409);
      }
      expect(mockState.state.pool.fixedOptInFeeUsd).toBe("2.00");
    });
  });
});

describe("testing-pool test replacement persistence", () => {
  it("keeps IDs/results for unchanged tests, updates changed tests in place, and only removes omitted tests", async () => {
    mockState.state.tests = [
      { id: "test-keep", poolId: "pool-private", catalogId: "cat-1", code: "A", name: "Alpha", unitPriceUsd: "10.00", quantity: 1, selected: true, janoshikUrl: null },
      { id: "test-change", poolId: "pool-private", catalogId: "cat-2", code: "B", name: "Beta", unitPriceUsd: "20.00", quantity: 1, selected: true, janoshikUrl: null },
      { id: "test-remove", poolId: "pool-private", catalogId: null, code: "C", name: "Gamma", unitPriceUsd: "30.00", quantity: 1, selected: true, janoshikUrl: null },
    ];
    mockState.state.results = [
      { id: 1, poolId: "pool-private", poolTestId: "test-keep" },
      { id: 2, poolId: "pool-private", poolTestId: "test-change" },
      { id: 3, poolId: "pool-private", poolTestId: "test-remove" },
    ];
    mockState.state.participants[0].paymentStatus = "pending";

    await withServer(async base => {
      const detail = await request(base, "/testing-pools/private-pool", { headers: codeHeaders(ACCESS_CODE) });
      expect(detail.status).toBe(200);
      expect((await detail.json() as any).tests[0]).toMatchObject({ id: "test-keep", catalogId: "cat-1" });

      const foreignId = await request(base, "/admin/testing-pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tests: [
            { id: "not-in-this-pool", catalogId: "cat-1", code: "A", name: "Alpha", unitPriceUsd: "10.00" },
          ],
        }),
      });
      expect(foreignId.status).toBe(400);
      expect(mockState.state.tests.map(test => test.id)).toEqual(["test-keep", "test-change", "test-remove"]);
      expect(mockState.state.results.map(result => result.poolTestId)).toEqual(["test-keep", "test-change", "test-remove"]);

      mockState.state.writes = [];
      const invalidSettings = await request(base, "/admin/testing-pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolUpdates: { title: "Must not partially save", vialCostUsd: "invalid" },
          tests: [{ id: "test-change", catalogId: "cat-2", code: "B", name: "Changed", unitPriceUsd: "25.00" }],
        }),
      });
      expect(invalidSettings.status).toBe(400);
      expect(mockState.state.writes).toEqual([]);
      expect(mockState.state.tests.map(test => test.id)).toEqual(["test-keep", "test-change", "test-remove"]);

      const response = await request(base, "/admin/testing-pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolUpdates: { title: "Atomic settings update", vialCostUsd: "2.00" },
          tests: [
            { id: "test-keep", catalogId: "cat-1", code: "A", name: "Alpha", unitPriceUsd: "10.00", quantity: 1, selected: true },
            { id: "test-change", catalogId: "cat-2", code: "B", name: "Beta revised", unitPriceUsd: "25.00", quantity: 1, selected: true },
          ],
        }),
      });
      expect(response.status).toBe(200);
      expect(mockState.state.tests.map(test => test.id)).toEqual(["test-keep", "test-change"]);
      expect(mockState.state.tests[0].name).toBe("Alpha");
      expect(mockState.state.tests[1]).toMatchObject({ id: "test-change", name: "Beta revised", unitPriceUsd: "25.00" });
      expect(mockState.state.results.map(result => result.poolTestId)).toEqual(["test-keep", "test-change"]);
      expect(mockState.state.pool).toMatchObject({ title: "Atomic settings update", vialCostUsd: "2.00" });
      expect(mockState.state.pool.targetAmountUsd).toBe("37.00");

      mockState.state.participants[0].paymentStatus = "verified";
      const locked = await request(base, "/admin/testing-pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tests: [] }),
      });
      expect(locked.status).toBe(409);
      expect(mockState.state.tests.map(test => test.id)).toEqual(["test-keep", "test-change"]);
    });
  });
});

describe("leader atomic pool settings and test updates", () => {
  it("retains the leader PATCH results notification behavior", async () => {
    mockState.state.participants[0] = {
      ...mockState.state.participants[0],
      paymentStatus: "verified",
      accountUsername: "verified-contributor",
    };
    await withServer(async base => {
      const response = await request(base, "/account/pool-leader/pools/pool-private", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "results_received" }),
      });
      expect(response.status).toBe(200);
      expect(notifyUser).toHaveBeenCalledWith(
        "verified-contributor",
        "status",
        expect.stringContaining("Results are in!"),
      );
    });
  });

  it("commits settings and tests together, preserves test-only calls, and sends no side effects on validation failure", async () => {
    mockState.state.tests = [
      { id: "leader-test", poolId: "pool-private", catalogId: "leader-catalog", code: "L1", name: "Leader test", unitPriceUsd: "10.00", quantity: 1, selected: true, janoshikUrl: null },
    ];
    mockState.state.participants[0].paymentStatus = "pending";

    await withServer(async base => {
      const failed = await request(base, "/account/pool-leader/pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolUpdates: { title: "Must not save", status: "results_received", vialCostUsd: "-1" },
          tests: [{ id: "leader-test", catalogId: "leader-catalog", code: "L1", name: "Changed", unitPriceUsd: "20.00" }],
        }),
      });
      expect(failed.status).toBe(400);
      expect(mockState.state.pool.title).toBe("Private pool");
      expect(mockState.state.pool.status).toBe("open");
      expect(mockState.state.tests[0]).toMatchObject({ id: "leader-test", name: "Leader test", unitPriceUsd: "10.00" });
      expect(notifyUser).not.toHaveBeenCalled();

      const success = await request(base, "/account/pool-leader/pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolUpdates: { title: "Leader atomic edit", status: "results_received", vialCostUsd: "2.00" },
          tests: [{ id: "leader-test", catalogId: "leader-catalog", code: "L1", name: "Leader test", unitPriceUsd: "10.00" }],
        }),
      });
      expect(success.status).toBe(200);
      expect(mockState.state.pool).toMatchObject({ title: "Leader atomic edit", status: "results_received", vialCostUsd: "2.00" });
      expect(mockState.state.pool.resultPostedAt).toBeInstanceOf(Date);
      expect(mockState.state.tests.map(test => test.id)).toEqual(["leader-test"]);
      expect(notifyUser).not.toHaveBeenCalled();

      const testsOnly = await request(base, "/account/pool-leader/pools/pool-private/tests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tests: [{ id: "leader-test", catalogId: "leader-catalog", code: "L1", name: "Test-only update", unitPriceUsd: "11.00" }],
        }),
      });
      expect(testsOnly.status).toBe(200);
      expect(mockState.state.pool.title).toBe("Leader atomic edit");
      expect(mockState.state.tests[0]).toMatchObject({ id: "leader-test", name: "Test-only update", unitPriceUsd: "11.00" });
    });
  });
});
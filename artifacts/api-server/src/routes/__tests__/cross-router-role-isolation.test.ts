// Cross-router role-isolation tests for the scoped dispatch routers.
//
// Unlike `dispatch-scoped.test.ts` (which mocks the auth middleware and mounts
// only the router under test), this suite exercises the REAL `requireReshipper`
// and `requireOrganiser` middleware and mounts BOTH scoped routers at root in
// the same order as production (`routes/index.ts`). Only the account-auth layer
// and the database are mocked.
//
// Each scoped router applies its auth via a path-less `router.use(cfg.auth)`, so
// in production a request for an organiser path first passes through the
// reshipper router's auth (and vice versa). These tests lock in that the wrong
// role can never reach the other router:
//   - a reshipper-authenticated request to an organiser path is rejected, and
//   - an organiser-authenticated request to a reshipper path is rejected,
// with NO writes performed in either case.
import { describe, it, expect, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// ─── shared mock state (hoisted so vi.mock factories can reference it) ─────────
const mockState = vi.hoisted(() => {
  interface SelectCtx { table: string }

  const tableName = (t: unknown): string => {
    try { return getTableName(t as never); } catch { return "unknown"; }
  };

  const state = {
    // Per-test SELECT router: maps a real table name → rows to return.
    selectImpl: ((_ctx: SelectCtx): unknown[] => []) as (ctx: SelectCtx) => unknown[],
    updateSpy: vi.fn(),
    insertSpy: vi.fn(),
    deleteSpy: vi.fn(),
  };

  const makeSelect = (): Record<string, unknown> => {
    const ctx: SelectCtx = { table: "unknown" };
    const builder: Record<string, unknown> = {
      from(t: unknown) { ctx.table = tableName(t); return builder; },
      where() { return builder; },
      innerJoin() { return builder; },
      leftJoin() { return builder; },
      orderBy() { return builder; },
      groupBy() { return builder; },
      offset() { return builder; },
      limit() { return builder; },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve().then(() => state.selectImpl(ctx)).then(resolve, reject);
      },
      catch(reject: (e: unknown) => unknown) {
        return Promise.resolve().then(() => state.selectImpl(ctx)).catch(reject);
      },
    };
    return builder;
  };

  const fakeDb = {
    select: () => makeSelect(),
    update: (t: unknown) => ({
      set: (values: unknown) => {
        state.updateSpy({ table: tableName(t), values });
        return {
          where: () => Promise.resolve([]),
          then: (r: (v: unknown) => unknown) => Promise.resolve([]).then(r),
        };
      },
    }),
    insert: (t: unknown) => ({
      values: (values: unknown) => {
        state.insertSpy({ table: tableName(t), values });
        return { onConflictDoNothing: () => Promise.resolve([]) };
      },
    }),
    delete: (t: unknown) => ({
      where: () => { state.deleteSpy({ table: tableName(t) }); return Promise.resolve([]); },
    }),
  };

  return { state, fakeDb };
});

// Mock the db module: keep the REAL schema tables (the "./schema" entry builds
// no pg Pool) but swap `db` for the in-memory fake so no database is touched.
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mockState.fakeDb, pool: {} };
});

// Mock ONLY the account-auth layer (per the task: "DB/account-auth mocked").
// `requireReshipper` / `requireOrganiser` remain the REAL middleware — they call
// this `requireAccount` to establish identity, then consult the (mocked) db for
// the caller's reshipper/organiser status. Identity comes from a test header.
vi.mock("../../middleware/account-auth", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../middleware/account-auth");
  return {
    ...actual,
    requireAccount: (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const u = req.headers["x-test-account"];
      if (!u) { res.status(401).json({ error: "Authentication required" }); return; }
      req.account = { telegramUsername: String(u), jti: "test-jti" };
      next();
    },
  };
});

// Imported after mocks are registered (vi.mock is hoisted, so this is safe).
import { reshipperDispatchRouter, organiserDispatchRouter } from "../dispatch-scoped";

// ─── helpers ──────────────────────────────────────────────────────────────────
// Mount BOTH routers at root in the SAME order as routes/index.ts (reshipper
// first, then organiser), so the path-less auth cross-router behavior is exactly
// what production sees.
function buildApp(): Express {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(reshipperDispatchRouter);
  app.use(organiserDispatchRouter);
  return app;
}

async function withServer<T>(app: Express, fn: (base: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const GB_ID = "gb-1";

// Set the single account row returned for `accounts` lookups this test. Both
// real middlewares query the `accounts` table; each reads only the column it
// needs (reshipperStatus / organiserStatus), so returning both is sufficient.
function setAccount(row: { reshipperStatus: string | null; organiserStatus: string | null }) {
  mockState.state.selectImpl = (ctx) => (ctx.table === "accounts" ? [row] : []);
}

beforeEach(() => {
  mockState.state.selectImpl = () => [];
  mockState.state.updateSpy.mockReset();
  mockState.state.insertSpy.mockReset();
  mockState.state.deleteSpy.mockReset();
});

describe("cross-router role isolation (real auth middleware)", () => {
  it("rejects a reshipper-authenticated request to an organiser path (403, no writes)", async () => {
    // Caller is an approved reshipper but NOT an organiser. Its reshipper auth
    // passes in the reshipper router (path-less), the request falls through to
    // the organiser router, where requireOrganiser rejects it as not-an-organiser.
    setAccount({ reshipperStatus: "approved", organiserStatus: null });

    const app = buildApp();
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-account": "reshipperA" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );

    expect(res.status).toBe(403);
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
    expect(mockState.state.insertSpy).not.toHaveBeenCalled();
    expect(mockState.state.deleteSpy).not.toHaveBeenCalled();
  });

  it("rejects an organiser-authenticated request to a reshipper path (403, no writes)", async () => {
    // Caller is an approved organiser but NOT a reshipper. The reshipper router's
    // path-less auth runs first and rejects it before it can reach any handler.
    setAccount({ reshipperStatus: null, organiserStatus: "approved" });

    const app = buildApp();
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-account": "organiserB" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );

    expect(res.status).toBe(403);
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
    expect(mockState.state.insertSpy).not.toHaveBeenCalled();
    expect(mockState.state.deleteSpy).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request to either scoped path (401)", async () => {
    setAccount({ reshipperStatus: null, organiserStatus: null });
    const app = buildApp();

    const resh = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );
    expect(resh.status).toBe(401);

    const org = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );
    expect(org.status).toBe(401);

    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });
});

// Security guard tests for the scoped reshipper/organiser dispatch routers.
//
// These prove the server-side scope locks in `dispatch-scoped.ts` (body
// filtering) and `admin-dispatch.ts` (GB-scoped param checks + writes) hold:
//   - a reshipper cannot mutate another reshipper's parcels / orders, and
//   - an organiser cannot touch a group buy they don't own, and
//   - the scope filter fails closed (500) when its ownership check errors.
//
// The `@workspace/db` module is fully mocked so no real database is touched;
// the fake db routes SELECTs by table name and records all writes via spies,
// letting us assert that forged ids are stripped *before* any write happens.
import { describe, it, expect, beforeEach, vi } from "vitest";
import express, { type Express, type RequestHandler } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// ─── shared mock state (hoisted so vi.mock factories can reference it) ─────────
const mockState = vi.hoisted(() => {
  interface SelectCtx { table: string; columns: unknown; limit?: number }

  const tableName = (t: unknown): string => {
    try { return getTableName(t as never); } catch { return "unknown"; }
  };

  const state = {
    // Per-test SELECT router: maps table name → rows to return. A function may
    // be supplied instead to throw (for the fail-closed test).
    selectImpl: ((_ctx: SelectCtx): unknown[] => []) as (ctx: SelectCtx) => unknown[],
    updateSpy: vi.fn(),
    insertSpy: vi.fn(),
    deleteSpy: vi.fn(),
  };

  const makeSelect = (columns: unknown): Record<string, unknown> => {
    const ctx: SelectCtx = { table: "unknown", columns };
    const builder: Record<string, unknown> = {
      from(t: unknown) { ctx.table = tableName(t); return builder; },
      where() { return builder; },
      innerJoin() { return builder; },
      leftJoin() { return builder; },
      orderBy() { return builder; },
      groupBy() { return builder; },
      offset() { return builder; },
      limit(n: number) { ctx.limit = n; return builder; },
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
    select: (columns?: unknown) => makeSelect(columns),
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
        return Promise.resolve([]);
      },
    }),
    delete: (t: unknown) => ({
      where: () => { state.deleteSpy({ table: tableName(t) }); return Promise.resolve([]); },
    }),
  };

  return { state, fakeDb };
});

// Mock the db module: re-export all REAL schema tables (the "./schema" entry
// builds no pg Pool, so no database connection is created) but swap `db` for
// the in-memory fake. Real tables keep their genuine identity + columns, so the
// route code's drizzle expressions build correctly and the fake routes SELECTs
// by real table name.
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mockState.fakeDb, pool: {} };
});

// Mock auth middleware so identity comes from test headers (the auth layer
// itself is out of scope here — we test the dispatch scope locks).
vi.mock("../../middleware/require-reshipper", () => ({
  requireReshipper: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const u = req.headers["x-test-reshipper"];
    if (!u) { res.status(401).json({ error: "no reshipper" }); return; }
    req.reshipper = { telegramUsername: String(u), reshipperStatus: "approved" };
    next();
  },
}));
vi.mock("../../middleware/require-organiser", () => ({
  requireOrganiser: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const u = req.headers["x-test-organiser"];
    if (!u) { res.status(401).json({ error: "no organiser" }); return; }
    req.organiser = { telegramUsername: String(u), organiserStatus: "approved" };
    next();
  },
}));

// Imported after mocks are registered (vi.mock is hoisted, so this is safe).
import { reshipperDispatchRouter, organiserDispatchRouter } from "../dispatch-scoped";

// ─── helpers ──────────────────────────────────────────────────────────────────
// Each scoped router applies its auth via a path-less `router.use(cfg.auth)`,
// so mounting both routers in one app makes the reshipper auth run for organiser
// requests (and vice versa). In production the real auth middleware passes such
// requests through (admin-impersonation `next()`); here we isolate each guard by
// mounting only the router under test.
function buildApp(router: RequestHandler): Express {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(router);
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

const GB_ID = "gb-owned";

beforeEach(() => {
  mockState.state.selectImpl = () => [];
  mockState.state.updateSpy.mockReset();
  mockState.state.insertSpy.mockReset();
  mockState.state.deleteSpy.mockReset();
});

describe("reshipper dispatch scope lock", () => {
  it("strips another reshipper's parcelIds from /confirm so they cannot be mutated", async () => {
    // reshipperA is on the GB; the foreign parcel belongs to reshipperB.
    mockState.state.selectImpl = (ctx) => {
      switch (ctx.table) {
        case "gb_reshippers": return [{ id: GB_ID }]; // A is linked to the GB
        case "orders": return [{ id: "own-order", reshipperUsername: "reshipperA", dispatchedByReshipper: null }];
        case "gb_parcels": return [{ id: "foreign-parcel", reshipperUsername: "reshipperB" }];
        default: return [];
      }
    };

    const app = buildApp(reshipperDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-reshipper": "reshipperA" },
        body: JSON.stringify({ orderIds: ["own-order"], parcelIds: ["foreign-parcel"] }),
      }),
    );

    // parcelIds filtered to [] → handler rejects with 400 and NEVER mutates parcels.
    expect(res.status).toBe(400);
    const parcelWrites = mockState.state.updateSpy.mock.calls.filter(
      (c) => (c[0] as { table: string }).table === "gbParcelsTable",
    );
    expect(parcelWrites).toHaveLength(0);
    // No order status writes either, since the confirm bailed out.
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });

  it("rejects (403) a foreign orderId on /save-dispatch-image and writes nothing", async () => {
    mockState.state.selectImpl = (ctx) => {
      if (ctx.table === "gb_reshippers") return [{ id: GB_ID }];
      // loadOrderScope: the order is in this GB but owned by reshipperB.
      if (ctx.table === "orders") {
        return [{ groupBuyId: GB_ID, reshipperUsername: "reshipperB", dispatchedByReshipper: null }];
      }
      return [];
    };

    const app = buildApp(reshipperDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/save-dispatch-image`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-reshipper": "reshipperA" },
        body: JSON.stringify({ orderId: "foreign-order", imageData: "data:image/jpg;base64,AAA", filename: "x.jpg" }),
      }),
    );

    expect(res.status).toBe(403);
    expect(mockState.state.insertSpy).not.toHaveBeenCalled();
  });

  it("fails closed (500) when the scope filter's ownership check errors", async () => {
    mockState.state.selectImpl = (ctx) => {
      if (ctx.table === "orders") throw new Error("db down");
      return [];
    };

    const app = buildApp(reshipperDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-reshipper": "reshipperA" },
        body: JSON.stringify({ orderIds: ["any-order"], parcelIds: ["any-parcel"] }),
      }),
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Scope filter failed");
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });
});

describe("organiser dispatch scope lock", () => {
  // organiserOwnsGb queries groupBuysTable and finds nothing → 403 at the
  // :gbId param check, before any handler logic runs.
  const notOwned = () => {
    mockState.state.selectImpl = (ctx) => {
      if (ctx.table === "groupBuysTable") return []; // organiser does not own this GB
      return [];
    };
  };

  it("cannot /confirm orders in a group buy it does not own", async () => {
    notOwned();
    const app = buildApp(organiserDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-organiser": "organiserB" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });

  it("cannot /undispatch orders in a group buy it does not own", async () => {
    notOwned();
    const app = buildApp(organiserDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/undispatch`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-organiser": "organiserB" },
        body: JSON.stringify({ orderIds: ["o1"] }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });

  it("cannot /notify-qr a group buy it does not own", async () => {
    notOwned();
    const app = buildApp(organiserDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/notify-qr`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-organiser": "organiserB" },
        body: JSON.stringify({ orderIds: ["o1"] }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mockState.state.updateSpy).not.toHaveBeenCalled();
  });
});

// ─── happy paths ───────────────────────────────────────────────────────────────
// The negative tests above prove forged/foreign ids are blocked. These prove the
// scope locks do NOT over-block: a reshipper acting on their OWN parcels/orders,
// and an organiser acting on a GB they OWN, both succeed and the writes happen.
describe("reshipper dispatch — legitimate actions succeed", () => {
  it("confirms dispatch for the reshipper's own orders + parcels (writes happen)", async () => {
    // reshipperA is on the GB and owns both the order and the parcel.
    mockState.state.selectImpl = (ctx) => {
      switch (ctx.table) {
        case "gb_reshippers": return [{ id: GB_ID }];
        case "orders": return [{ id: "own-order", reshipperUsername: "reshipperA", dispatchedByReshipper: null }];
        case "gb_parcels": return [{ id: "own-parcel", reshipperUsername: "reshipperA", items: [{ name: "BPC-157", qty: 5 }] }];
        case "order_line_items": return [{ orderId: "own-order", productName: "BPC-157", quantity: 1 }];
        default: return [];
      }
    };

    const app = buildApp(reshipperDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-reshipper": "reshipperA" },
        body: JSON.stringify({ orderIds: ["own-order"], parcelIds: ["own-parcel"] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmed: 1 });
    // Parcel stock was deducted and the order was stamped Shipped.
    const orderShipped = mockState.state.updateSpy.mock.calls.some(
      (c) => (c[0] as { table: string; values: { status?: string } }).table === "orders" &&
             (c[0] as { values: { status?: string } }).values.status === "Shipped",
    );
    expect(orderShipped).toBe(true);
    const parcelWrite = mockState.state.updateSpy.mock.calls.some(
      (c) => (c[0] as { table: string }).table === "gb_parcels",
    );
    expect(parcelWrite).toBe(true);
  });

  it("saves a dispatch image for the reshipper's own order (insert happens)", async () => {
    mockState.state.selectImpl = (ctx) => {
      switch (ctx.table) {
        case "gb_reshippers": return [{ id: GB_ID }];
        // Serves both loadOrderScope (body filter) and the handler's targetOrder check.
        case "orders": return [{ id: "own-order", groupBuyId: GB_ID, reshipperUsername: "reshipperA", dispatchedByReshipper: null }];
        default: return [];
      }
    };

    const app = buildApp(reshipperDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/reshipper/dispatch/${GB_ID}/save-dispatch-image`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-reshipper": "reshipperA" },
        body: JSON.stringify({ orderId: "own-order", imageData: "data:image/jpg;base64,AAA", filename: "x.jpg" }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; imageId?: string };
    expect(body.ok).toBe(true);
    expect(typeof body.imageId).toBe("string");
    const imgInsert = mockState.state.insertSpy.mock.calls.some(
      (c) => (c[0] as { table: string }).table === "order_dispatch_images",
    );
    expect(imgInsert).toBe(true);
  });
});

describe("organiser dispatch — legitimate actions succeed", () => {
  // organiserOwnsGb finds the GB → the :gbId param check passes.
  const owned = (extra: (table: string) => unknown[]) => {
    mockState.state.selectImpl = (ctx) => {
      if (ctx.table === "group_buys") return [{ id: GB_ID }];
      return extra(ctx.table);
    };
  };

  it("confirms dispatch in a group buy it owns (order stamped Shipped)", async () => {
    owned((table) => {
      switch (table) {
        case "orders": return [{ id: "o1" }];
        case "order_line_items": return [{ orderId: "o1", productName: "X", quantity: 1 }];
        case "gb_parcels": return [{ id: "p1", reshipperUsername: null, items: [{ name: "X", qty: 5 }] }];
        default: return [];
      }
    });

    const app = buildApp(organiserDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-organiser": "organiserA" },
        body: JSON.stringify({ orderIds: ["o1"], parcelIds: ["p1"] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmed: 1 });
    const orderShipped = mockState.state.updateSpy.mock.calls.some(
      (c) => (c[0] as { table: string; values: { status?: string } }).table === "orders" &&
             (c[0] as { values: { status?: string } }).values.status === "Shipped",
    );
    expect(orderShipped).toBe(true);
  });

  it("un-dispatches orders in a group buy it owns (order reset to Processing)", async () => {
    owned((table) => {
      switch (table) {
        case "orders": return [{ id: "o1" }];
        case "order_line_items": return [{ orderId: "o1", productName: "X", quantity: 1 }];
        case "gb_parcels": return [{ id: "p1", reshipperUsername: null, items: [{ name: "X", qty: 1, dispatchedQty: 1 }] }];
        default: return [];
      }
    });

    const app = buildApp(organiserDispatchRouter);
    const res = await withServer(app, (base) =>
      fetch(`${base}/organiser/dispatch/${GB_ID}/undispatch`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-organiser": "organiserA" },
        body: JSON.stringify({ orderIds: ["o1"] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, undispatched: 1 });
    const orderReset = mockState.state.updateSpy.mock.calls.some(
      (c) => (c[0] as { table: string; values: { status?: string } }).table === "orders" &&
             (c[0] as { values: { status?: string } }).values.status === "Processing",
    );
    expect(orderReset).toBe(true);
  });
});

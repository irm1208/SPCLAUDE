import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { PgDialect } from "drizzle-orm/pg-core";
import type { AddressInfo } from "node:net";

const state = vi.hoisted(() => ({
  authorized: true,
  rows: [] as { id: string; stock: number | null }[],
  updates: 0,
  failUpdate: false,
  commits: 0,
  rollbacks: 0,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return {
    ...schema, pool: {},
    db: {
      transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
        const snapshot = state.rows.map(row => ({ ...row }));
        const tx = {
          select: () => ({
            from: () => ({
              where: (condition: never) => ({
                orderBy: () => ({
                  for: async () => {
                    const ids = new PgDialect().sqlToQuery(condition).params;
                    return state.rows.filter(row => ids.includes(row.id));
                  },
                }),
              }),
            }),
          }),
          update: () => ({
            set: (values: { stock: never }) => ({
              where: () => ({
                returning: async () => {
                  state.updates++;
                  if (state.failUpdate) throw new Error("database unavailable");
                  const params = new PgDialect().sqlToQuery(values.stock).params;
                  const result = [];
                  for (let i = 0; i < params.length; i += 2) {
                    const row = state.rows.find(row => row.id === params[i])!;
                    row.stock = params[i + 1] as number;
                    result.push({ ...row });
                  }
                  return result;
                },
              }),
            }),
          }),
        };
        try {
          const result = await callback(tx);
          state.commits++;
          return result;
        } catch (error) {
          state.rows = snapshot;
          state.rollbacks++;
          throw error;
        }
      },
    },
  };
});

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, res: express.Response) => {
    if (state.authorized) return true;
    res.status(403).json({ error: "Admin access required" });
    return false;
  },
  setAdminMutationSummary: vi.fn(),
  getAdminUsername: () => "test-admin",
}));
vi.mock("../../lib/telegram", () => ({
  notifyUser: vi.fn(), sendAdminMessage: vi.fn(), sendTelegramMessage: vi.fn(),
  notifyUserFromTemplate: vi.fn(), sendAdminFromTemplate: vi.fn(),
}));
vi.mock("../../lib/email", () => ({ sendTemplatedEmail: vi.fn() }));
vi.mock("../../lib/sage-ai", () => ({ callSageAI: vi.fn().mockResolvedValue("[]") }));

import adminRouter from "../admin";

async function request(body: unknown) {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  const server = app.listen(0);
  try {
    await new Promise<void>(resolve => server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/products/stock`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

beforeEach(() => {
  state.authorized = true;
  state.rows = [{ id: "a", stock: 12 }, { id: "b", stock: 3 }, { id: "untracked", stock: null }];
  state.updates = state.commits = state.rollbacks = 0;
  state.failUpdate = false;
});

describe("bulk admin stock", () => {
  it("requires admin authorization", async () => {
    state.authorized = false;
    expect((await request({ ids: ["a"], operation: "increase", quantity: 5 })).status).toBe(403);
    expect(state.updates).toBe(0);
  });

  it.each([
    ["increase", 5, [17, 8]], ["decrease", 5, [7, 0]], ["set", 8, [8, 8]], ["set", 0, [0, 0]],
  ])("%s stock for the entire selected batch", async (operation, quantity, expected) => {
    const response = await request({ ids: ["a", "b"], operation, quantity });
    expect(response.status).toBe(200);
    expect(response.body.products.map((row: { stock: number }) => row.stock)).toEqual(expected);
    expect(response.body.skippedIds).toEqual([]);
    expect(state.rows[2].stock).toBeNull();
    expect(state.updates).toBe(1);
    expect(state.commits).toBe(1);
  });

  it("deduplicates selected IDs so stock is increased only once", async () => {
    expect((await request({ ids: ["a", "a"], operation: "increase", quantity: 2 })).status).toBe(200);
    expect(state.rows[0].stock).toBe(14);
  });

  it("explicitly skips untracked stock for relative changes", async () => {
    const result = await request({ ids: ["a", "untracked"], operation: "increase", quantity: 2 });
    expect(result.status).toBe(200);
    expect(result.body.skippedIds).toEqual(["untracked"]);
    expect(result.body.products).toEqual([{ id: "a", stock: 14 }]);
    expect(state.rows[2].stock).toBeNull();
  });

  it("starts tracking stock when an exact quantity is set", async () => {
    const result = await request({ ids: ["untracked"], operation: "set", quantity: 20 });
    expect(result.body.products).toEqual([{ id: "untracked", stock: 20 }]);
  });

  it.each([
    { ids: [], operation: "set", quantity: 2 },
    { ids: ["a", 4], operation: "set", quantity: 2 },
    { ids: [" "], operation: "set", quantity: 2 },
    { ids: ["a"], operation: "multiply", quantity: 2 },
    { ids: ["a"], operation: "set", quantity: -1 },
    { ids: ["a"], operation: "set", quantity: 2.5 },
    { ids: ["a"], operation: "increase", quantity: 0 },
    { ids: ["a"], operation: "decrease", quantity: 0 },
    { ids: ["a"], operation: "set", quantity: "3" },
    { ids: ["a"], operation: "set", quantity: 2147483648 },
  ])("rejects invalid requests without writing: %j", async body => {
    expect((await request(body)).status).toBe(400);
    expect(state.updates).toBe(0);
  });

  it("rejects stale selections without applying a partial update", async () => {
    expect((await request({ ids: ["a", "missing"], operation: "set", quantity: 2 })).status).toBe(409);
    expect(state.rows[0].stock).toBe(12);
    expect(state.updates).toBe(0);
    expect(state.rollbacks).toBe(1);
  });

  it("rejects overflow for the whole batch", async () => {
    state.rows[1].stock = 2147483647;
    expect((await request({ ids: ["a", "b"], operation: "increase", quantity: 1 })).status).toBe(409);
    expect(state.rows[0].stock).toBe(12);
    expect(state.updates).toBe(0);
  });

  it("reports a database failure without reporting success", async () => {
    state.failUpdate = true;
    expect((await request({ ids: ["a"], operation: "set", quantity: 1 })).status).toBe(500);
    expect(state.rows[0].stock).toBe(12);
    expect(state.rollbacks).toBe(1);
  });
});

import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: "alice",
  assignments: [
    { id: "a", gbId: "old-gb", reshipperUsername: "alice" },
    { id: "b", gbId: "old-gb", reshipperUsername: "bob" },
    { id: "c", gbId: "new-gb", reshipperUsername: "alice" },
  ],
  config: [] as Array<{ key: string; value: string }>,
  fail: false,
}));
vi.mock("drizzle-orm", () => ({
  eq: (column: string, value: unknown) => (row: any) => row[column] === value,
  and: (...predicates: any[]) => (row: any) => predicates.every(p => p(row)),
  inArray: (column: string, values: unknown[]) => (row: any) => values.includes(row[column]),
}));
vi.mock("@workspace/db", () => {
  const assignments = { table: "assignments", id: "id", gbId: "gbId", reshipperUsername: "reshipperUsername" };
  const config = { table: "config", key: "key", value: "value" };
  const database = {
    select: () => ({ from: (table: any) => ({
      where: async (predicate: any) => (table.table === "assignments" ? state.assignments : state.config).filter(predicate),
    }) }),
    insert: () => ({ values: (rows: any[]) => ({
      onConflictDoUpdate: async () => {
        if (state.fail) throw new Error("Storage unavailable");
        for (const row of rows) {
          const existing = state.config.find(c => c.key === row.key);
          if (existing) Object.assign(existing, row);
          else state.config.push(row);
        }
      },
    }) }),
  };
  return { db: database, gbReshippersTable: assignments, siteConfigTable: config };
});
vi.mock("../../middleware/require-reshipper", () => ({
  requireReshipper: (req: any, res: any, next: any) => {
    if (!state.user) return res.status(401).json({ error: "Authentication required" });
    req.reshipper = { telegramUsername: state.user };
    next();
  },
}));

import router from "../reshipper-visibility";

async function request(path: string, body?: unknown) {
  const app = express();
  app.use(express.json(), router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/reshipper/${path}`, body === undefined ? {} : {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  } finally { server.close(); }
}

beforeEach(() => { state.config = []; state.user = "alice"; state.fail = false; });
describe("reshipper group-buy visibility", () => {
  it("persists hide and restore across independent requests", async () => {
    expect((await request("gb/old-gb/visibility", { hidden: true })).status).toBe(200);
    expect((await request("hidden-group-buys")).data).toEqual({ hiddenGroupBuyIds: ["old-gb"] });
    expect((await request("gb/old-gb/visibility", { hidden: false })).status).toBe(200);
    expect((await request("hidden-group-buys")).data).toEqual({ hiddenGroupBuyIds: [] });
  });
  it("keeps choices private to the assigned reshipper", async () => {
    await request("gb/old-gb/visibility", { hidden: true });
    state.user = "bob";
    expect((await request("hidden-group-buys")).data).toEqual({ hiddenGroupBuyIds: [] });
    expect((await request("gb/new-gb/visibility", { hidden: true })).status).toBe(403);
  });
  it("requires authentication", async () => {
    state.user = "";
    expect((await request("hidden-group-buys")).status).toBe(401);
  });
  it("rejects invalid choices and cannot write for an unassigned group", async () => {
    expect((await request("gb/old-gb/visibility", { hidden: "true" })).status).toBe(400);
    expect((await request("gb/unknown/visibility", { hidden: true })).status).toBe(403);
    expect(state.config).toEqual([]);
  });
  it("returns an explicit error rather than claiming an unsaved change succeeded", async () => {
    state.fail = true;
    expect((await request("gb/old-gb/visibility", { hidden: true })).status).toBe(500);
    expect(state.config).toEqual([]);
  });
});

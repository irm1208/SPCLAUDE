import { describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const state = vi.hoisted(() => ({
  authenticated: true,
  username: "@Owner",
  orders: [] as unknown[],
  account: [] as unknown[],
  predicates: [] as string[],
}));
const dialect = new PgDialect();

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const db = {
    select: () => {
      let table = "";
      const query = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        where(predicate: SQL) {
          state.predicates.push(dialect.sqlToQuery(predicate).sql);
          return query;
        },
        orderBy() { return query; },
        then(resolve: (rows: unknown[]) => unknown) {
          return Promise.resolve(table === "accounts" ? state.account : state.orders).then(resolve);
        },
      };
      return query;
    },
  };
  return { ...schema, db };
});

vi.mock("../../middleware/account-auth", () => ({
  requireAccount(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!state.authenticated) { res.status(401).json({ error: "Authentication required" }); return; }
    req.account = { telegramUsername: state.username, jti: "test" };
    next();
  },
}));

import router from "../wholesale-tracking";

async function request(): Promise<{ status: number; body: any }> {
  const app = express();
  app.use(router);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/account/wholesale-tracking`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("GET /account/wholesale-tracking", () => {
  it("requires an account session", async () => {
    state.authenticated = false;
    expect((await request()).status).toBe(401);
  });

  it("scopes direct wholesale tracking to the authenticated owner and defaults alerts off", async () => {
    state.authenticated = true;
    state.orders = [{
      id: "direct", code: "W-1", trackingNumber: "ONE", trackingNumbers: ["ONE", "ONE", "TWO"],
      trackingStatus: "in_transit", trackingEvents: [], trackingLastChecked: null,
    }];
    state.account = [{ telegramNotifications: { status: true } }];
    state.predicates = [];

    const result = await request();

    expect(result.status).toBe(200);
    expect(result.body.alertsEnabled).toBe(false);
    expect(result.body.orders[0].trackingNumbers).toEqual(["ONE", "TWO"]);
    const predicate = state.predicates.join(" ");
    expect(predicate).toContain("order_type");
    expect(predicate).toContain("shared_order_id");
    expect(predicate).toContain("deleted_at");
    expect(predicate).toContain("telegram_username");
  });
});
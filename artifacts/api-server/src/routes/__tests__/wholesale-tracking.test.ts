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

  it("maps each canonical parcel from its exact tracking detail without duplicating legacy history", async () => {
    state.authenticated = true;
    state.orders = [{
      id: "direct", code: "W-2", trackingNumber: "FIRST", trackingNumbers: ["SECOND", "FIRST", "SECOND"],
      trackingStatus: "in_transit",
      trackingEvents: [{ date: "2026-01-01T00:00:00Z", status: "Legacy", location: "Old" }],
      trackingLastChecked: null,
      trackingDetails: {
        SECOND: {
          trackingNumber: "SECOND", carrier: "DHL", status: "delivered", statusCode: "DEL",
          events: [{ date: "2026-01-02T00:00:00Z", status: "Delivered", location: "New" }],
          lastChecked: "2026-01-02T01:00:00Z",
        },
      },
    }];
    state.account = [];

    const result = await request();

    expect(result.body.orders[0].trackingParcels).toEqual([
      {
        trackingNumber: "SECOND", carrier: "DHL", status: "delivered", statusCode: "DEL",
        events: [{ date: "2026-01-02T00:00:00Z", status: "Delivered", location: "New" }],
        lastChecked: "2026-01-02T01:00:00Z",
      },
      { trackingNumber: "FIRST", status: null, events: [], lastChecked: null },
    ]);
  });

  it("uses legacy tracking history only for the first canonical parcel", async () => {
    state.authenticated = true;
    state.orders = [{
      id: "legacy", code: "W-3", trackingNumber: "FIRST", trackingNumbers: ["FIRST", "SECOND"],
      trackingStatus: "in_transit",
      trackingEvents: [{ date: "2026-01-01T00:00:00Z", status: "Departed", location: "Origin" }],
      trackingLastChecked: "2026-01-01T02:00:00Z",
      trackingDetails: null,
    }];
    state.account = [];

    const result = await request();

    expect(result.body.orders[0].trackingParcels).toEqual([
      {
        trackingNumber: "FIRST", status: "in_transit",
        events: [{ date: "2026-01-01T00:00:00Z", status: "Departed", location: "Origin" }],
        lastChecked: "2026-01-01T02:00:00Z",
      },
      { trackingNumber: "SECOND", status: null, events: [], lastChecked: null },
    ]);
  });

  it("discards malformed tracking details at the API trust boundary", async () => {
    state.authenticated = true;
    state.orders = [{
      id: "invalid", code: "W-4", trackingNumber: "FIRST", trackingNumbers: ["FIRST"],
      trackingStatus: null, trackingEvents: [], trackingLastChecked: null,
      trackingDetails: { FIRST: { trackingNumber: "FIRST", status: 123, events: [{ date: 1 }] } },
    }];
    state.account = [];
    const result = await request();
    expect(result.body.orders[0].trackingParcels).toEqual([
      { trackingNumber: "FIRST", status: null, events: [], lastChecked: null },
    ]);
  });

  it("returns one explicitly paired BMURFS package with separate histories and local-authoritative delivery", async () => {
    state.authenticated = true;
    state.orders = [{
      id: "paired", code: "W-BMURFS", trackingNumber: "SMEX6082643740",
      trackingNumbers: ["SMEX6082643740", "HD358713635GB"],
      trackingPackages: [{ id: "package-1", courier: "bmurfs", internationalTrackingNumber: "SMEX6082643740", localTrackingNumber: "HD358713635GB" }],
      trackingStatus: "delivered", trackingEvents: [], trackingLastChecked: null,
      trackingDetails: {
        SMEX6082643740: { trackingNumber: "SMEX6082643740", status: "delivered", events: [], lastChecked: null },
        HD358713635GB: { trackingNumber: "HD358713635GB", status: "out_for_delivery", events: [{ date: "2026-09-05", status: "Local courier", location: "UK" }], lastChecked: null },
      },
    }];
    const result = await request();
    expect(result.body.orders[0].trackingPackageViews).toHaveLength(1);
    expect(result.body.orders[0].trackingPackageViews[0].local.events[0].status).toBe("Local courier");
    expect(result.body.orders[0].packageTrackingStatus).toBe("out_for_delivery");
    expect(result.body.orders[0].trackingParcels).toHaveLength(2);
  });
});
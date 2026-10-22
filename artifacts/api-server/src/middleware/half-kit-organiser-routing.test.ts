import type { Server } from "node:http";
import express from "express";
import { getTableName } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  queries: [] as string[], writes: [] as unknown[],
  ownsGroup: true, supplierLocked: false,
  supplierCheck: vi.fn(), release: vi.fn(),
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("../../../../lib/db/src/schema");
  class TestPool {
    options = {};
    async connect() {
      return {
        query: async (text: string) => { fixture.queries.push(text); return { rows: [] }; },
        release: fixture.release,
      };
    }
  }
  return {
    ...schema, pool: new TestPool(),
    db: {
      select: () => ({
        from: (table: Parameters<typeof getTableName>[0]) => ({
          where: () => {
            const rows = getTableName(table) === "orders"
              ? [{ id: "o1", groupBuyId: "g1", username: "member" }]
              : getTableName(table) === "gb_half_kit_claims" ? [{ id: "active-claim" }] : [];
            return { limit: async () => rows, then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) };
          },
        }),
      }),
    },
  };
});
vi.mock("./require-organiser", () => ({
  requireOrganiser: (req: any, res: any, next: any) => {
    if (req.headers["x-test-organiser"] !== "signed-in") return res.status(401).json({ error: "Unauthorised" });
    req.organiser = { telegramUsername: "organiser", isAdmin: false };
    next();
  },
}));
vi.mock("../lib/half-kit-offers", () => ({
  halfKitGroup: async () => {
    if (!fixture.ownsGroup) throw Object.assign(new Error("Not your group buy"), { status: 403 });
  },
}));
vi.mock("../lib/supplier-batch-protection", () => ({
  assertSupplierOrderEditable: async (_db: unknown, ids: string[]) => {
    fixture.supplierCheck(ids);
    if (fixture.supplierLocked) throw Object.assign(new Error("Supplier batch is locked"), { status: 409 });
  },
}));
vi.mock("../lib/supplier-batch-worker", () => ({ requestSupplierReconciliation: vi.fn() }));

import { halfKitProtection } from "./half-kit-protection";

let server: Server;
let base: string;
beforeEach(async () => {
  fixture.queries.length = 0;
  fixture.writes.length = 0;
  fixture.ownsGroup = true;
  fixture.supplierLocked = false;
  fixture.supplierCheck.mockClear();
  const app = express();
  app.use(express.json(), halfKitProtection);
  app.patch("/organiser/group-buys/:gbId/orders/:orderId/route", (req, res) => {
    fixture.writes.push(req.body);
    res.json({ ok: true });
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function route(body: Record<string, unknown>, signedIn = true) {
  return fetch(`${base}/organiser/group-buys/g1/orders/o1/route`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(signedIn ? { "x-test-organiser": "signed-in" } : {}) },
    body: JSON.stringify(body),
  });
}

describe("organiser fulfilment routing with active half-kit claims", () => {
  it("permits routing while retaining the mutex and supplier snapshot protection", async () => {
    const body = { routingType: "reshipper", reshipperUsername: "shipper" };
    expect((await route(body)).status).toBe(200);
    expect(fixture.writes).toEqual([body]);
    expect(fixture.queries.some(query => query.includes("pg_advisory_lock"))).toBe(true);
    expect(fixture.supplierCheck).toHaveBeenCalledWith(["o1"]);
  });
  it("continues to block changes containing charges", async () => {
    const response = await route({ routingType: "direct", vendorShipping: 0 });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("half_kit_pricing_protected");
    expect(fixture.writes).toEqual([]);
  });
  it("continues to reject allocated supplier snapshots", async () => {
    fixture.supplierLocked = true;
    expect((await route({ routingType: "direct" })).status).toBe(409);
    expect(fixture.writes).toEqual([]);
  });
  it("requires authentication", async () => {
    expect((await route({ routingType: "direct" }, false)).status).toBe(401);
    expect(fixture.writes).toEqual([]);
    expect(fixture.queries).toEqual([]);
  });
  it("requires ownership of the group buy", async () => {
    fixture.ownsGroup = false;
    expect((await route({ routingType: "direct" })).status).toBe(403);
    expect(fixture.writes).toEqual([]);
    expect(fixture.queries).toEqual([]);
  });
});

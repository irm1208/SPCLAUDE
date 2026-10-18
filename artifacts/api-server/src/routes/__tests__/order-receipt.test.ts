import express from "express";
import type { AddressInfo } from "node:net";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: "member" as string | null,
  row: null as any,
  updates: 0,
  lock: Promise.resolve(),
}));
vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"),
  db: {
    transaction: async (fn: any) => {
      const previous = state.lock;
      let release!: () => void;
      state.lock = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await fn({
      select: () => ({ from: () => ({ where: (condition: any) => ({
        for: async () => {
          const params = new PgDialect().sqlToQuery(condition).params;
          return state.row && !state.row.deletedAt && params.includes(state.row.id)
            && params.includes(state.row.telegramUsername.toLowerCase()) ? [state.row] : [];
        },
      }) }) }),
      update: () => ({ set: (values: any) => ({ where: () => {
        state.updates++;
        Object.assign(state.row, values);
        return Promise.resolve();
      } }) }),
      }); } finally { release(); }
    },
  },
}));
vi.mock("../../middleware/account-auth", () => ({
  requireAccount: (req: any, res: any, next: any) => {
    if (!state.user) return res.status(401).json({ error: "Sign in required" });
    req.account = { telegramUsername: state.user };
    next();
  },
}));
vi.mock("../../lib/refund-mutation-guard", () => ({ assertNoActiveRefund: vi.fn() }));
vi.mock("../../lib/activity-log", () => ({ logCustomerActivity: vi.fn().mockResolvedValue(undefined) }));

import router from "../order-receipt";
import { assertNoActiveRefund } from "../../lib/refund-mutation-guard";

async function request() {
  const app = express();
  app.use(express.json(), router);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status ?? 500).json({ error: error.message });
  });
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/account/orders/order-1/received`, { method: "POST" });
    return { status: response.status, body: await response.json() as { status?: string; memberReceivedAt?: string; error?: string } };
  } finally { server.close(); }
}

beforeEach(() => {
  state.user = "member";
  state.updates = 0;
  vi.mocked(assertNoActiveRefund).mockReset();
  state.lock = Promise.resolve();
  state.row = { id: "order-1", code: "123", telegramUsername: "@member", status: "Shipped", paymentStatus: "unpaid", grandTotal: "30.00", memberReceivedAt: null };
});

describe("member confirms order receipt", () => {
  for (const orderType of ["group_buy", "wholesale", "wholesale_shared"]) {
    it(`completes only the owned ${orderType} order without changing money`, async () => {
      state.row.orderType = orderType;
      const result = await request();
      expect(result.status).toBe(200);
      expect(result.body.status).toBe("Completed");
      expect(result.body.memberReceivedAt).toBeTruthy();
      expect(state.row.paymentStatus).toBe("unpaid");
      expect(state.row.grandTotal).toBe("30.00");
      expect(state.updates).toBe(1);
    });
  }
  for (const status of ["Draft", "Submitted", "Processing", "Cancelled", "Completed"]) {
    it(`rejects ${status} without a prior member confirmation`, async () => {
      state.row.status = status;
      expect((await request()).status).toBe(409);
      expect(state.updates).toBe(0);
    });
  }
  it("requires authentication", async () => {
    state.user = null;
    expect((await request()).status).toBe(401);
  });
  it("does not expose or mutate another member's order", async () => {
    state.user = "someone-else";
    expect((await request()).status).toBe(404);
    expect(state.updates).toBe(0);
  });
  it("excludes soft deleted orders", async () => {
    state.row.deletedAt = new Date();
    expect((await request()).status).toBe(404);
  });
  it("retries idempotently without changing the receipt timestamp", async () => {
    const first = await request();
    const second = await request();
    expect(second.body.memberReceivedAt).toBe(first.body.memberReceivedAt);
    expect(state.updates).toBe(1);
  });
  it("serializes simultaneous confirmations into one order update", async () => {
    const results = await Promise.all([request(), request()]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(results[0].body.memberReceivedAt).toBe(results[1].body.memberReceivedAt);
    expect(state.updates).toBe(1);
  });
  it("preserves the order while a refund is active", async () => {
    vi.mocked(assertNoActiveRefund).mockRejectedValueOnce(Object.assign(new Error("Refund active"), { status: 409 }));
    expect((await request()).status).toBe(409);
    expect(state.row.status).toBe("Shipped");
    expect(state.updates).toBe(0);
  });
  it("matches legacy bare usernames case insensitively", async () => {
    state.row.telegramUsername = "MEMBER";
    expect((await request()).status).toBe(200);
  });
});

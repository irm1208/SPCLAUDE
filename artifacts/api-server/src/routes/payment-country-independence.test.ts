import express from "express";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  order: {} as any, group: {} as any, country: null as string | null,
  blocked: false, duplicate: false, reads: [] as string[], updates: [] as any[],
}));
const database = {
  select: vi.fn((fields?: any) => {
    let table: string, condition: any;
    const query: any = {
      from(t: any) { table = getTableName(t); state.reads.push(table); return query; },
      where(c: any) { condition = c; return query; },
      limit() { return query; },
      then(resolve: any, reject: any) {
        let rows: any[] = [];
        if (table === "orders") rows = fields && Object.keys(fields).length === 1 && fields.id
          ? state.duplicate ? [{ id: "other-order" }] : [] : [state.order];
        else if (table === "group_buys") rows = [state.group];
        else if (table === "accounts") rows = [{ country: state.country }];
        else if (table === "gb_country_legs") rows = [{ paymentBlocked: state.blocked }];
        else if (table === "site_config") {
          const key = new PgDialect().sqlToQuery(condition).params[0];
          rows = [{ value: key === "paymentRoutingEnabled" ? "false" : null }];
        }
        return Promise.resolve(rows).then(resolve, reject);
      },
    };
    return query;
  }),
  update: vi.fn(() => {
    let values: any;
    const query: any = {
      set(v: any) { values = v; state.updates.push(v); return query; },
      where() { return query; },
      returning() { return Promise.resolve([{ ...state.order, ...values }]); },
      then(resolve: any, reject: any) { return Promise.resolve().then(resolve, reject); },
    };
    return query;
  }),
};
vi.mock("@workspace/db", async () => ({ ...await import("@workspace/db/schema"), db: database, pool: {} }));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
vi.mock("../lib/telegram", () => ({
  notifyUserFromTemplate: vi.fn(async () => {}), sendAdminFromTemplate: vi.fn(async () => {}),
}));
vi.mock("../lib/gb-onward-payments", () => ({
  hasOnwardPaymentTransaction: vi.fn(async () => false), reserveProductPaymentTransaction: vi.fn(async () => true),
}));
vi.mock("../lib/half-kit-payment-destination", () => ({ resolveHalfKitPayments: vi.fn(async () => null) }));
vi.mock("./admin-auth", () => ({ consumeAdminActionAssertion: vi.fn() }));
vi.mock("../middleware/account-auth", () => ({
  getJwtSecret: () => "synthetic-unit-test-only",
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-user"]) { res.status(401).json({ error: "Sign in required" }); return; }
    req.account = { telegramUsername: req.headers["x-test-user"] }; next();
  },
}));

let server: Server, base: string;
let combined: typeof import("./payments")["assertCombinedProductPaymentsOpen"];
beforeAll(async () => {
  const payments = await import("./payments");
  combined = payments.assertCombinedProductPaymentsOpen;
  const { default: orders } = await import("./orders");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.cookies = req.headers["x-test-user"] ? { account_session: "synthetic-test-session" } : {};
    next();
  });
  app.use(payments.default, orders);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address() as { port: number };
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  state.order = { id: "O", code: "synthetic", telegramUsername: "@member", groupBuyId: "G",
    shippingCountry: "Germany", countryLegId: "L", status: "Submitted", paymentStatus: "unpaid",
    directShippingRequested: false, deletedAt: null, grandTotal: "100" };
  state.group = { id: "G", currency: "USD", paymentsEnabled: true, directShippingPaymentsEnabled: true,
    allowedCountries: ["DE"], excludedCountries: [], organiserPayments: { revolutHandle: "synthetic-organiser" } };
  state.country = "Germany"; state.blocked = false; state.duplicate = false;
  state.reads = []; state.updates = [];
});
async function call(action: string, body: any = {}, user = "member") {
  const response = await fetch(`${base}/orders/O/${action}`, { method: "POST",
    headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as any };
}
const hash = `0x${"b".repeat(64)}`;

describe.each(["ISO/full-name mismatch", "outside allowed list", "excluded profile country", "missing country"])("%s does not block payment", scenario => {
  beforeEach(() => {
    if (scenario === "outside allowed list") state.country = "Canada";
    if (scenario === "excluded profile country") {
      state.country = "CA"; state.group.allowedCountries = []; state.group.excludedCountries = ["Canada"];
    }
    if (scenario === "missing country") { state.country = null; state.order.shippingCountry = null; }
  });
  it("generates a test amount for an existing order", async () => {
    const result = await call("generate-test");
    expect(result.status).toBe(200);
    expect(result.body.paymentStatus).toBe("test_ready");
    expect(state.reads).not.toContain("accounts");
  });
  it("reaches crypto wallet validation rather than rejecting a country", async () => {
    const result = await call("pay", { txHash: hash });
    expect(result).toEqual({ status: 400, body: { error: "Wallet address not configured" } });
    expect(state.reads).not.toContain("accounts");
    expect(state.updates).toEqual([]);
  });
  it("retains AnonPay configuration checks without a country restriction", async () => {
    const result = await call("init-anonpay");
    expect(result).toEqual({ status: 403, body: { error: "AnonPay is not enabled for this order." } });
    expect(state.reads).not.toContain("accounts");
  });
  it("allows the owner to submit a configured fiat payment", async () => {
    expect(await call("confirm-fiat", { method: "revolut" })).toEqual({
      status: 200, body: { ok: true, paymentStatus: "pending_confirmation" },
    });
    expect(state.reads).not.toContain("accounts");
  });
  it("does not reject combined checkout based on country eligibility lists", async () => {
    await expect(combined(state.order, database as any)).resolves.toBeUndefined();
    expect(state.reads).not.toContain("accounts");
  });
});

it.each(["generate-test", "pay", "init-anonpay"])("retains the explicit payment pause for %s", async action => {
  state.group.paymentsEnabled = false;
  expect(await call(action, { txHash: hash })).toEqual({
    status: 403, body: { error: "Payments are not currently open for this group buy" },
  });
  expect(state.updates).toEqual([]);
});
it.each(["generate-test", "pay", "init-anonpay"])("retains the explicit country-leg pause for %s", async action => {
  state.blocked = true;
  const result = await call(action, { txHash: hash });
  expect(result.status).toBe(403); expect(result.body.error).toMatch(/paused/);
  expect(state.updates).toEqual([]);
});
it("retains combined-payment eligibility and payment-pause safeguards", async () => {
  state.blocked = true;
  await expect(combined(state.order, database as any)).rejects.toMatchObject({ status: 403 });
  state.blocked = false; state.group.paymentsEnabled = false;
  await expect(combined(state.order, database as any)).rejects.toMatchObject({ status: 403 });
  state.group.paymentsEnabled = true; state.order.status = "Cancelled";
  await expect(combined(state.order, database as any)).rejects.toMatchObject({ status: 409 });
});
it("still rejects invalid and reused payment transaction hashes", async () => {
  expect((await call("pay", { txHash: "bad" })).status).toBe(400);
  state.duplicate = true;
  expect((await call("pay", { txHash: hash })).body.error).toMatch(/already been used/);
  expect(state.updates).toEqual([]);
});
it("retains fiat sign-in, ownership and current payment-state checks", async () => {
  expect((await call("confirm-fiat", { method: "revolut" }, "")).status).toBe(410);
  expect((await call("confirm-fiat", { method: "revolut" }, "other")).status).toBe(403);
  state.group.allowedCountries = [];
  state.order.paymentStatus = "confirmed";
  expect((await call("confirm-fiat", { method: "revolut" })).status).toBe(400);
  expect(state.updates).toEqual([]);
});

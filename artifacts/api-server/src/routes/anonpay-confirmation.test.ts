import express from "express";
import { getTableName } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ order: {} as any, provider: {} as any, providerCode: 200, saved: true, updates: [] as any[] }));
const database: any = {
  select: () => {
    let table = "";
    const q: any = {
      from(t: any) { table = getTableName(t); return q; }, where() { return q; }, limit() { return q; },
      then(resolve: any, reject: any) {
        return Promise.resolve(table === "orders" ? [{ ...state.order }] : table === "group_buys"
          ? [{ currency: "USD" }] : []).then(resolve, reject);
      },
    };
    return q;
  },
  update: () => {
    let values: any;
    const q: any = {
      set(v: any) { values = v; return q; }, where() { return q; },
      async returning() {
        if (!state.saved) return [];
        state.updates.push(values); Object.assign(state.order, values);
        return [{ id: state.order.id }];
      },
    };
    return q;
  },
  transaction: async (fn: any) => fn(database),
};
vi.mock("@workspace/db", async () => ({ ...await import("@workspace/db/schema"), db: database, pool: {} }));
vi.mock("../lib/refund-mutation-guard", () => ({
  refundMutableOrderWhere: (c: unknown) => c, assertNoActiveRefunds: vi.fn(async () => {}),
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
vi.mock("../lib/telegram", () => ({ notifyUserFromTemplate: vi.fn(async () => {}), sendAdminFromTemplate: vi.fn(async () => {}) }));
vi.mock("../lib/supplier-batch-worker", () => ({ requestSupplierReconciliation: vi.fn() }));
vi.mock("./admin-auth", () => ({ consumeAdminActionAssertion: vi.fn() }));
vi.mock("../middleware/account-auth", () => ({ getJwtSecret: () => "synthetic-test-only" }));
let server: Server, base: string, run: () => Promise<void>;
const nativeFetch = globalThis.fetch;
const providerFetch = vi.fn();
const hash = `0x${"a".repeat(64)}`;
beforeAll(async () => {
  const { default: router } = await import("./payments");
  run = (await import("../lib/order-payment-auto-verify")).runOrderPaymentAutoVerify;
  const app = express(); app.use(express.json(), router);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", () => resolve()); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { vi.unstubAllGlobals(); if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  state.order = { id: "synthetic-order", code: "synthetic", telegramUsername: "synthetic-member",
    groupBuyId: null, sharedOrderId: null, orderType: "group_buy", deliveryMethod: "post",
    paymentStatus: "unpaid", paymentTxHash: "anonpay:synthetic-session", grandTotal: "153.00",
    paymentUsdAmount: "153.00", creditsApplied: 0, amountDue: "20.00" };
  state.provider = { Status: "finished", AmountTo: 153, "Payment Transaction Hash": hash };
  state.providerCode = 200; state.saved = true; state.updates = []; providerFetch.mockClear();
  vi.stubGlobal("fetch", async (input: any, init?: any) => {
    if (String(input).startsWith("https://trocador.app/")) {
      providerFetch(input);
      return new Response(JSON.stringify(state.provider), { status: state.providerCode });
    }
    return nativeFetch(input, init);
  });
});
async function poll() {
  const res = await fetch(`${base}/orders/synthetic-order/anonpay-status`);
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}
it("browser polling confirms an unpaid session and returns the blockchain TXID without clearing a balance", async () => {
  const res = await poll();
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ paymentStatus: "confirmed", paymentTxHash: `anonpay:synthetic-session|${hash}`, outgoingTxHash: hash });
  expect(state.order.amountDue).toBe("20.00");
  await poll(); expect(state.updates).toHaveLength(1);
  expect(providerFetch).toHaveBeenCalledTimes(1);
});
it("the scheduler recovers the same missed unpaid payment without a browser submission", async () => {
  await run();
  expect(state.order.paymentStatus).toBe("confirmed");
  expect(state.order.paymentTxHash).toBe(`anonpay:synthetic-session|${hash}`);
  expect(state.order.amountDue).toBe("20.00");
});
it.each(["anonpaynew", "anonpayfound", "failed", "expired"])("leaves %s sessions unconfirmed", async status => {
  state.provider.Status = status;
  expect((await poll()).body.paymentStatus).toBe("unpaid");
  expect(state.updates).toHaveLength(0);
});
it("leaves network failures and changed amounts unconfirmed", async () => {
  state.providerCode = 503; await poll(); expect(state.updates).toHaveLength(0);
  state.providerCode = 200; state.provider.AmountTo = 100;
  expect((await poll()).status).toBe(409);
  await run(); expect(state.updates).toHaveLength(0);
});
it("does not claim confirmation when a concurrent update prevents the save", async () => {
  state.saved = false;
  expect((await poll()).status).toBe(409);
  expect(state.order.paymentStatus).toBe("unpaid");
});
it("strips an existing appended TXID before calling the provider", async () => {
  state.order.paymentTxHash += `|${hash}`;
  await poll();
  expect(providerFetch).toHaveBeenCalledWith("https://trocador.app/anonpay/status/synthetic-session?format=json");
});
it.each(["cancel-anonpay", "confirm-anonpay-initiation"])("does not overwrite a concurrent confirmation through %s", async action => {
  state.saved = false;
  const response = await fetch(`${base}/orders/synthetic-order/${action}`, { method: "POST" });
  expect(response.status).toBe(409);
  expect(state.updates).toHaveLength(0);
});

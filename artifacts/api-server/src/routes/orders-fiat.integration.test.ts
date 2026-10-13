import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { getTableName } from "drizzle-orm";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const state = vi.hoisted(() => ({
  order: {} as Record<string, any>,
  share: null as Record<string, any> | null,
  group: null as Record<string, any> | null,
  revoked: false,
  mutationAllowed: true,
  writes: [] as Record<string, any>[],
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return {
    ...schema,
    pool: {},
    db: {
      select() {
        let table = "";
        const query = {
          from(value: any) { table = getTableName(value); return query; },
          where() { return query; },
          limit() { return query; },
          then(resolve: any, reject: any) {
            const rows = table === "orders" ? [state.order]
              : table === "wholesale_shares" ? (state.share ? [state.share] : [])
              : table === "group_buys" ? (state.group ? [state.group] : [])
              : table === "revoked_tokens" && state.revoked ? [{ jti: "revoked" }] : [];
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return query;
      },
      update() {
        const query = {
          set(patch: any) { state.writes.push(patch); return query; },
          where() { return query; },
          returning() { return query; },
          then(resolve: any, reject: any) {
            return Promise.resolve(state.mutationAllowed ? [{ id: state.order.id }] : []).then(resolve, reject);
          },
        };
        return query;
      },
    },
  };
});
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: async () => undefined }));

import router from "./orders";
import { getJwtSecret } from "../middleware/account-auth";

let server: Server;
let base: string;
const screenshot = "data:image/png;base64,aGVsbG8=";

async function post(action: string, body: Record<string, unknown>, identity: string | null = "member", verificationRequired = false) {
  const cookie = identity === null ? "" : `account_session=${identity === "invalid"
    ? "invalid"
    : jwt.sign({ telegramUsername: identity, jti: "fiat-test", verificationRequired }, getJwtSecret(), { expiresIn: "1h" })}`;
  const response = await fetch(`${base}/api/orders/order-1/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() as { paymentStatus?: string; error?: string } };
}

beforeAll(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", router);
  server = await new Promise(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
beforeEach(() => {
  state.order = {
    id: "order-1", code: 123, telegramUsername: "@member",
    groupBuyId: null, orderType: "wholesale_shared", sharedOrderId: "share-1",
    paymentStatus: "unpaid", status: "Submitted",
  };
  state.share = {
    creatorUsername: "organiser", status: "locked",
    leadRevolutHandle: "organiser-revolut", leadPaypalEmail: "organiser@example.test",
    leadAnonPayWallet: null, leadCryptoOptions: [],
  };
  state.group = null;
  state.revoked = false;
  state.mutationAllowed = true;
  state.writes = [];
});

describe("signed-in fiat payment submission", () => {
  it("uploads the owner's screenshot without restoring PIN access", async () => {
    expect((await post("payment-screenshot", { screenshot })).status).toBe(200);
    expect(state.writes).toEqual([{ paymentScreenshot: screenshot }]);
  });
  it.each(["revolut", "paypal"])("submits a shared-order %s claim for organiser review", async method => {
    const response = await post("confirm-fiat", { method });
    expect(response.status).toBe(200);
    expect(response.body.paymentStatus).toBe("pending_confirmation");
    expect(state.writes[0]).toMatchObject({ paymentStatus: "pending_confirmation", paymentTxHash: `fiat:${method}` });
  });
  it.each(["payment-screenshot", "confirm-fiat"])("rejects another account's %s request", async action => {
    expect((await post(action, { screenshot, method: "revolut" }, "someone-else")).status).toBe(403);
    expect(state.writes).toHaveLength(0);
  });
  it.each(["payment-screenshot", "confirm-fiat"])("keeps anonymous %s access disabled", async action => {
    expect((await post(action, { screenshot, method: "revolut" }, null)).status).toBe(410);
    expect(state.writes).toHaveLength(0);
  });
  it("rejects a forged session", async () => {
    expect((await post("confirm-fiat", { method: "revolut" }, "invalid")).status).toBe(401);
    expect(state.writes).toHaveLength(0);
  });
  it("rejects a verification-restricted session", async () => {
    expect((await post("confirm-fiat", { method: "revolut" }, "member", true)).status).toBe(403);
    expect(state.writes).toHaveLength(0);
  });
  it("rejects a revoked session", async () => {
    state.revoked = true;
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(401);
    expect(state.writes).toHaveLength(0);
  });
  it("does not fall back when the shared organiser has no Revolut destination", async () => {
    state.share!.leadRevolutHandle = null;
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(400);
    expect(state.writes).toHaveLength(0);
  });
  it("preserves the group-buy confirmation path", async () => {
    state.order.groupBuyId = "group-1";
    state.order.orderType = "group_buy";
    state.order.sharedOrderId = null;
    state.group = { organiserPayments: { revolutHandle: "gb-organiser" }, allowedCountries: [], excludedCountries: [] };
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(200);
  });
  it("does not resubmit an already confirmed payment", async () => {
    state.order.paymentStatus = "confirmed";
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(400);
    expect(state.writes).toHaveLength(0);
  });
  it.each(["payment-screenshot", "confirm-fiat"])("reports a conflict when %s loses its mutation guard", async action => {
    state.mutationAllowed = false;
    expect((await post(action, { screenshot, method: "revolut" })).status).toBe(409);
  });
  it("rejects a cancelled shared order", async () => {
    state.share!.status = "cancelled";
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(400);
    expect(state.writes).toHaveLength(0);
  });
  it("rejects a missing shared order", async () => {
    state.share = null;
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(400);
    expect(state.writes).toHaveLength(0);
  });
  it("preserves group-buy country restrictions", async () => {
    state.order.groupBuyId = "group-1";
    state.order.orderType = "group_buy";
    state.order.sharedOrderId = null;
    state.group = { organiserPayments: { revolutHandle: "gb-organiser" }, allowedCountries: ["United Kingdom"], excludedCountries: [] };
    expect((await post("confirm-fiat", { method: "revolut" })).status).toBe(403);
    expect(state.writes).toHaveLength(0);
  });
});

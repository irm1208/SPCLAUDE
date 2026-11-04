import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import { getTableName } from "drizzle-orm";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
const mocks = vi.hoisted(() => ({
  filter: vi.fn(), send: vi.fn(async () => true),
  rows: {
    group_buys: [{ name: "Synthetic group", organiserId: "lead" }],
    account_group_buys: [
      { accountId: "member", chatId: "chat-member", telegramUsername: "member" },
      { accountId: "outside", chatId: "chat-outside", telegramUsername: "outside" },
    ],
    accounts: [{ telegramUsername: "member", chatId: "chat-member" }, { telegramUsername: "outside", chatId: "chat-outside" }],
    orders: [{ telegramUsername: "member", paymentStatus: "confirmed", status: "Processing" },
      { telegramUsername: "outside", paymentStatus: "confirmed", status: "Processing" }],
  } as Record<string, any[]>,
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const select = () => {
    let table = "";
    const query: any = {
      from(value: any) { table = getTableName(value); return query; },
      where() { return query; }, limit() { return query; },
      innerJoin() { return query; }, leftJoin() { return query; },
      then(resolve: any, reject: any) { return Promise.resolve(mocks.rows[table] ?? []).then(resolve, reject); },
    };
    return query;
  };
  return { ...schema, db: { select, selectDistinct: select }, pool: {} };
});
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => req.headers["x-test-admin"] === "yes" || (res.status(401).json({ error: "Unauthorised" }), false),
  setAdminMutationSummary: vi.fn(),
}));
vi.mock("../../lib/broadcast-batch-filter", () => ({
  BroadcastBatchFilterError: class extends Error {},
  broadcastBatchUsernames: mocks.filter,
}));
vi.mock("../../lib/telegram", () => ({
  sendTelegramMessage: mocks.send, notifyUser: vi.fn(), sendAdminMessage: vi.fn(),
  notifyUserFromTemplate: vi.fn(), sendAdminFromTemplate: vi.fn(),
}));
import router from "../group-buys-admin";
import { BroadcastBatchFilterError } from "../../lib/broadcast-batch-filter";
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api", router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/group-buys/gb`;
});
afterAll(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
beforeEach(() => {
  mocks.send.mockClear(); mocks.filter.mockReset();
  mocks.filter.mockImplementation(async (_db, _group, batchId) => batchId === undefined ? null : new Set(["member"]));
});
async function send(body: any, authenticated = true) {
  return fetch(`${base}/broadcast`, { method: "POST",
    headers: { "Content-Type": "application/json", ...(authenticated ? { "x-test-admin": "yes" } : {}) },
    body: JSON.stringify({ message: "Synthetic update", ...body }),
  });
}
it("uses the existing broadcast sender and intersects batch, status, and individual selection", async () => {
  let response = await send({ batchId: "b1" });
  expect(await response.json()).toMatchObject({ total: 1, sent: 1 });
  expect(mocks.send.mock.calls[0][0]).toBe("chat-member");
  response = await send({ batchId: "b1", paymentStatusFilter: "paid", targetUsernames: ["outside"] });
  expect(await response.json()).toMatchObject({ total: 0, sent: 0 });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  response = await send({ batchId: "b1", targetUsernames: ["member"] });
  expect(await response.json()).toMatchObject({ total: 1, sent: 1 });
});
it("does not widen an empty or unavailable batch into all members", async () => {
  mocks.filter.mockResolvedValue(new Set());
  expect(await (await send({ batchId: "empty" })).json()).toMatchObject({ total: 0 });
  mocks.filter.mockRejectedValue(new BroadcastBatchFilterError("Batch released"));
  expect((await send({ batchId: "released" })).status).toBe(400);
  expect(mocks.send).not.toHaveBeenCalled();
});
it("leaves all-member broadcasts unchanged and enforces Admin auth", async () => {
  expect((await send({ batchId: "b1" }, false)).status).toBe(401);
  expect(mocks.filter).not.toHaveBeenCalled();
  expect(await (await send({})).json()).toMatchObject({ total: 2, sent: 2 });
});
it("filters the existing member selector using the same authoritative batch audience", async () => {
  const response = await fetch(`${base}/members?batchId=b1`, { headers: { "x-test-admin": "yes" } });
  expect((await response.json()).map((member: any) => member.telegramUsername)).toEqual(["member"]);
  expect(mocks.filter.mock.calls[0].slice(1)).toEqual(["gb", "b1"]);
});

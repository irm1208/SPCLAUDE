import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { getTableName } from "drizzle-orm";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  group: { id: "G", organiserPayments: {} as Record<string, unknown> },
  exists: true,
  writes: [] as Record<string, unknown>[],
}));
vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"), pool: {},
  db: {
    select() {
      let table = "";
      const query: any = {
        from(t: any) { table = getTableName(t); return query; },
        where() { return query; },
        then(resolve: any, reject: any) { return Promise.resolve(table === "group_buys" && state.exists ? [state.group] : []).then(resolve, reject); },
      };
      return query;
    },
    update() {
      const query: any = {
        set(value: any) { state.writes.push(value); if (value.organiserPayments) state.group.organiserPayments = value.organiserPayments; return query; },
        where() { return query; },
        then(resolve: any, reject: any) { return Promise.resolve([]).then(resolve, reject); },
      };
      return query;
    },
  },
}));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser(req: any, res: any, next: any) {
    if (!req.headers["x-test-organiser"]) { res.status(401).json({ error: "Sign in" }); return; }
    req.organiser = { telegramUsername: "owner" };
    next();
  },
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: vi.fn(async () => {}) }));
import router from "./organiser";
let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json(), router);
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { state.exists = true; state.writes = []; state.group.organiserPayments = {}; });
const uk = { enabled: true, accountHolder: "Example Ltd", sortCode: "12-34-56", accountNumber: "00123456", bankName: "Example Bank" };
async function save(body: Record<string, unknown>, signedIn = true) {
  const response = await fetch(`${base}/organiser/group-buys/G/payments`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...(signedIn ? { "x-test-organiser": "owner" } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
describe("organiser bank settings persistence", () => {
  it("saves, preserves omitted bank details, and explicitly clears them", async () => {
    const result = await save({ bankTransfer: { uk }, revolutHandle: "example" });
    expect(result.status).toBe(200);
    expect(result.body.organiserPayments.bankTransfer.uk).toMatchObject(uk);
    expect(state.group.organiserPayments.bankTransfer).toEqual(result.body.organiserPayments.bankTransfer);
    expect((await save({ paypalHandle: "example" })).body.organiserPayments.bankTransfer.uk.accountNumber).toBe("00123456");
    expect((await save({ bankTransfer: null })).body.organiserPayments.bankTransfer).toBeNull();
  });
  it("rejects invalid enabled bank settings without writing anything", async () => {
    expect((await save({ bankTransfer: { uk: { ...uk, sortCode: "bad" } } })).status).toBe(400);
    expect(state.writes).toEqual([]);
  });
  it("retains organiser authentication and group ownership checks", async () => {
    expect((await save({ bankTransfer: { uk } }, false)).status).toBe(401);
    state.exists = false;
    expect((await save({ bankTransfer: { uk } })).status).toBe(404);
    expect(state.writes).toEqual([]);
  });
});

import express from "express";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Server } from "node:http";
const calls = vi.hoisted(() => ({
  guard: vi.fn(async (access: any) => {
    if (access.groupBuyId !== "own" || access.username !== "owner" || access.adminGbId === "foreign")
      throw Object.assign(new Error("Group buy not found."), { status: 404 });
  }),
  list: vi.fn(async (..._args: any[]) => ({ requests: [{ status: "paid", member: "member", client: "Client", sample: "Sample", manufacturer: "Maker", batch: "Lot" }] })),
  settings: vi.fn(async (..._args: any[]) => ({ ok: true })),
  invite: vi.fn(async (..._args: any[]) => ({ ok: true })),
  manual: vi.fn(async (..._args: any[]) => ({ request: { id: "r1" } })),
  manage: vi.fn(async (..._args: any[]) => ({ ok: true })),
  attach: vi.fn().mockResolvedValue({ attached: true }),
}));
vi.mock("@workspace/db", () => ({ db: {} }));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser: (req: any, res: any, next: any) => {
    if (req.headers["x-test-organiser"] === "suspended") return res.status(403).json({ error: "Suspended" });
    if (!req.headers["x-test-organiser"]) return res.status(401).json({ error: "Authentication required" });
    req.organiser = { telegramUsername: req.headers["x-test-organiser"], ...(req.headers["x-test-admin-gb"] ? { isAdmin: true, adminGbId: req.headers["x-test-admin-gb"] } : {}) };
    next();
  },
}));
vi.mock("../lib/group-buy-coa", () => ({
  assertCoaOrganiserAccess: calls.guard, organiserCoaList: calls.list, saveCoaSettings: calls.settings,
  inviteCoa: calls.invite, addManualCoa: calls.manual, manageCoa: calls.manage, attachCoaCertificate: calls.attach,
}));
import router from "./organiser-coa";
// Use the real domain error so the route's error boundary is exercised too.
import { CoaError } from "../lib/coa-rules";
let server: Server, base: string;
beforeAll(async () => {
  calls.guard.mockImplementation(async access => {
    if (access.groupBuyId !== "own" || access.username !== "owner" || access.adminGbId === "foreign")
      throw new CoaError("Group buy not found.", 404);
  });
  const app = express(); app.use(express.json()); app.use(router);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}/organiser/group-buys`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); });
const headers = { "x-test-organiser": "owner", "Content-Type": "application/json" };
it("protects every organiser COA read, export and mutation with organiser authentication", async () => {
  for (const [path, method] of [["", "GET"], ["/export.txt", "GET"], ["/export.csv", "GET"], ["/settings", "PUT"], ["/invite", "POST"], ["/manual", "POST"], ["/requests/r1", "PATCH"], ["/requests/r1/certificate", "POST"]]) {
    expect((await fetch(`${base}/own/coa${path}`, { method })).status).toBe(401);
  }
  expect((await fetch(`${base}/own/coa`, { headers: { "x-test-organiser": "suspended" } })).status).toBe(403);
});
it("rejects another organiser's group and a pinned Admin session used for a different group", async () => {
  expect((await fetch(`${base}/foreign/coa`, { headers })).status).toBe(404);
  expect((await fetch(`${base}/own/coa`, { headers: { ...headers, "x-test-admin-gb": "foreign" } })).status).toBe(404);
});
it("ignores a forged query-string group and scopes settings, invites and actions on the server", async () => {
  expect((await fetch(`${base}/own/coa?groupBuyId=foreign&batch=HG20`, { headers })).status).toBe(200);
  expect(calls.list).toHaveBeenLastCalledWith({ groupBuyId: "own", username: "owner" }, { batch: "HG20", search: undefined, status: undefined });
  for (const [path, method] of [["settings", "PUT"], ["invite", "POST"], ["requests/r1", "PATCH"]]) {
    expect((await fetch(`${base}/own/coa/${path}`, { method, headers, body: JSON.stringify({ action: "processing" }) })).status).toBe(200);
  }
  expect(calls.manage.mock.lastCall?.[4]).toEqual({ groupBuyId: "own", username: "owner" });
  expect(calls.settings.mock.lastCall?.[4]).toEqual({ groupBuyId: "own", username: "owner" });
});
it("allows manual entry only within the authenticated organiser's group", async () => {
  const body = { orderId: "o1", client: "Client", sample: "HGH", manufacturer: "Maker", batch: "B1", groupBuyId: "foreign", actor: "forged" };
  expect((await fetch(`${base}/foreign/coa/manual`, { method: "POST", headers, body: JSON.stringify(body) })).status).toBe(404);
  expect((await fetch(`${base}/own/coa/manual`, { method: "POST", headers, body: JSON.stringify(body) })).status).toBe(200);
  expect(calls.manual).toHaveBeenLastCalledWith("own", "owner", body, {}, { groupBuyId: "own", username: "owner" });
});
it("exports the same paid-only TXT format from the scoped organiser queue", async () => {
  const response = await fetch(`${base}/own/coa/export.txt?status=reserved&batch=Lot`, { headers });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.text()).toBe("COA 1\n@member\nClient: Client\nSample: Sample\nManufacturer: Maker\nBatch: Lot\n");
  expect(calls.list.mock.lastCall?.[1]).toEqual({ batch: "Lot", search: undefined, status: undefined });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { OnwardDeliveryError } from "../lib/gb-onward-delivery-rules";
const mocks = vi.hoisted(() => ({
  list: vi.fn(), settings: vi.fn(), create: vi.fn(), read: vi.fn(), submit: vi.fn(), manage: vi.fn(), verify: vi.fn(),
}));
vi.mock("../lib/gb-onward-payments", () => ({
  listOnwardPayments: mocks.list, saveOnwardPaymentSettings: mocks.settings, createOnwardPayment: mocks.create,
  readOnwardPayment: mocks.read, submitOnwardPayment: mocks.submit, manageOnwardPayment: mocks.manage, verifyOnwardPayment: mocks.verify,
}));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.headers["x-user"]) return res.status(401).json({ error: "Sign in" });
    req.account = { telegramUsername: req.headers["x-user"] }; next();
  },
}));
vi.mock("../middleware/require-reshipper", () => ({
  requireReshipper: (req: any, res: any, next: any) => {
    if (!req.headers["x-reshipper"]) return res.status(401).json({ error: "Sign in" });
    req.reshipper = { telegramUsername: req.headers["x-reshipper"] }; next();
  },
}));
vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => req.headers["x-admin"] === "yes" || (res.status(401).json({ error: "Unauthorized" }), false),
}));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser: (req: any, res: any, next: any) => {
    if (!req.headers["x-organiser"]) return res.status(401).json({ error: "Sign in" });
    req.organiser = { telegramUsername: req.headers["x-organiser"], adminGbId: "G" }; next();
  },
}));
import router from "./gb-onward-payments";
describe("onward-payment HTTP authorization and delegation", () => {
  let server: Server, base: string;
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use(router);
    server = app.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(() => new Promise<void>(r => server.close(() => r())));
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of [mocks.list, mocks.settings, mocks.create, mocks.submit, mocks.manage]) mock.mockResolvedValue({});
    mocks.read.mockResolvedValue({ request: { id: "R", status: "pending_confirmation" }, canSubmit: true });
  });
  const call = (path: string, method = "GET", headers = {}, body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  it("requires a reshipper role for settings, requests and confirmations", async () => {
    for (const [path, method] of [
      ["/reshipper/gb/G/onward-payments", "GET"], ["/reshipper/gb/G/onward-payments/settings", "PUT"],
      ["/reshipper/gb/G/orders/O/onward-payments", "POST"], ["/reshipper/gb/G/orders/O/onward-payments/R/confirm", "POST"],
    ]) expect((await call(path, method, { "x-user": "member" }, method === "GET" ? undefined : {})).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled(); expect(mocks.manage).not.toHaveBeenCalled();
  });
  it("uses separate reshipper-owned settings and private response caching", async () => {
    const body = { walletAddress: "specific-onward-wallet" };
    const r = await call("/reshipper/gb/G/onward-payments/settings", "PUT", { "x-reshipper": "resh" }, body);
    expect(r.status).toBe(200); expect(r.headers.get("cache-control")).toContain("no-store");
    expect(mocks.settings).toHaveBeenCalledWith("G", { username: "resh" }, body);
  });
  it("passes exact group and order ownership to every management action", async () => {
    for (const action of ["confirm", "reject", "cancel"]) {
      expect((await call(`/reshipper/gb/G/orders/O/onward-payments/R/${action}`, "POST", { "x-reshipper": "resh" }, { reason: "Wrong amount" })).status).toBe(200);
      expect(mocks.manage).toHaveBeenLastCalledWith("G", "O", "R", { username: "resh" }, action, "Wrong amount");
    }
  });
  it("requires member identity before payment submission or verification", async () => {
    expect((await call("/orders/O/onward-payments/R/submit", "POST", {}, { txHash: "abc" })).status).toBe(401);
    expect((await call("/orders/O/onward-payments/R/verify", "POST", {}, {})).status).toBe(401);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect((await call("/orders/O/onward-payments/R/submit", "POST", { "x-user": "member" }, { txHash: "abc" })).status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith("O", "R", { username: "member" }, "abc");
  });
  it("authorizes member ownership before invoking provider verification", async () => {
    mocks.read.mockRejectedValue(new OnwardDeliveryError("This is not your order.", 403));
    expect((await call("/orders/O/onward-payments/R/verify", "POST", { "x-user": "other" }, {})).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("retains manager scope and does not install role auth on sibling paths", async () => {
    expect((await call("/admin/group-buys/G/orders/O/onward-payments", "GET", { "x-admin": "yes" })).status).toBe(200);
    expect(mocks.read).toHaveBeenLastCalledWith("O", { username: "admin", admin: true }, "admin", "G");
    expect((await call("/organiser/group-buys/G/orders/O/onward-payments", "GET", { "x-organiser": "lead" })).status).toBe(200);
    expect(mocks.read).toHaveBeenLastCalledWith("O", { username: "lead", admin: undefined, adminGbId: "G" }, "organiser", "G");
    expect((await call("/orders/O/onward-payments", "GET", { "x-user": "member" })).status).toBe(200);
  });
  it("rejects stale request ids before starting verification", async () => {
    expect((await call("/orders/O/onward-payments/OLD/verify", "POST", { "x-user": "member" }, {})).status).toBe(409);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("returns safe error messages without database detail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.list.mockRejectedValue(new Error("private SQL connection detail"));
    const r = await call("/reshipper/gb/G/onward-payments", "GET", { "x-reshipper": "resh" });
    expect(r.status).toBe(500); expect((await r.json() as any).error).not.toContain("SQL"); spy.mockRestore();
  });
});

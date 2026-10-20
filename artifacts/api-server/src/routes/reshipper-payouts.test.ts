import express from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(), groups: vi.fn(), record: vi.fn(), review: vi.fn(), reverse: vi.fn(),
}));
vi.mock("../lib/reshipper-payouts", () => ({
  readReshipperPayouts: mocks.read, listReshipperPayoutGroups: mocks.groups,
  recordReshipperPayout: mocks.record, reviewReshipperFees: mocks.review, voidReshipperPayout: mocks.reverse,
}));
vi.mock("../middleware/require-admin", () => ({
  // This is a boolean guard, NOT Express middleware. A successful guard does not call next().
  requireAdmin: (req: express.Request, res: express.Response) => {
    if (req.get("x-test-role") === "admin") { res.locals.adminUsername = "treasury-admin"; return true; }
    res.status(401).json({ error: "Unauthorized" }); return false;
  },
  getAdminUsername: (res: express.Response) => String(res.locals.adminUsername ?? "admin"),
}));
vi.mock("../middleware/require-reshipper", () => ({
  requireReshipper: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.get("x-test-role") !== "reshipper") { res.status(401).json({ error: "Authentication required" }); return; }
    req.reshipper = { telegramUsername: "authenticated-owner", reshipperStatus: "approved" }; next();
  },
}));
import router from "./reshipper-payouts";
import { PayoutError } from "../lib/reshipper-payout-rules";
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api", router);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { vi.clearAllMocks(); for (const mock of Object.values(mocks)) mock.mockResolvedValue({ orders: [], payouts: [] }); });
function request(path: string, role?: string, body?: unknown) {
  return fetch(base + path, {
    method: body ? "POST" : "GET", signal: AbortSignal.timeout(1800),
    headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("payout route boundaries", () => {
  it("allows Admin reads and writes only after the boolean guard succeeds", async () => {
    const result = await request("/api/admin/reshippers/target/gb/gb-1/payouts", "admin");
    expect(result.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("target", "gb-1");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts", "admin", { test: true })).status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith("target", "gb-1", { test: true }, "treasury-admin");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts/review", "admin", { test: true })).status).toBe(200);
    expect(mocks.review).toHaveBeenCalledWith("target", "gb-1", { test: true }, "treasury-admin");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts/receipt/void", "admin", { reason: "Incorrect receipt" })).status).toBe(200);
    expect(mocks.reverse).toHaveBeenCalledWith("target", "gb-1", "receipt", "Incorrect receipt", "treasury-admin");
  });
  it("rejects unauthenticated and reshipper callers on every Admin mutation", async () => {
    for (const suffix of ["", "/review", "/receipt/void"]) {
      for (const role of [undefined, "reshipper"]) expect((await request(`/api/admin/reshippers/target/gb/gb-1/payouts${suffix}`, role, { reason: "test" })).status).toBe(401);
    }
    expect(mocks.record).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled(); expect(mocks.reverse).not.toHaveBeenCalled();
  });
  it("derives reshipper ownership from authentication, never from a query parameter", async () => {
    expect((await request("/api/reshipper/gb/gb-1/payouts?username=victim", "reshipper")).status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("authenticated-owner", "gb-1");
    expect((await request("/api/reshipper/gb/gb-1/payouts", "reshipper", {})).status).toBe(404);
    expect((await request("/api/reshipper/gb/gb-1/payouts")).status).toBe(401);
  });
  it("returns financial errors without claiming payment was sent", async () => {
    mocks.read.mockRejectedValueOnce(new PayoutError("Not your group", 403));
    const result = await request("/api/reshipper/gb/gb-1/payouts", "reshipper");
    expect(result.status).toBe(403); expect(await result.json()).toEqual({ error: "Not your group" });
  });
});

import express from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(), groups: vi.fn(), record: vi.fn(), review: vi.fn(), reverse: vi.fn(),
  wallets: vi.fn(), check: vi.fn(), payoutWallet: vi.fn(),
  chainPrepare: vi.fn(), chainApprove: vi.fn(), chainSubmit: vi.fn(), chainCheck: vi.fn(), chainCancel: vi.fn(),
}));
vi.mock("../lib/reshipper-chain-payments", () => ({
  prepareReshipperChainPayment: mocks.chainPrepare, approveReshipperChainPayment: mocks.chainApprove,
  submitReshipperChainPayment: mocks.chainSubmit, checkReshipperChainPayment: mocks.chainCheck,
  cancelReshipperChainPayment: mocks.chainCancel,
}));
vi.mock("../lib/reshipper-payouts", () => ({
  readReshipperPayouts: mocks.read, listReshipperPayoutGroups: mocks.groups,
  recordReshipperPayout: mocks.record, reviewReshipperFees: mocks.review, voidReshipperPayout: mocks.reverse,
  saveCollectionWallet: mocks.wallets, checkReshipperCollectionWallets: mocks.check,
  saveReshipperPayoutWallet: mocks.payoutWallet,
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
    expect(mocks.read).toHaveBeenCalledWith("target", "gb-1", true);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts", "admin", { test: true })).status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith("target", "gb-1", { test: true }, "treasury-admin");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts/review", "admin", { test: true })).status).toBe(200);
    expect(mocks.review).toHaveBeenCalledWith("target", "gb-1", { test: true }, "treasury-admin");
    expect((await request("/api/admin/reshippers/target/gb/gb-1/payouts/receipt/void", "admin", { reason: "Incorrect receipt" })).status).toBe(200);
    expect(mocks.reverse).toHaveBeenCalledWith("target", "gb-1", "receipt", "Incorrect receipt", "treasury-admin");
  });
  it("rejects unauthenticated and reshipper callers on every Admin mutation", async () => {
    for (const suffix of ["", "/review", "/receipt/void", "/wallets", "/wallets/remove", "/check-wallets", "/payout-wallet",
      "/chain/prepare", "/chain/id/approve", "/chain/id/submit", "/chain/id/check", "/chain/id/cancel"]) {
      for (const role of [undefined, "reshipper"]) expect((await request(`/api/admin/reshippers/target/gb/gb-1/payouts${suffix}`, role, { reason: "test" })).status).toBe(401);
    }
    expect(mocks.record).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled(); expect(mocks.reverse).not.toHaveBeenCalled();
    expect(mocks.wallets).not.toHaveBeenCalled(); expect(mocks.check).not.toHaveBeenCalled();
  });
  it("uses the authenticated Admin actor for wallet declarations and bulk checks", async () => {
    await request("/api/admin/reshippers/target/gb/gb-1/payouts/wallets", "admin", { collector: "admin" });
    expect(mocks.wallets).toHaveBeenCalledWith("target", "gb-1", { collector: "admin" }, "treasury-admin");
    await request("/api/admin/reshippers/target/gb/gb-1/payouts/wallets/remove", "admin", { confirmed: true });
    expect(mocks.wallets).toHaveBeenCalledWith("target", "gb-1", { confirmed: true }, "treasury-admin", true);
    await request("/api/admin/reshippers/target/gb/gb-1/payouts/check-wallets", "admin", { orderIds: ["o1"] });
    expect(mocks.check).toHaveBeenCalledWith("target", "gb-1", { orderIds: ["o1"] }, "treasury-admin");
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
  it("saves payout destinations only through authenticated Admin", async () => {
    const body = { address: `0x${"a".repeat(40)}`, network: "ERC-20" };
    const path = "/api/admin/reshippers/kai/gb/gb-1/payouts/payout-wallet";
    expect((await request(path, "reshipper", body)).status).toBe(401);
    expect(mocks.payoutWallet).not.toHaveBeenCalled();
    expect((await request(path, "admin", body)).status).toBe(200);
    expect(mocks.payoutWallet).toHaveBeenCalledWith("kai", "gb-1", body, "treasury-admin");
  });
  it("lets an authenticated reshipper save only their own wallet and requests a private response", async () => {
    const path = "/api/reshipper/gb/gb-1/payouts/payout-wallet";
    const body = { address: `0x${"a".repeat(40)}`, network: "ERC-20", username: "another-reshipper" };
    expect((await request(path, undefined, body)).status).toBe(401);
    expect(mocks.payoutWallet).not.toHaveBeenCalled();
    expect((await request(path, "reshipper", body)).status).toBe(200);
    expect(mocks.payoutWallet).toHaveBeenCalledWith("authenticated-owner", "gb-1", body, "reshipper:authenticated-owner", false);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
  });
  it("uses authenticated Admin identity for each connected payment action", async () => {
    const base = "/api/admin/reshippers/target/gb/gb-1/payouts/chain";
    const body = { test: true };
    expect((await request(`${base}/prepare`, "admin", body)).status).toBe(200);
    expect(mocks.chainPrepare).toHaveBeenCalledWith("target", "gb-1", body, "treasury-admin");
    for (const [action, mock] of [["approve", mocks.chainApprove], ["submit", mocks.chainSubmit], ["check", mocks.chainCheck], ["cancel", mocks.chainCancel]] as const) {
      expect((await request(`${base}/payment-id/${action}`, "admin", body)).status).toBe(200);
      expect(mock).toHaveBeenCalledWith("target", "gb-1", "payment-id", ...(action === "submit" ? [body] : []), "treasury-admin");
    }
    expect((await request("/api/reshipper/gb/gb-1/payouts/chain/prepare", "reshipper", body)).status).toBe(404);
  });
});

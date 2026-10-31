import { describe, it, expect, vi, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ wallets: [] as unknown[], fail: false }));
vi.mock("../middleware/vendor-auth", () => ({
  requireVendorAccount: (req: any, res: any, next: any) => {
    if (req.get("x-test-vendor") !== "yes")
      return res.status(401).json({ error: "Vendor login required" });
    req.vendor = { vendorId: "own", username: "own" };
    next();
  },
}));
vi.mock("./vendor-wallets", () => ({
  getVendorWallets: async () => {
    if (state.fail) throw new Error("Unavailable");
    return state.wallets;
  },
  saveVendorWallets: vi.fn(),
}));
import { vendorWalletSetupGate } from "../routes/vendor-wallets";
let server: Server;
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});
describe("required vendor wallet setup", () => {
  it("blocks order access until setup, permits setup routes and fails closed on outages", async () => {
    const app = express();
    app.use("/vendor", vendorWalletSetupGate);
    app.use((_req, res) => res.json({ ok: true }));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const request = (path: string, signed = true) =>
      fetch(base + path, { headers: signed ? { "x-test-vendor": "yes" } : {} });
    expect((await request("/vendor/orders", false)).status).toBe(401);
    const blocked = await request("/vendor/orders");
    expect(blocked.status).toBe(403);
    expect(((await blocked.json()) as any).error).toBe(
      "vendor_wallet_required",
    );
    for (const path of [
      "/vendor/wallets",
      "/vendor/settings",
      "/vendor/security",
      "/vendor/auth/session",
    ])
      expect((await request(path)).status).toBe(200);
    state.wallets = [{ id: "own" }];
    expect((await request("/vendor/orders")).status).toBe(200);
    state.fail = true;
    expect((await request("/vendor/orders")).status).toBe(503);
  });
});

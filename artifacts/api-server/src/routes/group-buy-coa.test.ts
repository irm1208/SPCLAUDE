import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
const calls = vi.hoisted(() => ({
  member: vi.fn().mockResolvedValue({ eligible: true }),
  admin: vi.fn().mockResolvedValue({
    requests: [{ groupName: "Synthetic", orderCode: "=CMD()", member: "test", client: "@formula", internalNotes: "Admin only" }],
  }),
  save: vi.fn().mockResolvedValue({ eligible: true }),
}));
vi.mock("@workspace/db", async () => ({
  ...await import("../../../../lib/db/src/schema"),
  db: { select: () => ({ from: () => ({ where: async () => [] }) }) },
}));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-member"]) return res.status(401).json({ error: "Authentication required" });
    req.account = { telegramUsername: req.headers["x-test-member"] }; next();
  },
}));
vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => {
    if (req.headers["x-test-admin"] === "yes") return true;
    res.status(401).json({ error: "Unauthorized" }); return false;
  },
  getAdminUsername: () => "synthetic-admin",
  requireAdminStepUp: () => true,
}));
vi.mock("../lib/group-buy-coa", () => ({
  getMemberCoa: calls.member, saveMemberCoa: calls.save,
  adminCoaList: calls.admin, availableCoaRails: async () => [],
  saveCoaSettings: vi.fn(), inviteCoa: vi.fn(), coaPaymentInstructions: vi.fn(),
  submitCoaPayment: vi.fn(), withdrawCoa: vi.fn(), manageCoa: vi.fn(),
}));
import router from "./group-buy-coa";
let server: Server;
let base: string;
beforeAll(async () => {
  const app = express(); app.set("trust proxy", 1); app.use(express.json()); app.use("/api", router);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); });

describe("COA route boundaries and export", () => {
  it.each([
    ["GET", "/orders/o1/coa"], ["POST", "/orders/o1/coa"],
    ["POST", "/orders/o1/coa/payment-instructions"], ["POST", "/orders/o1/coa/payment"],
    ["POST", "/orders/o1/coa/withdraw"], ["GET", "/admin/coa"], ["GET", "/admin/coa/rails"],
    ["GET", "/admin/coa/export.csv"], ["PUT", "/admin/group-buys/g1/coa/settings"],
    ["POST", "/admin/group-buys/g1/coa/invite"], ["PATCH", "/admin/coa/r1"],
  ])("rejects unauthenticated %s %s", async (method, path) => {
    expect((await fetch(base + path, { method })).status).toBe(401);
  });
  it("uses the session owner, never a member name from the request body or query", async () => {
    await fetch(base + "/orders/o1/coa?username=other", { headers: { "x-test-member": "owner" } });
    expect(calls.member).toHaveBeenLastCalledWith("o1", "owner");
    await fetch(base + "/orders/o1/coa", { method: "POST", headers: { "x-test-member": "owner", "Content-Type": "application/json" },
      body: JSON.stringify({ username: "other", client: "Synthetic" }) });
    expect(calls.save).toHaveBeenLastCalledWith("o1", "owner", { username: "other", client: "Synthetic" });
  });
  it("never allows a member session to read the Admin queue or CSV", async () => {
    for (const path of ["/admin/coa", "/admin/coa/export.csv"])
      expect((await fetch(base + path, { headers: { "x-test-member": "owner" } })).status).toBe(401);
  });
  it("exports the exact filters and neutralises spreadsheet formulas", async () => {
    const response = await fetch(base + "/admin/coa/export.csv?groupBuyId=g1&batch=lot&search=owner&status=paid", { headers: { "x-test-admin": "yes" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const csv = await response.text();
    expect(csv).toContain(`"'=CMD()"`);
    expect(csv).toContain(`"'@formula"`);
    expect(csv).toContain("Admin only");
    expect(calls.admin).toHaveBeenLastCalledWith({ groupBuyId: "g1", batch: "lot", search: "owner", status: "paid" });
  });
});

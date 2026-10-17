import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { GroupUpdateError } from "../lib/group-buy-updates-model";
import { OnwardDeliveryError, suppliedEuMatrix } from "../lib/gb-onward-delivery-rules";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(), save: vi.fn(), preview: vi.fn(), estimate: vi.fn(), choice: vi.fn(),
}));
vi.mock("../lib/gb-onward-delivery", () => ({
  onwardSettings: mocks.settings, saveOnwardMatrix: mocks.save,
  memberOnwardPreview: mocks.preview, onwardOrderEstimate: mocks.estimate, changeOnwardChoice: mocks.choice,
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-user"]) return res.status(401).json({ error: "Sign in" });
    req.account = { telegramUsername: req.headers["x-test-user"] }; next();
  },
}));
vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (req: any, res: any) => req.headers["x-test-admin"] === "yes" || (res.status(401).json({ error: "Unauthorized" }), false),
}));
vi.mock("../middleware/require-organiser", () => ({
  requireOrganiser: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-organiser"]) return res.status(401).json({ error: "Sign in" });
    req.organiser = { telegramUsername: req.headers["x-test-organiser"], adminGbId: req.headers["x-test-gb"] }; next();
  },
}));
vi.mock("../middleware/require-reshipper", () => ({
  requireReshipper: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-reshipper"]) return res.status(401).json({ error: "Sign in" });
    req.reshipper = { telegramUsername: req.headers["x-test-reshipper"] }; next();
  },
}));
import router from "./gb-onward-delivery";

describe("onward-delivery HTTP boundaries", () => {
  let server: Server, base: string;
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use(router);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings.mockResolvedValue({ reshippers: [] });
    mocks.save.mockResolvedValue({ matrix: suppliedEuMatrix() });
    mocks.preview.mockResolvedValue({ status: "unassigned", options: [] });
    mocks.estimate.mockResolvedValue({ status: "available", options: [] });
    mocks.choice.mockResolvedValue({ status: "available", selectedMethod: "pickup" });
  });
  const request = (path: string, method = "GET", headers: Record<string, string> = {}, body?: unknown) =>
    fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

  it("never lets a public visitor read or mutate settings", async () => {
    expect((await request("/admin/group-buys/G/onward-delivery")).status).toBe(401);
    expect((await request("/organiser/group-buys/G/onward-delivery/r", "PUT", {}, suppliedEuMatrix())).status).toBe(401);
    expect(mocks.settings).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("routes reshipper matrix edits through the self-only ownership guard", async () => {
    expect((await request("/reshipper/gb/G/onward-delivery")).status).toBe(401);
    const headers = { "x-test-reshipper": "resh" };
    expect((await request("/reshipper/gb/G/onward-delivery", "GET", headers)).status).toBe(200);
    expect(mocks.settings).toHaveBeenCalledWith("G", { username: "resh" }, true);
    const matrix = suppliedEuMatrix();
    expect((await request("/reshipper/gb/G/onward-delivery/resh", "PUT", headers, matrix)).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("G", "resh", { username: "resh" }, matrix, true);
  });
  it("requires member auth for previews and saved choices", async () => {
    expect((await request("/group-buys/G/onward-delivery/estimate", "POST", {}, { kits: 1 })).status).toBe(401);
    expect((await request("/orders/O/onward-delivery")).status).toBe(401);
    expect((await request("/orders/O/onward-delivery", "PUT", {}, { method: "home" })).status).toBe(401);
  });
  it("exposes all 27 supplied rows and explicit currencies to an authenticated Admin", async () => {
    const response = await request("/admin/group-buys/G/onward-delivery", "GET", { "x-test-admin": "yes" });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json() as any; expect(body.template.rates).toHaveLength(27);
    expect(body.countries).toHaveLength(27); expect(body.currencies).toContain("USD");
    expect(mocks.settings).toHaveBeenCalledWith("G", { username: "admin", admin: true }, false);
  });
  it("passes organiser ownership and scoped admin identity into matrix writes", async () => {
    const matrix = suppliedEuMatrix();
    expect((await request("/organiser/group-buys/G/onward-delivery/resh", "PUT", { "x-test-organiser": "lead", "x-test-gb": "G" }, matrix)).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("G", "resh", { username: "lead", admin: undefined, adminGbId: "G" }, matrix, false);
  });
  it("returns forbidden for cross-group manager access", async () => {
    mocks.settings.mockRejectedValue(new GroupUpdateError("You do not manage this group buy.", 403));
    expect((await request("/organiser/group-buys/G/onward-delivery", "GET", { "x-test-organiser": "other" })).status).toBe(403);
  });
  it("does not allow reshipper routes without role auth", async () => {
    expect((await request("/reshipper/gb/G/orders/O/onward-delivery", "GET", { "x-test-user": "member" })).status).toBe(401);
    expect((await request("/reshipper/gb/G/orders/O/onward-delivery", "GET", { "x-test-reshipper": "resh" })).status).toBe(200);
    expect(mocks.estimate).toHaveBeenCalledWith("O", { username: "resh" }, "reshipper", "G");
  });
  it("supplies exact group scope for manager order estimates", async () => {
    expect((await request("/admin/group-buys/G/orders/O/onward-delivery", "GET", { "x-test-admin": "yes" })).status).toBe(200);
    expect(mocks.estimate).toHaveBeenCalledWith("O", { username: "admin", admin: true }, "admin", "G");
  });
  it("requires an explicit choice but permits clearing it", async () => {
    expect((await request("/orders/O/onward-delivery", "PUT", { "x-test-user": "member" }, {})).status).toBe(400);
    expect(mocks.choice).not.toHaveBeenCalled();
    expect((await request("/orders/O/onward-delivery", "PUT", { "x-test-user": "member" }, { method: null })).status).toBe(200);
    expect(mocks.choice).toHaveBeenCalledWith("O", { username: "member" }, null);
  });
  it("returns a meaningful conflict for unavailable or dispatched choices", async () => {
    mocks.choice.mockRejectedValue(new OnwardDeliveryError("Delivery preferences cannot be changed after dispatch.", 409));
    const response = await request("/orders/O/onward-delivery", "PUT", { "x-test-user": "member" }, { method: "pickup" });
    expect(response.status).toBe(409); expect((await response.json() as any).error).toContain("dispatch");
  });
  it("does not leak arbitrary server errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.estimate.mockRejectedValue(new Error("private database details"));
    const response = await request("/orders/O/onward-delivery", "GET", { "x-test-user": "member" });
    expect(response.status).toBe(500); expect((await response.json() as any).error).not.toContain("database");
    log.mockRestore();
  });
});

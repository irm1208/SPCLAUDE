import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import { createVendorAuthRouter } from "../routes/vendor-auth";
import { createVendorAuthentication } from "../middleware/vendor-auth";
import type { VendorAccountStore } from "./vendor-account-store";

describe("dedicated vendor identities", () => {
  const accounts = new Map<string, any>(), sessions = new Map<string, any>();
  const store: VendorAccountStore = {
    getAccount: async username => accounts.get(username) ?? null,
    createAccount: async account => { if (accounts.has(account.username)) return null; accounts.set(account.username, account); return account; },
    listAccounts: async () => [...accounts.values()],
    createSession: async (account, session) => { const current = accounts.get(account.username); if (!current || current.passwordHash !== account.passwordHash || current.status === "disabled") return false; sessions.set(session.tokenHash, session); return true; },
    getSession: async (hash, now) => { const session = sessions.get(hash); const account = session && accounts.get(session.username); return session && account && session.expiresAt > now ? { session, account } : null; },
    deleteSession: async hash => { sessions.delete(hash); },
    updateAccount: async (username, changes) => { const account = accounts.get(username); if (!account) return null; Object.assign(account, changes); for (const [hash, s] of sessions) if (s.username === username) sessions.delete(hash); return account; },
  };
  let server: Server, base: string;
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use(cookieParser());
    app.use(createVendorAuthRouter(store, { rateLimit: false }));
    const auth = createVendorAuthentication(store);
    app.get("/protected", auth.active, (req, res) => res.json({ username: req.vendor!.username, vendorId: req.vendor!.vendorId }));
    app.post("/protected", auth.active, (_req, res) => res.json({ ok: true }));
    server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
  async function request(path: string, method = "GET", body?: unknown, cookie = "", csrf = "") {
    return fetch(base + path, { method, headers: { origin: base, cookie, ...(body ? { "content-type": "application/json" } : {}), ...(csrf ? { "x-vendor-csrf": csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  let cookie = "", csrf = "";
  it("creates a pending vendor account without a member identity or email", async () => {
    const r = await request("/vendor/auth/signup", "POST", { username: "SeparateVendor", password: "vendor-password-123", companyName: "Vendor Ltd" });
    expect(r.status).toBe(201);
    const data = await r.json() as { account: { username: string; status: string; email: string | null }; csrfToken: string }; expect(data.account.username).toBe("separatevendor"); expect(data.account.status).toBe("pending"); expect(data.account.email).toBeNull();
    expect(JSON.stringify(data)).not.toContain("passwordHash");
    cookie = r.headers.get("set-cookie")!.split(";")[0]; csrf = data.csrfToken;
    expect(cookie).toMatch(/^peps_vendor_session=/); expect(r.headers.get("set-cookie")).toContain("HttpOnly"); expect(r.headers.get("set-cookie")).not.toMatch(/Domain=/i);
    expect(accounts.get("separatevendor").passwordHash).not.toBe("vendor-password-123");
    expect((await request("/protected", "GET", undefined, cookie)).status).toBe(403);
  });
  it("accepts only its own session cookie and requires CSRF for changes", async () => {
    accounts.get("separatevendor").status = "active"; accounts.get("separatevendor").vendorId = "vendor-a";
    expect((await request("/protected", "GET", undefined, cookie)).status).toBe(200);
    expect((await request("/protected", "GET", undefined, cookie.replace("peps_vendor_session", "account_session"))).status).toBe(401);
    expect((await request("/protected", "POST", {}, cookie)).status).toBe(403);
    expect((await request("/protected", "POST", {}, cookie, csrf)).status).toBe(200);
    const foreign = await fetch(base + "/protected", { method: "POST", headers: { origin: "https://saltandpeps.co.uk", cookie, "x-vendor-csrf": csrf } });
    expect(foreign.status).toBe(403);
  });
  it("restores CSRF, logs out and revokes the old session", async () => {
    const r = await request("/vendor/auth/session", "GET", undefined, cookie); const data = await r.json() as { account: { username: string; status: string; email: string | null }; csrfToken: string }; expect(data.csrfToken).toBe(csrf);
    expect((await request("/vendor/auth/logout", "POST", {}, cookie, csrf)).status).toBe(200);
    expect((await request("/protected", "GET", undefined, cookie)).status).toBe(401);
  });
  it("login rejects member credentials, wrong passwords and disabled accounts", async () => {
    expect((await request("/vendor/auth/login", "POST", { username: "member-only", password: "member-password" })).status).toBe(401);
    expect((await request("/vendor/auth/login", "POST", { username: "separatevendor", password: "wrong" })).status).toBe(401);
    const r = await request("/vendor/auth/login", "POST", { username: "separatevendor", password: "vendor-password-123", rememberMe: true });
    expect(r.status).toBe(200); cookie = r.headers.get("set-cookie")!.split(";")[0];
    await store.updateAccount("separatevendor", { status: "disabled" });
    expect((await request("/protected", "GET", undefined, cookie)).status).toBe(401);
    expect((await request("/vendor/auth/login", "POST", { username: "separatevendor", password: "vendor-password-123" })).status).toBe(401);
  });
  it("does not allow cross-site signup or invalid passwords", async () => {
    const r = await fetch(base + "/vendor/auth/signup", { method: "POST", headers: { origin: "https://attacker.test", "content-type": "application/json" }, body: JSON.stringify({ username: "attacker", password: "vendor-password-123", companyName: "Bad" }) });
    expect(r.status).toBe(403);
    expect((await request("/vendor/auth/signup", "POST", { username: "abc", password: "short", companyName: "Vendor" })).status).toBe(400);
  });
});

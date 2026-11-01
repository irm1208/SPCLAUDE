import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createTestmedaddyRouter } from "./index";
import { schemaDDL } from "./schema.fixture";

// Opt-in: creates/drops ONLY its own random test schema, never public tables.
describe.runIf(process.env.TMD_DB_TESTS === "1")("Testmedaddy core — real PostgreSQL/HTTP", () => {
  const schema = `tmd_test_${randomUUID().replace(/-/g, "")}`;
  let admin: pg.Pool, database: pg.Pool, server: Server, base: string;
  let owner: any, member: any, other: any;
  async function call(method: string, path: string, body?: unknown, actor?: any, extra: Record<string, string> = {}) {
    const response = await fetch(`${base}/api/tmd${path}`, {
      method, headers: { origin: base, ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(actor ? { cookie: actor.cookie, "x-tmd-csrf": actor.csrfToken } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: any = await response.json();
    return { status: response.status, data, cookie: response.headers.get("set-cookie")?.split(";")[0], setCookie: response.headers.get("set-cookie") };
  }
  async function signup(handle: string) {
    const response = await call("POST", "/auth/signup", { email: `${handle}@example.invalid`, handle, displayName: handle, password: "Synthetic-test-password-123!" });
    expect(response.status).toBe(200);
    return { ...response.data, cookie: response.cookie };
  }
  const draft = (changes: Record<string, unknown> = {}) => ({
    title: "Test batch purity", description: "Test-only estimate", labName: "Independent lab", visibility: "public",
    splitMode: "even", minMembers: 1, maxMembers: null, shippingUsd: 10, organiserTipUsd: 5,
    items: [{ testType: "Purity", priceUsd: 100.01, quantity: 2 }], ...changes,
  });
  async function newPool(changes: Record<string, unknown> = {}, publish = true) {
    const response = await call("POST", "/pools", draft(changes), owner);
    expect(response.status).toBe(201);
    const pool = response.data.pool;
    if (publish) expect((await call("POST", `/pools/${pool.id}/status`, { status: "open" }, owner)).status).toBe(200);
    return pool;
  }
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("TMD_DB_TESTS requires the development database.");
    admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    database = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public`, max: 12 });
    await database.query(schemaDDL);
    const app = express();
    app.use(express.json());
    app.use("/api/tmd", createTestmedaddyRouter(database));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    owner = await signup("tmdowner");
    member = await signup("tmdmember");
    other = await signup("tmdother");
  }, 30000);
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    if (database) await database.end();
    if (admin) {
      if (!/^tmd_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe cleanup schema.");
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });
  it("keeps independent credentials private, normalizes identities and rejects duplicate signup", async () => {
    expect((await call("GET", "/auth/session", undefined, owner)).data.user.id).toBe(owner.user.id);
    expect((await call("GET", "/auth/session", undefined, undefined, { cookie: "account_session=other-product-token" })).data.user).toBeNull();
    expect(JSON.stringify(owner.user)).not.toContain("password");
    const duplicate = await call("POST", "/auth/signup", { email: "TMDOWNER@example.invalid", handle: "differenthandle", displayName: "Different", password: "Synthetic-test-password-123!" });
    expect(duplicate.status).toBe(409);
    const stored = (await database.query("SELECT password_hash FROM tmd_users WHERE id=$1", [owner.user.id])).rows[0];
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);
  });
  it("signs in by handle/email and restores a secure persistent session", async () => {
    const wrong = await call("POST", "/auth/login", { email: "tmdowner", password: "Wrongpassword123!" });
    expect(wrong.status).toBe(401);
    for (const email of ["TMDOWNER", "tmdowner@example.invalid"]) {
      const result = await call("POST", "/auth/login", { email, password: "Synthetic-test-password-123!", rememberMe: true });
      expect(result.status).toBe(200);
      expect(result.setCookie).toContain("HttpOnly");
      expect(result.setCookie).toContain("Secure");
      expect(result.setCookie).toContain("SameSite=None");
      expect(result.setCookie).toContain("Partitioned");
      expect((await call("GET", "/auth/session", undefined, { cookie: result.cookie, csrfToken: result.data.csrfToken })).data.user.id).toBe(owner.user.id);
    }
  });
  it("requires authentication, CSRF and an exact same-origin for writes", async () => {
    expect((await call("POST", "/pools", draft())).status).toBe(401);
    expect((await call("GET", "/me/pools")).status).toBe(401);
    expect((await call("POST", "/pools", draft(), owner, { "x-tmd-csrf": "" })).status).toBe(403);
    expect((await call("POST", "/pools", draft(), owner, { origin: "https://evil.invalid" })).status).toBe(403);
    expect((await call("POST", "/auth/signup", {}, undefined, { origin: "null" })).status).toBe(403);
  });
  it("keeps draft/private management and changes restricted to the organiser", async () => {
    const pool = await newPool({}, false);
    expect((await call("GET", `/pools/${pool.slug}`)).status).toBe(404);
    expect((await call("GET", "/pools")).data.pools.some((p: any) => p.id === pool.id)).toBe(false);
    expect((await call("GET", `/pools/manage/${pool.id}`, undefined, member)).status).toBe(404);
    expect((await call("PATCH", `/pools/${pool.id}`, draft(), member)).status).toBe(404);
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "open" }, member)).status).toBe(404);
    expect((await call("GET", "/me/pools", undefined, member)).data.pools).toEqual([]);
  });
  it("publishes, searches, edits and returns server-derived estimates, never paid/funded claims", async () => {
    const pool = await newPool({ title: "Searchable unique title", minMembers: 3 });
    const result = await call("GET", "/pools?q=Searchable&status=open");
    expect(result.data.pools).toHaveLength(1);
    expect(result.data.pools[0].shareUsd).toBe(71.68);
    const edited = await call("PATCH", `/pools/${pool.id}`, draft({ title: "Updated testing plan" }), owner);
    expect(edited.status).toBe(200);
    expect((await call("GET", `/pools/${pool.slug}`)).data.pool.title).toBe("Updated testing plan");
    expect(edited.data.pool.progress.funded).toBe(false);
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "funded" }, owner)).status).toBe(400);
    expect((await call("POST", "/pools", { ...draft(), paymentMethods: {} }, owner)).status).toBe(400);
  });
  it("makes repeated/concurrent joins idempotent", async () => {
    const pool = await newPool();
    const responses = await Promise.all(Array.from({ length: 6 }, () => call("POST", `/pools/${pool.slug}/join`, {}, member)));
    expect(responses.every(response => response.status === 200)).toBe(true);
    expect(new Set(responses.map(response => response.data.id)).size).toBe(1);
    const detail = await call("GET", `/pools/${pool.slug}`, undefined, member);
    expect(detail.data.members).toHaveLength(1);
    expect(detail.data.viewer.membership.userId).toBe(member.user.id);
    expect((await call("GET", "/me/contributions", undefined, member)).data.contributions.some((c: any) => c.pool.id === pool.id)).toBe(true);
  });
  it("serializes the last available place against simultaneous members", async () => {
    const pool = await newPool({ maxMembers: 1 });
    const results = await Promise.all([member, other].map(actor => call("POST", `/pools/${pool.slug}/join`, {}, actor)));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await call("GET", `/pools/${pool.slug}`)).data.members).toHaveLength(1);
  });
  it("gates invite pools without exposing access-code hashes or private identities", async () => {
    const pool = await newPool({ visibility: "invite", accessCode: "invite-test-code" });
    expect((await call("GET", `/pools/${pool.slug}`)).status).toBe(401);
    expect((await call("GET", `/pools/${pool.slug}`, undefined, undefined, { "x-tmd-access-code": "wrong" })).status).toBe(401);
    const detail = await call("GET", `/pools/${pool.slug}`, undefined, undefined, { "x-tmd-access-code": "invite-test-code" });
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.data)).not.toMatch(/invite-test-code|access_code_hash|password_hash|@example.invalid/);
    const joined = await call("POST", `/pools/${pool.slug}/join`, { anonymous: true }, member, { "x-tmd-access-code": "invite-test-code" });
    expect(joined.status).toBe(200);
    expect((await call("GET", `/pools/${pool.slug}`, undefined, member)).status).toBe(200);
    const outsider = await call("GET", `/pools/${pool.slug}`, undefined, other, { "x-tmd-access-code": "invite-test-code" });
    expect(outsider.data.members[0].displayName).toBe("Anonymous");
    expect(outsider.data.members[0]).not.toHaveProperty("userId");
  });
  it("does not list unlisted pools or allow a nonmember to leave another membership", async () => {
    const pool = await newPool({ visibility: "unlisted" });
    expect((await call("GET", "/pools")).data.pools.some((p: any) => p.id === pool.id)).toBe(false);
    expect((await call("GET", `/pools/${pool.slug}`)).status).toBe(200);
    const joined = await call("POST", `/pools/${pool.slug}/join`, {}, member);
    expect((await call("POST", `/members/${joined.data.id}/leave`, {}, other)).status).toBe(404);
    expect((await call("POST", `/members/${joined.data.id}/leave`, {}, member)).status).toBe(200);
  });
  it("protects member limits and refreshes estimates on edits", async () => {
    const pool = await newPool();
    await call("POST", `/pools/${pool.slug}/join`, {}, member);
    await call("POST", `/pools/${pool.slug}/join`, {}, other);
    expect((await call("PATCH", `/pools/${pool.id}`, draft({ maxMembers: 1 }), owner)).status).toBe(409);
    expect((await call("PATCH", `/pools/${pool.id}`, draft({ splitMode: "fixed", fixedShareUsd: 25 }), owner)).status).toBe(200);
    const detail = await call("GET", `/pools/${pool.slug}`, undefined, member);
    expect(detail.data.viewer.membership.amountUsd).toBe("25.00");
    expect(detail.data.pool.totals.verifiedUsd).toBe(0);
  });
  it("closes/reopens/cancels safely and enforces deadlines", async () => {
    const pool = await newPool();
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "closed" }, owner)).status).toBe(200);
    expect((await call("POST", `/pools/${pool.slug}/join`, {}, member)).status).toBe(409);
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "open" }, owner)).status).toBe(200);
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "cancelled" }, owner)).status).toBe(200);
    expect((await call("POST", `/pools/${pool.id}/status`, { status: "open" }, owner)).status).toBe(409);
    expect((await call("PATCH", `/pools/${pool.id}`, draft(), owner)).status).toBe(409);
    const expired = await newPool({ deadlineAt: new Date(Date.now() - 60000).toISOString() }, false);
    expect((await call("POST", `/pools/${expired.id}/status`, { status: "open" }, owner)).status).toBe(409);
  });
  it("revokes logout sessions and ignores expired sessions", async () => {
    const actor = await signup("logoutuser");
    const logout = await call("POST", "/auth/logout", {}, actor);
    expect(logout.status).toBe(200);
    expect(logout.setCookie).toContain("Partitioned");
    expect((await call("GET", "/auth/session", undefined, actor)).data.user).toBeNull();
    const actor2 = await signup("expireduser");
    await database.query("UPDATE tmd_sessions SET expires_at=now()-interval '1 hour' WHERE user_id=$1", [actor2.user.id]);
    expect((await call("GET", "/auth/session", undefined, actor2)).data.user).toBeNull();
  });
  it("updates only the current profile and rotates/revokes sessions on password changes", async () => {
    const actor = await signup("passworduser");
    const login = await call("POST", "/auth/login", { email: "passworduser", password: "Synthetic-test-password-123!" });
    expect((await call("PATCH", "/me", { displayName: "Updated name", bio: "Testing bio" }, actor)).data.user.displayName).toBe("Updated name");
    const changed = await call("POST", "/auth/change-password", { currentPassword: "Synthetic-test-password-123!", newPassword: "Changed-test-password-456!" }, actor);
    expect(changed.status).toBe(200);
    expect(changed.data.csrfToken).not.toBe(actor.csrfToken);
    expect((await call("GET", "/auth/session", undefined, actor)).data.user).toBeNull();
    expect((await call("GET", "/auth/session", undefined, { cookie: login.cookie, csrfToken: login.data.csrfToken })).data.user).toBeNull();
    expect((await call("GET", "/auth/session", undefined, { cookie: changed.cookie, csrfToken: changed.data.csrfToken })).data.user.displayName).toBe("Updated name");
  });
});

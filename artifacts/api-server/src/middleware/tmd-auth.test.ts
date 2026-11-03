import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";

// The middleware module imports the database for its default lookup; this test injects its own.
vi.mock("@workspace/db", () => ({ db: {}, tmdSessionsTable: {}, tmdUsersTable: {} }));
import { createTmdAuthentication, tmdTokenHash, tmdCsrfToken } from "./tmd-auth";

const TOKEN = "a".repeat(64);
const user: any = { id: "u1", status: "active", role: "member", handle: "jess" };
const lookup = async (hash: string) => (hash === tmdTokenHash(TOKEN) ? user : null);

let server: Server | null = null;
async function start() {
  const app = express();
  app.use(cookieParser());
  const auth = createTmdAuthentication(lookup);
  app.get("/required", auth.required, (req, res) => res.json({ id: req.tmdUser!.id }));
  app.post("/required", auth.required, (req, res) => res.json({ id: req.tmdUser!.id }));
  app.get("/optional", auth.optional, (req, res) => res.json({ id: req.tmdUser?.id ?? null }));
  app.post("/optional", auth.optional, (req, res) => res.json({ id: req.tmdUser?.id ?? null }));
  app.get("/admin", auth.admin, (_req, res) => res.json({ ok: true }));
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", () => resolve()); });
  const { port } = server!.address() as { port: number };
  return (path: string, init: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, init);
}
afterEach(() => { server?.close(); server = null; });

describe("tmd session middleware", () => {
  it("rejects anonymous requests on required routes and allows them on optional ones", async () => {
    const req = await start();
    expect((await req("/required")).status).toBe(401);
    expect(await (await req("/optional")).json()).toEqual({ id: null });
  });
  it("accepts a valid cookie on reads", async () => {
    const req = await start();
    const res = await req("/required", { headers: { cookie: `tmd_session=${TOKEN}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u1" });
    expect((await req("/required", { headers: { cookie: `tmd_session=${"b".repeat(64)}` } })).status).toBe(401);
  });
  it("requires same-origin plus the derived CSRF token on mutations, even for optional routes", async () => {
    const req = await start();
    const cookie = `tmd_session=${TOKEN}`;
    const origin = (res: Response) => res.headers.get("x-origin");
    const base = await req("/required", { headers: { cookie } });
    expect(base.status).toBe(200);
    void origin;
    const port = (server!.address() as { port: number }).port;
    const host = `127.0.0.1:${port}`;
    expect((await req("/required", { method: "POST", headers: { cookie } })).status).toBe(403);
    expect((await req("/required", { method: "POST", headers: { cookie, origin: `http://${host}` } })).status).toBe(403);
    expect((await req("/required", { method: "POST", headers: { cookie, origin: `http://evil.test`, "x-tmd-csrf": tmdCsrfToken(TOKEN) } })).status).toBe(403);
    expect((await req("/optional", { method: "POST", headers: { cookie } })).status).toBe(403);
    const ok = await req("/required", { method: "POST", headers: { cookie, origin: `http://${host}`, "x-tmd-csrf": tmdCsrfToken(TOKEN) } });
    expect(ok.status).toBe(200);
    // Anonymous mutation on an optional route needs no CSRF (guest joins rely on claim tokens instead).
    expect((await req("/optional", { method: "POST" })).status).toBe(200);
  });
  it("gates admin routes on the role", async () => {
    const req = await start();
    expect((await req("/admin", { headers: { cookie: `tmd_session=${TOKEN}` } })).status).toBe(403);
    user.role = "admin";
    expect((await req("/admin", { headers: { cookie: `tmd_session=${TOKEN}` } })).status).toBe(200);
    user.role = "member";
  });
});

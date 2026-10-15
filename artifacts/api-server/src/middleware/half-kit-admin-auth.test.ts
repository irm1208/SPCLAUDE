import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import { getTableName } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  twoFactorEnabled: true,
  validSession: true,
  events: [] as string[],
  writes: [] as unknown[],
  queries: [] as string[],
  release: vi.fn(),
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("../../../../lib/db/src/schema");
  class TestPool {
    options = {};
    async connect() {
      fixture.events.push("protect");
      return {
        query: async (query: string) => { fixture.queries.push(query); return { rows: [] }; },
        release: fixture.release,
      };
    }
  }
  return {
    ...schema,
    pool: new TestPool(),
    db: {
      select: () => ({
        from: (table: Parameters<typeof getTableName>[0]) => ({
          where: () => {
            const name = getTableName(table);
            if (name === "admin_security_settings") {
              fixture.events.push("authenticate");
              return Promise.resolve([{ id: 1, twoFactorEnabled: fixture.twoFactorEnabled }]);
            }
            if (name === "admin_sessions") return Promise.resolve(fixture.validSession ? [{
              id: "test-session",
              adminUserId: "test-admin",
              csrfTokenHash: createHash("sha256").update("test-csrf").digest("hex"),
              lastUsedAt: new Date(),
            }] : []);
            if (name === "admin_users") return Promise.resolve([{ id: "test-admin", username: "test-admin", active: true }]);
            if (name === "orders") {
              fixture.events.push("read-protected-order");
              return Promise.resolve([{ id: "test-order", groupBuyId: "test-group", username: "test-member" }]);
            }
            return { limit: async () => [], then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve) };
          },
        }),
      }),
    },
  };
});

import { adminAuthorizationMiddleware, requireAdmin } from "./require-admin";
import { halfKitProtection } from "./half-kit-protection";

const routes = readFileSync(new URL("../routes/index.ts", import.meta.url), "utf8");
let server: Server | undefined;
let base: string;

beforeEach(async () => {
  vi.stubEnv("ADMIN_SECRET", "test-only-shared-secret");
  fixture.validSession = true;
  fixture.twoFactorEnabled = true;
  fixture.events.length = 0;
  fixture.writes.length = 0;
  fixture.queries.length = 0;
  fixture.release.mockClear();
  const app = express();
  app.use(express.json(), cookieParser());
  // Exercise the real middleware in the order registered by the application.
  const mounts = [
    { position: routes.indexOf("router.use(halfKitProtection)"), path: "/", middleware: halfKitProtection },
    { position: routes.indexOf('router.use("/admin", adminAuthorizationMiddleware)'), path: "/admin", middleware: adminAuthorizationMiddleware },
  ];
  for (const mount of mounts.sort((a, b) => a.position - b.position)) {
    expect(mount.position).toBeGreaterThan(-1);
    app.use(mount.path, mount.middleware);
  }
  app.patch("/admin/orders/:id/routing", (req, res) => {
    if (!requireAdmin(req, res)) return;
    fixture.writes.push(req.body);
    res.json({ ok: true, ...req.body });
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server!.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind");
  base = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  }
  vi.unstubAllEnvs();
});

function route(headers: Record<string, string> = {}) {
  return fetch(`${base}/admin/orders/test-order/routing`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: base, ...headers },
    body: JSON.stringify({ routingType: "reshipper", reshipperUsername: "test-reshipper" }),
  });
}

describe("half-kit protection respects the admin-session boundary", () => {
  it("accepts an authenticated routing change and still acquires the half-kit money lock", async () => {
    const response = await route({ Cookie: "peps_admin_session=test-session", "x-admin-csrf": "test-csrf" });
    expect(response.status).toBe(200);
    expect(fixture.writes).toEqual([{ routingType: "reshipper", reshipperUsername: "test-reshipper" }]);
    expect(fixture.events[0]).toBe("authenticate");
    expect(fixture.events).toContain("protect");
    expect(fixture.queries.some(query => query.includes("pg_advisory_lock"))).toBe(true);
  });

  it("rejects a missing admin session before accessing protected orders or acquiring locks", async () => {
    expect((await route()).status).toBe(401);
    expect(fixture.events).toEqual(["authenticate"]);
    expect(fixture.writes).toEqual([]);
    expect(fixture.queries).toEqual([]);
  });

  it("rejects an expired session before the half-kit guard", async () => {
    fixture.validSession = false;
    const response = await route({ Cookie: "peps_admin_session=test-session", "x-admin-csrf": "test-csrf" });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "admin_session_expired" });
    expect(fixture.events).toEqual(["authenticate"]);
    expect(fixture.writes).toEqual([]);
  });

  it("rejects invalid CSRF even if a shared-secret header is supplied", async () => {
    const response = await route({
      Cookie: "peps_admin_session=test-session",
      "x-admin-csrf": "wrong-token",
      "x-admin-secret": "test-only-shared-secret",
    });
    expect(response.status).toBe(403);
    expect(fixture.events).toEqual(["authenticate"]);
    expect(fixture.writes).toEqual([]);
    expect(fixture.queries).toEqual([]);
  });

  it("also accepts disabled-2FA legacy sessions with valid CSRF", async () => {
    fixture.twoFactorEnabled = false;
    const response = await route({
      Cookie: "peps_admin_legacy_session=test-session; peps_admin_legacy_csrf=test-csrf",
      "x-admin-csrf": "test-csrf",
    });
    expect(response.status).toBe(200);
    expect(fixture.events[0]).toBe("authenticate");
    expect(fixture.events).toContain("protect");
    expect(fixture.writes).toHaveLength(1);
  });

  it("preserves the disabled-mode explicit shared-secret path", async () => {
    fixture.twoFactorEnabled = false;
    const response = await route({ "x-admin-secret": "test-only-shared-secret" });
    expect(response.status).toBe(200);
    expect(fixture.events[0]).toBe("authenticate");
    expect(fixture.events).toContain("protect");
    expect(fixture.writes).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({
  account: null as any,
  revoked: false,
  confirmation: { ok: false, reason: "invalid" } as any,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const db = {
    select: () => {
      let table = "";
      const query = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        where() { return query; },
        orderBy() { return query; },
        limit: async () => table === "accounts" ? [state.account] : table === "revoked_tokens" && state.revoked ? [{ jti: "revoked" }] : [],
        then(resolve: (rows: unknown[]) => unknown) {
          const rows = table === "accounts" ? [state.account] : table === "revoked_tokens" && state.revoked ? [{ jti: "revoked" }] : [];
          return Promise.resolve(rows).then(resolve);
        },
      };
      return query;
    },
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    delete: () => ({ where: async () => undefined }),
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
  };
  return { ...schema, db };
});
vi.mock("../lib/account-verification", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/account-verification")>(),
  confirmEmailChallenge: async () => {
    if (state.confirmation === "throw") throw new Error("verification failure");
    return state.confirmation;
  },
}));

import router from "./index";
import { getJwtSecret } from "../middleware/account-auth";

async function request(path: string, token: string) {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", router);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      method: path.includes("link-init") || path.includes("email/confirm") ? "POST" : "GET",
      headers: {
        Cookie: `account_session=${token}`,
        ...(path.includes("email/confirm") ? { "Content-Type": "application/json" } : {}),
      },
      body: path.includes("email/confirm") ? JSON.stringify({ code: "123456" }) : undefined,
    });
    return { status: response.status, body: await response.json(), setCookie: response.headers.get("set-cookie") };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function token(verificationRequired: boolean, jti = "valid") {
  return jwt.sign({ telegramUsername: "new-user", jti, verificationRequired }, getJwtSecret(), { expiresIn: "1h" });
}

describe("verification authentication boundary", () => {
  beforeEach(() => {
    state.account = {
      telegramUsername: "new-user", email: "new@example.com", verificationRequiredAt: new Date(),
      verifiedAt: null, emailVerifiedAt: null, telegramChatId: null, telegramNotifications: null,
    };
    state.revoked = false;
  });

  it("allows a restricted signed session only on verification and Telegram setup/status routes", async () => {
    const restricted = token(true);
    expect((await request("/account/verification/status", restricted)).status).toBe(200);
    expect((await request("/account/telegram/link-init", restricted)).status).toBe(200);
    expect((await request("/account/telegram/status", restricted)).status).toBe(200);
    expect((await request("/account/me", restricted)).body).toEqual({ error: "verification_required" });
  });

  it("rejects invalid and revoked cookies while unrestricted sessions remain valid", async () => {
    expect((await request("/account/verification/status", "invalid")).status).toBe(401);
    state.revoked = true;
    expect((await request("/account/verification/status", token(true, "revoked"))).status).toBe(401);
    state.revoked = false;
    state.account.verificationRequiredAt = null;
    expect((await request("/account/verification/status", token(false))).status).toBe(200);
  });

  it("does not set an unrestricted cookie when email confirmation fails or throws", async () => {
    const restricted = token(true);
    state.confirmation = { ok: false, reason: "invalid" };
    const rejected = await request("/account/verification/email/confirm", restricted);
    expect(rejected.status).toBe(400);
    expect(rejected.setCookie).toBeNull();

    state.confirmation = "throw";
    const failed = await request("/account/verification/email/confirm", restricted);
    expect(failed.status).toBe(400);
    expect(failed.setCookie).toBeNull();
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
      let accountMatches = true;
      const query = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        innerJoin() { return query; },
        where(condition: { queryChunks?: Array<{ value?: unknown }> }) {
          const identifier = condition.queryChunks?.find(chunk => typeof chunk.value === "string")?.value;
          if (table === "accounts" && typeof identifier === "string") {
            accountMatches = identifier === state.account?.telegramUsername;
          }
          return query;
        },
        orderBy() { return query; },
        limit: async () => table === "accounts" ? (state.account && accountMatches ? [{
          ...state.account,
          hasPassword: state.account.passwordHash != null,
          discordLinked: state.account.discordId != null,
        }] : []) : table === "revoked_tokens" && state.revoked ? [{ jti: "revoked" }] : [],
        then(resolve: (rows: unknown[]) => unknown) {
          const rows = table === "accounts" ? (state.account && accountMatches ? [{
            ...state.account,
            hasPassword: state.account.passwordHash != null,
            discordLinked: state.account.discordId != null,
          }] : []) : table === "revoked_tokens" && state.revoked ? [{ jti: "revoked" }] : [];
          return Promise.resolve(rows).then(resolve);
        },
      };
      return query;
    },
    update(table: unknown) {
      return {
        set(patch: Record<string, unknown>) {
          return {
            where: async () => {
              if (getTableName(table as never) === "accounts" && state.account) {
                Object.assign(state.account, patch);
              }
            },
          };
        },
      };
    },
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

async function request(
  path: string,
  token: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
) {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", router);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const body = options.body ?? (
      path.includes("email/confirm") ? { code: "123456" } : undefined
    );
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      method: options.method ?? (
        path.includes("link-init") || path.includes("email/confirm") ? "POST" : "GET"
      ),
      headers: {
        Cookie: `account_session=${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
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
      accountStatus: "active", passwordHash: null, discordId: null,
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

  it("returns credential booleans without exposing a password hash", async () => {
    state.account.verificationRequiredAt = null;
    state.account.discordId = "42";
    const absent = await request("/account/me", token(false));
    expect(absent.status).toBe(200);
    expect(absent.body).toMatchObject({ hasPassword: false, discordLinked: true });
    expect(absent.body).not.toHaveProperty("passwordHash");
    state.account.passwordHash = await bcrypt.hash("SafePassword9!", 4);
    const present = await request("/account/me", token(false));
    expect(present.body.hasPassword).toBe(true);
    expect(JSON.stringify(present.body)).not.toContain(state.account.passwordHash);
  });

  it("sets a first password without requesting a nonexistent current password", async () => {
    state.account.verificationRequiredAt = null;
    const result = await request("/account/set-password", token(false), {
      method: "POST", body: { password: "SafePassword9!" },
    });
    expect(result.status).toBe(200);
    expect(await bcrypt.compare("SafePassword9!", state.account.passwordHash)).toBe(true);
  });

  it("does not replace an existing password without the correct current password", async () => {
    state.account.verificationRequiredAt = null;
    state.account.passwordHash = await bcrypt.hash("OldPassword9!", 4);
    const originalHash = state.account.passwordHash;
    for (const currentPassword of [undefined, "WrongPassword9!"]) {
      const result = await request("/account/set-password", token(false), {
        method: "POST", body: { password: "NewPassword9!", currentPassword },
      });
      expect(result.status).toBe(currentPassword ? 401 : 400);
      expect(state.account.passwordHash).toBe(originalHash);
    }
  });

  it("accepts a site's chosen username and password through normal login", async () => {
    state.account.verificationRequiredAt = null;
    state.account.telegramUsername = "chosen_name";
    state.account.passwordHash = await bcrypt.hash("SafePassword9!", 4);
    const result = await request("/account/smart-login", token(false), {
      method: "POST",
      body: { telegramUsername: "chosen_name", credential: "SafePassword9!" },
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true, telegramUsername: "chosen_name", loginMethod: "password",
    });
    expect(result.setCookie).toContain("account_session=");
    const previousIdentifier = await request("/account/smart-login", token(false), {
      method: "POST",
      body: { telegramUsername: "discord:42", credential: "SafePassword9!" },
    });
    expect(previousIdentifier.status).toBe(401);
  });
});
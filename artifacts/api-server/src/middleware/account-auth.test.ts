import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const db = {
    select: () => ({ from: () => ({ where: async () => [] }) }),
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
    delete: () => ({ where: async () => undefined }),
  };
  return { ...actual, db };
});

import { getAccountCookieOptions, issueAccountCookie, requireAccount, requireAccountIdentity } from "./account-auth";

function response() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("account session authorization", () => {
  it("issues cross-site-compatible cookies in the Replit preview", () => {
    const previousReplId = process.env.REPL_ID;
    process.env.REPL_ID = "test-repl";
    try {
      const res = response();
      issueAccountCookie(res as never, "preview-user", { verificationRequired: false });
      expect(res.cookie.mock.calls[0][2]).toMatchObject({
        partitioned: true,
        secure: true,
        sameSite: "none",
      });
    } finally {
      if (previousReplId === undefined) delete process.env.REPL_ID;
      else process.env.REPL_ID = previousReplId;
    }
  });

  it("uses a first-party cookie in production even when REPL_ID is present", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousReplId = process.env.REPL_ID;
    process.env.NODE_ENV = "production";
    process.env.REPL_ID = "published-repl";
    try {
      expect(getAccountCookieOptions()).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousReplId === undefined) delete process.env.REPL_ID;
      else process.env.REPL_ID = previousReplId;
    }
  });

  it("stores an explicit restricted-session claim in newly issued cookies", () => {
    const res = response();
    issueAccountCookie(res as never, "new-user", { verificationRequired: true });
    const token = res.cookie.mock.calls[0][1] as string;
    expect(jwt.decode(token)).toMatchObject({ telegramUsername: "new-user", verificationRequired: true });
  });

  it("allows a restricted JWT to establish identity but rejects protected access", async () => {
    const tokenRes = response();
    issueAccountCookie(tokenRes as never, "new-user", { verificationRequired: true });
    const token = tokenRes.cookie.mock.calls[0][1] as string;
    const identityReq = { cookies: { account_session: token }, ip: "127.0.0.1" };
    const identityRes = response();
    const identityNext = vi.fn();
    await requireAccountIdentity(identityReq as never, identityRes as never, identityNext);
    expect(identityNext).toHaveBeenCalledOnce();
    expect((identityReq as any).account).toMatchObject({ verificationRequired: true });

    const protectedReq = { cookies: { account_session: token }, ip: "127.0.0.1" };
    const protectedRes = response();
    await requireAccount(protectedReq as never, protectedRes as never, vi.fn());
    expect(protectedRes.status).toHaveBeenCalledWith(403);
    expect(protectedRes.json).toHaveBeenCalledWith({ error: "verification_required" });
  });

  it("requires every ordinary account cookie issuer to use database-derived state", () => {
    const issuerRoutes = [
      "../routes/account.ts",
      "../routes/discord.ts",
      "../routes/wholesale-shares.ts",
      "../routes/admin.ts",
      "../routes/telegram.ts",
    ];
    for (const route of issuerRoutes) {
      const source = readFileSync(new URL(route, import.meta.url), "utf8");
      expect(source).toContain("issueAccountCookieForAccount");
      expect(source).not.toMatch(/issueAccountCookie\(res,/);
    }
    const authSource = readFileSync(new URL("./account-auth.ts", import.meta.url), "utf8");
    expect(authSource).toMatch(/options: \{ verificationRequired: boolean \}/);
    expect(authSource).toContain("verificationRequired: account.verificationRequiredAt !== null && account.verifiedAt === null");
  });
});
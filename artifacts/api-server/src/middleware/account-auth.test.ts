import jwt from "jsonwebtoken";
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

import { issueAccountCookie, requireAccount, requireAccountIdentity } from "./account-auth";

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
  it("stores an explicit restricted-session claim in newly issued cookies", () => {
    const res = response();
    issueAccountCookie(res as never, "new-user", true);
    const token = res.cookie.mock.calls[0][1] as string;
    expect(jwt.decode(token)).toMatchObject({ telegramUsername: "new-user", verificationRequired: true });
  });

  it("allows a restricted JWT to establish identity but rejects protected access", async () => {
    const tokenRes = response();
    issueAccountCookie(tokenRes as never, "new-user", true);
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
});
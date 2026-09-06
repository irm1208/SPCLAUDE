import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";

type Row = Record<string, any>;

const state = vi.hoisted(() => ({
  turnstileOk: true,
  challengeFails: false,
  hashCalls: 0,
  transactions: 0,
  cookies: [] as Array<{ username: string; restricted: boolean }>,
  rows: {} as Record<string, Row[]>,
}));

function resetRows(next: Record<string, Row[]>): void {
  for (const key of Object.keys(state.rows)) delete state.rows[key];
  Object.assign(state.rows, next);
}

function cloneRows(rows: Record<string, Row[]>): Record<string, Row[]> {
  return structuredClone(rows);
}

function makeDatabase(rows: Record<string, Row[]>, root: boolean): any {
  return {
    select(projection?: Record<string, unknown>) {
      let tableName = "";
      const query: any = {
        from(table: unknown) { tableName = getTableName(table as never); return query; },
        where() { return query; },
        orderBy() { return query; },
        limit() { return query; },
        for() { return query; },
        then(resolve: (value: Row[]) => unknown, reject: (reason: unknown) => unknown) {
          let selected = rows[tableName] ?? [];
          if (tableName === "wholesale_share_members" && projection && "c" in projection) {
            selected = [{ c: selected.length }];
          }
          return Promise.resolve(selected).then(resolve, reject);
        },
      };
      return query;
    },
    insert(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        values(value: Row | Row[]) {
          const values = Array.isArray(value) ? value : [value];
          rows[tableName] ??= [];
          rows[tableName].push(...structuredClone(values));
          const result: any = Promise.resolve(undefined);
          result.returning = async () => values.map((row, index) => ({ id: `row-${index}`, ...row }));
          result.onConflictDoNothing = async () => undefined;
          return result;
        },
      };
    },
    update(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        set(patch: Row) {
          return {
            where: async () => {
              for (const row of rows[tableName] ?? []) {
                for (const [key, value] of Object.entries(patch)) {
                  row[key] = key === "usageCount" && typeof value !== "number"
                    ? Number(row[key] ?? 0) + 1
                    : value;
                }
              }
            },
          };
        },
      };
    },
    async transaction(callback: (tx: any) => Promise<unknown>) {
      if (!root) return callback(this);
      state.transactions += 1;
      const staged = cloneRows(rows);
      const result = await callback(makeDatabase(staged, false));
      for (const key of Object.keys(rows)) delete rows[key];
      Object.assign(rows, staged);
      return result;
    },
  };
}

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return { ...actual, db: makeDatabase(state.rows, true) };
});
vi.mock("bcryptjs", () => ({
  default: {
    hash: async () => { state.hashCalls += 1; return "hashed-password"; },
    compare: async () => false,
  },
}));
vi.mock("../lib/turnstile", () => ({
  verifyTurnstile: async () => ({ ok: state.turnstileOk }),
}));
vi.mock("../lib/account-verification", () => ({
  createEmailChallengeInTransaction: async (tx: any, username: string) => {
    await tx.insert({ [Symbol.for("drizzle:Name")]: "account_verification_challenges" } as any)
      .values({ accountUsername: username, codeHash: "code-hash", consumedAt: null });
    if (state.challengeFails) throw new Error("challenge failed");
    return { code: "123456" };
  },
}));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (_req: any, res: any) => res.status(401).json({ error: "unauthorized" }),
  issueAccountCookieForAccount: async (res: any, username: string) => {
    const account = state.rows.accounts?.find(row => row.telegramUsername === username);
    const restricted = !!account?.verificationRequiredAt && !account?.verifiedAt;
    state.cookies.push({ username, restricted });
    res.setHeader("Set-Cookie", `account_session=test; Path=/; HttpOnly; Verification-Required=${restricted}`);
    return true;
  },
  revokeToken: async () => undefined,
  extractJtiFromCookie: () => null,
}));
vi.mock("../lib/email", () => ({ sendTemplatedEmail: async () => ({ ok: true }) }));
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));
vi.mock("../lib/activity-log", () => ({ logCustomerActivity: async () => undefined }));
vi.mock("../lib/create-alert", () => ({ createAlert: async () => undefined }));
vi.mock("../lib/telegram", () => ({
  notifyUser: async () => undefined,
  sendTelegramMessage: async () => undefined,
  sendAdminMessage: async () => undefined,
  notifyUserFromTemplate: async () => undefined,
  sendAdminFromTemplate: async () => undefined,
  announcePublicWholesaleGroup: async () => undefined,
}));

import accountRouter from "./account";
import wholesaleRouter from "./wholesale-shares";

async function post(path: string, body: unknown) {
  const app = express();
  app.use(express.json());
  app.use(accountRouter);
  app.use(wholesaleRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie"),
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

const signup = {
  telegramUsername: "new_user",
  password: "password1",
  email: "New@Example.com",
  country: "GB",
  inviteCode: "JOINME",
  turnstileToken: "captcha",
};

describe("mounted public account registration", () => {
  beforeEach(() => {
    state.turnstileOk = true;
    state.challengeFails = false;
    state.hashCalls = 0;
    state.transactions = 0;
    state.cookies.length = 0;
    resetRows({
      site_config: [{ key: "signup_requires_invite", value: "true" }],
      invite_codes: [{ code: "JOINME", isActive: true, maxUses: 3, usageCount: 0 }],
      accounts: [],
      account_verification_challenges: [],
      blocked_ips: [],
      lookup_attempts: [],
      orders: [],
    });
  });

  it("rejects invalid Turnstile before hashing, writing, or consuming an invite", async () => {
    state.turnstileOk = false;
    const result = await post("/account/signup", signup);
    expect(result.status).toBe(403);
    expect(state.hashCalls).toBe(0);
    expect(state.transactions).toBe(0);
    expect(state.rows.accounts).toEqual([]);
    expect(state.rows.invite_codes[0].usageCount).toBe(0);
    expect(state.rows.account_verification_challenges).toEqual([]);
  });

  it("atomically creates a restricted account, consumes its invite, creates a challenge, and sets a restricted cookie", async () => {
    const result = await post("/account/signup", signup);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ telegramUsername: "new_user", verificationRequired: true });
    expect(state.rows.accounts).toHaveLength(1);
    expect(state.rows.accounts[0]).toMatchObject({
      telegramUsername: "new_user",
      passwordHash: "hashed-password",
      email: "new@example.com",
      accountStatus: "active",
      signupInviteCode: "JOINME",
    });
    expect(state.rows.accounts[0].verificationRequiredAt).toBeTruthy();
    expect(state.rows.invite_codes[0].usageCount).toBe(1);
    expect(state.rows.account_verification_challenges).toHaveLength(1);
    expect(state.cookies).toEqual([{ username: "new_user", restricted: true }]);
    expect(result.cookie).toContain("Verification-Required=true");
  });

  it("rolls back the account and invite increment when challenge creation fails", async () => {
    state.challengeFails = true;
    expect((await post("/account/signup", signup)).status).toBe(500);
    expect(state.rows.accounts).toEqual([]);
    expect(state.rows.invite_codes[0].usageCount).toBe(0);
    expect(state.rows.account_verification_challenges).toEqual([]);
    expect(state.cookies).toEqual([]);
  });

  it("blocks an abusive username even when Turnstile succeeds", async () => {
    const result = await post("/account/signup", { ...signup, telegramUsername: "auditx55d544" });
    expect(result.status).toBe(403);
    expect(state.hashCalls).toBe(0);
    expect(state.rows.accounts).toEqual([]);
  });

  it("does not turn an order credential into a new account through smart-login", async () => {
    state.rows.site_config = [];
    state.rows.orders = [{ id: "order-1", code: "ORDER1", telegramUsername: "@new_user" }];
    const result = await post("/account/smart-login", {
      telegramUsername: "new_user",
      credential: "ORDER1",
    });
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ needsSignup: true });
    expect(state.rows.accounts).toEqual([]);
  });
});

describe("mounted wholesale invite registration", () => {
  beforeEach(() => {
    state.turnstileOk = true;
    state.challengeFails = false;
    state.hashCalls = 0;
    state.transactions = 0;
    state.cookies.length = 0;
    resetRows({
      wholesale_share_invite_links: [{
        code: "WHOLESALE1", shareId: "SHARE1", isActive: true, expiresAt: null,
        maxUses: 3, usageCount: 0,
      }],
      wholesale_shares: [{
        id: "SHARE1", status: "open", maxMembers: 5, isPublic: false,
        organiserFlatFee: null, creatorUsername: "organiser",
      }],
      wholesale_share_members: [],
      wholesale_share_invite_uses: [],
      accounts: [],
      account_verification_challenges: [],
    });
  });

  const body = { ...signup, telegramUsername: "wholesale_user" };

  it("rejects invalid Turnstile without redeeming the invite", async () => {
    state.turnstileOk = false;
    const result = await post("/wholesale-invite/WHOLESALE1/register", body);
    expect(result.status).toBe(403);
    expect(state.hashCalls).toBe(0);
    expect(state.transactions).toBe(0);
    expect(state.rows.wholesale_share_invite_links[0].usageCount).toBe(0);
    expect(state.rows.wholesale_share_invite_uses).toEqual([]);
  });

  it("atomically creates a restricted wholesale account, membership, use, and challenge", async () => {
    const result = await post("/wholesale-invite/WHOLESALE1/register", body);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ shareId: "SHARE1", verificationRequired: true });
    expect(state.rows.accounts[0]).toMatchObject({
      telegramUsername: "wholesale_user", isWholesale: true, accountStatus: "active",
    });
    expect(state.rows.accounts[0].verificationRequiredAt).toBeTruthy();
    expect(state.rows.wholesale_share_members[0]).toMatchObject({
      shareId: "SHARE1", username: "wholesale_user", isCreator: false,
    });
    expect(state.rows.wholesale_share_invite_links[0].usageCount).toBe(1);
    expect(state.rows.wholesale_share_invite_uses[0]).toMatchObject({
      linkCode: "WHOLESALE1", username: "wholesale_user", wasNewAccount: true,
    });
    expect(state.rows.account_verification_challenges).toHaveLength(1);
    expect(state.cookies).toEqual([{ username: "wholesale_user", restricted: true }]);
  });

  it("rolls back all wholesale redemption mutations when challenge creation fails", async () => {
    state.challengeFails = true;
    expect((await post("/wholesale-invite/WHOLESALE1/register", body)).status).toBe(500);
    expect(state.rows.accounts).toEqual([]);
    expect(state.rows.wholesale_share_members).toEqual([]);
    expect(state.rows.wholesale_share_invite_uses).toEqual([]);
    expect(state.rows.wholesale_share_invite_links[0].usageCount).toBe(0);
    expect(state.rows.account_verification_challenges).toEqual([]);
    expect(state.cookies).toEqual([]);
  });
});
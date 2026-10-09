import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({
  accountWrites: 0,
  cookies: 0,
  transactions: 0,
  signupRequiresInvite: false,
  inviteCode: null as null | { code: string; isActive: boolean; maxUses: number | null; usageCount: number },
  createdAccounts: [] as Array<Record<string, unknown>>,
  linkedAccount: null as null | {
    telegramUsername: string; accountStatus: string; hasPassword: boolean; discordId: string;
  },
  issuedUsername: null as string | null,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  function valuesIn(condition: { queryChunks?: Array<unknown> }): unknown[] {
    return (condition.queryChunks ?? []).flatMap(chunk => {
      if (typeof chunk !== "object" || chunk === null || !("value" in chunk)) return [];
      const value = (chunk as { value: unknown }).value;
      return Array.isArray(value) ? value : [value];
    });
  }
  const db = {
    select: () => {
      let tableName = "";
      return {
        from: (table: unknown) => {
          tableName = getTableName(table as never);
          return {
            where: async (condition: { queryChunks?: Array<unknown> }) => {
              const chunks = condition.queryChunks ?? [];
              const values = valuesIn(condition);
              if (tableName === "accounts" && chunks.includes(schema.accountsTable.discordId)) {
                return state.linkedAccount && values.includes(state.linkedAccount.discordId) ? [state.linkedAccount] : [];
              }
              if (tableName === "site_config" && chunks.includes(schema.siteConfigTable.key)) {
                return values.includes("signup_requires_invite")
                  ? [{ key: "signup_requires_invite", value: state.signupRequiresInvite ? "true" : "false" }]
                  : [];
              }
              if (tableName === "invite_codes" && chunks.includes(schema.inviteCodesTable.code)) {
                return state.inviteCode && values.includes(state.inviteCode.code) ? [state.inviteCode] : [];
              }
              return [];
            },
          };
        },
      };
    },
    update: (table: unknown) => {
      const tableName = getTableName(table as never);
      return {
        set: (patch: Record<string, unknown>) => {
          let applied = false;
          const apply = () => {
            if (applied) return;
            applied = true;
            state.accountWrites += 1;
            if (tableName === "invite_codes" && state.inviteCode) {
              state.inviteCode.usageCount += 1;
            }
            if (tableName === "accounts" && state.linkedAccount) {
              Object.assign(state.linkedAccount, patch);
            }
          };
          const query: any = {
            where() { return query; },
            then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
              apply();
              return Promise.resolve(undefined).then(resolve, reject);
            },
            async returning() {
              apply();
              return state.inviteCode ? [{ code: state.inviteCode.code }] : [];
            },
          };
          return query;
        },
      };
    },
    insert: (table: unknown) => {
      const tableName = getTableName(table as never);
      return {
        values: (value: Record<string, unknown>) => {
          const insert = {
            onConflictDoNothing() { return insert; },
            async returning() {
              state.accountWrites += 1;
              if (tableName === "accounts") state.createdAccounts.push(structuredClone(value));
              return [{ discordId: value.discordId }];
            },
          };
          return insert;
        },
      };
    },
    async transaction(callback: (tx: any) => Promise<unknown>) {
      state.transactions += 1;
      return callback(db);
    },
  };
  return { ...schema, db };
});
vi.mock("../middleware/account-auth", () => ({
  getJwtSecret: () => "discord-test-secret",
  requireAccount: (_req: any, res: any) => res.status(401).end(),
  issueAccountCookieForAccount: async (_res: unknown, username: string) => {
    state.cookies += 1;
    state.issuedUsername = username;
  },
}));
vi.mock("../middleware/require-admin", () => ({ requireAdmin: () => false }));
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));
vi.mock("../lib/discord", () => ({
  getDiscordCredentials: async () => ({}),
  invalidateDiscordCache: () => undefined,
  getDiscordBotStatus: async () => ({}),
  sendAdminDiscordMessage: async () => true,
  buildDiscordAuthUrl: () => "https://discord.test",
  exchangeDiscordCode: async () => ({
    access_token: "access", refresh_token: "refresh", expires_in: 3600,
  }),
  fetchDiscordUser: async () => ({ id: "discord-unlinked", username: "unlinked", avatar: null }),
}));

import discordRouter from "./discord";

describe("mounted Discord login", () => {
  beforeEach(() => {
    state.linkedAccount = null;
    state.accountWrites = 0;
    state.cookies = 0;
    state.transactions = 0;
    state.signupRequiresInvite = false;
    state.inviteCode = null;
    state.createdAccounts = [];
    state.issuedUsername = null;
  });

  async function discordCallback(inviteCode?: string) {
    const app = express();
    app.use(discordRouter);
    const server: Server = await new Promise(resolve => {
      const listening = app.listen(0, () => resolve(listening));
    });
    try {
      const signedState = jwt.sign({ action: "login", inviteCode }, "discord-test-secret");
      const { port } = server.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${port}/account/discord/oauth-callback?code=oauth-code&state=${encodeURIComponent(signedState)}`,
        { redirect: "manual" },
      );
      return { status: response.status, location: response.headers.get("location") };
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }

  it("creates a verified Discord account and opens first-login setup", async () => {
    const result = await discordCallback();
    expect(result).toEqual({ status: 302, location: "/account?s=profile&discord_setup=1" });
    expect(state.createdAccounts).toHaveLength(1);
    expect(state.createdAccounts[0]).toMatchObject({
      telegramUsername: "discord:discord-unlinked",
      discordId: "discord-unlinked",
      discordUsername: "unlinked",
      accountStatus: "active",
      verificationMethod: "discord",
    });
    expect(state.createdAccounts[0]?.verifiedAt).toBeInstanceOf(Date);
    expect(state.cookies).toBe(1);
    expect(state.issuedUsername).toBe("discord:discord-unlinked");
  });

  it("honors the invite-only signup gate for first-time Discord identities", async () => {
    state.signupRequiresInvite = true;
    const result = await discordCallback();
    expect(result.location).toContain("invite");
    expect(state.createdAccounts).toHaveLength(0);
    expect(state.cookies).toBe(0);
  });

  it("claims a valid required invite in the same transaction as Discord account creation", async () => {
    state.signupRequiresInvite = true;
    state.inviteCode = { code: "JOINME", isActive: true, maxUses: 1, usageCount: 0 };
    const result = await discordCallback("JOINME");
    expect(result.location).toBe("/account?s=profile&discord_setup=1");
    expect(state.transactions).toBe(1);
    expect(state.inviteCode.usageCount).toBe(1);
    expect(state.createdAccounts[0]).toMatchObject({ signupInviteCode: "JOINME" });
  });

  it.each([
    { telegramUsername: "discord:42", hasPassword: false },
    { telegramUsername: "discord:42", hasPassword: true },
    { telegramUsername: "chosen_name", hasPassword: false },
  ])("offers setup for incomplete linked account %j", async account => {
    state.linkedAccount = { ...account, accountStatus: "active", discordId: "discord-unlinked" };
    expect(await discordCallback()).toEqual({ status: 302, location: "/account?s=profile&discord_setup=1" });
    expect(state.cookies).toBe(1);
  });

  it.each([
    { code: "JOINME", isActive: false, maxUses: 10, usageCount: 0 },
    { code: "JOINME", isActive: true, maxUses: 1, usageCount: 1 },
  ])("does not create an account with an inactive or exhausted required invite %j", async invite => {
    state.signupRequiresInvite = true;
    state.inviteCode = invite;
    const result = await discordCallback("JOINME");
    expect(result.location).toContain("invite");
    expect(state.createdAccounts).toHaveLength(0);
    expect(state.cookies).toBe(0);
  });

  it("does not require or consume signup invites for an existing Discord account", async () => {
    state.signupRequiresInvite = true;
    state.linkedAccount = {
      telegramUsername: "existing_name", hasPassword: true, accountStatus: "active", discordId: "discord-unlinked",
    };
    expect((await discordCallback()).location).toBe("/account?s=profile&discord_setup=1");
    expect(state.createdAccounts).toHaveLength(0);
    expect(state.transactions).toBe(0);
    expect(state.cookies).toBe(1);
  });

  it("never signs in a suspended linked Discord account", async () => {
    state.linkedAccount = {
      telegramUsername: "suspended_name", hasPassword: true, accountStatus: "suspended", discordId: "discord-unlinked",
    };
    expect((await discordCallback()).location).toContain("suspended");
    expect(state.createdAccounts).toHaveLength(0);
    expect(state.cookies).toBe(0);
  });

  it("keeps Discord login working after the site username has been renamed", async () => {
    state.linkedAccount = {
      telegramUsername: "chosen_name", hasPassword: true, accountStatus: "active", discordId: "discord-unlinked",
    };
    expect(await discordCallback()).toEqual({
      status: 302, location: "/account?s=profile&discord_setup=1",
    });
    expect(state.cookies).toBe(1);
    expect(state.issuedUsername).toBe("chosen_name");
  });

  it("does not show setup or issue a session for a suspended linked account", async () => {
    state.linkedAccount = {
      telegramUsername: "discord:42", hasPassword: false, accountStatus: "suspended", discordId: "discord-unlinked",
    };
    const result = await discordCallback();
    expect(result.location).toContain("/login?discord_error=");
    expect(state.cookies).toBe(0);
  });

  it("creates a separate account rather than claiming a different linked Discord identity", async () => {
    state.linkedAccount = {
      telegramUsername: "other_user", hasPassword: true, accountStatus: "active", discordId: "different-discord-id",
    };
    const result = await discordCallback();
    expect(result.location).toBe("/account?s=profile&discord_setup=1");
    expect(state.issuedUsername).toBe("discord:discord-unlinked");
    expect(state.linkedAccount.telegramUsername).toBe("other_user");
  });
});
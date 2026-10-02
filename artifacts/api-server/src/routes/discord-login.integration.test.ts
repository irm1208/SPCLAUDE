import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  accountWrites: 0,
  cookies: 0,
  linkedAccount: null as null | {
    telegramUsername: string; accountStatus: string; hasPassword: boolean; discordId: string;
  },
  issuedUsername: null as string | null,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const db = {
    select: () => ({
      from: () => ({
        where: async (condition: { queryChunks?: Array<unknown> }) => {
          const chunks = condition.queryChunks ?? [];
          const matchesDiscordId = chunks.includes(schema.accountsTable.discordId)
            && chunks.some(chunk =>
              typeof chunk === "object"
              && chunk !== null
              && "value" in chunk
              && chunk.value === state.linkedAccount?.discordId
            );
          return state.linkedAccount && matchesDiscordId ? [state.linkedAccount] : [];
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => { state.accountWrites += 1; },
      }),
    }),
    insert: () => ({
      values: () => {
        state.accountWrites += 1;
        return { onConflictDoUpdate: async () => undefined };
      },
    }),
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
    state.issuedUsername = null;
  });

  async function discordCallback() {
    const app = express();
    app.use(discordRouter);
    const server: Server = await new Promise(resolve => {
      const listening = app.listen(0, () => resolve(listening));
    });
    try {
      const signedState = jwt.sign({ action: "login" }, "discord-test-secret");
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

  it("does not create an account for an unlinked Discord identity", async () => {
    const result = await discordCallback();
    expect(result.status).toBe(302);
    expect(result.location).toContain("No%20account%20is%20linked");
    expect(state.accountWrites).toBe(0);
    expect(state.cookies).toBe(0);
  });

  it.each([
    { telegramUsername: "discord:42", hasPassword: false },
    { telegramUsername: "discord:42", hasPassword: true },
    { telegramUsername: "chosen_name", hasPassword: false },
  ])("offers setup for incomplete linked account %j", async account => {
    state.linkedAccount = { ...account, accountStatus: "active", discordId: "discord-unlinked" };
    expect(await discordCallback()).toEqual({
      status: 302, location: "/account?s=profile&discord_setup=1",
    });
    expect(state.cookies).toBe(1);
  });

  it("keeps Discord login working after the site username has been renamed", async () => {
    state.linkedAccount = {
      telegramUsername: "chosen_name", hasPassword: true, accountStatus: "active", discordId: "discord-unlinked",
    };
    expect(await discordCallback()).toEqual({ status: 302, location: "/account" });
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

  it("rejects an account linked to a different Discord identity", async () => {
    state.linkedAccount = {
      telegramUsername: "other_user", hasPassword: true, accountStatus: "active", discordId: "different-discord-id",
    };
    const result = await discordCallback();
    expect(result.location).toContain("No%20account%20is%20linked");
    expect(state.accountWrites).toBe(0);
    expect(state.cookies).toBe(0);
  });
});
import { describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  accountWrites: 0,
  cookies: 0,
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const db = {
    select: () => ({
      from: () => ({
        where: async () => [],
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
  return { ...actual, db };
});
vi.mock("../middleware/account-auth", () => ({
  getJwtSecret: () => "discord-test-secret",
  requireAccount: (_req: any, res: any) => res.status(401).end(),
  issueAccountCookieForAccount: async () => { state.cookies += 1; },
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
  it("does not create an account for an unlinked Discord identity", async () => {
    state.accountWrites = 0;
    state.cookies = 0;
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
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("No%20account%20is%20linked");
      expect(state.accountWrites).toBe(0);
      expect(state.cookies).toBe(0);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({
  account: null as any,
  completionFails: false,
  completedUsernames: [] as string[],
  sentMessages: [] as string[],
}));

function makeDb(root: boolean, accountBox: { value: any }): any {
  return {
    select: () => {
      let table = "";
      const query: any = {
        from(value: unknown) { table = getTableName(value as never); return query; },
        where() { return query; },
        orderBy() { return query; },
        limit() { return query; },
        for() { return query; },
        then(resolve: (rows: any[]) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(table === "accounts" && accountBox.value ? [accountBox.value] : [])
            .then(resolve, reject);
        },
      };
      return query;
    },
    update(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        set(patch: Record<string, unknown>) {
          return {
            where: async () => {
              if (tableName === "accounts" && accountBox.value) Object.assign(accountBox.value, patch);
            },
            returning: async () => {
              if (tableName === "accounts" && accountBox.value) {
                Object.assign(accountBox.value, patch);
                return [accountBox.value];
              }
              return [];
            },
          };
        },
      };
    },
    insert: () => ({ values: async () => undefined }),
    async transaction(callback: (tx: any) => Promise<unknown>) {
      if (!root) return callback(this);
      const staged = { value: structuredClone(accountBox.value) };
      const result = await callback(makeDb(false, staged));
      accountBox.value = staged.value;
      state.account = staged.value;
      return result;
    },
  };
}

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const box = {
    get value() { return state.account; },
    set value(value: any) { state.account = value; },
  };
  return {
    ...actual,
    db: makeDb(true, box),
    pool: { query: async () => ({ rows: [] }) },
  };
});
vi.mock("../lib/account-verification", () => ({
  completeAccountVerificationInTransaction: async (tx: any, username: string) => {
    state.completedUsernames.push(username);
    await tx.update({ [Symbol.for("drizzle:Name")]: "accounts" } as any)
      .set({ verifiedAt: new Date(), verificationMethod: "telegram" }).where();
    if (state.completionFails) throw new Error("verification completion failed");
    return true;
  },
}));
vi.mock("../lib/telegram", () => ({
  sendTelegramMessage: async (_chatId: string, message: string) => {
    state.sentMessages.push(message);
    return { ok: true };
  },
  sendTelegramMessageFull: async () => ({ ok: true }),
  sendTelegramPhoto: async () => ({ ok: true }),
  sendAdminTicketNotification: async () => ({ ok: true }),
  answerCallbackQuery: async () => undefined,
  getBotUsername: async () => "test_bot",
  getAdminChatId: async () => null,
  notifyUserTicket: async () => undefined,
  getTemplate: async (key: string) => ({ template: key === "bot_link_success" ? "Linked {{username}}" : key }),
  renderTemplate: (template: string, values: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? ""),
}));
vi.mock("../lib/audit-log", () => ({ writeLog: async () => undefined }));
vi.mock("../lib/google-genai", () => ({ GoogleGenAI: class {} }));
vi.mock("../lib/sage-ai", () => ({ callSageAI: async () => "" }));
vi.mock("../lib/translate-zh", () => ({ translateZh: async (text: string) => text }));
vi.mock("../lib/tracking-auto-refresh", () => ({
  refreshSingleGbParcel: async () => undefined,
  fetchTrackingEventsForNumber: async () => [],
}));
vi.mock("../lib/wholesale-share-chat", () => ({ postWholesaleChatMessage: async () => undefined }));
vi.mock("../middleware/account-auth", () => ({
  requireAccount: (_req: any, res: any) => res.status(401).end(),
  requireAccountIdentity: (_req: any, res: any) => res.status(401).end(),
  issueAccountCookieForAccount: async () => undefined,
}));

import telegramRouter from "./telegram";

async function webhook(text: string) {
  const app = express();
  app.use(express.json());
  app.use(telegramRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}/telegram/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { text, chat: { id: 98765, username: "telegram-user" } } }),
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("mounted Telegram account linking", () => {
  beforeEach(() => {
    state.account = {
      telegramUsername: "Stored_UserName",
      telegramLinkToken: "ABCDEF12",
      telegramLinkExpiresAt: new Date(Date.now() + 60_000),
      telegramChatId: null,
      verifiedAt: null,
      verificationRequiredAt: new Date(),
    };
    state.completionFails = false;
    state.completedUsernames.length = 0;
    state.sentMessages.length = 0;
  });

  it.each(["/link ABCDEF12", "/start ABCDEF12"])(
    "rolls back chat binding and token consumption when completion fails for %s",
    async (text) => {
      state.completionFails = true;
      const failed = await webhook(text);
      expect(failed.status).toBe(500);
      expect(state.account.telegramChatId).toBeNull();
      expect(state.account.telegramLinkToken).toBe("ABCDEF12");
      expect(state.account.verifiedAt).toBeNull();

      state.completionFails = false;
      const retried = await webhook(text);
      expect(retried.status).toBe(200);
      expect(state.account.telegramChatId).toBe("98765");
      expect(state.account.telegramLinkToken).toBeNull();
    },
  );

  it("uses the exact stored username when completing and acknowledging a successful link", async () => {
    const response = await webhook("/link ABCDEF12");
    expect(response.status).toBe(200);
    expect(state.completedUsernames).toEqual(["Stored_UserName"]);
    expect(state.sentMessages).toContain("Linked Stored_UserName");
  });
});
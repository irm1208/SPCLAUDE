import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: {
    telegramChatId: "chat-1" as string | null,
    telegramNotifications: { payment: true },
  },
  logs: [] as unknown[],
  updates: [] as Array<Record<string, unknown>>,
}));

const fakeDb = vi.hoisted(() => ({
  select: () => ({
    from: () => ({
      where: () => Promise.resolve([state.account]),
    }),
  }),
  insert: () => ({
    values: (value: unknown) => {
      state.logs.push(value);
      return Promise.resolve();
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        state.updates.push(values);
        if ("telegramChatId" in values) state.account.telegramChatId = values.telegramChatId as string | null;
      },
    }),
  }),
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return { ...actual, db: fakeDb };
});

vi.mock("./discord", () => ({
  notifyUserDiscord: vi.fn(),
  sendAdminDiscordMessage: vi.fn(),
}));

import { notifyUserFull } from "./telegram";

describe("permanent Telegram recipient failures", () => {
  beforeEach(() => {
    process.env["TELEGRAM_BOT_TOKEN"] = "test-token";
    process.env["TELEGRAM_ADMIN_CHAT_ID"] = "admin-chat";
    state.account.telegramChatId = "chat-1";
    state.logs.length = 0;
    state.updates.length = 0;
  });

  it("unlinks a deactivated recipient and does not retry transport", async () => {
    const transport = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, description: "Forbidden: user is deactivated" }),
    });
    vi.stubGlobal("fetch", transport);

    const first = await notifyUserFull("buyer", "payment", "Refund requested");
    expect(first).toMatchObject({ ok: false, skipped: true });
    expect(state.account.telegramChatId).toBeNull();
    expect(state.updates).toContainEqual({ telegramChatId: null });
    expect(transport).toHaveBeenCalledTimes(1);

    const second = await notifyUserFull("buyer", "payment", "Refund requested");
    expect(second).toMatchObject({ ok: false, skipped: true });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
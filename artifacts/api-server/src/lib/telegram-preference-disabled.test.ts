import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  logs: [] as unknown[],
  transportCalls: 0,
}));

const fakeDb = vi.hoisted(() => ({
  select: () => ({
    from: () => ({
      where: () => Promise.resolve([{
        telegramChatId: "chat-1",
        telegramNotifications: { payment: false },
      }]),
    }),
  }),
  insert: () => ({
    values: (value: unknown) => {
      state.logs.push(value);
      return Promise.resolve();
    },
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

describe("actual Telegram preference-disabled path", () => {
  it("does not invoke transport and returns a terminal skipped result", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    const result = await notifyUserFull("buyer", "payment", "Refund completed");
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(transport).not.toHaveBeenCalled();
    expect(state.transportCalls).toBe(0);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({ delivered: false });
    const retry = await notifyUserFull("buyer", "payment", "Refund completed");
    expect(retry).toMatchObject({ ok: false, skipped: true });
    expect(transport).not.toHaveBeenCalled();
  });
});
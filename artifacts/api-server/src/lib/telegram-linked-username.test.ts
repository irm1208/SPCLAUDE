import { afterEach, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
  accountsTable: {},
  siteConfigTable: {},
  telegramMessageLogsTable: {},
  ticketTelegramMessagesTable: {},
}));
vi.mock("./discord", () => ({ notifyUserDiscord: vi.fn(), sendAdminDiscordMessage: vi.fn() }));

const { getLinkedTelegramUsername } = await import("./telegram");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("looks up the bot-linked chat rather than the website username", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "test-admin");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ ok: true, result: { id: 98765, type: "private", username: "actual_telegram" } }),
  });
  vi.stubGlobal("fetch", fetcher);
  expect(await getLinkedTelegramUsername("98765")).toBe("actual_telegram");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ chat_id: "98765" });
});

it("distinguishes an account with no Telegram username from a failed lookup", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "test-admin");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ ok: true, result: { id: 98765, type: "private" } }),
  }));
  expect(await getLinkedTelegramUsername("98765")).toBeNull();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error with private URL")));
  await expect(getLinkedTelegramUsername("98765")).rejects.toThrow("Could not retrieve the linked Telegram username");
});

it("rejects mismatched or non-private chat results", async () => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "test-admin");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ ok: true, result: { id: 111, type: "private", username: "wrong_person" } }),
  }));
  await expect(getLinkedTelegramUsername("98765")).rejects.toThrow("Could not retrieve the linked Telegram username");
});

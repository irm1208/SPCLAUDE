import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({ db: {}, tmdTelegramLinksTable: {}, tmdUsersTable: {}, tmdPoolsTable: {}, tmdMessagesTable: {} }));
import { formatMirroredMessage, formatFunding, telegramAuthorName, tmdWebhookSecret, esc, setTmdTelegramTransport, sendTelegram, notifyUserTelegram } from "./tmd-telegram";

afterEach(() => setTmdTelegramTransport(null));

describe("tmd-telegram formatting", () => {
  it("escapes HTML and labels message kinds", () => {
    expect(esc("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
    expect(formatMirroredMessage({ authorName: "Jess (organiser)", kind: "chat", body: "hi <all>" })).toBe("💬 <b>Jess (organiser)</b>\nhi &lt;all&gt;");
    expect(formatMirroredMessage({ authorName: "x", kind: "broadcast", body: "Shipped" })).toMatch(/^📣/);
    expect(formatMirroredMessage({ authorName: "Testmedaddy", kind: "system", body: "Funded" })).toBe("ℹ️ Funded");
  });
  it("draws a funding bar", () => {
    const text = formatFunding({ title: "BPC", status: "open", targetUsd: "200", slug: "bpc" }, { verifiedUsd: 50, memberCount: 4, verifiedMemberCount: 1 });
    expect(text).toContain("25%");
    expect(text).toContain("███░░░░░░░");
    expect(text).toContain("1/4 members paid");
  });
  it("names Telegram authors and derives a stable webhook secret", () => {
    expect(telegramAuthorName({ username: "jess" })).toBe("@jess");
    expect(telegramAuthorName({ first_name: "Jess", last_name: "K" })).toBe("Jess K");
    expect(telegramAuthorName(undefined)).toBe("Telegram");
    expect(tmdWebhookSecret("123:abc")).toHaveLength(48);
    expect(tmdWebhookSecret("123:abc")).toBe(tmdWebhookSecret("123:abc"));
    expect(tmdWebhookSecret("123:abc")).not.toBe(tmdWebhookSecret("123:abd"));
  });
});

describe("tmd-telegram sending", () => {
  it("sends HTML with an optional button through the injected transport", async () => {
    const calls: any[] = [];
    setTmdTelegramTransport(async (method, payload) => { calls.push({ method, payload }); return { ok: true, result: { message_id: 77 } }; });
    const sent = await sendTelegram("42", "<b>hi</b>", { buttonUrl: "https://example.test/p/x", buttonText: "Open" });
    expect(sent).toEqual({ ok: true, messageId: 77 });
    expect(calls[0].method).toBe("sendMessage");
    expect(calls[0].payload).toMatchObject({ chat_id: "42", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Open", url: "https://example.test/p/x" }]] } });
  });
  it("respects the user's Telegram preference and link state", async () => {
    const calls: any[] = [];
    setTmdTelegramTransport(async (method, payload) => { calls.push({ method, payload }); return { ok: true, result: { message_id: 1 } }; });
    expect(await notifyUserTelegram({ telegramChatId: null, notificationPrefs: {} }, "t")).toBe(false);
    expect(await notifyUserTelegram({ telegramChatId: "9", notificationPrefs: { telegram: false } }, "t")).toBe(false);
    expect(await notifyUserTelegram({ telegramChatId: "9", notificationPrefs: {} }, "Paid", "Thanks", "/p/abc")).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toBe("<b>Paid</b>\nThanks");
  });
});

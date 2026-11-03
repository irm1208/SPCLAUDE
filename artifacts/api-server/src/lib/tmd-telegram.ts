import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db, tmdTelegramLinksTable, tmdUsersTable, tmdPoolsTable, tmdMessagesTable, type TmdPool, type TmdUser } from "@workspace/db";
import { TmdError } from "./tmd-model";
import { tmdPublicUrl } from "./tmd-mail";

/* ---------------------------------------------------------------------------
 * Testmedaddy Telegram bot.
 *
 * Its own bot (TMD_TELEGRAM_BOT_TOKEN), nothing shared with the other products.
 * Two kinds of link:
 *  - a user links their private chat with `/start <code>` so notifications reach them;
 *  - an organiser adds the bot to a group and sends `/link <code>` so the pool chat and
 *    the group mirror each other and pool events are announced there.
 * Everything here is transport + linking + formatting; the webhook route orchestrates.
 * ------------------------------------------------------------------------- */

type Executor = any;
const LINK_TTL_MS = 15 * 60_000;

/* ---- Transport (injectable for tests) ------------------------------------ */
export type TmdTelegramTransport = (method: string, payload: Record<string, unknown>) => Promise<{ ok: boolean; result?: any; description?: string }>;
let transport: TmdTelegramTransport | null = null;
export function setTmdTelegramTransport(next: TmdTelegramTransport | null) { transport = next; botUsername = null; }

export const tmdBotToken = () => process.env["TMD_TELEGRAM_BOT_TOKEN"]?.trim() ?? "";
export const tmdTelegramConfigured = () => !!transport || !!tmdBotToken();

async function api(method: string, payload: Record<string, unknown>) {
  if (transport) return transport(method, payload);
  const token = tmdBotToken();
  if (!token) return { ok: false, description: "Telegram bot token is not configured." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
    return await res.json() as { ok: boolean; result?: any; description?: string };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : "Telegram request failed" };
  } finally { clearTimeout(timer); }
}

let botUsername: { value: string | null; loadedAt: number } | null = null;
export async function tmdBotUsername(): Promise<string | null> {
  const env = process.env["TMD_TELEGRAM_BOT_USERNAME"]?.trim();
  if (env) return env.replace(/^@/, "");
  if (!tmdTelegramConfigured()) return null;
  if (botUsername && Date.now() - botUsername.loadedAt < 5 * 60_000) return botUsername.value;
  const me = await api("getMe", {});
  botUsername = { value: me.ok ? me.result?.username ?? null : null, loadedAt: Date.now() };
  return botUsername.value;
}
export function tmdWebhookSecret(token: string) {
  return createHash("sha256").update(`tmd-webhook:${token}`).digest("hex").slice(0, 48);
}
export async function registerTmdWebhook(publicUrl: string): Promise<boolean> {
  const token = tmdBotToken();
  if (!token) return false;
  const base = publicUrl.replace(/\/+$/, "");
  const result = await api("setWebhook", { url: `${base}/api/tmd/telegram/webhook`, secret_token: tmdWebhookSecret(token), allowed_updates: ["message", "my_chat_member"] });
  return !!result.ok;
}
export async function tmdBotStatus() {
  if (!tmdTelegramConfigured()) return { configured: false, botUsername: null as string | null, webhookUrl: null as string | null };
  const [username, hook] = await Promise.all([tmdBotUsername(), api("getWebhookInfo", {})]);
  return { configured: true, botUsername: username, webhookUrl: hook.ok ? (hook.result?.url ?? null) : null };
}

/* ---- Formatting (pure) --------------------------------------------------- */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
export const poolUrl = (slug: string) => `${tmdPublicUrl()}/p/${slug}`;
/** Pool chat message as it appears in the Telegram group. */
export function formatMirroredMessage(message: { authorName: string; kind: string; body: string }) {
  if (message.kind === "system") return `ℹ️ ${esc(message.body)}`;
  if (message.kind === "broadcast") return `📣 <b>${esc(message.authorName)}</b>\n${esc(message.body)}`;
  return `💬 <b>${esc(message.authorName)}</b>\n${esc(message.body)}`;
}
export function formatFunding(pool: { title: string; status: string; targetUsd: string | number; slug: string }, totals: { verifiedUsd: number; memberCount: number; verifiedMemberCount: number }) {
  const target = Number(pool.targetUsd) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((totals.verifiedUsd / target) * 100)) : 0;
  const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
  return `🧪 <b>${esc(pool.title)}</b>\nStatus: ${esc(pool.status.replace("_", " "))}\n<code>${bar}</code> ${pct}%\n$${totals.verifiedUsd.toFixed(2)} of $${target.toFixed(2)} confirmed · ${totals.verifiedMemberCount}/${totals.memberCount} members paid`;
}
export const telegramAuthorName = (from: { username?: string; first_name?: string; last_name?: string } | undefined) =>
  from?.username ? `@${from.username}` : [from?.first_name, from?.last_name].filter(Boolean).join(" ") || "Telegram";

/* ---- Sending ------------------------------------------------------------- */
export async function sendTelegram(chatId: string, html: string, options: { buttonUrl?: string | null; buttonText?: string; replyTo?: number | string | null; threadId?: number | null } = {}) {
  const payload: Record<string, unknown> = { chat_id: chatId, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true };
  if (options.buttonUrl) payload.reply_markup = { inline_keyboard: [[{ text: options.buttonText ?? "Open on Testmedaddy", url: options.buttonUrl }]] };
  if (options.replyTo != null) payload.reply_parameters = { message_id: Number(options.replyTo), allow_sending_without_reply: true };
  if (options.threadId != null) payload.message_thread_id = options.threadId;
  const result = await api("sendMessage", payload);
  if (!result.ok) console.error("[tmd-telegram] sendMessage failed:", result.description);
  return { ok: !!result.ok, messageId: result.ok ? (result.result?.message_id as number | undefined) ?? null : null };
}
/** Delivers a notification to the user's private chat, if linked and not muted. Best effort. */
export async function notifyUserTelegram(user: Pick<TmdUser, "telegramChatId" | "notificationPrefs">, title: string, body?: string | null, link?: string | null) {
  if (!user.telegramChatId || user.notificationPrefs?.telegram === false || !tmdTelegramConfigured()) return false;
  const html = `<b>${esc(title)}</b>${body ? `\n${esc(body)}` : ""}`;
  return (await sendTelegram(user.telegramChatId, html, { buttonUrl: link ? `${tmdPublicUrl()}${link}` : null })).ok;
}
/** Mirrors a pool message into the linked group and remembers the Telegram id so it is never echoed back. */
export async function mirrorMessageToGroup(tx: Executor, pool: Pick<TmdPool, "id" | "slug" | "telegramChatId">, message: { id: string; authorName: string; kind: string; body: string; telegramMessageId?: string | null }) {
  if (!pool.telegramChatId || message.telegramMessageId || !tmdTelegramConfigured()) return null;
  const sent = await sendTelegram(pool.telegramChatId, formatMirroredMessage(message), message.kind === "chat" ? {} : { buttonUrl: poolUrl(pool.slug), buttonText: "Open pool" });
  if (sent.ok && sent.messageId != null) {
    try { await tx.update(tmdMessagesTable).set({ telegramMessageId: `${pool.telegramChatId}:${sent.messageId}` }).where(eq(tmdMessagesTable.id, message.id)); } catch { /* the mirror already happened; losing the id only risks a duplicate echo */ }
  }
  return sent.messageId;
}

/* ---- Link codes ---------------------------------------------------------- */
async function issueLink(tx: Executor, target: { userId?: string; poolId?: string }) {
  const token = randomBytes(6).toString("hex");
  const where = target.userId ? eq(tmdTelegramLinksTable.userId, target.userId) : eq(tmdTelegramLinksTable.poolId, target.poolId!);
  await tx.delete(tmdTelegramLinksTable).where(and(where, isNull(tmdTelegramLinksTable.usedAt)));
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  await tx.insert(tmdTelegramLinksTable).values({ token, userId: target.userId ?? null, poolId: target.poolId ?? null, expiresAt });
  const bot = await tmdBotUsername();
  return { token, expiresAt, botUsername: bot };
}
export async function createUserLink(tx: Executor, userId: string) {
  const link = await issueLink(tx, { userId });
  return { ...link, url: link.botUsername ? `https://t.me/${link.botUsername}?start=${link.token}` : null, command: `/start ${link.token}` };
}
export async function createPoolLink(tx: Executor, poolId: string) {
  const link = await issueLink(tx, { poolId });
  return { ...link, url: link.botUsername ? `https://t.me/${link.botUsername}?startgroup=${link.token}` : null, command: `/link ${link.token}` };
}
async function consumeLink(tx: Executor, token: string) {
  if (!/^[a-f0-9]{12}$/.test(token)) throw new TmdError("That code does not look right. Generate a new one on Testmedaddy.", 400);
  const [row] = await tx.select().from(tmdTelegramLinksTable).where(eq(tmdTelegramLinksTable.token, token)).for("update");
  if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) throw new TmdError("This code has expired. Generate a new one on Testmedaddy.", 410);
  await tx.update(tmdTelegramLinksTable).set({ usedAt: new Date() }).where(eq(tmdTelegramLinksTable.token, token));
  return row;
}
/** `/start <code>` in a private chat: binds the chat to the user. Returns the user, or null when the code is a pool code. */
export async function completeUserLink(tx: Executor, token: string, chat: { id: string | number; type?: string; username?: string }): Promise<TmdUser> {
  if (chat.type && chat.type !== "private") throw new TmdError("Account codes only work in a private chat with the bot. Use /link CODE inside a group.", 400);
  const row = await consumeLink(tx, token);
  if (!row.userId) throw new TmdError("That is a pool code. Send it inside the group you want to connect, as /link CODE.", 400);
  const chatId = String(chat.id);
  // One Telegram account per Testmedaddy user: moving the chat clears it from any previous owner.
  await tx.update(tmdUsersTable).set({ telegramChatId: null, telegramUsername: null, updatedAt: new Date() }).where(eq(tmdUsersTable.telegramChatId, chatId));
  const [user] = await tx.update(tmdUsersTable).set({ telegramChatId: chatId, telegramUsername: chat.username ?? null, updatedAt: new Date() }).where(eq(tmdUsersTable.id, row.userId)).returning();
  if (!user) throw new TmdError("Account no longer exists.", 404);
  return user;
}
/** `/link <code>` in a group: binds the group to the pool. */
export async function completePoolLink(tx: Executor, token: string, chat: { id: string | number; type?: string; title?: string }): Promise<TmdPool> {
  if (chat.type === "private") throw new TmdError("Pool codes connect a group. Add the bot to your group first, then send /link CODE there.", 400);
  const row = await consumeLink(tx, token);
  if (!row.poolId) throw new TmdError("That is an account code. Send it to the bot in a private chat as /start CODE.", 400);
  const [pool] = await tx.update(tmdPoolsTable).set({ telegramChatId: String(chat.id), telegramChatTitle: chat.title ?? null, updatedAt: new Date() }).where(eq(tmdPoolsTable.id, row.poolId)).returning();
  if (!pool) throw new TmdError("Pool no longer exists.", 404);
  return pool;
}
export async function unlinkUserChat(tx: Executor, chatId: string) {
  const rows = await tx.update(tmdUsersTable).set({ telegramChatId: null, telegramUsername: null, updatedAt: new Date() }).where(eq(tmdUsersTable.telegramChatId, chatId)).returning({ id: tmdUsersTable.id });
  return rows.length;
}
export async function unlinkPoolChat(tx: Executor, chatId: string, poolId?: string) {
  const where = poolId ? and(eq(tmdPoolsTable.telegramChatId, chatId), eq(tmdPoolsTable.id, poolId)) : eq(tmdPoolsTable.telegramChatId, chatId);
  const rows = await tx.update(tmdPoolsTable).set({ telegramChatId: null, telegramChatTitle: null, updatedAt: new Date() }).where(where).returning({ id: tmdPoolsTable.id });
  return rows.length;
}
export async function unlinkChatEverywhere(tx: Executor, chatId: string) {
  return (await unlinkUserChat(tx, chatId)) + (await unlinkPoolChat(tx, chatId));
}
export async function poolsForChat(tx: Executor, chatId: string): Promise<TmdPool[]> {
  return tx.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.telegramChatId, chatId));
}
export async function userForTelegramId(tx: Executor, telegramUserId: string | number | undefined): Promise<TmdUser | null> {
  if (telegramUserId == null) return null;
  const [user] = await tx.select().from(tmdUsersTable).where(eq(tmdUsersTable.telegramChatId, String(telegramUserId)));
  return user ?? null;
}
export async function expireTmdLinks(tx: Executor = db) {
  await tx.delete(tmdTelegramLinksTable).where(or(lt(tmdTelegramLinksTable.expiresAt, new Date(Date.now() - 86_400_000)), and(isNull(tmdTelegramLinksTable.userId), isNull(tmdTelegramLinksTable.poolId))));
}
export function publicTelegramLink(pool: Pick<TmdPool, "telegramChatId" | "telegramChatTitle">) {
  return pool.telegramChatId ? { linked: true, title: pool.telegramChatTitle } : { linked: false, title: null };
}
export const HELP_TEXT = [
  "Testmedaddy bot commands:",
  "/start CODE — connect this private chat to your account (code from Settings → Telegram)",
  "/link CODE — connect this group to one of your pools (code from the pool's Manage → Telegram tab)",
  "/status — funding progress of the pool(s) connected to this chat",
  "/stop — disconnect this chat",
].join("\n");

/* ---- Startup --------------------------------------------------------------- */
export function registerTmdTelegram() {
  const token = tmdBotToken();
  if (!token) { console.log("[tmd-telegram] No TMD_TELEGRAM_BOT_TOKEN — Telegram features stay off."); return; }
  const explicitUrl = process.env["TMD_PUBLIC_URL"] ?? process.env["TESTMEDADDY_URL"];
  if (!explicitUrl) { console.log("[tmd-telegram] Skipping webhook registration — TMD_PUBLIC_URL not set (dev)."); return; }
  registerTmdWebhook(tmdPublicUrl()).then(ok => console.log(ok ? "[tmd-telegram] Webhook registered" : "[tmd-telegram] Webhook not registered (Telegram refused)"))
    .catch(error => console.error("[tmd-telegram] Webhook registration failed:", error));
}

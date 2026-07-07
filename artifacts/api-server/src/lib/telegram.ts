import { db } from "@workspace/db";
import { accountsTable, siteConfigTable, telegramMessageLogsTable, ticketTelegramMessagesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { REGISTRY_MAP } from "./telegram-registry";
import { notifyUserDiscord, sendAdminDiscordMessage } from "./discord";

export interface TelegramPrefs {
  status: boolean;
  deleted: boolean;
  payment: boolean;
  profile: boolean;
  new_order: boolean;
  role_application: boolean;
  wholesale_chat: boolean;
}

const DEFAULT_PREFS: TelegramPrefs = {
  status: true,
  deleted: true,
  payment: true,
  profile: true,
  new_order: true,
  role_application: true,
  wholesale_chat: true,
};

function parsePrefKey(pref: unknown): TelegramPrefs {
  if (!pref || typeof pref !== "object") return { ...DEFAULT_PREFS };
  const p = pref as Record<string, unknown>;
  return {
    status:           typeof p.status           === "boolean" ? p.status           : true,
    deleted:          typeof p.deleted          === "boolean" ? p.deleted          : true,
    payment:          typeof p.payment          === "boolean" ? p.payment          : true,
    profile:          typeof p.profile          === "boolean" ? p.profile          : true,
    new_order:        typeof p.new_order        === "boolean" ? p.new_order        : true,
    role_application: typeof p.role_application === "boolean" ? p.role_application : true,
    wholesale_chat:   typeof p.wholesale_chat   === "boolean" ? p.wholesale_chat   : true,
  };
}

// ── Credential resolution ─────────────────────────────────────────────────────
// Environment variables always take priority.
// When an env var is absent, the value is read from the site_config table
// (where the admin UI saves it) with a short-lived in-memory cache.

interface CredentialCache {
  token: string;
  chatId: string;
  loadedAt: number;
}

let _credCache: CredentialCache | null = null;
const CACHE_TTL_MS = 60_000;

async function getCredentials(): Promise<{ token: string; chatId: string }> {
  const envToken = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
  const envChatId = process.env["TELEGRAM_ADMIN_CHAT_ID"] ?? "";

  if (envToken && envChatId) {
    return { token: envToken, chatId: envChatId };
  }

  if (_credCache && Date.now() - _credCache.loadedAt < CACHE_TTL_MS) {
    return {
      token: envToken || _credCache.token,
      chatId: envChatId || _credCache.chatId,
    };
  }

  try {
    const rows = await db
      .select({ key: siteConfigTable.key, value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(inArray(siteConfigTable.key, ["telegramBotToken", "telegramAdminChatId"]));

    const dbToken = rows.find(r => r.key === "telegramBotToken")?.value ?? "";
    const dbChatId = rows.find(r => r.key === "telegramAdminChatId")?.value ?? "";

    _credCache = { token: dbToken, chatId: dbChatId, loadedAt: Date.now() };

    return {
      token: envToken || dbToken,
      chatId: envChatId || dbChatId,
    };
  } catch {
    return { token: envToken, chatId: envChatId };
  }
}

/** Invalidate the credential cache so the next call re-reads from the DB. */
export function invalidateTelegramCache(): void {
  _credCache = null;
}

// ── Template engine ───────────────────────────────────────────────────────────

interface TemplateEntry { template: string; enabled: boolean; loadedAt: number; }
const _templateCache = new Map<string, TemplateEntry>();
const TEMPLATE_CACHE_TTL_MS = 60_000;

/** Replace {{placeholder}} tokens in a template string with provided vars. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * Fetch the stored template for `eventKey` from site_config (with 60 s cache).
 * Falls back to the registry default and enabled=true when no DB record exists.
 * The registry is the single source of truth for default templates.
 */
export async function getTemplate(
  eventKey: string,
): Promise<{ template: string; enabled: boolean }> {
  const cached = _templateCache.get(eventKey);
  if (cached && Date.now() - cached.loadedAt < TEMPLATE_CACHE_TTL_MS) {
    return { template: cached.template, enabled: cached.enabled };
  }

  const registryDefault = REGISTRY_MAP.get(eventKey)?.defaultTemplate ?? "";

  try {
    const [row] = await db
      .select({ value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, `tg_template:${eventKey}`));

    if (row?.value) {
      const parsed = JSON.parse(row.value) as { template?: string; enabled?: boolean };
      const entry: TemplateEntry = {
        template: parsed.template ?? registryDefault,
        enabled: parsed.enabled !== false,
        loadedAt: Date.now(),
      };
      _templateCache.set(eventKey, entry);
      return { template: entry.template, enabled: entry.enabled };
    }
  } catch {
    // fall through to registry default
  }

  const entry: TemplateEntry = { template: registryDefault, enabled: true, loadedAt: Date.now() };
  _templateCache.set(eventKey, entry);
  return { template: registryDefault, enabled: true };
}

/** Evict one event key (or all) from the template cache. */
export function invalidateTemplateCache(eventKey?: string): void {
  if (eventKey) {
    _templateCache.delete(eventKey);
  } else {
    _templateCache.clear();
  }
}

/**
 * Like `notifyUser`, but the message text is built from a stored/default template.
 * The registry is the sole source of defaults — no inline default is accepted.
 * If the event is disabled in the template config the notification is silently skipped.
 */
export async function notifyUserFromTemplate(
  telegramUsername: string,
  prefKey: keyof TelegramPrefs,
  eventKey: string,
  vars: Record<string, string>,
): Promise<void> {
  const { template, enabled } = await getTemplate(eventKey);
  if (!enabled) return;
  const text = renderTemplate(template, vars);
  return notifyUser(telegramUsername, prefKey, text);
}

/**
 * Like `notifyUserFromTemplate`, but returns `{ ok, messageId?, chatId? }` so the
 * caller can persist the sent Telegram `message_id` for reply routing (e.g. the
 * shared-order chat lets members reply in Telegram and posts it back in-app).
 */
export async function notifyUserFromTemplateFull(
  telegramUsername: string,
  prefKey: keyof TelegramPrefs,
  eventKey: string,
  vars: Record<string, string>,
): Promise<NotifyResult> {
  const { template, enabled } = await getTemplate(eventKey);
  if (!enabled) return { ok: false };
  const text = renderTemplate(template, vars);
  return notifyUserFull(telegramUsername, prefKey, text);
}

/**
 * Like `sendAdminMessage`, but the message text is built from a stored/default template.
 * The registry is the sole source of defaults — no inline default is accepted.
 * If the event is disabled in the template config the notification is silently skipped.
 */
export async function sendAdminFromTemplate(
  eventKey: string,
  vars: Record<string, string>,
): Promise<boolean> {
  const { template, enabled } = await getTemplate(eventKey);
  if (!enabled) return false;
  const text = renderTemplate(template, vars);
  return sendAdminMessage(text);
}

// ── Sending ───────────────────────────────────────────────────────────────────

interface TgLogCtx {
  recipientType: "user" | "admin";
  recipientUsername?: string;
}

function logTgMessage(chatId: string, messageText: string, delivered: boolean, errorMessage: string | undefined, ctx: TgLogCtx): void {
  db.insert(telegramMessageLogsTable).values({
    recipientType: ctx.recipientType,
    recipientUsername: ctx.recipientUsername ?? null,
    recipientChatId: chatId,
    messageText,
    delivered,
    errorMessage: errorMessage ?? null,
  }).catch(() => {});
}

/**
 * Send a Telegram message and return `{ ok, messageId? }`.
 * `messageId` is the Telegram `message_id` of the sent message — store it to
 * enable reply-routing back to the originating support ticket.
 *
 * Pass `extraPayload` to include additional Telegram API fields such as
 * `reply_markup` (inline keyboards, ForceReply, etc).
 */
export async function sendTelegramMessageFull(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" | "" = "HTML",
  logCtx?: TgLogCtx,
  extraPayload?: Record<string, unknown>,
): Promise<{ ok: boolean; messageId?: number }> {
  const { token } = await getCredentials();
  if (!token) return { ok: false };
  const ctx: TgLogCtx = logCtx ?? { recipientType: "user" };
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...extraPayload,
    };
    if (parseMode) payload.parse_mode = parseMode;
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { ok: boolean; description?: string; result?: { message_id?: number } };
    if (!data.ok) {
      const errMsg = data.description ?? "sendMessage failed";
      console.error("[telegram] sendMessage failed:", data);
      logTgMessage(chatId, text, false, errMsg, ctx);
      return { ok: false };
    }
    logTgMessage(chatId, text, true, undefined, ctx);
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[telegram] sendMessage error:", err);
    logTgMessage(chatId, text, false, errMsg, ctx);
    return { ok: false };
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" | "" = "HTML",
  logCtx?: TgLogCtx,
): Promise<boolean> {
  const { ok } = await sendTelegramMessageFull(chatId, text, parseMode, logCtx);
  return ok;
}

export async function sendAdminMessage(text: string): Promise<boolean> {
  const { chatId } = await getCredentials();
  // Fire Discord webhook in parallel (best-effort)
  sendAdminDiscordMessage(text).catch(() => {});
  if (!chatId) return false;
  return sendTelegramMessage(chatId, text, "HTML", { recipientType: "admin" }).catch(() => false);
}

/**
 * Like sendAdminMessage, but returns { ok, messageId, chatId } so the caller
 * can save the messageId to ticketTelegramMessagesTable for reply routing.
 */
export async function sendAdminMessageFull(text: string): Promise<{ ok: boolean; messageId?: number; chatId: string }> {
  const { chatId } = await getCredentials();
  if (!chatId) return { ok: false, chatId: "" };
  const result = await sendTelegramMessageFull(chatId, text, "HTML", { recipientType: "admin" });
  return { ...result, chatId };
}

/**
 * Announce a newly-published public wholesale group to a dedicated Telegram group
 * topic. Destination is configured via the PUBLIC_GROUPS_CHAT_ID (group chat id)
 * and PUBLIC_GROUPS_TOPIC_ID (forum topic / message_thread_id) env vars. Both are
 * optional: if either is missing the announcement is silently skipped so publishing
 * never fails on Telegram config. Best-effort — failures are logged, not thrown.
 */
export async function announcePublicWholesaleGroup(text: string): Promise<{ ok: boolean }> {
  const chatId = (process.env["PUBLIC_GROUPS_CHAT_ID"] ?? "").trim();
  const topicId = (process.env["PUBLIC_GROUPS_TOPIC_ID"] ?? "").trim();
  if (!chatId || !topicId) return { ok: false };
  const threadId = Number(topicId);
  if (!Number.isFinite(threadId)) return { ok: false };
  const extra: Record<string, unknown> = { message_thread_id: threadId };
  try {
    return await sendTelegramMessageFull(chatId, text, "HTML", { recipientType: "admin" }, extra);
  } catch (err) {
    console.error("[telegram] public group announcement failed:", err);
    return { ok: false };
  }
}

/**
 * Send a ticket notification to the admin chat with an inline "💬 Reply" button.
 * When admin taps Reply, the bot sends a ForceReply prompt in the same chat —
 * admin types their message, which routes back to the ticket automatically.
 * Returns { ok, messageId, chatId } for optional legacy reply-thread tracking.
 */
export async function sendAdminTicketNotification(
  text: string,
  ticketId: string,
): Promise<{ ok: boolean; messageId?: number; chatId: string }> {
  const { chatId } = await getCredentials();
  if (!chatId) return { ok: false, chatId: "" };
  const result = await sendTelegramMessageFull(chatId, text, "HTML", { recipientType: "admin" }, {
    reply_markup: {
      inline_keyboard: [[{ text: "💬 Reply", callback_data: `rt:${ticketId}` }]],
    },
  });
  return { ...result, chatId };
}

/**
 * Answer a Telegram inline keyboard callback query.
 * Must be called within 10 seconds of receiving the callback_query update.
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const { token } = await getCredentials();
  if (!token) return;
  fetchWithTimeout(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text ?? "" }),
  }).catch(() => {});
}

/** Returns the configured admin chat ID (env var or DB config). */
export async function getAdminChatId(): Promise<string> {
  const { chatId } = await getCredentials();
  return chatId;
}

/** Result of a per-user notify: whether it sent, and (when known) the sent
 * Telegram `message_id` and the recipient's chat id, for reply-routing. */
export interface NotifyResult {
  ok: boolean;
  messageId?: number;
  chatId?: string;
}

/**
 * Like `notifyUser`, but returns `{ ok, messageId?, chatId? }`. Sends via
 * `sendTelegramMessageFull` so the Telegram `message_id` is captured while
 * preserving the same account lookup and per-event preference checks.
 */
export async function notifyUserFull(
  telegramUsername: string,
  prefKey: keyof TelegramPrefs,
  text: string,
): Promise<NotifyResult> {
  try {
    const bare = telegramUsername.replace(/^@/, "").toLowerCase();
    const [account] = await db
      .select({ telegramChatId: accountsTable.telegramChatId, telegramNotifications: accountsTable.telegramNotifications })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, bare));

    if (!account) {
      console.warn(`[telegram:notify] SKIP event=${prefKey} user=@${bare} — account not found`);
      return { ok: false };
    }

    const { token } = await getCredentials();
    if (!token) {
      console.warn(`[telegram:notify] SKIP event=${prefKey} user=@${bare} — bot token not configured`);
      // Still record the notification so it appears in the customer's in-app feed.
      logTgMessage(account.telegramChatId ?? "", text, false, "skipped: bot token not configured (in-app only)", { recipientType: "user", recipientUsername: bare });
      return { ok: false };
    }
    if (!account.telegramChatId) {
      console.warn(`[telegram:notify] SKIP event=${prefKey} user=@${bare} — Telegram not linked (no chatId)`);
      // Still record the notification so it appears in the customer's in-app feed.
      logTgMessage("", text, false, "skipped: Telegram not linked (in-app only)", { recipientType: "user", recipientUsername: bare });
      return { ok: false };
    }

    const prefs = parsePrefKey(account.telegramNotifications);
    if (!prefs[prefKey]) {
      console.debug(`[telegram:notify] SKIP event=${prefKey} user=@${bare} — preference disabled`);
      // Telegram delivery is off for this event, but keep it in the in-app feed.
      logTgMessage(account.telegramChatId, text, false, "skipped: Telegram preference off (in-app only)", { recipientType: "user", recipientUsername: bare });
      return { ok: false, chatId: account.telegramChatId };
    }

    const result = await sendTelegramMessageFull(account.telegramChatId, text, "HTML", { recipientType: "user", recipientUsername: bare });
    if (result.ok) {
      console.log(`[telegram:notify] SENT event=${prefKey} user=@${bare} chatId=${account.telegramChatId}`);
    } else {
      console.error(`[telegram:notify] FAIL event=${prefKey} user=@${bare} chatId=${account.telegramChatId} — sendMessage returned false`);
    }
    return { ...result, chatId: account.telegramChatId };
  } catch (err) {
    console.error(`[telegram:notify] ERROR event=${prefKey} user=@${telegramUsername}:`, err);
    return { ok: false };
  }
}

export async function notifyUser(
  telegramUsername: string,
  prefKey: keyof TelegramPrefs,
  text: string,
): Promise<void> {
  // Fire both Telegram and Discord in parallel; failures are independent
  await Promise.all([
    notifyUserFull(telegramUsername, prefKey, text),
    notifyUserDiscord(telegramUsername, prefKey, text).catch(() => {}),
  ]);
}

/**
 * Send a ticket notification to a user AND store the Telegram message_id so
 * that the user can reply directly in Telegram and have it routed back to the
 * correct support ticket thread.
 *
 * Unlike `notifyUser`, this always sends (no pref-key check) because support
 * replies are a direct conversation, not a broadcast notification.
 */
export async function notifyUserTicket(
  telegramUsername: string,
  ticketId: string,
  text: string,
): Promise<void> {
  try {
    const bare = telegramUsername.replace(/^@/, "").toLowerCase();
    const [account] = await db
      .select({ telegramChatId: accountsTable.telegramChatId })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, bare));

    if (!account) {
      console.warn(`[telegram:notifyUserTicket] SKIP ticketId=${ticketId} user=@${bare} — account not found`);
      return;
    }

    const { token } = await getCredentials();
    if (!token) {
      console.warn(`[telegram:notifyUserTicket] SKIP ticketId=${ticketId} user=@${bare} — bot token not configured`);
      // Still record the reply so it appears in the customer's in-app feed.
      logTgMessage(account.telegramChatId ?? "", text, false, "skipped: bot token not configured (in-app only)", { recipientType: "user", recipientUsername: bare });
      return;
    }

    if (!account.telegramChatId) {
      console.warn(`[telegram:notifyUserTicket] SKIP ticketId=${ticketId} user=@${bare} — no chatId`);
      // Still record the reply so it appears in the customer's in-app feed.
      logTgMessage("", text, false, "skipped: Telegram not linked (in-app only)", { recipientType: "user", recipientUsername: bare });
      return;
    }

    const result = await sendTelegramMessageFull(
      account.telegramChatId,
      text,
      "HTML",
      { recipientType: "user", recipientUsername: bare },
    );

    if (result.ok && result.messageId) {
      await db.insert(ticketTelegramMessagesTable).values({
        telegramMessageId: result.messageId,
        chatId: account.telegramChatId,
        ticketId,
      });
    }
  } catch (err) {
    console.error(`[telegram:notifyUserTicket] ERROR ticketId=${ticketId} user=@${telegramUsername}:`, err);
  }
}

// ── Bot identity ─────────────────────────────────────────────────────────────

let _botUsername: string | null = null;
let _botUsernameLoadedAt = 0;
const BOT_USERNAME_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the bot's Telegram username (e.g. "SaltPepsBot") by calling getMe.
 * The result is cached for 5 minutes. Falls back to the TELEGRAM_BOT_USERNAME env var.
 */
export async function getBotUsername(): Promise<string | null> {
  const envUsername = process.env["TELEGRAM_BOT_USERNAME"] ?? "";
  if (envUsername) return envUsername;

  if (_botUsername && Date.now() - _botUsernameLoadedAt < BOT_USERNAME_TTL_MS) {
    return _botUsername;
  }

  const { token } = await getCredentials();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!res.ok) return null;
    const data = await res.json() as { ok: boolean; result?: { username?: string } };
    const username = data?.result?.username ?? null;
    if (username) {
      _botUsername = username;
      _botUsernameLoadedAt = Date.now();
    }
    return username;
  } catch {
    return null;
  }
}

/** Build a canonical webhook URL from a domain or full URL, tolerating schemes and trailing slashes. */
export function buildWebhookUrl(domainOrUrl: string): string {
  const host = domainOrUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `https://${host}/api/telegram/webhook`;
}

/** Fetch with a hard timeout (default 8 s). Rejects with an AbortError on timeout. */
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  const { token } = await getCredentials();
  if (!token) return false;
  return fetchWithTimeout(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    }),
  }).then(r => r.ok).catch(() => false);
}

export async function getWebhookInfo(): Promise<{ url: string } | null> {
  const { token } = await getCredentials();
  if (!token) return null;
  try {
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    if (!res.ok) return null;
    const data = await res.json() as { ok: boolean; result?: { url: string } };
    if (!data.ok || !data.result) return null;
    return { url: data.result.url };
  } catch {
    return null;
  }
}

export async function getTelegramStatus(): Promise<{ tokenSet: boolean; adminChatIdSet: boolean; webhookUrl: string | null }> {
  const { token, chatId } = await getCredentials();
  let webhookUrl: string | null = null;
  if (token) {
    const info = await getWebhookInfo();
    webhookUrl = info?.url || null;
  }
  return {
    tokenSet: !!token,
    adminChatIdSet: !!chatId,
    webhookUrl,
  };
}

export async function sendAdminTestMessage(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { token, chatId } = await getCredentials();
  if (!token) return { ok: false, error: "Bot token is not configured. Enter it in the Config tab and save, or set the TELEGRAM_BOT_TOKEN environment variable." };
  if (!chatId) return { ok: false, error: "Admin chat ID is not configured. Enter it in the Config tab and save, or set the TELEGRAM_ADMIN_CHAT_ID environment variable." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ <b>Test message from Salts & Peps admin panel</b>\n\nYour Telegram bot is connected and working correctly.",
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string; error_code?: number };
    if (!data.ok) {
      let friendly = data.description ?? "Unknown Telegram error";
      if (friendly.toLowerCase().includes("chat not found")) {
        friendly = "Chat not found — open Telegram, search for your bot, send it /start, then try again.";
      } else if (friendly.toLowerCase().includes("unauthorized") || data.error_code === 401) {
        friendly = "Invalid bot token — double-check the token from @BotFather.";
      } else if (friendly.toLowerCase().includes("bot was blocked")) {
        friendly = "You have blocked the bot — unblock it in Telegram and try again.";
      }
      return { ok: false, error: friendly };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Telegram — check your network connection." };
  }
}

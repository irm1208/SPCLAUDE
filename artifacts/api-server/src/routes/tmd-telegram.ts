import { Router, type Request, type Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, tmdPoolsTable, tmdMessagesTable, tmdUsersTable } from "@workspace/db";
import { requireTmdUser } from "../middleware/tmd-auth";
import { handled, TmdError, privateUser } from "../lib/tmd-model";
import { tmdPublicUrl } from "../lib/tmd-mail";
import {
  tmdBotToken, tmdWebhookSecret, tmdBotStatus, tmdBotUsername, tmdTelegramConfigured, sendTelegram, esc, poolUrl, formatFunding, telegramAuthorName,
  createUserLink, createPoolLink, completeUserLink, completePoolLink, unlinkUserChat, unlinkPoolChat, unlinkChatEverywhere, poolsForChat, userForTelegramId, expireTmdLinks, publicTelegramLink, HELP_TEXT,
} from "../lib/tmd-telegram";
import { poolTotals, pushTmdNotification } from "../lib/tmd-pools-service";

/**
 * Telegram for Testmedaddy: account linking, pool ↔ group bridge and the bot webhook.
 * The webhook is called by Telegram, so it is authenticated by the secret header rather
 * than a session, and it always answers 200 quickly (Telegram retries otherwise).
 */
const router = Router();
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const needBot = () => { if (!tmdTelegramConfigured()) throw new TmdError("Telegram is not switched on for this site yet.", 503); };

/* ---- Account ---------------------------------------------------------------- */
router.get("/tmd/me/telegram", requireTmdUser, handled(async (req, res) => {
  const status = await tmdBotStatus().catch(() => ({ configured: false, botUsername: null, webhookUrl: null }));
  noStore(res).json({ configured: status.configured, botUsername: status.botUsername, linked: !!req.tmdUser!.telegramChatId, username: req.tmdUser!.telegramUsername });
}));
router.post("/tmd/me/telegram/link", requireTmdUser, handled(async (req, res) => {
  needBot();
  await expireTmdLinks(db).catch(() => undefined);
  const link = await db.transaction(tx => createUserLink(tx, req.tmdUser!.id));
  noStore(res).json(link);
}));
router.delete("/tmd/me/telegram", requireTmdUser, handled(async (req, res) => {
  const chatId = req.tmdUser!.telegramChatId;
  const [user] = await db.update(tmdUsersTable).set({ telegramChatId: null, telegramUsername: null, updatedAt: new Date() }).where(eq(tmdUsersTable.id, req.tmdUser!.id)).returning();
  if (chatId) sendTelegram(chatId, "🔕 This chat was disconnected from your Testmedaddy account.").catch(() => undefined);
  noStore(res).json({ user: privateUser(user) });
}));
router.post("/tmd/me/telegram/test", requireTmdUser, handled(async (req, res) => {
  needBot();
  if (!req.tmdUser!.telegramChatId) throw new TmdError("Link Telegram first.", 409);
  const sent = await sendTelegram(req.tmdUser!.telegramChatId, "👋 Test message from Testmedaddy. Pool updates will arrive here.", { buttonUrl: `${tmdPublicUrl()}/dashboard`, buttonText: "Open dashboard" });
  res.json({ delivered: sent.ok });
}));

/* ---- Pool group bridge ------------------------------------------------------ */
async function organiserPool(req: Request, id: string) {
  const [pool] = await db.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.id, id));
  if (!pool) throw new TmdError("Pool not found.", 404);
  if (pool.organiserId !== req.tmdUser!.id && req.tmdUser!.role !== "admin") throw new TmdError("Only the organiser can do that.", 403);
  return pool;
}
router.get("/tmd/pools/:id/telegram", requireTmdUser, handled(async (req, res) => {
  const pool = await organiserPool(req, String(req.params.id));
  noStore(res).json({ configured: tmdTelegramConfigured(), botUsername: await tmdBotUsername().catch(() => null), ...publicTelegramLink(pool) });
}));
router.post("/tmd/pools/:id/telegram/link", requireTmdUser, handled(async (req, res) => {
  needBot();
  const pool = await organiserPool(req, String(req.params.id));
  await expireTmdLinks(db).catch(() => undefined);
  const link = await db.transaction(tx => createPoolLink(tx, pool.id));
  noStore(res).json(link);
}));
router.delete("/tmd/pools/:id/telegram", requireTmdUser, handled(async (req, res) => {
  const pool = await organiserPool(req, String(req.params.id));
  if (pool.telegramChatId) {
    await db.transaction(tx => unlinkPoolChat(tx, pool.telegramChatId!, pool.id));
    sendTelegram(pool.telegramChatId, `🔕 This group was disconnected from the pool <b>${esc(pool.title)}</b>.`).catch(() => undefined);
  }
  res.json({ ok: true });
}));

/* ---- Webhook ------------------------------------------------------------------ */
function secretMatches(req: Request, token: string) {
  const given = req.get("x-telegram-bot-api-secret-token") ?? "";
  const expected = tmdWebhookSecret(token);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
/** Handles one Telegram update. Exported so tests can call it without HTTP. */
export async function handleTelegramUpdate(update: any) {
  const left = update?.my_chat_member?.new_chat_member?.status;
  if (left && ["kicked", "left"].includes(left)) {
    await db.transaction(tx => unlinkChatEverywhere(tx, String(update.my_chat_member.chat?.id ?? "")));
    return;
  }
  const message = update?.message;
  const chat = message?.chat;
  const text: string = typeof message?.text === "string" ? message.text.trim() : typeof message?.caption === "string" ? message.caption.trim() : "";
  if (!chat?.id || !text) return;
  const chatId = String(chat.id);
  const isPrivate = chat.type === "private";
  const replyOpts = { replyTo: isPrivate ? null : message.message_id, threadId: message.message_thread_id ?? null };

  if (text.startsWith("/")) {
    const [rawCommand, ...rest] = text.split(/\s+/);
    const command = rawCommand.split("@")[0].toLowerCase();
    const code = (rest[0] ?? "").toLowerCase();
    if (command === "/start" || command === "/link") {
      if (!code) { await sendTelegram(chatId, isPrivate ? "👋 Connect this chat to your Testmedaddy account from <b>Settings → Telegram</b>, then send the code here as <code>/start CODE</code>." : "Connect this group to a pool from its <b>Manage → Telegram</b> tab, then send <code>/link CODE</code> here.", replyOpts); return; }
      try {
        if (isPrivate) {
          const user = await db.transaction(tx => completeUserLink(tx, code, chat));
          await sendTelegram(chatId, `✅ Connected to <b>@${esc(user.handle)}</b>. Joins, payments, shipping and results for your pools will arrive here.\n\n/status for your pools · /stop to disconnect.`);
        } else {
          const pool = await db.transaction(tx => completePoolLink(tx, code, chat));
          await sendTelegram(chatId, `✅ This group is now connected to <b>${esc(pool.title)}</b>.\nMessages posted in the pool chat appear here, and messages here appear in the pool chat. Make the bot an admin of the group so it can see every message.\n\n/status for funding progress · /stop to disconnect.`, { buttonUrl: poolUrl(pool.slug), buttonText: "Open pool" });
        }
      } catch (error) {
        await sendTelegram(chatId, `⚠️ ${esc(error instanceof TmdError ? error.message : "Could not connect this chat. Generate a new code on Testmedaddy.")}`, replyOpts);
      }
      return;
    }
    if (command === "/stop" || command === "/unlink") {
      const removed = await db.transaction(tx => isPrivate ? unlinkUserChat(tx, chatId) : unlinkPoolChat(tx, chatId));
      await sendTelegram(chatId, removed ? "🔕 Disconnected." : "This chat is not connected to anything.", replyOpts);
      return;
    }
    if (command === "/status") {
      const pools = isPrivate
        ? await (async () => { const user = await userForTelegramId(db, chat.id); return user ? db.select().from(tmdPoolsTable).where(and(eq(tmdPoolsTable.organiserId, user.id))).then((rows: any[]) => rows.filter(p => !["closed", "cancelled"].includes(p.status)).slice(0, 10)) : []; })()
        : await poolsForChat(db, chatId);
      if (!pools.length) { await sendTelegram(chatId, isPrivate ? "No active pools on your account. Host one on Testmedaddy." : "This group is not connected to a pool yet. Use /link CODE.", replyOpts); return; }
      const lines = await Promise.all(pools.map(async (p: any) => formatFunding(p, await poolTotals(db, p.id))));
      await sendTelegram(chatId, lines.join("\n\n"), { ...replyOpts, buttonUrl: pools.length === 1 ? poolUrl(pools[0].slug) : null, buttonText: "Open pool" });
      return;
    }
    if (command === "/help") await sendTelegram(chatId, HELP_TEXT, replyOpts);
    return;
  }

  // Plain text in a linked group becomes a pool chat message (never echoed back to the same group).
  if (isPrivate) return;
  const pools = await poolsForChat(db, chatId);
  if (!pools.length) return;
  const author = await userForTelegramId(db, message.from?.id);
  const telegramMessageId = `${chatId}:${message.message_id}`;
  for (const pool of pools) {
    const authorName = author ? (author.id === pool.organiserId ? `${author.displayName} (organiser)` : author.displayName) : `${telegramAuthorName(message.from)} (Telegram)`;
    await db.transaction(async tx => {
      const [existing] = await tx.select({ id: tmdMessagesTable.id }).from(tmdMessagesTable).where(and(eq(tmdMessagesTable.poolId, pool.id), eq(tmdMessagesTable.telegramMessageId, telegramMessageId)));
      if (existing) return;
      const [saved] = await tx.insert(tmdMessagesTable).values({ id: randomUUID(), poolId: pool.id, userId: author?.id ?? null, authorName, kind: "chat", body: text.slice(0, 2000), telegramMessageId }).returning();
      if (!author || author.id !== pool.organiserId) {
        await pushTmdNotification(tx, { userId: pool.organiserId, kind: "chat", title: `New message in "${pool.title}"`, body: `${authorName}: ${saved.body.slice(0, 200)}`, link: `/p/${pool.slug}#chat`, dedupeKey: `chat:${saved.id}` });
      }
    });
  }
}
router.post("/tmd/telegram/webhook", async (req, res) => {
  const token = tmdBotToken();
  if (!token || !secretMatches(req, token)) { res.status(401).json({ error: "Unauthorised" }); return; }
  res.json({ ok: true });
  try { await handleTelegramUpdate(req.body ?? {}); } catch (error) { console.error("[tmd-telegram webhook]", error instanceof Error ? error.message : error); }
});

export default router;

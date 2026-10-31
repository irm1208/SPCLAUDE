import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { requireVendorAccount, vendorSameOrigin } from "../middleware/vendor-auth";
import { requireAdmin } from "../middleware/require-admin";
import { getVendors } from "./config";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import {
  getVendorBotToken, vendorWebhookSecret, vendorBotStatus, getVendorBotUsername,
  vendorChats, allChats, publicChat, createLinkToken, completeLink, unlinkChat, updateChatPrefs, chatVendor, normalizePrefs,
  sendToChat, sendToChatFull, notifyVendor, formatEvent, openOrdersSummary, esc, expireLinkTokens,
} from "../lib/vendor-telegram";
import { threadForTelegramReply, postMessage } from "../lib/vendor-threads";
import { createAlert } from "../lib/create-alert";
import { sendAdminMessage } from "../lib/telegram";

const router = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      console.error("[vendor-telegram]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the request. Please try again." });
    }
  };
}
const access = (req: Request, lock = false, tx: any = db) => vendorAccess(tx, req.vendor!.username, lock, req.vendor!.tokenHash);
const noStore = (res: Response) => res.set("Cache-Control", "no-store");

/* ---- Vendor-facing -------------------------------------------------------- */
router.get("/vendor/telegram", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  const [chats, configured, botUsername] = await Promise.all([vendorChats(db, me.vendorId), getVendorBotToken().then(t => !!t), getVendorBotUsername().catch(() => null)]);
  noStore(res).json({ configured, botUsername, chats: chats.map(publicChat) });
}));
router.post("/vendor/telegram/link", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  if (!(await getVendorBotToken())) throw new VendorPortalError("Telegram alerts are not switched on yet. Ask Peps Anonymous to configure the vendor bot.", 503);
  const me = await access(req);
  await expireLinkTokens(db).catch(() => undefined);
  const link = await db.transaction(tx => createLinkToken(tx, me.vendorId, me.username));
  noStore(res).json({ ...link, groupCommand: `/start ${link.token}` });
}));
router.put("/vendor/telegram/chats/:id/prefs", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  const me = await access(req);
  const row = await db.transaction(tx => updateChatPrefs(tx, me.vendorId, String(req.params.id), normalizePrefs(req.body?.prefs ?? req.body)));
  res.json({ chat: publicChat(row) });
}));
router.delete("/vendor/telegram/chats/:id", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  const me = await access(req);
  const chats = await vendorChats(db, me.vendorId);
  const chat = chats.find((c: any) => c.id === String(req.params.id));
  if (!chat) throw new VendorPortalError("Chat not found.", 404);
  await db.transaction(tx => unlinkChat(tx, chat.chatId, me.vendorId));
  sendToChat(chat.chatId, "🔕 This chat was disconnected from the vendor portal. Send a new link code to reconnect.").catch(() => undefined);
  res.json({ ok: true });
}));

/* ---- Admin ---------------------------------------------------------------- */
router.get("/admin/vendor-telegram", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [status, chats, vendors] = await Promise.all([vendorBotStatus(), allChats(db), getVendors()]);
  noStore(res).json({ ...status, chats: chats.map((c: any) => ({ ...publicChat(c), vendorId: c.vendorId, vendorName: vendors.find(v => v.id === c.vendorId)?.name ?? c.vendorId })) });
}));
router.post("/admin/vendor-telegram/test/:vendorId", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const vendorId = String(req.params.vendorId);
  if (!(await getVendors()).some(v => v.id === vendorId)) throw new VendorPortalError("Vendor not found.", 404);
  const delivered = await notifyVendor(vendorId, "test", formatEvent("test", { id: "", reference: "", snapshot: {} }));
  res.json({ delivered });
}));
router.delete("/admin/vendor-telegram/chats/:chatId", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const removed = await db.transaction(tx => unlinkChat(tx, String(req.params.chatId)));
  if (!removed) throw new VendorPortalError("Chat not found.", 404);
  res.json({ ok: true });
}));

/* ---- Telegram webhook ------------------------------------------------------ */
function secretMatches(req: Request, token: string) {
  const given = req.get("x-telegram-bot-api-secret-token") ?? "";
  const expected = vendorWebhookSecret(token);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
router.post("/vendor-telegram/webhook", async (req, res) => {
  const token = await getVendorBotToken();
  if (!token || !secretMatches(req, token)) { res.status(401).json({ error: "Unauthorised" }); return; }
  res.json({ ok: true }); // Always acknowledge quickly; Telegram retries otherwise.
  try {
    const update = req.body ?? {};
    if (update.my_chat_member?.new_chat_member?.status && ["kicked", "left"].includes(update.my_chat_member.new_chat_member.status)) {
      await db.transaction(tx => unlinkChat(tx, String(update.my_chat_member.chat?.id ?? "")));
      return;
    }
    const message = update.message;
    const chat = message?.chat;
    const text: string = typeof message?.text === "string" ? message.text.trim() : "";
    if (!chat?.id || !text) return;
    const chatId = String(chat.id);
    // A native reply to one of our thread notifications becomes a vendor message in that thread.
    const repliedTo = message?.reply_to_message?.message_id;
    if (repliedTo != null && !text.startsWith("/")) {
      const threadId = await threadForTelegramReply(db, chatId, repliedTo);
      const link = threadId ? await chatVendor(db, chatId) : null;
      if (!threadId || !link) return;
      const author = message.from?.username ? `@${message.from.username}` : [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Telegram";
      try {
        const { thread, message: saved } = await db.transaction(tx => postMessage(tx, { threadId, vendorId: link.vendorId, authorRole: "vendor", authorName: `${author} (Telegram)`, body: text.slice(0, 4000), via: "telegram" }));
        const vendorName = (await getVendors()).find(v => v.id === thread.vendorId)?.name ?? thread.vendorId;
        createAlert("order", "medium", "Vendor replied", `${vendorName} · ${thread.subject}: ${saved.body.slice(0, 300)}`, { linkUrl: "#vendor-portal", relatedEntityId: thread.id }).catch(() => {});
        sendAdminMessage(`💬 <b>Reply from ${esc(vendorName)}</b> (via Telegram)\n${esc(thread.subject)}\n\n${esc(saved.body.slice(0, 300))}\n\nReply under Admin → Vendor portal → Messages.`).catch(() => undefined);
        await sendToChatFull(chatId, "✅ Sent to Peps Anonymous.", null, undefined, message.message_id);
      } catch (error) {
        await sendToChatFull(chatId, `⚠️ ${esc(error instanceof VendorPortalError ? error.message : "Could not deliver that reply. Open the portal to answer.")}`, null, undefined, message.message_id);
      }
      return;
    }
    if (!text.startsWith("/")) return;
    const command = text.split(/[\s@]/)[0].toLowerCase();
    if (command === "/start") {
      const code = text.split(/\s+/)[1] ?? "";
      if (!code) {
        await sendToChat(chatId, "👋 This bot sends vendor portal alerts to the chat it is linked to.\n\nIn the vendor portal open <b>Settings → Telegram notifications</b> and press <b>Connect Telegram</b>, then send the code it gives you here as <code>/start CODE</code>.");
        return;
      }
      try {
        const linked = await db.transaction(tx => completeLink(tx, code, chat));
        await sendToChat(chatId, `✅ Linked to <b>${esc(linked.vendorName)}</b>. New shipments, holds and overdue reminders will arrive here.\n\nCommands: /orders for what is open, /stop to disconnect.`);
      } catch (error) {
        await sendToChat(chatId, `⚠️ ${esc(error instanceof VendorPortalError ? error.message : "Could not link this chat. Generate a new code in the vendor portal.")}`);
      }
      return;
    }
    const link = await chatVendor(db, chatId);
    if (command === "/stop") {
      if (link) await db.transaction(tx => unlinkChat(tx, chatId));
      await sendToChat(chatId, link ? "🔕 Disconnected. This chat will no longer receive vendor alerts." : "This chat is not linked to a vendor.");
      return;
    }
    if (command === "/orders") {
      await sendToChat(chatId, link ? await openOrdersSummary(db, link.vendorId) : "This chat is not linked to a vendor yet. Use the code from the vendor portal: /start CODE");
      return;
    }
    if (command === "/help") await sendToChat(chatId, "Commands:\n/orders — open shipments\n/stop — disconnect this chat\n/start CODE — link this chat to your vendor account");
  } catch (error) {
    console.error("[vendor-telegram webhook]", error instanceof Error ? error.message : error);
  }
});

export default router;

import { Router, type IRouter } from "express";
import { db, pool } from "@workspace/db";
import { accountsTable, ticketsTable, ticketMessagesTable, ticketTelegramMessagesTable, siteConfigTable, gbParcelOptinsTable, gbParcelsTable, groupBuysTable, accountGroupBuysTable, ordersTable, orderLineItemsTable, labTestsTable, gbCountryLegsTable, gbReshippersTable, feedbackTable } from "@workspace/db";
import { eq, and, inArray, sql, desc, or, ilike, isNull } from "drizzle-orm";
import { randomBytes, randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { sendTelegramMessage, sendTelegramMessageFull, sendAdminTicketNotification, answerCallbackQuery, getBotUsername, getAdminChatId, notifyUserTicket, getTemplate, renderTemplate } from "../lib/telegram";
import { writeLog } from "../lib/audit-log";
import { normalizeTg } from "../lib/normalize";
import { translateZh } from "../lib/translate-zh";
import { refreshSingleGbParcel } from "../lib/tracking-auto-refresh";
import { GoogleGenAI } from "../lib/google-genai";

const router: IRouter = Router();

// ── In-memory "consumed token" cache ─────────────────────────────────────────
const _usedTokens = new Map<string, number>();
const USED_TOKEN_TTL_MS = 20 * 60 * 1000;

function markTokenConsumed(code: string): void {
  _usedTokens.set(code, Date.now());
  const cutoff = Date.now() - USED_TOKEN_TTL_MS;
  for (const [k, v] of _usedTokens) { if (v < cutoff) _usedTokens.delete(k); }
}

function wasTokenConsumed(code: string): boolean {
  const ts = _usedTokens.get(code);
  if (!ts) return false;
  if (Date.now() - ts > USED_TOKEN_TTL_MS) { _usedTokens.delete(code); return false; }
  return true;
}

// ── Gemini AI client ──────────────────────────────────────────────────────────

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// ── AI chat config cache (2-minute TTL to avoid per-message DB hit) ──────────

interface AiChatConfig {
  enabled: boolean;
  transcript: string;
  messageLimit: number;
  contactHandle: string;
}

let _aiCfgCache: { data: AiChatConfig; at: number } | null = null;
const AI_CFG_TTL = 2 * 60 * 1000;

async function getAiChatConfig(): Promise<AiChatConfig> {
  if (_aiCfgCache && Date.now() - _aiCfgCache.at < AI_CFG_TTL) return _aiCfgCache.data;
  const keys = ["ai_chat_enabled", "ai_chat_transcript", "ai_chat_message_limit", "ai_chat_contact_handle"];
  const rows = await db.select().from(siteConfigTable).where(inArray(siteConfigTable.key, keys));
  const map: Record<string, string> = {};
  for (const r of rows) { if (r.value !== null) map[r.key] = r.value; }
  const data: AiChatConfig = {
    enabled:       map["ai_chat_enabled"] === "true",
    transcript:    map["ai_chat_transcript"] ?? "",
    messageLimit:  parseInt(map["ai_chat_message_limit"] ?? "15", 10) || 15,
    contactHandle: map["ai_chat_contact_handle"] ?? "@urbanblend789",
  };
  _aiCfgCache = { data, at: Date.now() };
  return data;
}

// Invalidate cache after admin saves config
export function invalidateAiChatConfigCache(): void {
  _aiCfgCache = null;
}

// ── Per-user AI usage tracking (rolling 24h window, in-memory) ────────────────

interface UsageEntry { count: number; windowStart: number }
const aiUsage = new Map<string, UsageEntry>();
const AI_USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function getAiUsage(chatId: string): number {
  const e = aiUsage.get(chatId);
  if (!e) return 0;
  if (Date.now() - e.windowStart > AI_USAGE_WINDOW_MS) { aiUsage.delete(chatId); return 0; }
  return e.count;
}

function incrementAiUsage(chatId: string): number {
  const e = aiUsage.get(chatId);
  if (!e || Date.now() - e.windowStart > AI_USAGE_WINDOW_MS) {
    aiUsage.set(chatId, { count: 1, windowStart: Date.now() });
    return 1;
  }
  e.count++;
  return e.count;
}

// ── AI response generator ─────────────────────────────────────────────────────

async function generateAiResponse(transcript: string, contactHandle: string, userMessage: string): Promise<string> {
  const systemInstruction = [
    "You are a helpful support assistant for Salts & Peps, a peptide ordering platform.",
    "Your job is to answer customer questions concisely and helpfully.",
    transcript
      ? `Use the following Q&A transcript from real customer conversations as your primary knowledge base:\n\n--- TRANSCRIPT ---\n${transcript.slice(0, 40000)}\n--- END TRANSCRIPT ---`
      : "",
    "",
    "Guidelines:",
    "- Be concise (2-4 sentences unless a longer answer is clearly needed)",
    "- Only answer based on information in the transcript or widely known facts",
    "- Never fabricate specific order details, prices, tracking numbers, or policies not mentioned",
    `- If you genuinely cannot answer, say so and suggest contacting ${contactHandle}`,
    "- Respond in plain text — no markdown, no asterisks, no bullet symbols (this is Telegram)",
    "- Do not mention that you are an AI unless directly asked",
  ].filter(Boolean).join("\n");

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    config: { systemInstruction },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });

  return (response.text ?? "").trim() || "I'm not sure about that. Please contact support for more help.";
}

// ── Feedback conversation state machine ───────────────────────────────────────

interface FeedbackConv {
  step: "awaiting_category" | "awaiting_message";
  category?: string;
  ts: number;
}

const FEEDBACK_CONV_TTL_MS = 10 * 60 * 1000;
const feedbackConvs = new Map<string, FeedbackConv>();

function getFbConv(chatId: string): FeedbackConv | null {
  const s = feedbackConvs.get(chatId);
  if (!s) return null;
  if (Date.now() - s.ts > FEEDBACK_CONV_TTL_MS) { feedbackConvs.delete(chatId); return null; }
  return s;
}

function setFbConv(chatId: string, state: Omit<FeedbackConv, "ts">): void {
  feedbackConvs.set(chatId, { ...state, ts: Date.now() });
}

function clearFbConv(chatId: string): void {
  feedbackConvs.delete(chatId);
}

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  feedback:   "💬 Feedback",
  suggestion: "💡 Suggestion",
  bug:        "🐛 Bug Report",
  addition:   "✨ Addition",
};

async function startFeedbackFlow(chatId: string): Promise<void> {
  setFbConv(chatId, { step: "awaiting_category" });
  await sendTelegramMessageFull(
    chatId,
    "📬 <b>Share your feedback</b>\n\nWhat kind of message is this?",
    "HTML",
    undefined,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 Feedback",   callback_data: "fb:cat:feedback"   }, { text: "💡 Suggestion",  callback_data: "fb:cat:suggestion" }],
          [{ text: "🐛 Bug Report", callback_data: "fb:cat:bug"        }, { text: "✨ Addition",    callback_data: "fb:cat:addition"   }],
          [{ text: "❌ Cancel",      callback_data: "fb:cancel"                                                                       }],
        ],
      },
    },
  );
}

// ── Guided ticket-creation conversation state machine ─────────────────────────

interface TicketConv {
  step: "awaiting_category" | "awaiting_gbtype" | "awaiting_gb" | "awaiting_subject" | "awaiting_body" | "labs_search";
  category?: string;
  issueType?: string;
  groupBuyId?: string;
  groupBuyName?: string;
  subject?: string;
  ts: number;
}

const CONV_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ticketConvs = new Map<string, TicketConv>();

function getConv(chatId: string): TicketConv | null {
  const s = ticketConvs.get(chatId);
  if (!s) return null;
  if (Date.now() - s.ts > CONV_TTL_MS) { ticketConvs.delete(chatId); return null; }
  return s;
}

function setConv(chatId: string, state: Omit<TicketConv, "ts">): void {
  ticketConvs.set(chatId, { ...state, ts: Date.now() });
}

function clearConv(chatId: string): void {
  ticketConvs.delete(chatId);
}

const CATEGORY_LABELS: Record<string, string> = {
  group_buy:    "Group Buy",
  wholesale:    "Wholesale",
  testing_pool: "Testing Pool",
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  order_issue:     "Order Issue",
  general_support: "General Support",
};

// ── Guided flow helpers ───────────────────────────────────────────────────────

async function startTicketFlow(chatId: string): Promise<void> {
  setConv(chatId, { step: "awaiting_category" });
  await sendTelegramMessageFull(
    chatId,
    "👋 <b>New support request</b>\n\nWhat's this about?",
    "HTML",
    undefined,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌍 Group Buys",    callback_data: "tc:cat:group_buy" }],
          [{ text: "🤝 Wholesale",     callback_data: "tc:cat:wholesale" }],
          [{ text: "🧪 Testing Pool",  callback_data: "tc:cat:testing_pool" }],
          [{ text: "⬅️ Back to Menu",  callback_data: "mn:menu" }],
        ],
      },
    },
  );
}

async function askGroupBuyIssueType(chatId: string): Promise<void> {
  setConv(chatId, { step: "awaiting_gbtype", category: "group_buy" });
  await sendTelegramMessageFull(
    chatId,
    "🌍 <b>Group Buy</b>\n\nWhat kind of issue is this?",
    "HTML",
    undefined,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Order Issue",      callback_data: "tc:gbtype:order_issue" }],
          [{ text: "💬 General Support",  callback_data: "tc:gbtype:general_support" }],
          [{ text: "⬅️ Back",            callback_data: "tc:back:category" }, { text: "🏠 Menu", callback_data: "mn:menu" }],
        ],
      },
    },
  );
}

async function offerGroupBuyPicker(chatId: string, username: string): Promise<void> {
  setConv(chatId, { step: "awaiting_gb", category: "group_buy" });

  const gbRows = await pool.query<{ group_buy_id: string; name: string }>(
    `SELECT agb.group_buy_id, gb.name
     FROM account_group_buys agb
     JOIN group_buys gb ON agb.group_buy_id = gb.id
     WHERE agb.account_id = $1
     ORDER BY gb.name
     LIMIT 10`,
    [username],
  );

  if (gbRows.rows.length === 0) {
    // No GBs found — skip straight to subject
    setConv(chatId, { step: "awaiting_subject", category: "group_buy" });
    await askForSubject(chatId);
    return;
  }

  const keyboard = gbRows.rows.map(r => [
    { text: r.name, callback_data: `tc:gb:${r.group_buy_id}` },
  ]);
  keyboard.push([{ text: "🔍 Other / Not Listed", callback_data: "tc:gb:_other" }]);
  keyboard.push([{ text: "⬅️ Back",              callback_data: "tc:back:gbtype" }, { text: "🏠 Menu", callback_data: "mn:menu" }]);

  await sendTelegramMessageFull(
    chatId,
    "Which group buy is this about?",
    "HTML",
    undefined,
    { reply_markup: { inline_keyboard: keyboard } },
  );
}

async function askForSubject(chatId: string): Promise<void> {
  await sendTelegramMessageFull(
    chatId,
    "What's the <b>subject</b> of your request?\n\n<i>E.g. \"Missing item\" or \"Payment question\"</i>",
    "HTML",
    undefined,
    { reply_markup: { force_reply: true, input_field_placeholder: "Subject…" } },
  );
}

async function askForBody(chatId: string, subject: string): Promise<void> {
  await sendTelegramMessageFull(
    chatId,
    `Got it — <b>${subject}</b>\n\nNow please describe your issue or question in full:`,
    "HTML",
    undefined,
    { reply_markup: { force_reply: true, input_field_placeholder: "Describe your issue…" } },
  );
}

async function finaliseTicket(
  username: string,
  chatId: string,
  conv: TicketConv & { subject: string },
  body: string,
): Promise<void> {
  const ticketId = randomUUID();
  const now = new Date();
  const category = (conv.category ?? "general_support") as
    "order_issue" | "general_support" | "group_buy" | "wholesale" | "testing_pool";

  await db.insert(ticketsTable).values({
    id: ticketId,
    accountUsername: username,
    category,
    subject: conv.subject.slice(0, 100),
    groupBuyId: conv.groupBuyId ?? null,
    issueType: conv.issueType ?? null,
    status: "open",
    customerUnread: false,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(ticketMessagesTable).values({
    ticketId,
    authorRole: "customer",
    authorUsername: username,
    body,
    createdAt: now,
  });

  const catLabel = CATEGORY_LABELS[category] ?? category;
  const gbLabel  = conv.groupBuyName ? ` — ${conv.groupBuyName}` : "";

  const confirmResult = await sendTelegramMessageFull(
    chatId,
    `🎫 <b>Support ticket opened</b>\n` +
    `<b>Category:</b> ${catLabel}${gbLabel}\n` +
    `<b>Subject:</b> <i>${conv.subject}</i>\n\n` +
    `Your message has been received. The support team will reply shortly.\n\n` +
    `<i>Reply directly to this message to continue the conversation.</i>`,
    "HTML",
    undefined,
    { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back to Menu", callback_data: "mn:menu" }]] } },
  );

  if (confirmResult.messageId) {
    await db.insert(ticketTelegramMessagesTable).values({
      telegramMessageId: confirmResult.messageId,
      chatId,
      ticketId,
    });
  }

  sendAdminTicketNotification(
    `🎫 <b>New ticket via Telegram</b>\n` +
    `From: @${username}\n` +
    `Category: ${catLabel}${gbLabel}\n` +
    `Subject: <i>${conv.subject}</i>\n\n` +
    `${body.slice(0, 300)}${body.length > 300 ? "…" : ""}`,
    ticketId,
  ).then(({ ok, messageId, chatId: adminChatId }) => {
    if (ok && messageId && adminChatId) {
      db.insert(ticketTelegramMessagesTable).values({
        telegramMessageId: messageId,
        chatId: adminChatId,
        ticketId,
      }).catch(() => {});
    }
  }).catch(() => {});
}

// ── Ticket reply helpers ──────────────────────────────────────────────────────

async function appendToTicket(ticketId: string, username: string, chatId: string, text: string): Promise<void> {
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId));
  if (!ticket || ticket.status === "closed") {
    await sendTelegramMessage(chatId, `❌ That ticket is closed. Send <b>/support</b> to open a new one.`, "HTML");
    return;
  }

  const now = new Date();
  await db.insert(ticketMessagesTable).values({
    ticketId,
    authorRole: "customer",
    authorUsername: username,
    body: text,
    createdAt: now,
  });

  await db.update(ticketsTable)
    .set({ updatedAt: now, status: ticket.status === "resolved" ? "open" : ticket.status })
    .where(eq(ticketsTable.id, ticketId));

  const result = await sendTelegramMessageFull(
    chatId,
    `✅ <b>Reply sent</b> — <i>${ticket.subject}</i>\n\nThe support team will get back to you shortly.`,
    "HTML",
  );

  if (result.messageId) {
    await db.insert(ticketTelegramMessagesTable).values({
      telegramMessageId: result.messageId,
      chatId,
      ticketId,
    });
  }

  sendAdminTicketNotification(
    `💬 <b>Customer replied via Telegram</b>\n` +
    `From: @${username}\n` +
    `Ticket: <i>${ticket.subject}</i>\n\n` +
    `${text.slice(0, 300)}${text.length > 300 ? "…" : ""}`,
    ticketId,
  ).then(({ ok, messageId, chatId: adminChatId }) => {
    if (ok && messageId && adminChatId) {
      db.insert(ticketTelegramMessagesTable).values({
        telegramMessageId: messageId,
        chatId: adminChatId,
        ticketId,
      }).catch(() => {});
    }
  }).catch(() => {});
}

// ── Main Menu ─────────────────────────────────────────────────────────────────

async function sendMainMenu(chatId: string, username?: string): Promise<void> {
  const { template } = await getTemplate("bot_menu_header");
  const text = username
    ? renderTemplate(template, { username })
    : template.replace(/Hey @\{\{username\}\}! /, "");
  await sendTelegramMessageFull(
    chatId,
    text,
    "HTML",
    undefined,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📦 My Orders",      callback_data: "mn:orders" },
            { text: "🚚 Tracking",       callback_data: "mn:tracking" },
          ],
          [
            { text: "🌍 My Group Buys", callback_data: "mn:gbs" },
            { text: "🧪 Lab Reports",   callback_data: "mn:labs" },
          ],
          [
            { text: "🎫 Open a Ticket", callback_data: "mn:ticket" },
            { text: "❓ Help",           callback_data: "mn:help" },
          ],
        ],
      },
    },
  );
}

// ── POST /api/telegram/webhook ────────────────────────────────────────────────

router.post("/telegram/webhook", async (req, res): Promise<void> => {

  // ── Inline button callback ────────────────────────────────────────────────
  const callbackQuery = req.body?.callback_query as {
    id: string;
    data?: string;
    from?: { id?: number; username?: string };
    message?: { chat?: { id?: number }; message_id?: number };
  } | undefined;

  if (callbackQuery) {
    const cbData   = callbackQuery.data ?? "";
    const cbChatId = String(callbackQuery.message?.chat?.id ?? "");
    await answerCallbackQuery(callbackQuery.id);

    // ── Organiser "💬 Reply" button ─────────────────────────────────────────
    if (cbData.startsWith("org:rt:") && cbChatId) {
      const ticketId = cbData.slice(7);
      const [ticket] = await db
        .select({ subject: ticketsTable.subject, status: ticketsTable.status })
        .from(ticketsTable)
        .where(eq(ticketsTable.id, ticketId));

      if (ticket && ticket.status !== "closed") {
        const promptResult = await sendTelegramMessageFull(
          cbChatId,
          `💬 <b>Reply to ticket:</b> <i>${ticket.subject}</i>\n\nType your reply and send it as a reply to this message:`,
          "HTML",
          undefined,
          { reply_markup: { force_reply: true, input_field_placeholder: "Type your reply…" } },
        );
        if (promptResult.messageId) {
          await db.insert(ticketTelegramMessagesTable).values({
            telegramMessageId: promptResult.messageId,
            chatId: cbChatId,
            ticketId,
          });
        }
      }
      res.json({ ok: true });
      return;
    }

    // ── Admin "💬 Reply" button ──────────────────────────────────────────────
    if (cbData.startsWith("rt:") && cbChatId) {
      const ticketId = cbData.slice(3);
      const [ticket] = await db
        .select({ subject: ticketsTable.subject, status: ticketsTable.status })
        .from(ticketsTable)
        .where(eq(ticketsTable.id, ticketId));

      if (ticket && ticket.status !== "closed") {
        const promptResult = await sendTelegramMessageFull(
          cbChatId,
          `💬 <b>Reply to:</b> <i>${ticket.subject}</i>\n\nType your message and send it as a reply to this prompt:`,
          "HTML",
          { recipientType: "admin" },
          { reply_markup: { force_reply: true, input_field_placeholder: "Type your reply…" } },
        );
        if (promptResult.messageId) {
          await db.insert(ticketTelegramMessagesTable).values({
            telegramMessageId: promptResult.messageId,
            chatId: cbChatId,
            ticketId,
          });
          console.log(`[telegram:callback] ForceReply prompt sent for ticketId=${ticketId} promptMsgId=${promptResult.messageId}`);
        }
      } else {
        console.log(`[telegram:callback] ticket=${ticketId} closed or not found`);
      }
      res.json({ ok: true });
      return;
    }

    // ── Feedback flow callbacks ───────────────────────────────────────────────
    if ((cbData.startsWith("fb:cat:") || cbData === "fb:cancel") && cbChatId) {
      if (cbData === "fb:cancel") {
        clearFbConv(cbChatId);
        await sendTelegramMessage(cbChatId, "❌ Feedback cancelled.", "HTML");
        res.json({ ok: true }); return;
      }
      const category = cbData.slice("fb:cat:".length);
      if (!FEEDBACK_CATEGORY_LABELS[category]) { res.json({ ok: true }); return; }
      setFbConv(cbChatId, { step: "awaiting_message", category });
      const label = FEEDBACK_CATEGORY_LABELS[category];
      await sendTelegramMessageFull(
        cbChatId,
        `${label}\n\nType your message below and send it:`,
        "HTML",
        undefined,
        { reply_markup: { force_reply: true, input_field_placeholder: "Write your message…" } },
      );
      res.json({ ok: true }); return;
    }

    // ── Ticket creation flow callbacks ────────────────────────────────────────
    if (cbData.startsWith("tc:") && cbChatId) {
      // Look up linked account for this chatId
      const [account] = await db
        .select({ telegramUsername: accountsTable.telegramUsername })
        .from(accountsTable)
        .where(eq(accountsTable.telegramChatId, cbChatId));

      if (!account) {
        await sendTelegramMessage(cbChatId, `Please link your account first with <code>/link YOUR_CODE</code>`, "HTML");
        res.json({ ok: true });
        return;
      }

      const username = account.telegramUsername;

      if (cbData === "tc:cancel") {
        clearConv(cbChatId);
        await sendTelegramMessage(cbChatId, "Cancelled. Send <b>/support</b> any time to open a support request.", "HTML");

      } else if (cbData.startsWith("tc:back:")) {
        const dest = cbData.slice("tc:back:".length);
        if (dest === "category") {
          await startTicketFlow(cbChatId);
        } else if (dest === "gbtype") {
          await askGroupBuyIssueType(cbChatId);
        } else if (dest === "gb") {
          const conv = getConv(cbChatId);
          await offerGroupBuyPicker(cbChatId, username);
          if (conv?.issueType) setConv(cbChatId, { ...getConv(cbChatId)!, issueType: conv.issueType });
        }

      } else if (cbData.startsWith("tc:cat:")) {
        const category = cbData.slice("tc:cat:".length);
        if (!CATEGORY_LABELS[category]) {
          clearConv(cbChatId);
          res.json({ ok: true }); return;
        }
        if (category === "group_buy") {
          await askGroupBuyIssueType(cbChatId);
        } else {
          setConv(cbChatId, { step: "awaiting_subject", category });
          await askForSubject(cbChatId);
        }

      } else if (cbData.startsWith("tc:gbtype:")) {
        const issueType = cbData.slice("tc:gbtype:".length);
        if (!ISSUE_TYPE_LABELS[issueType]) { res.json({ ok: true }); return; }
        setConv(cbChatId, { step: "awaiting_gb", category: "group_buy", issueType });
        await offerGroupBuyPicker(cbChatId, username);

      } else if (cbData.startsWith("tc:gb:")) {
        const conv = getConv(cbChatId);
        const gbId = cbData.slice("tc:gb:".length);
        if (gbId === "_other") {
          setConv(cbChatId, { step: "awaiting_subject", category: "group_buy", issueType: conv?.issueType });
          await askForSubject(cbChatId);
        } else {
          const result = await pool.query<{ name: string }>(
            "SELECT name FROM group_buys WHERE id = $1 LIMIT 1",
            [gbId],
          );
          const gbName = result.rows[0]?.name ?? gbId;
          setConv(cbChatId, { step: "awaiting_subject", category: "group_buy", issueType: conv?.issueType, groupBuyId: gbId, groupBuyName: gbName });
          await askForSubject(cbChatId);
        }
      }

      res.json({ ok: true });
      return;
    }

    // ── Parcel status menu — shows all member parcels for a GB ───────────────
    // ── Check status button on dispatch notification — show parcel status directly ──
    if (cbData.startsWith("ps_menu:") && cbChatId) {
      const parcelId = cbData.slice(8);
      const _cbChatId2 = cbChatId;
      const tgUsernamePsMenu = callbackQuery.from?.username ?? "";

      // ACK immediately so the button clears; do the slow refresh in background
      res.json({ ok: true });

      (async () => {
        try { await refreshSingleGbParcel(parcelId); } catch { /* use cached */ }

        const [p] = await db
          .select({
            id: gbParcelsTable.id,
            label: gbParcelsTable.label,
            status: gbParcelsTable.status,
            trackingNumber: gbParcelsTable.trackingNumber,
            cachedEvents: gbParcelsTable.cachedEvents,
            groupBuyId: gbParcelsTable.groupBuyId,
            items: gbParcelsTable.items,
          })
          .from(gbParcelsTable)
          .where(eq(gbParcelsTable.id, parcelId));

        if (!p) { await sendTelegramMessage(_cbChatId2, "Parcel not found.", "HTML"); return; }

        const [gb] = await db
          .select({ name: groupBuysTable.name })
          .from(groupBuysTable)
          .where(eq(groupBuysTable.id, p.groupBuyId));

        const tn = p.trackingNumber ?? "";
        const status = p.status ?? "pending";
        const parcelDonePm = status === "delivered";
        const emoji = parcelDonePm ? "✅" : status === "out_for_delivery" ? "🚚" : status === "attempted" ? "⚠️" : status === "exception" ? "🚨" : "📍";

        const u = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const d = "0123456789";
        const pick = (s: string, n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
        const masked = tn ? `${pick(u, 3)}${"*".repeat(8)}${pick(d, 3)}${pick(u, 2)}` : "";

        const fmtDate = (raw: string): string => {
          try {
            const dt = new Date(raw);
            if (isNaN(dt.getTime())) return raw;
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${pad(dt.getUTCDate())}-${pad(dt.getUTCMonth() + 1)}-${dt.getUTCFullYear()} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
          } catch { return raw; }
        };

        const events = (p.cachedEvents ?? []) as Array<{ date: string; status: string; location?: string }>;
        const eventLines = events.length > 0
          ? events.map(ev => `• ${fmtDate(ev.date)} — ${translateZh(ev.status)}${ev.location ? ` (${ev.location})` : ""}`).join("\n")
          : null;

        // Find which of the customer's items are in this parcel, and what else they're waiting for
        let itemSectionPm = "";
        const parcelItemsPm = (p.items ?? []) as Array<{ name: string; qty: number }>;
        if (tgUsernamePsMenu) {
          const custOrdersPm = await db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(and(
              eq(ordersTable.groupBuyId, p.groupBuyId),
              sql`lower(${ordersTable.telegramUsername}) = ${tgUsernamePsMenu.toLowerCase()}`,
              isNull(ordersTable.deletedAt),
            ));
          if (custOrdersPm.length > 0) {
            const custLisPm = await db
              .select({ productName: orderLineItemsTable.productName })
              .from(orderLineItemsTable)
              .where(inArray(orderLineItemsTable.orderId, custOrdersPm.map(o => o.id)));
            if (custLisPm.length > 0) {
              const custItemSetPm = new Set(custLisPm.map(li => li.productName.trim().toLowerCase()));
              const myItemsPm = parcelItemsPm
                .filter(i => custItemSetPm.has(i.name.trim().toLowerCase()))
                .map(i => i.name);

              // Items the customer ordered that are NOT in this parcel
              const myItemsPmLower = new Set(myItemsPm.map(n => n.trim().toLowerCase()));
              const otherCustItemsPm = custLisPm.filter(li => !myItemsPmLower.has(li.productName.trim().toLowerCase()));

              // Fetch all other parcels in this GB to cross-reference
              const otherParcelsPm = otherCustItemsPm.length > 0
                ? (await db
                    .select({ id: gbParcelsTable.id, label: gbParcelsTable.label, status: gbParcelsTable.status, items: gbParcelsTable.items })
                    .from(gbParcelsTable)
                    .where(eq(gbParcelsTable.groupBuyId, p.groupBuyId))
                  ).filter(op => op.id !== p.id)
                : [];

              const sectionPartsPm: string[] = [];

              if (myItemsPm.length > 0) {
                const iEmoji = parcelDonePm ? "✅" : "⏳";
                sectionPartsPm.push(`<b>${parcelDonePm ? "In this parcel — arrived:" : "In this parcel:"}</b>\n${myItemsPm.map(n => `${iEmoji} ${n}`).join("\n")}`);
              }

              if (otherCustItemsPm.length > 0) {
                const otherLinesPm: string[] = [];
                for (const li of otherCustItemsPm) {
                  const lname = li.productName.trim().toLowerCase();
                  const match = otherParcelsPm.find(op =>
                    ((op.items ?? []) as Array<{ name: string }>).some(i => i.name.trim().toLowerCase() === lname)
                  );
                  if (match) {
                    const st = match.status ?? "pending";
                    const stEmoji = st === "delivered" ? "✅" : st === "out_for_delivery" ? "🚚" : "⏳";
                    otherLinesPm.push(`${stEmoji} ${li.productName} — ${match.label}`);
                  } else {
                    otherLinesPm.push(`📋 ${li.productName} — not yet dispatched`);
                  }
                }
                sectionPartsPm.push(`<b>Your other items:</b>\n${otherLinesPm.join("\n")}`);
              }

              if (sectionPartsPm.length > 0) {
                itemSectionPm = "\n\n" + sectionPartsPm.join("\n\n");
              }
            }
          }
        }

        const lines = [
          `${emoji} <b>${gb?.name ?? p.groupBuyId}</b> — <b>${p.label}</b>`,
          tn ? `Tracking: <code>${masked}</code>` : null,
          itemSectionPm || null,
          eventLines ? `\n<b>Tracking history:</b>\n${eventLines}` : "No tracking events yet.",
        ].filter(Boolean).join("\n");

        await sendTelegramMessage(_cbChatId2, lines, "HTML");
      })().catch(() => {});
      return;
    }

    // ── All member parcels for a GB ───────────────────────────────────────────
    if (cbData.startsWith("ps_all:") && cbChatId) {
      const gbId = cbData.slice(7);
      const viewerUsername = (req.body?.callback_query?.from?.username as string | undefined) ?? "";

      if (!viewerUsername) {
        await sendTelegramMessage(cbChatId, "Could not identify your Telegram account.", "HTML");
        res.json({ ok: true }); return;
      }

      const allParcels = await db
        .select({ id: gbParcelsTable.id, label: gbParcelsTable.label, items: gbParcelsTable.items, status: gbParcelsTable.status, cachedEvents: gbParcelsTable.cachedEvents, groupBuyId: gbParcelsTable.groupBuyId, reshipperUsername: gbParcelsTable.reshipperUsername })
        .from(gbParcelsTable)
        .where(eq(gbParcelsTable.groupBuyId, gbId));

      const memberOrders2 = await db
        .select({ id: ordersTable.id, reshipperUsername: ordersTable.reshipperUsername, countryLegId: ordersTable.countryLegId, routingType: ordersTable.routingType })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.groupBuyId, gbId),
          sql`lower(${ordersTable.telegramUsername}) = ${viewerUsername.toLowerCase()}`,
          isNull(ordersTable.deletedAt),
        ));

      const memberItems2 = new Set<string>();
      if (memberOrders2.length > 0) {
        const lis = await db
          .select({ productName: orderLineItemsTable.productName })
          .from(orderLineItemsTable)
          .where(inArray(orderLineItemsTable.orderId, memberOrders2.map(o => o.id)));
        for (const li of lis) memberItems2.add(li.productName.trim().toLowerCase());
      }

      // Build the set of reshippers this member is routed through in this GB
      const assignedReshippers2 = new Set<string>(
        (memberOrders2.map(o => o.reshipperUsername).filter(Boolean) as string[])
          .map(u => u.replace(/^@/, "").toLowerCase())
      );
      const nonDirectLegOrders2 = memberOrders2.filter(o => o.countryLegId && o.routingType !== "direct");
      if (nonDirectLegOrders2.length > 0) {
        const legIds3 = [...new Set(nonDirectLegOrders2.map(o => o.countryLegId!))];
        const legRows3 = await db
          .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, gbId: gbCountryLegsTable.gbId })
          .from(gbCountryLegsTable)
          .where(inArray(gbCountryLegsTable.id, legIds3));
        for (const leg of legRows3) {
          const reshippers3 = await db
            .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
            .from(gbReshippersTable)
            .where(and(
              eq(gbReshippersTable.gbId, leg.gbId),
              eq(gbReshippersTable.country, leg.countryCode),
              eq(gbReshippersTable.enabled, true),
            ));
          reshippers3.forEach(r => {
            if (r.reshipperUsername) assignedReshippers2.add(r.reshipperUsername.replace(/^@/, "").toLowerCase());
          });
        }
      }

      const memberParcels2 = allParcels.map(p => {
        const pItems = ((p.items ?? []) as { name: string }[]);
        // Apply reshipper leg filter: reshipper parcels only visible to members on that leg
        if (p.reshipperUsername) {
          if (!assignedReshippers2.has(p.reshipperUsername.replace(/^@/, "").toLowerCase())) return { ...p, matchedItems: [] as string[] };
        }
        const matched = memberItems2.size > 0
          ? pItems.filter(i => memberItems2.has(i.name.trim().toLowerCase())).map(i => i.name)
          : pItems.map(i => i.name);
        // For reshipper parcels with no manifest yet, show them (status-only view); for unassigned parcels require items
        if (p.reshipperUsername && pItems.length === 0) return { ...p, matchedItems: ["(manifest pending)"] };
        return { ...p, matchedItems: matched };
      }).filter(p => p.matchedItems.length > 0);

      if (memberParcels2.length === 0) {
        await sendTelegramMessage(cbChatId, "No packages found for your orders in this group buy.", "HTML");
        res.json({ ok: true }); return;
      }

      const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
      const fmtDate3 = (raw: string): string => { try { const d = new Date(raw); if (isNaN(d.getTime())) return raw; const pad = (n: number) => String(n).padStart(2, "0"); return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; } catch { return raw; } };

      const sections: string[] = [`<b>${gb?.name ?? gbId}</b> — your packages:\n`];
      for (const p of memberParcels2) {
        const status = p.status ?? "pending";
        const parcelDone = status === "delivered";
        const emoji = parcelDone ? "✅" : status === "out_for_delivery" ? "🚚" : status === "attempted" ? "⚠️" : status === "exception" ? "🚨" : "📍";
        const events = (p.cachedEvents ?? []) as Array<{ date: string; status: string; location?: string }>;
        const latestEvent = events[0];
        const latestLine = latestEvent ? `\nLatest: ${fmtDate3(latestEvent.date)} — ${translateZh(latestEvent.status)}` : "";
        const iEmoji = parcelDone ? "✅" : "⏳";
        const itemLines = p.matchedItems.length > 0
          ? "\n" + p.matchedItems.map(i => `${iEmoji} ${i}`).join("\n")
          : "";
        sections.push(`${emoji} <b>${p.label}</b>${itemLines}${latestLine}`);
      }

      // Summary: which items arrived vs still on the way
      const itemStatuses = memberParcels2.flatMap(p =>
        p.matchedItems.map(name => ({ name, delivered: (p.status ?? "pending") === "delivered" }))
      );
      if (itemStatuses.length > 0) {
        const arrived = itemStatuses.filter(i => i.delivered).map(i => i.name);
        const waiting = itemStatuses.filter(i => !i.delivered).map(i => i.name);
        const summaryParts: string[] = [];
        if (arrived.length > 0) summaryParts.push(`✅ <b>Arrived:</b> ${arrived.join(", ")}`);
        if (waiting.length > 0) summaryParts.push(`⏳ <b>Still on the way:</b> ${waiting.join(", ")}`);
        if (summaryParts.length > 0) sections.push(`─────────────\n${summaryParts.join("\n")}`);
      }

      await sendTelegramMessage(cbChatId, sections.join("\n\n"), "HTML");
      res.json({ ok: true }); return;
    }

    // ── Not yet dispatched items ─────────────────────────────────────────────
    if (cbData.startsWith("ps_pending:") && cbChatId) {
      const tgUsernamePend = callbackQuery.from?.username ?? "";
      if (!tgUsernamePend) {
        await sendTelegramMessage(cbChatId, "Could not identify your Telegram account.", "HTML");
        res.json({ ok: true }); return;
      }

      const gbIdPend = cbData.slice("ps_pending:".length);

      // Get this user's orders for this specific GB
      const userOrders = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(and(
          sql`lower(regexp_replace(${ordersTable.telegramUsername}, '^@', '')) = ${tgUsernamePend.toLowerCase()}`,
          eq(ordersTable.groupBuyId, gbIdPend),
          isNull(ordersTable.deletedAt),
        ));

      if (userOrders.length === 0) {
        await sendTelegramMessage(cbChatId, "No orders found for this group buy.", "HTML");
        res.json({ ok: true }); return;
      }

      // Get all line items from those orders
      const userLineItems = await db
        .select({ productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity })
        .from(orderLineItemsTable)
        .where(inArray(orderLineItemsTable.orderId, userOrders.map(o => o.id)));

      const orderedItems = new Map<string, { name: string; qty: number }>();
      for (const li of userLineItems) {
        const key = li.productName.trim().toLowerCase();
        const qty = parseFloat(li.quantity as unknown as string) || 1;
        const existing = orderedItems.get(key);
        if (existing) { existing.qty += qty; } else { orderedItems.set(key, { name: li.productName.trim(), qty }); }
      }

      // Get all items that have been put into parcels for this GB
      const gbParcels = await db
        .select({ items: gbParcelsTable.items })
        .from(gbParcelsTable)
        .where(eq(gbParcelsTable.groupBuyId, gbIdPend));

      const dispatchedKeys = new Set<string>();
      for (const parcel of gbParcels) {
        for (const item of ((parcel.items ?? []) as Array<{ name: string }>)) {
          dispatchedKeys.add(item.name.trim().toLowerCase());
        }
      }

      // Items the user ordered that aren't in any parcel yet
      const pending = [...orderedItems.values()].filter(e => !dispatchedKeys.has(e.name.trim().toLowerCase()));

      const [gbRowPend] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbIdPend));
      const gbNamePend = gbRowPend?.name ?? gbIdPend;

      const backKeyboard = { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `mn:track_gb:${gbIdPend}` }]] } };

      if (pending.length === 0) {
        await sendTelegramMessageFull(cbChatId, `✅ All your items from <b>${gbNamePend}</b> have been dispatched!`, "HTML", undefined, backKeyboard);
      } else {
        const lines = pending.map(e => `📋 ${e.name}${e.qty > 1 ? ` ×${e.qty}` : ""}`).join("\n");
        await sendTelegramMessageFull(cbChatId, `⏳ <b>Not yet dispatched — ${gbNamePend}:</b>\n\n${lines}`, "HTML", undefined, backKeyboard);
      }
      res.json({ ok: true }); return;
    }

    // ── Parcel status check (📦 Check status button) ─────────────────────────
    if (cbData.startsWith("ps:") && cbChatId) {
      const parcelId = cbData.slice(3);
      const _cbChatId = cbChatId;
      const tgUsernamePsCheck = callbackQuery.from?.username ?? "";

      // ACK webhook immediately so the button clears — refresh + send happens in background
      res.json({ ok: true });

      (async () => {
        // Live refresh first (may be slow — that's why we ACKed above)
        try { await refreshSingleGbParcel(parcelId); } catch { /* use cached data */ }

        const [parcel] = await db
          .select({
            id: gbParcelsTable.id,
            label: gbParcelsTable.label,
            status: gbParcelsTable.status,
            trackingNumber: gbParcelsTable.trackingNumber,
            cachedEvents: gbParcelsTable.cachedEvents,
            groupBuyId: gbParcelsTable.groupBuyId,
            items: gbParcelsTable.items,
          })
          .from(gbParcelsTable)
          .where(eq(gbParcelsTable.id, parcelId));

        if (!parcel) {
          await sendTelegramMessage(_cbChatId, "Parcel not found.", "HTML");
          return;
        }

        const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, parcel.groupBuyId));

        const tn = parcel.trackingNumber ?? "";
        const status = parcel.status ?? "pending";
        const parcelDonePs = status === "delivered";
        const emoji = parcelDonePs ? "✅" : status === "out_for_delivery" ? "🚚" : status === "attempted" ? "⚠️" : status === "exception" ? "🚨" : "📍";

        const u = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const d = "0123456789";
        const pick = (s: string, n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
        const masked = tn ? `${pick(u, 3)}${"*".repeat(8)}${pick(d, 3)}${pick(u, 2)}` : "";

        const fmtDate = (raw: string): string => {
          try {
            const dt = new Date(raw);
            if (isNaN(dt.getTime())) return raw;
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${pad(dt.getUTCDate())}-${pad(dt.getUTCMonth() + 1)}-${dt.getUTCFullYear()} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
          } catch { return raw; }
        };

        const events = (parcel.cachedEvents ?? []) as Array<{ date: string; status: string; location?: string }>;
        const eventLines = events.length > 0
          ? events.map(ev => `• ${fmtDate(ev.date)} — ${translateZh(ev.status)}${ev.location ? ` (${ev.location})` : ""}`).join("\n")
          : null;

        // Find which of the customer's items are in this parcel, and what else they're waiting for
        let itemSection = "";
        const parcelItems = (parcel.items ?? []) as Array<{ name: string; qty: number }>;
        if (tgUsernamePsCheck) {
          const custOrders = await db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(and(
              eq(ordersTable.groupBuyId, parcel.groupBuyId),
              sql`lower(${ordersTable.telegramUsername}) = ${tgUsernamePsCheck.toLowerCase()}`,
              isNull(ordersTable.deletedAt),
            ));
          if (custOrders.length > 0) {
            const custLis = await db
              .select({ productName: orderLineItemsTable.productName })
              .from(orderLineItemsTable)
              .where(inArray(orderLineItemsTable.orderId, custOrders.map(o => o.id)));
            if (custLis.length > 0) {
              const custItemSet = new Set(custLis.map(li => li.productName.trim().toLowerCase()));
              const myItems = parcelItems
                .filter(i => custItemSet.has(i.name.trim().toLowerCase()))
                .map(i => i.name);

              // Items the customer ordered that are NOT in this parcel
              const myItemsLower = new Set(myItems.map(n => n.trim().toLowerCase()));
              const otherCustItems = custLis.filter(li => !myItemsLower.has(li.productName.trim().toLowerCase()));

              // Fetch all other parcels in this GB to cross-reference
              const otherParcels = otherCustItems.length > 0
                ? (await db
                    .select({ id: gbParcelsTable.id, label: gbParcelsTable.label, status: gbParcelsTable.status, items: gbParcelsTable.items })
                    .from(gbParcelsTable)
                    .where(eq(gbParcelsTable.groupBuyId, parcel.groupBuyId))
                  ).filter(op => op.id !== parcel.id)
                : [];

              const sectionParts: string[] = [];

              if (myItems.length > 0) {
                const iEmoji = parcelDonePs ? "✅" : "⏳";
                sectionParts.push(`<b>${parcelDonePs ? "In this parcel — arrived:" : "In this parcel:"}</b>\n${myItems.map(n => `${iEmoji} ${n}`).join("\n")}`);
              }

              if (otherCustItems.length > 0) {
                const otherLines: string[] = [];
                for (const li of otherCustItems) {
                  const lname = li.productName.trim().toLowerCase();
                  const match = otherParcels.find(op =>
                    ((op.items ?? []) as Array<{ name: string }>).some(i => i.name.trim().toLowerCase() === lname)
                  );
                  if (match) {
                    const st = match.status ?? "pending";
                    const stEmoji = st === "delivered" ? "✅" : st === "out_for_delivery" ? "🚚" : "⏳";
                    otherLines.push(`${stEmoji} ${li.productName} — ${match.label}`);
                  } else {
                    otherLines.push(`📋 ${li.productName} — not yet dispatched`);
                  }
                }
                sectionParts.push(`<b>Your other items:</b>\n${otherLines.join("\n")}`);
              }

              if (sectionParts.length > 0) {
                itemSection = "\n\n" + sectionParts.join("\n\n");
              }
            }
          }
        }

        const lines = [
          `${emoji} <b>${gb?.name ?? parcel.groupBuyId}</b> — <b>${parcel.label}</b>`,
          tn ? `Tracking: <code>${masked}</code>` : null,
          itemSection || null,
          eventLines ? `\n<b>Tracking history:</b>\n${eventLines}` : null,
        ].filter(Boolean).join("\n");

        await sendTelegramMessage(_cbChatId, lines, "HTML");
      })().catch(() => {});
      return;
    }

    // ── Parcel notification opt-in / opt-out ──────────────────────────────────
    if ((cbData.startsWith("pn:yes:") || cbData.startsWith("pn:no:")) && cbChatId) {
      const optIn = cbData.startsWith("pn:yes:");
      const parcelId = cbData.replace(/^pn:(yes|no):/, "");

      const [parcel] = await db
        .select({ id: gbParcelsTable.id, label: gbParcelsTable.label })
        .from(gbParcelsTable)
        .where(eq(gbParcelsTable.id, parcelId));

      if (parcel) {
        const username = callbackQuery.from?.username ?? null;
        await db
          .insert(gbParcelOptinsTable)
          .values({
            id: randomUUID(),
            parcelId,
            telegramChatId: cbChatId,
            telegramUsername: username ?? undefined,
            optedIn: optIn,
          })
          .onConflictDoUpdate({
            target: [gbParcelOptinsTable.parcelId, gbParcelOptinsTable.telegramChatId],
            set: { optedIn: optIn, telegramUsername: username ?? undefined, updatedAt: new Date() },
          });

        const replyKey = optIn ? "bot_parcel_optin_yes" : "bot_parcel_optin_no";
        const { template: optinTpl } = await getTemplate(replyKey);
        await sendTelegramMessage(cbChatId, renderTemplate(optinTpl, { label: parcel.label }), "HTML");
      }

      res.json({ ok: true });
      return;
    }

    // ── Admin quick-action callbacks ─────────────────────────────────────────
    if (cbData.startsWith("adm:") && cbChatId) {
      const admChatIdCheck = await getAdminChatId();
      if (!admChatIdCheck || cbChatId !== admChatIdCheck) { res.json({ ok: true }); return; }

      const action = cbData.slice(4);
      const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
      const backRow = [{ text: "⬅️ Back to Menu", callback_data: "adm:menu" }];

      // ── Re-send admin menu ────────────────────────────────────────────────
      if (action === "menu") {
        await sendTelegramMessageFull(cbChatId,
          `🛠 <b>Salt &amp; Peps Admin</b>\n\nWelcome back. Choose an area to manage:`,
          "HTML", undefined, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📊 Dashboard", callback_data: "adm:dashboard" }, { text: "📦 Orders", callback_data: "adm:orders" }],
                [{ text: "💳 Payments", url: `${appUrl}/admin#payments` }, { text: "🎫 Tickets", callback_data: "adm:tickets" }],
                [{ text: "🛒 Group Buys", url: `${appUrl}/admin#groupbuy` }, { text: "🧪 Lab Tests", url: `${appUrl}/admin#labtests` }],
                [{ text: "👥 Members", url: `${appUrl}/admin#members` }, { text: "⚙️ Settings", url: `${appUrl}/admin#config` }],
              ],
            },
          });
        res.json({ ok: true }); return;
      }

      // ── 📊 Dashboard KPIs ────────────────────────────────────────────────
      if (action === "dashboard") {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [allOrders, activeGbs, openTicketsRes] = await Promise.all([
          db.select({
            status: ordersTable.status,
            paymentStatus: ordersTable.paymentStatus,
            grandTotal: ordersTable.grandTotal,
            createdAt: ordersTable.createdAt,
          }).from(ordersTable).where(isNull(ordersTable.deletedAt)),
          db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.status, "active")),
          db.select({ count: sql<number>`count(*)::int` }).from(ticketsTable).where(inArray(ticketsTable.status, ["open", "in_progress"])),
        ]);

        const confirmed = allOrders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed");
        const totalRevenue = confirmed.reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
        const todayRevenue = confirmed.filter(o => new Date(o.createdAt) >= todayStart).reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
        const weekRevenue = confirmed.filter(o => new Date(o.createdAt) >= sevenDaysAgo).reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
        const pendingPay = allOrders.filter(o => ["pending_confirmation", "test_ready"].includes(o.paymentStatus ?? "")).length;
        const activeOrders = allOrders.filter(o => !["Cancelled", "Completed"].includes(o.status)).length;
        const openTicketCount = openTicketsRes[0]?.count ?? 0;

        const msg =
          `📊 <b>Dashboard</b>\n\n` +
          `💰 <b>Revenue</b>\n` +
          `  Today: £${todayRevenue.toFixed(2)}  ·  7d: £${weekRevenue.toFixed(2)}  ·  All time: £${totalRevenue.toFixed(2)}\n\n` +
          `📦 <b>Orders</b>\n` +
          `  Active: ${activeOrders}  ·  Pending payment: ${pendingPay}\n\n` +
          `🛒 Active Group Buys: <b>${activeGbs.length}</b>\n` +
          `🎫 Open Tickets: <b>${openTicketCount}</b>`;

        await sendTelegramMessageFull(cbChatId, msg, "HTML", undefined, {
          reply_markup: { inline_keyboard: [[{ text: "🌐 Open Dashboard", url: `${appUrl}/admin#dashboard` }], backRow] },
        });
        res.json({ ok: true }); return;
      }

      // ── 📦 Latest Orders ─────────────────────────────────────────────────
      if (action === "orders") {
        const recentOrders = await db.select({
          code: ordersTable.code,
          telegramUsername: ordersTable.telegramUsername,
          groupBuyId: ordersTable.groupBuyId,
          grandTotal: ordersTable.grandTotal,
          status: ordersTable.status,
          paymentStatus: ordersTable.paymentStatus,
          createdAt: ordersTable.createdAt,
        }).from(ordersTable).where(isNull(ordersTable.deletedAt)).orderBy(desc(ordersTable.createdAt)).limit(10);

        const gbIds = [...new Set(recentOrders.map(o => o.groupBuyId).filter(Boolean))] as string[];
        const gbs = gbIds.length > 0
          ? await db.select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency }).from(groupBuysTable).where(inArray(groupBuysTable.id, gbIds))
          : [];
        const gbMap = new Map(gbs.map(g => [g.id, g]));

        const ORDER_EMOJI: Record<string, string> = {
          Draft: "📝", Submitted: "📬", Processing: "⚙️", Shipped: "🚚", Completed: "✅", Cancelled: "❌",
        };

        const lines = recentOrders.map(o => {
          const emoji = ORDER_EMOJI[o.status] ?? "📦";
          const user = `@${(o.telegramUsername ?? "unknown").replace(/^@/, "")}`;
          const gbInfo = o.groupBuyId ? gbMap.get(o.groupBuyId) : null;
          const gb = gbInfo?.name ?? (o.groupBuyId ? o.groupBuyId : "—");
          const cur = gbInfo?.currency ?? "GBP";
          const total = `${cur} ${Number(o.grandTotal ?? 0).toFixed(2)}`;
          return `${emoji} ${user}  ·  ${gb}  ·  ${total}`;
        });

        const msg = `📦 <b>Latest Orders</b>\n\n${lines.join("\n")}`;
        await sendTelegramMessageFull(cbChatId, msg, "HTML", undefined, {
          reply_markup: { inline_keyboard: [[{ text: "🌐 View All Orders", url: `${appUrl}/admin#orders` }], backRow] },
        });
        res.json({ ok: true }); return;
      }

      // ── 🎫 Open Tickets ──────────────────────────────────────────────────
      if (action === "tickets") {
        const openTickets = await db.select({
          accountUsername: ticketsTable.accountUsername,
          subject: ticketsTable.subject,
          status: ticketsTable.status,
          updatedAt: ticketsTable.updatedAt,
          createdAt: ticketsTable.createdAt,
        }).from(ticketsTable).where(inArray(ticketsTable.status, ["open", "in_progress"])).orderBy(desc(ticketsTable.updatedAt)).limit(10);

        if (openTickets.length === 0) {
          await sendTelegramMessageFull(cbChatId,
            `🎫 <b>Open Tickets</b>\n\n✅ No open tickets — all clear!`,
            "HTML", undefined, { reply_markup: { inline_keyboard: [backRow] } });
          res.json({ ok: true }); return;
        }

        const STATUS_EMOJI: Record<string, string> = { open: "🔴", in_progress: "🟡" };
        const lines = openTickets.map(t => {
          const emoji = STATUS_EMOJI[t.status] ?? "🎫";
          const hoursOld = Math.floor((Date.now() - new Date(t.updatedAt ?? t.createdAt).getTime()) / (1000 * 60 * 60));
          const age = hoursOld < 24 ? `${hoursOld}h` : `${Math.floor(hoursOld / 24)}d`;
          const subject = t.subject.length > 35 ? t.subject.slice(0, 35) + "…" : t.subject;
          return `${emoji} @${t.accountUsername}  ·  <i>${subject}</i>  ·  ${age} ago`;
        });

        const msg = `🎫 <b>Open Tickets</b> (${openTickets.length})\n\n${lines.join("\n")}`;
        await sendTelegramMessageFull(cbChatId, msg, "HTML", undefined, {
          reply_markup: { inline_keyboard: [[{ text: "🌐 View All Tickets", url: `${appUrl}/admin#tickets` }], backRow] },
        });
        res.json({ ok: true }); return;
      }

      res.json({ ok: true }); return;
    }

    // ── Main menu callbacks ───────────────────────────────────────────────────
    if (cbData.startsWith("mn:") && cbChatId) {
      const action = cbData.slice(3);

      // Resolve linked username for user-specific queries
      const [linked] = await db
        .select({ telegramUsername: accountsTable.telegramUsername })
        .from(accountsTable)
        .where(eq(accountsTable.telegramChatId, cbChatId));

      const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

      // ── 📦 My Orders ────────────────────────────────────────────────────────
      if (action === "orders") {
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        const normalizedUsername = linked.telegramUsername.replace(/^@/, "").toLowerCase();
        const orders = await db
          .select({
            code: ordersTable.code,
            status: ordersTable.status,
            grandTotal: ordersTable.grandTotal,
            paymentStatus: ordersTable.paymentStatus,
            groupBuyId: ordersTable.groupBuyId,
            gbName: groupBuysTable.name,
            gbCurrency: groupBuysTable.currency,
            createdAt: ordersTable.createdAt,
          })
          .from(ordersTable)
          .leftJoin(groupBuysTable, eq(groupBuysTable.id, ordersTable.groupBuyId))
          .where(sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${normalizedUsername}`)
          .orderBy(desc(ordersTable.createdAt))
          .limit(5);

        if (orders.length === 0) {
          const { template: ordersEmptyTpl } = await getTemplate("bot_orders_empty");
          await sendTelegramMessage(cbChatId, renderTemplate(ordersEmptyTpl, { app_url: appUrl }), "HTML");
          res.json({ ok: true }); return;
        }

        const STATUS_EMOJI: Record<string, string> = {
          Draft: "📝", Submitted: "📬", Processing: "⚙️",
          Shipped: "🚚", Completed: "✅", Cancelled: "❌",
        };
        const lines = orders.map(o => {
          const emoji = STATUS_EMOJI[o.status] ?? "📦";
          const paid = o.paymentStatus === "confirmed" ? "✅ Paid" : "⏳ Unpaid";
          const gb = o.gbName ? ` · ${o.gbName}` : o.groupBuyId ? ` · GB` : "";
          const cur = o.gbCurrency ?? "GBP";
          return `${emoji} <b>${o.code}</b>${gb} — ${cur} ${Number(o.grandTotal).toFixed(2)} · ${paid}`;
        });

        const keyboard: { text: string; url?: string; callback_data?: string }[][] = orders.map(o => {
          const emoji = STATUS_EMOJI[o.status] ?? "📦";
          const paid = o.paymentStatus === "confirmed" ? "✅ Paid" : "⏳ Unpaid";
          const gb = o.gbName ? ` · ${o.gbName}` : o.groupBuyId ? ` · GB` : "";
          const cur = o.gbCurrency ?? "GBP";
          const btnText = `${emoji} ${o.code} · ${cur} ${Number(o.grandTotal).toFixed(2)}${gb} — · ${paid}`;
          return [{ text: btnText, callback_data: `mn:order:${o.code}` }];
        });
        keyboard.push([{ text: "⬅️ Back to Menu", callback_data: "mn:menu" }]);

        const { template: ordersHeaderTpl } = await getTemplate("bot_orders_header");
        await sendTelegramMessageFull(
          cbChatId,
          renderTemplate(ordersHeaderTpl, { lines: lines.join("\n"), app_url: appUrl }),
          "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
        );
        res.json({ ok: true }); return;
      }

      // ── 📋 Order Detail ──────────────────────────────────────────────────────
      if (action.startsWith("order:")) {
        const orderCode = action.slice(6);
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        const normalizedUsername = linked.telegramUsername.replace(/^@/, "").toLowerCase();

        const [order] = await db
          .select({
            id: ordersTable.id,
            code: ordersTable.code,
            status: ordersTable.status,
            grandTotal: ordersTable.grandTotal,
            productSubtotal: ordersTable.productSubtotal,
            deliveryPrice: ordersTable.deliveryPrice,
            tip: ordersTable.tip,
            paymentStatus: ordersTable.paymentStatus,
            trackingNumber: ordersTable.trackingNumber,
            groupBuyId: ordersTable.groupBuyId,
            gbName: groupBuysTable.name,
            gbCurrency: groupBuysTable.currency,
            adminMessage: ordersTable.adminMessage,
            createdAt: ordersTable.createdAt,
            shippingName: ordersTable.shippingName,
          })
          .from(ordersTable)
          .leftJoin(groupBuysTable, eq(groupBuysTable.id, ordersTable.groupBuyId))
          .where(
            and(
              eq(ordersTable.code, orderCode),
              sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${normalizedUsername}`,
              isNull(ordersTable.deletedAt),
            )
          )
          .limit(1);

        if (!order) {
          await sendTelegramMessage(cbChatId, "Order not found.", "HTML");
          res.json({ ok: true }); return;
        }

        const lineItems = await db
          .select({ productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity, lineTotal: orderLineItemsTable.lineTotal })
          .from(orderLineItemsTable)
          .where(eq(orderLineItemsTable.orderId, order.id));

        const STATUS_EMOJI: Record<string, string> = {
          Draft: "📝", Submitted: "📬", Processing: "⚙️",
          Shipped: "🚚", Completed: "✅", Cancelled: "❌",
        };
        const PAY_EMOJI: Record<string, string> = {
          confirmed: "✅", test_confirmed: "✅", unpaid: "⏳",
          pending_confirmation: "🔄", rejected: "❌", failed: "❌",
        };
        const statusEmoji = STATUS_EMOJI[order.status] ?? "📦";
        const payEmoji = PAY_EMOJI[order.paymentStatus ?? "unpaid"] ?? "⏳";
        const payLabel = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed"
          ? "Paid" : order.paymentStatus === "pending_confirmation" ? "Pending Review"
          : order.paymentStatus === "rejected" ? "Rejected" : "Unpaid";
        const gbLine = (order.gbName ?? order.groupBuyId) ? `\n🛒 <b>Group Buy:</b> ${order.gbName ?? order.groupBuyId}` : "";
        const trackingLine = order.trackingNumber ? `\n📮 <b>Tracking:</b> <code>${order.trackingNumber}</code>` : "";
        const messageLine = order.adminMessage ? `\n\n💬 <i>${order.adminMessage}</i>` : "";

        const itemLines = lineItems.map(li => {
          const qty = parseFloat(String(li.quantity));
          const qtyStr = Number.isInteger(qty) ? String(qty) : qty.toFixed(1).replace(/\.0$/, "");
          return `  • ${li.productName} ×${qtyStr}`;
        }).join("\n");

        const msg =
          `${statusEmoji} <b>Order #${order.code}</b>\n` +
          `${gbLine}\n` +
          `\n📋 <b>Items</b>\n${itemLines || "  —"}\n` +
          `\n💰 <b>Total:</b> ${order.gbCurrency ?? "GBP"} ${Number(order.grandTotal).toFixed(2)}\n` +
          `${payEmoji} <b>Payment:</b> ${payLabel}` +
          `${trackingLine}` +
          `${messageLine}`;

        await sendTelegramMessageFull(cbChatId, msg, "HTML", undefined, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "⬅️ Back to Orders", callback_data: "mn:orders" }],
              [{ text: "🌐 Manage Order", url: `${appUrl}/account/orders/${order.id}` }],
            ],
          },
        });
        res.json({ ok: true }); return;
      }

      // ── 🚚 Tracking ─────────────────────────────────────────────────────────
      if (action === "tracking") {
        // Must be a linked account — unlinked users cannot access tracking
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        const trackingUsername = linked.telegramUsername.replace(/^@/, "").toLowerCase();

        // Find all GBs this user has orders in
        const memberOrders = await db
          .select({ groupBuyId: ordersTable.groupBuyId })
          .from(ordersTable)
          .where(and(
            sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${trackingUsername}`,
            isNull(ordersTable.deletedAt),
            sql`${ordersTable.groupBuyId} is not null`,
          ));

        const gbIds = [...new Set(memberOrders.map(o => o.groupBuyId).filter(Boolean) as string[])];

        if (gbIds.length === 0) {
          const { template: trackingEmptyTpl } = await getTemplate("bot_tracking_empty");
          await sendTelegramMessage(cbChatId, trackingEmptyTpl, "HTML");
          res.json({ ok: true }); return;
        }

        const GB_STATUS_EMOJI: Record<string, string> = {
          open: "🟢", closed: "🔴", dispatching: "🚀", completed: "✅", cancelled: "❌",
        };
        const gbs = await db
          .select({ id: groupBuysTable.id, name: groupBuysTable.name, status: groupBuysTable.status })
          .from(groupBuysTable)
          .where(inArray(groupBuysTable.id, gbIds));

        const keyboard: { text: string; callback_data: string }[][] = gbs.map(gb => ([{
          text: `${GB_STATUS_EMOJI[gb.status ?? ""] ?? "📦"} ${gb.name}`,
          callback_data: `mn:track_gb:${gb.id}`,
        }]));
        keyboard.push([{ text: "⬅️ Back to Menu", callback_data: "mn:menu" }]);

        await sendTelegramMessageFull(
          cbChatId,
          "🚚 <b>Tracking</b>\n\nSelect a group buy to view your packages:",
          "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
        );
        res.json({ ok: true }); return;
      }

      // ── 📦 Track a specific Group Buy ────────────────────────────────────────
      if (action.startsWith("track_gb:")) {
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        const gbId = action.slice("track_gb:".length);
        const trackingUsername = linked.telegramUsername.replace(/^@/, "").toLowerCase();

        // Find all orders for this user in this specific GB
        const memberOrders = await db
          .select({ id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, reshipperUsername: ordersTable.reshipperUsername, countryLegId: ordersTable.countryLegId, routingType: ordersTable.routingType })
          .from(ordersTable)
          .where(and(
            sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${trackingUsername}`,
            eq(ordersTable.groupBuyId, gbId),
            isNull(ordersTable.deletedAt),
          ));

        if (memberOrders.length === 0) {
          const { template: trackingEmptyTpl } = await getTemplate("bot_tracking_empty");
          await sendTelegramMessage(cbChatId, trackingEmptyTpl, "HTML");
          res.json({ ok: true }); return;
        }

        const parcels = await db
          .select({
            id: gbParcelsTable.id,
            label: gbParcelsTable.label,
            status: gbParcelsTable.status,
            groupBuyId: gbParcelsTable.groupBuyId,
            items: gbParcelsTable.items,
            reshipperUsername: gbParcelsTable.reshipperUsername,
          })
          .from(gbParcelsTable)
          .where(eq(gbParcelsTable.groupBuyId, gbId));

        // Build item name sets from the user's line items
        const memberOrderIds = memberOrders.map(o => o.id);
        const memberLineItems = memberOrderIds.length > 0
          ? await db
              .select({ productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity, orderId: orderLineItemsTable.orderId })
              .from(orderLineItemsTable)
              .where(inArray(orderLineItemsTable.orderId, memberOrderIds))
          : [];

        const gbItemNames = new Set<string>();
        const gbItemQty = new Map<string, { name: string; qty: number }>();
        for (const li of memberLineItems) {
          const key = li.productName.trim().toLowerCase();
          gbItemNames.add(key);
          const existing = gbItemQty.get(key);
          const qty = parseFloat(li.quantity as unknown as string) || 0;
          if (existing) { existing.qty += qty; } else { gbItemQty.set(key, { name: li.productName.trim(), qty }); }
        }

        // Build set of reshippers this member is assigned to for this GB
        const assignedReshippers = new Set<string>();
        for (const order of memberOrders) {
          if (order.reshipperUsername) assignedReshippers.add(order.reshipperUsername.replace(/^@/, "").toLowerCase());
        }
        const nonDirectLegOrders = memberOrders.filter(o => o.countryLegId && o.routingType !== "direct");
        if (nonDirectLegOrders.length > 0) {
          const legIds = [...new Set(nonDirectLegOrders.map(o => o.countryLegId!))];
          const legRows = await db
            .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, gbId: gbCountryLegsTable.gbId })
            .from(gbCountryLegsTable)
            .where(inArray(gbCountryLegsTable.id, legIds));
          for (const leg of legRows) {
            const reshippers = await db
              .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
              .from(gbReshippersTable)
              .where(and(
                eq(gbReshippersTable.gbId, leg.gbId),
                eq(gbReshippersTable.country, leg.countryCode),
                eq(gbReshippersTable.enabled, true),
              ));
            reshippers.forEach(r => {
              if (r.reshipperUsername) assignedReshippers.add(r.reshipperUsername.replace(/^@/, "").toLowerCase());
            });
          }
        }

        // Filter parcels to only ones this member should see
        const memberParcels = parcels.filter(p => {
          const parcelItemList = ((p.items ?? []) as { name: string }[]);
          if (p.reshipperUsername) {
            if (!assignedReshippers.has(p.reshipperUsername.replace(/^@/, "").toLowerCase())) return false;
            if (parcelItemList.length === 0) return true;
            if (gbItemNames.size === 0) return false;
            return parcelItemList.some(i => gbItemNames.has(i.name.trim().toLowerCase()));
          }
          if (parcelItemList.length === 0) return false;
          if (gbItemNames.size === 0) return false;
          return parcelItemList.some(i => gbItemNames.has(i.name.trim().toLowerCase()));
        });

        const [gbRow] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
        const gbName = gbRow?.name ?? gbId;

        const PARCEL_STATUS_EMOJI: Record<string, string> = {
          pending: "⏳", in_transit: "🚀", out_for_delivery: "🚚",
          attempted: "⚠️", delivered: "✅", exception: "🚨", expired: "💨",
        };
        const PARCEL_STATUS_LABEL: Record<string, string> = {
          pending: "Pending", in_transit: "In Transit", out_for_delivery: "Out for Delivery",
          attempted: "Delivery Attempted", delivered: "Delivered", exception: "Exception", expired: "Expired",
        };

        const keyboard: { text: string; url?: string; callback_data?: string }[][] = [];

        if (memberParcels.length === 0) {
          await sendTelegramMessageFull(
            cbChatId,
            `📦 <b>${gbName}</b>\n\nNo packages have been dispatched for you yet.`,
            "HTML", undefined, { reply_markup: { inline_keyboard: [
              [{ text: "📋 Not Yet Dispatched", callback_data: `ps_pending:${gbId}` }],
              [{ text: "⬅️ Back to Tracking", callback_data: "mn:tracking" }],
            ] } },
          );
          res.json({ ok: true }); return;
        }

        const lines = memberParcels.map(p => {
          const emoji = PARCEL_STATUS_EMOJI[p.status] ?? "📦";
          const label = PARCEL_STATUS_LABEL[p.status] ?? p.status;
          const parcelItemList = ((p.items ?? []) as { name: string }[]);
          const matchKeys = parcelItemList.length > 0
            ? parcelItemList.map(i => i.name.trim().toLowerCase()).filter(k => gbItemQty.has(k))
            : [...gbItemQty.keys()];
          const itemLines = matchKeys.length > 0
            ? "\n" + matchKeys.map(k => `  • ${gbItemQty.get(k)!.name}`).join("\n")
            : "";
          keyboard.push([{ text: `📦 ${p.label}`, callback_data: `ps_menu:${p.id}` }]);
          return `${emoji} <b>${p.label}</b> · ${label}${itemLines}`;
        });

        keyboard.push([{ text: "📋 Not Yet Dispatched", callback_data: `ps_pending:${gbId}` }]);
        keyboard.push([{ text: "🌐 Track", url: `${appUrl}/track/gb/${gbId}/member/${encodeURIComponent(trackingUsername)}` }]);
        keyboard.push([{ text: "⬅️ Back to Tracking", callback_data: "mn:tracking" }]);

        const { template: trackingHeaderTpl } = await getTemplate("bot_tracking_header");
        await sendTelegramMessageFull(
          cbChatId,
          renderTemplate(trackingHeaderTpl, { lines: `<b>${gbName}</b>\n\n` + lines.join("\n\n") }),
          "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
        );
        res.json({ ok: true }); return;
      }

      // ── 🌍 My Group Buys ────────────────────────────────────────────────────
      if (action === "gbs") {
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        const memberships = await db
          .select({ groupBuyId: accountGroupBuysTable.groupBuyId, joinedAt: accountGroupBuysTable.joinedAt })
          .from(accountGroupBuysTable)
          .where(eq(accountGroupBuysTable.accountId, linked.telegramUsername))
          .orderBy(desc(accountGroupBuysTable.joinedAt))
          .limit(10);

        if (memberships.length === 0) {
          const { template: gbsEmptyTpl } = await getTemplate("bot_gbs_empty");
          await sendTelegramMessage(cbChatId, renderTemplate(gbsEmptyTpl, { app_url: appUrl }), "HTML");
          res.json({ ok: true }); return;
        }

        const gbIds = memberships.map(m => m.groupBuyId);
        const gbs = await db
          .select({ id: groupBuysTable.id, name: groupBuysTable.name, status: groupBuysTable.status })
          .from(groupBuysTable)
          .where(inArray(groupBuysTable.id, gbIds));

        const gbMap = new Map(gbs.map(g => [g.id, g]));
        const STATUS_EMOJI: Record<string, string> = {
          open: "🟢", closed: "🔴", dispatching: "🚀", completed: "✅", cancelled: "❌",
        };

        const lines = memberships.map(m => {
          const gb = gbMap.get(m.groupBuyId);
          if (!gb) return null;
          const emoji = STATUS_EMOJI[gb.status ?? ""] ?? "🌍";
          return `${emoji} <b>${gb.name}</b>`;
        }).filter(Boolean);

        const keyboard: { text: string; url?: string; callback_data?: string }[][] = (memberships.map(m => {
          const gb = gbMap.get(m.groupBuyId);
          if (!gb) return null;
          const canOrder = gb.status === "open";
          const url = canOrder
            ? `${appUrl}/order?gbId=${encodeURIComponent(gb.id)}`
            : `${appUrl}/account`;
          const label = canOrder ? `🛒 Order — ${gb.name}` : gb.name;
          return [{ text: label, url }];
        }).filter(Boolean) as { text: string; url: string }[][]);
        keyboard.push([{ text: "⬅️ Back to Menu", callback_data: "mn:menu" }]);

        const { template: gbsHeaderTpl } = await getTemplate("bot_gbs_header");
        await sendTelegramMessageFull(
          cbChatId,
          renderTemplate(gbsHeaderTpl, { lines: lines.join("\n") }),
          "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
        );
        res.json({ ok: true }); return;
      }

      // ── 🧪 Lab Reports ──────────────────────────────────────────────────────
      if (action === "labs" || action === "labs_search") {
        if (action === "labs_search") {
          const { template } = await getTemplate("bot_labs_search_prompt");
          setConv(cbChatId, { step: "labs_search" });
          await sendTelegramMessage(cbChatId, template, "HTML");
          res.json({ ok: true }); return;
        }

        const labs = await db
          .select({
            id: labTestsTable.id,
            peptideName: labTestsTable.peptideName,
            purityPct: labTestsTable.purityPct,
            batchCode: labTestsTable.batchCode,
            testDate: labTestsTable.testDate,
            supplier: labTestsTable.supplier,
            url: labTestsTable.url,
            endotoxinEuMg: labTestsTable.endotoxinEuMg,
            mgAmount: labTestsTable.mgAmount,
            blendComponents: labTestsTable.blendComponents,
          })
          .from(labTestsTable)
          .where(eq(labTestsTable.pending, false))
          .orderBy(desc(labTestsTable.createdAt))
          .limit(8);

        if (labs.length === 0) {
          const { template: labsEmptyTpl } = await getTemplate("bot_labs_empty");
          await sendTelegramMessage(cbChatId, labsEmptyTpl, "HTML");
          res.json({ ok: true }); return;
        }

        const lines = labs.map(l => {
          const purity = l.purityPct != null ? ` · <b>${l.purityPct.toFixed(1)}%</b> purity` : "";
          const batch = l.batchCode ? ` <code>${l.batchCode}</code>` : "";
          const date = l.testDate ? ` · ${l.testDate}` : "";
          return `🧪 ${l.peptideName}${batch}${purity}${date}`;
        });

        const keyboard: ({ text: string; url: string } | { text: string; callback_data: string })[][] = [];
        for (const l of labs) {
          if (!l.url) continue;
          const isBlend = !!l.blendComponents;
          const parts: string[] = [l.peptideName];
          if (l.batchCode) parts.push(l.batchCode);
          if (l.purityPct != null) parts.push(`${l.purityPct.toFixed(1)}%`);
          if (isBlend && l.mgAmount != null) {
            parts.push(`${l.mgAmount}mg`);
          } else if (l.endotoxinEuMg != null) {
            parts.push(`${l.endotoxinEuMg} EU/mg`);
          }
          keyboard.push([{ text: `📄 ${parts.join(" · ")}`, url: l.url }]);
        }
        keyboard.push([{ text: "🔍 Search by compound / batch", callback_data: "mn:labs_search" }]);
        keyboard.push([{ text: "🔬 All lab reports", url: `${appUrl}/lab-tests` }]);
        keyboard.push([{ text: "⬅️ Back to Menu", callback_data: "mn:menu" }]);

        const { template: labsHeaderTpl } = await getTemplate("bot_labs_header");
        await sendTelegramMessageFull(
          cbChatId,
          renderTemplate(labsHeaderTpl, { lines: lines.join("\n") }),
          "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
        );
        res.json({ ok: true }); return;
      }

      // ── 🎫 Open a Ticket ────────────────────────────────────────────────────
      if (action === "ticket") {
        if (!linked) {
          const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
          await sendTelegramMessage(cbChatId, notLinkedTpl, "HTML");
          res.json({ ok: true }); return;
        }
        clearConv(cbChatId);
        await startTicketFlow(cbChatId);
        res.json({ ok: true }); return;
      }

      // ── ❓ Help ──────────────────────────────────────────────────────────────
      if (action === "help") {
        const { template: helpTpl } = await getTemplate("bot_help");
        await sendTelegramMessage(cbChatId, helpTpl, "HTML");
        res.json({ ok: true }); return;
      }

      // ── Back to menu ─────────────────────────────────────────────────────────
      if (action === "menu") {
        if (linked) {
          await sendMainMenu(cbChatId, linked.telegramUsername);
        } else {
          await sendMainMenu(cbChatId);
        }
        res.json({ ok: true }); return;
      }

      // ── 📬 Feedback shortcut ────────────────────────────────────────────────
      if (action === "feedback") {
        clearFbConv(cbChatId);
        await startFeedbackFlow(cbChatId);
        res.json({ ok: true }); return;
      }

      res.json({ ok: true });
      return;
    }

    res.json({ ok: true });
    return;
  }

  // ── Text messages ─────────────────────────────────────────────────────────
  const message = req.body?.message;
  if (!message?.text || !message?.chat?.id) {
    res.json({ ok: true });
    return;
  }

  const chatId = String(message.chat.id);
  const text   = String(message.text).trim();
  console.log(`[telegram:webhook] message from chatId=${chatId} username=@${message.chat.username ?? "?"} text="${text.slice(0, 40)}"`);

  // ── /link command ─────────────────────────────────────────────────────────
  const linkMatch = text.match(/^\/link(?:@\S+)?(\s+(.+))?$/i);
  if (linkMatch !== null || text.toLowerCase() === "/link") {
    const code = (linkMatch?.[2] ?? "").trim().toUpperCase();
    if (!code) {
      const { template: noCodeTpl } = await getTemplate("bot_link_no_code");
      await sendTelegramMessage(chatId, noCodeTpl, "HTML");
      res.json({ ok: true }); return;
    }
    if (!/^[A-F0-9]{8}$/.test(code)) {
      const { template: invalidTpl } = await getTemplate("bot_link_invalid_code");
      await sendTelegramMessage(chatId, invalidTpl, "HTML");
      res.json({ ok: true }); return;
    }
    console.log(`[telegram:webhook] /link code="${code}" from chatId=${chatId}`);
    const [account] = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.telegramLinkToken, code));

    if (!account) {
      if (wasTokenConsumed(code)) {
        const { template: alreadyUsedTpl } = await getTemplate("bot_link_already_used");
        await sendTelegramMessage(chatId, alreadyUsedTpl, "HTML");
      } else {
        const { template: notFoundTpl } = await getTemplate("bot_link_not_found");
        await sendTelegramMessage(chatId, notFoundTpl, "HTML");
      }
      res.json({ ok: true }); return;
    }

    const now = new Date();
    if (account.telegramLinkExpiresAt && account.telegramLinkExpiresAt < now) {
      const { template: expiredTpl } = await getTemplate("bot_link_expired");
      await sendTelegramMessage(chatId, expiredTpl, "HTML");
      res.json({ ok: true }); return;
    }

    await db.update(accountsTable)
      .set({ telegramChatId: chatId, telegramLinkToken: null, telegramLinkExpiresAt: null })
      .where(eq(accountsTable.telegramUsername, account.telegramUsername));
    markTokenConsumed(code);

    await sendMainMenu(chatId, account.telegramUsername);
    const { template: linkSuccessTpl } = await getTemplate("bot_link_success");
    await sendTelegramMessage(
      chatId,
      renderTemplate(linkSuccessTpl, { username: account.telegramUsername }),
      "HTML",
    );
    writeLog("login", "info", "telegram_linked", `Telegram linked: ${account.telegramUsername}`, { telegramUsername: account.telegramUsername, chatId }).catch(() => {});
    res.json({ ok: true }); return;
  }

  // ── /stop / /unlink ───────────────────────────────────────────────────────
  if (text === "/stop" || text === "/unlink") {
    const rows = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(eq(accountsTable.telegramChatId, chatId));

    if (rows.length === 0) {
      const { template: noAccountTpl } = await getTemplate("bot_no_account_linked");
      await sendTelegramMessage(chatId, noAccountTpl, "HTML");
      res.json({ ok: true }); return;
    }

    await db.update(accountsTable)
      .set({ telegramChatId: null, telegramLinkToken: null, telegramLinkExpiresAt: null })
      .where(eq(accountsTable.telegramChatId, chatId));

    clearConv(chatId);
    const { template: unlinkedTpl } = await getTemplate("bot_unlinked");
    await sendTelegramMessage(chatId, unlinkedTpl, "HTML");
    writeLog("login", "info", "telegram_unlinked", `Telegram unlinked: ${rows[0].telegramUsername}`, { telegramUsername: rows[0].telegramUsername, chatId }).catch(() => {});
    res.json({ ok: true }); return;
  }

  // ── /start ────────────────────────────────────────────────────────────────
  if (text === "/start" || text.startsWith("/start ")) {
    const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

    // Admin /start — show the admin control panel menu
    const startAdminChatId = await getAdminChatId();
    if (startAdminChatId && chatId === startAdminChatId) {
      await sendTelegramMessageFull(
        chatId,
        `🛠 <b>Salt &amp; Peps Admin</b>\n\nWelcome back. Choose an area to manage:`,
        "HTML",
        undefined,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📊 Dashboard", callback_data: "adm:dashboard" },
                { text: "📦 Orders", callback_data: "adm:orders" },
              ],
              [
                { text: "💳 Payments", url: `${appUrl}/admin#payments` },
                { text: "🎫 Tickets", callback_data: "adm:tickets" },
              ],
              [
                { text: "🛒 Group Buys", url: `${appUrl}/admin#groupbuy` },
                { text: "🧪 Lab Tests", url: `${appUrl}/admin#labtests` },
              ],
              [
                { text: "👥 Members", url: `${appUrl}/admin#members` },
                { text: "⚙️ Settings", url: `${appUrl}/admin#config` },
              ],
            ],
          },
        },
      );
      res.json({ ok: true }); return;
    }

    // If already linked, show the main menu directly
    const [alreadyLinked] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(eq(accountsTable.telegramChatId, chatId));
    if (alreadyLinked) {
      await sendMainMenu(chatId, alreadyLinked.telegramUsername);
      res.json({ ok: true }); return;
    }
    const { template: startTpl } = await getTemplate("bot_start_unlinked");
    const startText = renderTemplate(startTpl, {
      app_url: appUrl,
    });
    await sendTelegramMessageFull(
      chatId,
      startText,
      "HTML",
      undefined,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "🌐 Open Salt & Peps", url: appUrl },
          ]],
        },
      },
    );
    res.json({ ok: true }); return;
  }

  // ── /cancel ───────────────────────────────────────────────────────────────
  if (text === "/cancel") {
    clearConv(chatId);
    clearFbConv(chatId);
    const { template: cancelTpl } = await getTemplate("bot_cancel");
    await sendTelegramMessage(chatId, cancelTpl, "HTML");
    res.json({ ok: true }); return;
  }

  // ── /menu ─────────────────────────────────────────────────────────────────
  if (text === "/menu") {
    clearConv(chatId);
    clearFbConv(chatId);
    const [menuLinked] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(eq(accountsTable.telegramChatId, chatId));
    if (menuLinked) {
      await sendMainMenu(chatId, menuLinked.telegramUsername);
    } else {
      const { template: notLinkedTpl } = await getTemplate("bot_not_linked");
      await sendTelegramMessage(chatId, notLinkedTpl, "HTML");
    }
    res.json({ ok: true }); return;
  }

  // ── /feedback — open to all users (linked or not) ─────────────────────────
  if (text === "/feedback" || text.toLowerCase() === "/feedback") {
    clearConv(chatId);
    clearFbConv(chatId);
    await startFeedbackFlow(chatId);
    res.json({ ok: true }); return;
  }

  // ── Active feedback conversation ──────────────────────────────────────────
  {
    const fbConv = getFbConv(chatId);
    if (fbConv && fbConv.step === "awaiting_message") {
      clearFbConv(chatId);
      const trimmed = text.trim().slice(0, 2000);
      if (trimmed.length < 3) {
        await sendTelegramMessage(chatId, "⚠️ Message too short. Please send at least a few words.", "HTML");
        res.json({ ok: true }); return;
      }
      const category = fbConv.category ?? "feedback";
      const tgUsername = (message.from as { username?: string } | undefined)?.username ?? null;

      await db.insert(feedbackTable).values({
        type: category,
        message: trimmed,
        telegramUsername: tgUsername,
      });

      // Notify admin
      const adminChatIdFb = await getAdminChatId();
      if (adminChatIdFb) {
        const catLabel = FEEDBACK_CATEGORY_LABELS[category] ?? category;
        const tgLine = tgUsername ? `\n👤 @${tgUsername}` : "";
        const preview = trimmed.length > 300 ? trimmed.slice(0, 300) + "…" : trimmed;
        sendTelegramMessage(
          adminChatIdFb,
          `📬 <b>New ${catLabel}</b> (via bot)${tgLine}\n\n${preview}`,
          "HTML",
          { recipientType: "admin" },
        ).catch(() => {});
      }

      const catLabel = FEEDBACK_CATEGORY_LABELS[category] ?? category;
      await sendTelegramMessageFull(
        chatId,
        `✅ <b>Received!</b> Your ${catLabel} has been submitted.\n\nSend /feedback any time to share more.`,
        "HTML",
        undefined,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "📬 Send more feedback", callback_data: "mn:feedback" }]],
          },
        },
      );
      res.json({ ok: true }); return;
    }
  }

  // ── Admin chat reply routing ──────────────────────────────────────────────
  const adminChatId = await getAdminChatId();
  console.log(`[telegram:webhook] adminChatId="${adminChatId}" chatId="${chatId}" isAdmin=${adminChatId === chatId}`);

  if (adminChatId && chatId === adminChatId) {
    const replyToId = (message.reply_to_message as { message_id?: number } | undefined)?.message_id;
    console.log(`[telegram:webhook] admin message — replyToId=${replyToId ?? "none"}`);
    if (replyToId) {
      const [mapping] = await db
        .select({ ticketId: ticketTelegramMessagesTable.ticketId })
        .from(ticketTelegramMessagesTable)
        .where(and(
          eq(ticketTelegramMessagesTable.telegramMessageId, replyToId),
          eq(ticketTelegramMessagesTable.chatId, chatId),
        ));

      console.log(`[telegram:webhook] mapping replyToId=${replyToId} → ${mapping ? `ticketId=${mapping.ticketId}` : "NOT FOUND"}`);

      if (mapping) {
        const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, mapping.ticketId));
        if (ticket && ticket.status !== "closed") {
          const adminUsername = (message.from as { username?: string } | undefined)?.username ?? "admin";
          const now = new Date();

          await db.insert(ticketMessagesTable).values({
            ticketId: mapping.ticketId,
            authorRole: "admin",
            authorUsername: adminUsername,
            body: text,
            createdAt: now,
          });

          await db.update(ticketsTable)
            .set({ updatedAt: now, status: ticket.status === "open" ? "in_progress" : ticket.status, customerUnread: true })
            .where(eq(ticketsTable.id, mapping.ticketId));

          console.log(`[telegram:webhook] ✅ admin reply posted to ticket=${mapping.ticketId} by @${adminUsername}`);

          await sendTelegramMessage(chatId, `✅ <b>Reply posted</b> — <i>${ticket.subject}</i>`, "HTML");

          const _appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
          notifyUserTicket(
            ticket.accountUsername,
            mapping.ticketId,
            `💬 <b>Support reply</b>\n` +
            `Subject: <b>${ticket.subject}</b>\n\n` +
            `${text.slice(0, 300)}${text.length > 300 ? "…" : ""}\n\n` +
            `<a href="${_appUrl}/account?s=support&ticket=${mapping.ticketId}">View in app →</a>\n` +
            `<i>Or reply directly here in Telegram.</i>`,
          ).catch(() => {});
        }
      }
    }
    res.json({ ok: true });
    return;
  }

  // ── Linked customer message handling ─────────────────────────────────────
  const [linkedAccount] = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.telegramChatId, chatId));

  if (!linkedAccount) {
    await sendTelegramMessage(
      chatId,
      `👋 To get support, first link your account:\n\nSend <code>/link YOUR_CODE</code>\n\nGet the code from <b>Telegram Notifications</b> in your Profile Hub, or send /start for instructions.`,
      "HTML",
    );
    res.json({ ok: true }); return;
  }

  const username = linkedAccount.telegramUsername;

  // ── /support and /new — explicitly start guided flow ─────────────────────
  if (text === "/support" || text === "/new" || text.toLowerCase() === "/support") {
    clearConv(chatId);
    await startTicketFlow(chatId);
    res.json({ ok: true }); return;
  }

  // ── Route reply to tracked ticket message ─────────────────────────────────
  const replyToMessageId = (message.reply_to_message as { message_id?: number } | undefined)?.message_id;
  if (replyToMessageId) {
    const [mapping] = await db
      .select({ ticketId: ticketTelegramMessagesTable.ticketId })
      .from(ticketTelegramMessagesTable)
      .where(and(
        eq(ticketTelegramMessagesTable.telegramMessageId, replyToMessageId),
        eq(ticketTelegramMessagesTable.chatId, chatId),
      ));

    if (mapping) {
      // Check if this user is an organiser for the ticket's GB
      const [ticketRow] = await db
        .select({ groupBuyId: ticketsTable.groupBuyId, subject: ticketsTable.subject, status: ticketsTable.status, accountUsername: ticketsTable.accountUsername })
        .from(ticketsTable)
        .where(eq(ticketsTable.id, mapping.ticketId));

      let handledAsOrganiser = false;
      if (ticketRow?.groupBuyId) {
        const [gb] = await db
          .select({ organiserId: groupBuysTable.organiserId })
          .from(groupBuysTable)
          .where(eq(groupBuysTable.id, ticketRow.groupBuyId));

        if (gb?.organiserId && gb.organiserId === username) {
          // Organiser reply
          if (ticketRow.status === "closed") {
            await sendTelegramMessage(chatId, `❌ That ticket is closed.`, "HTML");
          } else {
            const now = new Date();
            await db.insert(ticketMessagesTable).values({
              ticketId: mapping.ticketId,
              authorRole: "admin",
              authorUsername: username,
              body: text,
              createdAt: now,
            });
            await db.update(ticketsTable)
              .set({ updatedAt: now, status: ticketRow.status === "open" ? "in_progress" : ticketRow.status, customerUnread: true })
              .where(eq(ticketsTable.id, mapping.ticketId));

            await sendTelegramMessage(chatId, `✅ <b>Reply sent</b> — <i>${ticketRow.subject}</i>`, "HTML");

            const _orgAppUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
            notifyUserTicket(
              ticketRow.accountUsername,
              mapping.ticketId,
              `💬 <b>Reply from your Group Buy organiser</b>\n` +
              `Subject: <b>${ticketRow.subject}</b>\n\n` +
              `${text.slice(0, 300)}${text.length > 300 ? "…" : ""}\n\n` +
              `<a href="${_orgAppUrl}/account?s=support&ticket=${mapping.ticketId}">View in app →</a>\n` +
              `<i>Or reply directly here in Telegram.</i>`,
            ).catch(() => {});
          }
          handledAsOrganiser = true;
        }
      }

      if (!handledAsOrganiser) {
        await appendToTicket(mapping.ticketId, username, chatId, text);
      }
      res.json({ ok: true }); return;
    }
  }

  // ── Active conversation state ─────────────────────────────────────────────
  const conv = getConv(chatId);

  if (conv) {
    // ── Labs search ───────────────────────────────────────────────────────────
    if (conv.step === "labs_search") {
      clearConv(chatId);
      const query = text.trim();
      const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
      const results = await db
        .select({
          id: labTestsTable.id,
          peptideName: labTestsTable.peptideName,
          purityPct: labTestsTable.purityPct,
          batchCode: labTestsTable.batchCode,
          testDate: labTestsTable.testDate,
          url: labTestsTable.url,
          endotoxinEuMg: labTestsTable.endotoxinEuMg,
          mgAmount: labTestsTable.mgAmount,
          blendComponents: labTestsTable.blendComponents,
        })
        .from(labTestsTable)
        .where(and(
          eq(labTestsTable.pending, false),
          or(
            ilike(labTestsTable.peptideName, `%${query}%`),
            ilike(labTestsTable.batchCode, `%${query}%`),
          ),
        ))
        .orderBy(desc(labTestsTable.createdAt))
        .limit(8);

      if (results.length === 0) {
        const { template: noResultsTpl } = await getTemplate("bot_labs_no_results");
        const noResultsText = renderTemplate(noResultsTpl, { query });
        await sendTelegramMessageFull(
          chatId,
          noResultsText,
          "HTML",
          undefined,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔍 Search again", callback_data: "mn:labs_search" }],
                [{ text: "⬅️ All recent reports", callback_data: "mn:labs" }],
              ],
            },
          },
        );
        res.json({ ok: true }); return;
      }

      const keyboard: ({ text: string; url: string } | { text: string; callback_data: string })[][] = [];
      for (const l of results) {
        if (!l.url) continue;
        const isBlend = !!l.blendComponents;
        const parts: string[] = [l.peptideName];
        if (l.batchCode) parts.push(l.batchCode);
        if (l.purityPct != null) parts.push(`${l.purityPct.toFixed(1)}%`);
        if (isBlend && l.mgAmount != null) {
          parts.push(`${l.mgAmount}mg`);
        } else if (l.endotoxinEuMg != null) {
          parts.push(`${l.endotoxinEuMg} EU/mg`);
        }
        keyboard.push([{ text: `📄 ${parts.join(" · ")}`, url: l.url }]);
      }
      keyboard.push([{ text: "🔍 Search again", callback_data: "mn:labs_search" }]);
      keyboard.push([{ text: "🔬 All lab reports", url: `${appUrl}/lab-tests` }]);

      const { template: searchResultsTpl } = await getTemplate("bot_labs_search_results");
      await sendTelegramMessageFull(
        chatId,
        renderTemplate(searchResultsTpl, { query }),
        "HTML", undefined, { reply_markup: { inline_keyboard: keyboard } },
      );
      res.json({ ok: true }); return;
    }

    if (conv.step === "awaiting_subject") {
      const subject = text.slice(0, 100);
      setConv(chatId, { ...conv, step: "awaiting_body", subject });
      await askForBody(chatId, subject);
      res.json({ ok: true }); return;
    }

    if (conv.step === "awaiting_body") {
      if (conv.subject) {
        await finaliseTicket(username, chatId, conv as TicketConv & { subject: string }, text);
        clearConv(chatId);
      } else {
        // Edge case: no subject somehow, restart
        clearConv(chatId);
        await startTicketFlow(chatId);
      }
      res.json({ ok: true }); return;
    }

    // In awaiting_category or awaiting_gb — buttons expected, not text
    // Re-prompt gently
    const { template: awaitingTpl } = await getTemplate("bot_awaiting_buttons");
    await sendTelegramMessage(chatId, awaitingTpl, "HTML");
    res.json({ ok: true }); return;
  }

  // ── No active conversation — try AI first, fall back to guided ticket flow ──
  const aiCfg = await getAiChatConfig();

  if (aiCfg.enabled) {
    const usageCount = getAiUsage(chatId);

    if (usageCount >= aiCfg.messageLimit) {
      await sendTelegramMessage(
        chatId,
        `You've reached the limit for AI-assisted support (${aiCfg.messageLimit} messages per 24 hours).\n\nFor further help please contact ${aiCfg.contactHandle} directly, or send /support to open a support ticket.`,
        "HTML",
      );
      res.json({ ok: true }); return;
    }

    try {
      const aiText = await generateAiResponse(aiCfg.transcript, aiCfg.contactHandle, text);
      const newCount = incrementAiUsage(chatId);
      const remaining = aiCfg.messageLimit - newCount;

      let reply = aiText;
      if (remaining <= 2 && remaining > 0) {
        reply += `\n\n<i>(${remaining} AI message${remaining === 1 ? "" : "s"} remaining today — send /support to open a ticket anytime)</i>`;
      }

      await sendTelegramMessage(chatId, reply, "HTML");
    } catch (err) {
      console.error("[telegram:ai-chat] Gemini error:", err);
      // AI failed — fall back to guided ticket flow
      await startTicketFlow(chatId);
    }
  } else {
    await startTicketFlow(chatId);
  }

  res.json({ ok: true });
});

// ── POST /api/account/telegram/link-init — generate a link token ─────────────
router.post("/account/telegram/link-init", requireAccount, async (req, res): Promise<void> => {
  const rawTg = req.account!.telegramUsername;
  const tg = normalizeTg(rawTg);

  const [account] = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  if (!account) {
    console.warn(`[telegram:link-init] Account not found for username="${tg}"`);
    res.status(404).json({ error: "Account not found — please log out and log in again." });
    return;
  }

  const code = randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db
    .update(accountsTable)
    .set({ telegramLinkToken: code, telegramLinkExpiresAt: expiresAt })
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  console.log(`[telegram:link-init] Code generated for username="${tg}" code=${code}`);
  const botUsername = await getBotUsername();

  res.json({
    code,
    expiresAt: expiresAt.toISOString(),
    botUrl: botUsername ? `https://t.me/${botUsername}` : null,
    instruction: `Send /link ${code} to the bot`,
  });
});

// ── DELETE /api/account/telegram/unlink ──────────────────────────────────────
router.delete("/account/telegram/unlink", requireAccount, async (req, res): Promise<void> => {
  const tg = normalizeTg(req.account!.telegramUsername);

  await db
    .update(accountsTable)
    .set({ telegramChatId: null, telegramLinkToken: null, telegramLinkExpiresAt: null })
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  writeLog("login", "info", "telegram_unlinked", `Telegram unlinked (from profile) for: ${tg}`, { telegramUsername: tg }).catch(() => {});
  res.json({ ok: true });
});

// ── GET /api/account/telegram/status ─────────────────────────────────────────
router.get("/account/telegram/status", requireAccount, async (req, res): Promise<void> => {
  const tg = normalizeTg(req.account!.telegramUsername);

  const [account] = await db
    .select({ telegramChatId: accountsTable.telegramChatId, telegramNotifications: accountsTable.telegramNotifications })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  const defaultPrefs = { status: true, deleted: true, payment: true, profile: true, new_order: true };
  const prefs = (account?.telegramNotifications && typeof account.telegramNotifications === "object")
    ? { ...defaultPrefs, ...(account.telegramNotifications as Record<string, boolean>) }
    : defaultPrefs;

  res.json({ linked: !!account?.telegramChatId, prefs });
});

// ── POST /api/account/telegram/send-test ────────────────────────────────────
router.post("/account/telegram/send-test", requireAccount, async (req, res): Promise<void> => {
  const tg = normalizeTg(req.account!.telegramUsername);

  const [account] = await db
    .select({ telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  if (!account?.telegramChatId) {
    res.status(400).json({ error: "Telegram is not linked to your account." });
    return;
  }

  const ok = await sendTelegramMessage(
    account.telegramChatId,
    "✅ <b>Connection confirmed!</b>\n\nYour Telegram is linked to your Salts & Peps account.\n\nSend <b>/support</b> any time to open a support request.",
    "HTML",
  );

  if (!ok) {
    res.status(502).json({ error: "Could not send the test message. Check that you can receive messages from the bot." });
    return;
  }

  res.json({ ok: true });
});

// ── PATCH /api/account/telegram/prefs ───────────────────────────────────────
router.patch("/account/telegram/prefs", requireAccount, async (req, res): Promise<void> => {
  const tg = normalizeTg(req.account!.telegramUsername);
  const { prefs } = req.body;

  if (!prefs || typeof prefs !== "object") {
    res.status(400).json({ error: "prefs must be an object" });
    return;
  }

  const validKeys = ["status", "deleted", "payment", "profile", "new_order"];
  const sanitized: Record<string, boolean> = {};
  for (const key of validKeys) {
    if (typeof (prefs as Record<string, unknown>)[key] === "boolean") {
      sanitized[key] = (prefs as Record<string, boolean>)[key];
    }
  }

  const [account] = await db
    .select({ telegramNotifications: accountsTable.telegramNotifications })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  const existing = (account?.telegramNotifications && typeof account.telegramNotifications === "object")
    ? account.telegramNotifications as Record<string, boolean>
    : {};

  const merged = { ...existing, ...sanitized };

  await db
    .update(accountsTable)
    .set({ telegramNotifications: merged })
    .where(sql`lower(${accountsTable.telegramUsername}) = ${tg.toLowerCase()}`);

  res.json({ ok: true, prefs: merged });
});

export default router;

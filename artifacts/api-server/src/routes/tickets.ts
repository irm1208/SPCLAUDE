import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db, ticketsTable, ticketMessagesTable, ticketTelegramMessagesTable, groupBuysTable, accountsTable } from "@workspace/db";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { getJwtSecret } from "../middleware/account-auth";
import { requireAccount } from "../middleware/account-auth";
import { requireOrganiser } from "../middleware/require-organiser";
import { sendAdminTicketNotification, sendAdminMessageFull, notifyUser, notifyUserTicket, sendTelegramMessage, sendTelegramMessageFull } from "../lib/telegram";
import { createAlert } from "../lib/create-alert";
import type { TicketCategory, TicketStatus } from "@workspace/db";
import {
  CreateTicketBody as _CreateTicketBody,
  PostTicketMessageBody,
  AdminListTicketsQueryParams,
  AdminUpdateTicketStatusBody,
  AdminPostTicketMessageBody,
} from "@workspace/api-zod";
import { z } from "zod";

const CreateTicketBody = _CreateTicketBody.extend({ groupBuyId: z.string().optional(), issueType: z.string().optional() } as any);

const router: IRouter = Router();

function getAccountFromCookie(req: import("express").Request): string | null {
  const token = req.cookies?.account_session as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { telegramUsername: string };
    return payload.telegramUsername ?? null;
  } catch {
    return null;
  }
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    order_issue: "Order Issue",
    general_support: "General Support",
    group_buy: "Group Buy",
    wholesale: "Wholesale",
    testing_pool: "Testing Pool",
  };
  return labels[cat] ?? cat;
}

const VALID_CATEGORIES = [
  "order_issue",
  "general_support",
  "group_buy",
  "wholesale",
  "testing_pool",
];

// ─────────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ─────────────────────────────────────────────────────────────

// POST /api/account/tickets — create a new ticket
router.post("/account/tickets", async (req, res): Promise<void> => {
  try {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
    return;
  }
  const { category, subject, description, groupBuyId, issueType } = parsed.data;

  const ticketId = randomUUID();
  const now = new Date();

  await db.insert(ticketsTable).values({
    id: ticketId,
    accountUsername: username,
    category: category as TicketCategory,
    subject: subject.trim(),
    status: "open",
    groupBuyId: groupBuyId ?? null,
    issueType: issueType ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(ticketMessagesTable).values({
    ticketId,
    authorRole: "customer",
    authorUsername: username,
    body: description.trim(),
    createdAt: now,
  });

  // ── Notify admin and track the message ID for reply routing ──────────────
  let notifText =
    `🎫 <b>New Support Ticket</b>\n` +
    `From: @${username}\n` +
    `Category: ${categoryLabel(category)}\n`;
  if (issueType) notifText += `Issue type: ${issueType}\n`;
  if (groupBuyId) notifText += `Group Buy: <code>${groupBuyId}</code>\n`;
  notifText +=
    `Subject: <b>${subject.trim()}</b>\n\n` +
    `${description.trim().slice(0, 300)}${description.trim().length > 300 ? "…" : ""}`;

  sendAdminTicketNotification(notifText, ticketId).then(({ ok, messageId, chatId }) => {
    if (ok && messageId && chatId) {
      db.insert(ticketTelegramMessagesTable).values({
        telegramMessageId: messageId,
        chatId,
        ticketId,
      }).catch(() => {});
    }
  }).catch(() => {});

  // ── Notify GB organiser if a group buy is specified ──────────────────────
  if (groupBuyId) {
    try {
      const [gb] = await db
        .select({ organiserId: groupBuysTable.organiserId, name: groupBuysTable.name })
        .from(groupBuysTable)
        .where(eq(groupBuysTable.id, groupBuyId));

      if (gb?.organiserId) {
        const [organiserAccount] = await db
          .select({ telegramChatId: accountsTable.telegramChatId })
          .from(accountsTable)
          .where(eq(accountsTable.telegramUsername, gb.organiserId));

        if (organiserAccount?.telegramChatId) {
          const organiserMsg =
            `🎫 <b>New ticket for your Group Buy</b>\n` +
            `GB: <b>${gb.name}</b>\n` +
            `From: @${username}\n` +
            (issueType ? `Issue type: ${issueType}\n` : "") +
            `Subject: <b>${subject.trim()}</b>\n\n` +
            `${description.trim().slice(0, 300)}${description.trim().length > 300 ? "…" : ""}`;

          sendTelegramMessageFull(
            organiserAccount.telegramChatId,
            organiserMsg,
            "HTML",
            { recipientType: "user", recipientUsername: gb.organiserId },
            { reply_markup: { inline_keyboard: [[{ text: "💬 Reply", callback_data: `org:rt:${ticketId}` }]] } },
          ).then(({ ok, messageId }) => {
            const orgChatId = organiserAccount.telegramChatId;
            if (ok && messageId && orgChatId) {
              db.insert(ticketTelegramMessagesTable).values({
                telegramMessageId: messageId,
                chatId: orgChatId,
                ticketId,
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }

      // Also notify the organiser group chat if configured
      const organiserChatId = process.env["TELEGRAM_ORGANISER_CHAT_ID"] ?? "";
      if (organiserChatId) {
        const chatMsg =
          `🎫 <b>New GB ticket</b>\n` +
          `GB: <b>${groupBuyId}</b>\n` +
          `From: @${username}\n` +
          (issueType ? `Issue: ${issueType}\n` : "") +
          `Subject: <b>${subject.trim()}</b>\n\n` +
          `${description.trim().slice(0, 200)}${description.trim().length > 200 ? "…" : ""}`;
        sendTelegramMessage(organiserChatId, chatMsg, "HTML", { recipientType: "admin" }).catch(() => {});
      }
    } catch {
      // Organiser notification is best-effort — never block ticket creation
    }
  }

  createAlert(
    "customer",
    "high",
    `New ticket: ${subject.trim()}`,
    `@${username} opened a ${categoryLabel(category)} ticket.`,
    { relatedEntityId: ticketId },
  ).catch(() => {});

  res.status(201).json({
    id: ticketId,
    accountUsername: username,
    category,
    subject: subject.trim(),
    status: "open",
    groupBuyId: groupBuyId ?? null,
    issueType: issueType ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  } catch (err) {
    console.error("[tickets:POST /account/tickets] Error:", err);
    res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) });
  }
});

// GET /api/account/tickets — list own tickets
router.get("/account/tickets", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const tickets = await db.select()
    .from(ticketsTable)
    .where(eq(ticketsTable.accountUsername, username))
    .orderBy(desc(ticketsTable.updatedAt));

  res.json({ tickets });
});

// GET /api/account/tickets/:id — get single ticket with thread
router.get("/account/tickets/:id", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { id } = req.params;

  let [ticket] = await db.select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.id, id), eq(ticketsTable.accountUsername, username)));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  if (ticket.customerUnread) {
    await db.update(ticketsTable)
      .set({ customerUnread: false })
      .where(eq(ticketsTable.id, id));
    ticket = { ...ticket, customerUnread: false };
  }

  const messages = await db.select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(asc(ticketMessagesTable.createdAt));

  res.json({ ticket, messages });
});

// POST /api/account/tickets/:id/messages — post a reply
router.post("/account/tickets/:id/messages", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { id } = req.params;

  const parsed = PostTicketMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
    return;
  }
  const { body } = parsed.data;

  const [ticket] = await db.select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.id, id), eq(ticketsTable.accountUsername, username)));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status === "closed") {
    res.status(400).json({ error: "Cannot reply to a closed ticket" }); return;
  }

  const now = new Date();
  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: id,
    authorRole: "customer",
    authorUsername: username,
    body: body.trim(),
    createdAt: now,
  }).returning();

  await db.update(ticketsTable)
    .set({ updatedAt: now, status: ticket.status === "resolved" ? "open" : ticket.status })
    .where(eq(ticketsTable.id, id));

  // Notify admin and track message ID for reply routing
  const replyNotif =
    `💬 <b>Customer replied on ticket</b>\n` +
    `From: @${username}\n` +
    `Subject: ${ticket.subject}\n\n` +
    `${body.trim().slice(0, 300)}${body.trim().length > 300 ? "…" : ""}\n\n` +
    `<i>Reply to this message in Telegram to post a reply on the ticket.</i>`;

  sendAdminMessageFull(replyNotif).then(({ ok, messageId, chatId }) => {
    if (ok && messageId && chatId) {
      db.insert(ticketTelegramMessagesTable).values({
        telegramMessageId: messageId,
        chatId,
        ticketId: id,
      }).catch(() => {});
    }
  }).catch(() => {});

  res.status(201).json(msg);
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// POST /api/admin/tickets — admin initiates a new conversation with a user
router.post("/admin/tickets", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUsername = getAdminUsername(res);

  const { username, category, subject, message } = req.body as Record<string, unknown>;

  if (!username || typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "username is required" }); return;
  }
  if (!category || typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Invalid category" }); return;
  }
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    res.status(400).json({ error: "subject is required" }); return;
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" }); return;
  }

  const targetUsername = username.trim().replace(/^@/, "");
  const ticketId = randomUUID();
  const now = new Date();

  // Ensure the account exists — FK on tickets.account_username requires it.
  // If the user has no account yet, create a minimal one so admin can open a ticket for any Telegram user.
  await db.insert(accountsTable).values({
    telegramUsername: targetUsername,
  }).onConflictDoNothing();

  await db.insert(ticketsTable).values({
    id: ticketId,
    accountUsername: targetUsername,
    category: category as TicketCategory,
    subject: subject.trim(),
    status: "open",
    customerUnread: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(ticketMessagesTable).values({
    ticketId,
    authorRole: "admin",
    authorUsername: adminUsername,
    body: message.trim(),
    createdAt: now,
  });

  notifyUserTicket(
    targetUsername,
    ticketId,
    `💬 <b>New message from support</b>\n` +
    `Subject: <b>${subject.trim()}</b>\n\n` +
    `${message.trim().slice(0, 300)}${message.trim().length > 300 ? "…" : ""}\n\n` +
    `<i>Reply directly here in Telegram or via the app.</i>`,
  ).catch(() => {});

  res.status(201).json({
    id: ticketId,
    accountUsername: targetUsername,
    category,
    subject: subject.trim(),
    status: "open",
    customerUnread: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
});

// GET /api/admin/tickets — list all tickets with optional filters
router.get("/admin/tickets", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const parsedQuery = AdminListTicketsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.errors[0]?.message ?? "Invalid filter parameters" });
    return;
  }
  const { status, category } = parsedQuery.data;

  const conditions = [];
  if (status) conditions.push(eq(ticketsTable.status, status as TicketStatus));
  if (category) conditions.push(eq(ticketsTable.category, category as TicketCategory));

  const rows = await db.select({ ticket: ticketsTable, gbName: groupBuysTable.name })
    .from(ticketsTable)
    .leftJoin(groupBuysTable, eq(ticketsTable.groupBuyId, groupBuysTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ticketsTable.updatedAt));

  const tickets = rows.map(r => ({ ...r.ticket, groupBuyName: r.gbName ?? null }));

  res.json({ tickets });
});

// GET /api/admin/tickets/:id — get ticket with thread (admin)
router.get("/admin/tickets/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [row] = await db.select({ ticket: ticketsTable, gbName: groupBuysTable.name })
    .from(ticketsTable)
    .leftJoin(groupBuysTable, eq(ticketsTable.groupBuyId, groupBuysTable.id))
    .where(eq(ticketsTable.id, id));

  if (!row) { res.status(404).json({ error: "Ticket not found" }); return; }

  const ticket = { ...row.ticket, groupBuyName: row.gbName ?? null };

  const messages = await db.select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(asc(ticketMessagesTable.createdAt));

  res.json({ ticket, messages });
});

// PUT /api/admin/tickets/:id/status — change ticket status
router.put("/admin/tickets/:id/status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const parsed = AdminUpdateTicketStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid status" });
    return;
  }
  const { status } = parsed.data;

  const [ticket] = await db.select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, id));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const now = new Date();
  await db.update(ticketsTable)
    .set({ status: status as TicketStatus, updatedAt: now })
    .where(eq(ticketsTable.id, id));

  res.json({ id, status, updatedAt: now.toISOString() });
});

// POST /api/admin/tickets/:id/messages — admin reply
router.post("/admin/tickets/:id/messages", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUsername = getAdminUsername(res);

  const { id } = req.params;

  const parsed = AdminPostTicketMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
    return;
  }
  const { body } = parsed.data;

  const [ticket] = await db.select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, id));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const now = new Date();
  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: id,
    authorRole: "admin",
    authorUsername: adminUsername,
    body: body.trim(),
    createdAt: now,
  }).returning();

  await db.update(ticketsTable)
    .set({
      updatedAt: now,
      status: ticket.status === "open" ? "in_progress" : ticket.status,
      customerUnread: true,
    })
    .where(eq(ticketsTable.id, id));

  // Notify the customer via Telegram (silent — never blocks the response)
  const excerpt = body.trim().slice(0, 300) + (body.trim().length > 300 ? "…" : "");
  const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
  notifyUserTicket(
    ticket.accountUsername,
    id,
    `💬 <b>Support ticket reply</b>\n` +
    `Subject: <b>${ticket.subject}</b>\n\n` +
    `${excerpt}\n\n` +
    `<a href="${appUrl}/account?s=support&ticket=${id}">View in app →</a>\n` +
    `<i>Or reply directly here in Telegram.</i>`,
  ).catch(() => {});

  res.status(201).json(msg);
});

// ─────────────────────────────────────────────────────────────
// ORGANISER ENDPOINTS
// ─────────────────────────────────────────────────────────────

const _appUrlOrg = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

// GET /api/organiser/tickets — list tickets for the organiser's GBs (optionally filtered by groupBuyId)
router.get("/organiser/tickets", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const filterGbId = typeof req.query["groupBuyId"] === "string" ? req.query["groupBuyId"] : undefined;

  const orgGbs = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.organiserId, username));

  const gbIds = orgGbs.map(g => g.id);
  if (gbIds.length === 0) { res.json({ tickets: [] }); return; }

  const conditions: ReturnType<typeof eq>[] = [inArray(ticketsTable.groupBuyId, gbIds) as ReturnType<typeof eq>];
  if (filterGbId) conditions.push(eq(ticketsTable.groupBuyId, filterGbId));

  const tickets = await db.select()
    .from(ticketsTable)
    .where(and(...conditions))
    .orderBy(desc(ticketsTable.updatedAt));

  res.json({ tickets });
});

// GET /api/organiser/tickets/:id — get a single ticket with full thread
router.get("/organiser/tickets/:id", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = req.params.id as string;

  const [row] = await db
    .select({ ticket: ticketsTable, gbOrganiserId: groupBuysTable.organiserId, gbName: groupBuysTable.name })
    .from(ticketsTable)
    .leftJoin(groupBuysTable, eq(ticketsTable.groupBuyId, groupBuysTable.id))
    .where(eq(ticketsTable.id, id));

  if (!row) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (row.gbOrganiserId !== username) { res.status(403).json({ error: "This ticket is not for one of your Group Buys" }); return; }

  const messages = await db.select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(asc(ticketMessagesTable.createdAt));

  res.json({ ticket: { ...row.ticket, groupBuyName: row.gbName ?? null }, messages });
});

// POST /api/organiser/tickets/:id/messages — organiser reply
router.post("/organiser/tickets/:id/messages", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = req.params.id as string;
  const { body } = req.body as { body?: string };

  if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }

  const [row] = await db
    .select({ ticket: ticketsTable, gbOrganiserId: groupBuysTable.organiserId })
    .from(ticketsTable)
    .leftJoin(groupBuysTable, eq(ticketsTable.groupBuyId, groupBuysTable.id))
    .where(eq(ticketsTable.id, id));

  if (!row) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (row.gbOrganiserId !== username) { res.status(403).json({ error: "This ticket is not for one of your Group Buys" }); return; }
  if (row.ticket.status === "closed") { res.status(400).json({ error: "Cannot reply to a closed ticket" }); return; }

  const now = new Date();
  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: id,
    authorRole: "admin",
    authorUsername: username,
    body: body.trim(),
    createdAt: now,
  }).returning();

  await db.update(ticketsTable)
    .set({ updatedAt: now, status: row.ticket.status === "open" ? "in_progress" : row.ticket.status, customerUnread: true })
    .where(eq(ticketsTable.id, id));

  notifyUserTicket(
    row.ticket.accountUsername,
    id,
    `💬 <b>Reply from your Group Buy organiser</b>\n` +
    `Subject: <b>${row.ticket.subject}</b>\n\n` +
    `${body.trim().slice(0, 300)}${body.trim().length > 300 ? "…" : ""}\n\n` +
    `<a href="${_appUrlOrg}/account?s=support&ticket=${id}">View in app →</a>\n` +
    `<i>Or reply directly here in Telegram.</i>`,
  ).catch(() => {});

  res.status(201).json(msg);
});

export default router;

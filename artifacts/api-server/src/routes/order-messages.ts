import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db, ordersTable, orderMessagesTable, accountsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { getJwtSecret } from "../middleware/account-auth";
import { notifyUser, sendAdminMessage } from "../lib/telegram";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

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

const MAX_BODY_LENGTH = 4000;
// 10 MB as base64 ≈ 13.5 MB string — we accept up to ~14 MB of attachment_data
// Body size limit is set per-route in app.ts

function validateAttachment(data: unknown, name: unknown, mime: unknown): string | null {
  if (!data && !name && !mime) return null; // no attachment — ok
  if (typeof data !== "string") return "attachment_data must be a base64 string";
  if (typeof name !== "string") return "attachment_name is required";
  if (typeof mime !== "string") return "attachment_mime is required";
  // Rough size check: base64 string length * 0.75 ≈ bytes
  const approxBytes = data.length * 0.75;
  if (approxBytes > 11 * 1024 * 1024) return "Attachment exceeds 10 MB limit";
  return null;
}

// Strip attachmentData from list responses (only send for individual messages or on demand)
function stripAttachment(msg: typeof orderMessagesTable.$inferSelect) {
  const { attachmentData, ...rest } = msg;
  return { ...rest, hasAttachment: !!attachmentData };
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS  /api/account/orders/:orderId/messages
// ─────────────────────────────────────────────────────────────

// GET — list messages for an order (customer must own the order)
router.get("/account/orders/:orderId/messages", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { orderId } = req.params;

  // Verify ownership
  const [order] = await db.select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.telegramUsername, username)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const messages = await db.select()
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(desc(orderMessagesTable.createdAt));

  res.json({ messages: messages.map(stripAttachment) });
});

// GET — fetch a single message attachment (customer must own the order)
router.get("/account/orders/:orderId/messages/:msgId/attachment", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { orderId, msgId } = req.params;

  const [order] = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.telegramUsername, username)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [msg] = await db.select()
    .from(orderMessagesTable)
    .where(and(eq(orderMessagesTable.id, msgId), eq(orderMessagesTable.orderId, orderId)));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  res.json({ attachmentData: msg.attachmentData ?? null, attachmentName: msg.attachmentName ?? null, attachmentMime: msg.attachmentMime ?? null });
});

// POST — send a message as customer
router.post("/account/orders/:orderId/messages", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { orderId } = req.params;
  const { body, attachmentData, attachmentName, attachmentMime } = req.body as Record<string, unknown>;

  if (typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "body is required" }); return;
  }
  if (body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `Message too long (max ${MAX_BODY_LENGTH} chars)` }); return;
  }

  const attachErr = validateAttachment(attachmentData, attachmentName, attachmentMime);
  if (attachErr) { res.status(400).json({ error: attachErr }); return; }

  // Verify ownership
  const [order] = await db.select({ id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.telegramUsername, username)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const id = randomUUID();
  const now = new Date();

  await db.insert(orderMessagesTable).values({
    id,
    orderId,
    senderRole: "customer",
    senderUsername: username,
    body: body.trim(),
    attachmentData: attachmentData as string | undefined ?? null,
    attachmentName: attachmentName as string | undefined ?? null,
    attachmentMime: attachmentMime as string | undefined ?? null,
    readByAdmin: false,
    readByCustomer: true,
    createdAt: now,
  });

  // Notify admin
  const hasFile = !!attachmentData;
  sendAdminMessage(
    `💬 <b>New message from @${username}</b>\nOrder: <code>${order.code}</code>\n\n${body.trim()}${hasFile ? "\n\n📎 <i>Attachment included</i>" : ""}`
  ).catch(() => {});

  res.status(201).json({ id, orderId, senderRole: "customer", senderUsername: username, body: body.trim(), hasAttachment: hasFile, readByAdmin: false, readByCustomer: true, createdAt: now.toISOString() });
});

// PATCH — mark all messages as read by customer
router.patch("/account/orders/:orderId/messages/read", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { orderId } = req.params;

  const [order] = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.telegramUsername, username)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  await db.update(orderMessagesTable)
    .set({ readByCustomer: true })
    .where(and(eq(orderMessagesTable.orderId, orderId), eq(orderMessagesTable.readByCustomer, false)));

  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS  /api/admin/orders/:orderId/messages
// ─────────────────────────────────────────────────────────────

// GET — list all messages for an order (admin)
router.get("/admin/orders/:orderId/messages", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orderId } = req.params;

  const [order] = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const messages = await db.select()
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(desc(orderMessagesTable.createdAt));

  res.json({ messages: messages.map(stripAttachment) });
});

// GET — fetch a single message attachment (admin)
router.get("/admin/orders/:orderId/messages/:msgId/attachment", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orderId, msgId } = req.params;

  const [msg] = await db.select()
    .from(orderMessagesTable)
    .where(and(eq(orderMessagesTable.id, msgId), eq(orderMessagesTable.orderId, orderId)));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  res.json({ attachmentData: msg.attachmentData ?? null, attachmentName: msg.attachmentName ?? null, attachmentMime: msg.attachmentMime ?? null });
});

// POST — send a message as admin
router.post("/admin/orders/:orderId/messages", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUsername = getAdminUsername(res);

  const { orderId } = req.params;
  const { body, attachmentData, attachmentName, attachmentMime } = req.body as Record<string, unknown>;

  if (typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "body is required" }); return;
  }
  if (body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `Message too long (max ${MAX_BODY_LENGTH} chars)` }); return;
  }

  const attachErr = validateAttachment(attachmentData, attachmentName, attachmentMime);
  if (attachErr) { res.status(400).json({ error: attachErr }); return; }

  const [order] = await db.select({ id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const id = randomUUID();
  const now = new Date();

  await db.insert(orderMessagesTable).values({
    id,
    orderId,
    senderRole: "admin",
    senderUsername: adminUsername,
    body: body.trim(),
    attachmentData: attachmentData as string | undefined ?? null,
    attachmentName: attachmentName as string | undefined ?? null,
    attachmentMime: attachmentMime as string | undefined ?? null,
    readByAdmin: true,
    readByCustomer: false,
    createdAt: now,
  });

  // Notify customer via Telegram
  const hasFile = !!attachmentData;
  notifyUser(
    order.telegramUsername,
    "status",
    `💬 <b>New message about your order ${order.code}</b>\n\n${body.trim()}${hasFile ? "\n\n📎 <i>Attachment included</i>" : ""}\n\n<i>Reply by visiting your order page.</i>`
  ).catch(() => {});

  res.status(201).json({ id, orderId, senderRole: "admin", senderUsername: adminUsername, body: body.trim(), hasAttachment: hasFile, readByAdmin: true, readByCustomer: false, createdAt: now.toISOString() });
});

// PATCH — mark all messages as read by admin
router.patch("/admin/orders/:orderId/messages/read", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orderId } = req.params;

  await db.update(orderMessagesTable)
    .set({ readByAdmin: true })
    .where(and(eq(orderMessagesTable.orderId, orderId), eq(orderMessagesTable.readByAdmin, false)));

  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
// ADMIN — unread counts per order (batch)
// POST /api/admin/orders/message-unread-counts
// body: { orderIds: string[] }
// ─────────────────────────────────────────────────────────────
router.post("/admin/orders/message-unread-counts", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orderIds } = req.body as { orderIds?: string[] };
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.json({ counts: {} }); return;
  }

  const rows = await db.select({
    orderId: orderMessagesTable.orderId,
    readByAdmin: orderMessagesTable.readByAdmin,
  })
    .from(orderMessagesTable)
    .where(and(
      eq(orderMessagesTable.readByAdmin, false),
      // filter to only the requested order IDs via in-clause
    ));

  // Build counts map
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (orderIds.includes(row.orderId)) {
      counts[row.orderId] = (counts[row.orderId] ?? 0) + 1;
    }
  }

  res.json({ counts });
});

// CUSTOMER — unread count for all their orders
// GET /api/account/orders/message-unread-counts
router.get("/account/orders/message-unread-counts", async (req, res): Promise<void> => {
  const username = getAccountFromCookie(req);
  if (!username) { res.status(401).json({ error: "Not authenticated" }); return; }

  // Get all order IDs for this customer
  const orders = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.telegramUsername, username));

  const orderIds = orders.map(o => o.id);
  if (orderIds.length === 0) { res.json({ counts: {} }); return; }

  const rows = await db.select({
    orderId: orderMessagesTable.orderId,
    readByCustomer: orderMessagesTable.readByCustomer,
  })
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.readByCustomer, false));

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (orderIds.includes(row.orderId)) {
      counts[row.orderId] = (counts[row.orderId] ?? 0) + 1;
    }
  }

  res.json({ counts });
});

export default router;

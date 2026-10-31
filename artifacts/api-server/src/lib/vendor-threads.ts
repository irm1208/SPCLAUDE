import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, vendorSubmissionsTable, vendorThreadMessagesTable, vendorThreadTelegramMessagesTable, vendorThreadsTable } from "@workspace/db";
import { VendorPortalError } from "./vendor-portal-model";
import { getVendors } from "../routes/config";
import { esc, portalThreadUrl, sendToChatFull, vendorChats, prefEnabled } from "./vendor-telegram";
import { pushVendorNotification } from "./vendor-notifications";

/* ---------------------------------------------------------------------------
 * Vendor <-> Admin message threads.
 * Threads live beside the vendor portal (vendors are not member accounts, so the
 * member ticket tables cannot reference them). Each admin message is mirrored
 * to the vendor's Telegram chats; replying to it in Telegram lands back here.
 * ------------------------------------------------------------------------- */
type Executor = any;
export type ThreadRole = "vendor" | "admin";
export interface ThreadImage { path: string; name: string }
const MAX_BODY = 4000;

function cleanText(value: unknown, label: string, min: number, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < min) throw new VendorPortalError(min <= 1 ? `${label} is required.` : `${label} is too short.`);
  if (text.length > max) throw new VendorPortalError(`${label} must be ${max} characters or fewer.`);
  return text;
}
/** Pure validation for opening a thread. */
export function threadInput(body: unknown, hasImage = false) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const subject = cleanText(b.subject, "Subject", 2, 140);
  const text = typeof b.body === "string" ? b.body.trim() : "";
  if (!text && !hasImage) throw new VendorPortalError("Write a message.");
  if (text.length > MAX_BODY) throw new VendorPortalError(`Message must be ${MAX_BODY} characters or fewer.`);
  const submissionId = typeof b.submissionId === "string" && b.submissionId.trim() ? b.submissionId.trim().slice(0, 80) : null;
  return { subject, body: text, submissionId };
}
/** Pure validation for a reply. */
export function messageInput(body: unknown, hasImage = false) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = typeof b.body === "string" ? b.body.trim() : "";
  if (!text && !hasImage) throw new VendorPortalError("Write a message.");
  if (text.length > MAX_BODY) throw new VendorPortalError(`Message must be ${MAX_BODY} characters or fewer.`);
  return { body: text };
}
export const preview = (text: string, image?: ThreadImage | null) => (text || (image ? "📷 Photo" : "")).replace(/\s+/g, " ").slice(0, 120);

export function publicThread(row: any, extra: { reference?: string | null; vendorName?: string } = {}) {
  return {
    id: row.id, vendorId: row.vendorId, submissionId: row.submissionId ?? null, reference: extra.reference ?? row.reference ?? null,
    vendorName: extra.vendorName, subject: row.subject, status: row.status as "open" | "closed", openedBy: row.openedBy as ThreadRole,
    vendorUnread: Number(row.vendorUnread ?? 0), adminUnread: Number(row.adminUnread ?? 0),
    lastMessageAt: row.lastMessageAt, lastMessagePreview: row.lastMessagePreview ?? null,
    closedBy: row.closedBy ?? null, closedAt: row.closedAt ?? null, createdAt: row.createdAt,
  };
}
export function publicMessage(row: any, attachmentBase: string) {
  return {
    id: row.id, threadId: row.threadId, authorRole: row.authorRole as ThreadRole, authorName: row.authorName, body: row.body,
    via: row.via, createdAt: row.createdAt,
    image: row.imagePath ? { name: row.imageName ?? "Photo", url: `${attachmentBase}/${row.threadId}/attachments/${row.id}` } : null,
  };
}

const withReference = (tx: Executor) => tx.select({ thread: vendorThreadsTable, reference: vendorSubmissionsTable.reference }).from(vendorThreadsTable)
  .leftJoin(vendorSubmissionsTable, eq(vendorSubmissionsTable.id, vendorThreadsTable.submissionId));

export async function listVendorThreads(tx: Executor, vendorId: string) {
  const rows = await withReference(tx).where(eq(vendorThreadsTable.vendorId, vendorId)).orderBy(desc(vendorThreadsTable.lastMessageAt)).limit(200);
  return rows.map((r: any) => publicThread(r.thread, { reference: r.reference }));
}
export async function unreadForVendor(tx: Executor, vendorId: string): Promise<number> {
  const [row] = await tx.select({ n: sql<number>`coalesce(sum(${vendorThreadsTable.vendorUnread}), 0)` }).from(vendorThreadsTable).where(eq(vendorThreadsTable.vendorId, vendorId));
  return Number(row?.n ?? 0);
}
export async function adminThreads(tx: Executor, filter: { status?: string; vendorId?: string } = {}) {
  const conditions = [];
  if (filter.status === "open" || filter.status === "closed") conditions.push(eq(vendorThreadsTable.status, filter.status));
  if (filter.vendorId) conditions.push(eq(vendorThreadsTable.vendorId, filter.vendorId));
  const rows = await withReference(tx).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(vendorThreadsTable.lastMessageAt)).limit(300);
  const vendors = await getVendors();
  return rows.map((r: any) => publicThread(r.thread, { reference: r.reference, vendorName: vendors.find(v => v.id === r.thread.vendorId)?.name ?? r.thread.vendorId }));
}
export async function loadThread(tx: Executor, id: string, vendorId?: string, lock = false) {
  let query = withReference(tx).where(vendorId ? and(eq(vendorThreadsTable.id, id), eq(vendorThreadsTable.vendorId, vendorId)) : eq(vendorThreadsTable.id, id));
  if (lock) query = query.for("update", { of: vendorThreadsTable });
  const [row] = await query;
  if (!row) throw new VendorPortalError("Conversation not found.", 404);
  return { ...row.thread, reference: row.reference ?? null };
}
export async function threadMessages(tx: Executor, threadId: string) {
  return tx.select().from(vendorThreadMessagesTable).where(eq(vendorThreadMessagesTable.threadId, threadId)).orderBy(asc(vendorThreadMessagesTable.createdAt)).limit(500);
}
export async function markRead(tx: Executor, threadId: string, side: ThreadRole) {
  await tx.update(vendorThreadsTable).set(side === "vendor" ? { vendorUnread: 0 } : { adminUnread: 0 }).where(eq(vendorThreadsTable.id, threadId));
}

export async function openThread(tx: Executor, input: {
  vendorId: string; subject: string; body: string; submissionId: string | null; authorRole: ThreadRole; authorName: string; image?: ThreadImage | null; via?: string;
}) {
  if (!(await getVendors()).some(v => v.id === input.vendorId)) throw new VendorPortalError("Vendor not found.", 404);
  let submissionId: string | null = null;
  if (input.submissionId) {
    const [sub] = await tx.select({ id: vendorSubmissionsTable.id }).from(vendorSubmissionsTable)
      .where(and(eq(vendorSubmissionsTable.id, input.submissionId), eq(vendorSubmissionsTable.vendorId, input.vendorId)));
    if (!sub) throw new VendorPortalError("Order not found.", 404);
    submissionId = sub.id;
  }
  const now = new Date();
  const [thread] = await tx.insert(vendorThreadsTable).values({
    id: randomUUID(), vendorId: input.vendorId, submissionId, subject: input.subject, status: "open", openedBy: input.authorRole,
    vendorUnread: input.authorRole === "admin" ? 1 : 0, adminUnread: input.authorRole === "vendor" ? 1 : 0,
    lastMessageAt: now, lastMessagePreview: preview(input.body, input.image), createdAt: now, updatedAt: now,
  }).returning();
  const [message] = await tx.insert(vendorThreadMessagesTable).values({
    id: randomUUID(), threadId: thread.id, authorRole: input.authorRole, authorName: input.authorName, body: input.body,
    imagePath: input.image?.path ?? null, imageName: input.image?.name ?? null, via: input.via ?? "portal", createdAt: now,
  }).returning();
  if (input.authorRole === "admin") await pushVendorNotification(tx, { vendorId: input.vendorId, kind: "message", title: `New message: ${input.subject}`, body: preview(input.body, input.image), link: `?thread=${encodeURIComponent(thread.id)}`, submissionId });
  return { thread, message };
}
/** Adds a message. A vendor reply reopens a closed thread; the other side's unread counter goes up. */
export async function postMessage(tx: Executor, input: {
  threadId: string; vendorId?: string; authorRole: ThreadRole; authorName: string; body: string; image?: ThreadImage | null; via?: string;
}) {
  const thread = await loadThread(tx, input.threadId, input.vendorId, true);
  if (thread.status === "closed" && input.authorRole === "admin") throw new VendorPortalError("Reopen the conversation before replying.", 409);
  const now = new Date();
  const [message] = await tx.insert(vendorThreadMessagesTable).values({
    id: randomUUID(), threadId: thread.id, authorRole: input.authorRole, authorName: input.authorName, body: input.body,
    imagePath: input.image?.path ?? null, imageName: input.image?.name ?? null, via: input.via ?? "portal", createdAt: now,
  }).returning();
  await tx.update(vendorThreadsTable).set({
    status: "open", closedAt: null, closedBy: null, lastMessageAt: now, lastMessagePreview: preview(input.body, input.image), updatedAt: now,
    ...(input.authorRole === "vendor" ? { adminUnread: sql`${vendorThreadsTable.adminUnread} + 1` } : { vendorUnread: sql`${vendorThreadsTable.vendorUnread} + 1` }),
  }).where(eq(vendorThreadsTable.id, thread.id));
  if (input.authorRole === "admin") await pushVendorNotification(tx, { vendorId: thread.vendorId, kind: "message", title: `Reply: ${thread.subject}`, body: preview(input.body, input.image), link: `?thread=${encodeURIComponent(thread.id)}`, submissionId: thread.submissionId ?? null });
  return { thread, message };
}
export async function setThreadStatus(tx: Executor, threadId: string, status: unknown, actor: string) {
  if (status !== "open" && status !== "closed") throw new VendorPortalError("Status must be open or closed.");
  const thread = await loadThread(tx, threadId, undefined, true);
  const now = new Date();
  const [updated] = await tx.update(vendorThreadsTable).set(status === "closed" ? { status, closedBy: actor, closedAt: now, updatedAt: now } : { status, closedBy: null, closedAt: null, updatedAt: now })
    .where(eq(vendorThreadsTable.id, thread.id)).returning();
  return { ...updated, reference: thread.reference };
}
export async function findMessage(tx: Executor, threadId: string, messageId: string, vendorId?: string) {
  await loadThread(tx, threadId, vendorId);
  const [row] = await tx.select().from(vendorThreadMessagesTable).where(and(eq(vendorThreadMessagesTable.id, messageId), eq(vendorThreadMessagesTable.threadId, threadId)));
  if (!row?.imagePath) throw new VendorPortalError("Attachment not found.", 404);
  return row;
}

/* ---- Telegram mirror ------------------------------------------------------ */
export function formatThreadMessage(thread: { subject: string; reference?: string | null }, message: { authorName: string; body: string; imagePath?: string | null }) {
  const head = `💬 <b>Peps Anonymous</b> · ${esc(thread.subject)}${thread.reference ? ` · #${esc(thread.reference)}` : ""}`;
  const body = message.body ? esc(message.body.slice(0, 1500)) + (message.body.length > 1500 ? "…" : "") : "";
  return `${head}\n\n${body}${message.imagePath ? `${body ? "\n" : ""}📷 Photo attached — open the portal to view it.` : ""}\n\n<i>Reply to this message to answer, or open the portal.</i>`;
}
/** Sends an admin message to the vendor's chats and remembers the Telegram message ids for reply routing. */
export async function mirrorToVendorTelegram(thread: any, message: any) {
  const chats = await vendorChats(db, thread.vendorId);
  const text = formatThreadMessage(thread, message);
  let delivered = 0;
  for (const chat of chats) {
    if (!prefEnabled(chat.prefs, "message")) continue;
    const result = await sendToChatFull(chat.chatId, text, portalThreadUrl(thread.id), "Open conversation");
    if (!result.ok) continue;
    delivered++;
    if (result.messageId != null) {
      await db.insert(vendorThreadTelegramMessagesTable).values({ id: randomUUID(), telegramMessageId: String(result.messageId), chatId: chat.chatId, threadId: thread.id }).onConflictDoNothing().catch(() => undefined);
    }
  }
  return delivered;
}
export async function threadForTelegramReply(tx: Executor, chatId: string, repliedMessageId: string | number) {
  const [row] = await tx.select({ threadId: vendorThreadTelegramMessagesTable.threadId }).from(vendorThreadTelegramMessagesTable)
    .where(and(eq(vendorThreadTelegramMessagesTable.chatId, chatId), eq(vendorThreadTelegramMessagesTable.telegramMessageId, String(repliedMessageId))));
  return row?.threadId ?? null;
}

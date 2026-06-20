import { db } from "@workspace/db";
import {
  wholesaleSharesTable,
  wholesaleShareMembersTable,
  wholesaleShareMessagesTable,
  wholesaleChatTelegramMessagesTable,
} from "@workspace/db";
import { eq, and, sql, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { notifyUserFromTemplateFull } from "./telegram";

// Escape user-supplied text for safe inclusion in a Telegram HTML-parse-mode message.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fire-and-forget Telegram notification to every OTHER member of a share when a
// chat message is posted. For each recipient we capture the sent Telegram
// message_id and store a (telegramMessageId, chatId) → shareId mapping so that a
// member can REPLY to the notification in Telegram and have it routed back into
// the in-app chat. Failures (unlinked accounts, disabled prefs) are ignored.
export async function notifyShareMembersOfMessage(
  shareId: string,
  senderUsername: string,
  message: string,
): Promise<void> {
  const members = await db
    .select({ username: wholesaleShareMembersTable.username })
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, shareId));

  const senderLower = senderUsername.toLowerCase();
  const recipients = members.filter(m => m.username.toLowerCase() !== senderLower);
  if (recipients.length === 0) return;

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
  const sender = escapeHtml(senderUsername.replace(/^@/, ""));
  const truncated = message.length > 300 ? `${message.slice(0, 300)}…` : message;
  const safeMessage = escapeHtml(truncated);

  await Promise.allSettled(recipients.map(async (r) => {
    const result = await notifyUserFromTemplateFull(r.username, "wholesale_chat", "wholesale_share_message", {
      code: shareId,
      sender: `@${sender}`,
      message: safeMessage,
      app_url: appUrl,
    });
    if (result.ok && result.messageId && result.chatId) {
      await db.insert(wholesaleChatTelegramMessagesTable).values({
        telegramMessageId: result.messageId,
        chatId: result.chatId,
        shareId,
      }).onConflictDoNothing();
    }
  }));
}

export type PostChatMessageResult =
  | { ok: true; message: { id: string; username: string; body: string; createdAt: Date } }
  | { ok: false; status: number; error: string };

// Single source of truth for posting a message into a shared-order chat, used by
// both the web POST route and the Telegram webhook (reply routing). Validates the
// body, share existence/status, membership and throttle, inserts the message, then
// fans the message out to the other members (fire-and-forget).
export async function postWholesaleChatMessage(opts: {
  shareId: string;
  senderUsername: string;
  body: string;
}): Promise<PostChatMessageResult> {
  const { shareId, senderUsername } = opts;

  const [share] = await db
    .select({ id: wholesaleSharesTable.id, status: wholesaleSharesTable.status })
    .from(wholesaleSharesTable)
    .where(eq(wholesaleSharesTable.id, shareId));
  if (!share) return { ok: false, status: 404, error: "Shared order not found" };

  const [member] = await db
    .select({ id: wholesaleShareMembersTable.id })
    .from(wholesaleShareMembersTable)
    .where(and(
      eq(wholesaleShareMembersTable.shareId, share.id),
      sql`lower(${wholesaleShareMembersTable.username}) = ${senderUsername.toLowerCase()}`,
    ));
  if (!member) return { ok: false, status: 403, error: "You are not a member of this shared order." };

  if (share.status === "cancelled") {
    return { ok: false, status: 409, error: "This shared order has been cancelled. Chat is read-only." };
  }

  const text = typeof opts.body === "string" ? opts.body.trim() : "";
  if (text.length < 1) return { ok: false, status: 400, error: "Message cannot be empty." };
  if (text.length > 2000) return { ok: false, status: 400, error: "Message is too long (max 2000 characters)." };

  // DB-backed per-member throttle: max 10 messages/minute or 60/hour per member+share.
  const now = Date.now();
  const since1m = new Date(now - 60_000);
  const since1h = new Date(now - 3_600_000);
  const [counts] = await db
    .select({
      lastMinute: sql<number>`count(*) filter (where ${wholesaleShareMessagesTable.createdAt} >= ${since1m})::int`,
      lastHour: sql<number>`count(*)::int`,
    })
    .from(wholesaleShareMessagesTable)
    .where(and(
      eq(wholesaleShareMessagesTable.shareId, share.id),
      sql`lower(${wholesaleShareMessagesTable.username}) = ${senderUsername.toLowerCase()}`,
      gte(wholesaleShareMessagesTable.createdAt, since1h),
    ));
  if ((counts?.lastMinute ?? 0) >= 10 || (counts?.lastHour ?? 0) >= 60) {
    return { ok: false, status: 429, error: "You're sending messages too quickly. Please slow down." };
  }

  const id = randomUUID();
  const createdAt = new Date();
  await db.insert(wholesaleShareMessagesTable).values({
    id, shareId: share.id, username: senderUsername, body: text, createdAt,
  });

  // Notify the other members in the background — never block on Telegram.
  void notifyShareMembersOfMessage(share.id, senderUsername, text).catch(() => {});

  return { ok: true, message: { id, username: senderUsername, body: text, createdAt } };
}

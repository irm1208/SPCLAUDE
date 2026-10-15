import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, accountGroupBuysTable, groupBuysTable, ordersTable, siteConfigTable } from "@workspace/db";
import { canonicalUsername, readGroupUpdate, updatePrefix, type GroupUpdate } from "./group-buy-updates-model";
import { notifyUserFull } from "./telegram";
import { registerScheduler } from "./scheduler-registry";

type Database = Pick<typeof db, "select" | "insert" | "update">;
type Recipient = { username: string; attempts: number; nextAttemptAt: number };
type Delivery = { groupBuyId: string; updateId: string; pending: Recipient[]; availableAt: number };
const deliveryKey = (id: string) => `gb_update_delivery:${id}`;

async function currentRecipients(database: Database, groupId: string, blocked: string[]) {
  const [members, orders] = await Promise.all([
    database.select({ username: accountGroupBuysTable.accountId }).from(accountGroupBuysTable)
      .where(eq(accountGroupBuysTable.groupBuyId, groupId)),
    database.select({ username: ordersTable.telegramUsername }).from(ordersTable)
      .where(and(eq(ordersTable.groupBuyId, groupId), isNull(ordersTable.deletedAt))),
  ]);
  const excluded = new Set(blocked.map(canonicalUsername));
  return [...new Set([...members, ...orders].map(row => canonicalUsername(row.username)))]
    .filter(username => username && !excluded.has(username));
}

/** Called in the SAME transaction as publishing. Retain completed markers so
 * editing/hiding/republishing the same post cannot broadcast it again. */
export async function queueGroupBuyUpdateNotification(
  database: Database, group: { id: string; blockedAccounts: string[] | null }, update: GroupUpdate,
) {
  if (!update.published) return;
  const usernames = await currentRecipients(database, group.id, group.blockedAccounts ?? []);
  const delivery: Delivery = {
    groupBuyId: group.id, updateId: update.id, availableAt: Date.now(),
    pending: usernames.map(username => ({ username, attempts: 0, nextAttemptAt: 0 })),
  };
  await database.insert(siteConfigTable).values({ key: deliveryKey(update.id), value: JSON.stringify(delivery) })
    .onConflictDoNothing();
}

function escapeLimited(text: string, limit: number) {
  let result = "";
  for (const char of text) {
    const escaped = char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char === '"' ? "&quot;" : char;
    if (result.length + escaped.length > limit) return `${result}…`;
    result += escaped;
  }
  return result;
}

export function groupBuyUpdateTelegramMessage(groupName: string, update: GroupUpdate) {
  const base = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
  const href = `${base}/order?gbId=${encodeURIComponent(update.groupBuyId)}#group-buy-updates`;
  const title = update.title ? `\n<b>${escapeLimited(update.title, 400)}</b>` : "";
  // Telegram allows 4096 characters. Truncate before escaping whole entities,
  // and link to the full post (including any private image) on the member page.
  return `<b>Group-buy ${update.kind === "status" ? "progress" : "update"}</b>\n`
    + `<b>${escapeLimited(groupName, 300)}</b>${title}\n\n${escapeLimited(update.note, 2600)}\n\n`
    + `<a href="${escapeLimited(href, 600)}">View full update${update.imageKey ? " and image" : ""} →</a>`;
}

/** Durable, bounded work: network calls are OUTSIDE database transactions.
 * A compare-and-swap lease prevents multiple app instances claiming one post.
 * Telegram has no idempotency API: a crash after delivery but before recording
 * its result can still duplicate that one message, never guarantee exactly-once. */
export async function drainGroupBuyUpdateNotifications(database: Database = db, now = Date.now()) {
  const rows = await database.select().from(siteConfigTable).where(sql`
    CASE WHEN ${siteConfigTable.key} LIKE 'gb_update_delivery:%' THEN
      jsonb_array_length((${siteConfigTable.value}::jsonb)->'pending') > 0
      AND ((${siteConfigTable.value}::jsonb)->>'availableAt')::bigint <= ${now}
    ELSE false END
  `).limit(5);
  for (const row of rows) {
    if (row.value === null) continue;
    const job = JSON.parse(row.value) as Delivery;
    // A unique token also distinguishes leases acquired in the same millisecond.
    let ownedValue = JSON.stringify({ ...job, availableAt: now + 120_000, lease: randomUUID() });
    const claimed = await database.update(siteConfigTable).set({ value: ownedValue })
      .where(and(eq(siteConfigTable.key, row.key), eq(siteConfigTable.value, row.value))).returning({ key: siteConfigTable.key });
    if (!claimed.length) continue;
    const persist = async () => {
      const next = JSON.stringify(job);
      const saved = await database.update(siteConfigTable).set({ value: next })
        .where(and(eq(siteConfigTable.key, row.key), eq(siteConfigTable.value, ownedValue))).returning({ key: siteConfigTable.key });
      ownedValue = next;
      return saved.length > 0;
    };
    try {
      const [group] = await database.select().from(groupBuysTable).where(eq(groupBuysTable.id, job.groupBuyId)).limit(1);
      const [stored] = await database.select().from(siteConfigTable)
        .where(eq(siteConfigTable.key, `${updatePrefix(job.groupBuyId)}${job.updateId}`)).limit(1);
      const update = stored ? readGroupUpdate(stored.value) : null;
      if (!group || !update?.published || update.groupBuyId !== job.groupBuyId || update.id !== job.updateId) {
        job.pending = []; await persist(); continue;
      }
      const allowed = new Set(await currentRecipients(database, job.groupBuyId, group.blockedAccounts ?? []));
      job.pending = job.pending.filter(recipient => allowed.has(recipient.username));
      const due = job.pending.filter(recipient => recipient.nextAttemptAt <= now).slice(0, 5);
      for (const recipient of due) {
        let completed = false;
        try {
          const result = await notifyUserFull(recipient.username, "status", groupBuyUpdateTelegramMessage(group.name, update),
            undefined, { eventKey: `group_buy_update:${update.id}` });
          completed = result.ok || result.skipped === true;
        } catch (error) { console.error("[gb-update-telegram] Delivery failed", error); }
        if (completed) job.pending = job.pending.filter(item => item !== recipient);
        else {
          recipient.attempts++;
          recipient.nextAttemptAt = now + Math.min(3_600_000, 60_000 * 2 ** Math.min(recipient.attempts - 1, 6));
        }
        // Keep the lease while this worker is sending the remaining recipients.
        job.availableAt = now + 120_000;
        if (!await persist()) break;
      }
      job.availableAt = job.pending.length ? Math.min(...job.pending.map(recipient => recipient.nextAttemptAt)) : now;
      await persist();
    } catch (error) {
      // Leave the durable job behind. Its lease expires and a later run retries.
      console.error("[gb-update-telegram] Could not drain announcement", error);
      throw error;
    }
  }
}

export function registerGroupBuyUpdateNotificationScheduler() {
  registerScheduler({
    name: "group-buy-update-notifications", label: "Group-buy Telegram updates",
    description: "Privately sends published group-buy updates and progress changes to members; retries temporary failures.",
    defaultIntervalMs: 10_000, minIntervalMs: 5_000, maxIntervalMs: 86_400_000, initialDelayMs: 5_000,
    run: async () => { await drainGroupBuyUpdateNotifications(); },
  });
}

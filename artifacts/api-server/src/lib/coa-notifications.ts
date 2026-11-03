import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, accountsTable, ordersTable, siteConfigTable, telegramMessageLogsTable, emailTemplatesTable } from "@workspace/db";
import { notifyUserFull } from "./telegram";
import { sendTemplatedEmail } from "./email";
import { registerScheduler } from "./scheduler-registry";
import { coaNotificationContent, type CoaEvent } from "./coa-notification-content";
export { coaNotificationContent } from "./coa-notification-content";

type Database = Pick<typeof db, "select" | "insert" | "update">;
type Job = {
  requestId: string; orderId: string; event: CoaEvent; fee: string; currency: string;
  telegramDone: boolean; emailDone: boolean; done: boolean; availableAt: number; attempts: number;
};
type DrainOptions = {
  now?: number;
  /** Tests can exercise the worker without any real transport. Both must be supplied. */
  telegram?: typeof notifyUserFull;
  email?: typeof sendTemplatedEmail;
};
const prefix = "coa_notification:";

/** The caller MUST pass the state-change transaction. The unique durable key,
 * feed insertion and COA change commit/rollback together. No network work here.
 * Keep completed keys permanently; release/reinvite and HTTP retries reuse them. */
export async function queueCoaNotification(tx: Database,
  request: { id: string; orderId: string; fee: string; currency: string }, event: CoaEvent) {
  const job: Job = { requestId: request.id, orderId: request.orderId, event, fee: request.fee, currency: request.currency,
    telegramDone: false, emailDone: false, done: false, availableAt: Date.now(), attempts: 0 };
  const [inserted] = await tx.insert(siteConfigTable).values({
    key: `${prefix}${request.id}:${event}`, value: JSON.stringify(job),
  }).onConflictDoNothing().returning({ key: siteConfigTable.key });
  if (!inserted) return;
  const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, request.orderId)).limit(1);
  if (!order) throw new Error("COA notification order not found");
  // Conventional status/payment alerts stay in the bell even if Telegram is
  // disabled or unlinked. External channels use their own opt-in policies.
  await tx.insert(telegramMessageLogsTable).values({
    recipientType: "user", recipientUsername: order.telegramUsername.replace(/^@/, "").toLowerCase(),
    recipientChatId: "", eventKey: `coa_${event}`, messageText: coaNotificationContent(event, request, order).text,
    delivered: false, errorMessage: "COA update (in-app); external delivery queued separately",
  });
}

/** Short CAS claims; no network calls inside transactions. Each channel is
 * acknowledged independently so email retries never repeat Telegram or the bell.
 * Telegram cannot offer exactly-once delivery across a process crash AFTER its
 * acceptance but BEFORE our acknowledgement. Ordinary saves/verification retries
 * and concurrent workers are deduplicated; Resend also receives an idempotency key. */
export async function drainCoaNotifications(database: Database = db, options: DrainOptions = {}) {
  if (process.env.NODE_ENV !== "production" && !(options.telegram && options.email)) return 0;
  const telegram = options.telegram ?? notifyUserFull;
  const email = options.email ?? sendTemplatedEmail;
  const now = options.now ?? Date.now();
  const rows = await database.select().from(siteConfigTable).where(sql`
    CASE WHEN ${siteConfigTable.key} LIKE 'coa_notification:%' THEN
      NOT ((${siteConfigTable.value}::jsonb)->>'done')::boolean
      AND ((${siteConfigTable.value}::jsonb)->>'availableAt')::bigint <= ${now}
    ELSE false END
  `).limit(10);
  let completed = 0;
  for (const row of rows) {
    if (!row.value) continue;
    const job: Job = JSON.parse(row.value);
    if (job.done || job.availableAt > now) continue;
    let ownedValue = JSON.stringify({ ...job, availableAt: now + 300_000, lease: randomUUID() });
    const [claimed] = await database.update(siteConfigTable).set({ value: ownedValue })
      .where(and(eq(siteConfigTable.key, row.key), eq(siteConfigTable.value, row.value))).returning({ key: siteConfigTable.key });
    if (!claimed) continue;
    const persist = async (final = false) => {
      const value = JSON.stringify({ ...job, ...(final ? {} : { availableAt: now + 300_000 }) });
      const [saved] = await database.update(siteConfigTable).set({ value })
        .where(and(eq(siteConfigTable.key, row.key), eq(siteConfigTable.value, ownedValue))).returning({ key: siteConfigTable.key });
      ownedValue = value;
      return !!saved;
    };
    try {
      // Resolve the current owner, not a snapshotted username/email. Account
      // renames migrate order ownership; pending jobs never target the old handle.
      const [order] = await database.select().from(ordersTable).where(eq(ordersTable.id, job.orderId)).limit(1);
      const username = order?.telegramUsername.replace(/^@/, "").toLowerCase();
      const [account] = username ? await database.select().from(accountsTable)
        .where(eq(accountsTable.telegramUsername, username)).limit(1) : [];
      if (!account || !order || order.deletedAt) {
        job.emailDone = job.telegramDone = true;
      } else {
        const content = coaNotificationContent(job.event, job, order, process.env.APP_URL ?? "https://saltandpeps.co.uk");
        if (!job.telegramDone) {
          const result = await telegram(account.telegramUsername, job.event === "paid" ? "payment" : "status",
            content.text, undefined, { websiteAlreadyRecorded: true, eventKey: `coa_${job.event}` });
          job.telegramDone = result.ok || result.skipped === true;
          if (!await persist()) continue;
        }
        if (!job.emailDone) {
          // Existing transactional email policy: a saved email plus an active
          // Admin template. Missing/disabled templates are terminal, not retries.
          const [template] = await database.select().from(emailTemplatesTable)
            .where(eq(emailTemplatesTable.eventKey, `coa_${job.event}`)).limit(1);
          if (!account.email?.includes("@") || !template?.isActive) job.emailDone = true;
          else {
            const result = await email(`coa_${job.event}`, account.email, content.vars,
              { idempotencyKey: `coa:${job.requestId}:${job.event}` });
            job.emailDone = result.ok || result.error === "Email template unavailable";
          }
          if (!await persist()) continue;
        }
      }
      job.done = job.telegramDone && job.emailDone;
      job.attempts++;
      job.availableAt = now + Math.min(3_600_000, 60_000 * 2 ** Math.min(job.attempts - 1, 6));
      if (await persist(true) && job.done) completed++;
    } catch (error) {
      // Leave the lease and durable job intact for a later run. Do not swallow
      // delivery failures or acknowledge an unfinished channel.
      console.error("[coa-notifications] Delivery deferred", row.key, error);
    }
  }
  return completed;
}

export function registerCoaNotificationScheduler() {
  registerScheduler({
    name: "coa-notifications", label: "COA request notifications",
    description: "Delivers COA invitations, payment receipts, processing and completion updates; disabled outside production.",
    defaultIntervalMs: 15_000, minIntervalMs: 5_000, maxIntervalMs: 86_400_000, initialDelayMs: 15_000,
    run: async () => { await drainCoaNotifications(); },
  });
}

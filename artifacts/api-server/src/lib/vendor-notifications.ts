import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, vendorNotificationsTable, type VendorNotificationPriority } from "@workspace/db";
import { VendorPortalError } from "./vendor-portal-model";
import { getVendors } from "../routes/config";

/* ---------------------------------------------------------------------------
 * In-app vendor notifications with priorities.
 *
 *   critical  stop what you are doing: order put on hold, order 4+ days without tracking
 *   high      act today: new shipment, 48h overdue, answered problem report
 *   normal    worth reading: messages from Peps Anonymous, announcements
 *   low       for the record: settings and security changes
 *
 * Every producer calls pushVendorNotification; dedupeKey makes repeated
 * detections (pollers, retries) idempotent.
 * ------------------------------------------------------------------------- */
type Executor = any;
export const PRIORITIES: VendorNotificationPriority[] = ["critical", "high", "normal", "low"];
export const PRIORITY_RANK: Record<VendorNotificationPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
export const isPriority = (value: unknown): value is VendorNotificationPriority => typeof value === "string" && (PRIORITIES as string[]).includes(value);

/** Default priority for each event kind; producers may override for escalations. */
export const KIND_PRIORITY: Record<string, VendorNotificationPriority> = {
  hold: "critical", overdue_critical: "critical", security_reset: "critical",
  new_order: "high", overdue: "high", issue_resolved: "high",
  message: "normal", announcement: "normal",
  settings: "low", security: "low",
};
export function priorityFor(kind: string, override?: VendorNotificationPriority): VendorNotificationPriority {
  return override ?? KIND_PRIORITY[kind] ?? "normal";
}

export interface NotificationInput {
  vendorId: string; kind: string; title: string; body?: string | null; link?: string | null;
  submissionId?: string | null; dedupeKey?: string | null; priority?: VendorNotificationPriority;
}
export async function pushVendorNotification(tx: Executor, input: NotificationInput) {
  const title = input.title.trim().slice(0, 140);
  if (!title) return null;
  const [row] = await tx.insert(vendorNotificationsTable).values({
    id: randomUUID(), vendorId: input.vendorId, priority: priorityFor(input.kind, input.priority), kind: input.kind, title,
    body: input.body?.trim().slice(0, 1000) || null, link: input.link ?? null, submissionId: input.submissionId ?? null, dedupeKey: input.dedupeKey ?? null,
  }).onConflictDoNothing().returning();
  return row ?? null;
}
export function publicNotification(row: any) {
  return { id: row.id, priority: row.priority as VendorNotificationPriority, kind: row.kind, title: row.title, body: row.body ?? null, link: row.link ?? null, submissionId: row.submissionId ?? null, read: !!row.readAt, readAt: row.readAt ?? null, createdAt: row.createdAt };
}
export async function listVendorNotifications(tx: Executor, vendorId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
  const where = options.unreadOnly ? and(eq(vendorNotificationsTable.vendorId, vendorId), isNull(vendorNotificationsTable.readAt)) : eq(vendorNotificationsTable.vendorId, vendorId);
  const rows = await tx.select().from(vendorNotificationsTable).where(where).orderBy(desc(vendorNotificationsTable.createdAt)).limit(Math.min(Math.max(options.limit ?? 50, 1), 200));
  // Unread items first within the feed, ordered by priority then recency; read items keep recency order.
  const rank = (p: unknown) => isPriority(p) ? PRIORITY_RANK[p] : 2;
  return rows.map(publicNotification).sort((a: any, b: any) => (Number(a.read) - Number(b.read)) || (a.read ? 0 : rank(a.priority) - rank(b.priority)) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}
export async function unreadCounts(tx: Executor, vendorId: string) {
  const rows = await tx.select({ priority: vendorNotificationsTable.priority, n: sql<number>`count(*)` }).from(vendorNotificationsTable)
    .where(and(eq(vendorNotificationsTable.vendorId, vendorId), isNull(vendorNotificationsTable.readAt))).groupBy(vendorNotificationsTable.priority);
  const counts = { critical: 0, high: 0, normal: 0, low: 0, total: 0 } as Record<VendorNotificationPriority | "total", number>;
  for (const r of rows as Array<{ priority: unknown; n: unknown }>) { const n = Number(r.n); const p = r.priority; if (isPriority(p)) counts[p] = n; counts.total += n; }
  return counts;
}
export async function markRead(tx: Executor, vendorId: string, ids: unknown): Promise<number> {
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  if (!list.length) return 0;
  const rows = await tx.update(vendorNotificationsTable).set({ readAt: new Date() })
    .where(and(eq(vendorNotificationsTable.vendorId, vendorId), isNull(vendorNotificationsTable.readAt), inArray(vendorNotificationsTable.id, list))).returning({ id: vendorNotificationsTable.id });
  return rows.length;
}
export async function markAllRead(tx: Executor, vendorId: string, upToPriority?: VendorNotificationPriority): Promise<number> {
  // "Up to high" means everything at least as important as high (critical and high), not the quieter ones.
  const priorities = upToPriority ? PRIORITIES.filter(p => PRIORITY_RANK[p] <= PRIORITY_RANK[upToPriority]) : PRIORITIES;
  const rows = await tx.update(vendorNotificationsTable).set({ readAt: new Date() })
    .where(and(eq(vendorNotificationsTable.vendorId, vendorId), isNull(vendorNotificationsTable.readAt), inArray(vendorNotificationsTable.priority, priorities))).returning({ id: vendorNotificationsTable.id });
  return rows.length;
}
/** Admin announcement to one, several or all vendors. */
export async function broadcast(tx: Executor, input: { priority: unknown; title: unknown; body: unknown; vendorIds?: unknown; actor: string }) {
  if (!isPriority(input.priority)) throw new VendorPortalError("Choose a priority: critical, high, normal or low.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 3 || title.length > 140) throw new VendorPortalError("Give the announcement a title of 3 to 140 characters.");
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 1000) : "";
  const vendors = await getVendors();
  const wanted = Array.isArray(input.vendorIds) ? input.vendorIds.filter((v): v is string => typeof v === "string") : [];
  const targets = wanted.length ? vendors.filter(v => wanted.includes(v.id)) : vendors;
  if (!targets.length) throw new VendorPortalError("No matching vendors.", 404);
  let sent = 0;
  for (const vendor of targets) {
    if (await pushVendorNotification(tx, { vendorId: vendor.id, kind: "announcement", priority: input.priority, title, body, link: null })) sent++;
  }
  return { sent, vendorIds: targets.map(v => v.id) };
}
/** Keeps the feed bounded: drop read items older than 90 days and anything beyond the newest 500 per vendor. */
export async function pruneNotifications(tx: Executor = db) {
  await tx.delete(vendorNotificationsTable).where(and(lt(vendorNotificationsTable.createdAt, new Date(Date.now() - 90 * 86_400_000)), sql`${vendorNotificationsTable.readAt} IS NOT NULL`));
}
export { db };

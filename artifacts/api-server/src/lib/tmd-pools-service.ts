import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db, tmdPoolsTable, tmdPoolItemsTable, tmdPoolMembersTable, tmdNotificationsTable, tmdUsersTable, tmdMessagesTable,
  type TmdPool, type TmdPoolMember,
} from "@workspace/db";
import { poolBreakdown, fundingProgress } from "./tmd-pricing";
import { TmdError } from "./tmd-model";
import { tmdPublicUrl, sendPlainEmail } from "./tmd-mail";
import { notifyUserTelegram, mirrorMessageToGroup } from "./tmd-telegram";

type Executor = any;

/* ---- Notifications ------------------------------------------------------------ */
export async function pushTmdNotification(tx: Executor, input: { userId: string; kind: string; title: string; body?: string | null; link?: string | null; dedupeKey?: string | null }) {
  const rows = await tx.insert(tmdNotificationsTable).values({ id: randomUUID(), userId: input.userId, kind: input.kind, title: input.title, body: input.body ?? null, link: input.link ?? null, dedupeKey: input.dedupeKey ?? null })
    .onConflictDoNothing().returning({ id: tmdNotificationsTable.id });
  if (!rows.length) return null;
  // Email and Telegram fan-out are best effort and never block the request.
  const [user] = await tx.select().from(tmdUsersTable).where(eq(tmdUsersTable.id, input.userId));
  if (user && user.emailVerifiedAt && user.notificationPrefs?.email !== false) {
    const href = input.link ? `${tmdPublicUrl()}${input.link}` : undefined;
    sendPlainEmail(user.email, input.title, input.title, `<p>${(input.body ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</p>`, href ? { href, label: "Open on Testmedaddy" } : undefined).catch(() => undefined);
  }
  if (user?.telegramChatId) notifyUserTelegram(user, input.title, input.body, input.link).catch(() => undefined);
  return rows[0].id;
}

export async function systemMessage(tx: Executor, poolId: string, body: string) {
  const [message] = await tx.insert(tmdMessagesTable).values({ id: randomUUID(), poolId, userId: null, authorName: "Testmedaddy", kind: "system", body }).returning();
  const [pool] = await tx.select({ id: tmdPoolsTable.id, slug: tmdPoolsTable.slug, telegramChatId: tmdPoolsTable.telegramChatId }).from(tmdPoolsTable).where(eq(tmdPoolsTable.id, poolId));
  if (pool?.telegramChatId) await mirrorMessageToGroup(tx, pool, message).catch(() => null);
  return message;
}

/* ---- Totals -------------------------------------------------------------------- */
export async function poolTotals(tx: Executor, poolId: string) {
  const [row] = await tx.select({
    verified: sql<string>`coalesce(sum(case when ${tmdPoolMembersTable.paymentStatus} = 'verified' then ${tmdPoolMembersTable.amountUsd} else 0 end), 0)`,
    submitted: sql<string>`coalesce(sum(case when ${tmdPoolMembersTable.paymentStatus} = 'submitted' then ${tmdPoolMembersTable.amountUsd} else 0 end), 0)`,
    members: sql<number>`count(*) filter (where ${tmdPoolMembersTable.paymentStatus} in ('pending','submitted','verified'))`,
    verifiedMembers: sql<number>`count(*) filter (where ${tmdPoolMembersTable.paymentStatus} = 'verified')`,
  }).from(tmdPoolMembersTable).where(eq(tmdPoolMembersTable.poolId, poolId));
  return { verifiedUsd: Number(row?.verified ?? 0), submittedUsd: Number(row?.submitted ?? 0), memberCount: Number(row?.members ?? 0), verifiedMemberCount: Number(row?.verifiedMembers ?? 0) };
}

export async function recomputeTarget(tx: Executor, pool: TmdPool): Promise<TmdPool> {
  const items = await tx.select().from(tmdPoolItemsTable).where(eq(tmdPoolItemsTable.poolId, pool.id));
  const breakdown = poolBreakdown(items, pool);
  const [updated] = await tx.update(tmdPoolsTable).set({ targetUsd: breakdown.target.toFixed(2), updatedAt: new Date() }).where(eq(tmdPoolsTable.id, pool.id)).returning();
  return updated ?? pool;
}

/** Moves an open pool to funded once verified money covers the target. Idempotent. */
export async function refreshFunding(tx: Executor, poolId: string): Promise<{ pool: TmdPool; progress: ReturnType<typeof fundingProgress>; justFunded: boolean }> {
  const [pool] = await tx.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.id, poolId)).for("update");
  if (!pool) throw new TmdError("Pool not found.", 404);
  const totals = await poolTotals(tx, poolId);
  const progress = fundingProgress(pool.targetUsd, totals.verifiedUsd);
  if (pool.status === "open" && progress.funded && totals.verifiedMemberCount >= 1) {
    const [updated] = await tx.update(tmdPoolsTable).set({ status: "funded", fundedAt: new Date(), updatedAt: new Date() }).where(eq(tmdPoolsTable.id, poolId)).returning();
    await systemMessage(tx, poolId, "The pool is fully funded. The organiser can now send the samples to the lab.");
    await pushTmdNotification(tx, { userId: pool.organiserId, kind: "pool_funded", title: `"${pool.title}" is fully funded`, body: "Verified payments now cover the target. Time to ship the samples to the lab.", link: `/p/${pool.slug}`, dedupeKey: `funded:${pool.id}` });
    return { pool: updated, progress, justFunded: true };
  }
  return { pool, progress, justFunded: false };
}

/* ---- Verification ------------------------------------------------------------- */
export async function markMemberPayment(tx: Executor, member: TmdPoolMember, status: "verified" | "rejected" | "refunded" | "pending", by: string | null, note?: string | null) {
  const changes: Partial<TmdPoolMember> = { paymentStatus: status, updatedAt: new Date() };
  if (status === "verified") { changes.verifiedAt = new Date(); changes.verifiedBy = by; }
  if (note !== undefined) changes.note = note;
  const [updated] = await tx.update(tmdPoolMembersTable).set(changes).where(eq(tmdPoolMembersTable.id, member.id)).returning();
  const [pool] = await tx.select().from(tmdPoolsTable).where(eq(tmdPoolsTable.id, member.poolId));
  if (updated.userId && pool) {
    const titles: Record<string, string> = { verified: "Payment confirmed", rejected: "Payment could not be confirmed", refunded: "Payment refunded", pending: "Payment reset" };
    await pushTmdNotification(tx, { userId: updated.userId, kind: `payment_${status}`, title: `${titles[status]} for "${pool.title}"`, body: note ?? null, link: `/p/${pool.slug}`, dedupeKey: `payment:${updated.id}:${status}:${Date.now()}` });
  }
  if (status === "verified" || status === "refunded" || status === "rejected") await refreshFunding(tx, member.poolId);
  return updated;
}

/** Members (pending, submitted or verified) of several pools, for "my contributions". */
export async function membershipsForUser(tx: Executor, userId: string) {
  return tx.select({ member: tmdPoolMembersTable, pool: tmdPoolsTable }).from(tmdPoolMembersTable)
    .innerJoin(tmdPoolsTable, eq(tmdPoolsTable.id, tmdPoolMembersTable.poolId))
    .where(and(eq(tmdPoolMembersTable.userId, userId), inArray(tmdPoolMembersTable.paymentStatus, ["pending", "submitted", "verified", "rejected", "refunded"])))
    .orderBy(sql`${tmdPoolMembersTable.joinedAt} desc`);
}

export { db };

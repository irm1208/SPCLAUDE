import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { db, accountGroupBuysTable, groupBuysTable, ordersTable, siteConfigTable } from "@workspace/db";
import {
  canonicalUsername, defaultGroupProgress, GroupUpdateError, GROUP_PROGRESS_STAGES,
  groupUpdateDto, parseGroupUpdate, parseProgressInput, progressKey, readGroupUpdate, readProgress, updatePrefix,
  type GroupUpdate, type UpdateActor,
} from "./group-buy-updates-model";
import {
  deleteWholesaleUpdateImage, downloadWholesaleUpdateImage, storePageUpdateImage,
} from "./wholesale-update-images";
import { queueGroupBuyUpdateNotification } from "./group-buy-update-notifications";
import { groupBuyMoqSnapshots } from "./group-buy-moq";
import { moqKey, parseMoqInput, readMoqSettings } from "./group-buy-moq-model";

type DataAccess = Pick<typeof db, "select" | "insert" | "update" | "delete" | "execute">;
type Scope = "member" | "organiser" | "admin";
const same = (a: string, b: string) => canonicalUsername(a) === canonicalUsername(b);

export async function groupUpdatesAccess(database: DataAccess, id: string, actor: UpdateActor, manage: boolean, lock = false) {
  const query = database.select().from(groupBuysTable).where(eq(groupBuysTable.id, id));
  const [group] = await (lock ? query.for("update") : query);
  if (!group) throw new GroupUpdateError("Group buy not found.", 404);
  if (actor.adminGbId && actor.adminGbId !== id) throw new GroupUpdateError("This session is scoped to a different group buy.", 403);
  const owner = same(group.organiserId ?? "", actor.username);
  if (manage) {
    if (!actor.admin && !owner) throw new GroupUpdateError("You do not manage this group buy.", 403);
    return group;
  }
  if ((group.blockedAccounts ?? []).some(name => same(name, actor.username))) {
    throw new GroupUpdateError("You do not have access to this group buy.", 403);
  }
  if (owner) return group;
  const [member] = await database.select({ id: accountGroupBuysTable.id }).from(accountGroupBuysTable)
    .where(and(eq(accountGroupBuysTable.groupBuyId, id),
      sql`lower(regexp_replace(${accountGroupBuysTable.accountId}, '^@', '')) = ${canonicalUsername(actor.username)}`)).limit(1);
  if (member) return group;
  const [order] = await database.select({ id: ordersTable.id }).from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt),
      sql`lower(regexp_replace(${ordersTable.telegramUsername}, '^@', '')) = ${canonicalUsername(actor.username)}`)).limit(1);
  if (!order) throw new GroupUpdateError("Join this group buy to view its progress and updates.", 403);
  return group;
}

const likePrefix = (prefix: string) => `${prefix.replace(/[\\%_]/g, char => `\\${char}`)}%`;
async function storedProgress(database: DataAccess, id: string) {
  const [row] = await database.select().from(siteConfigTable).where(eq(siteConfigTable.key, progressKey(id))).limit(1);
  return row ? readProgress(row.value) : null;
}
async function findUpdate(database: DataAccess, groupId: string, id: string) {
  const [row] = await database.select().from(siteConfigTable)
    .where(eq(siteConfigTable.key, `${updatePrefix(groupId)}${id}`)).limit(1);
  if (!row) throw new GroupUpdateError("Group-buy update not found.", 404);
  const record = readGroupUpdate(row.value);
  if (record.groupBuyId !== groupId || record.id !== id) throw new Error("Group-buy update identity mismatch.");
  return { row, record };
}
export async function groupBuyUpdates(id: string, actor: UpdateActor, scope: Scope, database = db) {
  const group = await groupUpdatesAccess(database, id, actor, scope !== "member");
  const [progress, rows, moqs] = await Promise.all([
    storedProgress(database, id),
    database.select().from(siteConfigTable).where(like(siteConfigTable.key, likePrefix(updatePrefix(id)))),
    groupBuyMoqSnapshots(database, [id], scope !== "member"),
  ]);
  const updates = rows.map(row => readGroupUpdate(row.value))
    .filter(record => record.groupBuyId === id && (scope !== "member" || record.published))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(record => groupUpdateDto(record, scope));
  return {
    groupBuy: { id: group.id, name: group.name },
    stage: progress?.stage ?? defaultGroupProgress(group), stageUpdatedAt: progress?.updatedAt ?? null, updates,
    moq: moqs.get(id) ?? null,
  };
}

export async function groupBuyProgressSummaries(username: string, database = db) {
  const account = canonicalUsername(username);
  const result = await database.execute<{
    id: string; status: string; closeDate: Date | string | null; blockedAccounts: string[] | null;
  }>(sql`
    SELECT g.id, g.status, g.close_date AS "closeDate", g.blocked_accounts AS "blockedAccounts"
    FROM group_buys g
    WHERE lower(regexp_replace(COALESCE(g.organiser_id, ''), '^@', '')) = ${account}
      OR EXISTS (
        SELECT 1 FROM account_group_buys m WHERE m.group_buy_id = g.id
          AND lower(regexp_replace(m.account_id, '^@', '')) = ${account}
      )
      OR EXISTS (
        SELECT 1 FROM orders o WHERE o.group_buy_id = g.id AND o.deleted_at IS NULL
          AND lower(regexp_replace(o.telegram_username, '^@', '')) = ${account}
      )
  `);
  const groups = result.rows.filter(group => !(group.blockedAccounts ?? []).some(name => same(name, username)));
  if (!groups.length) return { progress: {} };
  const rows = await database.select().from(siteConfigTable)
    .where(inArray(siteConfigTable.key, groups.map(group => progressKey(group.id))));
  const progress = new Map(rows.map(row => [row.key, readProgress(row.value)]));
  const moqs = await groupBuyMoqSnapshots(database, groups.map(group => group.id), false);
  return {
    progress: Object.fromEntries(groups.map(group => {
      const saved = progress.get(progressKey(group.id));
      return [group.id, {
        stage: saved?.stage ?? defaultGroupProgress(group), stageUpdatedAt: saved?.updatedAt ?? null,
        moq: moqs.get(group.id) ?? null,
      }];
    })),
  };
}

export async function setGroupBuyMoq(
  id: string, actor: UpdateActor, scope: "admin" | "organiser",
  body: Record<string, unknown>, database = db,
) {
  const input = parseMoqInput(body);
  await database.transaction(async tx => {
    await groupUpdatesAccess(tx, id, actor, true, true);
    const [row] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, moqKey(id))).limit(1);
    const previous = row ? readMoqSettings(row.value) : null;
    if ((previous?.updatedAt ?? null) !== input.expectedUpdatedAt) {
      throw new GroupUpdateError("MOQ changed in another session. Refresh and review it before saving.", 409);
    }
    const updatedAt = new Date(Math.max(Date.now(), previous?.updatedAt ? Date.parse(previous.updatedAt) + 1 : 0)).toISOString();
    const value = JSON.stringify({
      enabled: input.enabled, targetKits: input.targetKits, showToMembers: input.showToMembers, updatedAt,
    });
    await tx.insert(siteConfigTable).values({ key: moqKey(id), value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
  });
  return groupBuyUpdates(id, actor, scope, database);
}

export async function setGroupBuyProgress(id: string, actor: UpdateActor, scope: "admin" | "organiser", body: Record<string, unknown>, database = db) {
  const input = parseProgressInput(body);
  await database.transaction(async tx => {
    // This row lock serializes status changes and preserves a single current stage.
    // Nothing is written to the group-buy/order/payment tables.
    const group = await groupUpdatesAccess(tx, id, actor, true, true);
    const previous = await storedProgress(tx, id);
    if ((previous?.updatedAt ?? null) !== input.expectedUpdatedAt) {
      throw new GroupUpdateError("The group-buy progress changed in another session. Refresh and review it before saving.", 409);
    }
    if ((previous?.stage ?? defaultGroupProgress(group)) === input.stage) return;
    const now = new Date(Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0)).toISOString();
    const value = JSON.stringify({ stage: input.stage, updatedAt: now });
    await tx.insert(siteConfigTable).values({ key: progressKey(id), value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
    const event: GroupUpdate = {
      id: randomUUID(), groupBuyId: id, kind: "status", stage: input.stage,
      title: "Progress update",
      note: `Status updated to ${GROUP_PROGRESS_STAGES.find(stage => stage.id === input.stage)!.label}.`,
      published: true, imageKey: null, createdAt: now, updatedAt: now,
      telegramAlertQueued: input.sendTelegramAlert,
    };
    await tx.insert(siteConfigTable).values({ key: `${updatePrefix(id)}${event.id}`, value: JSON.stringify(event) });
    if (input.sendTelegramAlert) await queueGroupBuyUpdateNotification(tx, group, event);
  });
  return groupBuyUpdates(id, actor, scope, database);
}

async function cleanupImage(key: string | null) {
  if (!key) return;
  try { await deleteWholesaleUpdateImage(key); }
  catch (error) { console.error("[group-buy-updates] Unused image cleanup failed", error); }
}

export async function saveGroupBuyUpdate(
  groupId: string, updateId: string | null, actor: UpdateActor, scope: "admin" | "organiser",
  body: Record<string, unknown>, image: Buffer | undefined, database = db,
) {
  const input = parseGroupUpdate(body);
  await groupUpdatesAccess(database, groupId, actor, true);
  const uploadedKey = image ? await storePageUpdateImage(image, "group-buy-updates") : null;
  let oldImage: string | null = null;
  let record: GroupUpdate;
  try {
    record = await database.transaction(async tx => {
      const group = await groupUpdatesAccess(tx, groupId, actor, true, true);
      const existing = updateId ? await findUpdate(tx, groupId, updateId) : null;
      oldImage = existing?.record.imageKey ?? null;
      const id = updateId ?? randomUUID();
      const now = new Date().toISOString();
      const updated: GroupUpdate = {
        ...(existing?.record ?? { kind: "note", createdAt: now }),
        id, groupBuyId: groupId, title: input.title, note: input.note, published: input.published,
        imageKey: uploadedKey ?? (input.removeImage ? null : oldImage), updatedAt: now,
      };
      const shouldAlert = updated.published && input.sendTelegramAlert && !updated.telegramAlertQueued;
      if (shouldAlert) updated.telegramAlertQueued = true;
      if (existing) {
        await tx.update(siteConfigTable).set({ value: JSON.stringify(updated) }).where(eq(siteConfigTable.key, existing.row.key));
      } else {
        await tx.insert(siteConfigTable).values({ key: `${updatePrefix(groupId)}${id}`, value: JSON.stringify(updated) });
      }
      if (shouldAlert) {
        await queueGroupBuyUpdateNotification(tx, group, updated);
      }
      return updated;
    });
  } catch (error) { await cleanupImage(uploadedKey); throw error; }
  if (oldImage !== record.imageKey) await cleanupImage(oldImage);
  return { update: groupUpdateDto(record, scope) };
}

export async function deleteGroupBuyUpdate(groupId: string, updateId: string, actor: UpdateActor, database = db) {
  const image = await database.transaction(async tx => {
    await groupUpdatesAccess(tx, groupId, actor, true, true);
    const found = await findUpdate(tx, groupId, updateId);
    await tx.delete(siteConfigTable).where(eq(siteConfigTable.key, found.row.key));
    return found.record.imageKey;
  });
  await cleanupImage(image);
  return { ok: true };
}

export async function groupBuyUpdateImage(groupId: string, updateId: string, actor: UpdateActor, scope: Scope, database = db) {
  await groupUpdatesAccess(database, groupId, actor, scope !== "member");
  const found = await findUpdate(database, groupId, updateId);
  if (!found.record.imageKey || (scope === "member" && !found.record.published)) {
    throw new GroupUpdateError("Group-buy update image not found.", 404);
  }
  return downloadWholesaleUpdateImage(found.record.imageKey);
}

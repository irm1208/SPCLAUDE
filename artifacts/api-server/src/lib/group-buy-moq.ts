import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, ordersTable, orderLineItemsTable, siteConfigTable } from "@workspace/db";
import { defaultMoqSettings, moqKey, moqSnapshot, readMoqSettings } from "./group-buy-moq-model";

type DataAccess = Pick<typeof db, "select">;

/** One aggregate across all requested groups; no per-member or paid-only restriction. */
export function moqOrderConditions(ids: string[]) {
  return and(
    inArray(ordersTable.groupBuyId, ids),
    isNull(ordersTable.deletedAt),
    sql`lower(trim(${ordersTable.status})) NOT IN ('cancelled', 'canceled', 'draft')`,
    sql`lower(trim(${ordersTable.paymentStatus})) <> 'refunded'`,
    eq(orderLineItemsTable.isOos, false),
  );
}

export async function groupBuyMoqSnapshots(database: DataAccess, ids: string[], manage: boolean) {
  if (!ids.length) return new Map<string, ReturnType<typeof moqSnapshot>>();
  const configs = await database.select({ key: siteConfigTable.key, value: siteConfigTable.value })
    .from(siteConfigTable).where(inArray(siteConfigTable.key, ids.map(moqKey)));
  const settings = new Map(configs.map(row => [row.key, readMoqSettings(row.value)]));
  const countIds = ids.filter(id => {
    const setting = settings.get(moqKey(id));
    return setting?.enabled && (manage || setting.showToMembers);
  });
  const counts = countIds.length ? await database.select({
    groupBuyId: ordersTable.groupBuyId,
    orderedKits: sql<string>`coalesce(sum(${orderLineItemsTable.quantity}), 0)`,
  }).from(ordersTable)
    .innerJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(moqOrderConditions(countIds))
    .groupBy(ordersTable.groupBuyId) : [];
  const totals = new Map(counts.map(row => [row.groupBuyId, Number(row.orderedKits)]));
  return new Map(ids.map(id => [
    id, moqSnapshot(settings.get(moqKey(id)) ?? defaultMoqSettings(), totals.get(id) ?? 0, manage),
  ]));
}

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, ordersTable, orderLineItemsTable, siteConfigTable, groupBuyProductsTable, productsTable } from "@workspace/db";
import { defaultMoqSettings, moqKey, moqSnapshot, readMoqSettings } from "./group-buy-moq-model";

type DataAccess = Pick<typeof db, "select">;

/** Both figures share the same active-order exclusions; paid is a strict subset. */
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
    productId: orderLineItemsTable.productId,
    name: sql<string>`min(${orderLineItemsTable.productName})`,
    orderedKits: sql<string>`coalesce(sum(${orderLineItemsTable.quantity}), 0)`,
    paidKits: sql<string>`coalesce(sum(CASE WHEN lower(trim(${ordersTable.paymentStatus})) = 'confirmed'
      AND coalesce(${ordersTable.amountDue}, 0)::numeric <= 0 THEN ${orderLineItemsTable.quantity} ELSE 0 END), 0)`,
  }).from(ordersTable)
    .innerJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(moqOrderConditions(countIds))
    .groupBy(ordersTable.groupBuyId, orderLineItemsTable.productId) : [];
  const catalogue = (manage || countIds.length) ? await database.select({
    groupBuyId: groupBuyProductsTable.groupBuyId,
    productId: groupBuyProductsTable.productId,
    name: productsTable.name,
    mgSize: productsTable.mgSize,
  }).from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(inArray(groupBuyProductsTable.groupBuyId, manage ? ids : countIds)) : [];
  return new Map(ids.map(id => [
    id, (() => {
      const rows = counts.filter(row => row.groupBuyId === id);
      const products = new Map(rows.map(row => [row.productId, {
        productId: row.productId, name: row.name,
        orderedKits: Number(row.orderedKits), paidKits: Number(row.paidKits),
      }]));
      for (const product of catalogue.filter(row => row.groupBuyId === id)) {
        products.set(product.productId, {
          productId: product.productId,
          name: product.mgSize && !product.name.toLowerCase().includes(product.mgSize.toLowerCase())
            ? `${product.name} ${product.mgSize}` : product.name,
          orderedKits: products.get(product.productId)?.orderedKits ?? 0,
          paidKits: products.get(product.productId)?.paidKits ?? 0,
        });
      }
      return moqSnapshot(settings.get(moqKey(id)) ?? defaultMoqSettings(),
        rows.reduce((sum, row) => sum + Number(row.orderedKits), 0), manage,
        rows.reduce((sum, row) => sum + Number(row.paidKits), 0),
        [...products.values()].sort((a, b) => a.name.localeCompare(b.name)));
    })(),
  ]));
}

import { db, ordersTable } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";

const person = (column: SQL) => sql`lower(ltrim(btrim(${column}), '@'))`;
const owner = person(sql`${ordersTable.telegramUsername}`);
const siblingOwner = person(sql`sibling.telegram_username`);
const eligible = sql`${ordersTable.groupBuyId} IS NOT NULL AND ${owner} <> ''
  AND ${ordersTable.deletedAt} IS NULL AND ${ordersTable.status} NOT IN ('Cancelled', 'Draft')
  AND NULLIF(${ordersTable.additionOfOrderId}, '') IS NULL`;
const siblingEligible = sql`sibling.group_buy_id IS NOT NULL AND ${siblingOwner} <> ''
  AND sibling.deleted_at IS NULL AND sibling.status NOT IN ('Cancelled', 'Draft')
  AND NULLIF(sibling.addition_of_order_id, '') IS NULL`;

export function gbOrderPersonKey(groupId: string, username: string): string {
  return JSON.stringify([groupId, username.trim().replace(/^@+/, "").toLowerCase()]);
}

/** Grouped subquery runs once, not once per order; filtering happens before pagination. */
export function multipleGbOrdersWhere(): SQL {
  return sql`${eligible} AND (${ordersTable.groupBuyId}, ${owner}) IN (
    SELECT sibling.group_buy_id, ${siblingOwner} FROM orders AS sibling
    WHERE ${siblingEligible}
    GROUP BY sibling.group_buy_id, ${siblingOwner} HAVING count(*) > 1
  )`;
}

export async function getGbOrderCounts(groupIds: readonly string[]): Promise<Map<string, number>> {
  if (!groupIds.length) return new Map();
  const result = await db.execute(sql`
    SELECT sibling.group_buy_id AS gb, ${siblingOwner} AS person, count(*) AS total
    FROM orders AS sibling WHERE ${siblingEligible}
      AND sibling.group_buy_id IN (${sql.join([...new Set(groupIds)].map(id => sql`${id}`), sql`, `)})
    GROUP BY sibling.group_buy_id, ${siblingOwner}
  `);
  return new Map(result.rows.map(row => [
    gbOrderPersonKey(String(row.gb), String(row.person)), Number(row.total),
  ]));
}

export async function countMultipleGbOrderPeople(where?: SQL): Promise<number> {
  const result = await db.execute(sql`SELECT count(*) AS total FROM (
    SELECT ${ordersTable.groupBuyId}, ${owner} FROM ${ordersTable}
    WHERE ${where ?? sql`TRUE`} AND ${multipleGbOrdersWhere()}
    GROUP BY ${ordersTable.groupBuyId}, ${owner}
  ) AS people`);
  return Number(result.rows[0]?.total ?? 0);
}

import { db, ordersTable, groupBuysTable, gbCountryLegsTable, accountsTable } from "@workspace/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { assignedPostageCountries } from "./reshipper-postage-scope";
import { COUNTRY_CODE_TO_NAME } from "./country-utils";
import { refundMutableOrderWhere, withRefundMutationGuard } from "./refund-mutation-guard";

type Assignment = { reshipperUsername: string; country?: string | null; countries?: string[] | null };
type Postage = { id: string; reshipperUsername?: string | null };
const usernameKey = (value: string) => value.trim().replace(/^@/, "").toLowerCase();

export function reshipperOwnedWhere(gbId: string, username: string) {
  return and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt),
    sql`lower(ltrim(btrim(${ordersTable.reshipperUsername}), '@')) = ${usernameKey(username)}`,
    sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`);
}

export function reshipperClaimWhere(gbId: string, assignment: Assignment, options: Postage[]) {
  const values = new Set<string>();
  for (const code of assignedPostageCountries([assignment])) {
    values.add(code.toLowerCase());
    const name = COUNTRY_CODE_TO_NAME[code];
    if (name) { values.add(name.toLowerCase()); values.add(`${name} (${code})`.toLowerCase()); }
    if (code === "GB") values.add("uk");
  }
  const reservedElsewhere = options.filter(option => option.reshipperUsername &&
    usernameKey(option.reshipperUsername) !== usernameKey(assignment.reshipperUsername)).map(option => option.id);
  // Prefer the order's destination snapshot; fall back only for legacy orders.
  // No configured country leg is required to participate in the claim pool.
  const destination = sql`lower(btrim(coalesce(
    nullif(btrim(${ordersTable.shippingCountry}), ''),
    (SELECT nullif(btrim(${gbCountryLegsTable.countryCode}), '') FROM ${gbCountryLegsTable}
      WHERE ${gbCountryLegsTable.id} = ${ordersTable.countryLegId}
      AND ${gbCountryLegsTable.gbId} = ${ordersTable.groupBuyId} LIMIT 1),
    (SELECT nullif(btrim(${accountsTable.country}), '') FROM ${accountsTable}
      WHERE lower(ltrim(btrim(${accountsTable.telegramUsername}), '@')) =
        lower(ltrim(btrim(${ordersTable.telegramUsername}), '@')) LIMIT 1)
  )))`;
  return and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.reshipperUsername), isNull(ordersTable.deletedAt),
    sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`,
    sql`(${ordersTable.routingType} IS DISTINCT FROM ${"direct"})`,
    sql`${ordersTable.status} NOT IN (${"Cancelled"}, ${"Shipped"}, ${"Delivered"})`,
    values.size ? sql`${destination} IN (${sql.join([...values].map(value => sql`${value}`), sql`, `)})` : sql`FALSE`,
    reservedElsewhere.length ? sql`coalesce(${ordersTable.deliveryMethodId}, '') NOT IN (${sql.join(reservedElsewhere.map(id => sql`${id}`), sql`, `)})` : undefined)!;
}

export async function loadClaimPostage(gbId: string): Promise<Postage[]> {
  const [group] = await db.select({ shippingOptions: groupBuysTable.shippingOptions }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (!group) throw new Error("Group buy not found.");
  const options = group.shippingOptions ? JSON.parse(group.shippingOptions) : [];
  if (!Array.isArray(options)) throw new Error("Invalid postage settings. Contact Admin.");
  return options;
}

export async function claimReshipperOrders(gbId: string, assignment: Assignment, orderIds: string[], options: Postage[]) {
  const ids = [...new Set(orderIds)];
  // PostgreSQL rechecks the unassigned condition after concurrent row-lock waits.
  // RETURNING, rather than a preceding read, determines who actually won.
  return await withRefundMutationGuard(db, ids, async tx => tx.update(ordersTable)
    .set({ reshipperUsername: assignment.reshipperUsername, routingType: "reshipper" })
    .where(refundMutableOrderWhere(and(inArray(ordersTable.id, ids), reshipperClaimWhere(gbId, assignment, options))))
    .returning({ id: ordersTable.id, code: ordersTable.code })) as { id: string; code: string | null }[];
}

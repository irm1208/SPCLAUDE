/**
 * Group buy country-legs auto-sync — every 2 hours, loops through all active
 * group buys that have country legs enabled and backfills any members/orders
 * that don't yet have a countryLegId, matching by the member's account country.
 *
 * Registered with the scheduler registry so the interval and enabled state are
 * editable from the admin panel (Schedulers tab).
 */
import { db, groupBuysTable, gbCountryLegsTable, accountGroupBuysTable, accountsTable, ordersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { registerScheduler } from "./scheduler-registry";

const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Tolerant country matcher: full name, ISO code, "Name (CODE)", etc. */
function findLegId(
  accountCountry: string,
  legs: { id: string; countryCode: string; countryName: string }[],
): string | undefined {
  const c = accountCountry.toLowerCase().trim();
  return legs.find(l => {
    const code = l.countryCode.toLowerCase();
    const name = l.countryName.toLowerCase();
    return (
      c === name ||
      c === code ||
      c === `${name} (${code})` ||
      c === `${code} ${name}` ||
      c.includes(`(${code})`) ||
      c.startsWith(`${code} `)
    );
  })?.id;
}

async function runGbLegsSync(): Promise<void> {
  // Only process active GBs with country legs enabled
  const activeGbs = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.status, "active"), eq(groupBuysTable.countryLegsEnabled, true)));

  if (activeGbs.length === 0) return;

  let totalMembers = 0;
  let totalOrders = 0;

  for (const gb of activeGbs) {
    const legs = await db
      .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, countryName: gbCountryLegsTable.countryName })
      .from(gbCountryLegsTable)
      .where(eq(gbCountryLegsTable.gbId, gb.id));

    if (legs.length === 0) continue;

    // Find members without a leg assignment yet
    const unassigned = await db
      .select({
        accountId: accountGroupBuysTable.accountId,
        country: accountsTable.country,
      })
      .from(accountGroupBuysTable)
      .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
      .where(and(
        eq(accountGroupBuysTable.groupBuyId, gb.id),
        sql`${accountGroupBuysTable.countryLegId} is null`,
      ));

    for (const row of unassigned) {
      if (!row.country) continue;
      const legId = findLegId(row.country, legs);
      if (!legId) continue;

      await db
        .update(accountGroupBuysTable)
        .set({ countryLegId: legId })
        .where(and(
          eq(accountGroupBuysTable.groupBuyId, gb.id),
          eq(accountGroupBuysTable.accountId, row.accountId),
        ));
      totalMembers++;

      const updated = await db
        .update(ordersTable)
        .set({ countryLegId: legId })
        .where(and(
          eq(ordersTable.groupBuyId, gb.id),
          eq(ordersTable.telegramUsername, row.accountId),
          sql`${ordersTable.countryLegId} is null`,
        ))
        .returning({ id: ordersTable.id });
      totalOrders += updated.length;
    }
  }

  if (totalMembers > 0 || totalOrders > 0) {
    console.log(`[gb-legs-sync] Assigned ${totalMembers} member(s) and ${totalOrders} order(s) across ${activeGbs.length} GB(s).`);
  }
}

export function startGbLegsSync(): void {
  registerScheduler({
    name: "gb-legs-sync",
    label: "Group buy legs auto-assign",
    description: "Every 2 hours: auto-assigns unassigned members and orders to country legs in active group buys.",
    defaultIntervalMs: DEFAULT_INTERVAL_MS,
    minIntervalMs: 30 * 60 * 1000,       // 30 minutes minimum
    maxIntervalMs: 24 * 60 * 60 * 1000,  // 24 hours maximum
    initialDelayMs: 60_000,              // wait 60 s after startup before first run
    run: runGbLegsSync,
  });
}

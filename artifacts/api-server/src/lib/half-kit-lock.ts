import { sql } from "drizzle-orm";
/** Always acquire before the existing gb-stock mutex; HTTP legacy writers use a matching session lock. */
export async function lockHalfKitMoney(tx: any, groupId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`half-kit-money:${groupId}`}, 0))`);
}

import { eq } from "drizzle-orm";
import { db, siteConfigTable } from "@workspace/db";
import { coaHash } from "./coa-rules";

/** The shared verifier must not spend a COA transfer on a different feature. */
export async function coaTransactionConflict(hash: string, allowedRequestId?: string, database = db) {
  const [row] = await database.select().from(siteConfigTable)
    .where(eq(siteConfigTable.key, `crypto_payment_tx:${coaHash(hash)}`)).limit(1);
  if (!row) return false;
  const claim = JSON.parse(row.value ?? "{}");
  return claim.kind === "coa" && claim.requestId !== allowedRequestId;
}

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** User-requested correction, once per database. Never rewrite issued requests
 * or overwrite a later deliberate Admin price change on subsequent restarts. */
export async function correctWholesaleAccessFee(database: Pick<typeof db, "execute"> = db) {
  await database.execute(sql`
    WITH first_run AS (
      INSERT INTO site_config (key, value)
      VALUES ('migration:wholesale_access_fee_five_dollars', 'applied')
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    )
    UPDATE site_config SET value = '5', updated_at = now()
    WHERE key = 'wholesale_access_amount' AND value = '50'
      AND EXISTS (SELECT 1 FROM first_run)
  `);
}

import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

describe.skipIf(process.env.WHOLESALE_ACCESS_FEE_DB_TESTS !== "1")("one-time wholesale access fee correction", () => {
  let db: typeof import("@workspace/db").db;
  let correctWholesaleAccessFee: typeof import("./wholesale-access-fee-correction").correctWholesaleAccessFee;
  beforeAll(async () => {
    ({ db } = await import("@workspace/db"));
    ({ correctWholesaleAccessFee } = await import("./wholesale-access-fee-correction"));
  });
  it("changes the configured $50 to $5 once, preserving later Admin changes", async () => {
    await db.transaction(async tx => {
      // Connection-local temporary table: never change real settings or requests.
      await tx.execute(sql`CREATE TEMP TABLE site_config (key text PRIMARY KEY, value text, updated_at timestamptz DEFAULT now()) ON COMMIT DROP`);
      await tx.execute(sql`INSERT INTO site_config (key, value) VALUES ('wholesale_access_amount', '50')`);
      await correctWholesaleAccessFee(tx);
      const first = await tx.execute(sql`SELECT value FROM site_config WHERE key = 'wholesale_access_amount'`);
      expect(first.rows[0].value).toBe("5");
      await tx.execute(sql`UPDATE site_config SET value = '50' WHERE key = 'wholesale_access_amount'`);
      await correctWholesaleAccessFee(tx);
      const later = await tx.execute(sql`SELECT value FROM site_config WHERE key = 'wholesale_access_amount'`);
      expect(later.rows[0].value).toBe("50");
    });
  });
  it("does not overwrite an independently configured price", async () => {
    await db.transaction(async tx => {
      await tx.execute(sql`CREATE TEMP TABLE site_config (key text PRIMARY KEY, value text, updated_at timestamptz DEFAULT now()) ON COMMIT DROP`);
      await tx.execute(sql`INSERT INTO site_config (key, value) VALUES ('wholesale_access_amount', '15')`);
      await correctWholesaleAccessFee(tx);
      const result = await tx.execute(sql`SELECT value FROM site_config WHERE key = 'wholesale_access_amount'`);
      expect(result.rows[0].value).toBe("15");
    });
  });
});

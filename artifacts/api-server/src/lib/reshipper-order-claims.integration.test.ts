import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

describe.skipIf(process.env.RUN_RESHIPPER_CLAIM_DB_TESTS !== "1")("reshipper claim routing — PostgreSQL", () => {
  it("excludes both Direct Shipping representations while preserving legacy and unrouted orders", async () => {
    if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("Development only.");
    const { db } = await import("@workspace/db");
    const { reshipperClaimWhere } = await import("./reshipper-order-claims");
    const where = reshipperClaimWhere("synthetic-group", { country: "US", reshipperUsername: "synthetic-reshipper" }, []);
    // Read-only synthetic CTE shadows orders: no customer records are read or changed.
    const result = await db.execute(sql`
      WITH orders AS (
        SELECT sample.*, 'synthetic-group'::text AS group_buy_id,
          NULL::text AS reshipper_username, NULL::timestamptz AS deleted_at,
          'Processing'::text AS status, 'United States'::text AS shipping_country,
          NULL::text AS country_leg_id, 'synthetic-member'::text AS telegram_username,
          NULL::text AS delivery_method_id
        FROM (VALUES
          ('direct-route', 'direct'::text, false),
          ('direct-request', NULL::text, true),
          ('both-direct', 'direct'::text, true),
          ('legacy', NULL::text, false),
          ('reshipper', 'reshipper'::text, false),
          ('unrouted', 'unrouted'::text, false)
        ) AS sample(id, routing_type, direct_shipping_requested)
      )
      SELECT id FROM orders WHERE ${where} ORDER BY id
    `);
    expect(result.rows.map(row => row.id)).toEqual(["legacy", "reshipper", "unrouted"]);
  });
});

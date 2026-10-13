import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";

// One read-only query for all accessible GBs; no per-card transactions or credit-rate lookups.
export async function halfKitAvailability(
  username: string,
  database: { execute: (query: SQL) => Promise<{ rows: any[] }> } = db,
): Promise<{ counts: Record<string, number> }> {
  const account = username.replace(/^@/, "").toLowerCase();
  const result = await database.execute(sql`
    WITH accessible AS (
      SELECT g.id, g.currency FROM group_buys g
      WHERE g.status IN ('active', 'closed') AND (
        lower(regexp_replace(g.organiser_id, '^@', '')) = ${account}
        OR EXISTS (
          SELECT 1 FROM account_group_buys a WHERE a.group_buy_id = g.id
            AND lower(regexp_replace(a.account_id, '^@', '')) = ${account}
        )
        OR EXISTS (
          SELECT 1 FROM orders o WHERE o.group_buy_id = g.id AND o.deleted_at IS NULL
            AND lower(regexp_replace(o.telegram_username, '^@', '')) = ${account}
        )
      )
    ), sold AS (
      SELECT o.group_buy_id, oli.product_id, SUM(oli.quantity) AS quantity
      FROM orders o JOIN accessible g ON g.id = o.group_buy_id
      JOIN order_line_items oli ON oli.order_id = o.id
      WHERE o.status NOT IN ('Draft', 'Cancelled') AND o.deleted_at IS NULL
      GROUP BY o.group_buy_id, oli.product_id
    )
    SELECT g.id AS "groupId", COUNT(*)::integer AS count
    FROM accessible g
    JOIN gb_half_kit_offers h ON h.group_buy_id = g.id AND h.published = true AND h.currency = g.currency
    JOIN group_buy_products gbp ON gbp.group_buy_id = g.id AND gbp.product_id = h.product_id AND gbp.active = true
    JOIN products p ON p.id = gbp.product_id
    JOIN sold ON sold.group_buy_id = g.id AND sold.product_id = h.product_id
    WHERE sold.quantity > 0 AND mod(round(sold.quantity::numeric, 2), 1) = 0.5
    GROUP BY g.id
  `);
  return { counts: Object.fromEntries(result.rows.map(row => [row.groupId, Number(row.count)])) };
}

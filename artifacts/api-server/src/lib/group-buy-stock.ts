import { sql } from "drizzle-orm";
import type { db } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type StockMode = "set" | "increase" | "decrease";
export class GroupStockError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function stockQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0
    || value > 1_000_000_000 || !Number.isInteger(value * 2)) {
    throw new GroupStockError("Quantity must be a non-negative whole or half-kit number.");
  }
  return value;
}
export function stockAllocation(mode: StockMode, quantity: number, cap: number | null, sold: number): number {
  stockQuantity(quantity);
  if (mode !== "set" && quantity === 0) throw new GroupStockError("Enter a quantity greater than zero.");
  if (mode !== "set" && cap === null) {
    throw new GroupStockError("Unlimited stock cannot be increased or decreased. Use Set available stock.");
  }
  const available = Math.max(0, (cap ?? sold) - sold);
  const next = mode === "set" ? quantity : mode === "increase" ? available + quantity : available - quantity;
  if (next < 0) throw new GroupStockError("Cannot decrease available stock below zero. Use Set available stock to set it to zero.");
  return Number((sold + next).toFixed(2));
}
// A separate stock mutex avoids reversing existing account/order/refund row-lock orders.
export async function lockGroupStock(tx: Tx, groupId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gb-stock:${groupId}`}, 0))`);
}
async function stockRows(tx: Tx, groupId: string, ids: string[] | "all", excludeOrderId = "") {
  const rows = await tx.execute(sql`
    SELECT gbp.product_id AS id, p.name,
      CASE WHEN gbp.stock_override_unlimited THEN NULL
           ELSE COALESCE(gbp.stock_override, p.stock::numeric) END AS stock,
      gbp.stock_override IS NOT NULL AS overridden,
      COALESCE(sold.quantity, 0) AS sold
    FROM group_buy_products gbp JOIN products p ON p.id = gbp.product_id
    LEFT JOIN (
      SELECT oli.product_id, SUM(oli.quantity::numeric) AS quantity
      FROM order_line_items oli JOIN orders o ON o.id = oli.order_id
      WHERE o.group_buy_id = ${groupId} AND o.status NOT IN ('Cancelled', 'Draft')
        AND o.id <> ${excludeOrderId}
      GROUP BY oli.product_id
    ) sold ON sold.product_id = gbp.product_id
    WHERE gbp.group_buy_id = ${groupId}
      AND ${ids === "all" ? sql`TRUE` : sql`gbp.product_id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`}
    ORDER BY gbp.product_id
  `);
  return (rows.rows as Array<{ id: string; name: string; stock: string | null; sold: string; overridden: boolean }>)
    .map(row => ({ ...row, stock: row.stock == null ? null : Number(row.stock), sold: Number(row.sold) }));
}
export function stockSelection(value: unknown): string[] | "all" {
  if (value === "all") return value;
  if (!Array.isArray(value) || !value.length || value.length > 5000
    || value.some(id => typeof id !== "string" || !id.trim() || id.length > 128)) {
    throw new GroupStockError("Select between 1 and 5000 products, or select all.");
  }
  return [...new Set(value as string[])];
}
// Caller authorises and locks this group before entering. All rows are validated before any write.
export async function updateGroupStock(tx: Tx, groupId: string, ids: string[] | "all", mode: StockMode, quantity: number) {
  const rows = await stockRows(tx, groupId, ids);
  if (!rows.length || (ids !== "all" && rows.length !== ids.length)) {
    throw new GroupStockError("One or more selected products are not part of this group buy.");
  }
  const updates = rows.map(row => ({ id: row.id, sold: row.sold,
    stock: stockAllocation(mode, quantity, row.stock, row.sold) }));
  const values = sql.join(updates.map(row => sql`(${row.id}, ${String(row.stock)}::numeric)`), sql`, `);
  const written = await tx.execute(sql`
    UPDATE group_buy_products AS gbp SET stock_override = v.stock, stock_override_unlimited = false
    FROM (VALUES ${values}) AS v(product_id, stock)
    WHERE gbp.group_buy_id = ${groupId} AND gbp.product_id = v.product_id
    RETURNING gbp.product_id
  `);
  if (written.rows.length !== updates.length) throw new GroupStockError("Products changed during the update. Refresh and try again.", 409);
  return updates;
}
export async function setGroupStockCap(tx: Tx, groupId: string, productId: string, value: unknown) {
  const [row] = await stockRows(tx, groupId, [productId]);
  if (!row) throw new GroupStockError("Product is not part of this group buy.", 404);
  const cap = value === null ? null : stockQuantity(typeof value === "string" && value.trim() ? Number(value) : value);
  if (cap === row.stock) return;
  if (cap !== null && cap < row.sold) {
    throw new GroupStockError(`Stock allocation cannot be below ${row.sold} already ordered kits. Use Set available stock instead.`, 409);
  }
  await tx.execute(sql`
    UPDATE group_buy_products SET stock_override = ${cap == null ? null : String(cap)}::numeric,
      stock_override_unlimited = ${cap === null}
    WHERE group_buy_id = ${groupId} AND product_id = ${productId}
  `);
}
export async function assertGroupStock(tx: Tx, groupId: string | null | undefined,
  items: Array<{ productId?: string | null; quantity: number | string }>, excludeOrderId = "") {
  if (!groupId) return;
  await lockGroupStock(tx, groupId);
  const wanted = new Map<string, number>();
  for (const item of items) if (item.productId) {
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + Number(item.quantity));
  }
  if (!wanted.size) return;
  const rows = await stockRows(tx, groupId, [...wanted.keys()], excludeOrderId);
  if (rows.length !== wanted.size) throw new GroupStockError("The product selection has changed. Refresh the product list and try again.", 409);
  for (const row of rows) {
    // Preserve catalogue behaviour for groups that have never set a stock override.
    if (!row.overridden || row.stock === null) continue;
    const available = Math.max(0, row.stock - row.sold);
    if (wanted.get(row.id)! > available) {
      throw new GroupStockError(`Only ${available} kits remain for ${row.name}. Update your order quantity.`, 409);
    }
  }
}

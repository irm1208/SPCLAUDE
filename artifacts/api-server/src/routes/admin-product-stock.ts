import { Router } from "express";
import { asc, inArray, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { requireAdmin, setAdminMutationSummary } from "../middleware/require-admin";

const router = Router();
const MAX_STOCK = 2_147_483_647;
const MAX_PRODUCTS = 2_000;
type StockOperation = "increase" | "decrease" | "set";

class StockError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

router.patch("/admin/products/stock", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { ids: rawIds, operation, quantity } = req.body ?? {};
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > MAX_PRODUCTS
    || rawIds.some((id: unknown) => typeof id !== "string" || id.trim().length === 0)) {
    res.status(400).json({ error: `Select between 1 and ${MAX_PRODUCTS} products with valid IDs` });
    return;
  }
  if (!["increase", "decrease", "set"].includes(operation)) {
    res.status(400).json({ error: "Choose increase, decrease, or set stock" });
    return;
  }
  if (!Number.isInteger(quantity) || quantity < (operation === "set" ? 0 : 1) || quantity > MAX_STOCK) {
    res.status(400).json({ error: operation === "set"
      ? `Stock must be a whole number between 0 and ${MAX_STOCK}`
      : `Adjustment must be a whole number between 1 and ${MAX_STOCK}` });
    return;
  }
  const ids = [...new Set<string>(rawIds.map((id: string) => id.trim()))];
  try {
    const result = await db.transaction(async tx => {
      // Stable lock ordering avoids deadlocks between overlapping bulk selections.
      const rows = await tx.select({ id: productsTable.id, stock: productsTable.stock })
        .from(productsTable).where(inArray(productsTable.id, ids))
        .orderBy(asc(productsTable.id)).for("update");
      if (rows.length !== ids.length) {
        throw new StockError(409, "One or more selected products no longer exist. Refresh the list and select again.");
      }
      const skippedIds: string[] = [];
      const changes: { id: string; stock: number }[] = [];
      for (const row of rows) {
        if (row.stock == null && operation !== "set") {
          skippedIds.push(row.id);
          continue;
        }
        const stock = (operation as StockOperation) === "set" ? quantity
          : operation === "increase" ? row.stock! + quantity : Math.max(0, row.stock! - quantity);
        if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
          throw new StockError(409, "This adjustment would exceed the supported stock range. No products were changed.");
        }
        changes.push({ id: row.id, stock });
      }
      if (!changes.length) return { products: [], skippedIds };
      // One batch write using the stock values read under row locks. Never use
      // the client's preview as the authoritative current quantity.
      const cases = changes.map(change => sql`when ${change.id} then ${change.stock}::integer`);
      const products = await tx.update(productsTable).set({
        stock: sql`case ${productsTable.id} ${sql.join(cases, sql` `)} end`,
        updatedAt: new Date(),
      }).where(inArray(productsTable.id, changes.map(change => change.id)))
        .returning({ id: productsTable.id, stock: productsTable.stock });
      if (products.length !== changes.length) {
        throw new StockError(409, "The stock update was incomplete. No products were changed.");
      }
      return { products, skippedIds };
    });
    setAdminMutationSummary(res, "product_stock", ["stock"], `${operation}:${quantity}:${result.products.length}`);
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof StockError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[admin/products/stock] Bulk stock update failed:", error);
    res.status(500).json({ error: "Could not update stock. No products were changed." });
  }
});

export default router;

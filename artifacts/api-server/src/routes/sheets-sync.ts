import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, postageTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────
// GOOGLE SHEETS SYNC WEBHOOK
//
// This endpoint receives product and postage data from Google Apps Script.
// Set SHEETS_SYNC_SECRET in your environment variables.
// Call this endpoint from your Apps Script to sync data.
//
// Configure SHEETS_SYNC_SECRET in Replit Secrets to protect this endpoint.
// ─────────────────────────────────────────────────────────────

const router: IRouter = Router();

// POST /api/sheets-sync — sync products and postage from Google Sheets
// Body: { secret: string, products?: ProductRow[], postage?: PostageRow[] }
router.post("/sheets-sync", async (req, res): Promise<void> => {
  const { secret, products, postage } = req.body;

  // Validate the sync secret
  const expectedSecret = process.env["SHEETS_SYNC_SECRET"];
  if (!expectedSecret) {
    res.status(503).json({ error: "Sheets sync not configured (SHEETS_SYNC_SECRET not set)" });
    return;
  }

  if (secret !== expectedSecret) {
    res.status(401).json({ error: "Invalid sync secret" });
    return;
  }

  const results: { products?: number; postage?: number } = {};

  // Sync products if provided
  if (Array.isArray(products) && products.length > 0) {
    let synced = 0;
    for (const product of products) {
      if (!product.id || !product.name || product.price == null) continue;

      await db
        .insert(productsTable)
        .values({
          id: String(product.id),
          name: String(product.name),
          price: String(parseFloat(product.price).toFixed(2)),
          active: product.active !== false && product.active !== "FALSE" && product.active !== "0",
          sortOrder: product.sortOrder ? parseInt(product.sortOrder) : null,
        })
        .onConflictDoUpdate({
          target: productsTable.id,
          set: {
            name: String(product.name),
            price: String(parseFloat(product.price).toFixed(2)),
            active: product.active !== false && product.active !== "FALSE" && product.active !== "0",
            sortOrder: product.sortOrder ? parseInt(product.sortOrder) : null,
          },
        });
      synced++;
    }
    results.products = synced;
  }

  // Sync postage if provided
  if (Array.isArray(postage) && postage.length > 0) {
    let synced = 0;
    for (const p of postage) {
      if (!p.id || !p.name || p.price == null) continue;

      await db
        .insert(postageTable)
        .values({
          id: String(p.id),
          name: String(p.name),
          price: String(parseFloat(p.price).toFixed(2)),
          active: p.active !== false && p.active !== "FALSE" && p.active !== "0",
          sortOrder: p.sortOrder ? parseInt(p.sortOrder) : null,
        })
        .onConflictDoUpdate({
          target: postageTable.id,
          set: {
            name: String(p.name),
            price: String(parseFloat(p.price).toFixed(2)),
            active: p.active !== false && p.active !== "FALSE" && p.active !== "0",
            sortOrder: p.sortOrder ? parseInt(p.sortOrder) : null,
          },
        });
      synced++;
    }
    results.postage = synced;
  }

  res.json({ success: true, synced: results });
});

export default router;

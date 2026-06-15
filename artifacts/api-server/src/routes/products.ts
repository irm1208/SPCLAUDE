import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, asc, isNull, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── Auth helper ──────────────────────────────────────────────
function requireAdmin(req: any, res: any): boolean {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env["ADMIN_SECRET"]) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /api/products - returns all active GLOBAL products (sourceGroupBuyId IS NULL)
router.get("/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId)))
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));

  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      active: p.active,
      category: p.category ?? null,
      sortOrder: p.sortOrder,
      vendor: p.vendor ?? null,
      mgSize: p.mgSize ?? null,
      halfKitEnabled: p.halfKitEnabled,
    }))
  );
});

// GET /api/wholesale/products - returns wholesale-enabled active global products
router.get("/wholesale/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(and(
      eq(productsTable.active, true),
      eq(productsTable.wholesaleEnabled, true),
      isNull(productsTable.sourceGroupBuyId),
    ))
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));

  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.wholesalePrice != null ? parseFloat(p.wholesalePrice) : parseFloat(p.price),
      retailPrice: parseFloat(p.price),
      active: p.active,
      category: p.category ?? null,
      sortOrder: p.sortOrder,
      vendor: p.vendor ?? null,
      mgSize: p.mgSize ?? null,
      wholesaleEnabled: p.wholesaleEnabled,
      stock: p.stock ?? null,
      lowStockThreshold: p.lowStockThreshold ?? null,
    }))
  );
});

// GET /api/admin/wholesale-products - list all products with wholesale visibility status
router.get("/admin/wholesale-products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      vendor: productsTable.vendor,
      category: productsTable.category,
      mgSize: productsTable.mgSize,
      active: productsTable.active,
      wholesaleEnabled: productsTable.wholesaleEnabled,
      sortOrder: productsTable.sortOrder,
      price: productsTable.price,
      wholesalePrice: productsTable.wholesalePrice,
    })
    .from(productsTable)
    .where(and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId)))
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));

  res.json(products.map(p => ({
    ...p,
    price: parseFloat(p.price),
    wholesalePrice: p.wholesalePrice != null ? parseFloat(p.wholesalePrice) : null,
  })));
});

// PATCH /api/admin/wholesale-products/bulk - bulk set all products' wholesaleEnabled (must be before /:id)
router.patch("/admin/wholesale-products/bulk", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { wholesaleEnabled } = req.body as { wholesaleEnabled: boolean };
  if (typeof wholesaleEnabled !== "boolean") {
    res.status(400).json({ error: "wholesaleEnabled must be a boolean" });
    return;
  }
  await db
    .update(productsTable)
    .set({ wholesaleEnabled })
    .where(and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId)));
  res.json({ ok: true });
});

// PATCH /api/admin/wholesale-products/:id - toggle wholesaleEnabled and/or set wholesalePrice
router.patch("/admin/wholesale-products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const body = req.body as { wholesaleEnabled?: boolean; wholesalePrice?: number | null };

  const updates: Partial<typeof productsTable.$inferInsert> = {};
  if (typeof body.wholesaleEnabled === "boolean") updates.wholesaleEnabled = body.wholesaleEnabled;
  if ("wholesalePrice" in body) {
    updates.wholesalePrice = body.wholesalePrice != null ? String(body.wholesalePrice) : null;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, id))
    .returning({
      id: productsTable.id,
      wholesaleEnabled: productsTable.wholesaleEnabled,
      wholesalePrice: productsTable.wholesalePrice,
    });
  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...updated,
    wholesalePrice: updated.wholesalePrice != null ? parseFloat(updated.wholesalePrice) : null,
  });
});

// GET /api/admin/half-kit-products - list all products with halfKitEnabled status
router.get("/admin/half-kit-products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      vendor: productsTable.vendor,
      category: productsTable.category,
      mgSize: productsTable.mgSize,
      active: productsTable.active,
      halfKitEnabled: productsTable.halfKitEnabled,
      sortOrder: productsTable.sortOrder,
    })
    .from(productsTable)
    .where(and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId)))
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));

  res.json(products);
});

// PATCH /api/admin/half-kit-products/bulk - bulk set halfKitEnabled on all active products
router.patch("/admin/half-kit-products/bulk", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { halfKitEnabled } = req.body as { halfKitEnabled: boolean };
  if (typeof halfKitEnabled !== "boolean") {
    res.status(400).json({ error: "halfKitEnabled must be a boolean" });
    return;
  }
  await db
    .update(productsTable)
    .set({ halfKitEnabled })
    .where(and(eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId)));
  res.json({ ok: true });
});

// PATCH /api/admin/half-kit-products/:id - toggle halfKitEnabled for a single product
router.patch("/admin/half-kit-products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { halfKitEnabled } = req.body as { halfKitEnabled: boolean };
  if (typeof halfKitEnabled !== "boolean") {
    res.status(400).json({ error: "halfKitEnabled must be a boolean" });
    return;
  }
  const [updated] = await db
    .update(productsTable)
    .set({ halfKitEnabled })
    .where(eq(productsTable.id, id))
    .returning({ id: productsTable.id, halfKitEnabled: productsTable.halfKitEnabled });
  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(updated);
});

// DELETE /api/admin/products/:id — permanently deletes a product
router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id)).returning({ id: productsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ deleted: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to delete product" });
  }
});

export default router;

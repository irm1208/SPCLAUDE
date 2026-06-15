import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { deliveryMethodsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/delivery-methods
// Returns active delivery methods with their prices
// To change prices: update via seed script or Google Sheets sync
router.get("/delivery-methods", async (_req, res): Promise<void> => {
  const methods = await db
    .select()
    .from(deliveryMethodsTable)
    .where(eq(deliveryMethodsTable.active, true))
    .orderBy(asc(deliveryMethodsTable.sortOrder), asc(deliveryMethodsTable.name));

  res.json(
    methods.map((m) => ({
      id: m.id,
      name: m.name,
      price: parseFloat(m.price),
      active: m.active,
      sortOrder: m.sortOrder,
      infoEnabled: m.infoEnabled,
      infoText: m.infoText ?? null,
    }))
  );
});

export default router;

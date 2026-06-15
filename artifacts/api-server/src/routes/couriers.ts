import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { db } from "@workspace/db";
import { customCouriersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// GET /api/admin/couriers
router.get("/admin/couriers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const couriers = await db
      .select()
      .from(customCouriersTable)
      .orderBy(asc(customCouriersTable.createdAt));
    res.json(couriers);
  } catch (e) {
    console.error("[couriers] GET error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/couriers
router.post("/admin/couriers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, trackingUrlTemplate } = req.body as { name?: string; trackingUrlTemplate?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [courier] = await db
      .insert(customCouriersTable)
      .values({
        id: randomUUID(),
        name: name.trim(),
        trackingUrlTemplate: trackingUrlTemplate?.trim() || null,
      })
      .returning();
    res.status(201).json(courier);
  } catch (e) {
    console.error("[couriers] POST error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/couriers/:id
router.patch("/admin/couriers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { name, trackingUrlTemplate } = req.body as { name?: string; trackingUrlTemplate?: string | null };

  const updates: { name?: string; trackingUrlTemplate?: string | null } = {};
  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400).json({ error: "name cannot be empty" });
      return;
    }
    updates.name = name.trim();
  }
  if (trackingUrlTemplate !== undefined) {
    updates.trackingUrlTemplate = trackingUrlTemplate?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  try {
    const [courier] = await db
      .update(customCouriersTable)
      .set(updates)
      .where(eq(customCouriersTable.id, id))
      .returning();
    if (!courier) {
      res.status(404).json({ error: "Courier not found" });
      return;
    }
    res.json(courier);
  } catch (e) {
    console.error("[couriers] PATCH error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/couriers/:id
router.delete("/admin/couriers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const [deleted] = await db
      .delete(customCouriersTable)
      .where(eq(customCouriersTable.id, id))
      .returning({ id: customCouriersTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Courier not found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    console.error("[couriers] DELETE error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

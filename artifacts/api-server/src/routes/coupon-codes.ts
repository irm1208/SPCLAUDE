import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { couponCodesTable, couponRedemptionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { requireAccount } from "../middleware/account-auth";
import { writeLog } from "../lib/audit-log";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// ── GET /admin/coupon-codes — list all coupons ─────────────────
router.get("/admin/coupon-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const coupons = await db
    .select()
    .from(couponCodesTable)
    .orderBy(desc(couponCodesTable.createdAt));

  res.json(coupons.map(c => ({
    ...c,
    discountValue: parseFloat(String(c.discountValue)),
  })));
});

// ── POST /admin/coupon-codes — create a coupon ─────────────────
router.post("/admin/coupon-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { code, description, discountType, discountValue, maxUses, expiresAt } = req.body;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "code is required" });
    return;
  }
  if (!discountType || !["percentage", "fixed"].includes(discountType)) {
    res.status(400).json({ error: "discountType must be 'percentage' or 'fixed'" });
    return;
  }
  const parsedValue = parseFloat(String(discountValue));
  if (isNaN(parsedValue) || parsedValue <= 0) {
    res.status(400).json({ error: "discountValue must be a positive number" });
    return;
  }
  if (discountType === "percentage" && parsedValue > 100) {
    res.status(400).json({ error: "Percentage discount cannot exceed 100" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const [existing] = await db
    .select({ id: couponCodesTable.id })
    .from(couponCodesTable)
    .where(eq(couponCodesTable.code, normalizedCode));

  if (existing) {
    res.status(409).json({ error: "A coupon with this code already exists" });
    return;
  }

  const [created] = await db.insert(couponCodesTable).values({
    id: randomUUID(),
    code: normalizedCode,
    description: description ? String(description).trim() : null,
    discountType,
    discountValue: parsedValue.toFixed(2),
    maxUses: maxUses != null ? parseInt(String(maxUses)) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isActive: true,
  }).returning();

  writeLog("change", "info", "admin_coupon_created",
    `Admin created coupon code "${normalizedCode}" (${discountType}: ${parsedValue})`,
    { couponId: created.id, code: normalizedCode, discountType, discountValue: parsedValue },
  ).catch(() => {});

  res.status(201).json({ ...created, discountValue: parseFloat(String(created.discountValue)) });
});

// ── PATCH /admin/coupon-codes/:id — update a coupon ───────────
router.patch("/admin/coupon-codes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { description, discountType, discountValue, maxUses, expiresAt, isActive } = req.body;

  const [existing] = await db
    .select()
    .from(couponCodesTable)
    .where(eq(couponCodesTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (maxUses !== undefined) updates.maxUses = maxUses != null ? parseInt(String(maxUses)) : null;
  if (discountType !== undefined) {
    if (!["percentage", "fixed"].includes(discountType)) {
      res.status(400).json({ error: "discountType must be 'percentage' or 'fixed'" });
      return;
    }
    updates.discountType = discountType;
  }
  if (discountValue !== undefined) {
    const parsed = parseFloat(String(discountValue));
    if (isNaN(parsed) || parsed <= 0) {
      res.status(400).json({ error: "discountValue must be a positive number" });
      return;
    }
    updates.discountValue = parsed.toFixed(2);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(couponCodesTable)
    .set(updates)
    .where(eq(couponCodesTable.id, id))
    .returning();

  res.json({ ...updated, discountValue: parseFloat(String(updated.discountValue)) });
});

// ── DELETE /admin/coupon-codes/:id — delete a coupon ──────────
router.delete("/admin/coupon-codes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [existing] = await db
    .select({ id: couponCodesTable.id, code: couponCodesTable.code })
    .from(couponCodesTable)
    .where(eq(couponCodesTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  await db.delete(couponCodesTable).where(eq(couponCodesTable.id, id));

  writeLog("change", "info", "admin_coupon_deleted",
    `Admin deleted coupon code "${existing.code}"`,
    { couponId: id, code: existing.code },
  ).catch(() => {});

  res.json({ ok: true });
});

// ── POST /api/coupons/validate — member validates a coupon code ─
// Returns { valid, discountType, discountValue, description } or { valid: false, error }
// Does NOT consume the coupon — consumption happens at order creation.
router.post("/coupons/validate", requireAccount, async (req, res): Promise<void> => {
  const { code, orderTotal } = req.body;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const [coupon] = await db
    .select()
    .from(couponCodesTable)
    .where(eq(couponCodesTable.code, normalizedCode));

  if (!coupon || !coupon.isActive) {
    res.json({ valid: false, error: "Invalid or inactive coupon code" });
    return;
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    res.json({ valid: false, error: "This coupon has expired" });
    return;
  }

  if (coupon.maxUses !== null && coupon.usageCount >= coupon.maxUses) {
    res.json({ valid: false, error: "This coupon has reached its usage limit" });
    return;
  }

  const discountValue = parseFloat(String(coupon.discountValue));
  const total = parseFloat(String(orderTotal ?? 0));

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = parseFloat(((total * discountValue) / 100).toFixed(2));
  } else {
    discountAmount = Math.min(discountValue, total);
  }

  res.json({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue,
    discountAmount,
    description: coupon.description,
  });
});

// ── GET /admin/coupon-codes/:id/redemptions — view usage history
router.get("/admin/coupon-codes/:id/redemptions", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const redemptions = await db
    .select()
    .from(couponRedemptionsTable)
    .where(eq(couponRedemptionsTable.couponId, id))
    .orderBy(desc(couponRedemptionsTable.usedAt));

  res.json(redemptions.map(r => ({
    ...r,
    discountApplied: parseFloat(String(r.discountApplied)),
  })));
});

export default router;

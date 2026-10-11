import { Router, type IRouter, type RequestHandler } from "express";
import { db } from "@workspace/db";
import { couponCodesTable, couponRedemptionsTable, groupBuysTable } from "@workspace/db";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { requireAccount } from "../middleware/account-auth";
import { writeLog } from "../lib/audit-log";
import { randomUUID } from "crypto";
import { requireOrganiser } from "../middleware/require-organiser";
import { calculateCouponDiscount, CouponError, couponProblem, parseGroupCouponInput } from "../lib/group-buy-coupon-policy";
import { couponAccountUses } from "../lib/coupon-redemption";

const router: IRouter = Router();

const formatCoupon = (coupon: typeof couponCodesTable.$inferSelect) => ({
  ...coupon, discountValue: Number(coupon.discountValue), minSubtotal: Number(coupon.minSubtotal),
});

// Both roles use identical CRUD; only the server-established authorisation differs.
for (const role of ["organiser", "admin"] as const) {
  const scoped = Router({ mergeParams: true });
  const auth: RequestHandler = role === "organiser" ? requireOrganiser : (req, res, next) => {
    if (requireAdmin(req, res)) next();
  };
  scoped.use(auth, async (req, res, next) => {
    const id = String(req.params.groupBuyId);
    const [group] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(
      role === "admin" || req.organiser?.isAdmin
        ? eq(groupBuysTable.id, id)
        : and(eq(groupBuysTable.id, id), eq(groupBuysTable.organiserId, req.organiser!.telegramUsername)),
    );
    if (!group) { res.status(404).json({ error: "Group buy not found" }); return; }
    next();
  });
  scoped.get<{ groupBuyId: string }>("/", async (req, res) => {
    const coupons = await db.select().from(couponCodesTable)
      .where(eq(couponCodesTable.groupBuyId, String(req.params.groupBuyId)))
      .orderBy(desc(couponCodesTable.createdAt));
    res.json(coupons.map(formatCoupon));
  });
  scoped.post<{ groupBuyId: string }>("/", async (req, res, next) => {
    try {
      const settings = parseGroupCouponInput(req.body);
      const [created] = await db.insert(couponCodesTable).values({
        ...settings, id: randomUUID(), groupBuyId: String(req.params.groupBuyId),
      }).returning();
      writeLog("change", "info", "group_buy_coupon_created", "Created group-buy coupon", {
        groupBuyId: created.groupBuyId, couponId: created.id, role,
      }).catch(() => {});
      res.status(201).json(formatCoupon(created));
    } catch (error) {
      if (error instanceof CouponError) { res.status(400).json({ error: error.message }); return; }
      const dbError = error as { code?: string; cause?: { code?: string } };
      if ((dbError.cause?.code ?? dbError.code) === "23505") { res.status(409).json({ error: "This coupon code already exists. Choose a unique code." }); return; }
      next(error);
    }
  });
  scoped.patch<{ groupBuyId: string; couponId: string }>("/:couponId", async (req, res, next) => {
    try {
      const updated = await db.transaction(async tx => {
        const predicate = and(eq(couponCodesTable.id, String(req.params.couponId)), eq(couponCodesTable.groupBuyId, String(req.params.groupBuyId)));
        const [existing] = await tx.select().from(couponCodesTable).where(predicate).for("update");
        if (!existing) return null;
        const settings = parseGroupCouponInput({ ...existing, ...req.body, code: existing.code });
        if (req.body?.maxUses !== undefined && settings.maxUses != null && settings.maxUses < existing.usageCount) throw new CouponError("The total limit cannot be lower than the number of uses already redeemed");
        const { code: immutableCode, ...updates } = settings;
        const [row] = await tx.update(couponCodesTable).set(updates).where(predicate).returning();
        return row;
      });
      if (!updated) { res.status(404).json({ error: "Coupon not found" }); return; }
      writeLog("change", "info", "group_buy_coupon_updated", "Updated group-buy coupon", { groupBuyId: updated.groupBuyId, couponId: updated.id, role }).catch(() => {});
      res.json(formatCoupon(updated));
    } catch (error) {
      if (error instanceof CouponError) { res.status(400).json({ error: error.message }); return; }
      next(error);
    }
  });
  scoped.delete<{ groupBuyId: string; couponId: string }>("/:couponId", async (req, res) => {
    const predicate = and(eq(couponCodesTable.id, String(req.params.couponId)), eq(couponCodesTable.groupBuyId, String(req.params.groupBuyId)));
    const [existing] = await db.select({ id: couponCodesTable.id }).from(couponCodesTable).where(predicate);
    if (!existing) { res.status(404).json({ error: "Coupon not found" }); return; }
    const deleted = await db.delete(couponCodesTable).where(and(predicate, eq(couponCodesTable.usageCount, 0))).returning({ id: couponCodesTable.id });
    if (!deleted.length) { res.status(409).json({ error: "Used coupons cannot be deleted. Disable this coupon instead." }); return; }
    writeLog("change", "info", "group_buy_coupon_deleted", "Deleted unused group-buy coupon", { groupBuyId: String(req.params.groupBuyId), couponId: existing.id, role }).catch(() => {});
    res.json({ ok: true });
  });
  router.use(`/${role}/group-buys/:groupBuyId/coupons`, scoped);
}

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

  const deleted = await db.delete(couponCodesTable)
    .where(and(eq(couponCodesTable.id, id), or(isNull(couponCodesTable.groupBuyId), eq(couponCodesTable.usageCount, 0))))
    .returning({ id: couponCodesTable.id });
  if (!deleted.length) {
    res.status(409).json({ error: "Used group-buy coupons cannot be deleted. Disable the coupon instead." });
    return;
  }

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
  const { code, orderTotal, groupBuyId, productSubtotal } = req.body;

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

  const context = {
    groupBuyId: typeof groupBuyId === "string" ? groupBuyId : null,
    productSubtotal: Number(productSubtotal ?? (coupon.groupBuyId ? NaN : orderTotal ?? 0)),
    total: Number(orderTotal ?? 0),
    usesByAccount: coupon.maxUsesPerAccount != null ? await couponAccountUses(db, coupon.id, req.account!.telegramUsername) : 0,
  };
  const problem = couponProblem(coupon, context);
  if (problem) { res.json({ valid: false, error: problem }); return; }
  const discountValue = Number(coupon.discountValue);
  const discountAmount = calculateCouponDiscount(coupon, context);
  let currency: string | null = null;
  if (coupon.groupBuyId) {
    const [group] = await db.select({ currency: groupBuysTable.currency }).from(groupBuysTable)
      .where(eq(groupBuysTable.id, coupon.groupBuyId));
    if (!group) { res.json({ valid: false, error: "This coupon's group buy is no longer available" }); return; }
    currency = group.currency;
  }

  res.json({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue,
    discountAmount,
    currency,
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

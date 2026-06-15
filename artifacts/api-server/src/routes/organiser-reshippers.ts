import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  gbReshippersTable,
  groupBuysTable,
  ordersTable,
} from "@workspace/db";
import { eq, and, isNull, or } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { requireOrganiser } from "../middleware/require-organiser";
import { writeLog } from "../lib/audit-log";
import { notifyUserFromTemplate } from "../lib/telegram";

const router: IRouter = Router();

function shortCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

/**
 * Verify the requesting organiser owns the given GB.
 * Returns the GB row on success, or sends a 403/404 and returns null.
 */
async function requireOwnedGb(
  req: Parameters<typeof requireOrganiser>[0],
  res: Parameters<typeof requireOrganiser>[1],
  gbId: string,
): Promise<{ id: string; organiserId: string | null; reshipperInviteCode: string | null } | null> {
  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId, reshipperInviteCode: groupBuysTable.reshipperInviteCode })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return null;
  }

  // Admin organiser bypass
  if (req.organiser?.isAdmin) return gb;

  const username = req.organiser!.telegramUsername;
  if (gb.organiserId !== username) {
    res.status(403).json({ error: "You do not own this group buy" });
    return null;
  }

  return gb;
}

// ── GET /organiser/group-buys/:gbId/reshippers ─────────────────────────────
router.get("/organiser/group-buys/:gbId/reshippers", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  const rows = await db
    .select()
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.gbId, gbId))
    .orderBy(gbReshippersTable.createdAt);

  res.json(rows);
});

// ── POST /organiser/group-buys/:gbId/reshippers ────────────────────────────
router.post("/organiser/group-buys/:gbId/reshippers", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  const { reshipperUsername, country, enabledPaymentMethods } = req.body as {
    reshipperUsername?: string;
    country?: string;
    enabledPaymentMethods?: Record<string, boolean>;
  };

  if (!reshipperUsername || typeof reshipperUsername !== "string") {
    res.status(400).json({ error: "reshipperUsername is required" });
    return;
  }
  if (!country || typeof country !== "string") {
    res.status(400).json({ error: "country is required" });
    return;
  }

  const [account] = await db
    .select({ reshipperStatus: accountsTable.reshipperStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, reshipperUsername));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  if (account.reshipperStatus !== "approved") {
    res.status(400).json({ error: "Account must be an approved reshipper to be assigned to a GB" });
    return;
  }

  const id = randomUUID();
  let assignment: (typeof gbReshippersTable)["$inferSelect"] | undefined;
  try {
    [assignment] = await db
      .insert(gbReshippersTable)
      .values({
        id,
        gbId,
        reshipperUsername,
        country: country.trim(),
        enabledPaymentMethods: enabledPaymentMethods ?? {},
      })
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "This reshipper is already assigned to this GB or country" });
      return;
    }
    throw err;
  }

  writeLog("change", "info", "reshipper_assigned",
    `Organiser @${req.organiser!.telegramUsername} assigned reshipper @${reshipperUsername} to GB ${gbId} (country: ${country})`,
    { gbId, reshipperUsername, country, assignedBy: req.organiser!.telegramUsername },
  ).catch(() => {});

  res.status(201).json(assignment);
});

// ── PATCH /organiser/group-buys/:gbId/reshippers/:username ─────────────────
router.patch("/organiser/group-buys/:gbId/reshippers/:username", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const username = String(req.params["username"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  const { enabledPaymentMethods, enabled, paymentTarget } = req.body as {
    enabledPaymentMethods?: Record<string, boolean>;
    enabled?: boolean;
    paymentTarget?: string;
  };

  const [assignment] = await db
    .select()
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));

  if (!assignment) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

  const VALID_PAYMENT_TARGETS = ["reshipper", "admin"] as const;
  const updates: Record<string, unknown> = {};

  if (enabledPaymentMethods !== undefined) updates.enabledPaymentMethods = enabledPaymentMethods;
  if (enabled !== undefined && typeof enabled === "boolean") updates.enabled = enabled;
  if (paymentTarget !== undefined) {
    if (!VALID_PAYMENT_TARGETS.includes(paymentTarget as typeof VALID_PAYMENT_TARGETS[number])) {
      res.status(400).json({ error: `paymentTarget must be one of: ${VALID_PAYMENT_TARGETS.join(", ")}` });
      return;
    }
    updates.paymentTarget = paymentTarget;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(gbReshippersTable)
    .set(updates)
    .where(eq(gbReshippersTable.id, assignment.id))
    .returning();

  res.json(updated);
});

// ── DELETE /organiser/group-buys/:gbId/reshippers/:username ────────────────
router.delete("/organiser/group-buys/:gbId/reshippers/:username", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const username = String(req.params["username"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  const [assignment] = await db
    .select({ id: gbReshippersTable.id })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));

  if (!assignment) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

  await db.delete(gbReshippersTable).where(eq(gbReshippersTable.id, assignment.id));

  writeLog("change", "info", "reshipper_unassigned",
    `Organiser @${req.organiser!.telegramUsername} removed reshipper @${username} from GB ${gbId}`,
    { gbId, username, removedBy: req.organiser!.telegramUsername },
  ).catch(() => {});

  res.json({ ok: true });
});

// ── GET /organiser/approved-reshippers ────────────────────────────────────
// Returns all accounts with reshipperStatus = 'approved' for the picker dropdown.
router.get("/organiser/approved-reshippers", requireOrganiser, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      reshipperPaymentMethods: accountsTable.reshipperPaymentMethods,
    })
    .from(accountsTable)
    .where(eq(accountsTable.reshipperStatus, "approved"))
    .orderBy(accountsTable.telegramUsername);

  res.json(rows);
});

// ── PATCH /organiser/group-buys/:gbId/orders/:orderId/reassign-reshipper ──
// Force-assign an order to any approved reshipper currently assigned to this GB.
// No country eligibility check — this is a manual override.
router.patch("/organiser/group-buys/:gbId/orders/:orderId/reassign-reshipper", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  const { reshipperUsername } = req.body as { reshipperUsername: string | null };

  // Verify the order belongs to this GB
  const [order] = await db
    .select({ id: ordersTable.id, reshipperUsername: ordersTable.reshipperUsername, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code, shippingCountry: ordersTable.shippingCountry })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found in this group buy" }); return; }

  if (reshipperUsername === null || reshipperUsername === "") {
    await db.update(ordersTable).set({ reshipperUsername: null }).where(eq(ordersTable.id, orderId));
    writeLog("change", "info", "reshipper_reassigned",
      `Organiser @${req.organiser!.telegramUsername} (manual override) cleared reshipper for order ${orderId} in GB ${gbId}`,
      { orderId, gbId, clearedBy: req.organiser!.telegramUsername, manualOverride: true },
    ).catch(() => {});
    res.json({ ok: true, reshipperUsername: null });
    return;
  }

  // Verify the reshipper is approved
  const [account] = await db
    .select({ reshipperStatus: accountsTable.reshipperStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, reshipperUsername));

  if (!account) { res.status(404).json({ error: "Reshipper account not found" }); return; }
  if (account.reshipperStatus !== "approved") { res.status(400).json({ error: "Account is not an approved reshipper" }); return; }

  // Verify the reshipper is currently assigned to this GB (any country)
  const [gbAssignment] = await db
    .select({ id: gbReshippersTable.id })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, reshipperUsername)));

  if (!gbAssignment) {
    res.status(400).json({ error: "Reshipper is not assigned to this group buy" });
    return;
  }

  await db.update(ordersTable).set({ reshipperUsername }).where(eq(ordersTable.id, orderId));

  writeLog("change", "info", "reshipper_reassigned",
    `Organiser @${req.organiser!.telegramUsername} (manual override) force-assigned reshipper @${reshipperUsername} to order ${orderId} in GB ${gbId}`,
    { orderId, gbId, reshipperUsername, assignedBy: req.organiser!.telegramUsername, manualOverride: true },
  ).catch(() => {});

  notifyUserFromTemplate(reshipperUsername, "status", "reshipper_force_assigned", {
    code: order.code ?? orderId,
    customer_username: order.telegramUsername ?? "",
    shipping_country: order.shippingCountry ?? "",
  }).catch(() => {});

  res.json({ ok: true, reshipperUsername });
});

// ── POST /organiser/group-buys/:gbId/reshipper-invite-code ────────────────
router.post("/organiser/group-buys/:gbId/reshipper-invite-code", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const gb = await requireOwnedGb(req, res, gbId);
  if (!gb) return;

  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = shortCode(8);
    const [existing] = await db
      .select({ id: groupBuysTable.id })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.reshipperInviteCode, candidate));
    if (!existing) { code = candidate; break; }
  }
  if (!code) {
    res.status(500).json({ error: "Failed to generate a unique invite code. Please retry." });
    return;
  }

  await db.update(groupBuysTable).set({ reshipperInviteCode: code }).where(eq(groupBuysTable.id, gbId));

  writeLog("change", "info", "reshipper_invite_code_generated",
    `Organiser @${req.organiser!.telegramUsername} generated reshipper invite code for GB ${gbId}`,
    { gbId, generatedBy: req.organiser!.telegramUsername },
  ).catch(() => {});

  res.json({ ok: true, reshipperInviteCode: code });
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  gbReshippersTable,
  groupBuysTable,
  ordersTable,
  accountGroupBuysTable,
  auditLogsTable,
  customerActivityLogsTable,
  orderNotesTable,
  gbParcelsTable,
} from "@workspace/db";
import { eq, and, isNotNull, desc, inArray, ilike, or, sql, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import { notifyUserFromTemplate } from "../lib/telegram";
import { randomUUID, randomBytes } from "crypto";

const router: IRouter = Router();

function shortCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

// ── GET /admin/reshippers — list all reshipper accounts ──────────────────────
// Optional query params:
//   ?status=approved    — filter by reshipperStatus
//   ?country=UK         — further filter to reshippers who handle that country
//                         (have at least one gbReshippersTable row for that country in any GB)
router.get("/admin/reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { status, country } = req.query;

  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      accountStatus: accountsTable.accountStatus,
      reshipperStatus: accountsTable.reshipperStatus,
      reshipperApprovedAt: accountsTable.reshipperApprovedAt,
      reshipperPaymentMethods: accountsTable.reshipperPaymentMethods,
      reshipperSettings: accountsTable.reshipperSettings,
      createdAt: accountsTable.createdAt,
    })
    .from(accountsTable)
    .where(isNotNull(accountsTable.reshipperStatus))
    .orderBy(desc(accountsTable.createdAt));

  let filtered = status
    ? rows.filter(r => r.reshipperStatus === String(status))
    : rows;

  // If a country filter is provided, restrict to reshippers who have handled that country in any GB
  if (country && typeof country === "string" && country.trim()) {
    const countrySlots = await db
      .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
      .from(gbReshippersTable)
      .where(eq(gbReshippersTable.country, country.trim()));
    const eligibleUsernames = new Set(countrySlots.map(r => r.reshipperUsername));
    filtered = filtered.filter(r => eligibleUsernames.has(r.telegramUsername));
  }

  res.json(filtered);
});

// ── PATCH /admin/reshippers/:username/status — approve/reject/suspend/reinstate ─
router.patch("/admin/reshippers/:username/status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rawUsername = String(req.params["username"]);
  const { status } = req.body as { status: string };

  const VALID_STATUSES = ["approved", "rejected", "suspended"];
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  try {
    // Try both @username and username formats so mismatched @ prefixes never cause silent 404s
    const altUsername = rawUsername.startsWith("@") ? rawUsername.slice(1) : `@${rawUsername}`;
    const [account] = await db
      .select({ reshipperStatus: accountsTable.reshipperStatus, telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, rawUsername), eq(accountsTable.telegramUsername, altUsername)));

    if (!account) { res.status(404).json({ error: "Account not found" }); return; }

    const canonicalUsername = account.telegramUsername;
    const updates: Record<string, unknown> = { reshipperStatus: status };
    if (status === "approved") updates.reshipperApprovedAt = new Date();

    await db.update(accountsTable).set(updates).where(eq(accountsTable.telegramUsername, canonicalUsername));

    writeLog("change", "info", "reshipper_status_changed", `Admin changed reshipper status for @${canonicalUsername}: ${account.reshipperStatus} → ${status}`, { username: canonicalUsername, prevStatus: account.reshipperStatus, newStatus: status }).catch(() => {});

    if (status === "approved" || status === "rejected") {
      const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
      const eventKey = status === "approved" ? "applicant_reshipper_approved" : "applicant_reshipper_rejected";
      notifyUserFromTemplate(canonicalUsername, "role_application", eventKey, {
        username: canonicalUsername.replace(/^@/, ""),
        app_url: appUrl,
      }).catch(() => {});
    }

    res.json({ ok: true, username: canonicalUsername, reshipperStatus: status });
  } catch (err) {
    console.error("[admin/reshippers/:username/status PATCH]", err);
    res.status(500).json({ error: "Failed to update reshipper status" });
  }
});

// ── GET /admin/group-buys/:gbId/reshippers — list reshipper assignments for a GB ─
router.get("/admin/group-buys/:gbId/reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const gbId = String(req.params["gbId"]);

  const rows = await db
    .select()
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.gbId, gbId))
    .orderBy(gbReshippersTable.createdAt);

  res.json(rows);
});

// ── POST /admin/group-buys/:gbId/reshippers — assign a reshipper to GB+country ─
router.post("/admin/group-buys/:gbId/reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const gbId = String(req.params["gbId"]);
  const { reshipperUsername, country, enabledPaymentMethods } = req.body as {
    reshipperUsername: string;
    country: string;
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

  try {
    const [account] = await db
      .select({ reshipperStatus: accountsTable.reshipperStatus })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, reshipperUsername));

    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    if (account.reshipperStatus !== "approved") {
      res.status(400).json({ error: "Account must be an approved reshipper to be assigned to a GB" });
      return;
    }

    const [gb] = await db
      .select({ id: groupBuysTable.id })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));

    if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

    // Pre-check: is this reshipper already assigned to this GB?
    const [existingAssignment] = await db
      .select({ id: gbReshippersTable.id })
      .from(gbReshippersTable)
      .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, reshipperUsername)));

    if (existingAssignment) {
      res.status(409).json({ error: `@${reshipperUsername} is already assigned to this group buy` });
      return;
    }

    const id = randomUUID();
    const [assignment] = await db
      .insert(gbReshippersTable)
      .values({
        id,
        gbId,
        reshipperUsername,
        country: country.trim(),
        enabledPaymentMethods: enabledPaymentMethods ?? {},
      })
      .returning();

    writeLog("change", "info", "reshipper_assigned", `Admin assigned reshipper @${reshipperUsername} to GB ${gbId} (country: ${country})`, { gbId, reshipperUsername, country }).catch(() => {});

    res.status(201).json(assignment);
  } catch (err) {
    console.error("[admin/group-buys/:gbId/reshippers POST]", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// ── PATCH /admin/group-buys/:gbId/reshippers/:username — update payment methods ─
router.patch("/admin/group-buys/:gbId/reshippers/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const gbId = String(req.params["gbId"]);
  const username = String(req.params["username"]);
  const { enabledPaymentMethods, country, enabled, paymentTarget } = req.body as {
    enabledPaymentMethods?: Record<string, boolean>;
    country?: string;
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
  if (country !== undefined && typeof country === "string") updates.country = country.trim();
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

// ── DELETE /admin/group-buys/:gbId/reshippers/:username — unassign a reshipper ─
router.delete("/admin/group-buys/:gbId/reshippers/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const gbId = String(req.params["gbId"]);
  const username = String(req.params["username"]);

  const [assignment] = await db
    .select({ id: gbReshippersTable.id })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));

  if (!assignment) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

  await db.delete(gbReshippersTable).where(eq(gbReshippersTable.id, assignment.id));

  writeLog("change", "info", "reshipper_unassigned", `Admin unassigned reshipper @${username} from GB ${gbId}`, { gbId, username }).catch(() => {});

  res.json({ ok: true });
});

// ── POST /admin/group-buys/:gbId/reshipper-invite-code — generate/regenerate ─
router.post("/admin/group-buys/:gbId/reshipper-invite-code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const gbId = String(req.params["gbId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Generate a collision-free unique invite code
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

  writeLog("change", "info", "reshipper_invite_code_generated", `Admin generated reshipper invite code for GB ${gbId}`, { gbId }).catch(() => {});

  res.json({ ok: true, reshipperInviteCode: code });
});

// ── POST /admin/orders/:orderId/move-gb — move an order to a different GB ────
router.post("/admin/orders/:orderId/move-gb", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const orderId = String(req.params["orderId"]);
  const { targetGbId } = req.body as { targetGbId: string };

  if (!targetGbId || typeof targetGbId !== "string") {
    res.status(400).json({ error: "targetGbId is required" });
    return;
  }

  const [order] = await db
    .select({ id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [targetGb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, targetGbId));

  if (!targetGb) { res.status(404).json({ error: "Target group buy not found" }); return; }

  // Update the order's group_buy_id. Order line items only link to the order via
  // order_id (they have no independent group_buy_id column), so they automatically
  // follow the order to the target GB without further update.
  await db.update(ordersTable).set({ groupBuyId: targetGbId }).where(eq(ordersTable.id, orderId));

  // Ensure the member is joined to the target GB.
  // account_group_buys.account_id references accounts.telegram_username (primary key),
  // so use the order's telegramUsername directly (already normalized: @username lowercase).
  const accountId = order.telegramUsername;
  const [membership] = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(eq(accountGroupBuysTable.accountId, accountId), eq(accountGroupBuysTable.groupBuyId, targetGbId)));

  if (!membership) {
    const joinId = randomUUID();
    await db.insert(accountGroupBuysTable).values({ id: joinId, accountId, groupBuyId: targetGbId }).catch(() => {});
  }

  writeLog("change", "info", "order_moved_gb", `Admin moved order ${orderId} from GB ${order.groupBuyId ?? "none"} to GB ${targetGbId}`, { orderId, fromGb: order.groupBuyId, toGb: targetGbId }).catch(() => {});

  res.json({ ok: true, orderId, previousGbId: order.groupBuyId, newGbId: targetGbId });
});

// ── PATCH /admin/orders/:orderId/reassign-reshipper ────────────────────────────
// Force-assign (or clear) the reshipper for an order. No country eligibility check —
// this is an intentional manual override. Only requires the target to be an approved reshipper.
router.patch("/admin/orders/:orderId/reassign-reshipper", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const orderId = String(req.params["orderId"]);
  const { reshipperUsername } = req.body as { reshipperUsername: string | null };

  const [order] = await db
    .select({ id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, shippingCountry: ordersTable.shippingCountry, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (reshipperUsername === null || reshipperUsername === "") {
    // Set reshipperCleared=true so the gbReshippers fallback (gbId::country lookup)
    // is permanently suppressed for this order, even after a page refresh.
    await db.update(ordersTable).set({ reshipperUsername: null, reshipperCleared: true, countryLegId: null }).where(eq(ordersTable.id, orderId));
    writeLog("change", "info", "reshipper_reassigned", `Admin (manual override) cleared reshipper for order ${orderId}`, { orderId, gbId: order.groupBuyId, country: order.shippingCountry }).catch(() => {});
    res.json({ ok: true, reshipperUsername: null, reshipperCleared: true });
    return;
  }

  // Validate the new reshipper is an approved reshipper account (no country check)
  const [account] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, reshipperStatus: accountsTable.reshipperStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, reshipperUsername));

  if (!account) { res.status(404).json({ error: "Reshipper account not found" }); return; }
  if (account.reshipperStatus !== "approved") { res.status(400).json({ error: "Account is not an approved reshipper" }); return; }

  // Update the order row directly — reset reshipperCleared since a reshipper is now assigned
  await db.update(ordersTable).set({ reshipperUsername, reshipperCleared: false }).where(eq(ordersTable.id, orderId));

  writeLog("change", "info", "reshipper_reassigned", `Admin (manual override) force-assigned reshipper @${reshipperUsername} to order ${orderId}`, { orderId, gbId: order.groupBuyId, country: order.shippingCountry, reshipperUsername, manualOverride: true }).catch(() => {});

  notifyUserFromTemplate(reshipperUsername, "status", "reshipper_force_assigned", {
    code: order.code ?? orderId,
    customer_username: order.telegramUsername ?? "",
    shipping_country: order.shippingCountry ?? "",
  }).catch(() => {});

  res.json({ ok: true, reshipperUsername });
});

// ── POST /admin/orders/bulk-reassign-reshipper ──────────────────────────────
// Bulk force-assign a reshipper across multiple orders. No country eligibility check —
// this is an intentional manual override.
router.post("/admin/orders/bulk-reassign-reshipper", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orderIds, reshipperUsername } = req.body as { orderIds: string[]; reshipperUsername: string | null };
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.status(400).json({ error: "orderIds must be a non-empty array" }); return;
  }

  // Pre-validate the reshipper once (rather than per-order)
  if (reshipperUsername && reshipperUsername !== "") {
    const [account] = await db
      .select({ reshipperStatus: accountsTable.reshipperStatus })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, reshipperUsername));
    if (!account || account.reshipperStatus !== "approved") {
      res.status(400).json({ error: "Not an approved reshipper" }); return;
    }
  }

  const results: { orderId: string; ok: boolean; error?: string }[] = [];
  const clearing = reshipperUsername === null || reshipperUsername === "";

  for (const orderId of orderIds) {
    try {
      const [order] = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId));

      if (!order) { results.push({ orderId, ok: false, error: "Not found" }); continue; }

      await db.update(ordersTable)
        .set({
          reshipperUsername: clearing ? null : reshipperUsername,
          // reshipperCleared=true suppresses the gbReshippers fallback (gbId::country
          // lookup) permanently so clearing survives page refreshes.
          reshipperCleared: clearing ? true : false,
          ...(clearing ? { countryLegId: null } : {}),
        })
        .where(eq(ordersTable.id, orderId));
      results.push({ orderId, ok: true });
    } catch {
      results.push({ orderId, ok: false, error: "Internal error" });
    }
  }

  writeLog("change", "info", "reshipper_bulk_reassigned", `Admin (manual override) bulk force-assigned reshipper to ${reshipperUsername ?? "none"} for ${results.filter(r => r.ok).length} orders`, { reshipperUsername, count: results.filter(r => r.ok).length, manualOverride: true }).catch(() => {});
  res.json({ ok: true, results });
});

// ── PATCH /admin/gb-assignments/:id — toggle enabled/paymentTarget by assignment row id ─
router.patch("/admin/gb-assignments/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);
  const { enabled, paymentTarget, reshipperFeeEnabled, reshipperFeeType, reshipperFeeAmount, allowPayments, allowVendorShippingSplit, enabledPaymentMethods } = req.body as {
    enabled?: boolean;
    paymentTarget?: string;
    reshipperFeeEnabled?: boolean;
    reshipperFeeType?: string;
    reshipperFeeAmount?: number | null;
    allowPayments?: boolean;
    allowVendorShippingSplit?: boolean;
    enabledPaymentMethods?: Record<string, boolean>;
  };

  const [assignment] = await db
    .select()
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.id, id));

  if (!assignment) { res.status(404).json({ error: "Assignment not found" }); return; }

  const VALID_PAYMENT_TARGETS = ["reshipper", "admin"] as const;
  const VALID_FEE_TYPES = ["fixed", "custom"] as const;

  const updates: Record<string, unknown> = {};
  if (enabled !== undefined && typeof enabled === "boolean") updates.enabled = enabled;
  if (paymentTarget !== undefined) {
    if (!VALID_PAYMENT_TARGETS.includes(paymentTarget as typeof VALID_PAYMENT_TARGETS[number])) {
      res.status(400).json({ error: `paymentTarget must be one of: ${VALID_PAYMENT_TARGETS.join(", ")}` });
      return;
    }
    updates.paymentTarget = paymentTarget;
  }
  if (reshipperFeeEnabled !== undefined && typeof reshipperFeeEnabled === "boolean") {
    updates.reshipperFeeEnabled = reshipperFeeEnabled;
  }
  if (reshipperFeeType !== undefined) {
    if (!VALID_FEE_TYPES.includes(reshipperFeeType as typeof VALID_FEE_TYPES[number])) {
      res.status(400).json({ error: `reshipperFeeType must be one of: ${VALID_FEE_TYPES.join(", ")}` });
      return;
    }
    updates.reshipperFeeType = reshipperFeeType;
  }
  if (reshipperFeeAmount !== undefined) {
    updates.reshipperFeeAmount = reshipperFeeAmount === null ? null : String(reshipperFeeAmount);
  }
  if (allowPayments !== undefined && typeof allowPayments === "boolean") {
    updates.allowPayments = allowPayments;
  }
  if (allowVendorShippingSplit !== undefined && typeof allowVendorShippingSplit === "boolean") {
    updates.allowVendorShippingSplit = allowVendorShippingSplit;
  }
  if (enabledPaymentMethods !== undefined && typeof enabledPaymentMethods === "object") {
    updates.enabledPaymentMethods = enabledPaymentMethods;
  }

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [updated] = await db
    .update(gbReshippersTable)
    .set(updates)
    .where(eq(gbReshippersTable.id, id))
    .returning();

  writeLog("change", "info", "reshipper_assignment_updated",
    `Admin updated assignment ${id} (enabled=${updated.enabled}, paymentTarget=${updated.paymentTarget}, feeEnabled=${updated.reshipperFeeEnabled})`,
    { id, enabled: updated.enabled, paymentTarget: updated.paymentTarget, reshipperFeeEnabled: updated.reshipperFeeEnabled }
  ).catch(() => {});

  res.json(updated);
});

// ── GET /admin/reshipper-logs — global paginated log of all approved-reshipper actions ─
// Combines audit_logs (reshipper actions where metadata.username is an approved reshipper)
// with order_notes authored by approved reshippers, sorted newest-first with pagination.
router.get("/admin/reshipper-logs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const usernameFilter = req.query["username"] ? String(req.query["username"]) : undefined;
  const limit = Math.max(1, Math.min(parseInt(String(req.query["limit"] ?? "50"), 10) || 50, 200));
  const offset = Math.max(0, parseInt(String(req.query["offset"] ?? "0"), 10) || 0);
  const search = req.query["search"] ? String(req.query["search"]) : undefined;

  const RESHIPPER_ACTIONS = [
    "reshipper_direct_message",
    "reshipper_broadcast",
    "reshipper_joined_via_code",
    "reshipper_applied",
    "reshipper_assigned",
    "reshipper_reassigned",
    "reshipper_bulk_reassigned",
    "reshipper_settings_updated",
    "reshipper_status_changed",
    "reshipper_assignment_updated",
    "reshipper_unassigned",
  ];

  // Fetch approved reshipper usernames — used to constrain both queries
  const approvedReshippers = await db
    .select({ username: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.reshipperStatus, "approved"));

  const approvedUsernames = approvedReshippers.map(r => r.username);

  if (approvedUsernames.length === 0) {
    res.json({ entries: [], total: 0 });
    return;
  }

  // Optionally narrow to a single reshipper
  const targetUsernames = usernameFilter
    ? approvedUsernames.filter(u => u.toLowerCase() === usernameFilter.toLowerCase())
    : approvedUsernames;

  if (targetUsernames.length === 0) {
    res.json({ entries: [], total: 0 });
    return;
  }

  // Build search text conditions (applied to both sources)
  const auditSearchCond = search ? sql`lower(message) like ${`%${search.toLowerCase()}%`}` : sql`true`;
  const noteSearchCond = search ? sql`lower(body) like ${`%${search.toLowerCase()}%`}` : sql`true`;

  // Use a raw UNION ALL query for proper combined server-side pagination.
  // Both sources normalise to the same output shape including a `username` field.
  // Source 1: audit_logs filtered by action name AND actor identity (metadata->>'username')
  // Source 2: order_notes where author (actor identity) is an approved reshipper
  const unionQuery = sql`
    SELECT
      'audit'::text AS source,
      id::text AS id,
      action,
      message,
      metadata,
      metadata->>'username' AS username,
      created_at AS "createdAt",
      NULL::text AS "orderId"
    FROM audit_logs
    WHERE
      action = ANY(${RESHIPPER_ACTIONS}::text[])
      AND metadata->>'username' = ANY(${targetUsernames}::text[])
      AND ${auditSearchCond}
    UNION ALL
    SELECT
      'note'::text AS source,
      id::text AS id,
      'order_note'::text AS action,
      body AS message,
      jsonb_build_object('username', author, 'orderId', order_id) AS metadata,
      author AS username,
      created_at AS "createdAt",
      order_id AS "orderId"
    FROM order_notes
    WHERE
      author = ANY(${targetUsernames}::text[])
      AND ${noteSearchCond}
  `;

  type LogRow = {
    source: string; id: string; action: string; message: string;
    metadata: Record<string, unknown>; username: string;
    createdAt: string; orderId: string | null;
  };
  type CountRow = { total: number };

  const [dataResult, countResult] = await Promise.all([
    db.execute(sql`
      SELECT * FROM (${unionQuery}) AS combined
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT count(*)::int AS total FROM (${unionQuery}) AS combined
    `),
  ]);

  const entries = (dataResult as unknown as { rows: LogRow[] }).rows;
  const total = (countResult as unknown as { rows: CountRow[] }).rows[0]?.total ?? 0;

  res.json({ entries, total, limit, offset });
});

// ── PATCH /admin/reshippers/:username/settings ──────────────────────────────
// Toggle reshipper capability flags (acceptingPayments, acceptingOrders, visible)
router.patch("/admin/reshippers/:username/settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = decodeURIComponent(String(req.params["username"]));
  const settings = req.body as { acceptingPayments?: boolean; acceptingOrders?: boolean; visible?: boolean };

  const [acct] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, reshipperStatus: accountsTable.reshipperStatus, reshipperSettings: accountsTable.reshipperSettings })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }

  const currentSettings = (acct.reshipperSettings as Record<string, boolean> | null) ?? {};
  const merged = { ...currentSettings, ...settings };

  await db.update(accountsTable)
    .set({ reshipperSettings: merged })
    .where(eq(accountsTable.telegramUsername, username));

  writeLog("change", "info", "reshipper_settings_updated", `Admin updated reshipper settings for ${username}`, { username, settings: merged }).catch(() => {});
  res.json({ ok: true, reshipperSettings: merged });
});

// ── GET /admin/reshippers/:username/activity ────────────────────────────────
// Returns combined activity log for a reshipper: audit events + customer activity logs
router.get("/admin/reshippers/:username/activity", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = decodeURIComponent(String(req.params["username"]));

  const RESHIPPER_ACTIONS = [
    "reshipper_direct_message",
    "reshipper_broadcast",
    "reshipper_joined_via_code",
    "reshipper_applied",
    "reshipper_assigned",
    "reshipper_reassigned",
    "reshipper_bulk_reassigned",
    "reshipper_settings_updated",
    "reshipper_status_changed",
  ];

  const [auditEntries, activityEntries] = await Promise.all([
    db
      .select()
      .from(auditLogsTable)
      .where(
        and(
          ilike(auditLogsTable.message, `%@${username}%`),
          or(...RESHIPPER_ACTIONS.map(a => ilike(auditLogsTable.action, a))),
        )
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(100),
    db
      .select()
      .from(customerActivityLogsTable)
      .where(
        and(
          eq(customerActivityLogsTable.actorUsername, username),
          eq(customerActivityLogsTable.actorType, "reshipper"),
        )
      )
      .orderBy(desc(customerActivityLogsTable.createdAt))
      .limit(100),
  ]);

  res.json({ auditEntries, activityEntries });
});

// ── GET /admin/reshippers/:username/metrics ────────────────────
// Performance dashboard metrics for a single reshipper.
router.get("/admin/reshippers/:username/metrics", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = `@${req.params["username"]!.replace(/^@/, "")}`;

  // All orders assigned to this reshipper
  const orders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      groupBuyId: ordersTable.groupBuyId,
      shippingCountry: ordersTable.shippingCountry,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.reshipperUsername, username));

  const totalOrders = orders.length;
  const shippedOrders = orders.filter(o => ["Shipped", "Completed"].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === "Completed").length;
  const cancelledOrders = orders.filter(o => o.status === "Cancelled").length;

  // Average dispatch days: for orders that have been shipped, measure createdAt → updatedAt
  const shippedWithTimes = orders.filter(o => ["Shipped", "Completed"].includes(o.status) && o.createdAt && o.updatedAt);
  const avgDispatchDays = shippedWithTimes.length > 0
    ? parseFloat(
        (shippedWithTimes.reduce((sum, o) => {
          const diffMs = new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime();
          return sum + diffMs / (1000 * 60 * 60 * 24);
        }, 0) / shippedWithTimes.length).toFixed(1)
      )
    : null;

  // Countries and GBs covered
  const countriesCovered = [...new Set(orders.map(o => o.shippingCountry).filter(Boolean) as string[])].sort();
  const gbsCovered = [...new Set(orders.map(o => o.groupBuyId).filter(Boolean) as string[])].length;

  // GB assignments count
  const assignments = await db
    .select({ id: gbReshippersTable.id, country: gbReshippersTable.country })
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.reshipperUsername, username));

  const activeAssignments = assignments.length;

  // Parcel delivery rate: parcels in GBs this reshipper has orders in
  const gbIds = [...new Set(orders.map(o => o.groupBuyId).filter(Boolean) as string[])];
  let parcelDeliveryRate: number | null = null;
  if (gbIds.length > 0) {
    const parcels = await db
      .select({ status: gbParcelsTable.status })
      .from(gbParcelsTable)
      .where(inArray(gbParcelsTable.groupBuyId, gbIds));

    if (parcels.length > 0) {
      const delivered = parcels.filter(p => p.status === "delivered").length;
      parcelDeliveryRate = Math.round((delivered / parcels.length) * 100);
    }
  }

  res.json({
    username,
    totalOrders,
    shippedOrders,
    completedOrders,
    cancelledOrders,
    shippingRate: totalOrders > 0 ? Math.round((shippedOrders / totalOrders) * 100) : 0,
    avgDispatchDays,
    countriesCovered,
    countryCount: countriesCovered.length,
    gbsCovered,
    activeAssignments,
    parcelDeliveryRate,
  });
});

export default router;

import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  groupBuysTable,
  labTestsTable,
  ordersTable,
  orderLineItemsTable,
  auditLogsTable,
  organiserAuditLogTable,
  ORGANISER_ROLES,
  type OrganiserRole,
  type GroupBuy,
} from "@workspace/db";
import { eq, and, isNull, isNotNull, desc, sql, or } from "drizzle-orm";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import { enrichLogsWithGeo } from "../lib/ip-geo";
import { notifyUserFromTemplate } from "../lib/telegram";

const router: IRouter = Router();

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function formatGb(gb: GroupBuy) {
  return {
    ...gb,
    infoCards: parseJson(gb.infoCards, []),
    shippingOptions: parseJson(gb.shippingOptions, []),
    organiserPayments: gb.organiserPayments ?? null,
    pnlCosts: gb.pnlCosts ?? null,
  };
}

function isOrganiserRole(value: string): value is OrganiserRole {
  return (ORGANISER_ROLES as readonly string[]).includes(value);
}

async function writeOrganiserAuditLog(
  res: Response,
  organiserUsername: string,
  actionType: string,
  previousValue: string | null,
  newValue: string | null,
): Promise<void> {
  await db.insert(organiserAuditLogTable).values({
    adminUsername: getAdminUsername(res),
    organiserUsername,
    actionType,
    previousValue,
    newValue,
  });
}

// ── GET /admin/organisers — list all organiser accounts ──────────────────────
router.get("/admin/organisers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { status } = req.query;

  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      accountStatus: accountsTable.accountStatus,
      organiserStatus: accountsTable.organiserStatus,
      organiserRole: accountsTable.organiserRole,
      organiserApprovedAt: accountsTable.organiserApprovedAt,
      organiserPaymentMethods: accountsTable.organiserPaymentMethods,
      organiserAllowedVendors: accountsTable.organiserAllowedVendors,
      createdAt: accountsTable.createdAt,
    })
    .from(accountsTable)
    .where(isNotNull(accountsTable.organiserStatus))
    .orderBy(desc(accountsTable.createdAt));

  const filtered = status
    ? rows.filter(r => r.organiserStatus === String(status))
    : rows;

  res.json(filtered);
});

// ── POST /admin/organisers/:username/approve ─────────────────────────────────
router.post("/admin/organisers/:username/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prevStatus = account.organiserStatus;

  await db
    .update(accountsTable)
    .set({ organiserStatus: "approved", organiserApprovedAt: new Date() })
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  await writeOrganiserAuditLog(res, username, "status_change", prevStatus, "approved");
  writeLog("change", "info", "organiser_approved", `Admin approved GB Organiser: @${username}`, { username }).catch(() => {});

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
  notifyUserFromTemplate(username, "role_application", "applicant_organiser_approved", {
    username: username.replace(/^@/, ""),
    app_url: appUrl,
  }).catch(() => {});

  res.json({ ok: true, username, organiserStatus: "approved" });
});

// ── POST /admin/organisers/:username/reject ──────────────────────────────────
router.post("/admin/organisers/:username/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prevStatus = account.organiserStatus;

  await db
    .update(accountsTable)
    .set({ organiserStatus: "rejected" })
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  await writeOrganiserAuditLog(res, username, "status_change", prevStatus, "rejected");
  writeLog("change", "info", "organiser_rejected", `Admin rejected GB Organiser application: @${username}`, { username }).catch(() => {});

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
  notifyUserFromTemplate(username, "role_application", "applicant_organiser_rejected", {
    username: username.replace(/^@/, ""),
    app_url: appUrl,
  }).catch(() => {});

  res.json({ ok: true, username, organiserStatus: "rejected" });
});

// ── POST /admin/organisers/:username/suspend ─────────────────────────────────
router.post("/admin/organisers/:username/suspend", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prevStatus = account.organiserStatus;

  await db
    .update(accountsTable)
    .set({ organiserStatus: "suspended" })
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  await writeOrganiserAuditLog(res, username, "status_change", prevStatus, "suspended");
  writeLog("change", "warn", "organiser_suspended", `Admin suspended GB Organiser: @${username}`, { username }).catch(() => {});

  res.json({ ok: true, username, organiserStatus: "suspended" });
});

// ── POST /admin/organisers/:username/reinstate ───────────────────────────────
router.post("/admin/organisers/:username/reinstate", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const prevStatus = account.organiserStatus;

  await db
    .update(accountsTable)
    .set({ organiserStatus: "approved" })
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  await writeOrganiserAuditLog(res, username, "status_change", prevStatus, "approved");
  writeLog("change", "info", "organiser_reinstated", `Admin reinstated GB Organiser: @${username}`, { username }).catch(() => {});

  res.json({ ok: true, username, organiserStatus: "approved" });
});

// ── PATCH /admin/organisers/:username/role ───────────────────────────────────
router.patch("/admin/organisers/:username/role", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const { role } = req.body as { role: string };

  if (!role || !isOrganiserRole(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${ORGANISER_ROLES.join(", ")}` });
    return;
  }

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus, organiserRole: accountsTable.organiserRole })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  if (!account.organiserStatus) { res.status(400).json({ error: "Account is not an organiser" }); return; }

  const prevRole = account.organiserRole;
  const typedRole: OrganiserRole = role;

  await db
    .update(accountsTable)
    .set({ organiserRole: typedRole })
    .where(eq(accountsTable.telegramUsername, username));

  await writeOrganiserAuditLog(res, username, "role_change", prevRole ?? null, typedRole);
  writeLog("change", "info", "organiser_role_changed", `Admin changed organiser role: @${username} ${prevRole ?? "none"} → ${typedRole}`, { username, prevRole, newRole: typedRole }).catch(() => {});

  res.json({ ok: true, username, organiserRole: role });
});

// ── PATCH /admin/organisers/:username/restrictions — set vendor/product restrictions ──
router.patch("/admin/organisers/:username/restrictions", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);
  const { allowedVendors } = req.body as { allowedVendors?: string[] | null };

  if (allowedVendors !== undefined && allowedVendors !== null && !Array.isArray(allowedVendors)) {
    res.status(400).json({ error: "allowedVendors must be an array of strings or null" });
    return;
  }

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus, organiserAllowedVendors: accountsTable.organiserAllowedVendors })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  if (!account.organiserStatus) { res.status(400).json({ error: "Account is not an organiser" }); return; }

  const cleaned = allowedVendors == null
    ? null
    : allowedVendors.map(v => String(v).trim()).filter(Boolean);

  await db
    .update(accountsTable)
    .set({ organiserAllowedVendors: cleaned })
    .where(eq(accountsTable.telegramUsername, username));

  const prev = account.organiserAllowedVendors == null ? "unrestricted" : JSON.stringify(account.organiserAllowedVendors);
  const next = cleaned == null ? "unrestricted" : JSON.stringify(cleaned);
  await writeOrganiserAuditLog(res, username, "vendor_restrictions_changed", prev, next);
  writeLog("change", "info", "organiser_vendor_restrictions_changed",
    `Admin updated vendor restrictions for @${username}: ${next}`,
    { username, allowedVendors: cleaned },
  ).catch(() => {});

  res.json({ ok: true, username, organiserAllowedVendors: cleaned });
});

// ── GET /admin/organisers/audit-log — list organiser audit log entries ───────
router.get("/admin/organisers/audit-log", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { organiser, actionType } = req.query;

  let query = db
    .select()
    .from(organiserAuditLogTable)
    .orderBy(desc(organiserAuditLogTable.timestamp))
    .limit(500)
    .$dynamic();

  if (organiser) {
    query = query.where(eq(organiserAuditLogTable.organiserUsername, String(organiser)));
  }

  if (actionType) {
    const condition = eq(organiserAuditLogTable.actionType, String(actionType));
    if (organiser) {
      query = query.where(and(
        eq(organiserAuditLogTable.organiserUsername, String(organiser)),
        condition,
      ));
    } else {
      query = query.where(condition);
    }
  }

  const rows = await query;
  res.json(rows);
});

// ── GET /admin/organiser-group-buys — list all organiser GBs ────────────────
router.get("/admin/organiser-group-buys", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { approvalStatus, organiserId } = req.query;

  const rows = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      organiserId: groupBuysTable.organiserId,
      approvalStatus: groupBuysTable.approvalStatus,
      currency: groupBuysTable.currency,
      closeDate: groupBuysTable.closeDate,
      createdAt: groupBuysTable.createdAt,
      paymentsEnabled: groupBuysTable.paymentsEnabled,
      organiserPayments: groupBuysTable.organiserPayments,
      qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
      qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
      qrUploadMessage: groupBuysTable.qrUploadMessage,
      qrUploadCouriers: groupBuysTable.qrUploadCouriers,
    })
    .from(groupBuysTable)
    .where(isNotNull(groupBuysTable.organiserId))
    .orderBy(desc(groupBuysTable.createdAt));

  let filtered = rows;
  if (approvalStatus) filtered = filtered.filter(r => r.approvalStatus === String(approvalStatus));
  if (organiserId) filtered = filtered.filter(r => r.organiserId === String(organiserId));

  res.json(filtered.map(r => ({
    ...r,
    organiserPayments: r.organiserPayments ?? null,
  })));
});

// ── GET /admin/organiser-group-buys/:id — full detail ───────────────────────
router.get("/admin/organiser-group-buys/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const [gb] = await db
    .select()
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  res.json(formatGb(gb));
});

// ── POST /admin/organiser-group-buys/:id/approve ────────────────────────────
router.post("/admin/organiser-group-buys/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  await db
    .update(groupBuysTable)
    .set({ approvalStatus: "approved" })
    .where(eq(groupBuysTable.id, id));

  writeLog("change", "info", "organiser_gb_approved", `Admin approved organiser GB: ${id} (organiser: @${gb.organiserId})`, { gbId: id, organiserId: gb.organiserId }).catch(() => {});

  res.json({ ok: true, id, approvalStatus: "approved" });
});

// ── POST /admin/organiser-group-buys/:id/reject ──────────────────────────────
router.post("/admin/organiser-group-buys/:id/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  await db
    .update(groupBuysTable)
    .set({ approvalStatus: "rejected" })
    .where(eq(groupBuysTable.id, id));

  writeLog("change", "info", "organiser_gb_rejected", `Admin rejected organiser GB: ${id} (organiser: @${gb.organiserId})`, { gbId: id, organiserId: gb.organiserId }).catch(() => {});

  res.json({ ok: true, id, approvalStatus: "rejected" });
});

// ── PATCH /admin/organiser-group-buys/:id/anonpay — configure AnonPay ───────
router.patch("/admin/organiser-group-buys/:id/anonpay", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);
  const { anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork } = req.body;

  const [existing] = await db
    .select({ organiserPayments: groupBuysTable.organiserPayments })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!existing) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  const current = (existing.organiserPayments ?? {}) as Record<string, unknown>;
  const updated = {
    ...current,
    ...(typeof anonPayEnabled === "boolean" ? { anonPayEnabled } : {}),
    ...(anonPayWallet != null ? { anonPayWallet: String(anonPayWallet).trim() } : {}),
    ...(anonPayTicker != null ? { anonPayTicker: String(anonPayTicker).trim() } : {}),
    ...(anonPayNetwork != null ? { anonPayNetwork: String(anonPayNetwork).trim() } : {}),
  };

  await db.update(groupBuysTable).set({ organiserPayments: updated }).where(eq(groupBuysTable.id, id));
  res.json({ ok: true, organiserPayments: updated });
});

// ── PATCH /admin/organiser-group-buys/:id/qr-settings — admin toggles QR upload settings ──
router.patch("/admin/organiser-group-buys/:id/qr-settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);
  const { qrUploadInpostEnabled, qrUploadRoyalMailEnabled, qrUploadMessage, qrUploadCouriers } = req.body;

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (typeof qrUploadInpostEnabled === "boolean") updates.qrUploadInpostEnabled = qrUploadInpostEnabled;
  if (typeof qrUploadRoyalMailEnabled === "boolean") updates.qrUploadRoyalMailEnabled = qrUploadRoyalMailEnabled;
  if (qrUploadMessage !== undefined) updates.qrUploadMessage = qrUploadMessage ? String(qrUploadMessage).trim() : null;
  if (qrUploadCouriers !== undefined) {
    updates.qrUploadCouriers = Array.isArray(qrUploadCouriers)
      ? qrUploadCouriers.filter((c: unknown) => typeof c === "string" && c.trim()).map((c: string) => c.trim())
      : null;
  }

  await db.update(groupBuysTable).set(updates).where(eq(groupBuysTable.id, id));
  res.json({ ok: true, ...updates });
});

// ── DELETE /admin/organiser-group-buys/:id — admin removes organiser GB ──────
router.delete("/admin/organiser-group-buys/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  await db.update(groupBuysTable).set({ status: "archived" }).where(eq(groupBuysTable.id, id));

  writeLog("change", "warn", "organiser_gb_removed", `Admin removed organiser GB: ${id} (organiser: @${gb.organiserId})`, { gbId: id, organiserId: gb.organiserId }).catch(() => {});

  res.json({ ok: true, id });
});

// ── GET /admin/organiser-lab-tests — list organiser-submitted lab tests ───────
router.get("/admin/organiser-lab-tests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { status, organiserId } = req.query;

  const rows = await db
    .select()
    .from(labTestsTable)
    .where(isNotNull(labTestsTable.organiserId))
    .orderBy(desc(labTestsTable.createdAt));

  let filtered = rows;
  if (status === "pending") filtered = filtered.filter(r => r.pending);
  if (status === "approved") filtered = filtered.filter(r => !r.pending);
  if (organiserId) filtered = filtered.filter(r => r.organiserId === String(organiserId));

  res.json(filtered);
});

// ── POST /admin/organiser-lab-tests/:id/approve ──────────────────────────────
router.post("/admin/organiser-lab-tests/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({ id: labTestsTable.id, organiserId: labTestsTable.organiserId })
    .from(labTestsTable)
    .where(and(eq(labTestsTable.id, id), isNotNull(labTestsTable.organiserId)));

  if (!row) { res.status(404).json({ error: "Organiser lab test not found" }); return; }

  await db.update(labTestsTable).set({ pending: false }).where(eq(labTestsTable.id, id));

  writeLog("change", "info", "organiser_lab_approved", `Admin approved organiser lab test ${id} (organiser: @${row.organiserId})`, { labTestId: id, organiserId: row.organiserId }).catch(() => {});

  res.json({ ok: true, id, pending: false });
});

// ── POST /admin/organiser-lab-tests/:id/reject — admin deletes pending test ──
router.post("/admin/organiser-lab-tests/:id/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({ id: labTestsTable.id, organiserId: labTestsTable.organiserId, pending: labTestsTable.pending })
    .from(labTestsTable)
    .where(and(eq(labTestsTable.id, id), isNotNull(labTestsTable.organiserId)));

  if (!row) { res.status(404).json({ error: "Organiser lab test not found" }); return; }

  if (!row.pending) {
    res.status(409).json({ error: "Cannot reject an already-approved lab test. It must be removed by another means if needed." });
    return;
  }

  await db.delete(labTestsTable).where(eq(labTestsTable.id, id));

  writeLog("change", "info", "organiser_lab_rejected", `Admin rejected/deleted organiser lab test ${id} (organiser: @${row.organiserId})`, { labTestId: id, organiserId: row.organiserId }).catch(() => {});

  res.json({ ok: true, id, deleted: true });
});

// ── GET /admin/organiser-group-buys/:id/orders — view orders for organiser GB ─
router.get("/admin/organiser-group-buys/:id/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(and(eq(groupBuysTable.id, id), isNotNull(groupBuysTable.organiserId)));

  if (!gb) { res.status(404).json({ error: "Organiser group buy not found" }); return; }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.groupBuyId, id))
    .orderBy(desc(ordersTable.createdAt));

  res.json(orders.map(o => {
    const txHash = o.paymentTxHash ?? null;
    const { paymentScreenshot, ...rest } = o as any;
    let paymentMethod = "manual";
    if (txHash?.startsWith("anonpay:")) paymentMethod = "anonpay";
    else if (txHash === "fiat:revolut") paymentMethod = "revolut";
    else if (txHash === "fiat:paypal") paymentMethod = "paypal";

    return {
      ...rest,
      grandTotal: parseFloat(String(o.grandTotal)),
      productSubtotal: parseFloat(String(o.productSubtotal)),
      deliveryPrice: parseFloat(String(o.deliveryPrice)),
      tip: parseFloat(String(o.tip)),
      testingContribution: parseFloat(String(o.testingContribution)),
      paymentMethod,
      hasPaymentScreenshot: paymentScreenshot !== null && paymentScreenshot !== undefined,
    };
  }));
});

// ── GET /admin/organiser-group-buys/:id/logs — audit logs for organiser GB ────
router.get("/admin/organiser-group-buys/:id/logs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const id = String(req.params["id"]);

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(sql`${auditLogsTable.metadata}::jsonb->>'gbId' = ${id} OR ${auditLogsTable.message} ILIKE ${'%' + id + '%'}`)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(100);

  const logsWithGeo = await enrichLogsWithGeo(logs);
  res.json(logsWithGeo);
});

// ── GET /admin/organisers/:username/summary — full summary for one organiser ──
router.get("/admin/organisers/:username/summary", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = String(req.params["username"]);

  const [account] = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      accountStatus: accountsTable.accountStatus,
      organiserStatus: accountsTable.organiserStatus,
      organiserRole: accountsTable.organiserRole,
      organiserApprovedAt: accountsTable.organiserApprovedAt,
      organiserPaymentMethods: accountsTable.organiserPaymentMethods,
      createdAt: accountsTable.createdAt,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  const gbs = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      approvalStatus: groupBuysTable.approvalStatus,
      createdAt: groupBuysTable.createdAt,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.organiserId, username))
    .orderBy(desc(groupBuysTable.createdAt));

  const gbIds = gbs.map(g => g.id);
  const orderCount = gbIds.length > 0
    ? await db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(sql`${ordersTable.groupBuyId} = ANY(ARRAY[${sql.join(gbIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
        .then(rows => rows[0]?.count ?? 0)
    : 0;

  const pendingLabTests = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labTestsTable)
    .where(and(sql`${labTestsTable.organiserId} = ${username}`, eq(labTestsTable.pending, true)))
    .then(rows => rows[0]?.count ?? 0);

  res.json({
    account,
    stats: {
      totalGbs: gbs.length,
      approvedGbs: gbs.filter(g => g.approvalStatus === "approved").length,
      pendingGbs: gbs.filter(g => g.approvalStatus === "pending_approval").length,
      totalOrders: orderCount,
      pendingLabTests,
    },
    groupBuys: gbs,
  });
});

export default router;

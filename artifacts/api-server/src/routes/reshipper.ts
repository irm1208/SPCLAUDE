import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  accountsTable,
  gbReshippersTable,
  gbCountryLegsTable,
  groupBuysTable,
  groupBuyProductsTable,
  productsTable,
  ordersTable,
  orderLineItemsTable,
  gbParcelsTable,
  gbParcelOptinsTable,
  accountGroupBuysTable,
  type GroupBuy,
  type GbParcel,
} from "@workspace/db";
import { eq, and, desc, or, sql, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { refreshSingleGbParcel } from "../lib/tracking-auto-refresh";
import { requireReshipper, verifyReshipperAssignment } from "../middleware/require-reshipper";
import { writeLog } from "../lib/audit-log";
import { sendTelegramMessage, sendTelegramMessageFull, sendAdminFromTemplate, getTemplate, renderTemplate } from "../lib/telegram";

const router: IRouter = Router();

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function formatGbForReshipper(gb: GroupBuy) {
  return {
    id: gb.id,
    name: gb.name,
    status: gb.status,
    currency: gb.currency,
    paymentsEnabled: gb.paymentsEnabled,
    orderPageMessage: gb.orderPageMessage,
    shippingOptions: parseJson(gb.shippingOptions, []),
    qrUploadInpostEnabled: gb.qrUploadInpostEnabled,
    qrUploadRoyalMailEnabled: gb.qrUploadRoyalMailEnabled,
    qrUploadMessage: gb.qrUploadMessage,
    qrUploadCouriers: (gb.qrUploadCouriers as string[] | null) ?? null,
    vendorShippingEnabled: gb.vendorShippingEnabled,
    vendorShippingAmount: gb.vendorShippingAmount,
    vendorShippingMode: gb.vendorShippingMode ?? "equal",
    vendorShippingEqualPct: gb.vendorShippingEqualPct ?? 100,
  };
}

// ── GET /api/reshipper/me — profile + reshipper status ───────────────────────
router.get("/reshipper/me", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;
  const [account] = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      reshipperStatus: accountsTable.reshipperStatus,
      reshipperApprovedAt: accountsTable.reshipperApprovedAt,
      reshipperPaymentMethods: accountsTable.reshipperPaymentMethods,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(account);
});

// ── PATCH /api/reshipper/me — update reshipper payment methods ───────────────
router.patch("/reshipper/me", requireReshipper, async (req, res): Promise<void> => {
  const username = req.reshipper!.telegramUsername;
  const {
    usdtWallet, revolutHandle, paypalHandle,
    cryptoCurrency, cryptoNetwork, cryptoWalletAddress,
    anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork,
  } = req.body;

  const methods: Record<string, unknown> = {};
  if (usdtWallet !== undefined) methods.usdtWallet = usdtWallet ? String(usdtWallet).trim() : null;
  if (revolutHandle !== undefined) methods.revolutHandle = revolutHandle ? String(revolutHandle).trim() : null;
  if (paypalHandle !== undefined) methods.paypalHandle = paypalHandle ? String(paypalHandle).trim() : null;
  if (cryptoCurrency !== undefined) methods.cryptoCurrency = cryptoCurrency ? String(cryptoCurrency).trim() : null;
  if (cryptoNetwork !== undefined) methods.cryptoNetwork = cryptoNetwork ? String(cryptoNetwork).trim() : null;
  if (cryptoWalletAddress !== undefined) methods.cryptoWalletAddress = cryptoWalletAddress ? String(cryptoWalletAddress).trim() : null;
  if (anonPayEnabled !== undefined) methods.anonPayEnabled = Boolean(anonPayEnabled);
  if (anonPayWallet !== undefined) methods.anonPayWallet = anonPayWallet ? String(anonPayWallet).trim() : null;
  if (anonPayTicker !== undefined) methods.anonPayTicker = anonPayTicker ? String(anonPayTicker).trim() : null;
  if (anonPayNetwork !== undefined) methods.anonPayNetwork = anonPayNetwork ? String(anonPayNetwork).trim() : null;

  const [updated] = await db
    .update(accountsTable)
    .set({ reshipperPaymentMethods: methods as never })
    .where(eq(accountsTable.telegramUsername, username))
    .returning({
      telegramUsername: accountsTable.telegramUsername,
      reshipperStatus: accountsTable.reshipperStatus,
      reshipperPaymentMethods: accountsTable.reshipperPaymentMethods,
    });

  res.json(updated);
});

// ── POST /api/reshipper/apply — apply to become a reshipper ─────────────────
router.post("/reshipper/apply", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;

  const [account] = await db
    .select({ reshipperStatus: accountsTable.reshipperStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }

  if (account.reshipperStatus === "approved") {
    res.status(409).json({ error: "You are already an approved Reshipper." });
    return;
  }
  if (account.reshipperStatus === "applied") {
    res.status(409).json({ error: "Your application is already pending review." });
    return;
  }
  if (account.reshipperStatus === "suspended") {
    res.status(403).json({ error: "Your Reshipper account has been suspended. Contact admin to appeal." });
    return;
  }

  await db
    .update(accountsTable)
    .set({ reshipperStatus: "applied" })
    .where(eq(accountsTable.telegramUsername, username));

  writeLog("change", "info", "reshipper_applied", `Account @${username} applied to become a Reshipper`, { username }).catch(() => {});
  sendAdminFromTemplate("admin_role_application_reshipper", { username }).catch(() => {});

  res.json({ ok: true, reshipperStatus: "applied" });
});

// ── POST /api/reshipper/join — join a GB via reshipper invite code ────────────
router.post("/reshipper/join", requireReshipper, async (req, res): Promise<void> => {
  const username = req.reshipper!.telegramUsername;
  const { inviteCode, country } = req.body as { inviteCode: string; country: string };

  if (!inviteCode || typeof inviteCode !== "string") {
    res.status(400).json({ error: "inviteCode is required" });
    return;
  }
  if (!country || typeof country !== "string") {
    res.status(400).json({ error: "country is required" });
    return;
  }

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, reshipperInviteCode: groupBuysTable.reshipperInviteCode })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.reshipperInviteCode, inviteCode.trim()));

  if (!gb) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const [existingAssignment] = await db
    .select({ id: gbReshippersTable.id, reshipperUsername: gbReshippersTable.reshipperUsername })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gb.id), eq(gbReshippersTable.country, country.trim())));

  if (existingAssignment) {
    if (existingAssignment.reshipperUsername === username) {
      // Already assigned to this user — return success so the frontend refreshes
      res.json({ ok: true, gbId: gb.id, gbName: gb.name, alreadyAssigned: true });
    } else {
      res.status(409).json({ error: "This country slot for the group buy already has a reshipper assigned." });
    }
    return;
  }

  const id = randomUUID();
  const [assignment] = await db
    .insert(gbReshippersTable)
    .values({ id, gbId: gb.id, reshipperUsername: username, country: country.trim(), enabledPaymentMethods: {} })
    .returning();

  writeLog("change", "info", "reshipper_joined_via_code", `Reshipper @${username} joined GB ${gb.id} via invite code (country: ${country})`, { username, gbId: gb.id, country }).catch(() => {});

  res.status(201).json({ ok: true, assignment, gbId: gb.id, gbName: gb.name });
});

// ── GET /api/reshipper/assignments — list the reshipper's GB assignments ─────
router.get("/reshipper/assignments", requireReshipper, async (req, res): Promise<void> => {
  const username = req.reshipper!.telegramUsername;

  const assignments = await db
    .select()
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.reshipperUsername, username))
    .orderBy(gbReshippersTable.createdAt);

  const gbIds = assignments.map(a => a.gbId);
  let gbs: GroupBuy[] = [];
  if (gbIds.length > 0) {
    gbs = await db
      .select()
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, gbIds));
  }

  const gbMap = new Map(gbs.map(g => [g.id, g]));
  const result = assignments.map(a => ({
    ...a,
    gb: gbMap.has(a.gbId) ? formatGbForReshipper(gbMap.get(a.gbId)!) : null,
  }));

  res.json(result);
});

// ── PATCH /api/reshipper/gb/:gbId/payment-details — save per-assignment payment info ──
router.patch("/reshipper/gb/:gbId/payment-details", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const {
    usdtWallet, revolutHandle, paypalHandle,
    cryptoCurrency, cryptoNetwork, cryptoWalletAddress,
    anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork,
  } = req.body;

  const details: Record<string, unknown> = {};
  if (usdtWallet !== undefined) details.usdtWallet = usdtWallet ? String(usdtWallet).trim() : null;
  if (revolutHandle !== undefined) details.revolutHandle = revolutHandle ? String(revolutHandle).trim() : null;
  if (paypalHandle !== undefined) details.paypalHandle = paypalHandle ? String(paypalHandle).trim() : null;
  if (cryptoCurrency !== undefined) details.cryptoCurrency = cryptoCurrency ? String(cryptoCurrency).trim() : null;
  if (cryptoNetwork !== undefined) details.cryptoNetwork = cryptoNetwork ? String(cryptoNetwork).trim() : null;
  if (cryptoWalletAddress !== undefined) details.cryptoWalletAddress = cryptoWalletAddress ? String(cryptoWalletAddress).trim() : null;
  if (anonPayEnabled !== undefined) details.anonPayEnabled = Boolean(anonPayEnabled);
  if (anonPayWallet !== undefined) details.anonPayWallet = anonPayWallet ? String(anonPayWallet).trim() : null;
  if (anonPayTicker !== undefined) details.anonPayTicker = anonPayTicker ? String(anonPayTicker).trim() : null;
  if (anonPayNetwork !== undefined) details.anonPayNetwork = anonPayNetwork ? String(anonPayNetwork).trim() : null;

  const [updated] = await db
    .update(gbReshippersTable)
    .set({ reshipperPaymentDetails: details as never })
    .where(and(
      eq(gbReshippersTable.gbId, gbId),
      eq(gbReshippersTable.reshipperUsername, req.reshipper!.telegramUsername),
    ))
    .returning();

  res.json(updated);
});

// ── PATCH /api/reshipper/gb/:gbId/fee — reshipper sets their own fee ────────
router.patch("/reshipper/gb/:gbId/fee", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { feeAmount, feeType } = req.body as { feeAmount?: string | number | null; feeType?: string };

  const updates: Record<string, unknown> = {};
  if (feeAmount !== undefined) {
    const parsed = feeAmount !== null && feeAmount !== "" ? parseFloat(String(feeAmount)) : NaN;
    updates.reshipperFeeAmount = !isNaN(parsed) ? String(parsed.toFixed(2)) : null;
    // Auto-enable when an amount is set, auto-disable when cleared
    updates.reshipperFeeEnabled = !isNaN(parsed);
  }
  if (feeType !== undefined) {
    updates.reshipperFeeType = ["fixed", "percentage"].includes(String(feeType)) ? String(feeType) : "fixed";
  }

  const [updated] = await db
    .update(gbReshippersTable)
    .set(updates)
    .where(and(
      eq(gbReshippersTable.gbId, gbId),
      eq(gbReshippersTable.reshipperUsername, req.reshipper!.telegramUsername),
    ))
    .returning();

  res.json({
    reshipperFeeEnabled: updated.reshipperFeeEnabled,
    reshipperFeeType: updated.reshipperFeeType,
    reshipperFeeAmount: updated.reshipperFeeAmount,
  });
});

// ── PATCH /api/reshipper/gb/:gbId/settings — update allowed GB settings ──────
router.patch("/reshipper/gb/:gbId/settings", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const {
    paymentsEnabled,
    orderPageMessage,
    qrUploadInpostEnabled,
    qrUploadRoyalMailEnabled,
    qrUploadMessage,
    qrUploadCouriers,
    shippingOptions,
    vendorShippingEnabled,
    vendorShippingAmount,
    vendorShippingMode,
    vendorShippingEqualPct,
  } = req.body;

  const updates: Record<string, unknown> = {};
  if (paymentsEnabled !== undefined) updates.paymentsEnabled = Boolean(paymentsEnabled);
  if (orderPageMessage !== undefined) updates.orderPageMessage = orderPageMessage ? String(orderPageMessage).trim() : null;
  if (qrUploadInpostEnabled !== undefined) updates.qrUploadInpostEnabled = Boolean(qrUploadInpostEnabled);
  if (qrUploadRoyalMailEnabled !== undefined) updates.qrUploadRoyalMailEnabled = Boolean(qrUploadRoyalMailEnabled);
  if (qrUploadMessage !== undefined) updates.qrUploadMessage = qrUploadMessage ? String(qrUploadMessage).trim() : null;
  if (qrUploadCouriers !== undefined) {
    updates.qrUploadCouriers = Array.isArray(qrUploadCouriers)
      ? qrUploadCouriers.filter((c: unknown) => typeof c === "string" && c.trim()).map((c: string) => c.trim())
      : null;
  }
  if (shippingOptions !== undefined) {
    if (shippingOptions !== null && !Array.isArray(shippingOptions)) {
      res.status(400).json({ error: "shippingOptions must be an array or null" });
      return;
    }
    updates.shippingOptions = shippingOptions ? JSON.stringify(shippingOptions) : null;
  }
  if (vendorShippingEnabled !== undefined) updates.vendorShippingEnabled = Boolean(vendorShippingEnabled);
  if (vendorShippingMode !== undefined) {
    if (!["equal", "weighted"].includes(String(vendorShippingMode))) {
      res.status(400).json({ error: "vendorShippingMode must be 'equal' or 'weighted'" });
      return;
    }
    updates.vendorShippingMode = String(vendorShippingMode);
  }
  if (vendorShippingAmount !== undefined) {
    if (vendorShippingAmount === null || vendorShippingAmount === "") {
      updates.vendorShippingAmount = null;
    } else {
      const parsed = parseFloat(String(vendorShippingAmount));
      if (!isFinite(parsed) || parsed < 0) {
        res.status(400).json({ error: "vendorShippingAmount must be a non-negative number" });
        return;
      }
      updates.vendorShippingAmount = parsed.toFixed(2);
    }
  }
  if (vendorShippingEqualPct !== undefined) {
    const pct = parseInt(String(vendorShippingEqualPct), 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      res.status(400).json({ error: "vendorShippingEqualPct must be an integer 0–100" });
      return;
    }
    updates.vendorShippingEqualPct = pct;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(groupBuysTable)
    .set(updates)
    .where(eq(groupBuysTable.id, gbId))
    .returning();

  res.json(formatGbForReshipper(updated));
});

// ── GET /api/reshipper/gb/:gbId/orders — list orders for assigned GB ─────────
router.get("/reshipper/gb/:gbId/orders", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { status, paymentStatus, username, from, to } = req.query;

  // Find the country leg for this reshipper's assigned country (case-insensitive match
  // so "GB" and "United Kingdom" style mismatches between reshippers don't break things).
  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode })
    .from(gbCountryLegsTable)
    .where(and(
      eq(gbCountryLegsTable.gbId, gbId),
      sql`lower(${gbCountryLegsTable.countryCode}) = lower(${assignment.country.trim()})`,
    ));

  // Build the where clause:
  //  • Always include orders explicitly assigned to this reshipper (reshipperUsername = me).
  //  • Also include unassigned orders (reshipperUsername IS NULL) in this reshipper's country leg
  //    so they appear in the queue before they've been claimed/allocated.
  //  • Once an order has ANY reshipperUsername set, it is only visible to that reshipper —
  //    this correctly handles two reshippers sharing the same country without relying on
  //    fragile "count how many reshippers are on this leg" detection.
  //  • Direct-to-home orders are never the reshipper's concern — excluded in all branches.
  const notDirectShipping = sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`;
  const whereClause = countryLeg
    ? and(
        eq(ordersTable.groupBuyId, gbId),
        or(
          eq(ordersTable.reshipperUsername, assignment.reshipperUsername),
          and(isNull(ordersTable.reshipperUsername), eq(ordersTable.countryLegId, countryLeg.id)),
        ),
        isNull(ordersTable.deletedAt),
        notDirectShipping,
      )
    : and(eq(ordersTable.groupBuyId, gbId), eq(ordersTable.reshipperUsername, assignment.reshipperUsername), isNull(ordersTable.deletedAt), notDirectShipping);

  const rows = await db
    .select()
    .from(ordersTable)
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt));

  let filtered = rows;
  if (status) filtered = filtered.filter(r => r.status === String(status));
  if (paymentStatus) filtered = filtered.filter(r => r.paymentStatus === String(paymentStatus));
  if (username) {
    const u = String(username).toLowerCase();
    filtered = filtered.filter(r => r.telegramUsername.toLowerCase().includes(u));
  }
  if (from) {
    const fromDate = new Date(String(from));
    if (!isNaN(fromDate.getTime())) {
      filtered = filtered.filter(r => r.createdAt >= fromDate);
    }
  }
  if (to) {
    const toDate = new Date(String(to));
    if (!isNaN(toDate.getTime())) {
      filtered = filtered.filter(r => r.createdAt <= toDate);
    }
  }

  // Attach line items so summary tab can show product breakdown
  if (filtered.length > 0) {
    const orderIds = filtered.map(o => o.id);
    const lineItems = await db
      .select({
        orderId: orderLineItemsTable.orderId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
        lineTotal: orderLineItemsTable.lineTotal,
      })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    const linesByOrder = new Map<string, typeof lineItems>();
    for (const li of lineItems) {
      if (!linesByOrder.has(li.orderId)) linesByOrder.set(li.orderId, []);
      linesByOrder.get(li.orderId)!.push(li);
    }
    const withItems = filtered.map(o => ({ ...o, lineItems: linesByOrder.get(o.id) ?? [] }));
    res.json(withItems);
    return;
  }

  res.json(filtered);
});

// ── GET /api/reshipper/gb/:gbId/unclaimed-orders — pool of unassigned orders ──
router.get("/reshipper/gb/:gbId/unclaimed-orders", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(
      eq(gbCountryLegsTable.gbId, gbId),
      sql`lower(${gbCountryLegsTable.countryCode}) = lower(${assignment.country.trim()})`,
    ));

  if (!countryLeg) {
    res.json([]);
    return;
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      eq(ordersTable.countryLegId, countryLeg.id),
      isNull(ordersTable.reshipperUsername),
      isNull(ordersTable.deletedAt),
      sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`,
    ))
    .orderBy(desc(ordersTable.createdAt));

  if (rows.length > 0) {
    const orderIds = rows.map(o => o.id);
    const lineItems = await db
      .select({
        orderId: orderLineItemsTable.orderId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
        lineTotal: orderLineItemsTable.lineTotal,
      })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));
    const linesByOrder = new Map<string, typeof lineItems>();
    for (const li of lineItems) {
      if (!linesByOrder.has(li.orderId)) linesByOrder.set(li.orderId, []);
      linesByOrder.get(li.orderId)!.push(li);
    }
    res.json(rows.map(o => ({ ...o, lineItems: linesByOrder.get(o.id) ?? [] })));
    return;
  }

  res.json([]);
});

// ── POST /api/reshipper/gb/:gbId/orders/:orderId/claim — claim an unclaimed order ─
router.post("/reshipper/gb/:gbId/orders/:orderId/claim", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(
      eq(gbCountryLegsTable.gbId, gbId),
      sql`lower(${gbCountryLegsTable.countryCode}) = lower(${assignment.country.trim()})`,
    ));

  if (!countryLeg) {
    res.status(400).json({ error: "No country leg configured for your assignment" });
    return;
  }

  // Verify the order belongs to this leg, is unclaimed, and is not a direct-to-home order
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.groupBuyId, gbId),
      eq(ordersTable.countryLegId, countryLeg.id),
      isNull(ordersTable.reshipperUsername),
      sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`,
    ));

  if (!order) {
    res.status(404).json({ error: "Order not found, not in your leg, or already claimed" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ reshipperUsername: assignment.reshipperUsername })
    .where(and(eq(ordersTable.id, orderId), isNull(ordersTable.reshipperUsername)));

  writeLog("change", "info", "order_claimed_by_reshipper",
    `Reshipper @${assignment.reshipperUsername} claimed order ${order.code ?? orderId}`,
    { orderId, reshipper: assignment.reshipperUsername, gbId },
  ).catch(() => {});

  res.json({ ok: true, reshipperUsername: assignment.reshipperUsername });
});

// ── POST /api/reshipper/gb/:gbId/orders/claim-bulk — claim multiple unclaimed orders at once ─
router.post("/reshipper/gb/:gbId/orders/claim-bulk", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderIds: unknown = req.body?.orderIds;
  if (!Array.isArray(orderIds) || orderIds.length === 0 || !orderIds.every(x => typeof x === "string")) {
    res.status(400).json({ error: "orderIds must be a non-empty array of strings" });
    return;
  }
  const ids = orderIds as string[];

  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(
      eq(gbCountryLegsTable.gbId, gbId),
      sql`lower(${gbCountryLegsTable.countryCode}) = lower(${assignment.country.trim()})`,
    ));

  if (!countryLeg) {
    res.status(400).json({ error: "No country leg configured for your assignment" });
    return;
  }

  // Atomic claim: a single UPDATE ... WHERE ... RETURNING so we report exactly
  // which rows we actually won (race-safe even with concurrent reshippers).
  // Direct-to-home orders are excluded — reshippers cannot claim them.
  const claimedRows = await db
    .update(ordersTable)
    .set({ reshipperUsername: assignment.reshipperUsername })
    .where(and(
      inArray(ordersTable.id, ids),
      eq(ordersTable.groupBuyId, gbId),
      eq(ordersTable.countryLegId, countryLeg.id),
      isNull(ordersTable.reshipperUsername),
      sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`,
    ))
    .returning({ id: ordersTable.id, code: ordersTable.code });

  const claimedIds = claimedRows.map(r => r.id);
  const claimedSet = new Set(claimedIds);
  const skipped = ids.filter(id => !claimedSet.has(id));

  if (claimedIds.length > 0) {
    writeLog("change", "info", "orders_claimed_by_reshipper_bulk",
      `Reshipper @${assignment.reshipperUsername} claimed ${claimedIds.length} orders (${claimedRows.map(r => r.code ?? r.id).join(", ")})`,
      { orderIds: claimedIds, reshipper: assignment.reshipperUsername, gbId, count: claimedIds.length },
    ).catch(() => {});
  }

  res.json({
    ok: true,
    claimed: claimedIds.length,
    claimedIds,
    skipped,
    reshipperUsername: assignment.reshipperUsername,
  });
});

// ── GET /api/reshipper/gb/:gbId/orders/:orderId — get order detail ────────────
router.get("/reshipper/gb/:gbId/orders/:orderId", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, orderId));

  res.json({ ...order, lineItems });
});

// ── PATCH /api/reshipper/gb/:gbId/orders/:orderId — update order (restricted) ─
router.patch("/reshipper/gb/:gbId/orders/:orderId", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [existing] = await db
    .select({ id: ordersTable.id, status: ordersTable.status })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  // Reshippers may only update: shipping address/name/city/postcode, order status
  // transitions, tracking number, and QR codes. Payment status, admin messages, and pricing
  // remain admin/organiser-only.
  const { shippingName, shippingAddress, shippingCity, shippingPostcode, status, trackingNumber, trackingNumbers, inpostQrCode, royalMailQrCode } = req.body;

  // Uses the real codebase status values: Draft → Submitted → Processing → Shipped → Completed/Cancelled
  const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    Submitted: ["Processing", "Cancelled"],
    Draft: ["Submitted", "Cancelled"],
    Processing: ["Shipped", "Cancelled"],
    Shipped: ["Completed"],
    Completed: [],
    Cancelled: [],
  };

  const updates: Record<string, unknown> = {};

  if (shippingName !== undefined) updates.shippingName = shippingName ? String(shippingName).trim() : null;
  if (shippingAddress !== undefined) updates.shippingAddress = shippingAddress ? String(shippingAddress).trim() : null;
  if (shippingCity !== undefined) updates.shippingCity = shippingCity ? String(shippingCity).trim() : null;
  if (shippingPostcode !== undefined) updates.shippingPostcode = shippingPostcode ? String(shippingPostcode).trim() : null;
  if (trackingNumbers !== undefined) {
    const cleaned = Array.isArray(trackingNumbers)
      ? (trackingNumbers as unknown[]).filter(v => typeof v === "string" && (v as string).trim()).map(v => (v as string).trim().slice(0, 200)).slice(0, 20)
      : [];
    updates.trackingNumbers = cleaned.length ? cleaned : null;
    updates.trackingNumber = cleaned[0] ?? null;
  } else if (trackingNumber !== undefined) {
    updates.trackingNumber = trackingNumber ? String(trackingNumber).trim() : null;
  }
  for (const [field, value] of [["inpostQrCode", inpostQrCode], ["royalMailQrCode", royalMailQrCode]] as const) {
    if (value !== undefined) {
      if (value === null) {
        updates[field] = null;
      } else if (typeof value === "string") {
        if (!/^data:(image\/(png|jpeg|gif|webp)|application\/pdf);base64,/.test(value)) {
          res.status(400).json({ error: `${field}: file must be a PNG, JPEG, or PDF` }); return;
        }
        if (value.length > 14_000_000) { res.status(400).json({ error: `${field}: file too large (max 10 MB)` }); return; }
        updates[field] = value;
      }
    }
  }
  if (status !== undefined) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `Cannot transition order from ${existing.status} to ${status}` });
      return;
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, orderId))
    .returning();

  res.json(updated);
});

// ── GET /api/reshipper/gb/:gbId/product-names — active products in GB ────────
router.get("/reshipper/gb/:gbId/product-names", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const result = await db.execute(
    sql`SELECT p.name FROM group_buy_products gbp
        JOIN products p ON p.id = gbp.product_id
        WHERE gbp.group_buy_id = ${gbId} AND gbp.active = true
        ORDER BY p.name`,
  );

  res.json((result.rows as { name: string }[]).map(r => r.name));
});

// ── GET /api/reshipper/gb/:gbId/parcels — list parcels ───────────────────────
router.get("/reshipper/gb/:gbId/parcels", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const parcels = await db
    .select()
    .from(gbParcelsTable)
    .where(eq(gbParcelsTable.groupBuyId, gbId))
    .orderBy(desc(gbParcelsTable.createdAt));

  res.json(parcels);
});

// ── POST /api/reshipper/gb/:gbId/parcels — create parcel ─────────────────────
router.post("/reshipper/gb/:gbId/parcels", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { label, carrier, trackingNumber, notes, items, trackingUrl, trackingParams } = req.body;

  if (!label || typeof label !== "string" || label.trim().length === 0) {
    res.status(400).json({ error: "label is required" });
    return;
  }
  if (!trackingNumber || typeof trackingNumber !== "string" || trackingNumber.trim().length === 0) {
    res.status(400).json({ error: "trackingNumber is required" });
    return;
  }

  const id = randomUUID();
  const [parcel] = await db
    .insert(gbParcelsTable)
    .values({
      id,
      groupBuyId: gbId,
      reshipperUsername: assignment.reshipperUsername,
      label: label.trim(),
      carrier: carrier ? String(carrier).trim() : "Auto",
      trackingNumber: trackingNumber.trim(),
      notes: notes ? String(notes).trim() : undefined,
      items: Array.isArray(items) ? items : [],
      trackingUrl: trackingUrl ? String(trackingUrl).trim() : undefined,
      trackingParams: trackingParams && typeof trackingParams === "object" ? trackingParams : undefined,
    })
    .returning();

  res.status(201).json(parcel);
});

// ── PATCH /api/reshipper/gb/:gbId/parcels/:parcelId — update parcel ──────────
router.patch("/reshipper/gb/:gbId/parcels/:parcelId", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [existing] = await db
    .select({ id: gbParcelsTable.id })
    .from(gbParcelsTable)
    .where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));

  if (!existing) { res.status(404).json({ error: "Parcel not found" }); return; }

  const { label, carrier, trackingNumber, notes, items, trackingUrl, trackingParams, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = String(label).trim();
  if (carrier !== undefined) updates.carrier = String(carrier).trim();
  if (trackingNumber !== undefined) updates.trackingNumber = String(trackingNumber).trim();
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;
  if (items !== undefined) updates.items = Array.isArray(items) ? items : [];
  if (trackingUrl !== undefined) updates.trackingUrl = trackingUrl ? String(trackingUrl).trim() : null;
  if (trackingParams !== undefined) updates.trackingParams = trackingParams ?? null;
  if (status !== undefined) updates.status = String(status);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(gbParcelsTable)
    .set(updates)
    .where(eq(gbParcelsTable.id, parcelId))
    .returning();

  res.json(updated);
});

// ── DELETE /api/reshipper/gb/:gbId/parcels/:parcelId — delete parcel ─────────
router.delete("/reshipper/gb/:gbId/parcels/:parcelId", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [existing] = await db
    .select({ id: gbParcelsTable.id })
    .from(gbParcelsTable)
    .where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));

  if (!existing) { res.status(404).json({ error: "Parcel not found" }); return; }

  await db.delete(gbParcelsTable).where(eq(gbParcelsTable.id, parcelId));

  res.json({ ok: true });
});

// ── POST /api/reshipper/gb/:gbId/send-message — individual DM ────────────────
router.post("/reshipper/gb/:gbId/send-message", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { to, message } = req.body as { to: string; message: string };
  if (!to || typeof to !== "string" || !to.trim()) {
    res.status(400).json({ error: "to (Telegram username) is required" });
    return;
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.length > 4000) {
    res.status(400).json({ error: "Message must be under 4000 characters" });
    return;
  }

  const cleanUsername = to.replace(/^@/, "").toLowerCase().trim();
  const [account] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${cleanUsername}`);

  if (!account) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (!account.telegramChatId) {
    res.status(400).json({ error: "This user has not linked their Telegram account" });
    return;
  }

  const [gb] = await db
    .select({ name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  const header = `📦 <b>${gb?.name ?? gbId}</b> · ${assignment.country} · @${req.reshipper!.telegramUsername}`;
  const text = `${header}\n\n${message.trim()}`;
  const ok = await sendTelegramMessage(account.telegramChatId, text, "HTML").catch(() => false);
  if (!ok) {
    res.status(500).json({ error: "Failed to deliver Telegram message" });
    return;
  }

  writeLog("change", "info", "reshipper_direct_message", `Reshipper @${req.reshipper!.telegramUsername} messaged @${account.telegramUsername} in GB ${gbId}`, { gbId, to: account.telegramUsername }).catch(() => {});
  res.json({ ok: true, to: account.telegramUsername });
});

// ── POST /api/reshipper/gb/:gbId/send-test — send a test DM to yourself ────────
router.post("/reshipper/gb/:gbId/send-test", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { message } = req.body as { message: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" }); return;
  }

  const myUsername = req.reshipper!.telegramUsername;
  const [myAccount] = await db
    .select({ telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, myUsername));

  if (!myAccount?.telegramChatId) {
    res.status(400).json({ error: "Your account does not have a linked Telegram chat. Start the bot first." }); return;
  }

  const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const header = `📦 <b>${gb?.name ?? gbId}</b> · ${assignment.country} · @${myUsername}`;
  const text = `🔔 <b>[TEST MESSAGE]</b>\n${header}\n\n${message.trim()}`;
  const ok = await sendTelegramMessage(myAccount.telegramChatId, text, "HTML").catch(() => false);
  if (!ok) { res.status(500).json({ error: "Failed to deliver test message" }); return; }

  res.json({ ok: true });
});

// ── GET /api/reshipper/gb/:gbId/members — list member usernames for DM dropdown ─
router.get("/reshipper/gb/:gbId/members", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, assignment.country)));

  const notDirect2 = sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`;
  const whereClause = countryLeg
    ? and(
        eq(ordersTable.groupBuyId, gbId),
        or(
          eq(ordersTable.reshipperUsername, assignment.reshipperUsername),
          and(isNull(ordersTable.reshipperUsername), eq(ordersTable.countryLegId, countryLeg.id)),
        ),
        isNull(ordersTable.deletedAt),
        notDirect2,
      )
    : and(eq(ordersTable.groupBuyId, gbId), eq(ordersTable.reshipperUsername, assignment.reshipperUsername), isNull(ordersTable.deletedAt), notDirect2);

  const orderRows = await db
    .select({ telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(whereClause);

  const usernames = [...new Set(orderRows.map(o => o.telegramUsername))].sort();

  const bareUsernames = usernames.map(u => u.replace(/^@/, "").toLowerCase());
  const accountRows = bareUsernames.length > 0
    ? await db.select({ telegramUsername: accountsTable.telegramUsername, chatId: accountsTable.telegramChatId })
        .from(accountsTable)
        .where(inArray(sql`lower(${accountsTable.telegramUsername})`, bareUsernames))
    : [];
  const linkedSet = new Set(accountRows.filter(a => a.chatId).map(a => a.telegramUsername.toLowerCase()));

  const members = usernames.map(u => ({
    username: u,
    telegramLinked: linkedSet.has(u.replace(/^@/, "").toLowerCase()),
  }));

  res.json({ members });
});

// ── POST /api/reshipper/gb/:gbId/broadcast — broadcast to GB members ─────────
// filter: "country" (all of reshipper's own members), or any order status string
//         e.g. "Submitted", "Shipped", "Completed"
router.post("/reshipper/gb/:gbId/broadcast", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const { message, filter = "all" } = req.body as { message: string; filter?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.length > 4000) {
    res.status(400).json({ error: "Message must be under 4000 characters" });
    return;
  }

  let targetUsernames: string[];

  // Resolve the country leg once — used for "country" and status-based filters
  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, assignment.country)));

  const baseWhereClause = and(
    eq(ordersTable.groupBuyId, gbId),
    eq(ordersTable.reshipperUsername, assignment.reshipperUsername),
    isNull(ordersTable.deletedAt),
  );

  if (filter === "country") {
    // All of this reshipper's own members
    const orderRows = await db
      .select({ telegramUsername: ordersTable.telegramUsername })
      .from(ordersTable)
      .where(baseWhereClause);
    targetUsernames = [...new Set(orderRows.map(o => o.telegramUsername))];
  } else {
    // Status-based filter, scoped to this reshipper's country/assignment
    const orderRows = await db
      .select({ telegramUsername: ordersTable.telegramUsername })
      .from(ordersTable)
      .where(and(baseWhereClause, eq(ordersTable.status, filter)));
    targetUsernames = [...new Set(orderRows.map(o => o.telegramUsername))];
  }

  if (targetUsernames.length === 0) {
    res.json({ ok: true, sent: 0, skipped: 0, total: 0 });
    return;
  }

  const accounts = await db
    .select({ telegramUsername: accountsTable.telegramUsername, telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(inArray(accountsTable.telegramUsername, targetUsernames));

  const [gb] = await db
    .select({ name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  const header = `📦 <b>${gb?.name ?? gbId}</b> · ${assignment.country} · @${req.reshipper!.telegramUsername}`;
  const text = `${header}\n\n${message.trim()}`;

  let sent = 0;
  let skipped = 0;

  for (const acct of accounts) {
    if (!acct.telegramChatId) { skipped++; continue; }
    const ok = await sendTelegramMessage(acct.telegramChatId, text, "HTML").catch(() => false);
    if (ok) { sent++; } else { skipped++; }
  }

  writeLog("change", "info", "reshipper_broadcast", `Reshipper @${req.reshipper!.telegramUsername} broadcast to GB ${gbId} filter=${filter} (sent: ${sent}, skipped: ${skipped})`, { gbId, filter, sent, skipped }).catch(() => {});

  res.json({ ok: true, sent, skipped, total: accounts.length });
});

// ── Helper: resolve members eligible for a parcel broadcast ──────────────────
// Returns { chatId, username } for members whose orders contain at least one
// item that matches the parcel's item list (any overlap).
// If parcel has NO items, matches all members assigned to this reshipper.
async function resolveParcelRecipients(
  gbId: string,
  parcelId: string,
  reshipperUsername: string,
  reshipperCountry: string,
  targetUsernames: string[] | null, // null = all eligible members
): Promise<{ chatId: string; username: string; matchedItems: string[] }[]> {
  const [parcel] = await db
    .select({ items: gbParcelsTable.items })
    .from(gbParcelsTable)
    .where(eq(gbParcelsTable.id, parcelId));

  if (!parcel) { console.log(`[resolveParcelRecipients] parcel ${parcelId} not found`); return []; }

  const parcelItems = (parcel.items ?? []) as { name: string; qty: number }[];
  const parcelItemNames = new Set(parcelItems.map(i => i.name.trim().toLowerCase()));
  const requireItemMatch = parcelItemNames.size > 0;
  console.log(`[resolveParcelRecipients] parcel items (${parcelItems.length}):`, [...parcelItemNames]);

  // Logic: find the country leg for this reshipper, then within that leg
  // only include orders explicitly assigned to this reshipper (reshipperUsername set).
  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, reshipperCountry)));

  // Orders must be: assigned to this reshipper, OR unassigned and in this reshipper's leg.
  // Mirrors the same logic used by the /reshipper/gb/:gbId/orders endpoint.
  const orderWhereClause = countryLeg
    ? and(
        eq(ordersTable.groupBuyId, gbId),
        or(
          eq(ordersTable.reshipperUsername, reshipperUsername),
          and(isNull(ordersTable.reshipperUsername), eq(ordersTable.countryLegId, countryLeg.id)),
        ),
        isNull(ordersTable.deletedAt),
      )
    : and(
        eq(ordersTable.groupBuyId, gbId),
        eq(ordersTable.reshipperUsername, reshipperUsername),
        isNull(ordersTable.deletedAt),
      );

  console.log(`[resolveParcelRecipients] scope: reshipper="${reshipperUsername}" country="${reshipperCountry}" leg=${countryLeg?.id ?? "none"}`);
  const orderRows = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(orderWhereClause);
  console.log(`[resolveParcelRecipients] GB ${gbId} has ${orderRows.length} orders assigned to this reshipper`);

  // If specific usernames are given, filter to those
  const candidateOrders = targetUsernames
    ? orderRows.filter(o => {
        const bare = o.telegramUsername.replace(/^@/, "").toLowerCase();
        return targetUsernames.some(u => u.replace(/^@/, "").toLowerCase() === bare);
      })
    : orderRows;

  if (candidateOrders.length === 0) return [];

  // Map username -> matched item names (preserving original casing)
  const usernameToItems = new Map<string, Set<string>>();

  if (!requireItemMatch) {
    // No items on parcel — include everyone
    for (const o of candidateOrders) {
      const bare = o.telegramUsername.replace(/^@/, "").toLowerCase();
      if (!usernameToItems.has(bare)) usernameToItems.set(bare, new Set());
    }
  } else {
    // Item match: fetch line items for candidate orders
    const orderIds = candidateOrders.map(o => o.id);
    const lineItems = await db
      .select({ orderId: orderLineItemsTable.orderId, productName: orderLineItemsTable.productName })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    const orderToUsername = new Map(candidateOrders.map(o => [o.id, o.telegramUsername.replace(/^@/, "").toLowerCase()]));
    const sampleNames = lineItems.slice(0, 5).map(li => li.productName);
    console.log(`[resolveParcelRecipients] ${lineItems.length} line items across ${candidateOrders.length} orders. Sample names:`, sampleNames);

    for (const li of lineItems) {
      const liLower = li.productName.trim().toLowerCase();
      const matched = parcelItemNames.has(liLower);
      if (matched) {
        const uname = orderToUsername.get(li.orderId);
        if (uname) {
          if (!usernameToItems.has(uname)) usernameToItems.set(uname, new Set());
          usernameToItems.get(uname)!.add(li.productName.trim());
        }
      }
    }
    console.log(`[resolveParcelRecipients] matched usernames: ${usernameToItems.size}`, [...usernameToItems.keys()]);
  }

  if (usernameToItems.size === 0) return [];

  const eligibleUsernames = [...usernameToItems.keys()];

  // Resolve Telegram chat IDs
  const accountRows = await db
    .select({ telegramUsername: accountsTable.telegramUsername, telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(inArray(sql`lower(${accountsTable.telegramUsername})`, eligibleUsernames));

  return accountRows
    .filter(a => a.telegramChatId)
    .map(a => ({
      chatId: a.telegramChatId!,
      username: a.telegramUsername,
      matchedItems: [...(usernameToItems.get(a.telegramUsername.toLowerCase()) ?? new Set())],
    }));
}

// ── GET /api/reshipper/gb/:gbId/parcels/:parcelId/broadcast-candidates ────────
// Returns members eligible to receive a broadcast for this parcel (item-matched).
router.get("/reshipper/gb/:gbId/parcels/:parcelId/broadcast-candidates", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const recipients = await resolveParcelRecipients(gbId, parcelId, assignment.reshipperUsername, assignment.country, null);
  console.log(`[broadcast-candidates] GB=${gbId} parcel=${parcelId} → ${recipients.length} recipient(s):`, recipients.map(r => r.username));
  res.json({ members: recipients.map(r => ({ username: r.username })) });
});

// ── POST /api/reshipper/gb/:gbId/parcels/:parcelId/broadcast ─────────────────
// Broadcast a new-parcel announcement to item-matched members.
// Body: { usernames?: string[], note?: string }
//   usernames: specific subset to send to (must still be item-eligible); omit for all eligible
//   note: optional custom message appended after the standard text
router.post("/reshipper/gb/:gbId/parcels/:parcelId/broadcast", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [parcel] = await db.select().from(gbParcelsTable)
    .where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  const { usernames, note } = req.body as { usernames?: string[]; note?: string };

  const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const header = `📦 <b>${gb?.name ?? gbId}</b> · ${assignment.country} · @${req.reshipper!.telegramUsername}`;

  const appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");

  const recipients = await resolveParcelRecipients(gbId, parcelId, assignment.reshipperUsername, assignment.country, usernames ?? null);

  if (recipients.length === 0) {
    res.json({ ok: true, sent: 0, skipped: 0, total: 0 });
    return;
  }

  let sent = 0;
  let skipped = 0;

  const { template: dispatchTpl } = await getTemplate("bot_reshipper_dispatch_optin");
  for (const { chatId, username, matchedItems } of recipients) {
    const itemLine = matchedItems.length > 0
      ? `\nContaining:\n${matchedItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}`
      : "";
    const noteLine = note ? `\n📝 ${note.trim()}` : "";
    const bodyText = renderTemplate(dispatchTpl, {
      gb_name: gb?.name ?? gbId,
      parcel_label: parcel.label,
      items_line: itemLine,
      note_line: noteLine,
    });
    const text = `${header}\n\n${bodyText}`;

    // Member-specific tracking URL — shows all parcels for this member in the GB
    const bareUsername = username.replace(/^@/, "");
    const trackUrl = `${appUrl}/track/gb/${gbId}/member/${encodeURIComponent(bareUsername)}`;
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "🔔 Yes, notify me", callback_data: `pn:yes:${parcelId}` },
          { text: "❌ No thanks", callback_data: `pn:no:${parcelId}` },
        ],
        [
          { text: "📦 Check status", callback_data: `ps_menu:${parcelId}` },
          { text: "📦 View all packages", url: trackUrl },
        ],
      ],
    };

    const result = await sendTelegramMessageFull(chatId, text, "HTML", { recipientType: "user", recipientUsername: username }, { reply_markup: replyMarkup });
    if (result.ok) { sent++; } else { skipped++; }
  }

  writeLog("change", "info", "reshipper_parcel_broadcast", `Reshipper @${req.reshipper!.telegramUsername} broadcast parcel ${parcelId} in GB ${gbId} (sent: ${sent})`, { gbId, parcelId, sent, skipped }).catch(() => {});
  res.json({ ok: true, sent, skipped, total: recipients.length });
});

// ── POST /api/reshipper/gb/:gbId/parcels/:parcelId/test-broadcast ─────────────
// Send a test broadcast to the reshipper themselves.
router.post("/reshipper/gb/:gbId/parcels/:parcelId/test-broadcast", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [parcel] = await db.select().from(gbParcelsTable)
    .where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  const { type = "new", note } = req.body as { type?: "new" | "update"; note?: string };

  const myUsername = req.reshipper!.telegramUsername;
  const [myAccount] = await db
    .select({ telegramChatId: accountsTable.telegramChatId })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, myUsername));

  if (!myAccount?.telegramChatId) {
    res.status(400).json({ error: "Your account does not have a linked Telegram chat. Start the bot first." });
    return;
  }

  const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const header = `📦 <b>${gb?.name ?? gbId}</b> · ${assignment.country} · @${myUsername}`;

  const tn = parcel.trackingNumber ?? "";
  const masked = tn.length > 7 ? `${tn.slice(0, 3)}${"•".repeat(Math.min(tn.length - 7, 8))}${tn.slice(-4)}` : tn;

  const allItems = ((parcel.items ?? []) as { name: string }[]).map(i => i.name).join(", ");
  let bodyText: string;
  if (type === "update") {
    bodyText = [
      `📍 <b>${parcel.label}</b> — status update`,
      `Status: <b>In Transit</b>`,
      note ? `📝 ${note.trim()}` : null,
    ].filter(Boolean).join("\n");
  } else {
    const allItemsList = allItems ? `\nContaining:\n${((parcel.items ?? []) as { name: string }[]).map((item, i) => `${i + 1}. ${item.name}`).join("\n")}` : "";
    bodyText = [
      `🚚 <b>${parcel.label}</b> has been dispatched!${allItemsList}`,
      note ? `📝 ${note.trim()}` : null,
      ``,
      `Do you want to receive shipping updates through the bot?`,
    ].filter(l => l !== null).join("\n");
  }

  const text = `🔔 <b>[TEST MESSAGE]</b>\n${header}\n\n${bodyText}`;
  const _appUrl = (process.env["APP_URL"] ?? "https://saltandpeps.co.uk").replace(/\/+$/, "");
  const replyMarkup = type === "new" ? {
    inline_keyboard: [
      [
        { text: "🔔 Yes, notify me", callback_data: `pn:yes:${parcelId}` },
        { text: "❌ No thanks", callback_data: `pn:no:${parcelId}` },
      ],
      [
        { text: "📦 Check status", callback_data: `ps_menu:${parcelId}` },
        { text: "🌐 Track on site", url: `${_appUrl}/track/parcel/${parcelId}` },
      ],
    ],
  } : {
    inline_keyboard: [[
      { text: "📦 Check status", callback_data: `ps_menu:${parcelId}` },
      { text: "🌐 Track on site", url: `${_appUrl}/track/parcel/${parcelId}` },
    ]],
  };

  const result = await sendTelegramMessageFull(myAccount.telegramChatId, text, "HTML", { recipientType: "user" }, { reply_markup: replyMarkup });
  if (!result.ok) { res.status(500).json({ error: "Failed to deliver test message" }); return; }
  res.json({ ok: true });
});

// ── POST /api/reshipper/gb/:gbId/parcels/:parcelId/force-refresh ──────────────
// Immediately polls 17track for the latest status of a single parcel.
router.post("/reshipper/gb/:gbId/parcels/:parcelId/force-refresh", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [parcel] = await db.select({ id: gbParcelsTable.id, groupBuyId: gbParcelsTable.groupBuyId })
    .from(gbParcelsTable)
    .where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  try {
    const result = await refreshSingleGbParcel(parcelId);
    res.json({ ok: true, status: result.status, updated: result.updated });
  } catch (err) {
    console.error(`[force-refresh] Error for parcel ${parcelId}:`, err);
    res.status(500).json({ error: "Tracking refresh failed" });
  }
});

// ── GET /api/reshipper/gb/:gbId/all-orders-qr — bulk QR viewer data ───────────
// Returns all orders for this reshipper's GB with QR codes and qrPosted flag,
// structured for the QR viewer UI.
router.get("/reshipper/gb/:gbId/all-orders-qr", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const [countryLeg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, assignment.country)));

  const notDirect = sql`(${ordersTable.directShippingRequested} IS NOT TRUE)`;
  const whereClause = countryLeg
    ? and(
        eq(ordersTable.groupBuyId, gbId),
        or(
          eq(ordersTable.reshipperUsername, assignment.reshipperUsername),
          and(isNull(ordersTable.reshipperUsername), eq(ordersTable.countryLegId, countryLeg.id)),
        ),
        isNull(ordersTable.deletedAt),
        notDirect,
      )
    : and(eq(ordersTable.groupBuyId, gbId), eq(ordersTable.reshipperUsername, assignment.reshipperUsername), isNull(ordersTable.deletedAt), notDirect);

  const rows = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status,
      deliveryMethod: ordersTable.deliveryMethod,
      inpostQrCode: ordersTable.inpostQrCode,
      royalMailQrCode: ordersTable.royalMailQrCode,
      qrCodes: ordersTable.qrCodes,
      qrPosted: ordersTable.qrPosted,
    })
    .from(ordersTable)
    .where(whereClause)
    .orderBy(desc(ordersTable.createdAt));

  const [gb] = await db
    .select({
      name: groupBuysTable.name,
      qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
      qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
      qrUploadCouriers: groupBuysTable.qrUploadCouriers,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  // Build the list of QR-enabled courier names for this GB
  const qrCouriers: string[] = [];
  if (gb?.qrUploadInpostEnabled) qrCouriers.push("inpost");
  if (gb?.qrUploadRoyalMailEnabled) qrCouriers.push("royal mail");
  if (Array.isArray(gb?.qrUploadCouriers)) {
    gb!.qrUploadCouriers.forEach(c => qrCouriers.push(c.toLowerCase()));
  }

  // If QR couriers are configured, only show orders with a matching delivery method.
  // If none configured, fall through and show all (safe fallback).
  const filtered = qrCouriers.length > 0
    ? rows.filter(o => {
        if (!o.deliveryMethod) return false;
        const dm = o.deliveryMethod.toLowerCase();
        return qrCouriers.some(c => dm.includes(c));
      })
    : rows;

  res.json({ gbName: gb?.name ?? gbId, orders: filtered });
});

// ── PATCH /api/reshipper/gb/:gbId/orders/:orderId/qr-posted ──────────────────
// Toggles the qrPosted flag for an order.
router.patch("/reshipper/gb/:gbId/orders/:orderId/qr-posted", requireReshipper, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const assignment = await verifyReshipperAssignment(req, res, gbId);
  if (!assignment) return;

  const posted = req.body?.posted;
  if (typeof posted !== "boolean") {
    res.status(400).json({ error: "posted must be a boolean" });
    return;
  }

  const [existing] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));

  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ qrPosted: posted })
    .where(eq(ordersTable.id, orderId))
    .returning({ id: ordersTable.id, qrPosted: ordersTable.qrPosted });

  res.json({ id: updated.id, qrPosted: updated.qrPosted });
});

export default router;

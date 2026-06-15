import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  groupBuysTable,
  groupBuyProductsTable,
  groupBuyDeliveryMethodsTable,
  accountsTable,
  accountGroupBuysTable,
  gbWaitlistTable,
  gbReshippersTable,
  gbCountryLegsTable,
  productsTable,
  ordersTable,
  orderLineItemsTable,
  routingHistoryTable,
  fs3SubmissionsTable,
  GROUP_BUY_STATUSES,
  type GroupBuy,
  type GroupBuyProduct,
} from "@workspace/db";
import { eq, and, isNull, or, sql, asc, desc, inArray, isNotNull } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { requireAdmin } from "../middleware/require-admin";
import { normalizeTg } from "../lib/normalize";
import { notifyUser, sendTelegramMessage, sendAdminMessage, notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { createAlert } from "../lib/create-alert";
import { writeLog } from "../lib/audit-log";

function shortId(len = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

async function uniqueGroupBuyId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = shortId(5);
    const [existing] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
    if (!existing) return id;
  }
  return randomUUID().slice(0, 8);
}

const router: IRouter = Router();
const BCRYPT_ROUNDS = 12;

function parseInfoCards(raw: string | null): unknown[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

function parseShippingOptions(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

function parseAdminFeeCountries(raw: string | null | undefined): { country: string; amount: number; enabled: boolean }[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as { country: string; amount: number; enabled: boolean }[]; } catch { return []; }
}

function parseSharedShippingCountries(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

/** Returns an error string if shippingOptions are malformed, or null if valid. */
function validateShippingOptions(opts: unknown): string | null {
  if (!Array.isArray(opts)) return "shippingOptions must be an array";
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    if (typeof o !== "object" || o === null) return `shippingOptions[${i}] must be an object`;
    const { id, label, price } = o as Record<string, unknown>;
    if (typeof id !== "string" || id.trim().length === 0) return `shippingOptions[${i}].id must be a non-empty string`;
    if (typeof label !== "string" || label.trim().length === 0) return `shippingOptions[${i}].label must be a non-empty string`;
    const numPrice = typeof price === "number" ? price : parseFloat(String(price));
    if (!isFinite(numPrice) || numPrice < 0) return `shippingOptions[${i}].price must be a non-negative number`;
  }
  return null;
}

// ── GET /admin/group-buys — list all GBs ──────────────────────
router.get("/admin/group-buys", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rows = await db.select().from(groupBuysTable).orderBy(groupBuysTable.sortOrder, groupBuysTable.createdAt);

  // Count orders per group buy in one query (exclude soft-deleted)
  const countRows = await db
    .select({ groupBuyId: ordersTable.groupBuyId, count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(isNull(ordersTable.deletedAt))
    .groupBy(ordersTable.groupBuyId);
  const countMap = new Map(countRows.map(r => [r.groupBuyId, r.count]));

  res.json(rows.map((gb: GroupBuy) => ({
    ...gb,
    infoCards: parseInfoCards(gb.infoCards),
    shippingOptions: parseShippingOptions(gb.shippingOptions),
    adminFeeCountries: parseAdminFeeCountries((gb as Record<string, unknown>).adminFeeCountries as string),
    sharedShippingCountries: parseSharedShippingCountries((gb as Record<string, unknown>).sharedShippingCountries as string),
    orderCount: countMap.get(gb.id) ?? 0,
  })));
});

// ── GET /admin/group-buys/:id/orders-summary — orders list for the list view dropdown ─
// Optional query param: ?countryLegId=<legId>  — filter by country leg
router.get("/admin/group-buys/:id/orders-summary", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const countryLegFilter = typeof req.query["countryLegId"] === "string" && req.query["countryLegId"]
    ? req.query["countryLegId"]
    : null;
  const whereClause = countryLegFilter
    ? and(eq(ordersTable.groupBuyId, id), eq(ordersTable.countryLegId, countryLegFilter), isNull(ordersTable.deletedAt))
    : and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt));
  const rows = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal,
      status: ordersTable.status,
      currency: groupBuysTable.currency,
      countryLegId: ordersTable.countryLegId,
    })
    .from(ordersTable)
    .leftJoin(groupBuysTable, eq(ordersTable.groupBuyId, groupBuysTable.id))
    .where(whereClause)
    .orderBy(asc(ordersTable.code));
  res.json(rows);
});

// ── POST /admin/group-buys — create a GB ──────────────────────
router.post("/admin/group-buys", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { name, description, status, closeDate, invitePin, manufacturer, manufacturerCountry, infoCards, currency, sortOrder, labTestSupplier, paymentMessageEnabled, paymentMessage, paymentsEnabled, memberLimit, minMembers, maxKitsPerCustomer, maxKitsTotal, hiddenFromList, forcedUsernames, shippingOptions, allowedCountries, excludedCountries, blockedAccounts, adminFeeEnabled, adminFeeAmount, adminFeeLabel } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (status && !GROUP_BUY_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${GROUP_BUY_STATUSES.join(", ")}` });
    return;
  }

  if (invitePin && (typeof invitePin !== "string" || !/^\d{4}$/.test(invitePin.trim()))) {
    res.status(400).json({ error: "invitePin must be exactly 4 numeric digits" });
    return;
  }

  const parsedMemberLimit = (memberLimit != null && memberLimit !== "") ? parseInt(String(memberLimit)) : null;
  if (parsedMemberLimit !== null && (isNaN(parsedMemberLimit) || parsedMemberLimit < 1)) {
    res.status(400).json({ error: "memberLimit must be a positive integer" });
    return;
  }

  if (shippingOptions !== undefined && shippingOptions !== null) {
    const soError = validateShippingOptions(shippingOptions);
    if (soError) { res.status(400).json({ error: soError }); return; }
  }

  let invitePinHash: string | undefined;
  let invitePinPlain: string | undefined;
  if (invitePin && typeof invitePin === "string" && invitePin.trim().length > 0) {
    invitePinPlain = invitePin.trim();
    invitePinHash = await bcrypt.hash(invitePinPlain, BCRYPT_ROUNDS);
  }

  const id = await uniqueGroupBuyId();

  const [gb] = await db.insert(groupBuysTable).values({
    id,
    name: name.trim(),
    description: description ? String(description).trim() : undefined,
    status: status ?? "draft",
    closeDate: closeDate ? new Date(closeDate) : undefined,
    invitePin: invitePinPlain,
    invitePinHash,
    manufacturer: manufacturer ? String(manufacturer).trim() : undefined,
    manufacturerCountry: manufacturerCountry ? String(manufacturerCountry).trim() : undefined,
    labTestSupplier: labTestSupplier ? String(labTestSupplier).trim() : undefined,
    infoCards: infoCards ? JSON.stringify(infoCards) : undefined,
    currency: currency ?? "USD",
    sortOrder: sortOrder != null ? parseInt(String(sortOrder)) : undefined,
    paymentMessageEnabled: paymentMessageEnabled != null ? Boolean(paymentMessageEnabled) : false,
    paymentMessage: paymentMessage ? String(paymentMessage).trim() : undefined,
    paymentsEnabled: paymentsEnabled != null ? Boolean(paymentsEnabled) : true,
    memberLimit: parsedMemberLimit,
    minMembers: (minMembers != null && minMembers !== "") ? parseInt(String(minMembers)) : undefined,
    maxKitsPerCustomer: (maxKitsPerCustomer != null && maxKitsPerCustomer !== "") ? parseInt(String(maxKitsPerCustomer)) : undefined,
    maxKitsTotal: (maxKitsTotal != null && maxKitsTotal !== "") ? parseInt(String(maxKitsTotal)) : undefined,
    hiddenFromList: hiddenFromList != null ? Boolean(hiddenFromList) : false,
    forcedUsernames: Array.isArray(forcedUsernames) ? forcedUsernames : undefined,
    shippingOptions: shippingOptions ? JSON.stringify(shippingOptions) : undefined,
    allowedCountries: Array.isArray(allowedCountries) ? allowedCountries : undefined,
    excludedCountries: Array.isArray(excludedCountries) ? excludedCountries : undefined,
    blockedAccounts: Array.isArray(blockedAccounts) ? blockedAccounts : undefined,
    adminFeeEnabled: adminFeeEnabled != null ? Boolean(adminFeeEnabled) : false,
    adminFeeAmount: adminFeeAmount != null && adminFeeAmount !== "" ? parseFloat(String(adminFeeAmount)).toFixed(2) as any : undefined,
    adminFeeLabel: adminFeeLabel ? String(adminFeeLabel).trim() : undefined,
  }).returning();

  createAlert("system", "medium", "New Group Buy Created",
    `Group buy "${gb.name}" (${gb.id}) was created. Status: ${gb.status ?? "draft"}.`,
    { linkUrl: `#group-buys:${gb.id}`, relatedEntityId: gb.id },
  ).catch(() => {});

  sendAdminFromTemplate("admin_organiser_update",
    { organiser_username: "admin", update_type: "New Group Buy Created", details: `${gb.name} — Status: ${gb.status ?? "draft"}` },
  ).catch(() => {});

  res.status(201).json({ ...gb, infoCards: parseInfoCards(gb.infoCards), shippingOptions: parseShippingOptions(gb.shippingOptions), adminFeeCountries: [] });
});

// ── PATCH /admin/group-buys/:id — update GB ───────────────────
router.patch("/admin/group-buys/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { name, description, status, closeDate, invitePin, manufacturer, manufacturerCountry, infoCards, currency, sortOrder, testingEnabled, labTestSupplier, paymentMessageEnabled, paymentMessage, paymentsEnabled, memberLimit, minMembers, maxKitsPerCustomer, maxKitsTotal, hiddenFromList, forcedUsernames, shippingOptions, allowedCountries, excludedCountries, blockedAccounts, adminFeeEnabled, adminFeeAmount, adminFeeLabel, adminFeeCountries, qrUploadInpostEnabled, qrUploadRoyalMailEnabled, qrUploadMessage, orderPageMessage, countryLegsEnabled, vendorShippingEnabled, vendorShippingMessage, vendorShippingAmount, sharedShippingCountries, allowExtraOrders, directShippingEnabled, directShippingVendorId } = req.body;

  const [existing] = await db.select({ id: groupBuysTable.id, name: groupBuysTable.name, status: groupBuysTable.status }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  if (status && !GROUP_BUY_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${GROUP_BUY_STATUSES.join(", ")}` });
    return;
  }

  // Build a strongly-typed partial update object — no any casts
  const updates: Partial<Omit<GroupBuy, "id" | "createdAt" | "updatedAt">> = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (status !== undefined) updates.status = status;
  if (closeDate !== undefined) updates.closeDate = closeDate ? new Date(closeDate) : null;
  if (manufacturer !== undefined) updates.manufacturer = manufacturer ? String(manufacturer).trim() : null;
  if (manufacturerCountry !== undefined) updates.manufacturerCountry = manufacturerCountry ? String(manufacturerCountry).trim() : null;
  if (infoCards !== undefined) updates.infoCards = infoCards ? JSON.stringify(infoCards) : null;
  if (currency !== undefined) updates.currency = String(currency).trim();
  if (sortOrder !== undefined) updates.sortOrder = sortOrder != null ? parseInt(String(sortOrder)) : null;
  if (testingEnabled !== undefined) updates.testingEnabled = Boolean(testingEnabled);
  if (labTestSupplier !== undefined) updates.labTestSupplier = labTestSupplier ? String(labTestSupplier).trim() : null;
  if (paymentMessageEnabled !== undefined) updates.paymentMessageEnabled = Boolean(paymentMessageEnabled);
  if (req.body.directShippingPaymentsEnabled !== undefined) updates.directShippingPaymentsEnabled = Boolean(req.body.directShippingPaymentsEnabled);
  if (paymentMessage !== undefined) updates.paymentMessage = paymentMessage ? String(paymentMessage).trim() : null;
  if (paymentsEnabled !== undefined) updates.paymentsEnabled = Boolean(paymentsEnabled);
  if (memberLimit !== undefined) {
    const parsedMemberLimitPatch = (memberLimit != null && memberLimit !== "") ? parseInt(String(memberLimit)) : null;
    if (parsedMemberLimitPatch !== null && (isNaN(parsedMemberLimitPatch) || parsedMemberLimitPatch < 1)) {
      res.status(400).json({ error: "memberLimit must be a positive integer" });
      return;
    }
    updates.memberLimit = parsedMemberLimitPatch;
  }
  if (minMembers !== undefined) {
    updates.minMembers = (minMembers != null && minMembers !== "") ? parseInt(String(minMembers)) : null;
  }
  if (maxKitsPerCustomer !== undefined) {
    updates.maxKitsPerCustomer = (maxKitsPerCustomer != null && maxKitsPerCustomer !== "") ? parseInt(String(maxKitsPerCustomer)) : null;
  }
  if (maxKitsTotal !== undefined) {
    updates.maxKitsTotal = (maxKitsTotal != null && maxKitsTotal !== "") ? parseInt(String(maxKitsTotal)) : null;
  }
  if (hiddenFromList !== undefined) {
    updates.hiddenFromList = Boolean(hiddenFromList);
  }
  if (forcedUsernames !== undefined) {
    (updates as Record<string, unknown>)["forcedUsernames"] = Array.isArray(forcedUsernames) ? forcedUsernames : null;
  }
  if (shippingOptions !== undefined) {
    if (shippingOptions !== null) {
      const soError = validateShippingOptions(shippingOptions);
      if (soError) { res.status(400).json({ error: soError }); return; }
    }
    updates.shippingOptions = shippingOptions ? JSON.stringify(shippingOptions) : null;
  }
  if (allowedCountries !== undefined) {
    (updates as Record<string, unknown>)["allowedCountries"] = Array.isArray(allowedCountries) ? allowedCountries : null;
  }
  if (excludedCountries !== undefined) {
    (updates as Record<string, unknown>)["excludedCountries"] = Array.isArray(excludedCountries) ? excludedCountries : null;
  }
  if (blockedAccounts !== undefined) {
    (updates as Record<string, unknown>)["blockedAccounts"] = Array.isArray(blockedAccounts) ? blockedAccounts : null;
  }
  if (adminFeeEnabled !== undefined) updates.adminFeeEnabled = Boolean(adminFeeEnabled);
  if (adminFeeAmount !== undefined) {
    (updates as Record<string, unknown>)["adminFeeAmount"] = adminFeeAmount != null && adminFeeAmount !== "" ? parseFloat(String(adminFeeAmount)).toFixed(2) : null;
  }
  if (adminFeeLabel !== undefined) updates.adminFeeLabel = adminFeeLabel ? String(adminFeeLabel).trim() : null;
  if (adminFeeCountries !== undefined) {
    (updates as Record<string, unknown>)["adminFeeCountries"] = Array.isArray(adminFeeCountries) ? JSON.stringify(adminFeeCountries) : null;
  }
  if (qrUploadInpostEnabled !== undefined) updates.qrUploadInpostEnabled = Boolean(qrUploadInpostEnabled);
  if (qrUploadRoyalMailEnabled !== undefined) updates.qrUploadRoyalMailEnabled = Boolean(qrUploadRoyalMailEnabled);
  if (qrUploadMessage !== undefined) updates.qrUploadMessage = qrUploadMessage ? String(qrUploadMessage).trim() : null;
  if (orderPageMessage !== undefined) updates.orderPageMessage = orderPageMessage ? String(orderPageMessage).trim() : null;
  if (req.body.paymentBanner !== undefined) updates.paymentBanner = req.body.paymentBanner ? String(req.body.paymentBanner).trim() : null;
  if (countryLegsEnabled !== undefined) updates.countryLegsEnabled = Boolean(countryLegsEnabled);
  if (vendorShippingEnabled !== undefined) updates.vendorShippingEnabled = Boolean(vendorShippingEnabled);
  if (vendorShippingMessage !== undefined) updates.vendorShippingMessage = vendorShippingMessage ? String(vendorShippingMessage).trim() : null;
  if (vendorShippingAmount !== undefined) {
    (updates as Record<string, unknown>)["vendorShippingAmount"] = vendorShippingAmount != null && vendorShippingAmount !== "" ? parseFloat(String(vendorShippingAmount)).toFixed(2) : null;
  }
  if ((req.body as Record<string, unknown>).organiserOrderEditEnabled !== undefined) {
    updates.organiserOrderEditEnabled = Boolean((req.body as Record<string, unknown>).organiserOrderEditEnabled);
  }
  const body = req.body as Record<string, unknown>;
  if (body.organiserCanEditStatus !== undefined) updates.organiserCanEditStatus = Boolean(body.organiserCanEditStatus);
  if (body.organiserCanEditPaymentStatus !== undefined) updates.organiserCanEditPaymentStatus = Boolean(body.organiserCanEditPaymentStatus);
  if (body.organiserCanEditTracking !== undefined) updates.organiserCanEditTracking = Boolean(body.organiserCanEditTracking);
  if (body.organiserCanEditNotes !== undefined) updates.organiserCanEditNotes = Boolean(body.organiserCanEditNotes);
  if (body.organiserCanEditTxId !== undefined) updates.organiserCanEditTxId = Boolean(body.organiserCanEditTxId);
  if (body.organiserCanEditQuantities !== undefined) updates.organiserCanEditQuantities = Boolean(body.organiserCanEditQuantities);
  if (body.showStockView !== undefined) updates.showStockView = Boolean(body.showStockView);
  if (body.allowOrderAddons !== undefined) updates.allowOrderAddons = Boolean(body.allowOrderAddons);
  if (body.allowEditOrderWhenClosed !== undefined) updates.allowEditOrderWhenClosed = Boolean(body.allowEditOrderWhenClosed);
  if (body.allowEditAddressWhenClosed !== undefined) updates.allowEditAddressWhenClosed = Boolean(body.allowEditAddressWhenClosed);
  if (body.allowDeleteOrderWhenClosed !== undefined) updates.allowDeleteOrderWhenClosed = Boolean(body.allowDeleteOrderWhenClosed);
  if (body.hidePricesWhenClosed !== undefined) updates.hidePricesWhenClosed = Boolean(body.hidePricesWhenClosed);
  if (body.hideCostBreakdownWhenClosed !== undefined) updates.hideCostBreakdownWhenClosed = Boolean(body.hideCostBreakdownWhenClosed);
  if (body.hideGrandTotalWhenClosed !== undefined) updates.hideGrandTotalWhenClosed = Boolean(body.hideGrandTotalWhenClosed);
  if (body.hidePricesOnInvoice !== undefined) updates.hidePricesOnInvoice = Boolean(body.hidePricesOnInvoice);
  if (body.hidePricesOnGbViewer !== undefined) updates.hidePricesOnGbViewer = Boolean(body.hidePricesOnGbViewer);
  if (body.hidePricesOnOrderForm !== undefined) updates.hidePricesOnOrderForm = Boolean(body.hidePricesOnOrderForm);
  if (body.hideOrderTotalOnOrderForm !== undefined) updates.hideOrderTotalOnOrderForm = Boolean(body.hideOrderTotalOnOrderForm);
  if (body.allowHalfKits !== undefined) updates.allowHalfKits = Boolean(body.allowHalfKits);
  if (body.allowReshipperCode !== undefined) updates.allowReshipperCode = Boolean(body.allowReshipperCode);
  if (allowExtraOrders !== undefined) updates.allowExtraOrders = Boolean(allowExtraOrders);
  if (sharedShippingCountries !== undefined) {
    (updates as Record<string, unknown>)["sharedShippingCountries"] = Array.isArray(sharedShippingCountries) ? JSON.stringify(sharedShippingCountries) : null;
  }
  if (directShippingEnabled !== undefined) updates.directShippingEnabled = Boolean(directShippingEnabled);
  if (directShippingVendorId !== undefined) updates.directShippingVendorId = directShippingVendorId ? String(directShippingVendorId).trim() : null;

  if (invitePin !== undefined) {
    if (invitePin === null || invitePin === "") {
      updates.invitePin = null;
      updates.invitePinHash = null;
    } else {
      const pinStr = String(invitePin).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        res.status(400).json({ error: "invitePin must be exactly 4 numeric digits" });
        return;
      }
      updates.invitePin = pinStr;
      updates.invitePinHash = await bcrypt.hash(pinStr, BCRYPT_ROUNDS);
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(groupBuysTable)
    .set(updates)
    .where(eq(groupBuysTable.id, id))
    .returning();

  if (status !== undefined && status !== existing.status) {
    const gbLabel = existing.name ?? id;
    createAlert("system", "medium", "Group Buy Status Changed",
      `GB "${gbLabel}" changed from ${existing.status ?? "—"} → ${status}`,
      { linkUrl: `#group-buys:${id}`, relatedEntityId: id },
    ).catch(() => {});
    sendAdminFromTemplate("admin_organiser_update",
      { organiser_username: "admin", update_type: "GB Status Changed", details: `${gbLabel}: ${existing.status ?? "—"} → ${status}` },
    ).catch(() => {});
  }

  writeLog("change", "info", "admin_gb_updated",
    `Admin updated GB "${existing.name ?? id}" settings`,
    { gbId: id, gbName: existing.name, changedFields: Object.keys(updates) },
  ).catch(() => {});

  res.json({ ...updated, infoCards: parseInfoCards(updated.infoCards), shippingOptions: parseShippingOptions(updated.shippingOptions), adminFeeCountries: parseAdminFeeCountries((updated as Record<string, unknown>).adminFeeCountries as string), sharedShippingCountries: parseSharedShippingCountries((updated as Record<string, unknown>).sharedShippingCountries as string) });
});

// ── DELETE /admin/group-buys/:id — soft delete (→ archived) ───
router.delete("/admin/group-buys/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [existing] = await db.select({ id: groupBuysTable.id, name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const [orderCheck] = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt))).limit(1);
  if (orderCheck) {
    res.status(409).json({ error: "Cannot delete a group buy that has orders. Archive it instead." });
    return;
  }

  await db.delete(groupBuyProductsTable).where(eq(groupBuyProductsTable.groupBuyId, id));
  await db.delete(groupBuyDeliveryMethodsTable).where(eq(groupBuyDeliveryMethodsTable.groupBuyId, id));
  await db.delete(gbWaitlistTable).where(eq(gbWaitlistTable.groupBuyId, id));
  await db.delete(accountGroupBuysTable).where(eq(accountGroupBuysTable.groupBuyId, id));
  await db.delete(groupBuysTable).where(eq(groupBuysTable.id, id));

  createAlert("system", "high", "Group Buy Deleted",
    `Group buy "${existing.name}" (${id}) was permanently deleted by admin.`,
    {},
  ).catch(() => {});

  res.json({ ok: true, id });
});

// ── GET /admin/group-buys/:id/vote-tally ──────────────────────
router.get("/admin/group-buys/:id/vote-tally", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  // Fetch ALL confirmed orders for this GB that have a testing contribution > 0
  const confirmedOrders = await db
    .select({
      testVote: ordersTable.testVote,
      testingContribution: ordersTable.testingContribution,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, id),
      eq(ordersTable.paymentStatus, "confirmed"),
      sql`${ordersTable.testingContribution}::numeric > 0`,
      isNull(ordersTable.deletedAt),
    ));

  // Total funds raised = SUM of all contributions from confirmed orders
  const totalFundsRaised = confirmedOrders.reduce(
    (sum, o) => sum + parseFloat(String(o.testingContribution ?? "0")),
    0
  );

  // Aggregate vote counts by product name (testVote stores product name directly)
  const tallyMap: Record<string, number> = {};
  for (const o of confirmedOrders) {
    if (!o.testVote) continue;
    const name = o.testVote;
    tallyMap[name] = (tallyMap[name] ?? 0) + 1;
  }

  const votes = Object.entries(tallyMap)
    .map(([productName, count]) => ({ productName, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    totalContributors: confirmedOrders.length,
    totalFundsRaised: parseFloat(totalFundsRaised.toFixed(2)),
    votedCount: confirmedOrders.filter(o => o.testVote !== null).length,
    votes,
  });
});

// ── GET /admin/group-buys/:id/members ─────────────────────────
router.get("/admin/group-buys/:id/members", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      accountStatus: accountsTable.accountStatus,
      hasPassword: accountsTable.passwordHash,
      telegramChatId: accountsTable.telegramChatId,
      joinedAt: accountGroupBuysTable.joinedAt,
      tags: accountGroupBuysTable.tags,
      countryLegId: accountGroupBuysTable.countryLegId,
      allowExtraOrder: accountGroupBuysTable.allowExtraOrder,
    })
    .from(accountGroupBuysTable)
    .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
    .where(eq(accountGroupBuysTable.groupBuyId, id));

  // Return hasPassword and hasTelegram as booleans, not raw values
  res.json(rows.map((r: typeof rows[number]) => ({
    telegramUsername: r.telegramUsername,
    email: r.email,
    accountStatus: r.accountStatus,
    hasPassword: r.hasPassword != null,
    hasTelegram: r.telegramChatId != null,
    joinedAt: r.joinedAt,
    tags: r.tags ?? [],
    countryLegId: r.countryLegId ?? null,
    allowExtraOrder: r.allowExtraOrder ?? false,
  })));
});

// ── POST /admin/group-buys/:id/members — add member by Telegram username ──
router.post("/admin/group-buys/:id/members", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { telegramUsername } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "telegramUsername is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (!tg || tg.length < 2 || tg.length > 64) {
    res.status(400).json({ error: "Invalid Telegram username" });
    return;
  }

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  // Upsert account (create if not exists; leave passwordHash null — user sets it on signup)
  const existing = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  if (existing.length === 0) {
    await db.insert(accountsTable).values({
      telegramUsername: tg,
      accountStatus: "active",
    });
  }

  // Idempotent membership insert
  const existingMembership = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(
      eq(accountGroupBuysTable.accountId, tg),
      eq(accountGroupBuysTable.groupBuyId, id),
    ));

  if (existingMembership.length === 0) {
    await db.insert(accountGroupBuysTable).values({
      id: randomUUID(),
      accountId: tg,
      groupBuyId: id,
    });
  }

  res.status(201).json({ ok: true, telegramUsername: tg, groupBuyId: id });
});

// ── DELETE /admin/group-buys/:id/members/:accountId — remove member ──
router.delete("/admin/group-buys/:id/members/:accountId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, accountId } = req.params;

  await db
    .delete(accountGroupBuysTable)
    .where(and(
      eq(accountGroupBuysTable.groupBuyId, id),
      eq(accountGroupBuysTable.accountId, accountId),
    ));

  res.json({ ok: true });
});

// ── GET /admin/group-buys/:id/products ────────────────────────
router.get("/admin/group-buys/:id/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const rows = await db
    .select({
      id: groupBuyProductsTable.id,
      groupBuyId: groupBuyProductsTable.groupBuyId,
      productId: groupBuyProductsTable.productId,
      priceOverride: groupBuyProductsTable.priceOverride,
      active: groupBuyProductsTable.active,
      sortOrder: groupBuyProductsTable.sortOrder,
      name: productsTable.name,
    })
    .from(groupBuyProductsTable)
    .leftJoin(productsTable, eq(productsTable.id, groupBuyProductsTable.productId))
    .where(eq(groupBuyProductsTable.groupBuyId, id))
    .orderBy(productsTable.name);

  res.json(rows.map(r => ({
    ...r,
    priceOverride: r.priceOverride != null ? parseFloat(String(r.priceOverride)) : null,
    name: r.name ?? "(deleted product)",
  })));
});

// ── POST /admin/group-buys/:id/products — add products to GB ──
router.post("/admin/group-buys/:id/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { productIds, productId, priceOverride, active, sortOrder } = req.body;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  // Support single productId or array of productIds
  const ids: string[] = Array.isArray(productIds) ? productIds : (productId ? [productId] : []);
  if (ids.length === 0) {
    res.status(400).json({ error: "productId or productIds is required" });
    return;
  }

  let insertedCount = 0;
  for (const pid of ids) {
    if (typeof pid !== "string") continue;

    const existingLink = await db
      .select({ id: groupBuyProductsTable.id })
      .from(groupBuyProductsTable)
      .where(and(
        eq(groupBuyProductsTable.groupBuyId, id),
        eq(groupBuyProductsTable.productId, pid),
      ));

    if (existingLink.length === 0) {
      await db.insert(groupBuyProductsTable).values({
        id: randomUUID(),
        groupBuyId: id,
        productId: pid,
        priceOverride: priceOverride != null ? String(parseFloat(String(priceOverride)).toFixed(2)) : undefined,
        active: active !== false,
        sortOrder: sortOrder != null ? parseInt(String(sortOrder)) : undefined,
      });
      insertedCount++;
    }
  }

  res.status(201).json({ ok: true, inserted: insertedCount });
});

// ── PATCH /admin/group-buys/:id/products/:productId ───────────
router.patch("/admin/group-buys/:id/products/:productId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, productId } = req.params;
  const { priceOverride, active, sortOrder } = req.body;

  // Build a strongly-typed partial update — no any casts
  const updates: Partial<Omit<GroupBuyProduct, "id" | "groupBuyId" | "productId">> = {};

  if (priceOverride !== undefined) {
    updates.priceOverride = priceOverride != null && priceOverride !== ""
      ? String(parseFloat(String(priceOverride)).toFixed(2))
      : null;
  }
  if (active !== undefined) updates.active = Boolean(active);
  if (sortOrder !== undefined) updates.sortOrder = sortOrder != null ? parseInt(String(sortOrder)) : null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(groupBuyProductsTable)
    .set(updates)
    .where(and(
      eq(groupBuyProductsTable.groupBuyId, id),
      eq(groupBuyProductsTable.productId, productId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found in this group buy" });
    return;
  }

  writeLog("change", "info", "admin_gb_product_updated",
    `Admin updated product ${productId} in GB ${id}`,
    { gbId: id, productId, changedFields: Object.keys(updates), priceOverride: updated.priceOverride },
  ).catch(() => {});

  res.json({ ...updated, priceOverride: updated.priceOverride != null ? parseFloat(updated.priceOverride) : null });
});

// ── DELETE /admin/group-buys/:id/products/:productId ──────────
router.delete("/admin/group-buys/:id/products/:productId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, productId } = req.params;

  await db
    .delete(groupBuyProductsTable)
    .where(and(
      eq(groupBuyProductsTable.groupBuyId, id),
      eq(groupBuyProductsTable.productId, productId),
    ));

  res.json({ ok: true });
});

// ── GET /admin/group-buys/:id/products-catalog ────────────────
// Returns global products + products imported specifically for this GB.
// Used by the admin Products sub-tab (instead of /api/products).
router.get("/admin/group-buys/:id/products-catalog", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.active, true),
        or(isNull(productsTable.sourceGroupBuyId), eq(productsTable.sourceGroupBuyId, id))
      )
    )
    .orderBy(productsTable.name);

  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      vendor: p.vendor,
      price: parseFloat(p.price),
      active: p.active,
      category: p.category ?? null,
      mgSize: p.mgSize ?? null,
      stock: p.stock ?? null,
      sortOrder: p.sortOrder,
      sourceGroupBuyId: p.sourceGroupBuyId ?? null,
      halfKitEnabled: p.halfKitEnabled,
    }))
  );
});

// ── POST /admin/group-buys/:id/create-product ─────────────────
// Creates a brand-new product owned exclusively by this GB (sourceGroupBuyId = id)
// and immediately links it into group_buy_products.
router.post("/admin/group-buys/:id/create-product", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const { name, price, vendor, category } = req.body;

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!vendor || !String(vendor).trim()) {
    res.status(400).json({ error: "vendor is required" });
    return;
  }
  if (price === undefined || price === null) {
    res.status(400).json({ error: "price is required" });
    return;
  }
  const p = parseFloat(String(price));
  if (isNaN(p) || p < 0) {
    res.status(400).json({ error: "price must be a non-negative number" });
    return;
  }

  const productId = `prod-${randomUUID().split("-")[0]}`;

  const created = await db.transaction(async (tx) => {
    const [product] = await tx.insert(productsTable).values({
      id: productId,
      name: String(name).trim(),
      vendor: String(vendor).trim(),
      price: p.toFixed(2),
      active: true,
      category: category ? String(category).trim() : null,
      sourceGroupBuyId: id,
    }).returning();

    await tx.insert(groupBuyProductsTable).values({
      id: randomUUID(),
      groupBuyId: id,
      productId,
      active: true,
    });

    return product;
  });

  res.status(201).json({
    id: created.id,
    name: created.name,
    vendor: created.vendor,
    price: parseFloat(String(created.price)),
    active: created.active,
    category: created.category ?? null,
    sourceGroupBuyId: created.sourceGroupBuyId,
  });
});

// ── POST /admin/group-buys/:id/import-csv ─────────────────────
// Accepts a JSON body: { rows: [{ name: string; price: number; vendor: string }] }
// Creates products tagged to this GB only, then links them.
// vendor is required per row — rows missing vendor are rejected.
router.post("/admin/group-buys/:id/import-csv", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const { rows } = req.body as { rows: { name: string; price: number; vendor: string }[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows is required and must be a non-empty array" });
    return;
  }

  // Validate all rows upfront so we fail before inserting anything
  const invalidRows: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const vendor = typeof row.vendor === "string" ? row.vendor.trim() : "";
    const price = parseFloat(String(row.price));
    if (!name || !vendor || isNaN(price) || price < 0) {
      invalidRows.push(i + 1);
    }
  }
  if (invalidRows.length > 0) {
    res.status(400).json({
      error: `Rows ${invalidRows.join(", ")} are missing or invalid name, vendor, or price. vendor is required for every row.`,
    });
    return;
  }

  let created = 0;
  let linked = 0;

  for (const row of rows) {
    const name = (row.name as string).trim();
    const vendor = (row.vendor as string).trim();
    const price = parseFloat(String(row.price));

    const productId = randomUUID();

    await db.insert(productsTable).values({
      id: productId,
      name,
      vendor,
      price: price.toFixed(2),
      active: true,
      sourceGroupBuyId: id,
    });
    created++;

    await db.insert(groupBuyProductsTable).values({
      id: randomUUID(),
      groupBuyId: id,
      productId,
      active: true,
    });
    linked++;
  }

  res.status(201).json({ ok: true, created, linked });
});

// ── GET /admin/group-buys/:id/delivery-methods ────────────────
router.get("/admin/group-buys/:id/delivery-methods", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const rows = await db
    .select()
    .from(groupBuyDeliveryMethodsTable)
    .where(eq(groupBuyDeliveryMethodsTable.groupBuyId, id));

  res.json(rows);
});

// ── POST /admin/group-buys/:id/delivery-methods ───────────────
router.post("/admin/group-buys/:id/delivery-methods", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { deliveryMethodId } = req.body;

  if (!deliveryMethodId || typeof deliveryMethodId !== "string") {
    res.status(400).json({ error: "deliveryMethodId is required" });
    return;
  }

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const existingLink = await db
    .select({ id: groupBuyDeliveryMethodsTable.id })
    .from(groupBuyDeliveryMethodsTable)
    .where(and(
      eq(groupBuyDeliveryMethodsTable.groupBuyId, id),
      eq(groupBuyDeliveryMethodsTable.deliveryMethodId, deliveryMethodId),
    ));

  if (existingLink.length > 0) {
    res.status(409).json({ error: "Delivery method already linked to this group buy" });
    return;
  }

  const [row] = await db.insert(groupBuyDeliveryMethodsTable).values({
    id: randomUUID(),
    groupBuyId: id,
    deliveryMethodId,
  }).returning();

  res.status(201).json(row);
});

// ── DELETE /admin/group-buys/:id/delivery-methods/:dmId ───────
router.delete("/admin/group-buys/:id/delivery-methods/:dmId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, dmId } = req.params;

  await db
    .delete(groupBuyDeliveryMethodsTable)
    .where(and(
      eq(groupBuyDeliveryMethodsTable.groupBuyId, id),
      eq(groupBuyDeliveryMethodsTable.deliveryMethodId, dmId),
    ));

  res.json({ ok: true });
});

// ── POST /admin/group-buys/:id/clone — duplicate a GB ─────────
router.post("/admin/group-buys/:id/clone", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const [source] = await db.select().from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!source) { res.status(404).json({ error: "Group buy not found" }); return; }

  const newId = await uniqueGroupBuyId();
  const [cloned] = await db.insert(groupBuysTable).values({
    id: newId,
    name: `${source.name} (Copy)`,
    description: source.description,
    status: "draft",
    manufacturer: source.manufacturer,
    manufacturerCountry: source.manufacturerCountry,
    labTestSupplier: source.labTestSupplier,
    currency: source.currency,
    sortOrder: source.sortOrder,
    testingEnabled: source.testingEnabled,
    vendorShippingEnabled: source.vendorShippingEnabled,
    vendorShippingMessage: source.vendorShippingMessage,
    paymentMessageEnabled: source.paymentMessageEnabled,
    paymentMessage: source.paymentMessage,
    paymentsEnabled: source.paymentsEnabled,
    memberLimit: source.memberLimit,
    minMembers: source.minMembers,
    infoCards: source.infoCards,
  }).returning();

  // Clone GB products
  const srcProducts = await db.select().from(groupBuyProductsTable).where(eq(groupBuyProductsTable.groupBuyId, id));
  if (srcProducts.length > 0) {
    await db.insert(groupBuyProductsTable).values(
      srcProducts.map(p => ({ id: randomUUID(), groupBuyId: newId, productId: p.productId, priceOverride: p.priceOverride, active: p.active, sortOrder: p.sortOrder }))
    );
  }

  // Clone delivery methods
  const srcDMs = await db.select().from(groupBuyDeliveryMethodsTable).where(eq(groupBuyDeliveryMethodsTable.groupBuyId, id));
  if (srcDMs.length > 0) {
    await db.insert(groupBuyDeliveryMethodsTable).values(
      srcDMs.map(d => ({ id: randomUUID(), groupBuyId: newId, deliveryMethodId: d.deliveryMethodId }))
    );
  }

  res.status(201).json({ ...cloned, infoCards: parseInfoCards(cloned.infoCards) });
});

// ── GET /admin/group-buys/:id/waitlist ─────────────────────────
router.get("/admin/group-buys/:id/waitlist", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const rows = await db
    .select({
      id: gbWaitlistTable.id,
      accountId: gbWaitlistTable.accountId,
      joinedAt: gbWaitlistTable.joinedAt,
      notifiedAt: gbWaitlistTable.notifiedAt,
      hasPassword: accountsTable.passwordHash,
      telegramChatId: accountsTable.telegramChatId,
    })
    .from(gbWaitlistTable)
    .leftJoin(accountsTable, eq(gbWaitlistTable.accountId, accountsTable.telegramUsername))
    .where(eq(gbWaitlistTable.groupBuyId, id))
    .orderBy(asc(gbWaitlistTable.joinedAt));

  res.json(rows.map(r => ({ ...r, hasPassword: !!r.hasPassword })));
});

// ── DELETE /admin/group-buys/:id/waitlist/:accountId ───────────
router.delete("/admin/group-buys/:id/waitlist/:accountId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, accountId } = req.params;
  await db.delete(gbWaitlistTable).where(and(
    eq(gbWaitlistTable.groupBuyId, id),
    eq(gbWaitlistTable.accountId, accountId),
  ));
  res.json({ ok: true });
});

// ── POST /admin/group-buys/:id/waitlist/:accountId/promote ─────
// Move a waitlisted member into the GB (respecting new limit)
router.post("/admin/group-buys/:id/waitlist/:accountId/promote", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, accountId } = req.params;

  const [gb] = await db.select({ id: groupBuysTable.id, memberLimit: groupBuysTable.memberLimit, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Check if already a member
  const [isMember] = await db.select({ id: accountGroupBuysTable.id }).from(accountGroupBuysTable).where(and(
    eq(accountGroupBuysTable.accountId, accountId),
    eq(accountGroupBuysTable.groupBuyId, id),
  ));
  if (!isMember) {
    await db.insert(accountGroupBuysTable).values({ id: randomUUID(), accountId, groupBuyId: id });
  }

  // Remove from waitlist
  await db.delete(gbWaitlistTable).where(and(eq(gbWaitlistTable.groupBuyId, id), eq(gbWaitlistTable.accountId, accountId)));

  // Notify them
  const promoteGbOrganiser = gb.organiserId ? `@${gb.organiserId}` : "Admin";
  notifyUserFromTemplate(accountId, "status", "customer_waitlist_promoted",
    { gb_name: gb.name, organiser: promoteGbOrganiser, username: accountId.replace(/^@/, "") },
  ).catch(() => {});
  sendAdminFromTemplate("admin_organiser_update",
    { organiser_username: promoteGbOrganiser, update_type: "Waitlist Promoted", details: `@${accountId.replace(/^@/, "")} joined GB: ${gb.name}` },
  ).catch(() => {});

  res.json({ ok: true });
});

// ── POST /admin/group-buys/:id/waitlist/notify — send Telegram to all unnotified waitlist members
router.post("/admin/group-buys/:id/waitlist/notify", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, status: groupBuysTable.status, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const waitlistEntries = await db
    .select({ id: gbWaitlistTable.id, accountId: gbWaitlistTable.accountId })
    .from(gbWaitlistTable)
    .where(and(
      eq(gbWaitlistTable.groupBuyId, id),
      isNull(gbWaitlistTable.notifiedAt),
    ));

  if (waitlistEntries.length === 0) {
    res.json({ ok: true, notified: 0 });
    return;
  }

  const organiserHandle = gb.organiserId ? `@${gb.organiserId}` : "Admin";
  let notified = 0;
  for (const entry of waitlistEntries) {
    notifyUserFromTemplate(entry.accountId, "status", "customer_waitlist_promoted",
      { gb_name: gb.name ?? id, organiser: organiserHandle, username: entry.accountId.replace(/^@/, "") },
    ).catch(() => {});
    await db.update(gbWaitlistTable)
      .set({ notifiedAt: new Date() })
      .where(eq(gbWaitlistTable.id, entry.id));
    notified++;
  }

  writeLog("change", "info", "admin_waitlist_notified",
    `Admin sent waitlist notification for GB "${gb.name}" to ${notified} members`,
    { gbId: id, notified },
  ).catch(() => {});

  res.json({ ok: true, notified });
});

// ── GET /admin/group-buys/:id/member-countries — distinct account countries for GB members
router.get("/admin/group-buys/:id/member-countries", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const members = await db
    .select({ country: accountsTable.country })
    .from(accountGroupBuysTable)
    .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.id))
    .where(eq(accountGroupBuysTable.gbId, id));
  const countries = [...new Set(members.map((m) => m.country).filter(Boolean) as string[])].sort();
  res.json(countries);
});

// helper: apply standard order filters (status, payment, countryLeg, accountCountry)
async function applyOrderFilters(
  gbId: string,
  statusFilter: string | undefined,
  paymentStatusFilter: string | undefined,
  countryLegId: string | undefined,
  accountCountry: string | undefined,
  reshipper?: string | undefined,
) {
  let orders = await db.select().from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));

  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  if (paymentStatusFilter && paymentStatusFilter !== "all") {
    if (paymentStatusFilter === "paid") {
      orders = orders.filter((o) => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed");
    } else if (paymentStatusFilter === "unpaid") {
      orders = orders.filter((o) => o.paymentStatus !== "confirmed" && o.paymentStatus !== "test_confirmed");
    } else {
      orders = orders.filter((o) => o.paymentStatus === paymentStatusFilter);
    }
  }
  if (countryLegId && countryLegId !== "all") {
    orders = orders.filter((o) => o.countryLegId === countryLegId);
  }
  if (accountCountry && accountCountry !== "all") {
    const members = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountGroupBuysTable)
      .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.id))
      .where(and(eq(accountGroupBuysTable.gbId, gbId), eq(accountsTable.country, accountCountry)));
    const tgSet = new Set(members.map((m) => m.telegramUsername?.toLowerCase()).filter(Boolean) as string[]);
    orders = orders.filter((o) => tgSet.has((o.telegramUsername ?? "").toLowerCase()));
  }
  if (reshipper && reshipper !== "all") {
    orders = orders.filter((o) => (o.reshipperUsername ?? "").toLowerCase() === reshipper.toLowerCase());
  }
  return orders;
}

// ── GET /admin/group-buys/:id/summary — aggregated product summary (admin)
router.get("/admin/group-buys/:id/summary", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const statusFilter = req.query.status as string | undefined;
  const paymentStatusFilter = req.query.paymentStatus as string | undefined;
  const countryLegId = req.query.countryLegId as string | undefined;
  const accountCountry = req.query.accountCountry as string | undefined;
  const reshipper = req.query.reshipper as string | undefined;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const orders = await applyOrderFilters(id, statusFilter, paymentStatusFilter, countryLegId, accountCountry, reshipper);

  if (orders.length === 0) { res.json([]); return; }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds));

  const map = new Map<string, { productId: string; productName: string; totalQty: number; unitPrice: number; totalValue: number; orderCount: number }>();
  for (const li of lineItems) {
    const key = li.productName;
    const existing = map.get(key) ?? { productId: li.productId, productName: li.productName, totalQty: 0, unitPrice: parseFloat(String(li.unitPrice)), totalValue: 0, orderCount: 0 };
    existing.totalQty += parseFloat(String(li.quantity));
    existing.totalValue += parseFloat(String(li.lineTotal));
    existing.orderCount += 1;
    map.set(key, existing);
  }

  res.json(
    Array.from(map.values())
      .map((item) => ({ ...item, totalQty: parseFloat(item.totalQty.toFixed(2)), totalValue: parseFloat(item.totalValue.toFixed(2)) }))
      .sort((a, b) => b.totalValue - a.totalValue)
  );
});

// ── GET /admin/group-buys/:id/summary/breakdown — per-order breakdown (admin)
router.get("/admin/group-buys/:id/summary/breakdown", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const productName = req.query.productName as string | undefined;
  const statusFilter = req.query.status as string | undefined;
  const paymentStatusFilter = req.query.paymentStatus as string | undefined;
  const countryLegId = req.query.countryLegId as string | undefined;
  const accountCountry = req.query.accountCountry as string | undefined;
  const reshipper = req.query.reshipper as string | undefined;

  if (!productName) { res.status(400).json({ error: "productName is required" }); return; }

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const orders = await applyOrderFilters(id, statusFilter, paymentStatusFilter, countryLegId, accountCountry, reshipper);

  if (orders.length === 0) { res.json([]); return; }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds));

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const breakdown = lineItems
    .filter((li) => li.productName === productName)
    .map((li) => {
      const order = orderMap.get(li.orderId);
      return {
        orderId: li.orderId,
        orderCode: order?.code ?? "?",
        telegramUsername: order?.telegramUsername ?? "?",
        quantity: parseFloat(String(li.quantity)),
        unitPrice: parseFloat(String(li.unitPrice)),
        lineTotal: parseFloat(String(li.lineTotal)),
        orderStatus: order?.status ?? "?",
        paymentStatus: order?.paymentStatus ?? "unpaid",
        notes: order?.notes ?? null,
      };
    })
    .sort((a, b) => a.telegramUsername.localeCompare(b.telegramUsername));

  res.json(breakdown);
});

// ── POST /admin/group-buys/:id/broadcast — send Telegram to GB members
router.post("/admin/group-buys/:id/broadcast", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const { id } = req.params;
  const { message, targetUsernames, paymentStatusFilter, productFilter, countryLegFilter } = req.body as { message?: string; targetUsernames?: string[]; paymentStatusFilter?: string; productFilter?: string[]; countryLegFilter?: string };
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const [gb] = await db
    .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id))
    .limit(1);

  const gbName = gb?.name ?? id;
  const organiserHandle = gb?.organiserId ? `@${esc(gb.organiserId)}` : "–";
  const fullText = `📢 <b>Message from Platform Admin</b>\n<b>Group Buy:</b> ${esc(gbName)}\n<b>Organiser:</b> ${organiserHandle}\n\n${esc(message.trim())}`;

  const recipientChatIds: Map<string, string | null> = new Map();
  const hasProductFilter = Array.isArray(productFilter) && productFilter.length > 0;
  const hasStatusFilter = !!paymentStatusFilter && paymentStatusFilter !== "all";
  const hasLegFilter = !!countryLegFilter && countryLegFilter !== "all";

  const applyStatusFilter = (orders: { telegramUsername: string; paymentStatus: string | null; status: string | null }[]) =>
    orders.filter(o => {
      if (paymentStatusFilter === "paid") return o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed";
      if (paymentStatusFilter === "unpaid") return o.paymentStatus === "unpaid";
      if (paymentStatusFilter === "pending_confirmation") return o.paymentStatus === "pending_confirmation";
      if (paymentStatusFilter === "submitted") return o.status === "Submitted";
      if (paymentStatusFilter === "processing") return o.status === "Processing";
      if (paymentStatusFilter === "dispatched") return o.status === "Dispatched";
      return true;
    });

  if (hasStatusFilter || hasProductFilter || hasLegFilter) {
    let rows: { telegramUsername: string; paymentStatus: string | null; status: string | null }[];

    if (hasProductFilter) {
      rows = await db
        .selectDistinct({ telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status })
        .from(ordersTable)
        .innerJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
        .where(and(
          eq(ordersTable.groupBuyId, id),
          inArray(orderLineItemsTable.productName, productFilter!),
          isNull(ordersTable.deletedAt),
          hasLegFilter ? eq(ordersTable.countryLegId, countryLegFilter!) : undefined,
        ));
    } else {
      rows = await db
        .select({ telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.groupBuyId, id),
          isNull(ordersTable.deletedAt),
          hasLegFilter ? eq(ordersTable.countryLegId, countryLegFilter!) : undefined,
        ));
    }

    const filtered = hasStatusFilter ? applyStatusFilter(rows) : rows;
    const filteredUsernames = Array.from(new Set(filtered.map(o => o.telegramUsername.replace(/^@/, "").toLowerCase())));

    if (filteredUsernames.length > 0) {
      const accountRows = await db
        .select({ telegramUsername: accountsTable.telegramUsername, chatId: accountsTable.telegramChatId })
        .from(accountsTable)
        .where(inArray(accountsTable.telegramUsername, filteredUsernames));
      for (const a of accountRows) recipientChatIds.set(a.telegramUsername.toLowerCase(), a.chatId);
    }
  } else {
    const allMembers = await db
      .select({ accountId: accountGroupBuysTable.accountId, chatId: accountsTable.telegramChatId })
      .from(accountGroupBuysTable)
      .leftJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
      .where(eq(accountGroupBuysTable.groupBuyId, id));

    const targeting = Array.isArray(targetUsernames) && targetUsernames.length > 0;
    const targetSet = targeting ? new Set(targetUsernames.map(u => u.replace(/^@/, "").toLowerCase())) : null;
    const members = targeting ? allMembers.filter(m => targetSet!.has(m.accountId.toLowerCase())) : allMembers;
    for (const m of members) recipientChatIds.set(m.accountId.toLowerCase(), m.chatId ?? null);
  }

  let sent = 0;
  let failed = 0;
  for (const [, chatId] of recipientChatIds) {
    if (chatId) {
      const ok = await sendTelegramMessage(chatId, fullText, "HTML").catch(() => false);
      ok ? sent++ : failed++;
    } else {
      failed++;
    }
  }

  res.json({ ok: true, sent, failed, total: recipientChatIds.size });
});

// ── GET /admin/group-buys/:id/payment-status — per-member order/payment overview
router.get("/admin/group-buys/:id/payment-status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  const members = await db
    .select({ accountId: accountGroupBuysTable.accountId, joinedAt: accountGroupBuysTable.joinedAt, tags: accountGroupBuysTable.tags })
    .from(accountGroupBuysTable)
    .where(eq(accountGroupBuysTable.groupBuyId, id))
    .orderBy(asc(accountGroupBuysTable.joinedAt));

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal,
      trackingNumber: ordersTable.trackingNumber,
      refundStatus: ordersTable.refundStatus,
      creditsApplied: ordersTable.creditsApplied,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)));

  const orderMap = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!orderMap.has(o.telegramUsername)) orderMap.set(o.telegramUsername, []);
    orderMap.get(o.telegramUsername)!.push(o);
  }

  const result = members.map(m => ({
    accountId: m.accountId,
    joinedAt: m.joinedAt,
    tags: m.tags ?? [],
    orders: (orderMap.get(m.accountId) ?? []).map(o => ({
      ...o,
      grandTotal: parseFloat(String(o.grandTotal)),
      creditsApplied: o.creditsApplied != null ? parseFloat(String(o.creditsApplied)) : 0,
    })),
  }));

  res.json(result);
});

// ── PATCH /admin/group-buys/:id/members/:accountId/allow-extra-order ────────
router.patch("/admin/group-buys/:id/members/:accountId/allow-extra-order", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, accountId } = req.params;
  const { allowExtraOrder } = req.body;

  if (typeof allowExtraOrder !== "boolean") {
    res.status(400).json({ error: "allowExtraOrder must be a boolean" });
    return;
  }

  const [row] = await db
    .update(accountGroupBuysTable)
    .set({ allowExtraOrder })
    .where(and(eq(accountGroupBuysTable.groupBuyId, id), eq(accountGroupBuysTable.accountId, accountId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Member not found" }); return; }
  res.json({ ok: true, allowExtraOrder: row.allowExtraOrder });
});

// ── PATCH /admin/group-buys/:id/members/:accountId/tags ────────
router.patch("/admin/group-buys/:id/members/:accountId/tags", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id, accountId } = req.params;
  const { tags } = req.body;

  if (!Array.isArray(tags)) { res.status(400).json({ error: "tags must be an array" }); return; }

  const [row] = await db
    .update(accountGroupBuysTable)
    .set({ tags: tags.filter((t: unknown) => typeof t === "string") })
    .where(and(eq(accountGroupBuysTable.groupBuyId, id), eq(accountGroupBuysTable.accountId, accountId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Member not found" }); return; }
  res.json({ ok: true, tags: row.tags });
});

// ── POST /admin/group-buys/:id/apply-shipping ──────────────────
// Per-group-buy shipping split: equalPct + weightedPct must sum to 100
router.post("/admin/group-buys/:id/apply-shipping", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { totalShipping, equalPct = 80, weightedPct = 20, statusFilter = "Submitted" } = req.body;

  const shipping = parseFloat(String(totalShipping));
  if (isNaN(shipping) || shipping < 0) {
    res.status(400).json({ error: "totalShipping must be a non-negative number" });
    return;
  }

  const ep = parseFloat(String(equalPct));
  const wp = parseFloat(String(weightedPct));
  if (Math.abs(ep + wp - 100) > 0.01) {
    res.status(400).json({ error: "equalPct and weightedPct must sum to 100" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), eq(ordersTable.status, statusFilter), isNull(ordersTable.deletedAt)));

  if (orders.length === 0) {
    res.json({ message: `No ${statusFilter} orders found for this group buy`, updatedCount: 0, breakdown: [] });
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const allLineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const orderQtyMap = new Map<string, number>();
  for (const li of allLineItems) {
    const cur = orderQtyMap.get(li.orderId) ?? 0;
    orderQtyMap.set(li.orderId, cur + parseFloat(String(li.quantity)));
  }

  const totalQty = Array.from(orderQtyMap.values()).reduce((s, q) => s + q, 0);
  const orderCount = orders.length;
  const equalAmount = (ep / 100) * shipping;
  const weightedAmount = (wp / 100) * shipping;

  const updates: Array<{ orderId: string; vendorShipping: number; newGrandTotal: number; username: string; setAmountDue: boolean }> = [];

  for (const order of orders) {
    const orderQty = orderQtyMap.get(order.id) ?? 0;
    const equalShare = equalAmount / orderCount;
    const weightedShare = totalQty > 0 ? weightedAmount * (orderQty / totalQty) : 0;
    const vendorShipping = parseFloat((equalShare + weightedShare).toFixed(2));

    const productSubtotal = parseFloat(String(order.productSubtotal));
    const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
    const tip = parseFloat(String(order.tip ?? "0"));
    const testingContribution = parseFloat(String(order.testingContribution ?? "0"));
    const couponDiscount = parseFloat(String(order.couponDiscount ?? "0"));
    const newGrandTotal = parseFloat(Math.max(0, productSubtotal + deliveryPrice + vendorShipping + tip + testingContribution - couponDiscount).toFixed(2));

    // If already paid, vendor shipping is an outstanding balance to collect
    const alreadyPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed";
    const balanceAlreadySettled = ["confirmed", "waived"].includes(order.balancePaymentStatus ?? "");
    const setAmountDue = alreadyPaid && !balanceAlreadySettled;

    updates.push({ orderId: order.id, vendorShipping, newGrandTotal, username: order.telegramUsername, setAmountDue });
  }

  for (const u of updates) {
    await db
      .update(ordersTable)
      .set({
        vendorShipping: u.vendorShipping.toFixed(2),
        grandTotal: u.newGrandTotal.toFixed(2),
        ...(u.setAmountDue ? { amountDue: u.vendorShipping.toFixed(2) } : {}),
      } as any)
      .where(eq(ordersTable.id, u.orderId));
  }

  res.json({
    message: `$${shipping.toFixed(2)} split across ${orders.length} order(s) — ${ep}% equal / ${wp}% by quantity`,
    updatedCount: orders.length,
    totalShipping: shipping,
    breakdown: updates.map((u) => ({
      orderId: u.orderId,
      username: u.username,
      vendorShipping: u.vendorShipping,
      newGrandTotal: u.newGrandTotal,
    })),
  });
});

// ── POST /admin/group-buys/:id/backfill-balance-due ─────────────
// Sets amountDue = vendorShipping for confirmed orders where vendor shipping
// was added after the initial payment (amountDue is currently 0 or null).
router.post("/admin/group-buys/:id/backfill-balance-due", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { legId } = req.body as { legId?: string };

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, id));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Find confirmed orders with vendor shipping > 0 but no amountDue set yet
  // and balance not already confirmed
  const orders = await db
    .select({ id: ordersTable.id, vendorShipping: ordersTable.vendorShipping, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, id),
      isNull(ordersTable.deletedAt),
      legId ? eq(ordersTable.countryLegId, legId) : undefined,
      sql`(${ordersTable.paymentStatus} = 'confirmed' OR ${ordersTable.paymentStatus} = 'test_confirmed')`,
      sql`cast(${ordersTable.vendorShipping} as numeric) > 0`,
      sql`(${ordersTable.amountDue} IS NULL OR cast(${ordersTable.amountDue} as numeric) = 0)`,
      sql`(${ordersTable.balancePaymentStatus} IS NULL OR (${ordersTable.balancePaymentStatus} != 'confirmed' AND ${ordersTable.balancePaymentStatus} != 'waived'))`,
    ));

  if (orders.length === 0) {
    res.json({ updated: 0, message: "No affected orders found — all confirmed orders already have balance due set." });
    return;
  }

  for (const o of orders) {
    await db
      .update(ordersTable)
      .set({ amountDue: String(o.vendorShipping) } as any)
      .where(eq(ordersTable.id, o.id));
  }

  res.json({
    updated: orders.length,
    message: `Set balance due on ${orders.length} order(s) that were paid before vendor shipping was added.`,
    orders: orders.map(o => ({ id: o.id, code: o.code, username: o.telegramUsername, amountDue: parseFloat(String(o.vendorShipping)) })),
  });
});

// ── GET /admin/group-buys/:gbId/orders — orders scoped to a GB ───
router.get("/admin/group-buys/:gbId/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { gbId } = req.params;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)))
    .orderBy(desc(ordersTable.createdAt));

  const orderIds = orders.map((o) => o.id);
  const allLineItems =
    orderIds.length > 0
      ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
      : [];

  const liByOrder = new Map<string, typeof allLineItems>();
  for (const li of allLineItems) {
    const arr = liByOrder.get(li.orderId) ?? [];
    arr.push(li);
    liByOrder.set(li.orderId, arr);
  }

  // Fetch account countries for all order usernames so legs can be matched even before backfill.
  // We try both the raw username and the @-stripped version to handle format variations.
  const rawUsernames = [...new Set(orders.map(o => o.telegramUsername))];
  const strippedUsernames = rawUsernames.map(u => u.replace(/^@/, ""));
  const allUsernamesToLookup = [...new Set([...rawUsernames, ...strippedUsernames])];
  const accountRows = allUsernamesToLookup.length > 0
    ? await db.select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country })
        .from(accountsTable)
        .where(inArray(accountsTable.telegramUsername, allUsernamesToLookup))
    : [];
  // Build case-insensitive lookup map (with and without @)
  const accountCountryMap = new Map<string, string | null>();
  for (const a of accountRows) {
    accountCountryMap.set(a.telegramUsername.toLowerCase(), a.country);
    accountCountryMap.set(a.telegramUsername.toLowerCase().replace(/^@/, ""), a.country);
  }

  res.json(
    orders.map((o) => {
      const txHash = o.paymentTxHash ?? null;
      let paymentMethod = "manual";
      if (txHash?.startsWith("anonpay:")) paymentMethod = "anonpay";
      else if (txHash === "fiat:revolut") paymentMethod = "revolut";
      else if (txHash === "fiat:paypal") paymentMethod = "paypal";

      return {
      id: o.id,
      code: o.code,
      telegramUsername: o.telegramUsername,
      accountCountry: accountCountryMap.get(o.telegramUsername.toLowerCase().replace(/^@/, "")) ?? accountCountryMap.get(o.telegramUsername.toLowerCase()) ?? null,
      status: o.status,
      deliveryMethod: o.deliveryMethod,
      deliveryMethodId: o.deliveryMethodId,
      deliveryPrice: parseFloat(String(o.deliveryPrice ?? "0")),
      vendorShipping: parseFloat(String(o.vendorShipping ?? "0")),
      productSubtotal: parseFloat(String(o.productSubtotal ?? "0")),
      tip: parseFloat(String(o.tip ?? "0")),
      grandTotal: parseFloat(String(o.grandTotal ?? "0")),
      notes: o.notes ?? null,
      adminNotes: o.adminNotes ?? null,
      adminMessage: o.adminMessage ?? null,
      trackingNumber: o.trackingNumber ?? null,
      paymentStatus: o.paymentStatus ?? "unpaid",
      paymentTxHash: txHash,
      testPaymentTxHash: o.testPaymentTxHash ?? null,
      paymentTestAmount: o.paymentTestAmount != null ? parseFloat(String(o.paymentTestAmount)) : null,
      paymentMethod,
      hasPaymentScreenshot: (o.paymentScreenshot ?? null) !== null,
      shippingName: o.shippingName ?? null,
      shippingAddress: o.shippingAddress ?? null,
      shippingCountry: o.shippingCountry ?? null,
      countryLegId: o.countryLegId ?? null,
      pin: o.pin ?? "0000",
      inpostQrCode: o.inpostQrCode ?? null,
      testingContribution: o.testingContribution != null ? parseFloat(String(o.testingContribution)) : null,
      creditsApplied: o.creditsApplied != null ? parseFloat(String(o.creditsApplied)) : 0,
      amountDue: o.amountDue != null ? parseFloat(String(o.amountDue)) : 0,
      balancePaymentStatus: o.balancePaymentStatus ?? null,
      directShippingRequested: o.directShippingRequested ?? false,
      reshipperUsername: o.reshipperUsername ?? null,
      adminFee: o.adminFee != null ? parseFloat(String(o.adminFee)) : 0,
      adminFeeLabel: o.adminFeeLabel ?? null,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
      lineItems: (liByOrder.get(o.id) ?? []).map((li) => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName,
        quantity: parseFloat(String(li.quantity)),
        unitPrice: parseFloat(String(li.unitPrice)),
        lineTotal: parseFloat(String(li.lineTotal)),
      })),
      };
    })
  );
});

// ── GET /admin/group-buys/:gbId/orders/:orderId/screenshot — fetch single order screenshot
router.get("/admin/group-buys/:gbId/orders/:orderId/screenshot", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId, orderId } = req.params;

  const [order] = await db
    .select({ paymentScreenshot: ordersTable.paymentScreenshot })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), eq(ordersTable.id, orderId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ paymentScreenshot: order.paymentScreenshot ?? null });
});

// ── GET /admin/group-buys/payment-configs — list all GBs with their payment methods
router.get("/admin/group-buys/payment-configs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rows = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      paymentsEnabled: groupBuysTable.paymentsEnabled,
      organiserPayments: groupBuysTable.organiserPayments,
    })
    .from(groupBuysTable)
    .orderBy(asc(groupBuysTable.name));

  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    paymentsEnabled: r.paymentsEnabled,
    cryptoWalletAddress: (r.organiserPayments as Record<string, unknown> | null)?.["cryptoWalletAddress"] as string ?? null,
    cryptoCurrency: (r.organiserPayments as Record<string, unknown> | null)?.["cryptoCurrency"] as string ?? "USDT",
    cryptoNetwork: (r.organiserPayments as Record<string, unknown> | null)?.["cryptoNetwork"] as string ?? "ERC-20",
    revolutHandle: (r.organiserPayments as Record<string, unknown> | null)?.["revolutHandle"] as string ?? null,
    paypalHandle: (r.organiserPayments as Record<string, unknown> | null)?.["paypalHandle"] as string ?? null,
    anonPayEnabled: !!((r.organiserPayments as Record<string, unknown> | null)?.["anonPayEnabled"]),
    anonPayWallet: (r.organiserPayments as Record<string, unknown> | null)?.["anonPayWallet"] as string ?? null,
    anonPayTicker: (r.organiserPayments as Record<string, unknown> | null)?.["anonPayTicker"] as string ?? "usdt",
    anonPayNetwork: (r.organiserPayments as Record<string, unknown> | null)?.["anonPayNetwork"] as string ?? "ERC20",
  })));
});

// ── PATCH /admin/group-buys/:id/payment-methods — update payment methods for a GB
router.patch("/admin/group-buys/:id/payment-methods", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { cryptoWalletAddress, cryptoCurrency, cryptoNetwork, revolutHandle, paypalHandle, anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork } = req.body;

  const [existing] = await db
    .select({ organiserPayments: groupBuysTable.organiserPayments })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  const current = (existing.organiserPayments as Record<string, unknown>) ?? {};
  const updated: Record<string, unknown> = {
    ...current,
    cryptoWalletAddress: cryptoWalletAddress !== undefined ? (cryptoWalletAddress?.trim() || null) : (current["cryptoWalletAddress"] ?? null),
    cryptoCurrency: cryptoCurrency !== undefined ? (cryptoCurrency?.trim() || "USDT") : (current["cryptoCurrency"] ?? "USDT"),
    cryptoNetwork: cryptoNetwork !== undefined ? (cryptoNetwork?.trim() || "ERC-20") : (current["cryptoNetwork"] ?? "ERC-20"),
    revolutHandle: revolutHandle !== undefined ? (revolutHandle?.trim() || null) : (current["revolutHandle"] ?? null),
    paypalHandle: paypalHandle !== undefined ? (paypalHandle?.trim() || null) : (current["paypalHandle"] ?? null),
    anonPayEnabled: anonPayEnabled !== undefined ? !!anonPayEnabled : (!!current["anonPayEnabled"]),
    anonPayWallet: anonPayWallet !== undefined ? (anonPayWallet?.trim() || null) : (current["anonPayWallet"] ?? null),
    anonPayTicker: anonPayTicker !== undefined ? (anonPayTicker?.trim() || "usdt") : (current["anonPayTicker"] ?? "usdt"),
    anonPayNetwork: anonPayNetwork !== undefined ? (anonPayNetwork?.trim() || "ERC20") : (current["anonPayNetwork"] ?? "ERC20"),
  };

  await db
    .update(groupBuysTable)
    .set({ organiserPayments: updated })
    .where(eq(groupBuysTable.id, id));

  res.json({
    ok: true,
    id,
    cryptoWalletAddress: updated["cryptoWalletAddress"],
    cryptoCurrency: updated["cryptoCurrency"],
    cryptoNetwork: updated["cryptoNetwork"],
    revolutHandle: updated["revolutHandle"],
    paypalHandle: updated["paypalHandle"],
    anonPayEnabled: updated["anonPayEnabled"],
    anonPayWallet: updated["anonPayWallet"],
    anonPayTicker: updated["anonPayTicker"],
    anonPayNetwork: updated["anonPayNetwork"],
  });
});

// ── GET /admin/group-buys/:id/payment-test-mode — get test mode settings + payment method preview ──
router.get("/admin/group-buys/:id/payment-test-mode", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const [row] = await db
    .select({
      organiserPayments: groupBuysTable.organiserPayments,
      paymentsEnabled: groupBuysTable.paymentsEnabled,
      paymentsTestMode: groupBuysTable.paymentsTestMode,
      paymentsTestUsernames: groupBuysTable.paymentsTestUsernames,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));
  if (!row) { res.status(404).json({ error: "Group buy not found" }); return; }
  const op = (row.organiserPayments as Record<string, unknown> | null) ?? {};
  res.json({
    paymentsEnabled: row.paymentsEnabled,
    paymentsTestMode: row.paymentsTestMode ?? false,
    paymentsTestUsernames: (row.paymentsTestUsernames as string[] | null) ?? [],
    cryptoWalletAddress: op["cryptoWalletAddress"] as string ?? null,
    cryptoCurrency: op["cryptoCurrency"] as string ?? null,
    cryptoNetwork: op["cryptoNetwork"] as string ?? null,
    revolutHandle: op["revolutHandle"] as string ?? null,
    paypalHandle: op["paypalHandle"] as string ?? null,
    anonPayEnabled: !!(op["anonPayEnabled"]),
    anonPayWallet: op["anonPayWallet"] as string ?? null,
    anonPayTicker: op["anonPayTicker"] as string ?? null,
    anonPayNetwork: op["anonPayNetwork"] as string ?? null,
  });
});

// ── PATCH /admin/group-buys/:id/payment-test-mode — toggle test mode and update whitelist ──
router.patch("/admin/group-buys/:id/payment-test-mode", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { paymentsTestMode, paymentsTestUsernames } = req.body;

  const [existing] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));
  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (typeof paymentsTestMode === "boolean") updates["paymentsTestMode"] = paymentsTestMode;
  if (Array.isArray(paymentsTestUsernames)) {
    updates["paymentsTestUsernames"] = paymentsTestUsernames.map((u: string) => u.trim()).filter(Boolean);
  }

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  await db.update(groupBuysTable).set(updates as any).where(eq(groupBuysTable.id, id));
  res.json({ ok: true, ...updates });
});

// ── GET /admin/approved-reshippers — list all approved reshipper accounts ──
router.get("/admin/approved-reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

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

// ── GET /admin/group-buys/:id/reshippers — list reshipper assignments ──
router.get("/admin/group-buys/:id/reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;

  const rows = await db
    .select()
    .from(gbReshippersTable)
    .where(eq(gbReshippersTable.gbId, id))
    .orderBy(gbReshippersTable.createdAt);

  res.json(rows);
});

// ── POST /admin/group-buys/:id/reshippers — assign a reshipper ──
router.post("/admin/group-buys/:id/reshippers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;

  const { reshipperUsername, country, paymentTarget, enabledPaymentMethods } = req.body as {
    reshipperUsername?: string;
    country?: string;
    paymentTarget?: string;
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
    .where(eq(accountsTable.telegramUsername, reshipperUsername.trim()));

  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  if (account.reshipperStatus !== "approved") {
    res.status(400).json({ error: "Account must be an approved reshipper" });
    return;
  }

  const VALID_PAYMENT_TARGETS = ["reshipper", "admin"] as const;
  const resolvedTarget = VALID_PAYMENT_TARGETS.includes(paymentTarget as typeof VALID_PAYMENT_TARGETS[number])
    ? paymentTarget as typeof VALID_PAYMENT_TARGETS[number]
    : "reshipper";

  let assignment;
  try {
    [assignment] = await db
      .insert(gbReshippersTable)
      .values({
        id: randomUUID(),
        gbId: id,
        reshipperUsername: reshipperUsername.trim(),
        country: country.trim(),
        paymentTarget: resolvedTarget,
        enabledPaymentMethods: enabledPaymentMethods ?? {},
      })
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "This reshipper is already assigned to this group buy" });
      return;
    }
    throw err;
  }

  res.status(201).json(assignment);
});

// ── PATCH /admin/group-buys/:id/reshippers/:username — update assignment ──
router.patch("/admin/group-buys/:id/reshippers/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id, username } = req.params;

  const [assignment] = await db
    .select()
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, id), eq(gbReshippersTable.reshipperUsername, username)));

  if (!assignment) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

  const { enabled, paymentTarget, enabledPaymentMethods, reshipperFeeEnabled, reshipperFeeType, reshipperFeeAmount, allowPayments, allowVendorShippingSplit } = req.body as {
    enabled?: boolean;
    paymentTarget?: string;
    enabledPaymentMethods?: Record<string, boolean>;
    reshipperFeeEnabled?: boolean;
    reshipperFeeType?: string;
    reshipperFeeAmount?: string | null;
    allowPayments?: boolean;
    allowVendorShippingSplit?: boolean;
  };

  const VALID_PAYMENT_TARGETS = ["reshipper", "admin"] as const;
  const updates: Record<string, unknown> = {};

  if (enabled !== undefined && typeof enabled === "boolean") updates.enabled = enabled;
  if (paymentTarget !== undefined) {
    if (!VALID_PAYMENT_TARGETS.includes(paymentTarget as typeof VALID_PAYMENT_TARGETS[number])) {
      res.status(400).json({ error: "paymentTarget must be 'reshipper' or 'admin'" });
      return;
    }
    updates.paymentTarget = paymentTarget;
  }
  if (enabledPaymentMethods !== undefined) updates.enabledPaymentMethods = enabledPaymentMethods;
  if (reshipperFeeEnabled !== undefined) updates.reshipperFeeEnabled = Boolean(reshipperFeeEnabled);
  if (reshipperFeeType !== undefined) updates.reshipperFeeType = String(reshipperFeeType);
  if (reshipperFeeAmount !== undefined) updates.reshipperFeeAmount = reshipperFeeAmount ? String(reshipperFeeAmount) : null;
  if (allowPayments !== undefined) updates.allowPayments = Boolean(allowPayments);
  if (allowVendorShippingSplit !== undefined) updates.allowVendorShippingSplit = Boolean(allowVendorShippingSplit);

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

// ── DELETE /admin/group-buys/:id/reshippers/:username — remove assignment ──
router.delete("/admin/group-buys/:id/reshippers/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id, username } = req.params;

  const [assignment] = await db
    .select({ id: gbReshippersTable.id })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, id), eq(gbReshippersTable.reshipperUsername, username)));

  if (!assignment) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

  await db.delete(gbReshippersTable).where(eq(gbReshippersTable.id, assignment.id));

  res.json({ ok: true });
});

// ── POST /admin/group-buys/:gbId/backfill-country-legs ──────────────────────
// Retroactively assigns countryLegId to existing orders and memberships that
// lack one, using each user's account.country → matching leg.countryName.
router.post("/admin/group-buys/:gbId/backfill-country-legs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { gbId } = req.params;

  const [gb] = await db
    .select({ id: groupBuysTable.id, countryLegsEnabled: groupBuysTable.countryLegsEnabled })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (!gb.countryLegsEnabled) { res.status(400).json({ error: "Country legs are not enabled for this group buy" }); return; }

  // Build leg lookup keyed by lowercase full country name OR ISO code ("italy" / "it" → legId)
  const legs = await db
    .select({ id: gbCountryLegsTable.id, countryName: gbCountryLegsTable.countryName, countryCode: gbCountryLegsTable.countryCode })
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.gbId, gbId));

  if (legs.length === 0) { res.json({ updated: 0, message: "No country legs configured" }); return; }

  const legByName = new Map<string, string>();
  for (const l of legs) {
    legByName.set(l.countryName.toLowerCase(), l.id);
    legByName.set(l.countryCode.toLowerCase(), l.id);
  }

  // Step 1: Fetch all unassigned orders (no join — avoids username format mismatches)
  const unassignedOrders = await db
    .select({ orderId: ordersTable.id, telegramUsername: ordersTable.telegramUsername })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.countryLegId), isNull(ordersTable.deletedAt)));

  if (unassignedOrders.length === 0) {
    res.json({ updated: 0, total: 0, message: "All orders already have a country leg assigned" });
    return;
  }

  // Step 2: Fetch accounts for all unique usernames — try exact match first, then strip @ prefix
  const rawUsernames = [...new Set(unassignedOrders.map(o => o.telegramUsername))];
  const strippedUsernames = rawUsernames.map(u => u.replace(/^@/, ""));

  const accountRows = await db
    .select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country })
    .from(accountsTable)
    .where(inArray(accountsTable.telegramUsername, [...new Set([...rawUsernames, ...strippedUsernames])]));

  // Build case-insensitive username → country map
  const countryByUsername = new Map<string, string | null>();
  for (const a of accountRows) {
    countryByUsername.set(a.telegramUsername.toLowerCase(), a.country);
    countryByUsername.set(a.telegramUsername.toLowerCase().replace(/^@/, ""), a.country);
  }

  // Step 3: Match each order to a leg and update
  let updated = 0;
  let noAccount = 0;
  let noCountry = 0;
  let noLeg = 0;
  const membershipsSeen = new Set<string>();

  for (const row of unassignedOrders) {
    const lookupKey = row.telegramUsername.toLowerCase().replace(/^@/, "");
    const accountCountry = countryByUsername.get(lookupKey) ?? countryByUsername.get(row.telegramUsername.toLowerCase());

    if (accountCountry === undefined) { noAccount++; continue; }
    if (!accountCountry) { noCountry++; continue; }

    const legId = legByName.get(accountCountry.toLowerCase());
    if (!legId) { noLeg++; continue; }

    await db
      .update(ordersTable)
      .set({ countryLegId: legId })
      .where(and(eq(ordersTable.id, row.orderId), isNull(ordersTable.countryLegId)));

    // Backfill membership once per user
    const memberKey = `${lookupKey}::${gbId}`;
    if (!membershipsSeen.has(memberKey)) {
      membershipsSeen.add(memberKey);
      await db
        .update(accountGroupBuysTable)
        .set({ countryLegId: legId })
        .where(and(
          inArray(accountGroupBuysTable.accountId, [row.telegramUsername, row.telegramUsername.replace(/^@/, "")]),
          eq(accountGroupBuysTable.groupBuyId, gbId),
          isNull(accountGroupBuysTable.countryLegId),
        ));
    }

    updated++;
  }

  const detail: string[] = [];
  if (updated > 0) detail.push(`${updated} assigned`);
  if (noAccount > 0) detail.push(`${noAccount} no account found`);
  if (noCountry > 0) detail.push(`${noCountry} no country set`);
  if (noLeg > 0) detail.push(`${noLeg} country not in legs`);

  res.json({
    updated,
    total: unassignedOrders.length,
    noAccount,
    noCountry,
    noLeg,
    message: detail.join(", ") || "Nothing to assign",
  });
});

// ── POST /admin/group-buys/:gbId/backfill-admin-fee ─────────────────────────
// Applies the GB's configured admin fee to all non-deleted, non-direct-to-home
// orders that don't yet have it. Mirrors the organiser-side backfill but uses
// admin auth so it's accessible from the admin Orders tab.
router.post("/admin/group-buys/:gbId/backfill-admin-fee", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      adminFeeEnabled: groupBuysTable.adminFeeEnabled,
      adminFeeAmount: groupBuysTable.adminFeeAmount,
      adminFeeLabel: groupBuysTable.adminFeeLabel,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (!gb.adminFeeEnabled || gb.adminFeeAmount == null) {
    res.status(400).json({ error: "Admin fee is not enabled or amount not set for this group buy" });
    return;
  }

  const feeAmount = parseFloat(String(gb.adminFeeAmount));
  if (feeAmount <= 0) { res.status(400).json({ error: "Admin fee amount must be greater than 0" }); return; }

  const result = await db.execute(sql`
    UPDATE orders
    SET
      admin_fee       = ${feeAmount}::numeric,
      admin_fee_label = ${gb.adminFeeLabel ?? null},
      grand_total     = grand_total + ${feeAmount}::numeric
    WHERE
      group_buy_id = ${gbId}
      AND deleted_at IS NULL
      AND (admin_fee IS NULL OR admin_fee = 0)
      AND (direct_shipping_requested IS NOT TRUE)
  `);

  const updated = (result as { rowCount?: number }).rowCount ?? 0;
  res.json({ ok: true, updated });
});

// ── GET /admin/group-buys/:gbId/fulfilment — fulfilment routing view ──────────
router.get("/admin/group-buys/:gbId/fulfilment", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [legs, reshippers, orders] = await Promise.all([
    db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.gbId, gbId)).orderBy(asc(gbCountryLegsTable.sortOrder)),
    db.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId)).orderBy(gbReshippersTable.createdAt),
    db.select().from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt))).orderBy(asc(ordersTable.createdAt)),
  ]);

  const orderIds = orders.map(o => o.id);
  const allLineItems = orderIds.length > 0
    ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];

  const liByOrder = new Map<string, typeof allLineItems>();
  for (const li of allLineItems) {
    const arr = liByOrder.get(li.orderId) ?? [];
    arr.push(li);
    liByOrder.set(li.orderId, arr);
  }

  const mapOrder = (o: typeof orders[0]) => ({
    id: o.id,
    code: o.code,
    telegramUsername: o.telegramUsername,
    status: o.status,
    paymentStatus: o.paymentStatus ?? "unpaid",
    directShippingRequested: o.directShippingRequested ?? false,
    routingType: o.routingType ?? null,
    batchLocked: o.batchLocked ?? false,
    reshipperHubCountry: o.reshipperHubCountry ?? null,
    reshipperUsername: o.reshipperUsername ?? null,
    countryLegId: o.countryLegId ?? null,
    shippingName: o.shippingName ?? null,
    shippingAddress: o.shippingAddress ?? null,
    shippingCity: o.shippingCity ?? null,
    shippingPostcode: o.shippingPostcode ?? null,
    shippingPhone: (o as any).shippingPhone ?? null,
    shippingEmail: (o as any).shippingEmail ?? null,
    shippingCountry: o.shippingCountry ?? null,
    grandTotal: parseFloat(String(o.grandTotal ?? "0")),
    directShippingCost: o.directShippingCost != null ? parseFloat(String(o.directShippingCost)) : null,
    vendorShipping: o.vendorShipping != null ? parseFloat(String(o.vendorShipping)) : null,
    deliveryMethod: o.deliveryMethod ?? null,
    deliveryPrice: o.deliveryPrice != null ? parseFloat(String(o.deliveryPrice)) : null,
    notes: o.notes ?? null,
    lineItems: (liByOrder.get(o.id) ?? []).map(li => ({
      productName: li.productName,
      quantity: parseFloat(String(li.quantity)),
    })),
  });

  const legSet = new Set(legs.map(l => l.id));
  const ordersByLeg = new Map<string, typeof orders>();
  const unleggedOrders: typeof orders = [];

  for (const o of orders) {
    if (o.countryLegId && legSet.has(o.countryLegId)) {
      const arr = ordersByLeg.get(o.countryLegId) ?? [];
      arr.push(o);
      ordersByLeg.set(o.countryLegId, arr);
    } else {
      unleggedOrders.push(o);
    }
  }

  res.json({
    legs: legs.map(leg => ({
      id: leg.id,
      countryCode: leg.countryCode,
      countryName: leg.countryName,
      sortOrder: leg.sortOrder,
      directShippingEnabled: leg.directShippingEnabled ?? false,
      paymentBlocked: leg.paymentBlocked ?? false,
      reshippers: reshippers
        .filter(r => r.country === leg.countryCode || r.country === leg.countryName)
        .map(r => ({
          reshipperUsername: r.reshipperUsername,
          country: r.country,
          enabled: r.enabled,
          reshipperCode: r.reshipperCode ?? null,
          codeCapacity: r.codeCapacity ?? null,
        })),
      orders: (ordersByLeg.get(leg.id) ?? []).map(mapOrder),
    })),
    unleggedOrders: unleggedOrders.map(mapOrder),
  });
});

// ── PATCH /admin/group-buys/:gbId/orders/:orderId/route — set routing ────────
// Accepts routingType ('direct' | 'reshipper' | 'unrouted') or legacy route ('direct' | 'reshipper').
router.patch("/admin/group-buys/:gbId/orders/:orderId/route", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId, orderId } = req.params;
  const body = req.body as { route?: string; routingType?: string; reshipperUsername?: string | null; reason?: string };

  // Accept either new routingType or legacy route field
  const routingType = body.routingType ?? body.route;
  if (routingType !== "direct" && routingType !== "reshipper" && routingType !== "unrouted") {
    res.status(400).json({ error: "routingType must be 'direct', 'reshipper', or 'unrouted'" });
    return;
  }

  const [order] = await db
    .select({
      id: ordersTable.id,
      groupBuyId: ordersTable.groupBuyId,
      routingType: ordersTable.routingType,
      reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), isNull(ordersTable.deletedAt)));

  if (!order || order.groupBuyId !== gbId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const newReshipperUsername = body.reshipperUsername !== undefined ? (body.reshipperUsername ?? null) : order.reshipperUsername;

  await db.update(ordersTable)
    .set({
      routingType,
      directShippingRequested: routingType === "direct",
      ...(body.reshipperUsername !== undefined && { reshipperUsername: body.reshipperUsername ?? null }),
    })
    .where(eq(ordersTable.id, orderId));

  // Record routing history
  await db.insert(routingHistoryTable).values({
    orderId,
    changedBy: "admin",
    fromRoutingType: order.routingType ?? null,
    toRoutingType: routingType,
    fromReshipperUsername: order.reshipperUsername ?? null,
    toReshipperUsername: newReshipperUsername,
    fromCountryLegId: order.countryLegId ?? null,
    toCountryLegId: order.countryLegId ?? null,
    reason: body.reason ?? null,
  }).catch(() => {}); // non-fatal

  res.json({ ok: true, routingType });
});

// ── POST /admin/group-buys/:gbId/bulk-route — bulk set routing type ──────────
router.post("/admin/group-buys/:gbId/bulk-route", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { orderIds, routingType, reshipperUsername, reason } = req.body as {
    orderIds?: string[];
    routingType?: string;
    reshipperUsername?: string | null;
    reason?: string;
  };

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    res.status(400).json({ error: "orderIds must be a non-empty array" });
    return;
  }
  if (routingType !== "direct" && routingType !== "reshipper" && routingType !== "unrouted") {
    res.status(400).json({ error: "routingType must be 'direct', 'reshipper', or 'unrouted'" });
    return;
  }

  const existingOrders = await db
    .select({
      id: ordersTable.id,
      routingType: ordersTable.routingType,
      reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      inArray(ordersTable.id, orderIds),
      isNull(ordersTable.deletedAt),
    ));

  if (existingOrders.length === 0) {
    res.status(404).json({ error: "No matching orders found in this group buy" });
    return;
  }

  const updateSet: Record<string, unknown> = {
    routingType,
    directShippingRequested: routingType === "direct",
  };
  if (reshipperUsername !== undefined) updateSet.reshipperUsername = reshipperUsername ?? null;

  await db.update(ordersTable)
    .set(updateSet)
    .where(inArray(ordersTable.id, existingOrders.map(o => o.id)));

  // Batch insert routing history
  const historyRows = existingOrders.map(o => ({
    orderId: o.id,
    changedBy: "admin",
    fromRoutingType: o.routingType ?? null,
    toRoutingType: routingType,
    fromReshipperUsername: o.reshipperUsername ?? null,
    toReshipperUsername: reshipperUsername !== undefined ? (reshipperUsername ?? null) : (o.reshipperUsername ?? null),
    fromCountryLegId: o.countryLegId ?? null,
    toCountryLegId: o.countryLegId ?? null,
    reason: reason ?? null,
    metadata: { bulk: true, gbId } as Record<string, unknown>,
  }));
  await db.insert(routingHistoryTable).values(historyRows).catch(() => {});

  res.json({ ok: true, updated: existingOrders.length, routingType });
});

// ── PATCH /admin/group-buys/:gbId/country-legs/:legId/batch-lock ─────────────
// Locks or unlocks all orders in a country leg to prevent further routing changes.
router.patch("/admin/group-buys/:gbId/country-legs/:legId/batch-lock", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId, legId } = req.params;
  const { locked } = req.body as { locked?: boolean };

  if (typeof locked !== "boolean") {
    res.status(400).json({ error: "locked must be a boolean" });
    return;
  }

  const [leg] = await db
    .select({ id: gbCountryLegsTable.id })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));

  if (!leg) {
    res.status(404).json({ error: "Country leg not found" });
    return;
  }

  const now = new Date();
  await db.update(ordersTable)
    .set({ batchLocked: locked, batchLockedAt: locked ? now : null })
    .where(and(eq(ordersTable.countryLegId, legId), isNull(ordersTable.deletedAt)));

  res.json({ ok: true, legId, locked });
});

// ── GET /admin/group-buys/:gbId/routing-warnings — routing health check ──────
router.get("/admin/group-buys/:gbId/routing-warnings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const [orders, legs, reshippers] = await Promise.all([
    db.select({
      id: ordersTable.id,
      routingType: ordersTable.routingType,
      directShippingRequested: ordersTable.directShippingRequested,
      reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId,
      shippingCountry: ordersTable.shippingCountry,
    }).from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt))),
    db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.gbId, gbId)),
    db.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId)),
  ]);

  // Unrouted = no routing decision made (null routingType and no legacy signals)
  const unroutedOrders = orders.filter(o => {
    if (o.routingType === "direct" || o.routingType === "reshipper") return false;
    if (o.routingType === "unrouted") return true;
    // Legacy fallback: has a routing signal → not unrouted
    if (o.directShippingRequested) return false;
    if (o.reshipperUsername) return false;
    return true; // null with no signal = genuinely unrouted
  });

  // Legs with multiple reshippers where some orders have no reshipper assigned
  const legWarnings: { legId: string; legName: string; reshipperCount: number; unassignedOrders: number }[] = [];
  for (const leg of legs) {
    const legReshippers = reshippers.filter(r => r.country === leg.countryCode || r.country === leg.countryName);
    if (legReshippers.length > 1) {
      const legOrders = orders.filter(o => o.countryLegId === leg.id);
      const unassigned = legOrders.filter(o =>
        !o.reshipperUsername &&
        o.routingType !== "direct" &&
        !o.directShippingRequested
      );
      if (unassigned.length > 0) {
        legWarnings.push({ legId: leg.id, legName: leg.countryName, reshipperCount: legReshippers.length, unassignedOrders: unassigned.length });
      }
    }
  }

  res.json({
    unroutedCount: unroutedOrders.length,
    legWarnings,
    paymentBlockedLegs: legs.filter(l => l.paymentBlocked).map(l => ({ legId: l.id, legName: l.countryName })),
  });
});

// ── PATCH /admin/group-buys/:gbId/orders/:orderId/country-leg — reassign leg ──
// Moves an order to a different country leg (or clears its leg assignment).
// Optionally also sets/clears the reshipper in one call for drag-and-drop board.
router.patch("/admin/group-buys/:gbId/orders/:orderId/country-leg", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId, orderId } = req.params;
  const { countryLegId, reshipperUsername } = req.body as {
    countryLegId: string | null;
    reshipperUsername?: string | null;
  };

  const [order] = await db
    .select({ id: ordersTable.id, groupBuyId: ordersTable.groupBuyId, code: ordersTable.code })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), isNull(ordersTable.deletedAt)));

  if (!order || order.groupBuyId !== gbId) {
    res.status(404).json({ error: "Order not found in this group buy" });
    return;
  }

  if (countryLegId !== null && countryLegId !== undefined) {
    const [leg] = await db
      .select({
        id: gbCountryLegsTable.id,
        countryCode: gbCountryLegsTable.countryCode,
        countryName: gbCountryLegsTable.countryName,
      })
      .from(gbCountryLegsTable)
      .where(and(eq(gbCountryLegsTable.id, countryLegId), eq(gbCountryLegsTable.gbId, gbId)));
    if (!leg) {
      res.status(404).json({ error: "Country leg not found in this group buy" });
      return;
    }

    // If a reshipper is being set, verify they are enabled for this GB
    // and that their country assignment covers the target leg.
    if (reshipperUsername && reshipperUsername !== null) {
      const assignments = await db
        .select({ id: gbReshippersTable.id, country: gbReshippersTable.country })
        .from(gbReshippersTable)
        .where(and(
          eq(gbReshippersTable.gbId, gbId),
          eq(gbReshippersTable.reshipperUsername, reshipperUsername),
          eq(gbReshippersTable.enabled, true),
        ));
      if (assignments.length === 0) {
        res.status(400).json({ error: `@${reshipperUsername} is not an enabled reshipper for this group buy` });
        return;
      }
      // Also confirm at least one of their country slots covers the destination leg
      // (matches by countryCode or countryName, consistent with fulfilment view).
      const legCoversReshipper = assignments.some(
        a => a.country === leg.countryCode || a.country === leg.countryName,
      );
      if (!legCoversReshipper) {
        res.status(400).json({
          error: `@${reshipperUsername} is not assigned to cover ${leg.countryName} (${leg.countryCode}) in this group buy`,
        });
        return;
      }
    }
  }

  const updates: Record<string, unknown> = { countryLegId: countryLegId ?? null };
  if (reshipperUsername !== undefined) {
    updates.reshipperUsername = reshipperUsername ?? null;
  }

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, orderId));

  writeLog(
    "change", "info", "order_leg_reassigned",
    `Admin moved order ${order.code ?? orderId} to leg ${countryLegId ?? "unassigned"}${reshipperUsername !== undefined ? ` / reshipper: ${reshipperUsername ?? "none"}` : ""}`,
    { orderId, gbId, countryLegId, reshipperUsername }
  ).catch(() => {});

  res.json({ ok: true, orderId, countryLegId: countryLegId ?? null, reshipperUsername: reshipperUsername ?? undefined });
});

// ── GET /api/group-buys/:gbId/validate-reshipper-code ─────────────────────────
// Public endpoint — no admin auth. Used by OrderForm to validate a reshipper code
// before order submission.
router.get("/group-buys/:gbId/validate-reshipper-code", async (req, res): Promise<void> => {
  const { gbId } = req.params;
  const code = (req.query["code"] as string | undefined)?.trim().toUpperCase() ?? "";
  if (!code) { res.status(400).json({ error: "code is required" }); return; }

  const [reshipper] = await db
    .select({
      reshipperUsername: gbReshippersTable.reshipperUsername,
      codeCapacity: gbReshippersTable.codeCapacity,
      reshipperCodeActive: gbReshippersTable.reshipperCodeActive,
    })
    .from(gbReshippersTable)
    .where(and(
      eq(gbReshippersTable.gbId, gbId),
      eq(gbReshippersTable.reshipperCode, code),
      eq(gbReshippersTable.enabled, true),
    ));

  if (!reshipper || !reshipper.reshipperCodeActive) {
    res.status(404).json({ valid: false, error: "Invalid or expired reshipper code" });
    return;
  }

  // Check capacity
  if (reshipper.codeCapacity !== null) {
    const [used] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.groupBuyId, gbId),
        eq(ordersTable.reshipperUsername, reshipper.reshipperUsername),
        isNull(ordersTable.deletedAt),
      ));
    if ((used?.cnt ?? 0) >= reshipper.codeCapacity) {
      res.status(200).json({ valid: false, error: "This reshipper has reached their capacity limit" });
      return;
    }
  }

  res.json({ valid: true, reshipperUsername: reshipper.reshipperUsername });
});

// ── POST /admin/group-buys/:gbId/routing-undo ─────────────────────────────────
// Reverses the most recent routing change for any order in this GB.
router.post("/admin/group-buys/:gbId/routing-undo", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  // Find the most recent routing_history entry for any order in this GB
  const [latest] = await db
    .select()
    .from(routingHistoryTable)
    .innerJoin(ordersTable, eq(routingHistoryTable.orderId, ordersTable.id))
    .where(eq(ordersTable.groupBuyId, gbId))
    .orderBy(desc(routingHistoryTable.createdAt))
    .limit(1);

  if (!latest) {
    res.status(404).json({ error: "No routing history found for this group buy" });
    return;
  }

  const h = latest.routing_history;
  const orderId = h.orderId;

  // Restore previous state
  await db.update(ordersTable).set({
    routingType: h.fromRoutingType as "direct" | "reshipper" | "unrouted" | null,
    reshipperUsername: h.fromReshipperUsername,
    countryLegId: h.fromCountryLegId,
  }).where(eq(ordersTable.id, orderId));

  // Log the undo
  await db.insert(routingHistoryTable).values({
    orderId,
    changedBy: "admin:undo",
    fromRoutingType: h.toRoutingType,
    toRoutingType: h.fromRoutingType,
    fromReshipperUsername: h.toReshipperUsername,
    toReshipperUsername: h.fromReshipperUsername,
    fromCountryLegId: h.toCountryLegId,
    toCountryLegId: h.fromCountryLegId,
    reason: `Undo of entry #${h.id}`,
    metadata: { undoOfId: h.id },
  });

  writeLog("change", "info", "routing_undo", `Admin undid routing change #${h.id} for order ${orderId}`, { gbId, orderId, undoOfId: h.id }).catch(() => {});
  res.json({ ok: true, orderId, restoredTo: { routingType: h.fromRoutingType, reshipperUsername: h.fromReshipperUsername, countryLegId: h.fromCountryLegId } });
});

// ── GET /admin/orders/:orderId/routing-history ────────────────────────────────
router.get("/admin/orders/:orderId/routing-history", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { orderId } = req.params;
  const history = await db
    .select()
    .from(routingHistoryTable)
    .where(eq(routingHistoryTable.orderId, orderId))
    .orderBy(desc(routingHistoryTable.createdAt));
  res.json(history);
});

// ── GET /admin/group-buys/:gbId/fs3-batch ────────────────────────────────────
// Returns orders grouped by their routing destination for the FS3 batch builder.
router.get("/admin/group-buys/:gbId/fs3-batch", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const [gb, orders, legs, reshippers] = await Promise.all([
    db.select({ name: groupBuysTable.name, currency: groupBuysTable.currency })
      .from(groupBuysTable).where(eq(groupBuysTable.id, gbId)).then(r => r[0]),
    db.select({
      id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status, paymentStatus: sql<string>`coalesce(${ordersTable.paymentStatus},'unpaid')`,
      grandTotal: ordersTable.grandTotal, vendorShipping: ordersTable.vendorShipping,
      shippingCountry: ordersTable.shippingCountry, shippingName: ordersTable.shippingName,
      shippingAddress: ordersTable.shippingAddress, shippingCity: sql<string | null>`null`,
      shippingPostcode: sql<string | null>`null`, shippingPhone: ordersTable.shippingPhone,
      routingType: ordersTable.routingType, reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId, batchLocked: ordersTable.batchLocked,
      directShippingRequested: ordersTable.directShippingRequested,
      deliveryMethod: ordersTable.deliveryMethod,
      createdAt: ordersTable.createdAt,
    }).from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt))),
    db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.gbId, gbId)),
    db.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId)),
  ]);

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Fetch line items for all orders
  const orderIds = orders.map(o => o.id);
  const lineItems = orderIds.length > 0
    ? await db.select({ orderId: orderLineItemsTable.orderId, productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity })
        .from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];
  const liByOrder = new Map<string, typeof lineItems>();
  for (const li of lineItems) {
    const arr = liByOrder.get(li.orderId) ?? [];
    arr.push(li);
    liByOrder.set(li.orderId, arr);
  }

  // Determine effective routing for each order
  const effectiveRoute = (o: typeof orders[0]): "direct" | "reshipper" | "unrouted" => {
    if (o.routingType === "direct") return "direct";
    if (o.routingType === "reshipper") return "reshipper";
    if (o.routingType === "unrouted") return "unrouted";
    if (o.directShippingRequested) return "direct";
    if (o.reshipperUsername) return "reshipper";
    return "unrouted";
  };

  const enriched = orders.map(o => ({
    ...o,
    lineItems: liByOrder.get(o.id) ?? [],
    effectiveRoute: effectiveRoute(o),
    grandTotal: parseFloat(String(o.grandTotal ?? 0)),
    vendorShipping: parseFloat(String(o.vendorShipping ?? 0)),
  }));

  // Group by reshipper (for reshipper orders) or "direct"
  const directOrders = enriched.filter(o => o.effectiveRoute === "direct");
  const unroutedOrders = enriched.filter(o => o.effectiveRoute === "unrouted");
  const reshipperOrders = enriched.filter(o => o.effectiveRoute === "reshipper");

  const reshipperGroups = new Map<string, typeof enriched>();
  for (const o of reshipperOrders) {
    const key = o.reshipperUsername ?? "__unassigned__";
    const arr = reshipperGroups.get(key) ?? [];
    arr.push(o);
    reshipperGroups.set(key, arr);
  }

  const legById = new Map(legs.map(l => [l.id, l]));
  const reshipperByUsername = new Map(reshippers.map(r => [r.reshipperUsername, r]));

  const reshipperBatches = Array.from(reshipperGroups.entries()).map(([username, bOrders]) => {
    const reshipper = reshipperByUsername.get(username);
    const countries = [...new Set(bOrders.map(o => o.countryLegId ? (legById.get(o.countryLegId)?.countryName ?? o.shippingCountry) : o.shippingCountry).filter(Boolean))];
    return {
      reshipperUsername: username === "__unassigned__" ? null : username,
      countries,
      orders: bOrders,
      totalOrders: bOrders.length,
      confirmedPayments: bOrders.filter(o => o.paymentStatus === "confirmed").length,
      unconfirmedPayments: bOrders.filter(o => o.paymentStatus !== "confirmed").length,
      totalVendorShipping: bOrders.reduce((s, o) => s + o.vendorShipping, 0),
    };
  });

  res.json({
    gbName: gb.name,
    currency: gb.currency,
    directBatch: {
      orders: directOrders,
      totalOrders: directOrders.length,
      confirmedPayments: directOrders.filter(o => o.paymentStatus === "confirmed").length,
      unconfirmedPayments: directOrders.filter(o => o.paymentStatus !== "confirmed").length,
      totalVendorShipping: directOrders.reduce((s, o) => s + o.vendorShipping, 0),
    },
    reshipperBatches,
    unroutedOrders,
    summary: {
      total: orders.length,
      direct: directOrders.length,
      reshipper: reshipperOrders.length,
      unrouted: unroutedOrders.length,
      confirmedPayments: orders.filter(o => o.paymentStatus === "confirmed").length,
    },
  });
});

// ── POST /admin/group-buys/:gbId/fs3-generate ────────────────────────────────
// Generates order sheets for FS3 batch — returns structured sheet data per routing group.
router.post("/admin/group-buys/:gbId/fs3-generate", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { includeUnconfirmed = false } = (req.body ?? {}) as { includeUnconfirmed?: boolean };

  const [gb] = await db.select({ name: groupBuysTable.name, currency: groupBuysTable.currency })
    .from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const orders = await db.select({
    id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
    status: ordersTable.status, paymentStatus: sql<string>`coalesce(${ordersTable.paymentStatus},'unpaid')`,
    grandTotal: ordersTable.grandTotal, vendorShipping: ordersTable.vendorShipping,
    shippingCountry: ordersTable.shippingCountry, shippingName: ordersTable.shippingName,
    shippingAddress: ordersTable.shippingAddress, shippingPhone: ordersTable.shippingPhone,
    routingType: ordersTable.routingType, reshipperUsername: ordersTable.reshipperUsername,
    directShippingRequested: ordersTable.directShippingRequested, deliveryMethod: ordersTable.deliveryMethod,
    countryLegId: ordersTable.countryLegId,
  }).from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));

  const orderIds = orders.map(o => o.id);
  const lineItems = orderIds.length > 0
    ? await db.select({ orderId: orderLineItemsTable.orderId, productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity, unitPrice: orderLineItemsTable.unitPrice })
        .from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];
  const liByOrder = new Map<string, typeof lineItems>();
  for (const li of lineItems) { const arr = liByOrder.get(li.orderId) ?? []; arr.push(li); liByOrder.set(li.orderId, arr); }

  const shouldInclude = (o: typeof orders[0]) => includeUnconfirmed || o.paymentStatus === "confirmed";
  const effectiveRoute = (o: typeof orders[0]): string => {
    if (o.routingType === "direct") return "direct";
    if (o.routingType === "reshipper") return "reshipper";
    if (o.directShippingRequested) return "direct";
    if (o.reshipperUsername) return "reshipper";
    return "unrouted";
  };

  const eligible = orders.filter(shouldInclude);
  const fmt = (o: typeof orders[0]) => {
    const items = (liByOrder.get(o.id) ?? []).map(li => `  ${li.productName} x${parseFloat(String(li.quantity))}`).join("\n");
    return [
      `Order: ${o.code ?? o.id} | @${o.telegramUsername.replace(/^@/, "")} | ${o.shippingCountry ?? "?"}`,
      items,
      o.shippingName ? `  Ship to: ${o.shippingName}` : "",
      o.shippingAddress ? `  Address: ${o.shippingAddress}` : "",
      o.shippingPhone ? `  Phone: ${o.shippingPhone}` : "",
      `  Grand Total: ${gb.currency} ${parseFloat(String(o.grandTotal ?? 0)).toFixed(2)}`,
      `  Payment: ${o.paymentStatus}`,
    ].filter(Boolean).join("\n");
  };

  const directOrders = eligible.filter(o => effectiveRoute(o) === "direct");
  const reshipperOrders = eligible.filter(o => effectiveRoute(o) === "reshipper");

  const reshipperGroups = new Map<string, typeof eligible>();
  for (const o of reshipperOrders) {
    const key = o.reshipperUsername ?? "__unassigned__";
    const arr = reshipperGroups.get(key) ?? [];
    arr.push(o);
    reshipperGroups.set(key, arr);
  }

  const sheets: { label: string; content: string; orderCount: number; type: "direct" | "reshipper" }[] = [];

  if (directOrders.length > 0) {
    sheets.push({
      label: `${gb.name} — Direct Shipping`,
      type: "direct",
      orderCount: directOrders.length,
      content: [`=== ${gb.name} — Direct Orders ===`, `Generated: ${new Date().toISOString()}`, "", ...directOrders.map(fmt)].join("\n\n"),
    });
  }

  for (const [username, bOrders] of reshipperGroups.entries()) {
    const label = username === "__unassigned__" ? "Unassigned Reshipper" : `@${username.replace(/^@/, "")}`;
    sheets.push({
      label: `${gb.name} — ${label}`,
      type: "reshipper",
      orderCount: bOrders.length,
      content: [`=== ${gb.name} — ${label} ===`, `Generated: ${new Date().toISOString()}`, "", ...bOrders.map(fmt)].join("\n\n"),
    });
  }

  writeLog("change", "info", "fs3_sheets_generated", `FS3 sheets generated for ${gb.name}: ${sheets.length} sheet(s), ${eligible.length} order(s)`, { gbId, sheetCount: sheets.length, orderCount: eligible.length }).catch(() => {});

  res.json({ sheets, generatedAt: new Date().toISOString(), totalOrders: eligible.length });
});

// ── POST /admin/group-buys/:gbId/fs3-submit ──────────────────────────────────
// Locks all orders in the batch (sets batchLocked = true, status → Processing if confirmed).
// Records a submission in fs3_submissions for history tracking.
router.post("/admin/group-buys/:gbId/fs3-submit", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { includeUnconfirmed = false, submittedBy = "admin", notes = "", sheets = [] } = req.body as { includeUnconfirmed?: boolean; submittedBy?: string; notes?: string; sheets?: { label: string; type: string; orderCount: number }[] };

  const orders = await db.select({
    id: ordersTable.id, status: ordersTable.status,
    paymentStatus: sql<string>`coalesce(${ordersTable.paymentStatus},'unpaid')`,
    routingType: ordersTable.routingType, reshipperUsername: ordersTable.reshipperUsername,
    directShippingRequested: ordersTable.directShippingRequested,
  }).from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));

  const eligible = orders.filter(o => includeUnconfirmed || o.paymentStatus === "confirmed");
  if (eligible.length === 0) {
    res.status(400).json({ error: "No eligible orders to submit" });
    return;
  }

  const now = new Date();
  const eligibleIds = eligible.map(o => o.id);

  // Lock all eligible orders and advance confirmed ones to Processing
  await db.update(ordersTable)
    .set({ batchLocked: true, batchLockedAt: now })
    .where(inArray(ordersTable.id, eligibleIds));

  // Advance confirmed orders to Processing if they're still Submitted
  const toProcess = eligible.filter(o => o.paymentStatus === "confirmed" && o.status === "Submitted");
  if (toProcess.length > 0) {
    await db.update(ordersTable)
      .set({ status: "Processing" })
      .where(inArray(ordersTable.id, toProcess.map(o => o.id)));
  }

  // Record submission in fs3_submissions for history tracking
  const submissionId = randomUUID();
  await db.insert(fs3SubmissionsTable).values({
    id: submissionId,
    gbId,
    submittedBy: String(submittedBy),
    totalOrders: eligible.length,
    processedCount: toProcess.length,
    includeUnconfirmed: String(includeUnconfirmed),
    notes: notes ? String(notes) : null,
    sheets: sheets.length > 0 ? sheets : null,
    status: "submitted",
    createdAt: now,
  }).catch(() => {}); // non-fatal — don't fail the submit if history write fails

  writeLog("change", "info", "fs3_batch_submitted", `FS3 batch submitted for GB ${gbId}: ${eligible.length} orders locked, ${toProcess.length} advanced to Processing`, {
    gbId, orderCount: eligible.length, processedCount: toProcess.length, submittedBy, notes, submissionId,
  }).catch(() => {});

  res.json({ ok: true, lockedCount: eligible.length, processedCount: toProcess.length, submittedAt: now.toISOString(), submissionId });
});

// ── GET /admin/group-buys/:gbId/fs3-submissions ───────────────────────────────
// Returns the list of past FS3 batch submissions for history tracking.
router.get("/admin/group-buys/:gbId/fs3-submissions", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  const submissions = await db
    .select()
    .from(fs3SubmissionsTable)
    .where(eq(fs3SubmissionsTable.gbId, gbId))
    .orderBy(desc(fs3SubmissionsTable.createdAt))
    .limit(50);

  res.json(submissions);
});

// ── PATCH /admin/group-buys/:gbId/country-legs/:legId/payment-blocked ────────
// Toggle payment_blocked for a country leg (used by fulfillment board).
router.patch("/admin/group-buys/:gbId/country-legs/:legId/payment-blocked", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId, legId } = req.params;
  const { paymentBlocked } = req.body as { paymentBlocked: boolean };

  if (typeof paymentBlocked !== "boolean") {
    res.status(400).json({ error: "paymentBlocked must be boolean" });
    return;
  }

  const [leg] = await db
    .select({ id: gbCountryLegsTable.id, countryName: gbCountryLegsTable.countryName })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));

  if (!leg) { res.status(404).json({ error: "Country leg not found" }); return; }

  await db.update(gbCountryLegsTable).set({ paymentBlocked }).where(eq(gbCountryLegsTable.id, legId));

  writeLog("change", "info", paymentBlocked ? "leg_payments_blocked" : "leg_payments_unblocked",
    `Admin ${paymentBlocked ? "blocked" : "unblocked"} payments for leg ${leg.countryName} in GB ${gbId}`,
    { gbId, legId, countryName: leg.countryName, paymentBlocked }
  ).catch(() => {});

  res.json({ ok: true, legId, paymentBlocked });
});

export default router;

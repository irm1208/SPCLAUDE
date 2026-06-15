import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  accountsTable,
  accountGroupBuysTable,
  groupBuysTable,
  groupBuyProductsTable,
  gbCountryLegsTable,
  productsTable,
  labTestsTable,
  ordersTable,
  orderLineItemsTable,
  gbParcelsTable,
  intlShippingRatesTable,
  type GroupBuy,
} from "@workspace/db";
import { eq, and, or, sql, desc, asc, inArray, ilike, isNull, isNotNull, gt } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { requireOrganiser } from "../middleware/require-organiser";
import { validateAdminOrganiserSession } from "../lib/admin-organiser-sessions";
import { writeLog } from "../lib/audit-log";
import { notifyUser, notifyUserFromTemplate, sendTelegramMessage, sendAdminFromTemplate } from "../lib/telegram";
import { GoogleGenAI } from "../lib/google-genai";

const router: IRouter = Router();
const BCRYPT_ROUNDS = 10;

// ── Lab-test duplicate helper ─────────────────────────────────────────────────
async function findLabTestDuplicate(
  url: string | null | undefined,
  batchCode: string | null | undefined,
  testDate: string | null | undefined,
  peptideName: string | null | undefined,
): Promise<number | null> {
  const conditions: ReturnType<typeof eq>[] = [];
  const trimmedUrl = url?.trim();
  if (trimmedUrl) conditions.push(eq(labTestsTable.url, trimmedUrl));
  const trimmedBatch = batchCode?.trim();
  const trimmedDate = testDate?.trim();
  const trimmedName = peptideName?.trim();
  if (trimmedBatch && trimmedDate && trimmedName) {
    conditions.push(
      and(
        isNotNull(labTestsTable.batchCode),
        eq(labTestsTable.batchCode, trimmedBatch),
        isNotNull(labTestsTable.testDate),
        eq(labTestsTable.testDate, trimmedDate),
        eq(labTestsTable.peptideName, trimmedName),
      ) as ReturnType<typeof eq>,
    );
  }
  if (conditions.length === 0) return null;
  const [found] = await db
    .select({ id: labTestsTable.id })
    .from(labTestsTable)
    .where(or(...conditions))
    .limit(1);
  return found?.id ?? null;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Returns the Drizzle WHERE condition for GB ownership.
 * When admin organiser mode is active, bypasses ownership filter and
 * returns only the target GB (adminGbId) instead.
 * @param req Express request (with req.organiser set)
 * @param gbId The GB id param from the route (if filtering by specific GB)
 */
function gbOwner(req: Request, gbId?: string | null) {
  if (req.organiser?.isAdmin) {
    const targetId = gbId ?? req.organiser.adminGbId;
    return targetId ? eq(groupBuysTable.id, targetId) : sql`true`;
  }
  const username = req.organiser!.telegramUsername;
  return gbId
    ? and(eq(groupBuysTable.id, gbId), eq(groupBuysTable.organiserId, username))
    : eq(groupBuysTable.organiserId, username);
}

// ─── Gemini client (reuse env vars already used by gemini-lab-extract) ─────────
const gemini = new GoogleGenAI({
  apiKey: process.env["AI_INTEGRATIONS_GEMINI_API_KEY"],
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env["AI_INTEGRATIONS_GEMINI_BASE_URL"],
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function formatGb(gb: GroupBuy) {
  return {
    ...gb,
    infoCards: parseJson(gb.infoCards, []),
    shippingOptions: parseJson(gb.shippingOptions, []),
    adminFeeCountries: parseJson((gb as Record<string, unknown>).adminFeeCountries as string, []),
    sharedShippingCountries: parseJson((gb as Record<string, unknown>).sharedShippingCountries as string, []),
    // organiserPayments and pnlCosts are JSONB — returned as-is
    organiserPayments: gb.organiserPayments ?? null,
    pnlCosts: gb.pnlCosts ?? null,
    vendorShippingAmount: gb.vendorShippingAmount != null ? parseFloat(String(gb.vendorShippingAmount)) : null,
  };
}

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

// ─── Profile Routes ─────────────────────────────────────────────────────────────

// GET /api/organiser/me — profile + organiser status (no organiser role required)
router.get("/organiser/me", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;
  const [account] = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      organiserStatus: accountsTable.organiserStatus,
      organiserApprovedAt: accountsTable.organiserApprovedAt,
      organiserPaymentMethods: accountsTable.organiserPaymentMethods,
      organiserAllowedVendors: accountsTable.organiserAllowedVendors,
    })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(account);
});

// GET /api/organiser/search-users?q= — autocomplete: usernames starting with q
router.get("/organiser/search-users", requireOrganiser, async (req, res): Promise<void> => {
  const q = String(req.query["q"] ?? "").toLowerCase().trim().replace(/^@/, "");
  if (!q) { res.json([]); return; }
  const rows = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(ilike(accountsTable.telegramUsername, `${q}%`))
    .limit(6);
  res.json(rows.map(r => r.telegramUsername));
});

// GET /api/organiser/check-user/:username — check if an account exists
router.get("/organiser/check-user/:username", requireOrganiser, async (req, res): Promise<void> => {
  const username = String(req.params["username"]).toLowerCase().trim().replace(/^@/, "");
  const [account] = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${username}`);
  res.json({ exists: !!account });
});

// POST /api/organiser/apply — apply to become a GB organiser
router.post("/organiser/apply", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;

  const [account] = await db
    .select({ organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (account.organiserStatus === "approved") {
    res.status(409).json({ error: "You are already an approved GB Organiser." });
    return;
  }
  if (account.organiserStatus === "applied") {
    res.status(409).json({ error: "Your application is already pending review." });
    return;
  }
  if (account.organiserStatus === "suspended") {
    res.status(403).json({ error: "Your GB Organiser account has been suspended. Contact admin to appeal." });
    return;
  }

  await db
    .update(accountsTable)
    .set({ organiserStatus: "applied" })
    .where(eq(accountsTable.telegramUsername, username));

  writeLog("change", "info", "organiser_applied", `Account @${username} applied to become a GB Organiser`, { username }).catch(() => {});
  sendAdminFromTemplate("admin_role_application_organiser", { username }).catch(() => {});

  res.json({ ok: true, organiserStatus: "applied" });
});

// PUT /api/organiser/me/payment-methods — update global payment methods
router.put("/organiser/me/payment-methods", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const { usdtWallet, revolutHandle, paypalHandle, cryptoCurrency, cryptoNetwork, cryptoWalletAddress } = req.body as {
    usdtWallet?: string | null;
    revolutHandle?: string | null;
    paypalHandle?: string | null;
    cryptoCurrency?: string | null;
    cryptoNetwork?: string | null;
    cryptoWalletAddress?: string | null;
  };

  const methods = {
    usdtWallet: usdtWallet ? String(usdtWallet).trim() : undefined,
    revolutHandle: revolutHandle ? String(revolutHandle).trim() : undefined,
    paypalHandle: paypalHandle ? String(paypalHandle).trim() : undefined,
    cryptoCurrency: cryptoCurrency ? String(cryptoCurrency).trim() : undefined,
    cryptoNetwork: cryptoNetwork ? String(cryptoNetwork).trim() : undefined,
    cryptoWalletAddress: cryptoWalletAddress ? String(cryptoWalletAddress).trim() : undefined,
  };

  const [updated] = await db
    .update(accountsTable)
    .set({ organiserPaymentMethods: methods })
    .where(eq(accountsTable.telegramUsername, username))
    .returning({ organiserPaymentMethods: accountsTable.organiserPaymentMethods });

  res.json({ ok: true, organiserPaymentMethods: updated.organiserPaymentMethods });
});

// ─── Group Buy Routes ───────────────────────────────────────────────────────────

// GET /api/organiser/group-buys — list own GBs
router.get("/organiser/group-buys", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const rows = await db
    .select()
    .from(groupBuysTable)
    .where(gbOwner(req))
    .orderBy(desc(groupBuysTable.createdAt));

  res.json(rows.map(formatGb));
});

// POST /api/organiser/group-buys — create a GB
router.post("/organiser/group-buys", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const {
    name, description, closeDate, invitePin, manufacturer, manufacturerCountry,
    infoCards, currency, labTestSupplier, vendorShippingEnabled, vendorShippingMessage,
    vendorShippingAmount,
    paymentMessageEnabled, paymentMessage, paymentsEnabled, memberLimit, minMembers,
    maxKitsPerCustomer, maxKitsTotal, minKitsPerPerson,
    shippingOptions, organiserPayments, allowedCountries, excludedCountries, blockedAccounts,
    adminFeeEnabled, adminFeeAmount, adminFeeLabel,
    allowHalfKits, qrUploadInpostEnabled, qrUploadRoyalMailEnabled, qrUploadMessage,
    orderPageMessage,
  } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (invitePin && (typeof invitePin !== "string" || !/^\d{4}$/.test(invitePin.trim()))) {
    res.status(400).json({ error: "invitePin must be exactly 4 numeric digits" });
    return;
  }

  if (shippingOptions !== undefined && shippingOptions !== null) {
    const err = validateShippingOptions(shippingOptions);
    if (err) { res.status(400).json({ error: err }); return; }
  }

  if (manufacturer && String(manufacturer).trim()) {
    const mfr = String(manufacturer).trim().toLowerCase();
    const activeStatuses = ["active"];
    const existing = await db
      .select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId })
      .from(groupBuysTable)
      .where(and(
        sql`lower(${groupBuysTable.manufacturer}) = ${mfr}`,
        inArray(groupBuysTable.status, activeStatuses),
      ));
    if (existing.length > 0) {
      const isAdmin = existing.some(g => !g.organiserId);
      const label = isAdmin ? "an admin" : `organiser @${existing[0].organiserId}`;
      res.status(409).json({ error: `An active group buy for this vendor/manufacturer already exists (run by ${label}: "${existing[0].name}"). Only one active GB per vendor is allowed.` });
      return;
    }
  }

  const parsedMemberLimit = memberLimit != null && memberLimit !== "" ? parseInt(String(memberLimit)) : null;
  if (parsedMemberLimit !== null && (isNaN(parsedMemberLimit) || parsedMemberLimit < 1)) {
    res.status(400).json({ error: "memberLimit must be a positive integer" });
    return;
  }

  let invitePinHash: string | undefined;
  if (invitePin && typeof invitePin === "string" && invitePin.trim().length > 0) {
    invitePinHash = await bcrypt.hash(invitePin.trim(), BCRYPT_ROUNDS);
  }

  const id = await uniqueGroupBuyId();

  const [gb] = await db.insert(groupBuysTable).values({
    id,
    name: name.trim(),
    description: description ? String(description).trim() : undefined,
    status: "draft",
    closeDate: closeDate ? (() => { const d = new Date(closeDate); return isNaN(d.getTime()) ? undefined : d; })() : undefined,
    invitePinHash,
    manufacturer: manufacturer ? String(manufacturer).trim() : undefined,
    manufacturerCountry: manufacturerCountry ? String(manufacturerCountry).trim() : undefined,
    labTestSupplier: labTestSupplier ? String(labTestSupplier).trim() : undefined,
    infoCards: infoCards ? JSON.stringify(infoCards) : undefined,
    currency: currency ?? "GBP",
    vendorShippingEnabled: vendorShippingEnabled != null ? Boolean(vendorShippingEnabled) : false,
    vendorShippingMessage: vendorShippingMessage ? String(vendorShippingMessage).trim() : undefined,
    vendorShippingAmount: vendorShippingAmount != null && vendorShippingAmount !== "" ? parseFloat(String(vendorShippingAmount)).toFixed(2) as any : undefined,
    paymentMessageEnabled: paymentMessageEnabled != null ? Boolean(paymentMessageEnabled) : false,
    paymentMessage: paymentMessage ? String(paymentMessage).trim() : undefined,
    paymentsEnabled: paymentsEnabled != null ? Boolean(paymentsEnabled) : true,
    memberLimit: parsedMemberLimit,
    minMembers: minMembers != null && minMembers !== "" ? parseInt(String(minMembers)) : undefined,
    maxKitsPerCustomer: maxKitsPerCustomer != null && maxKitsPerCustomer !== "" ? parseInt(String(maxKitsPerCustomer)) : undefined,
    maxKitsTotal: maxKitsTotal != null && maxKitsTotal !== "" ? parseInt(String(maxKitsTotal)) : undefined,
    minKitsPerPerson: minKitsPerPerson != null && minKitsPerPerson !== "" ? parseInt(String(minKitsPerPerson)) : undefined,
    hiddenFromList: true,
    shippingOptions: shippingOptions ? JSON.stringify(shippingOptions) : undefined,
    organiserId: username,
    approvalStatus: "pending_approval",
    organiserPayments: organiserPayments ?? undefined,
    allowedCountries: Array.isArray(allowedCountries) ? allowedCountries : undefined,
    excludedCountries: Array.isArray(excludedCountries) ? excludedCountries : undefined,
    blockedAccounts: Array.isArray(blockedAccounts) ? blockedAccounts : undefined,
    adminFeeEnabled: adminFeeEnabled != null ? Boolean(adminFeeEnabled) : false,
    adminFeeAmount: adminFeeAmount != null && adminFeeAmount !== "" ? parseFloat(String(adminFeeAmount)).toFixed(2) as any : undefined,
    adminFeeLabel: adminFeeLabel ? String(adminFeeLabel).trim() : undefined,
    allowHalfKits: allowHalfKits != null ? Boolean(allowHalfKits) : true,
    orderPageMessage: orderPageMessage ? String(orderPageMessage).trim() : undefined,
  }).returning();

  writeLog("change", "info", "organiser_gb_created", `Organiser @${username} created GB: ${gb.name}`, { gbId: id, username }).catch(() => {});

  res.status(201).json(formatGb(gb));
});

// PATCH /api/organiser/group-buys/:id/request-public — request public listing
router.patch("/organiser/group-buys/:id/request-public", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select({ id: groupBuysTable.id, approvalStatus: groupBuysTable.approvalStatus, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  if (existing.approvalStatus === "rejected") {
    res.status(403).json({ error: "This group buy was rejected by admin and cannot request public listing." });
    return;
  }
  if (existing.approvalStatus === "public_requested") {
    res.status(409).json({ error: "Public listing request already pending." });
    return;
  }

  const [updated] = await db
    .update(groupBuysTable)
    .set({ approvalStatus: "public_requested" })
    .where(eq(groupBuysTable.id, id))
    .returning();

  res.json(formatGb(updated));
});

// GET /api/organiser/group-buys/:id/rules — get GB organiser rules
router.get("/organiser/group-buys/:id/rules", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const [gb] = await db
    .select({ organiserRules: groupBuysTable.organiserRules })
    .from(groupBuysTable)
    .where(gbOwner(req, id));
  if (!gb) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ rules: gb.organiserRules ?? [] });
});

// PATCH /api/organiser/group-buys/:id/rules — save GB organiser rules
router.patch("/organiser/group-buys/:id/rules", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { rules } = req.body as { rules: unknown };
  if (!Array.isArray(rules)) { res.status(400).json({ error: "rules must be an array" }); return; }
  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(gbOwner(req, id));
  if (!gb) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db
    .update(groupBuysTable)
    .set({ organiserRules: rules as { id: string; text: string; enabled: boolean; format: string }[] })
    .where(eq(groupBuysTable.id, id))
    .returning({ organiserRules: groupBuysTable.organiserRules });
  res.json({ rules: updated.organiserRules ?? [] });
});

// PATCH /api/organiser/group-buys/:id/qr-viewers — update QR viewer access list
// Body: { usernames: string[] }
router.patch("/organiser/group-buys/:id/qr-viewers", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { usernames } = req.body as { usernames?: unknown };
  if (!Array.isArray(usernames)) {
    res.status(400).json({ error: "usernames must be an array" });
    return;
  }

  const [existing] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  const cleaned = usernames
    .map((u: unknown) => String(u).trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  const [updated] = await db
    .update(groupBuysTable)
    .set({ qrViewerUsernames: cleaned.length > 0 ? cleaned : null } as Record<string, unknown>)
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, qrViewerUsernames: groupBuysTable.qrViewerUsernames });

  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json({ qrViewerUsernames: updated.qrViewerUsernames ?? [] });
});

// PATCH /api/organiser/group-buys/:id/leg-viewers — update leg viewer access list
// Body: { legViewerAccess: { username: string; legIds: string[] }[] }
router.patch("/organiser/group-buys/:id/leg-viewers", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { legViewerAccess } = req.body as { legViewerAccess?: unknown };
  if (!Array.isArray(legViewerAccess)) {
    res.status(400).json({ error: "legViewerAccess must be an array" });
    return;
  }

  const [existing] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  const cleaned = (legViewerAccess as { username?: unknown; legIds?: unknown }[])
    .filter(e => typeof e.username === "string" && Array.isArray(e.legIds))
    .map(e => ({
      username: String(e.username).trim().toLowerCase().replace(/^@/, ""),
      legIds: (e.legIds as unknown[]).map(String).filter(Boolean),
    }))
    .filter(e => e.username && e.legIds.length > 0);

  const [updated] = await db
    .update(groupBuysTable)
    .set({ legViewerAccess: cleaned.length > 0 ? cleaned : null } as Record<string, unknown>)
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, legViewerAccess: groupBuysTable.legViewerAccess });

  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json({ legViewerAccess: updated.legViewerAccess ?? [] });
});

// GET /api/organiser/group-buys/:id — get own GB
router.get("/organiser/group-buys/:id", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select()
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  res.json(formatGb(gb));
});

// PATCH /api/organiser/group-buys/:id — update own GB
router.patch("/organiser/group-buys/:id", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select({ id: groupBuysTable.id, approvalStatus: groupBuysTable.approvalStatus })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const {
    name, description, status, closeDate, invitePin,
    manufacturer, manufacturerCountry, infoCards, currency,
    labTestSupplier, vendorShippingEnabled, vendorShippingMessage,
    vendorShippingAmount, vendorShippingKits,
    paymentMessageEnabled, paymentMessage, paymentsEnabled,
    memberLimit, minMembers, maxKitsPerCustomer, maxKitsTotal, minKitsPerPerson,
    shippingOptions, organiserPayments,
    allowedCountries, excludedCountries, blockedAccounts,
    adminFeeEnabled, adminFeeAmount, adminFeeLabel, adminFeeCountries,
    sharedShippingCountries,
    allowHalfKits, qrUploadInpostEnabled, qrUploadRoyalMailEnabled, qrUploadMessage,
    orderPageMessage, countryLegsEnabled, qrViewerUsernames, testOrderPin,
    allowEditOrderWhenClosed, allowEditAddressWhenClosed, allowDeleteOrderWhenClosed,
  } = req.body;

  // Organisers can change status only within: draft, active, closed (not archived by self — admin can archive)
  const ALLOWED_STATUSES = ["draft", "active", "closed"];
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
    return;
  }

  // APPROVAL GATE: organisers cannot set status "active" unless admin has approved the GB
  const isAdminApproved = existing.approvalStatus === "approved" || existing.approvalStatus === "public_requested";
  if (status === "active" && !isAdminApproved) {
    const msg = existing.approvalStatus === "pending_approval"
      ? "Your group buy is pending admin approval before it can be made active."
      : existing.approvalStatus === "rejected"
        ? "Your group buy was rejected by admin and cannot be made active."
        : "Your group buy must be approved by admin before it can be made active.";
    res.status(403).json({ error: msg, approvalStatus: existing.approvalStatus });
    return;
  }

  if (shippingOptions !== undefined && shippingOptions !== null) {
    const err = validateShippingOptions(shippingOptions);
    if (err) { res.status(400).json({ error: err }); return; }
  }

  const updates: Partial<Omit<GroupBuy, "id" | "createdAt" | "updatedAt">> = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (status !== undefined) updates.status = status;
  if (closeDate !== undefined) updates.closeDate = closeDate ? new Date(closeDate) : null;
  if (manufacturer !== undefined) updates.manufacturer = manufacturer ? String(manufacturer).trim() : null;
  if (manufacturerCountry !== undefined) updates.manufacturerCountry = manufacturerCountry ? String(manufacturerCountry).trim() : null;
  if (infoCards !== undefined) updates.infoCards = infoCards ? JSON.stringify(infoCards) : null;
  if (currency !== undefined) updates.currency = String(currency).trim();
  if (labTestSupplier !== undefined) updates.labTestSupplier = labTestSupplier ? String(labTestSupplier).trim() : null;
  if (vendorShippingEnabled !== undefined) updates.vendorShippingEnabled = Boolean(vendorShippingEnabled);
  if (vendorShippingMessage !== undefined) updates.vendorShippingMessage = vendorShippingMessage ? String(vendorShippingMessage).trim() : null;
  if (vendorShippingAmount !== undefined) {
    (updates as Record<string, unknown>)["vendorShippingAmount"] = vendorShippingAmount != null && vendorShippingAmount !== "" ? parseFloat(String(vendorShippingAmount)).toFixed(2) : null;
  }
  if (vendorShippingKits !== undefined) {
    (updates as Record<string, unknown>)["vendorShippingKits"] = vendorShippingKits != null && vendorShippingKits !== "" ? parseInt(String(vendorShippingKits)) : null;
  }
  if (paymentMessageEnabled !== undefined) updates.paymentMessageEnabled = Boolean(paymentMessageEnabled);
  if (paymentMessage !== undefined) updates.paymentMessage = paymentMessage ? String(paymentMessage).trim() : null;
  if (paymentsEnabled !== undefined) updates.paymentsEnabled = Boolean(paymentsEnabled);
  if (memberLimit !== undefined) {
    const ml = memberLimit != null && memberLimit !== "" ? parseInt(String(memberLimit)) : null;
    if (ml !== null && (isNaN(ml) || ml < 1)) { res.status(400).json({ error: "memberLimit must be a positive integer" }); return; }
    updates.memberLimit = ml;
  }
  if (minMembers !== undefined) {
    updates.minMembers = minMembers != null && minMembers !== "" ? parseInt(String(minMembers)) : null;
  }
  if (maxKitsPerCustomer !== undefined) {
    updates.maxKitsPerCustomer = maxKitsPerCustomer != null && maxKitsPerCustomer !== "" ? parseInt(String(maxKitsPerCustomer)) : null;
  }
  if (maxKitsTotal !== undefined) {
    updates.maxKitsTotal = maxKitsTotal != null && maxKitsTotal !== "" ? parseInt(String(maxKitsTotal)) : null;
  }
  if (minKitsPerPerson !== undefined) {
    (updates as Record<string, unknown>)["minKitsPerPerson"] = minKitsPerPerson != null && minKitsPerPerson !== "" ? parseInt(String(minKitsPerPerson)) : null;
  }
  if (shippingOptions !== undefined) {
    updates.shippingOptions = shippingOptions ? JSON.stringify(shippingOptions) : null;
  }
  if (organiserPayments !== undefined) {
    (updates as Record<string, unknown>)["organiserPayments"] = organiserPayments ?? null;
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
  if (sharedShippingCountries !== undefined) {
    (updates as Record<string, unknown>)["sharedShippingCountries"] = Array.isArray(sharedShippingCountries) ? JSON.stringify(sharedShippingCountries) : null;
  }
  if (allowHalfKits !== undefined) updates.allowHalfKits = Boolean(allowHalfKits);
  if (allowEditOrderWhenClosed !== undefined) updates.allowEditOrderWhenClosed = Boolean(allowEditOrderWhenClosed);
  if (allowEditAddressWhenClosed !== undefined) updates.allowEditAddressWhenClosed = Boolean(allowEditAddressWhenClosed);
  if (allowDeleteOrderWhenClosed !== undefined) updates.allowDeleteOrderWhenClosed = Boolean(allowDeleteOrderWhenClosed);
  if (qrUploadInpostEnabled !== undefined) updates.qrUploadInpostEnabled = Boolean(qrUploadInpostEnabled);
  if (qrUploadRoyalMailEnabled !== undefined) updates.qrUploadRoyalMailEnabled = Boolean(qrUploadRoyalMailEnabled);
  if (qrUploadMessage !== undefined) updates.qrUploadMessage = qrUploadMessage ? String(qrUploadMessage).trim() : null;
  if (orderPageMessage !== undefined) updates.orderPageMessage = orderPageMessage ? String(orderPageMessage).trim() : null;
  if (countryLegsEnabled !== undefined) updates.countryLegsEnabled = Boolean(countryLegsEnabled);
  if (qrViewerUsernames !== undefined) {
    (updates as Record<string, unknown>)["qrViewerUsernames"] = Array.isArray(qrViewerUsernames)
      ? qrViewerUsernames.map((u: unknown) => String(u).trim().toLowerCase()).filter(Boolean)
      : null;
  }
  if (invitePin !== undefined) {
    if (invitePin === null || invitePin === "") {
      updates.invitePinHash = null;
    } else {
      const pinStr = String(invitePin).trim();
      if (!/^\d{4}$/.test(pinStr)) { res.status(400).json({ error: "invitePin must be exactly 4 numeric digits" }); return; }
      updates.invitePinHash = await bcrypt.hash(pinStr, BCRYPT_ROUNDS);
    }
  }

  if (testOrderPin !== undefined) {
    if (testOrderPin === null || testOrderPin === "") {
      (updates as Record<string, unknown>)["testOrderPin"] = null;
    } else {
      const pinStr = String(testOrderPin).trim();
      if (!/^\d{4}$/.test(pinStr)) { res.status(400).json({ error: "testOrderPin must be exactly 4 numeric digits" }); return; }
      (updates as Record<string, unknown>)["testOrderPin"] = pinStr;
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

  writeLog("change", "info", "organiser_gb_updated",
    `Organiser @${username} updated GB "${updated.name ?? id}" settings`,
    { gbId: id, gbName: updated.name, username, changedFields: Object.keys(updates) },
  ).catch(() => {});

  res.json(formatGb(updated));
});

// POST /api/organiser/group-buys/:id/backfill-admin-fee
// Applies the GB's current admin fee to all existing orders that don't have it yet.
router.post("/organiser/group-buys/:id/backfill-admin-fee", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      adminFeeEnabled: groupBuysTable.adminFeeEnabled,
      adminFeeAmount: groupBuysTable.adminFeeAmount,
      adminFeeLabel: groupBuysTable.adminFeeLabel,
    })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (!gb.adminFeeEnabled || gb.adminFeeAmount == null) {
    res.status(400).json({ error: "Admin fee is not enabled or amount not set" });
    return;
  }

  const feeAmount = parseFloat(String(gb.adminFeeAmount));
  if (feeAmount <= 0) { res.status(400).json({ error: "Admin fee amount must be greater than 0" }); return; }

  // Update non-deleted, non-direct-to-home orders on this GB that don't already have the fee applied.
  // Direct-to-home orders are excluded — the admin/reshipping fee doesn't apply to them.
  const result = await db.execute(sql`
    UPDATE orders
    SET
      admin_fee = ${feeAmount}::numeric,
      admin_fee_label = ${gb.adminFeeLabel ?? null},
      grand_total = grand_total + ${feeAmount}::numeric
    WHERE
      group_buy_id = ${id}
      AND deleted_at IS NULL
      AND (admin_fee IS NULL OR admin_fee = 0)
      AND (direct_shipping_requested IS NOT TRUE)
  `);

  const updated = (result as { rowCount?: number }).rowCount ?? 0;
  res.json({ ok: true, updated });
});

// PATCH /api/organiser/group-buys/:id/payments — update GB-level payment methods
router.patch("/organiser/group-buys/:id/payments", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const { usdtWallet, revolutHandle, paypalHandle, cryptoCurrency, cryptoNetwork, cryptoWalletAddress, anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork } = req.body;

  const [existing] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  const payments = {
    usdtWallet: usdtWallet ? String(usdtWallet).trim() : undefined,
    revolutHandle: revolutHandle ? String(revolutHandle).trim() : undefined,
    paypalHandle: paypalHandle ? String(paypalHandle).trim() : undefined,
    cryptoCurrency: cryptoCurrency ? String(cryptoCurrency).trim() : undefined,
    cryptoNetwork: cryptoNetwork ? String(cryptoNetwork).trim() : undefined,
    cryptoWalletAddress: cryptoWalletAddress ? String(cryptoWalletAddress).trim() : undefined,
    anonPayEnabled: typeof anonPayEnabled === "boolean" ? anonPayEnabled : undefined,
    anonPayWallet: anonPayWallet != null ? (String(anonPayWallet).trim() || undefined) : undefined,
    anonPayTicker: anonPayTicker != null ? (String(anonPayTicker).trim() || undefined) : undefined,
    anonPayNetwork: anonPayNetwork != null ? (String(anonPayNetwork).trim() || undefined) : undefined,
  };

  await db
    .update(groupBuysTable)
    .set({ organiserPayments: payments })
    .where(eq(groupBuysTable.id, id));

  res.json({ ok: true, organiserPayments: payments });
});

// DELETE /api/organiser/group-buys/:id — soft-delete own GB (→ archived)
router.delete("/organiser/group-buys/:id", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [existing] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!existing) { res.status(404).json({ error: "Group buy not found" }); return; }

  await db.update(groupBuysTable).set({ status: "archived" }).where(eq(groupBuysTable.id, id));
  res.json({ ok: true, id });
});

// ─── Product Routes ────────────────────────────────────────────────────────────

// GET /api/organiser/group-buys/:id/products — list products for own GB
router.get("/organiser/group-buys/:id/products", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const rows = await db
    .select({
      gbpId: groupBuyProductsTable.id,
      groupBuyId: groupBuyProductsTable.groupBuyId,
      productId: groupBuyProductsTable.productId,
      priceOverride: groupBuyProductsTable.priceOverride,
      active: groupBuyProductsTable.active,
      sortOrder: groupBuyProductsTable.sortOrder,
      name: productsTable.name,
      vendor: productsTable.vendor,
      price: productsTable.price,
      category: productsTable.category,
      mgSize: productsTable.mgSize,
      stock: productsTable.stock,
      halfKitEnabled: productsTable.halfKitEnabled,
    })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(eq(groupBuyProductsTable.groupBuyId, id))
    .orderBy(asc(groupBuyProductsTable.sortOrder));

  res.json(rows.map(r => ({
    ...r,
    id: r.productId,
    price: parseFloat(String(r.price)),
    priceOverride: r.priceOverride != null ? parseFloat(String(r.priceOverride)) : null,
  })));
});

// POST /api/organiser/group-buys/:id/products — add a product manually
router.post("/organiser/group-buys/:id/products", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const { name, price, category, stock, priceOverride, mgSize, vendor } = req.body;
  if (!vendor || !String(vendor).trim()) { res.status(400).json({ error: "vendor is required" }); return; }

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Vendor restriction check
  const [orgAccount] = await db
    .select({ organiserAllowedVendors: accountsTable.organiserAllowedVendors })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));
  const allowedVendors = orgAccount?.organiserAllowedVendors ?? null;
  if (allowedVendors !== null) {
    const vendorName = String(vendor).trim();
    if (!allowedVendors.map(v => v.toLowerCase()).includes(vendorName.toLowerCase())) {
      res.status(403).json({ error: `Vendor "${vendorName}" is not in your allowed vendor list. Allowed: ${allowedVendors.length ? allowedVendors.join(", ") : "(none)"}` });
      return;
    }
  }

  if (!name || !String(name).trim()) { res.status(400).json({ error: "name is required" }); return; }
  const p = parseFloat(String(price));
  if (isNaN(p) || p < 0) { res.status(400).json({ error: "price must be a non-negative number" }); return; }

  const productId = `prod-${randomUUID().split("-")[0]}`;

  const result = await db.transaction(async (tx) => {
    const [product] = await tx.insert(productsTable).values({
      id: productId,
      name: String(name).trim(),
      vendor: String(vendor).trim(),
      price: p.toFixed(2),
      active: true,
      category: category ? String(category).trim() : null,
      sourceGroupBuyId: id,
      organiserId: username,
      mgSize: mgSize ? String(mgSize).trim() : null,
      stock: stock != null ? parseInt(String(stock)) : null,
    }).returning();

    await tx.insert(groupBuyProductsTable).values({
      id: randomUUID(),
      groupBuyId: id,
      productId,
      active: true,
      priceOverride: priceOverride != null ? String(parseFloat(String(priceOverride)).toFixed(2)) : undefined,
    });

    return product;
  });

  res.status(201).json({
    id: result.id,
    name: result.name,
    vendor: result.vendor,
    price: parseFloat(String(result.price)),
    active: result.active,
    category: result.category ?? null,
    stock: result.stock ?? null,
    sourceGroupBuyId: result.sourceGroupBuyId,
    organiserId: result.organiserId,
  });
});

// PATCH /api/organiser/group-buys/:id/products/:productId — update product
router.patch("/organiser/group-buys/:id/products/:productId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]); const productId = String(req.params["productId"]);

  // Verify ownership
  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [product] = await db
    .select({ id: productsTable.id, organiserId: productsTable.organiserId })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.organiserId, username)));

  if (!product) { res.status(404).json({ error: "Product not found or not owned by you" }); return; }

  const { name, price, category, stock, active, priceOverride, mgSize } = req.body;

  const productUpdates: Record<string, unknown> = {};
  if (name !== undefined) productUpdates.name = String(name).trim();
  if (price !== undefined) {
    const p = parseFloat(String(price));
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "price must be non-negative" }); return; }
    productUpdates.price = p.toFixed(2);
  }
  if (category !== undefined) productUpdates.category = category ? String(category).trim() : null;
  if (mgSize !== undefined) productUpdates.mgSize = mgSize ? String(mgSize).trim() : null;
  if (stock !== undefined) productUpdates.stock = stock != null ? parseInt(String(stock)) : null;
  if (active !== undefined) productUpdates.active = Boolean(active);

  if (Object.keys(productUpdates).length > 0) {
    await db.update(productsTable).set(productUpdates).where(eq(productsTable.id, productId));
  }

  // Update price override in the GB link
  if (priceOverride !== undefined) {
    const po = priceOverride != null && priceOverride !== ""
      ? String(parseFloat(String(priceOverride)).toFixed(2))
      : null;
    await db
      .update(groupBuyProductsTable)
      .set({ priceOverride: po })
      .where(and(eq(groupBuyProductsTable.groupBuyId, id), eq(groupBuyProductsTable.productId, productId)));
  }

  writeLog("change", "info", "organiser_product_updated",
    `Organiser @${username} updated product ${productId} in GB ${id}`,
    { gbId: id, productId, username, changedFields: [...Object.keys(productUpdates), ...(priceOverride !== undefined ? ["priceOverride"] : [])] },
  ).catch(() => {});

  res.json({ ok: true });
});

// DELETE /api/organiser/group-buys/:id/products/:productId — remove product
router.delete("/organiser/group-buys/:id/products/:productId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]); const productId = String(req.params["productId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Remove from GB products link
  await db
    .delete(groupBuyProductsTable)
    .where(and(eq(groupBuyProductsTable.groupBuyId, id), eq(groupBuyProductsTable.productId, productId)));

  // Also delete the underlying product if it belongs to this organiser
  await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.organiserId, username)));

  res.json({ ok: true });
});

// POST /api/organiser/group-buys/:id/import-csv
// Body: { rows: [{ name, price, category?, stock?, mgSize? }] }
router.post("/organiser/group-buys/:id/import-csv", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, manufacturer: groupBuysTable.manufacturer })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const { rows, vendor: bodyVendor } = req.body as { rows: { name: string; price: number; category?: string; stock?: number; mgSize?: string; unitCount?: string }[]; vendor?: string };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }

  // Validate all rows
  const invalid: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const price = parseFloat(String(row.price));
    if (!name || isNaN(price) || price < 0) invalid.push(i + 1);
  }
  if (invalid.length > 0) {
    res.status(400).json({ error: `Rows ${invalid.join(", ")} are missing or invalid name or price.` });
    return;
  }

  // Find the current max sortOrder so imported products appear after existing ones
  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupBuyProductsTable.sortOrder}), -1)` })
    .from(groupBuyProductsTable)
    .where(eq(groupBuyProductsTable.groupBuyId, id));
  const baseSortOrder = (maxRow?.maxOrder ?? -1) + 1;

  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row.name as string).trim();
    const price = parseFloat(String(row.price));
    const productId = randomUUID();

    const resolvedVendor = bodyVendor?.trim() || gb.manufacturer;
    if (!resolvedVendor) {
      res.status(400).json({ error: "vendor is required — provide it explicitly or set a manufacturer on the group buy" });
      return;
    }
    await db.insert(productsTable).values({
      id: productId,
      name,
      vendor: resolvedVendor,
      price: price.toFixed(2),
      active: true,
      category: row.category ? String(row.category).trim() : null,
      sourceGroupBuyId: id,
      organiserId: username,
      mgSize: row.mgSize ? String(row.mgSize).trim() : null,
      unitCount: row.unitCount ? String(row.unitCount).trim() : null,
      stock: row.stock != null ? parseInt(String(row.stock)) : null,
    });

    await db.insert(groupBuyProductsTable).values({
      id: randomUUID(),
      groupBuyId: id,
      productId,
      active: true,
      sortOrder: baseSortOrder + i,
    });

    created++;
  }

  res.status(201).json({ ok: true, created });
});

// GET /api/organiser/group-buys/:id/qr-orders
// Returns all orders for the GB that have a QR code uploaded, for use in the QR viewer.
router.get("/organiser/group-buys/:id/qr-orders", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      deliveryMethod: ordersTable.deliveryMethod,
      inpostQrCode: ordersTable.inpostQrCode,
      royalMailQrCode: ordersTable.royalMailQrCode,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), sql`(${ordersTable.inpostQrCode} IS NOT NULL OR ${ordersTable.royalMailQrCode} IS NOT NULL)`, isNull(ordersTable.deletedAt)))
    .orderBy(ordersTable.telegramUsername);

  res.json(orders);
});

// GET /api/organiser/group-buys/:id/all-orders-qr
// Returns ALL orders for the GB (whether or not they have a QR), for the full QR viewer list.
// Access: GB organiser, admin, or any account username listed in gb.qrViewerUsernames.
router.get("/organiser/group-buys/:id/all-orders-qr", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  // Admin bypass via organiser session token
  const adminToken = req.headers["x-admin-organiser-token"];
  let isAdminSession = false;
  if (adminToken && typeof adminToken === "string") {
    const session = validateAdminOrganiserSession(adminToken);
    if (session) isAdminSession = true;
  }

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, qrViewerUsernames: groupBuysTable.qrViewerUsernames })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const isOwner = !!gb.organiserId && gb.organiserId.toLowerCase() === username.toLowerCase();
  const isAdminAccount = username.toLowerCase() === (process.env["ADMIN_USERNAME"] ?? "").toLowerCase();
  const normalizedUsername = username.toLowerCase().replace(/^@/, "");
  const isQrViewer = (gb.qrViewerUsernames ?? []).some(u => u.toLowerCase().replace(/^@/, "") === normalizedUsername);

  if (!isAdminSession && !isOwner && !isAdminAccount && !isQrViewer) {
    res.status(403).json({ error: "Access denied. You are not authorised to view this group buy's QR codes." });
    return;
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      deliveryMethod: ordersTable.deliveryMethod,
      inpostQrCode: ordersTable.inpostQrCode,
      royalMailQrCode: ordersTable.royalMailQrCode,
      qrCodes: ordersTable.qrCodes,
      qrPosted: ordersTable.qrPosted,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)))
    .orderBy(ordersTable.telegramUsername);

  res.json({ gbName: gb.name, orders });
});

// PATCH /api/organiser/group-buys/:id/orders/:orderId/qr-posted
// Toggles the qrPosted flag on an order.
// Access: GB organiser, admin, or any account username listed in gb.qrViewerUsernames.
router.patch("/organiser/group-buys/:id/orders/:orderId/qr-posted", requireAccount, async (req, res): Promise<void> => {
  const username = req.account!.telegramUsername;
  const gbId = String(req.params["id"]);
  const orderId = String(req.params["orderId"]);

  const adminToken = req.headers["x-admin-organiser-token"];
  let isAdminSession = false;
  if (adminToken && typeof adminToken === "string") {
    const session = validateAdminOrganiserSession(adminToken);
    if (session) isAdminSession = true;
  }

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId, qrViewerUsernames: groupBuysTable.qrViewerUsernames })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const isOwner = !!gb.organiserId && gb.organiserId.toLowerCase() === username.toLowerCase();
  const isAdminAccount = username.toLowerCase() === (process.env["ADMIN_USERNAME"] ?? "").toLowerCase();
  const normalizedUsername = username.toLowerCase().replace(/^@/, "");
  const isQrViewer = (gb.qrViewerUsernames ?? []).some(u => u.toLowerCase().replace(/^@/, "") === normalizedUsername);

  if (!isAdminSession && !isOwner && !isAdminAccount && !isQrViewer) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const { posted } = req.body as { posted: boolean };
  if (typeof posted !== "boolean") { res.status(400).json({ error: "posted must be a boolean" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ qrPosted: posted })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)))
    .returning({ id: ordersTable.id, qrPosted: ordersTable.qrPosted });

  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

  res.json({ id: updated.id, qrPosted: updated.qrPosted });
});

// ─── GET /api/leg-view/:gbId ──────────────────────────────────────────────────
// Returns GB summary + legs + orders scoped to the requesting user's assigned legs.
// Access: any account whose username appears in gb.legViewerAccess.
router.get("/leg-view/:gbId", requireAccount, async (req, res): Promise<void> => {
  const rawUsername = req.account!.telegramUsername;
  const username = rawUsername.toLowerCase().replace(/^@/, "");
  const gbId = String(req.params["gbId"]);

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      currency: groupBuysTable.currency,
      status: groupBuysTable.status,
      legViewerAccess: groupBuysTable.legViewerAccess,
      hidePricesOnGbViewer: groupBuysTable.hidePricesOnGbViewer,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const accessList = (gb.legViewerAccess ?? []) as { username: string; legIds: string[] }[];
  const myEntry = accessList.find(e => e.username.toLowerCase().replace(/^@/, "") === username);
  if (!myEntry) {
    res.status(403).json({ error: "You do not have access to this group buy summary." });
    return;
  }
  const allowedLegIds = myEntry.legIds;

  // Fetch the specific legs they can see
  const legs = await db
    .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, countryName: gbCountryLegsTable.countryName, status: gbCountryLegsTable.status })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), inArray(gbCountryLegsTable.id, allowedLegIds)));

  // Fetch orders for only those legs — also include orders with no leg assigned whose
  // shippingCountry code (e.g. "FR") matches one of the allowed leg country codes.
  const allowedCountryCodes = legs.map(l => l.countryCode.toUpperCase());
  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal,
      productSubtotal: ordersTable.productSubtotal,
      deliveryMethod: ordersTable.deliveryMethod,
      shippingName: ordersTable.shippingName,
      shippingAddress: ordersTable.shippingAddress,
      shippingCountry: ordersTable.shippingCountry,
      trackingNumber: ordersTable.trackingNumber,
      trackingNumbers: ordersTable.trackingNumbers,
      countryLegId: ordersTable.countryLegId,
      createdAt: ordersTable.createdAt,
      paymentConfirmedAt: ordersTable.paymentConfirmedAt,
      paymentTxHash: ordersTable.paymentTxHash,
      paymentTxHashes: ordersTable.paymentTxHashes,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      isNull(ordersTable.deletedAt),
      or(
        inArray(ordersTable.countryLegId, allowedLegIds),
        and(
          isNull(ordersTable.countryLegId),
          allowedCountryCodes.length > 0
            ? sql`upper(${ordersTable.shippingCountry}) = ANY(ARRAY[${sql.join(allowedCountryCodes.map(c => sql`${c}`), sql`, `)}]::text[])`
            : sql`false`
        )
      )
    ))
    .orderBy(desc(ordersTable.createdAt));

  // Attach line items
  const orderIds = orders.map(o => o.id);
  let lineItemsMap: Map<string, { productName: string; quantity: string; unitPrice: string; lineTotal: string }[]> = new Map();
  if (orderIds.length > 0) {
    const lineItems = await db
      .select({
        orderId: orderLineItemsTable.orderId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
        unitPrice: orderLineItemsTable.unitPrice,
        lineTotal: orderLineItemsTable.lineTotal,
      })
      .from(orderLineItemsTable)
      .where(sql`${orderLineItemsTable.orderId} = ANY(ARRAY[${sql.join(orderIds.map(oid => sql`${oid}`), sql`, `)}]::text[])`);
    for (const li of lineItems) {
      if (!lineItemsMap.has(li.orderId)) lineItemsMap.set(li.orderId, []);
      lineItemsMap.get(li.orderId)!.push(li);
    }
  }

  const enriched = orders.map(o => ({ ...o, lineItems: lineItemsMap.get(o.id) ?? [] }));

  // Summary stats
  const totalOrders = enriched.length;
  const totalRevenue = enriched.reduce((sum, o) => sum + parseFloat(o.grandTotal ?? "0"), 0);
  const statusBreakdown = enriched.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});

  res.json({
    gb: { id: gb.id, name: gb.name, currency: gb.currency, status: gb.status, hidePricesOnGbViewer: gb.hidePricesOnGbViewer },
    legs,
    orders: enriched,
    summary: { totalOrders, totalRevenue, statusBreakdown },
  });
});

// POST /api/organiser/group-buys/:id/import-image
// Body: { fileBase64: string (base64), mimeType: string, previewOnly?: boolean }
// Returns: { products: [{ name, price, category? }] } for review
// After organiser confirms, call /import-csv with the returned rows.
router.post("/organiser/group-buys/:id/import-image", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const { fileBase64, mimeType } = req.body as { fileBase64?: string; mimeType?: string };
  if (!fileBase64 || !mimeType) {
    res.status(400).json({ error: "fileBase64 and mimeType are required" });
    return;
  }

  const ALLOWED_MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!ALLOWED_MIMES.has(mimeType)) {
    res.status(400).json({ error: "mimeType must be a PDF or image type" });
    return;
  }

  // Validate base64 length (~20 MB max)
  if (fileBase64.length > 28 * 1024 * 1024) {
    res.status(413).json({ error: "File too large (max 20 MB)" });
    return;
  }

  const PRODUCT_EXTRACT_PROMPT = `You are analyzing a document (price list, product catalog, PDF, or image) to extract product information.

Extract all products/items and their prices. Return a JSON array with this exact format:
[
  { "name": "Product Name", "mgSize": "5mg", "unitCount": "10 vials", "price": 9.99, "category": "peptide" },
  ...
]

Rules:
- name: Product name WITHOUT the mg/unit size (e.g. "BPC-157", not "BPC-157 5mg")
- mgSize: The weight/dosage ONLY — a number followed by mcg, mg, g, or iu (e.g. "500mcg", "5mg", "10g", "100iu"). No other units allowed. Strip any packaging info like "x10 vials", "10 vials", "kit", "×5", etc. — only keep the weight/dosage. Omit this field entirely if the size is not in mcg, mg, g, or iu.
- unitCount: The quantity of units — a number followed by vials, pills, caps, tablets, or ampoules (e.g. "10 vials", "100 pills", "60 caps"). Omit if not present.
- price: Numeric price only (no currency symbols). Use the primary/sale price if multiple.
- category: Best guess from: "peptide", "aas", "pill", "sarm", "other". Can be omitted if unclear.
- Include ALL products found in the document.
- If a product has no clear price, omit it.
- Return ONLY the JSON array, no markdown, no extra text.`;

  try {
    // Strip data URI prefix if present
    const rawBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: PRODUCT_EXTRACT_PROMPT },
          { inlineData: { mimeType, data: rawBase64 } },
        ],
      }],
      config: { temperature: 0.1, maxOutputTokens: 65535, thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = (response.text ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let products: { name: string; price: number; category?: string; mgSize?: string; unitCount?: string }[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        products = parsed
          .filter((p: unknown) => typeof p === "object" && p !== null)
          .map((p: unknown) => {
            const item = p as Record<string, unknown>;
            return {
              name: String(item.name ?? "").trim(),
              price: parseFloat(String(item.price ?? "0")),
              category: item.category ? String(item.category).trim() : undefined,
              mgSize: item.mgSize ? String(item.mgSize).trim() : undefined,
              unitCount: item.unitCount ? String(item.unitCount).trim() : undefined,
            };
          })
          .filter(p => p.name && !isNaN(p.price) && p.price >= 0);
      }
    } catch {
      products = [];
    }

    res.json({ products, count: products.length });
  } catch (err) {
    console.error("[organiser:import-image] Gemini error:", err);
    res.status(500).json({ error: "Failed to extract products from file" });
  }
});

// ─── Lab Test Routes ────────────────────────────────────────────────────────────

// GET /api/organiser/lab-tests — list own submitted lab tests
router.get("/organiser/lab-tests", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const rows = await db
    .select()
    .from(labTestsTable)
    .where(sql`${labTestsTable.organiserId} = ${username}`)
    .orderBy(desc(labTestsTable.createdAt));

  res.json(rows);
});

// POST /api/organiser/lab-tests/extract — AI-extract lab test data from a PDF/image or URL
// Body: { fileBase64?: string, mimeType?: string, url?: string }
// Returns: extracted lab test fields (peptideName, labName, purityPct, batchCode, testDate, etc.)
// NOTE: This route MUST be declared before /organiser/lab-tests/:id to avoid Express matching "extract" as an id.
router.post("/organiser/lab-tests/extract", requireOrganiser, async (req, res): Promise<void> => {
  const { fileBase64, mimeType, url } = req.body as { fileBase64?: string; mimeType?: string; url?: string };

  if (!fileBase64 && !url) {
    res.status(400).json({ error: "Either fileBase64 + mimeType or url is required" });
    return;
  }

  const LAB_EXTRACT_PROMPT = `You are analyzing a Certificate of Analysis (COA) or lab test report document.
Extract the following fields and return them as a JSON object:
{
  "peptideName": "product/peptide name including dosage if present",
  "labName": "lab name (e.g. Janoshik, Simec, Bachem)",
  "batchCode": "batch or lot number",
  "janoshikId": "janoshik report ID if visible (e.g. J-12345)",
  "purityPct": 98.5,
  "mgAmount": 5.0,
  "testDate": "YYYY-MM-DD format or null",
  "testType": "test method (e.g. HPLC, MS, HPLC-MS)",
  "endotoxinEuMg": 0.5,
  "sterilityPass": true
}

Rules:
- All fields are optional — return null if not found.
- purityPct: numeric percentage (0-100), no % symbol.
- mgAmount: numeric mg amount of product tested.
- sterilityPass: boolean true/false or null if not tested.
- endotoxinEuMg: numeric EU/mg value or null.
- testDate: ISO date string YYYY-MM-DD or null.
- Return ONLY the JSON object, no markdown, no extra text.`;

  try {
    let parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];

    if (url) {
      // ── Allowlist-based SSRF protection ───────────────────────────────────────
      // Only permit fetching from known COA lab hosts. This is simpler and
      // more secure than a DNS-based blocklist (no IPv6/rebinding edge cases).
      const ALLOWED_COA_HOSTS = new Set([
        "janoshik.com", "www.janoshik.com",
        "simec.ch", "www.simec.ch",
        "bachem.com", "www.bachem.com",
        "peptidesciences.com", "www.peptidesciences.com",
      ]);
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        res.status(400).json({ error: "Only http and https URLs are allowed" });
        return;
      }
      if (!ALLOWED_COA_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
        res.status(400).json({
          error: `URL host '${parsedUrl.hostname}' is not on the allowed list. Supported: ${[...ALLOWED_COA_HOSTS].join(", ")}`,
        });
        return;
      }
      // ── Fetch with no redirects (avoid redirect-based SSRF bypass) ───────────
      let pageText: string;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const fetchRes = await fetch(parsedUrl.toString(), {
          signal: controller.signal,
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; PepsBot/1.0)" },
        });
        clearTimeout(timer);
        if (fetchRes.status >= 300 && fetchRes.status < 400) {
          res.status(400).json({ error: "URL redirects are not permitted — use the final destination URL directly" });
          return;
        }
        if (!fetchRes.ok) {
          res.status(502).json({ error: `Could not fetch URL (HTTP ${fetchRes.status})` });
          return;
        }
        pageText = await fetchRes.text();
        // Strip HTML tags for cleaner Gemini input
        pageText = pageText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim()
          .slice(0, 32000); // cap at 32k chars
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        res.status(502).json({ error: `Failed to fetch URL: ${msg}` });
        return;
      }
      parts = [
        { text: `The following is the text content from this COA/lab test URL: ${url}\n\n---\n\n${pageText}\n\n---\n\n${LAB_EXTRACT_PROMPT}` },
      ];
    } else {
      // File upload path
      const ALLOWED_MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
      if (!mimeType || !ALLOWED_MIMES.has(mimeType)) {
        res.status(400).json({ error: "mimeType must be a PDF or image type" });
        return;
      }
      if (fileBase64!.length > 28 * 1024 * 1024) {
        res.status(413).json({ error: "File too large (max 20 MB)" });
        return;
      }
      const rawBase64 = fileBase64!.replace(/^data:[^;]+;base64,/, "");
      parts = [
        { inlineData: { mimeType: mimeType!, data: rawBase64 } },
        { text: LAB_EXTRACT_PROMPT },
      ];
    }

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: { temperature: 0.1, maxOutputTokens: 1024 },
    });

    const text = (response.text ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let extracted: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extracted = parsed as Record<string, unknown>;
      }
    } catch {
      extracted = {};
    }

    res.json(extracted);
  } catch (err) {
    console.error("[organiser:lab-tests/extract] Gemini error:", err);
    res.status(500).json({ error: "Failed to extract lab test data" });
  }
});

// GET /api/organiser/lab-tests/:id — get single own lab test
router.get("/organiser/lab-tests/:id", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = parseInt(String(req.params["id"]), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid lab test ID" }); return; }

  const [row] = await db
    .select()
    .from(labTestsTable)
    .where(and(eq(labTestsTable.id, id), sql`${labTestsTable.organiserId} = ${username}`));

  if (!row) { res.status(404).json({ error: "Lab test not found" }); return; }
  res.json(row);
});

// POST /api/organiser/lab-tests — submit a lab test
router.post("/organiser/lab-tests", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const {
    url, peptideName, supplier, labName, batchCode, testType, productCategory,
    purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
    heavyMetalAs, heavyMetalCd, heavyMetalPb, heavyMetalHg,
    mgAmount, janoshikId, groupBuyId,
  } = req.body;

  if (url !== null && url !== undefined && (typeof url !== "string" || !url.trim())) {
    res.status(400).json({ error: "url must be a non-empty string or omitted" });
    return;
  }
  if (!peptideName || typeof peptideName !== "string" || !peptideName.trim()) {
    res.status(400).json({ error: "peptideName is required" });
    return;
  }

  // Validate groupBuyId belongs to organiser if provided
  if (groupBuyId) {
    const [gb] = await db
      .select({ id: groupBuysTable.id })
      .from(groupBuysTable)
      .where(gbOwner(req, String(groupBuyId)));
    if (!gb) { res.status(404).json({ error: "Group buy not found or not owned by you" }); return; }
  }

  // Duplicate check
  const dupId = await findLabTestDuplicate(
    url ? String(url).trim() : null,
    batchCode ? String(batchCode).trim() : null,
    testDate ? String(testDate).trim() : null,
    peptideName.trim(),
  );
  if (dupId !== null) {
    res.status(409).json({ error: `A test with the same URL or batch/date/compound already exists (id=${dupId})` });
    return;
  }

  const [row] = await db.insert(labTestsTable).values({
    url: url ? String(url).trim() : null,
    peptideName: peptideName.trim(),
    supplier: supplier ? String(supplier).trim() : username,
    labName: labName ? String(labName).trim() : "Janoshik",
    batchCode: batchCode ? String(batchCode).trim() : null,
    testType: testType ? String(testType).trim() : null,
    productCategory: productCategory ? String(productCategory).trim() : null,
    purityPct: purityPct != null ? parseFloat(String(purityPct)) : null,
    endotoxinEuMg: endotoxinEuMg != null ? parseFloat(String(endotoxinEuMg)) : null,
    sterilityPass: sterilityPass != null ? Boolean(sterilityPass) : null,
    testDate: testDate ? String(testDate).trim() : null,
    notes: notes ? String(notes).trim() : null,
    heavyMetalAs: heavyMetalAs ? String(heavyMetalAs).trim() : null,
    heavyMetalCd: heavyMetalCd ? String(heavyMetalCd).trim() : null,
    heavyMetalPb: heavyMetalPb ? String(heavyMetalPb).trim() : null,
    heavyMetalHg: heavyMetalHg ? String(heavyMetalHg).trim() : null,
    mgAmount: mgAmount != null ? parseFloat(String(mgAmount)) : null,
    janoshikId: janoshikId ? String(janoshikId).trim() : null,
    isThirdPartyTest: true,
    pending: true,
    submittedBy: username,
    organiserId: username,
    groupBuyId: groupBuyId ? String(groupBuyId) : null,
  }).returning();

  res.status(201).json(row);
});

// DELETE /api/organiser/lab-tests/:id — delete own pending lab test
router.delete("/organiser/lab-tests/:id", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = parseInt(String(req.params["id"]), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid lab test ID" }); return; }

  const [row] = await db
    .select({ id: labTestsTable.id, pending: labTestsTable.pending })
    .from(labTestsTable)
    .where(and(eq(labTestsTable.id, id), sql`${labTestsTable.organiserId} = ${username}`));

  if (!row) { res.status(404).json({ error: "Lab test not found" }); return; }
  if (!row.pending) {
    res.status(409).json({ error: "Cannot delete an approved lab test. Contact admin to remove it." });
    return;
  }

  await db.delete(labTestsTable).where(eq(labTestsTable.id, id));
  res.json({ ok: true });
});

// POST /api/organiser/lab-tests/bulk-janoshik
// Body: { urls: string[] } — list of Janoshik/lab report URLs to extract + bulk submit
router.post("/organiser/lab-tests/bulk-janoshik", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const { urls, supplier } = req.body as { urls?: string[]; supplier?: string };

  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "urls must be a non-empty array" });
    return;
  }
  if (urls.length > 50) {
    res.status(400).json({ error: "Maximum 50 URLs per bulk import" });
    return;
  }

  // Import the existing Janoshik extraction utilities
  const { extractCoADataFromAnyUrl, isBulkImportAllowedUrl } = await import("../lib/gemini-lab-extract");

  const results: { url: string; success: boolean; id?: number; error?: string }[] = [];

  for (const rawUrl of urls) {
    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      results.push({ url: rawUrl, success: false, error: "Invalid URL" });
      continue;
    }
    const url = rawUrl.trim();

    // Check if URL is already imported
    const [existing] = await db
      .select({ id: labTestsTable.id })
      .from(labTestsTable)
      .where(eq(labTestsTable.url, url));

    if (existing) {
      results.push({ url, success: false, error: "URL already imported (id=" + existing.id + ")" });
      continue;
    }

    if (!isBulkImportAllowedUrl(url)) {
      results.push({ url, success: false, error: "URL not from an allowed lab domain" });
      continue;
    }

    try {
      const extracted = await extractCoADataFromAnyUrl(url);

      // Post-extraction fingerprint check (catches same batch+date+name even if URL differs)
      const fingerprintDupId = await findLabTestDuplicate(null, extracted?.batchCode ?? null, extracted?.testDate ?? null, extracted?.compoundName ?? null);
      if (fingerprintDupId !== null) {
        results.push({ url, success: false, error: "Duplicate test already exists (batch/date/compound match, id=" + fingerprintDupId + ")" });
        continue;
      }

      const [row] = await db.insert(labTestsTable).values({
        url,
        peptideName: extracted?.compoundName ?? "Unknown",
        supplier: supplier ? String(supplier).trim() : username,
        labName: "Janoshik",
        batchCode: extracted?.batchCode ?? null,
        testType: extracted?.testType ?? null,
        productCategory: extracted?.productCategory ?? null,
        purityPct: extracted?.purityPct ?? null,
        endotoxinEuMg: extracted?.endotoxinEuMg ?? null,
        sterilityPass: extracted?.sterilityPass ?? null,
        testDate: extracted?.testDate ?? null,
        heavyMetalAs: extracted?.heavyMetalAs ?? null,
        heavyMetalCd: extracted?.heavyMetalCd ?? null,
        heavyMetalPb: extracted?.heavyMetalPb ?? null,
        heavyMetalHg: extracted?.heavyMetalHg ?? null,
        isThirdPartyTest: true,
        pending: true,
        submittedBy: username,
        organiserId: username,
        aiExtracted: extracted != null,
        aiExtractedAt: extracted ? new Date() : null,
      }).returning();

      results.push({ url, success: true, id: row.id });
    } catch (err) {
      results.push({ url, success: false, error: String(err) });
    }
  }

  const imported = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json({ ok: true, imported, failed, results });
});

// ─── Orders + P&L Routes ───────────────────────────────────────────────────────

// GET /api/organiser/group-buys/:id/orders — list orders for own GB
router.get("/organiser/group-buys/:id/orders", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const { country, countryLegId } = req.query as { country?: string; countryLegId?: string };

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const whereConditions = [eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)];
  if (country && country !== "all") whereConditions.push(eq(ordersTable.shippingCountry, country));
  if (countryLegId && countryLegId !== "all") whereConditions.push(eq(ordersTable.countryLegId, countryLegId));

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal,
      productSubtotal: ordersTable.productSubtotal,
      deliveryPrice: ordersTable.deliveryPrice,
      tip: ordersTable.tip,
      deliveryMethod: ordersTable.deliveryMethod,
      shippingName: ordersTable.shippingName,
      shippingAddress: ordersTable.shippingAddress,
      shippingCountry: ordersTable.shippingCountry,
      trackingNumber: ordersTable.trackingNumber,
      trackingNumbers: ordersTable.trackingNumbers,
      adminNotes: ordersTable.adminNotes,
      paymentTxHash: ordersTable.paymentTxHash,
      paymentTxHashes: ordersTable.paymentTxHashes,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
      paymentTestAmount: ordersTable.paymentTestAmount,
      paymentScreenshot: ordersTable.paymentScreenshot,
      inpostQrCode: ordersTable.inpostQrCode,
      notes: ordersTable.notes,
      testingContribution: ordersTable.testingContribution,
      adminFee: ordersTable.adminFee,
      adminFeeLabel: ordersTable.adminFeeLabel,
      reshipperUsername: ordersTable.reshipperUsername,
      countryLegId: ordersTable.countryLegId,
      createdAt: ordersTable.createdAt,
      paymentConfirmedAt: ordersTable.paymentConfirmedAt,
      orderType: ordersTable.orderType,
      amountDue: ordersTable.amountDue,
      balanceScreenshot: ordersTable.balanceScreenshot,
      balanceTxHash: (ordersTable as any).balanceTxHash,
      balancePaymentStatus: (ordersTable as any).balancePaymentStatus,
    })
    .from(ordersTable)
    .where(and(...whereConditions as [any, any]))
    .orderBy(desc(ordersTable.createdAt));

  // Fetch line items for each order
  const orderIds = orders.map(o => o.id);
  let lineItemsMap: Map<string, { id: string; productId: string; productName: string; quantity: string; unitPrice: string; lineTotal: string; isOos: boolean }[]> = new Map();

  if (orderIds.length > 0) {
    const lineItems = await db
      .select({
        id: orderLineItemsTable.id,
        orderId: orderLineItemsTable.orderId,
        productId: orderLineItemsTable.productId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
        unitPrice: orderLineItemsTable.unitPrice,
        lineTotal: orderLineItemsTable.lineTotal,
        isOos: orderLineItemsTable.isOos,
      })
      .from(orderLineItemsTable)
      .where(sql`${orderLineItemsTable.orderId} = ANY(ARRAY[${sql.join(orderIds.map(oid => sql`${oid}`), sql`, `)}]::text[])`);

    for (const li of lineItems) {
      if (!lineItemsMap.has(li.orderId)) lineItemsMap.set(li.orderId, []);
      lineItemsMap.get(li.orderId)!.push(li);
    }
  }

  // Batch-fetch account countries as fallback when shippingCountry is null
  const orderUsernames = [...new Set(orders.map(o => o.telegramUsername).filter(Boolean))] as string[];
  const accountCountryMap = new Map<string, string>();
  if (orderUsernames.length > 0) {
    const bothForms = [...new Set(orderUsernames.flatMap(u => [u, u.startsWith("@") ? u.slice(1) : `@${u}`]))];
    const acctRows = await db
      .select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country })
      .from(accountsTable)
      .where(inArray(accountsTable.telegramUsername, bothForms));
    for (const a of acctRows) {
      if (a.country && a.telegramUsername) {
        accountCountryMap.set(a.telegramUsername, a.country);
        const alt = a.telegramUsername.startsWith("@") ? a.telegramUsername.slice(1) : `@${a.telegramUsername}`;
        accountCountryMap.set(alt, a.country);
      }
    }
  }

  res.json(orders.map(o => {
    const txHash = o.paymentTxHash ?? null;
    const { paymentScreenshot, balanceScreenshot, ...rest } = o as any;
    let paymentMethod = "manual";
    if (txHash?.startsWith("anonpay:")) paymentMethod = "anonpay";
    else if (txHash === "fiat:revolut") paymentMethod = "revolut";
    else if (txHash === "fiat:paypal") paymentMethod = "paypal";

    return {
      ...rest,
      grandTotal: parseFloat(String(o.grandTotal)),
      productSubtotal: parseFloat(String(o.productSubtotal)),
      deliveryPrice: parseFloat(String(o.deliveryPrice)),
      adminFee: parseFloat(String((o as any).adminFee ?? "0")),
      adminFeeLabel: (o as any).adminFeeLabel ?? null,
      tip: parseFloat(String((o as any).tip ?? "0")),
      amountDue: parseFloat(String((o as any).amountDue ?? "0")),
      paymentTestAmount: o.paymentTestAmount != null ? parseFloat(String(o.paymentTestAmount)) : null,
      testingContribution: o.testingContribution != null ? parseFloat(String(o.testingContribution)) : null,
      notes: o.notes ?? null,
      paymentMethod,
      accountCountry: accountCountryMap.get(o.telegramUsername) ?? null,
      hasPaymentScreenshot: paymentScreenshot !== null && paymentScreenshot !== undefined,
      hasBalanceScreenshot: balanceScreenshot !== null && balanceScreenshot !== undefined,
      lineItems: (lineItemsMap.get(o.id) ?? []).map(li => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName,
        quantity: parseFloat(String(li.quantity)),
        unitPrice: parseFloat(String(li.unitPrice)),
        lineTotal: parseFloat(String(li.lineTotal)),
        isOos: li.isOos ?? false,
      })),
    };
  }));
});

// GET /api/organiser/group-buys/:gbId/orders/:orderId/screenshot — fetch single order screenshot
// GET balance-payment screenshot uploaded by the customer
router.get("/organiser/group-buys/:gbId/orders/:orderId/balance-screenshot", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ balanceScreenshot: ordersTable.balanceScreenshot })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ balanceScreenshot: order.balanceScreenshot ?? null });
});

router.get("/organiser/group-buys/:gbId/orders/:orderId/screenshot", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ paymentScreenshot: ordersTable.paymentScreenshot })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ paymentScreenshot: order.paymentScreenshot ?? null });
});

// POST /api/organiser/group-buys/:id/orders — organiser manually creates an order for a GB
router.post("/organiser/group-buys/:id/orders", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, currency: groupBuysTable.currency })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const {
    telegramUsername: clientTg,
    lineItems: clientLineItems,
    shippingAmount: clientShipping = 0,
    shippingAddress: clientShippingAddress,
    notes,
    status: clientStatus,
    pin: clientPin,
  } = req.body;

  if (!clientTg || typeof clientTg !== "string") {
    res.status(400).json({ error: "telegramUsername is required" }); return;
  }
  if (!Array.isArray(clientLineItems) || clientLineItems.length === 0) {
    res.status(400).json({ error: "At least one line item is required" }); return;
  }

  const tg = clientTg.trim().startsWith("@") ? clientTg.trim() : `@${clientTg.trim()}`;
  const shippingAmount = Math.max(0, parseFloat(String(clientShipping)) || 0);

  const VALID_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
  const status = clientStatus && VALID_STATUSES.includes(String(clientStatus)) ? String(clientStatus) : "Submitted";
  const pin = clientPin && /^\d{4}$/.test(String(clientPin)) ? String(clientPin) : "0000";

  const lineItems = (clientLineItems as any[])
    .filter(li => li.productName && parseFloat(String(li.quantity)) > 0)
    .slice(0, 50)
    .map(li => ({
      productName: String(li.productName).trim().slice(0, 200),
      quantity: Math.max(0.5, parseFloat(String(li.quantity))),
      unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
    }));

  if (lineItems.length === 0) {
    res.status(400).json({ error: "At least one valid line item is required" }); return;
  }

  const productSubtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const grandTotal = productSubtotal + shippingAmount;

  const orderId = randomUUID();
  const code = String(Math.floor(1000 + Math.random() * 9000));

  const shippingAddress = clientShippingAddress && typeof clientShippingAddress === "string"
    ? clientShippingAddress.trim().slice(0, 1000) || null
    : null;

  await db.insert(ordersTable).values({
    id: orderId,
    code,
    telegramUsername: tg,
    status: status as any,
    deliveryMethodId: "",
    deliveryMethod: "Custom",
    deliveryPrice: shippingAmount.toFixed(2) as any,
    vendorShipping: "0.00" as any,
    tip: "0.00" as any,
    productSubtotal: productSubtotal.toFixed(2) as any,
    grandTotal: grandTotal.toFixed(2) as any,
    notes: notes ? String(notes).slice(0, 1000) : null,
    shippingAddress,
    pin,
    groupBuyId: id,
  });

  await db.insert(orderLineItemsTable).values(
    lineItems.map(li => ({
      id: randomUUID(),
      orderId,
      productId: "",
      productName: li.productName,
      quantity: String(li.quantity) as any,
      unitPrice: li.unitPrice.toFixed(2) as any,
      lineTotal: (li.quantity * li.unitPrice).toFixed(2) as any,
    }))
  );

  res.status(201).json({
    id: orderId,
    code,
    telegramUsername: tg,
    status,
    paymentStatus: "unpaid",
    grandTotal,
    productSubtotal,
    deliveryPrice: shippingAmount,
    deliveryMethod: "Custom",
    shippingName: null,
    trackingNumber: null,
    adminNotes: null,
    paymentMethod: "manual",
    paymentScreenshot: null,
    inpostQrCode: null,
    createdAt: new Date().toISOString(),
    lineItems: lineItems.map(li => ({
      productName: li.productName,
      quantity: li.quantity,
      lineTotal: li.quantity * li.unitPrice,
      isOos: false,
    })),
  });
});

// POST /api/organiser/group-buys/:id/test-order — place a test order (PIN-protected)
router.post("/organiser/group-buys/:id/test-order", requireOrganiser, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, currency: groupBuysTable.currency, testOrderPin: groupBuysTable.testOrderPin })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (!gb.testOrderPin) { res.status(403).json({ error: "Test orders are not enabled for this group buy. Set a test PIN first." }); return; }

  const { pin, lineItems: clientLineItems, shippingAmount: clientShipping = 0 } = req.body;

  if (!pin || String(pin).trim() !== gb.testOrderPin) {
    res.status(403).json({ error: "Invalid test order PIN" }); return;
  }

  if (!Array.isArray(clientLineItems) || clientLineItems.length === 0) {
    res.status(400).json({ error: "At least one line item is required" }); return;
  }

  const shippingAmount = Math.max(0, parseFloat(String(clientShipping)) || 0);

  const lineItems = (clientLineItems as any[])
    .filter(li => li.productName && parseFloat(String(li.quantity)) > 0)
    .slice(0, 50)
    .map(li => ({
      productName: String(li.productName).trim().slice(0, 200),
      quantity: Math.max(0.5, parseFloat(String(li.quantity))),
      unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
    }));

  if (lineItems.length === 0) {
    res.status(400).json({ error: "At least one valid line item is required" }); return;
  }

  const productSubtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const grandTotal = productSubtotal + shippingAmount;

  const orderId = randomUUID();
  const code = String(Math.floor(1000 + Math.random() * 9000));

  await db.insert(ordersTable).values({
    id: orderId,
    code,
    telegramUsername: "@TEST_ORDER",
    status: "Draft" as any,
    deliveryMethodId: "",
    deliveryMethod: "Custom",
    deliveryPrice: shippingAmount.toFixed(2) as any,
    vendorShipping: "0.00" as any,
    tip: "0.00" as any,
    productSubtotal: productSubtotal.toFixed(2) as any,
    grandTotal: grandTotal.toFixed(2) as any,
    notes: "🧪 TEST ORDER — not a real order",
    pin: "0000",
    groupBuyId: id,
    orderType: "test",
  });

  await db.insert(orderLineItemsTable).values(
    lineItems.map(li => ({
      id: randomUUID(),
      orderId,
      productId: "",
      productName: li.productName,
      quantity: String(li.quantity) as any,
      unitPrice: li.unitPrice.toFixed(2) as any,
      lineTotal: (li.quantity * li.unitPrice).toFixed(2) as any,
    }))
  );

  res.status(201).json({ id: orderId, code, message: "Test order created successfully" });
});

// PATCH /api/organiser/group-buys/:gbId/orders/:orderId — update order fields
router.patch("/organiser/group-buys/:gbId/orders/:orderId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  // Verify GB ownership
  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      currency: groupBuysTable.currency,
      organiserOrderEditEnabled: groupBuysTable.organiserOrderEditEnabled,
      organiserCanEditStatus: groupBuysTable.organiserCanEditStatus,
      organiserCanEditPaymentStatus: groupBuysTable.organiserCanEditPaymentStatus,
      organiserCanEditTracking: groupBuysTable.organiserCanEditTracking,
      organiserCanEditNotes: groupBuysTable.organiserCanEditNotes,
      organiserCanEditTxId: groupBuysTable.organiserCanEditTxId,
      organiserCanEditQuantities: groupBuysTable.organiserCanEditQuantities,
    })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Verify order belongs to this GB
  const [order] = await db
    .select({
      id: ordersTable.id,
      telegramUsername: ordersTable.telegramUsername,
      trackingNumber: ordersTable.trackingNumber,
      code: ordersTable.code,
      grandTotal: ordersTable.grandTotal,
      deliveryMethod: ordersTable.deliveryMethod,
      paymentStatus: ordersTable.paymentStatus,
      deliveryPrice: ordersTable.deliveryPrice,
      vendorShipping: ordersTable.vendorShipping,
      tip: ordersTable.tip,
      testingContribution: ordersTable.testingContribution,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const { status, paymentStatus, adminNotes, trackingNumber, trackingNumbers, paymentTxHash, paymentTxHashes, lineItems: lineItemUpdates } = req.body as {
    status?: string;
    paymentStatus?: string;
    adminNotes?: string | null;
    trackingNumber?: string | null;
    trackingNumbers?: string[];
    paymentTxHash?: string | null;
    paymentTxHashes?: string[];
    lineItems?: { id?: string; productId?: string; quantity: number }[];
  };

  // Allow payment-status-only changes even when full order editing is disabled,
  // as long as the organiser has payment-status edit permission.
  const isPaymentStatusOnlyChange =
    paymentStatus !== undefined &&
    status === undefined &&
    adminNotes === undefined &&
    trackingNumber === undefined &&
    (trackingNumbers === undefined || (Array.isArray(trackingNumbers) && trackingNumbers.length === 0)) &&
    paymentTxHash === undefined &&
    (paymentTxHashes === undefined || (Array.isArray(paymentTxHashes) && paymentTxHashes.length === 0)) &&
    (!lineItemUpdates || !Array.isArray(lineItemUpdates) || lineItemUpdates.length === 0);

  if (!gb.organiserOrderEditEnabled && !(isPaymentStatusOnlyChange && gb.organiserCanEditPaymentStatus)) {
    res.status(403).json({ error: "Order editing is not enabled for this group buy. An admin must enable it first." });
    return;
  }

  const VALID_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
  const VALID_PAYMENT_STATUSES = ["unpaid", "pending_confirmation", "confirmed", "failed", "refunded", "test_ready", "test_confirmed"];

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }); return;
  }
  if (paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    res.status(400).json({ error: `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}` }); return;
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined && gb.organiserCanEditStatus) updates.status = status;
  if (paymentStatus !== undefined && gb.organiserCanEditPaymentStatus) {
    updates.paymentStatus = paymentStatus;
    if (paymentStatus === "confirmed") {
      const [existingOrder] = await db.select({ paymentStatus: ordersTable.paymentStatus }).from(ordersTable).where(eq(ordersTable.id, orderId));
      if (existingOrder && existingOrder.paymentStatus !== "confirmed") {
        updates.paymentConfirmedAt = new Date();
        // Clear any amountDue set while order was in test_confirmed state mid-payment
        updates.amountDue = "0.00";
      }
    }
  }
  if (adminNotes !== undefined && gb.organiserCanEditNotes) updates.adminNotes = adminNotes ? String(adminNotes).trim() : null;
  if (gb.organiserCanEditTracking) {
    if (trackingNumbers !== undefined) {
      const cleaned = Array.isArray(trackingNumbers)
        ? (trackingNumbers as unknown[]).filter(v => typeof v === "string" && (v as string).trim()).map(v => (v as string).trim().slice(0, 200)).slice(0, 20)
        : [];
      updates.trackingNumbers = cleaned.length ? cleaned : null;
      updates.trackingNumber = cleaned[0] ?? null;
    } else if (trackingNumber !== undefined) {
      updates.trackingNumber = trackingNumber ? String(trackingNumber).trim() : null;
    }
  }
  if (gb.organiserCanEditTxId) {
    if (paymentTxHashes !== undefined) {
      const cleaned = Array.isArray(paymentTxHashes)
        ? (paymentTxHashes as unknown[]).filter(v => typeof v === "string" && (v as string).trim()).map(v => (v as string).trim().slice(0, 500)).slice(0, 20)
        : [];
      updates.paymentTxHashes = cleaned.length ? cleaned : null;
      updates.paymentTxHash = cleaned[0] ?? null;
    } else if (paymentTxHash !== undefined) {
      updates.paymentTxHash = paymentTxHash ? String(paymentTxHash).trim() : null;
    }
  }

  // Handle line item quantity updates (and new product additions)
  let updatedLineItems: { id: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; isOos: boolean }[] = [];
  if (gb.organiserCanEditQuantities && Array.isArray(lineItemUpdates) && lineItemUpdates.length > 0) {
    const existingUpdates = lineItemUpdates.filter(u => u.id);
    const newItemRequests = lineItemUpdates.filter(u => !u.id && u.productId);

    // Fetch current line items to get unitPrice
    const currentItems = await db
      .select({ id: orderLineItemsTable.id, productName: orderLineItemsTable.productName, unitPrice: orderLineItemsTable.unitPrice, isOos: orderLineItemsTable.isOos })
      .from(orderLineItemsTable)
      .where(eq(orderLineItemsTable.orderId, orderId));

    for (const item of currentItems) {
      const update = existingUpdates.find(u => u.id === item.id);
      if (update !== undefined) {
        const parsedQty = parseFloat(String(update.quantity));
        if (parsedQty <= 0 || isNaN(parsedQty)) {
          // qty = 0 means remove the line item
          await db.delete(orderLineItemsTable).where(eq(orderLineItemsTable.id, item.id));
          // Don't push to updatedLineItems — item is gone
        } else {
          const newQty = parsedQty;
          const unitPrice = parseFloat(String(item.unitPrice));
          const newLineTotal = parseFloat((newQty * unitPrice).toFixed(2));
          await db.update(orderLineItemsTable)
            .set({ quantity: String(newQty) as any, lineTotal: String(newLineTotal) as any })
            .where(eq(orderLineItemsTable.id, item.id));
          updatedLineItems.push({ id: item.id, productName: item.productName, quantity: newQty, unitPrice, lineTotal: newLineTotal, isOos: item.isOos });
        }
      } else {
        updatedLineItems.push({ id: item.id, productName: item.productName, quantity: parseFloat("0"), unitPrice: parseFloat(String(item.unitPrice)), lineTotal: 0, isOos: item.isOos });
      }
    }

    // Insert new line items (products added by organiser)
    if (newItemRequests.length > 0) {
      const requestedProductIds = newItemRequests.map(r => r.productId!);

      // Fetch product details for requested new items (must belong to this GB)
      const gbProducts = await db
        .select({
          productId: groupBuyProductsTable.productId,
          priceOverride: groupBuyProductsTable.priceOverride,
          productName: productsTable.name,
          basePrice: productsTable.price,
        })
        .from(groupBuyProductsTable)
        .innerJoin(productsTable, eq(productsTable.id, groupBuyProductsTable.productId))
        .where(and(eq(groupBuyProductsTable.groupBuyId, gbId), inArray(groupBuyProductsTable.productId, requestedProductIds)));

      // Fetch existing productIds on this order to avoid duplicates
      const existingLineItems = await db
        .select({ productId: orderLineItemsTable.productId })
        .from(orderLineItemsTable)
        .where(eq(orderLineItemsTable.orderId, orderId));
      const existingProductIdSet = new Set(existingLineItems.map(li => li.productId));

      for (const req of newItemRequests) {
        const product = gbProducts.find(p => p.productId === req.productId);
        if (!product) continue; // product not in this GB — skip
        if (existingProductIdSet.has(req.productId!)) continue; // already on order — skip
        const newQty = Math.max(0.5, parseFloat(String(req.quantity)) || 1);
        const unitPrice = parseFloat(String(product.priceOverride ?? product.basePrice));
        const newLineTotal = parseFloat((newQty * unitPrice).toFixed(2));
        const newId = randomUUID();
        await db.insert(orderLineItemsTable).values({
          id: newId,
          orderId,
          productId: req.productId!,
          productName: product.productName,
          quantity: String(newQty) as any,
          unitPrice: String(unitPrice) as any,
          lineTotal: String(newLineTotal) as any,
          isOos: false,
        });
        updatedLineItems.push({ id: newId, productName: product.productName, quantity: newQty, unitPrice, lineTotal: newLineTotal, isOos: false });
      }
    }

    // Recalculate order totals
    const newProductSubtotal = parseFloat(updatedLineItems.reduce((s, li) => s + li.lineTotal, 0).toFixed(2));
    const extras = parseFloat(String(order.deliveryPrice ?? 0)) + parseFloat(String(order.vendorShipping ?? 0)) + parseFloat(String(order.tip ?? 0)) + parseFloat(String(order.testingContribution ?? 0));
    const newGrandTotal = parseFloat((newProductSubtotal + extras).toFixed(2));
    updates.productSubtotal = String(newProductSubtotal) as any;
    updates.grandTotal = String(newGrandTotal) as any;

    // Re-fetch all items with correct current values for response
    const allItems = await db
      .select({ id: orderLineItemsTable.id, productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity, unitPrice: orderLineItemsTable.unitPrice, lineTotal: orderLineItemsTable.lineTotal, isOos: orderLineItemsTable.isOos })
      .from(orderLineItemsTable)
      .where(eq(orderLineItemsTable.orderId, orderId));
    updatedLineItems = allItems.map(li => ({
      id: li.id,
      productName: li.productName,
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      isOos: li.isOos,
    }));
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" }); return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, orderId))
    .returning({
      id: ordersTable.id,
      code: ordersTable.code,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      adminNotes: ordersTable.adminNotes,
      trackingNumber: ordersTable.trackingNumber,
      paymentTxHash: ordersTable.paymentTxHash,
      grandTotal: ordersTable.grandTotal,
      productSubtotal: ordersTable.productSubtotal,
    });

  // Notify customer if tracking number was newly set
  const newTracking = trackingNumber ? String(trackingNumber).trim() : null;
  if (newTracking && newTracking !== order.trackingNumber) {
    notifyUserFromTemplate(
      order.telegramUsername,
      "status",
      "customer_order_shipped",
      { code: order.code, gb_name: `\nGB: <b>${gb.name}</b>`, tracking: newTracking, username: order.telegramUsername.replace(/^@/, ""), order_total: (gb.currency === "GBP" ? "£" : "$") + String(order.grandTotal ?? ""), delivery: order.deliveryMethod ?? "", payment_status: order.paymentStatus === "confirmed" ? "Paid" : "Unpaid", app_url: process.env["APP_URL"] ?? "https://saltandpeps.co.uk" },
    ).catch(() => {});
  }

  // Notify customer if payment status changed to confirmed
  const newPaymentStatus = paymentStatus ?? order.paymentStatus;
  if (newPaymentStatus === "confirmed" && order.paymentStatus !== "confirmed") {
    const sym = gb.currency === "GBP" ? "£" : "$";
    const _orgPayMethod1 = (() => {
      const tx = (order as any).paymentTxHash as string | null;
      const s = tx ?? "";
      if (s.startsWith("fiat:revolut")) return "Revolut";
      if (s.startsWith("fiat:paypal")) return "PayPal";
      if (s.startsWith("anonpay:")) return "AnonPay";
      if (s === "credits") return "Store Credits";
      if (s) return "Crypto";
      return "—";
    })();
    notifyUserFromTemplate(
      order.telegramUsername,
      "payment",
      "customer_payment_confirmed",
      { code: order.code, gb_name: `\nGB: <b>${gb.name}</b>`, username: order.telegramUsername.replace(/^@/, ""), order_total: sym + String(order.grandTotal ?? ""), delivery: order.deliveryMethod ?? "", app_url: process.env["APP_URL"] ?? "https://saltandpeps.co.uk", amount_received: sym + String(order.grandTotal ?? ""), payment_method: _orgPayMethod1 },
    ).catch(() => {});
  }

  res.json({
    ok: true,
    order: {
      ...updated,
      grandTotal: parseFloat(String(updated.grandTotal)),
      productSubtotal: parseFloat(String(updated.productSubtotal)),
      lineItems: updatedLineItems,
    },
  });
});

// POST /api/organiser/group-buys/:gbId/orders/:orderId/qr — organiser manually set/clear a QR code
router.post("/organiser/group-buys/:gbId/orders/:orderId/qr", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ id: ordersTable.id, code: ordersTable.code })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const { courier, qrCode } = req.body as { courier?: string; qrCode?: string | null };

  if (!courier || !["inpost", "royal-mail"].includes(String(courier))) {
    res.status(400).json({ error: "courier must be 'inpost' or 'royal-mail'" });
    return;
  }

  if (qrCode !== null && qrCode !== undefined) {
    if (typeof qrCode !== "string") { res.status(400).json({ error: "qrCode must be a string or null" }); return; }
    if (!/^data:(image\/(png|jpeg|gif|webp)|application\/pdf);base64,/.test(qrCode)) {
      res.status(400).json({ error: "File must be a PNG, JPEG, or PDF" });
      return;
    }
    if (qrCode.length > 14_000_000) {
      res.status(400).json({ error: "File is too large. Maximum size is 10 MB." });
      return;
    }
  }

  const field = courier === "inpost" ? "inpostQrCode" : "royalMailQrCode";
  await db.update(ordersTable)
    .set({ [field]: qrCode ?? null })
    .where(eq(ordersTable.id, orderId));

  res.json({ ok: true });
});

// POST /api/organiser/group-buys/:gbId/orders/:orderId/confirm-payment — confirm a pending PayPal/Revolut payment
router.post("/organiser/group-buys/:gbId/orders/:orderId/confirm-payment", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, code: ordersTable.code, grandTotal: ordersTable.grandTotal, deliveryMethod: ordersTable.deliveryMethod })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.paymentStatus !== "pending_confirmation") {
    res.status(400).json({ error: "Order is not awaiting payment confirmation" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ paymentStatus: "confirmed", paymentRejectionReason: null, paymentConfirmedAt: new Date(), amountDue: "0.00" })
    .where(eq(ordersTable.id, orderId));

  writeLog("change", "info", "payment_confirmed", `Organiser @${username} confirmed payment for order #${order.code}`, { orderId, gbId, username }).catch(() => {});

  const _orgPayMethod2 = (() => {
    const tx = (order as any).paymentTxHash as string | null;
    const s = tx ?? "";
    if (s.startsWith("fiat:revolut")) return "Revolut";
    if (s.startsWith("fiat:paypal")) return "PayPal";
    if (s.startsWith("anonpay:")) return "AnonPay";
    if (s === "credits") return "Store Credits";
    if (s) return "Crypto";
    return "—";
  })();
  notifyUserFromTemplate(
    order.telegramUsername,
    "payment",
    "customer_payment_confirmed",
    { code: order.code, gb_name: `\nGB: <b>${gb.name}</b>`, username: order.telegramUsername.replace(/^@/, ""), order_total: "£" + String(order.grandTotal ?? ""), delivery: order.deliveryMethod ?? "", app_url: process.env["APP_URL"] ?? "https://saltandpeps.co.uk", amount_received: "£" + String(order.grandTotal ?? ""), payment_method: _orgPayMethod2 },
  ).catch(() => {});

  res.json({ ok: true, paymentStatus: "confirmed" });
});

// POST /api/organiser/group-buys/:gbId/orders/:orderId/send-message — send custom Telegram message to order customer
router.post("/organiser/group-buys/:gbId/orders/:orderId/send-message", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" }); return;
  }

  const text = message.trim().slice(0, 2000);
  const fullText = `📦 <b>Message from GB Organiser</b>\n<b>Group Buy:</b> ${gb.name}\n<b>Organiser:</b> @${username}\n<b>Order:</b> #${order.code}\n\n${text}`;

  await notifyUser(order.telegramUsername, "status", fullText);

  writeLog("change", "info", "organiser_message_sent", `Organiser @${username} sent message to order #${order.code}`, { orderId, gbId, username }).catch(() => {});

  res.json({ ok: true });
});

// POST /api/organiser/group-buys/:gbId/orders/:orderId/reject-payment — reject a pending PayPal/Revolut payment
router.post("/organiser/group-buys/:gbId/orders/:orderId/reject-payment", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const orderId = String(req.params["orderId"]);
  const { reason } = req.body;

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, code: ordersTable.code })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (order.paymentStatus !== "pending_confirmation") {
    res.status(400).json({ error: "Order is not awaiting payment confirmation" });
    return;
  }

  const rejectionReason = reason && typeof reason === "string" ? reason.trim() : null;

  await db
    .update(ordersTable)
    .set({ paymentStatus: "unpaid", paymentRejectionReason: rejectionReason, paymentTxHash: null })
    .where(eq(ordersTable.id, orderId));

  writeLog("change", "info", "payment_rejected", `Organiser @${username} rejected payment for order #${order.code}`, { orderId, gbId, username, reason: rejectionReason }).catch(() => {});

  res.json({ ok: true, paymentStatus: "unpaid", reason: rejectionReason });
});

// GET /api/organiser/pending-payment-confirmations — list all orders awaiting payment confirmation across all organiser's GBs
router.get("/organiser/pending-payment-confirmations", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const gbs = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency, organiserPayments: groupBuysTable.organiserPayments })
    .from(groupBuysTable)
    .where(gbOwner(req));

  if (gbs.length === 0) { res.json([]); return; }

  const gbIds = gbs.map(g => g.id);
  const gbMap = new Map(gbs.map(g => [g.id, g]));

  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      grandTotal: ordersTable.grandTotal,
      paymentStatus: ordersTable.paymentStatus,
      groupBuyId: ordersTable.groupBuyId,
      paymentScreenshot: ordersTable.paymentScreenshot,
      paymentTxHash: ordersTable.paymentTxHash,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
      paymentTestAmount: ordersTable.paymentTestAmount,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.paymentStatus, "pending_confirmation"),
      sql`${ordersTable.groupBuyId} = ANY(ARRAY[${sql.join(gbIds.map(id => sql`${id}`), sql`, `)}]::text[])`,
      isNull(ordersTable.deletedAt),
    ))
    .orderBy(desc(ordersTable.createdAt));

  res.json(orders.map(o => {
    const gb = gbMap.get(o.groupBuyId ?? "");
    const txHash = o.paymentTxHash ?? null;
    let paymentMethod = "manual";
    if (txHash?.startsWith("anonpay:")) paymentMethod = "anonpay";
    else if (txHash === "fiat:revolut") paymentMethod = "revolut";
    else if (txHash === "fiat:paypal") paymentMethod = "paypal";
    return {
      id: o.id,
      code: o.code,
      telegramUsername: o.telegramUsername,
      grandTotal: parseFloat(String(o.grandTotal)),
      paymentStatus: o.paymentStatus,
      groupBuyId: o.groupBuyId,
      gbName: gb?.name ?? "Unknown",
      gbCurrency: gb?.currency ?? "GBP",
      paymentMethod,
      paymentScreenshot: o.paymentScreenshot ?? null,
      paymentTxHash: txHash,
      testPaymentTxHash: o.testPaymentTxHash ?? null,
      paymentTestAmount: o.paymentTestAmount != null ? parseFloat(String(o.paymentTestAmount)) : null,
      createdAt: (o.createdAt as Date).toISOString(),
    };
  }));
});

// GET /api/organiser/group-buys/:id/pnl — P&L summary
router.get("/organiser/group-buys/:id/pnl", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, pnlCosts: groupBuysTable.pnlCosts })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Aggregate confirmed orders revenue
  const orders = await db
    .select({
      id: ordersTable.id,
      grandTotal: ordersTable.grandTotal,
      productSubtotal: ordersTable.productSubtotal,
      deliveryPrice: ordersTable.deliveryPrice,
      paymentStatus: ordersTable.paymentStatus,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)));

  const allOrders = orders.length;
  const confirmedOrders = orders.filter(o => o.paymentStatus === "confirmed");
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.grandTotal)), 0);
  const productRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.productSubtotal)), 0);
  const deliveryRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.deliveryPrice)), 0);

  // Per-product breakdown via line items
  const confirmedIds = confirmedOrders.map(o => o.id);
  const lineItems = confirmedIds.length > 0
    ? await db
        .select({
          productName: orderLineItemsTable.productName,
          quantity: orderLineItemsTable.quantity,
          lineTotal: orderLineItemsTable.lineTotal,
          orderId: orderLineItemsTable.orderId,
        })
        .from(orderLineItemsTable)
        .where(sql`${orderLineItemsTable.orderId} = ANY(ARRAY[${sql.join(confirmedIds.map(oid => sql`${oid}`), sql`, `)}]::text[])`)
    : [];

  const productBreakdown: Record<string, { qty: number; revenue: number }> = {};
  for (const li of lineItems) {
    if (!productBreakdown[li.productName]) productBreakdown[li.productName] = { qty: 0, revenue: 0 };
    productBreakdown[li.productName].qty += parseFloat(String(li.quantity));
    productBreakdown[li.productName].revenue += parseFloat(String(li.lineTotal));
  }

  // pnlCosts is now JSONB — direct object access
  const costs = (gb.pnlCosts ?? {}) as {
    materials?: number;
    lab?: number;
    shipping?: number;
    misc?: number;
    platformFee?: number;
    notes?: string;
  };

  const totalCosts = (costs.materials ?? 0) + (costs.lab ?? 0) + (costs.shipping ?? 0) + (costs.misc ?? 0) + (costs.platformFee ?? 0);
  const grossProfit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  res.json({
    gbId: id,
    gbName: gb.name,
    orders: {
      total: allOrders,
      confirmed: confirmedOrders.length,
    },
    revenue: {
      total: parseFloat(totalRevenue.toFixed(2)),
      products: parseFloat(productRevenue.toFixed(2)),
      delivery: parseFloat(deliveryRevenue.toFixed(2)),
    },
    costs: {
      materials: costs.materials ?? 0,
      lab: costs.lab ?? 0,
      shipping: costs.shipping ?? 0,
      misc: costs.misc ?? 0,
      platformFee: costs.platformFee ?? 0,
      total: parseFloat(totalCosts.toFixed(2)),
      notes: costs.notes ?? null,
    },
    profit: {
      gross: parseFloat(grossProfit.toFixed(2)),
      marginPct: parseFloat(margin.toFixed(1)),
    },
    productBreakdown: Object.entries(productBreakdown).map(([name, d]) => ({
      name,
      totalQty: parseFloat(d.qty.toFixed(2)),
      totalRevenue: parseFloat(d.revenue.toFixed(2)),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue),
  });
});

// PUT /api/organiser/group-buys/:id/pnl-costs — record cost inputs
router.put("/organiser/group-buys/:id/pnl-costs", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const { materials, lab, shipping, misc, platformFee, notes } = req.body as {
    materials?: number | null;
    lab?: number | null;
    shipping?: number | null;
    misc?: number | null;
    platformFee?: number | null;
    notes?: string | null;
  };

  const costs = {
    materials: materials != null ? parseFloat(String(materials)) : undefined,
    lab: lab != null ? parseFloat(String(lab)) : undefined,
    shipping: shipping != null ? parseFloat(String(shipping)) : undefined,
    misc: misc != null ? parseFloat(String(misc)) : undefined,
    platformFee: platformFee != null ? parseFloat(String(platformFee)) : undefined,
    notes: notes ? String(notes).trim() : undefined,
  };

  await db
    .update(groupBuysTable)
    .set({ pnlCosts: costs })
    .where(eq(groupBuysTable.id, id));

  res.json({ ok: true, pnlCosts: costs });
});

// ─── GET /api/organiser/group-buys/:id/summary ────────────────────────────────
// Aggregated product summary for an organiser's own GB
router.get("/organiser/group-buys/:id/summary", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const statusFilter = req.query.status as string | undefined;
  const paymentStatusFilter = req.query.paymentStatus as string | undefined;

  let orders = await db.select().from(ordersTable).where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)));
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  if (paymentStatusFilter && paymentStatusFilter !== "all") {
    if (paymentStatusFilter === "paid") {
      orders = orders.filter((o) => o.paymentStatus === "confirmed");
    } else if (paymentStatusFilter === "unpaid") {
      orders = orders.filter((o) => o.paymentStatus !== "confirmed");
    } else {
      orders = orders.filter((o) => o.paymentStatus === paymentStatusFilter);
    }
  }

  if (orders.length === 0) { res.json([]); return; }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

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

// ─── GET /api/organiser/group-buys/:id/summary/breakdown ──────────────────────
router.get("/organiser/group-buys/:id/summary/breakdown", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const productName = req.query.productName as string | undefined;
  const statusFilter = req.query.status as string | undefined;
  const paymentStatusFilter = req.query.paymentStatus as string | undefined;

  if (!productName) { res.status(400).json({ error: "productName is required" }); return; }

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  let orders = await db.select().from(ordersTable).where(and(eq(ordersTable.groupBuyId, id), isNull(ordersTable.deletedAt)));
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  if (paymentStatusFilter && paymentStatusFilter !== "all") {
    if (paymentStatusFilter === "paid") {
      orders = orders.filter((o) => o.paymentStatus === "confirmed");
    } else if (paymentStatusFilter === "unpaid") {
      orders = orders.filter((o) => o.paymentStatus !== "confirmed");
    } else {
      orders = orders.filter((o) => o.paymentStatus === paymentStatusFilter);
    }
  }

  if (orders.length === 0) { res.json([]); return; }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

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

// ─── Standalone Product Routes (/api/organiser/products) ──────────────────────
// These allow managing all organiser products independent of a specific GB context.

// GET /api/organiser/products — list ALL products created by this organiser
router.get("/organiser/products", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;

  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.organiserId, username))
    .orderBy(desc(productsTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    price: parseFloat(String(r.price)),
  })));
});

// GET /api/organiser/products/:productId — get single product
router.get("/organiser/products/:productId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const productId = String(req.params["productId"]);

  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.organiserId, username)));

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json({ ...product, price: parseFloat(String(product.price)) });
});

// PUT /api/organiser/products/:productId — update product
router.put("/organiser/products/:productId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const productId = String(req.params["productId"]);

  const [existing] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.organiserId, username)));

  if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

  const { name, price, category, stock, active, mgSize, vendor, halfKitEnabled } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (price !== undefined) {
    const p = parseFloat(String(price));
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "price must be non-negative" }); return; }
    updates.price = p.toFixed(2);
  }
  if (category !== undefined) updates.category = category ? String(category).trim() : null;
  if (mgSize !== undefined) updates.mgSize = mgSize ? String(mgSize).trim() : null;
  if (stock !== undefined) updates.stock = stock != null ? parseInt(String(stock)) : null;
  if (active !== undefined) updates.active = Boolean(active);
  if (vendor !== undefined) {
    const newVendor = vendor ? String(vendor).trim() : null;
    // Vendor restriction check
    const [orgAccount] = await db
      .select({ organiserAllowedVendors: accountsTable.organiserAllowedVendors })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, username));
    const allowedVendors = orgAccount?.organiserAllowedVendors ?? null;
    if (allowedVendors !== null && newVendor) {
      if (!allowedVendors.map(v => v.toLowerCase()).includes(newVendor.toLowerCase())) {
        res.status(403).json({ error: `Vendor "${newVendor}" is not in your allowed vendor list. Allowed: ${allowedVendors.length ? allowedVendors.join(", ") : "(none)"}` });
        return;
      }
    }
    updates.vendor = newVendor;
  }
  if (halfKitEnabled !== undefined) updates.halfKitEnabled = Boolean(halfKitEnabled);

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, productId))
    .returning();

  res.json({ ...updated, price: parseFloat(String(updated.price)) });
});

// DELETE /api/organiser/products/:productId — delete product (and any GB links)
router.delete("/organiser/products/:productId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const productId = String(req.params["productId"]);

  const [existing] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.organiserId, username)));

  if (!existing) { res.status(404).json({ error: "Product not found" }); return; }

  // Remove from all GB product links first
  await db.delete(groupBuyProductsTable).where(eq(groupBuyProductsTable.productId, productId));

  // Then delete the product
  await db.delete(productsTable).where(eq(productsTable.id, productId));

  res.json({ ok: true });
});

// POST /api/organiser/products/import-csv — bulk import products from JSON rows
// Body: { rows: [{ name, price, category?, stock? }], groupBuyId?: string }
router.post("/organiser/products/import-csv", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const { rows, groupBuyId, vendor: bodyVendor } = req.body as {
    rows: { name: string; price: number; category?: string; stock?: number }[];
    groupBuyId?: string;
    vendor?: string;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }

  let gbManufacturer: string | null = null;
  if (groupBuyId) {
    const [gb] = await db
      .select({ id: groupBuysTable.id, manufacturer: groupBuysTable.manufacturer })
      .from(groupBuysTable)
      .where(gbOwner(req, groupBuyId));
    if (!gb) { res.status(404).json({ error: "Group buy not found or not owned by you" }); return; }
    gbManufacturer = gb.manufacturer;
  }

  // Validate all rows
  const invalid: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const price = parseFloat(String(row.price));
    if (!name || isNaN(price) || price < 0) invalid.push(i + 1);
  }
  if (invalid.length > 0) {
    res.status(400).json({ error: `Rows ${invalid.join(", ")} are missing or invalid name or price.` });
    return;
  }

  let created = 0;
  for (const row of rows) {
    const name = (row.name as string).trim();
    const price = parseFloat(String(row.price));
    const productId = randomUUID();

    const resolvedVendor = bodyVendor?.trim() || gbManufacturer;
    if (!resolvedVendor) {
      res.status(400).json({ error: "vendor is required — provide it explicitly or set a manufacturer on the group buy" });
      return;
    }
    await db.insert(productsTable).values({
      id: productId,
      name,
      vendor: resolvedVendor,
      price: price.toFixed(2),
      active: true,
      category: row.category ? String(row.category).trim() : null,
      sourceGroupBuyId: groupBuyId ?? null,
      organiserId: username,
      stock: row.stock != null ? parseInt(String(row.stock)) : null,
    });

    if (groupBuyId) {
      await db.insert(groupBuyProductsTable).values({
        id: randomUUID(),
        groupBuyId,
        productId,
        active: true,
      });
    }

    created++;
  }

  res.status(201).json({ ok: true, created });
});

// POST /api/organiser/products/import-image — AI extract products from PDF/image
// Body: { fileBase64: string, mimeType: string, groupBuyId?: string, previewOnly?: boolean }
// Returns: { products: [{ name, price, category? }] } for review before confirming import
router.post("/organiser/products/import-image", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const { fileBase64, mimeType, groupBuyId } = req.body as {
    fileBase64?: string;
    mimeType?: string;
    groupBuyId?: string;
  };

  if (!fileBase64 || !mimeType) {
    res.status(400).json({ error: "fileBase64 and mimeType are required" });
    return;
  }

  const ALLOWED_MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!ALLOWED_MIMES.has(mimeType)) {
    res.status(400).json({ error: "mimeType must be a PDF or image type" });
    return;
  }

  if (fileBase64.length > 28 * 1024 * 1024) {
    res.status(413).json({ error: "File too large (max 20 MB)" });
    return;
  }

  // Validate target GB belongs to this organiser (if provided)
  if (groupBuyId) {
    const [gb] = await db
      .select({ id: groupBuysTable.id })
      .from(groupBuysTable)
      .where(gbOwner(req, groupBuyId));
    if (!gb) { res.status(404).json({ error: "Group buy not found or not owned by you" }); return; }
  }

  const PRODUCT_EXTRACT_PROMPT = `You are analyzing a document (price list, product catalog, PDF, or image) to extract product information.

Extract all products/items and their prices. Return a JSON array with this exact format:
[
  { "name": "Product Name", "mgSize": "5mg", "unitCount": "10 vials", "price": 9.99, "category": "peptide" },
  ...
]

Rules:
- name: Product name WITHOUT the mg/unit size (e.g. "BPC-157", not "BPC-157 5mg")
- mgSize: The weight/dosage ONLY — a number followed by mcg, mg, g, or iu (e.g. "500mcg", "5mg", "10g", "100iu"). No other units allowed. Strip any packaging info like "x10 vials", "10 vials", "kit", "×5", etc. — only keep the weight/dosage. Omit this field entirely if the size is not in mcg, mg, g, or iu.
- unitCount: The quantity of units — a number followed by vials, pills, caps, tablets, or ampoules (e.g. "10 vials", "100 pills", "60 caps"). Omit if not present.
- price: Numeric price only (no currency symbols). Use the primary/sale price if multiple.
- category: Best guess from: "peptide", "aas", "pill", "sarm", "other". Can be omitted if unclear.
- Include ALL products found in the document.
- If a product has no clear price, omit it.
- Return ONLY the JSON array, no markdown, no extra text.`;

  try {
    // Strip data URI prefix if present
    const rawBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: PRODUCT_EXTRACT_PROMPT },
          { inlineData: { mimeType, data: rawBase64 } },
        ],
      }],
      config: { temperature: 0.1, maxOutputTokens: 65535, thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = (response.text ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let products: { name: string; price: number; category?: string; mgSize?: string; unitCount?: string }[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        products = parsed
          .filter((p: unknown) => typeof p === "object" && p !== null)
          .map((p: unknown) => {
            const item = p as Record<string, unknown>;
            return {
              name: String(item.name ?? "").trim(),
              price: parseFloat(String(item.price ?? "0")),
              category: item.category ? String(item.category).trim() : undefined,
              mgSize: item.mgSize ? String(item.mgSize).trim() : undefined,
              unitCount: item.unitCount ? String(item.unitCount).trim() : undefined,
            };
          })
          .filter(p => p.name && !isNaN(p.price) && p.price >= 0);
      }
    } catch {
      products = [];
    }

    res.json({ products, count: products.length });
  } catch (err) {
    console.error("[organiser:import-image] Gemini error:", err);
    res.status(500).json({ error: "Failed to extract products from file" });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /api/organiser/group-buys/:id/products-catalog — products for parcel item picker
router.get("/organiser/group-buys/:id/products-catalog", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const gb = await db.query.groupBuysTable.findFirst({ where: gbOwner(req, id) });
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const rows = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable)
    .innerJoin(groupBuyProductsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(eq(groupBuyProductsTable.groupBuyId, id));
  res.json(rows);
});

// PARCEL MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────

// GET /api/organiser/group-buys/:id/parcels
router.get("/organiser/group-buys/:id/parcels", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const gb = await db.query.groupBuysTable.findFirst({ where: gbOwner(req, id) });
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const parcels = await db.select().from(gbParcelsTable).where(eq(gbParcelsTable.groupBuyId, id)).orderBy(desc(gbParcelsTable.createdAt));
  res.json(parcels);
});

// POST /api/organiser/group-buys/:id/parcels
router.post("/organiser/group-buys/:id/parcels", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);
  const gb = await db.query.groupBuysTable.findFirst({ where: gbOwner(req, id) });
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const { label, carrier, trackingNumber, notes, items, trackingUrl, trackingParams, cachedEvents } = req.body;
  if (!label || !trackingNumber) { res.status(400).json({ error: "label and trackingNumber are required" }); return; }
  let safeTrackingUrl: string | null = null;
  if (trackingUrl) {
    try { const u = new URL(String(trackingUrl).trim()); if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme"); safeTrackingUrl = u.href; } catch { res.status(400).json({ error: "trackingUrl must be a valid http/https URL" }); return; }
  }
  const newParcelId = `parcel-${randomUUID().split("-")[0]}`;
  const [parcel] = await db.insert(gbParcelsTable).values({
    id: newParcelId, groupBuyId: id,
    label: String(label).trim(),
    carrier: carrier ? String(carrier).trim() : "Auto",
    trackingNumber: String(trackingNumber).trim(),
    notes: notes ? String(notes).trim() : null,
    items: Array.isArray(items) ? items : [],
    status: "pending",
    trackingUrl: safeTrackingUrl,
    trackingParams: trackingParams && typeof trackingParams === "object" ? trackingParams : null,
    cachedEvents: Array.isArray(cachedEvents) ? cachedEvents : [],
  }).returning();
  res.status(201).json(parcel);
});

// PATCH /api/organiser/group-buys/:gbId/parcels/:parcelId
router.patch("/organiser/group-buys/:gbId/parcels/:parcelId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const gb = await db.query.groupBuysTable.findFirst({ where: gbOwner(req, gbId) });
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const { label, carrier, trackingNumber, status, notes, items, trackingUrl, trackingParams, cachedEvents } = req.body;
  const updates: Record<string, unknown> = {};
  if (label !== undefined) updates.label = String(label).trim();
  if (carrier !== undefined) updates.carrier = String(carrier).trim();
  if (trackingNumber !== undefined) updates.trackingNumber = String(trackingNumber).trim();
  if (status !== undefined) updates.status = String(status);
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;
  if (items !== undefined) updates.items = Array.isArray(items) ? items : [];
  if (trackingUrl !== undefined) {
    if (trackingUrl) {
      try { const u = new URL(String(trackingUrl).trim()); if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme"); updates.trackingUrl = u.href; } catch { res.status(400).json({ error: "trackingUrl must be a valid http/https URL" }); return; }
    } else { updates.trackingUrl = null; }
  }
  if (trackingParams !== undefined) updates.trackingParams = trackingParams && typeof trackingParams === "object" ? trackingParams : null;
  if (cachedEvents !== undefined) updates.cachedEvents = Array.isArray(cachedEvents) ? cachedEvents : [];
  const [updated] = await db.update(gbParcelsTable).set(updates).where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId))).returning();
  if (!updated) { res.status(404).json({ error: "Parcel not found" }); return; }
  res.json(updated);
});

// DELETE /api/organiser/group-buys/:gbId/parcels/:parcelId
router.delete("/organiser/group-buys/:gbId/parcels/:parcelId", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = String(req.params["gbId"]);
  const parcelId = String(req.params["parcelId"]);
  const gb = await db.query.groupBuysTable.findFirst({ where: gbOwner(req, gbId) });
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  await db.delete(gbParcelsTable).where(and(eq(gbParcelsTable.id, parcelId), eq(gbParcelsTable.groupBuyId, gbId)));
  res.json({ ok: true });
});

// POST /api/organiser/products — create a standalone product (without a specific GB)
router.post("/organiser/products", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const { name, price, category, stock, active, mgSize, vendor } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!vendor || !String(vendor).trim()) { res.status(400).json({ error: "vendor is required" }); return; }
  const p = parseFloat(String(price));
  if (isNaN(p) || p < 0) { res.status(400).json({ error: "price must be a non-negative number" }); return; }

  const productId = `prod-${randomUUID().split("-")[0]}`;

  const [product] = await db.insert(productsTable).values({
    id: productId,
    name: name.trim(),
    vendor: String(vendor).trim(),
    price: p.toFixed(2),
    active: active != null ? Boolean(active) : true,
    category: category ? String(category).trim() : null,
    organiserId: username,
    mgSize: mgSize ? String(mgSize).trim() : null,
    stock: stock != null ? parseInt(String(stock)) : null,
  }).returning();

  res.status(201).json({ ...product, price: parseFloat(String(product.price)) });
});

// ── POST /organiser/group-buys/:id/apply-shipping ──────────────
// Per-group-buy shipping split for the organiser's own GB
router.post("/organiser/group-buys/:id/apply-shipping", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(gbOwner(req, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const { totalShipping, equalPct = 80, weightedPct = 20, statusFilter = "Submitted", paymentStatusFilter = "all" } = req.body;

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

  const paymentWhere = paymentStatusFilter === "paid"
    ? or(eq(ordersTable.paymentStatus, "confirmed"), eq(ordersTable.paymentStatus, "test_confirmed"))
    : paymentStatusFilter === "unpaid"
      ? eq(ordersTable.paymentStatus, "unpaid")
      : undefined;

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, id),
      eq(ordersTable.status, statusFilter),
      isNull(ordersTable.deletedAt),
      paymentWhere,
    ));

  if (orders.length === 0) {
    res.json({ message: `No matching orders found for this group buy`, updatedCount: 0, breakdown: [] });
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

  const updates: Array<{ orderId: string; vendorShipping: number; newGrandTotal: number; username: string }> = [];

  for (const order of orders) {
    const orderQty = orderQtyMap.get(order.id) ?? 0;
    const equalShare = equalAmount / orderCount;
    const weightedShare = totalQty > 0 ? weightedAmount * (orderQty / totalQty) : 0;
    const vendorShipping = parseFloat((equalShare + weightedShare).toFixed(2));

    const productSubtotal = parseFloat(String(order.productSubtotal));
    const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
    const tip = parseFloat(String(order.tip ?? "0"));
    const newGrandTotal = parseFloat((productSubtotal + deliveryPrice + vendorShipping + tip).toFixed(2));

    updates.push({ orderId: order.id, vendorShipping, newGrandTotal, username: order.telegramUsername });
  }

  for (const u of updates) {
    await db
      .update(ordersTable)
      .set({
        vendorShipping: u.vendorShipping.toFixed(2),
        grandTotal: u.newGrandTotal.toFixed(2),
      })
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

// GET /api/organiser/group-buys/:id/members — list members for targeting
router.get("/organiser/group-buys/:id/members", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = req.params.id as string;

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId))
    .limit(1);

  if (!gb || gb.organiserId !== username) {
    res.status(403).json({ error: "Not your Group Buy" });
    return;
  }

  const members = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      hasTelegram: accountsTable.telegramChatId,
    })
    .from(accountGroupBuysTable)
    .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
    .where(eq(accountGroupBuysTable.groupBuyId, gbId));

  res.json(members.map(m => ({
    telegramUsername: m.telegramUsername,
    hasTelegram: m.hasTelegram != null,
  })));
});

// POST /api/organiser/group-buys/:gbId/orders/mark-oos — mark products OOS in this GB (scoped to organiser's own GB)
router.post("/organiser/group-buys/:gbId/orders/mark-oos", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency, organiserCanMarkOos: groupBuysTable.organiserCanMarkOos })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (gb.organiserCanMarkOos === false) { res.status(403).json({ error: "Mark OOS is disabled for this group buy" }); return; }

  const { productNames } = req.body as { productNames?: string[] };
  if (!Array.isArray(productNames) || productNames.length === 0) {
    res.status(400).json({ error: "productNames is required" }); return;
  }
  const cleanNames = productNames.map((n: string) => String(n).trim()).filter(Boolean);

  const gbOrderIds = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.groupBuyId, gbId));
  const orderIdList = gbOrderIds.map(o => o.id);

  if (orderIdList.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 }); return;
  }

  const matchingItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(and(inArray(orderLineItemsTable.orderId, orderIdList), inArray(orderLineItemsTable.productName, cleanNames)));

  const nonOosItems = matchingItems.filter(li => !li.isOos);
  if (nonOosItems.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 }); return;
  }

  const itemIds = nonOosItems.map(li => li.id);
  const affectedOrderIds = [...new Set(nonOosItems.map(li => li.orderId))];

  await db.transaction(async (tx) => {
    await tx.update(orderLineItemsTable).set({ isOos: true }).where(inArray(orderLineItemsTable.id, itemIds));
    for (const orderId of affectedOrderIds) {
      const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) continue;
      const allItems = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
      const newProductSubtotal = allItems.filter(li => !li.isOos).reduce((sum, li) => sum + parseFloat(String(li.lineTotal)), 0);
      const newGrandTotal = newProductSubtotal + parseFloat(String(order.deliveryPrice ?? "0")) + parseFloat(String(order.vendorShipping ?? "0")) + parseFloat(String(order.tip ?? "0")) + parseFloat(String((order as any).testingContribution ?? "0"));
      await tx.update(ordersTable).set({ productSubtotal: newProductSubtotal.toFixed(2) as any, grandTotal: newGrandTotal.toFixed(2) as any }).where(eq(ordersTable.id, orderId));
    }
  });

  // Telegram notifications
  try {
    const affectedOrders = await db
      .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, grandTotal: ordersTable.grandTotal })
      .from(ordersTable)
      .where(inArray(ordersTable.id, affectedOrderIds));

    const usernames = [...new Set(affectedOrders.map(o => o.telegramUsername.replace(/^@/, "").toLowerCase()))];
    const accounts = usernames.length > 0 ? await db
      .select({ telegramUsername: accountsTable.telegramUsername, chatId: accountsTable.telegramChatId })
      .from(accountsTable)
      .where(inArray(accountsTable.telegramUsername, usernames)) : [];
    const chatIdMap = new Map(accounts.map(a => [a.telegramUsername.toLowerCase(), a.chatId]));

    const oosByOrder = new Map<string, string[]>();
    for (const li of nonOosItems) {
      const arr = oosByOrder.get(li.orderId) ?? [];
      arr.push(`${li.productName} ×${parseFloat(String(li.quantity))}`);
      oosByOrder.set(li.orderId, arr);
    }

    for (const order of affectedOrders) {
      const uname = order.telegramUsername.replace(/^@/, "").toLowerCase();
      const chatId = chatIdMap.get(uname);
      if (!chatId) continue;
      const newTotal = parseFloat(String(order.grandTotal)).toFixed(2);
      const itemList = (oosByOrder.get(order.id) ?? []).map(i => `• ${escapeHtml(i)}`).join("\n");
      const msg = `⚠️ <b>Item(s) Out of Stock</b>\n<b>Group Buy:</b> ${escapeHtml(gb.name)}\n\nThe following item(s) in your order have been marked out of stock and removed:\n${itemList}\n\n<b>Your updated total: ${escapeHtml(gb.currency)}${newTotal}</b>\n\nPlease contact your organiser if you have any questions.`;
      await sendTelegramMessage(chatId, msg, "HTML").catch(() => {});
    }
  } catch (_) {}

  res.json({ ok: true, affectedLineItems: nonOosItems.length, affectedOrders: affectedOrderIds.length });
});

// POST /api/organiser/group-buys/:gbId/orders/unmark-oos — restore OOS products back to active in this GB
router.post("/organiser/group-buys/:gbId/orders/unmark-oos", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency, organiserCanMarkOos: groupBuysTable.organiserCanMarkOos })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (gb.organiserCanMarkOos === false) { res.status(403).json({ error: "Mark/Unmark OOS is disabled for this group buy" }); return; }

  const { productNames } = req.body as { productNames?: string[] };
  if (!Array.isArray(productNames) || productNames.length === 0) {
    res.status(400).json({ error: "productNames is required" }); return;
  }
  const cleanNames = productNames.map((n: string) => String(n).trim()).filter(Boolean);

  const gbOrderIds = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.groupBuyId, gbId));
  const orderIdList = gbOrderIds.map(o => o.id);

  if (orderIdList.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 }); return;
  }

  const matchingItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(and(inArray(orderLineItemsTable.orderId, orderIdList), inArray(orderLineItemsTable.productName, cleanNames)));

  const oosItems = matchingItems.filter(li => li.isOos);
  if (oosItems.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 }); return;
  }

  const itemIds = oosItems.map(li => li.id);
  const affectedOrderIds = [...new Set(oosItems.map(li => li.orderId))];

  await db.transaction(async (tx) => {
    await tx.update(orderLineItemsTable).set({ isOos: false }).where(inArray(orderLineItemsTable.id, itemIds));
    for (const orderId of affectedOrderIds) {
      const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) continue;
      const allItems = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
      const newProductSubtotal = allItems.filter(li => !li.isOos).reduce((sum, li) => sum + parseFloat(String(li.lineTotal)), 0);
      const newGrandTotal = newProductSubtotal + parseFloat(String(order.deliveryPrice ?? "0")) + parseFloat(String(order.vendorShipping ?? "0")) + parseFloat(String(order.tip ?? "0")) + parseFloat(String((order as any).testingContribution ?? "0"));
      await tx.update(ordersTable).set({ productSubtotal: newProductSubtotal.toFixed(2) as any, grandTotal: newGrandTotal.toFixed(2) as any }).where(eq(ordersTable.id, orderId));
    }
  });

  res.json({ ok: true, affectedLineItems: oosItems.length, affectedOrders: affectedOrderIds.length });
});

// POST /api/organiser/group-buys/:id/broadcast — send a Telegram message to GB members
router.post("/organiser/group-buys/:id/broadcast", requireOrganiser, async (req, res): Promise<void> => {
  const username = req.organiser!.telegramUsername;
  const gbId = req.params.id as string;
  const { message, targetUsernames, paymentStatusFilter, productFilter } = req.body as { message?: string; targetUsernames?: string[]; paymentStatusFilter?: string; productFilter?: string[] };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  if (message.trim().length > 4000) {
    res.status(400).json({ error: "Message must be 4000 characters or fewer" });
    return;
  }

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId))
    .limit(1);

  if (!gb || gb.organiserId !== username) {
    res.status(403).json({ error: "Not your Group Buy" });
    return;
  }

  const text = `📢 <b>Message from your GB Organiser</b>\n<b>Group Buy:</b> ${escapeHtml(gb.name)}\n<b>Organiser:</b> @${escapeHtml(username)}\n\n${escapeHtml(message.trim())}`;

  const recipientChatIds: Map<string, string | null> = new Map();
  const hasProductFilter = Array.isArray(productFilter) && productFilter.length > 0;
  const hasStatusFilter = !!paymentStatusFilter && paymentStatusFilter !== "all";

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

  if (hasStatusFilter || hasProductFilter) {
    let rows: { telegramUsername: string; paymentStatus: string | null; status: string | null }[];

    if (hasProductFilter) {
      rows = await db
        .selectDistinct({ telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status })
        .from(ordersTable)
        .innerJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
        .where(and(eq(ordersTable.groupBuyId, gbId), inArray(orderLineItemsTable.productName, productFilter!)));
    } else {
      rows = await db
        .select({ telegramUsername: ordersTable.telegramUsername, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status })
        .from(ordersTable)
        .where(eq(ordersTable.groupBuyId, gbId));
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
      .select({ telegramChatId: accountsTable.telegramChatId, telegramUsername: accountsTable.telegramUsername })
      .from(accountGroupBuysTable)
      .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
      .where(eq(accountGroupBuysTable.groupBuyId, gbId));

    const targeting = Array.isArray(targetUsernames) && targetUsernames.length > 0;
    const targetSet = targeting ? new Set(targetUsernames.map(u => u.replace(/^@/, "").toLowerCase())) : null;
    const members = targeting ? allMembers.filter(m => targetSet!.has(m.telegramUsername.toLowerCase())) : allMembers;
    for (const m of members) recipientChatIds.set(m.telegramUsername.toLowerCase(), m.telegramChatId);
  }

  let sent = 0;
  let skipped = 0;

  for (const [, chatId] of recipientChatIds) {
    if (!chatId) { skipped++; continue; }
    const ok = await sendTelegramMessage(chatId, text, "HTML").catch(() => false);
    if (ok) sent++; else skipped++;
  }

  writeLog("change", "info", "organiser_broadcast", `Organiser @${username} broadcast to ${sent}/${recipientChatIds.size} members of GB ${gb.name}`, { gbId, sent, skipped, paymentStatusFilter, productFilter }).catch(() => {});

  res.json({ ok: true, sent, skipped, total: recipientChatIds.size });
});

// POST /api/organiser/group-buys/:gbId/orders/bulk-add-product
// Add a product from this GB to multiple selected orders. Skips orders that
// already contain the product. Respects organiserOrderEditEnabled +
// organiserCanEditQuantities permissions. Recalculates totals for each order.
router.post("/organiser/group-buys/:gbId/orders/bulk-add-product", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      organiserOrderEditEnabled: groupBuysTable.organiserOrderEditEnabled,
      organiserCanEditQuantities: groupBuysTable.organiserCanEditQuantities,
    })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  if (!gb.organiserOrderEditEnabled) { res.status(403).json({ error: "Order editing is not enabled for this group buy" }); return; }
  if (!gb.organiserCanEditQuantities) { res.status(403).json({ error: "Product editing is not permitted for this group buy" }); return; }

  const { orderIds, productId, quantity } = req.body as { orderIds?: string[]; productId?: string; quantity?: number };
  if (!Array.isArray(orderIds) || orderIds.length === 0) { res.status(400).json({ error: "orderIds required" }); return; }
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }
  const qty = parseFloat(String(quantity ?? 1));
  if (isNaN(qty) || qty <= 0) { res.status(400).json({ error: "quantity must be a positive number" }); return; }

  // Verify product belongs to this GB
  const [gbProduct] = await db
    .select({ productId: groupBuyProductsTable.productId, priceOverride: groupBuyProductsTable.priceOverride, productName: productsTable.name, basePrice: productsTable.price })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(productsTable.id, groupBuyProductsTable.productId))
    .where(and(eq(groupBuyProductsTable.groupBuyId, gbId), eq(groupBuyProductsTable.productId, productId)));

  if (!gbProduct) { res.status(404).json({ error: "Product not found in this group buy" }); return; }

  const unitPrice = parseFloat(String(gbProduct.priceOverride ?? gbProduct.basePrice));
  const lineTotal = parseFloat((qty * unitPrice).toFixed(2));

  let added = 0;
  let skipped = 0;

  for (const orderId of orderIds) {
    const [order] = await db
      .select({ id: ordersTable.id, deliveryPrice: ordersTable.deliveryPrice, vendorShipping: ordersTable.vendorShipping, tip: ordersTable.tip, testingContribution: ordersTable.testingContribution })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));
    if (!order) { skipped++; continue; }

    const existing = await db
      .select({ id: orderLineItemsTable.id })
      .from(orderLineItemsTable)
      .where(and(eq(orderLineItemsTable.orderId, orderId), eq(orderLineItemsTable.productId, productId)));
    if (existing.length > 0) { skipped++; continue; }

    await db.insert(orderLineItemsTable).values({
      id: randomUUID(),
      orderId,
      productId,
      productName: gbProduct.productName,
      quantity: String(qty) as any,
      unitPrice: String(unitPrice) as any,
      lineTotal: String(lineTotal) as any,
      isOos: false,
    });

    const allItems = await db.select({ lineTotal: orderLineItemsTable.lineTotal }).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
    const newSubtotal = parseFloat(allItems.reduce((s, li) => s + parseFloat(String(li.lineTotal)), 0).toFixed(2));
    const extras = parseFloat(String(order.deliveryPrice ?? 0)) + parseFloat(String(order.vendorShipping ?? 0)) + parseFloat(String(order.tip ?? 0)) + parseFloat(String(order.testingContribution ?? 0));
    const newGrandTotal = parseFloat((newSubtotal + extras).toFixed(2));
    await db.update(ordersTable).set({ productSubtotal: String(newSubtotal) as any, grandTotal: String(newGrandTotal) as any }).where(eq(ordersTable.id, orderId));

    added++;
  }

  res.json({ added, skipped, productName: gbProduct.productName, unitPrice, quantity: qty });
});

// ─── POST /api/organiser/group-buys/:gbId/orders/apply-intl-shipping ──────────
// Apply a pre-configured international shipping rate to a set of orders
router.post("/organiser/group-buys/:gbId/orders/apply-intl-shipping", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const { rateId, orderIds, notify, paid } = req.body as { rateId: string; orderIds: string[]; notify?: boolean; paid?: boolean };
  // paid === true   → shipping already covered, no outstanding balance added
  // paid === false  → shipping is unpaid; the rate price is added to amountDue (additive, customer owes it)
  const isPaid = paid === true;

  const [gb] = await db
    .select({ id: groupBuysTable.id, currency: groupBuysTable.currency, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const [rate] = await db
    .select()
    .from(intlShippingRatesTable)
    .where(and(eq(intlShippingRatesTable.id, rateId), eq(intlShippingRatesTable.groupBuyId, gbId)));
  if (!rate) { res.status(404).json({ error: "Shipping rate not found for this group buy" }); return; }

  const currency = (gb.currency ?? "GBP").toUpperCase();
  const ratePrice = currency === "USD" ? parseFloat(String(rate.priceUsd))
    : currency === "EUR" ? parseFloat(String(rate.priceEur))
    : parseFloat(String(rate.priceGbp));

  const targetOrders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, orderIds)));

  if (targetOrders.length === 0) {
    res.json({ ok: true, updatedCount: 0 });
    return;
  }

  const updatedOrders: { id: string; telegramUsername: string; newGrandTotal: number; newAmountDue: number }[] = [];
  for (const order of targetOrders) {
    const productSubtotal = parseFloat(String(order.productSubtotal ?? "0"));
    const vendorShipping = parseFloat(String(order.vendorShipping ?? "0"));
    const tip = parseFloat(String(order.tip ?? "0"));
    const testingContribution = parseFloat(String((order as any).testingContribution ?? "0"));
    const newGrandTotal = parseFloat((productSubtotal + ratePrice + vendorShipping + tip + testingContribution).toFixed(2));
    const prevAmountDue = parseFloat(String((order as any).amountDue ?? "0"));
    const newAmountDue = isPaid ? prevAmountDue : parseFloat((prevAmountDue + ratePrice).toFixed(2));

    await db.update(ordersTable).set({
      deliveryPrice: ratePrice.toFixed(2) as any,
      grandTotal: newGrandTotal.toFixed(2) as any,
      amountDue: newAmountDue.toFixed(2) as any,
    }).where(eq(ordersTable.id, order.id));

    updatedOrders.push({ id: order.id, telegramUsername: order.telegramUsername, newGrandTotal, newAmountDue });
  }

  if (notify) {
    const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : `${currency} `;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    for (const o of updatedOrders) {
      const regionPart = rate.region ? ` (${esc(rate.region)})` : "";
      const dueLine = isPaid
        ? `<b>Status:</b> Already covered — no further payment required.\n`
        : `<b>Outstanding balance:</b> ${sym}${o.newAmountDue.toFixed(2)}\n`;
      const tail = isPaid
        ? `Your order total has been updated to reflect the shipping cost.`
        : `Please send the additional shipping payment to complete your order.`;
      const text =
        `📦 <b>Shipping Added to Your Order</b>\n\n` +
        `Your organiser has added international shipping to your order for <b>${esc(gb.name ?? "the group buy")}</b>.\n\n` +
        `<b>Shipping charge:</b> ${sym}${ratePrice.toFixed(2)} — ${esc(rate.carrier)} · ${esc(rate.country)}${regionPart}\n` +
        `<b>Your new total: ${sym}${o.newGrandTotal.toFixed(2)}</b>\n` +
        dueLine +
        `\n${tail}`;
      notifyUser(o.telegramUsername, "shipping_added", text).catch(() => {});
    }
  }

  writeLog("order", "info", "organiser_applied_intl_shipping",
    `Organiser applied intl shipping rate (${rate.country} / ${rate.carrier}) to ${updatedOrders.length} order(s) — ${isPaid ? "paid" : "unpaid"}`,
    { gbId, rateId, orderIds, notify, paid: isPaid },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  res.json({ ok: true, updatedCount: updatedOrders.length, ratePrice, currency, paid: isPaid });
});

// ─── GET /organiser/group-buys/:gbId/orders/trash ─────────────────────────
// Returns soft-deleted orders for this GB within the 2-day restore window.
// Scoped to orders belonging to the requesting organiser's own GB.
router.get("/organiser/group-buys/:gbId/orders/trash", requireOrganiser, async (req, res): Promise<void> => {
  const { gbId } = req.params;

  // Verify organiser owns (or has admin-organiser access to) this GB
  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId))
    .limit(1);
  if (!gb) { res.status(403).json({ error: "Not your group buy" }); return; }

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      isNotNull(ordersTable.deletedAt),
      gt(ordersTable.deletedAt, cutoff),
    ))
    .orderBy(desc(ordersTable.deletedAt));

  const orderIds = orders.map(o => o.id);
  const lineItems = orderIds.length > 0
    ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];

  res.json(orders.map(o => ({
    id: o.id,
    code: o.code,
    telegramUsername: o.telegramUsername,
    status: o.status,
    grandTotal: o.grandTotal,
    deletedAt: o.deletedAt,
    deletedBy: o.deletedBy,
    expiresAt: new Date(new Date(o.deletedAt!).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    lineItems: lineItems
      .filter(li => li.orderId === o.id)
      .map(li => ({ productName: li.productName, quantity: li.quantity })),
  })));
});

// ─── POST /organiser/group-buys/:gbId/orders/:orderId/restore ──────────────
// Restores a soft-deleted order within the 2-day window.
// Scoped to the requesting organiser's own GB.
router.post("/organiser/group-buys/:gbId/orders/:orderId/restore", requireOrganiser, async (req, res): Promise<void> => {
  const gbId = req.params.gbId as string;
  const orderId = req.params.orderId as string;
  const actorUsername = req.organiser!.telegramUsername;

  // Verify organiser owns (or has admin-organiser access to) this GB
  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(gbOwner(req, gbId))
    .limit(1);
  if (!gb) { res.status(403).json({ error: "Not your group buy" }); return; }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.groupBuyId, gbId),
      isNotNull(ordersTable.deletedAt),
    ))
    .limit(1);

  if (!order) { res.status(404).json({ error: "Deleted order not found" }); return; }

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  if (order.deletedAt! < cutoff) {
    res.status(410).json({ error: "Restore window has expired for this order" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(ordersTable.id, orderId));

  writeLog("order", "info", "order_restored_by_organiser",
    `Organiser @${actorUsername} restored order ${order.code} (${order.telegramUsername}) in GB ${gb.name}`,
    { orderId: order.id, code: order.code, telegramUsername: order.telegramUsername, gbId, previousDeletedBy: order.deletedBy },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  res.json({ ok: true, code: order.code });
});

export default router;


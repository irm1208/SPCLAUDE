import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID, timingSafeEqual, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { db } from "@workspace/db";
import ExcelJS from "exceljs";
import {
  ordersTable,
  orderLineItemsTable,
  orderNotesTable,
  productsTable,
  deliveryMethodsTable,
  fs3CostsTable,
  siteConfigTable,
  auditLogsTable,
  lookupAttemptsTable,
  customersTable,
  adminAlertsTable,
  groupBuysTable,
  accountGroupBuysTable,
  inviteCodesTable,
  gbWaitlistTable,
  accountsTable,
  bloodTestSessionsTable,
  bloodTestValuesTable,
  compoundLogsTable,
  labTestsTable,
  scheduledAnnouncementsTable,
  feedbackTable,
  telegramMessageLogsTable,
  gbReshippersTable,
  customerActivityLogsTable,
  creditTransactionsTable,
  blockedIpsTable,
  poolParticipantsTable,
  batchCodePrefixesTable,
  gbCountryLegsTable,
  geoIpCacheTable,
  groupBuyProductsTable,
  wholesaleSharesTable,
  ticketsTable,
  routingHistoryTable,
  intlShippingRatesTable,
  fs3SubmissionsTable,
  organiserAuditLogTable,
} from "@workspace/db";
import { eq, inArray, notInArray, desc, asc, and, sql, or, ilike, like, gte, lte, isNotNull, isNull, lt, gt } from "drizzle-orm";
import { GoogleGenAI } from "../lib/google-genai";
import { writeLog } from "../lib/audit-log";
import { createAdminOrganiserSession } from "../lib/admin-organiser-sessions";
import { issueAccountCookie } from "../middleware/account-auth";
import { enrichLogsWithGeo, enrichIps, enrichIpsFromCache } from "../lib/ip-geo";
import { createAlert } from "../lib/create-alert";
import { calculateVendorShipping } from "../lib/vendor-shipping";
import { notifyUser, sendAdminMessage, sendTelegramMessage, notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { maybeSubmitSharedOrder } from "../lib/wholesale-submit";
import { logCustomerActivity } from "../lib/activity-log";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COUNTRY_NORM: Record<string, string> = {
  "gb": "United Kingdom", "uk": "United Kingdom", "united kingdom": "United Kingdom",
  "fr": "France", "france": "France",
  "dk": "Denmark", "denmark": "Denmark",
  "nl": "Netherlands", "netherlands": "Netherlands", "the netherlands": "Netherlands",
  "us": "United States", "usa": "United States", "united states": "United States", "united states of america": "United States",
  "de": "Germany", "germany": "Germany",
  "it": "Italy", "italy": "Italy",
  "es": "Spain", "spain": "Spain",
  "pl": "Poland", "poland": "Poland",
  "au": "Australia", "australia": "Australia",
  "ca": "Canada", "canada": "Canada",
  "be": "Belgium", "belgium": "Belgium",
  "se": "Sweden", "sweden": "Sweden",
  "no": "Norway", "norway": "Norway",
  "ch": "Switzerland", "switzerland": "Switzerland",
  "at": "Austria", "austria": "Austria",
  "ie": "Ireland", "ireland": "Ireland",
  "pt": "Portugal", "portugal": "Portugal",
  "cz": "Czech Republic", "czech republic": "Czech Republic", "czechia": "Czech Republic",
  "ro": "Romania", "romania": "Romania",
  "hu": "Hungary", "hungary": "Hungary",
  "sk": "Slovakia", "slovakia": "Slovakia",
  "hr": "Croatia", "croatia": "Croatia",
  "bg": "Bulgaria", "bulgaria": "Bulgaria",
  "gr": "Greece", "greece": "Greece",
  "fi": "Finland", "finland": "Finland",
};

function normalizeCountry(c: string): string {
  if (!c) return c;
  return COUNTRY_NORM[c.toLowerCase().trim()] ?? c;
}

const BCRYPT_ROUNDS = 12;

// ─── FS3 default cost map (server-side only — never sent to browser bundle) ──
const FS3_DEFAULT_COSTS: Record<string, number> = {
  "Semaglutide 10mg": 40,
  "Tirzepatide 10mg": 50, "Tirzepatide 15mg": 60, "Tirzepatide 20mg": 70,
  "Tirzepatide 30mg": 80, "Tirzepatide 45mg": 100, "Tirzepatide 60mg": 120,
  "Tirzepatide 100mg": 190,
  "Retatrutide 10mg": 80, "Retatrutide 20mg": 105, "Retatrutide 30mg": 130,
  "Retatrutide 40mg": 150, "Retatrutide 50mg": 185, "Retatrutide 100mg": 380,
  "Cagrilintide 5mg": 90, "Cagrilintide 10mg": 170,
  "Mazdutide 10mg": 160, "Survodutide 10mg": 150,
  "GAC water 10ml": 25, "BAC water 10ml": 25, "GAC water 3ml": 15, "BAC water 3ml": 15,
  "L-Carnitine 500mg×20ml×10vials Water": 160,
  "Cyanocobalamin B12 1mg ×10ml×10vials water": 60,
  "HGH 10IU": 50, "IGF-1 LR3 1mg": 180,
  "5-Amino-1MQ 50mg": 60, "5-Amino-1MQ 10mg": 40,
  "Adipotide 10mg": 165, "VIP 10mg": 100,
  "Bpc 157 10mg": 35, "BPC 157 10mg": 35, "Bpc 157 40mg": 125, "BPC 157 40mg": 125,
  "TB500(TB4) 10mg": 85, "TB500 (TB4) 10mg": 85, "TB500(TB4) 20mg": 150, "TB500 (TB4) 20mg": 150,
  "Abaloparatide 3mg": 100, "Teriparatide 750mcg": 75,
  "Fragment 176-191 5mg": 75, "Fragment 176\u20131915mg": 75, "PT141 10mg": 50, "Pt141 10mg": 50,
  "Kisspeptin-10mg": 60, "Kisspeptin 10mg": 60,
  "Epitalon 10mg": 40, "Epitalon 50mg": 200, "N-Acetyl Epitalon 20mg": 80,
  "Melanotan II 10mg": 35, "Melanotan I 10mg": 40,
  "CJC-1295 with Dac 5mg": 90, "CJC-1295 with DAC 5mg": 90,
  "CJC-1295 No Dac 10mg": 100, "CJC-1295 No DAC 10mg": 100,
  "Tesa / IPA / CJC No DAC 6/3/3mg": 100,
  "GHRP-6 10mg": 50, "GHRP-2 10mg": 50,
  "Tesamorelin 10mg": 100, "Tesamorelin 20mg": 190,
  "Mots-C 10mg": 45, "Mots-C 20mg": 90, "Mots-C 40mg": 135,
  "SS-31 10mg": 60, "SS-31 30mg": 135, "SS-31 50mg": 200,
  "Ipamorelin 10mg": 65, "Thymosin Alpha-1 10mg": 95, "Thymulin 20mg": 100,
  "Adamax 10mg": 240, "Adamax 10mg\uff081032 da)": 240,
  "Semax 10mg": 40, "Selank 10mg": 40, "Na semax": 60, "Na Semax": 60, "Na selank": 60, "Na Selank": 60,
  "IllumiNeuro": 240,
  "Fox04 10mg": 240, "Oxytocin 10mg": 40,
  "Snap-8 10mg": 40, "DSIP 5mg": 35, "DSIP 10mg": 60,
  "BPC 5mg/TB4 5mg blend": 70, "BPC 10mg/TB4 10mg blend": 120,
  "CJC No Dac/ipa 5/5mg": 75, "CJC No DAC / Ipa 5/5mg": 75,
  "CJC No Dac/ipa 10/10mg": 165, "CJC No DAC / Ipa 10/10mg": 165,
  "CJC 6mg/ipa 11mg blend": 145, "CJC 6mg / Ipa 11mg Blend": 145,
  "Tesa 5mg/ipa 5mg blend": 110, "Tesa 5mg / Ipa 5mg Blend": 110,
  "Tesa 10mg/ipa 3mg blend": 145, "Tesa 10mg / Ipa 3mg Blend": 145,
  "AHK-CU 100mg": 60, "GHK-CU 100mg": 51, "GHK-CU 50mg": 40,
  "NAD+500mg buffer ph6-6.5": 95, "NAD+ 500mg Buffer pH6-6.5": 95,
  "TB500 frag 10mg": 60, "TB500 Frag 10mg": 60,
  "Pnc 27 30mg": 240, "PNC 27 30mg": 240,
  "Ll 37 5mg": 85, "LL-37 5mg": 85,
  "KPV 10mg": 45, "Kpv 30mg": 110, "KPV 30mg": 110, "Sermorelin 5mg": 70,
  "KPV & GHK-CU Blend": 5,
  "GLOW(TB4 10+BP 10+GHK50)": 110, "GLOW (TB4 10mg + BPC 10mg + GHK 50mg)": 110,
  "KLOW": 150, "KLOW (TB10+BPC10+KPV10+GHK50)": 150,
  "Pe-22-28 10mg": 55, "PE-22-28 10mg": 55,
  "Ara-290 16mg": 50,
  "Tri-Heal Max": 380,
  "Slup-332 500mcg": 60,
  "Bam-15 50mg": 300, "Bam-15 50mg (usa no resend)": 300,
  "Slu 100mcg/bam25mg blend 60TABS)": 95, "SLU 100mcg / BAM 25mg Blend 60 Tabs": 95,
  "HCG 1000 IU GMP": 40, "HCG 2000 IU GMP": 70, "HCG 5000 IU GMP": 175,
  "HCG 1000 IU GMP 3ml 10vials": 40, "HCG 2000 IU GMP 3ml 10vials": 70, "HCG 5000 IU GMP 3ml 10vials": 175,
  "Glutathione 600mg GMP 10ML 10vials": 45, "Glutathione 1500mg GMP 20ML 10vials": 85,
  "HMG 75IU X 10vials GMP": 75, "Cerebrolysin 30mg GMP 10ML 10vials": 45,
  "Prostamax 20mg": 100, "Pinealon 20mg": 100, "Ovagen 20mg": 100,
  "Vesugen 20mg": 100, "Bronchogen 20mg": 100, "Vilon 20mg": 100,
  "Cartalax 20mg": 100, "Cortagen 20mg": 100, "Chonluten 20mg": 100,
  "Livagen 20mg": 100, "Testagen 20mg": 100, "Cardiogen 20mg": 100,
  "Pancragon 20mg": 100, "Thymogen 20mg": 100, "Crystagen 20mg": 100,
  "Vesilute 20mg": 100,
  "GHK-CU 10g - Raw": 75, "GHK-CU 10g Raw": 75,
  "AHK-CU 10g - Raw": 175, "AHK-CU 10g Raw": 175,
  "SNAP-8 1g": 95, "SNAP-8 10g": 785,
  "BPC 157 - 500mcg tablets": 50, "BPC 157 500mcg Tablets": 50,
  "KPV - 500mcg tablets": 50, "KPV 500mcg Tablets": 50,
  "Humanin - [Purity not Guaranteed]": 155, "Humanin [Purity not Guaranteed]": 155,
  "Orforglipron 12mg": 120,
};

const router: IRouter = Router();

// ─── Formatters ───────────────────────────────────────────────
function fmtOrder(o: Record<string, any>, lineItems: Record<string, any>[] = []) {
  return {
    id: o.id,
    code: o.code,
    telegramUsername: o.telegramUsername,
    status: o.status,
    deliveryMethod: o.deliveryMethod,
    deliveryMethodId: o.deliveryMethodId,
    deliveryPrice: parseFloat(String(o.deliveryPrice ?? "0")),
    vendorShipping: parseFloat(String(o.vendorShipping ?? "0")),
    productSubtotal: parseFloat(String(o.productSubtotal ?? "0")),
    tip: parseFloat(String(o.tip ?? "0")),
    grandTotal: parseFloat(String(o.grandTotal ?? "0")),
    creditsApplied: o.creditsApplied != null ? parseFloat(String(o.creditsApplied)) : 0,
    notes: o.notes ?? null,
    adminNotes: o.adminNotes ?? null,
    adminMessage: o.adminMessage ?? null,
    trackingNumber: o.trackingNumber ?? null,
    trackingNumbers: (o as any).trackingNumbers ?? null,
    shippingCarrier: o.shippingCarrier ?? null,
    carrierServiceRef: o.carrierServiceRef ?? null,
    paymentStatus: o.paymentStatus ?? "unpaid",
    paymentTxHash: o.paymentTxHash ?? null,
    paymentTxHashes: (o as any).paymentTxHashes ?? null,
    testPaymentTxHash: o.testPaymentTxHash ?? null,
    paymentTestAmount: o.paymentTestAmount != null ? parseFloat(String(o.paymentTestAmount)) : null,
    paymentScreenshot: o.paymentScreenshot ?? null,
    shippingName: o.shippingName ?? null,
    shippingAddress: o.shippingAddress ?? null,
    shippingPhone: o.shippingPhone ?? null,
    shippingEmail: o.shippingEmail ?? null,
    pin: o.pin ?? "0000",
    inpostQrCode: o.inpostQrCode ?? null,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
    paymentConfirmedAt: o.paymentConfirmedAt instanceof Date ? o.paymentConfirmedAt.toISOString() : (o.paymentConfirmedAt ?? null),
    paymentUsdAmount: o.paymentUsdAmount != null ? parseFloat(String(o.paymentUsdAmount)) : null,
    paymentCryptoCurrency: (o as any).paymentCryptoCurrency ?? null,
    amountDue: o.amountDue != null ? parseFloat(String(o.amountDue)) : 0,
    balancePaymentStatus: o.balancePaymentStatus ?? null,
    balanceTxHash: (o as any).balanceTxHash ?? null,
    balanceConfirmedAt: (o as any).balanceConfirmedAt instanceof Date ? (o as any).balanceConfirmedAt.toISOString() : ((o as any).balanceConfirmedAt ?? null),
    currency: o.currency ?? null,
    groupBuyId: o.groupBuyId ?? null,
    orderType: o.orderType ?? null,
    sharedOrderId: o.sharedOrderId ?? null,
    shippingCountry: o.shippingCountry ?? null,
    ipAddress: o.ipAddress ?? null,
    directShippingRequested: o.directShippingRequested ?? false,
    directShippingCost: o.directShippingCost != null ? parseFloat(String(o.directShippingCost)) : null,
    adminFee: o.adminFee != null ? parseFloat(String(o.adminFee)) : 0,
    adminFeeLabel: o.adminFeeLabel ?? null,
    requiresAddressOverride: (o as any).requiresAddressOverride ?? null,
    requiresQrCodeOverride: (o as any).requiresQrCodeOverride ?? null,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      productId: li.productId,
      productName: li.productName,
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      isOos: li.isOos ?? false,
    })),
  };
}

function normIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const t = ip.trim();
  if (!t || t === "unknown") return null;
  return /^::ffff:/i.test(t) ? t.slice(7) : t;
}

// ─── GET /api/admin/auth-check ───────────────────────────────
router.get("/admin/auth-check", (req, res): void => {
  const ip = (req.ip ?? req.socket?.remoteAddress ?? "unknown") as string;
  const passed = requireAdmin(req, res);
  if (!passed) {
    writeLog("login", "warn", "admin_login_failed",
      "Failed admin login attempt",
      { ip },
      ip,
    ).catch(() => {});
    return;
  }
  writeLog("login", "info", "admin_login_success",
    "Admin logged in successfully",
    { ip },
    ip,
  ).catch(() => {});
  res.json({ ok: true });
});

// GET /api/admin/search-users?q= — autocomplete: usernames starting with q
router.get("/admin/search-users", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const q = String(req.query["q"] ?? "").toLowerCase().trim().replace(/^@/, "");
  if (!q) { res.json([]); return; }
  const rows = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(ilike(accountsTable.telegramUsername, `${q}%`))
    .limit(6);
  res.json(rows.map(r => r.telegramUsername));
});

// GET /api/admin/check-user/:username — check if an account exists
router.get("/admin/check-user/:username", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = String(req.params["username"]).toLowerCase().trim().replace(/^@/, "");
  const [account] = await db
    .select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, username));
  res.json({ exists: !!account });
});

// ─── POST /api/admin/fs3-verify ──────────────────────────────
// Verifies the FS3-specific password (FS3_PASSWORD env var).
// Requires both admin secret AND the FS3 password.
router.post("/admin/fs3-verify", (req: any, res: any): void => {
  if (!requireAdmin(req, res)) return;

  const fs3Password = process.env["FS3_PASSWORD"];
  if (!fs3Password) {
    res.status(503).json({ error: "FS3 not configured" });
    return;
  }

  const provided = String(req.body?.password ?? "");
  if (!provided) {
    res.status(400).json({ error: "Password required" });
    return;
  }

  try {
    const bufA = Buffer.from(provided);
    const bufB = Buffer.from(fs3Password);
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, Buffer.alloc(bufA.length));
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    if (!timingSafeEqual(bufA, bufB)) {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  res.json({ ok: true });
});

// ─── GET /api/admin/orders ────────────────────────────────────
// Supports server-side filtering + pagination.
// Query params: groupBuyId, country, reshipper, status, paymentStatus, paymentMethod,
//   routingType, batchLocked, balanceDueReview, search, dateFrom, dateTo,
//   page (1-based, default 1), pageSize (default 100, max 500)
export async function adminOrdersHandler(req: Request, res: Response): Promise<void> {
  try {
  const {
    groupBuyId, country, reshipper, scopeType: scopeTypeQ,
    status: statusQ, paymentStatus: payStatusQ, paymentMethod: payMethodQ,
    routingType: routingTypeQ, batchLocked: batchLockedQ, balanceDueReview: balanceDueReviewQ,
    search: searchQ, dateFrom: dateFromQ, dateTo: dateToQ,
    page: pageQ, pageSize: pageSizeQ,
    wholesale: wholesaleQ,
    hasReshipper: hasReshipperQ,
    vendor: vendorQ,
    dispatchConfirmed: dispatchConfirmedQ,
    dispatchArchived: dispatchArchivedQ,
  } = req.query as Record<string, string | undefined>;

  const wholesaleMode = wholesaleQ === "true";
  const hasReshipperMode = hasReshipperQ === "true";
  const page = Math.max(1, parseInt(pageQ ?? "1") || 1);
  // For wholesale/reshipper modes, bypass the 500-row cap so all orders are returned
  const pageSize = (wholesaleMode || hasReshipperMode) ? 999999 : Math.min(500, Math.max(1, parseInt(pageSizeQ ?? "100") || 100));
  const offset = (wholesaleMode || hasReshipperMode) ? 0 : (page - 1) * pageSize;

  const conditions: any[] = [isNull(ordersTable.deletedAt)];
  if (groupBuyId) conditions.push(eq(ordersTable.groupBuyId, groupBuyId));

  // Status filter
  if (statusQ && statusQ !== "all") conditions.push(eq(ordersTable.status, statusQ));

  // Payment status filter
  if (payStatusQ && payStatusQ !== "all") {
    if (payStatusQ === "confirmed") {
      conditions.push(or(eq(ordersTable.paymentStatus, "confirmed"), eq(ordersTable.paymentStatus, "test_confirmed")));
    } else if (payStatusQ === "unpaid") {
      conditions.push(eq(ordersTable.paymentStatus, "unpaid"));
    } else if (payStatusQ === "pending") {
      conditions.push(eq(ordersTable.paymentStatus, "pending_confirmation"));
    } else if (payStatusQ === "rejected") {
      conditions.push(or(eq(ordersTable.paymentStatus, "rejected"), eq(ordersTable.paymentStatus, "failed")));
    } else {
      conditions.push(eq(ordersTable.paymentStatus, payStatusQ));
    }
  }

  // Payment method filter (applied in JS after since it's derived from txHash)
  // Routing type filter
  if (routingTypeQ && routingTypeQ !== "all") {
    if (routingTypeQ === "unrouted") {
      conditions.push(or(isNull(ordersTable.routingType), eq(ordersTable.routingType, "unrouted")));
    } else {
      conditions.push(eq(ordersTable.routingType, routingTypeQ));
    }
  }

  // Batch locked filter
  if (batchLockedQ === "true") conditions.push(eq(ordersTable.batchLocked, true));
  else if (batchLockedQ === "false") conditions.push(eq(ordersTable.batchLocked, false));

  // Dispatch confirmed filter — orders confirmed via Packing Slips dispatch flow.
  // Fall back to status-based check for orders confirmed before dispatchConfirmedAt was tracked.
  if (dispatchConfirmedQ === "true") conditions.push(
    or(
      isNotNull(ordersTable.dispatchConfirmedAt),
      inArray(ordersTable.status, ["Shipped", "Completed"]),
    ),
  );

  // Dispatch archived filter — orders moved to the archived tab in Dispatched Orders.
  if (dispatchArchivedQ === "true") conditions.push(isNotNull(ordersTable.dispatchArchivedAt));
  else if (dispatchArchivedQ === "false") conditions.push(isNull(ordersTable.dispatchArchivedAt));

  // Balance due review filter (amountDue > 0 and payment confirmed but balance not resolved)
  if (balanceDueReviewQ === "true") {
    conditions.push(
      and(
        gt(ordersTable.amountDue, "0"),
        or(eq(ordersTable.paymentStatus, "confirmed"), eq(ordersTable.paymentStatus, "test_confirmed")),
        or(isNull(ordersTable.balancePaymentStatus), sql`${ordersTable.balancePaymentStatus} NOT IN ('confirmed', 'waived')`)
      )
    );
  }

  // Date range filters
  if (dateFromQ) conditions.push(gte(ordersTable.createdAt, new Date(dateFromQ)));
  if (dateToQ) conditions.push(lte(ordersTable.createdAt, new Date(new Date(dateToQ).getTime() + 86399999)));

  // Search filter (DB-side for username, code, tracking, TX hash)
  if (searchQ && searchQ.trim()) {
    const q = searchQ.trim().toLowerCase();
    conditions.push(
      or(
        sql`lower(${ordersTable.telegramUsername}) like ${"%" + q + "%"}`,
        sql`lower(${ordersTable.code}) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.trackingNumber}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.paymentTxHash}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingName}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingCountry}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.reshipperUsername}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingEmail}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingPhone}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingAddress}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingCity}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingPostcode}, '')) like ${"%" + q + "%"}`,
      )
    );
  }

  // If filtering by reshipper: match via country leg assignments OR a direct reshipperUsername
  if (reshipper && scopeTypeQ === "reshipper") {
    // Reshipper-scoped surfaces (own dispatch view): strict ownership only —
    // orders attributed to or personally dispatched by this reshipper. Country
    // leg matching is intentionally NOT used here, so a reshipper never sees
    // orders other reshippers own/dispatched within the same leg.
    const normReshipper = reshipper.replace(/^@/, "").toLowerCase();
    conditions.push(
      or(
        sql`lower(replace(coalesce(${ordersTable.reshipperUsername}, ''), '@', '')) = ${normReshipper}`,
        sql`lower(replace(coalesce(${ordersTable.dispatchedByReshipper}, ''), '@', '')) = ${normReshipper}`,
      ),
    );
  } else if (reshipper) {
    const assignments = await db
      .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country })
      .from(gbReshippersTable)
      .where(eq(gbReshippersTable.reshipperUsername, reshipper));

    const directAssign = eq(ordersTable.reshipperUsername, reshipper);

    if (assignments.length === 0) {
      conditions.push(directAssign);
    } else {
      const uniqueGbIds = [...new Set(assignments.map(a => a.gbId))];
      const countryLegs = await db
        .select({ id: gbCountryLegsTable.id, gbId: gbCountryLegsTable.gbId, countryCode: gbCountryLegsTable.countryCode })
        .from(gbCountryLegsTable)
        .where(inArray(gbCountryLegsTable.gbId, uniqueGbIds));
      const legMap = new Map(countryLegs.map(l => [`${l.gbId}::${l.countryCode}`, l.id]));

      const pairConditions = assignments.map(a => {
        const legId = legMap.get(`${a.gbId}::${a.country}`);
        if (legId) return and(eq(ordersTable.groupBuyId, a.gbId), eq(ordersTable.countryLegId, legId));
        return and(eq(ordersTable.groupBuyId, a.gbId), eq(ordersTable.reshipperUsername, reshipper));
      });

      const legConditions = pairConditions.length === 1 ? pairConditions[0]! : or(...pairConditions as [any, any]);
      conditions.push(or(legConditions, directAssign));
    }
  }

  if (vendorQ) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM order_line_items oli JOIN products p ON oli.product_id = p.id WHERE oli.order_id = ${ordersTable.id} AND lower(p.vendor) = lower(${vendorQ}))`
    );
  }

  // hasReshipper mode: orders where reshipperUsername is directly set OR the order is in a
  // GB+country pair that has a reshipper assigned via the gbReshippers table
  if (hasReshipperMode) {
    const gbReshipperPairs = await db
      .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country })
      .from(gbReshippersTable);
    const directHasReshipper = isNotNull(ordersTable.reshipperUsername);
    if (gbReshipperPairs.length === 0) {
      conditions.push(directHasReshipper);
    } else {
      const gbPairConds = gbReshipperPairs.map(p =>
        and(eq(ordersTable.groupBuyId, p.gbId), eq(ordersTable.shippingCountry, p.country))
      );
      conditions.push(or(directHasReshipper, ...gbPairConds as [any, any, ...any[]]));
    }
  }

  const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions as [any, any]);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(ordersTable)
    .where(whereClause);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(whereClause)
    // Secondary keys keep shared-wholesale siblings (same createdAt) deterministically
    // adjacent so the admin list can merge them into one parent row reliably.
    .orderBy(desc(ordersTable.createdAt), ordersTable.sharedOrderId, ordersTable.code)
    .limit(pageSize)
    .offset(offset);

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

  const gbIds = [...new Set(orders.map((o) => o.groupBuyId).filter(Boolean))] as string[];
  const gbCurrencyMap = new Map<string, string | null>();
  const gbShippingOptionsMap = new Map<string, Array<{ id: string; requiresAddress?: boolean; requiresQrCode?: boolean }>>();
  if (gbIds.length > 0) {
    const gbRows = await db
      .select({ id: groupBuysTable.id, currency: groupBuysTable.currency, shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, gbIds));
    for (const row of gbRows) {
      gbCurrencyMap.set(row.id, row.currency ?? null);
      if (row.shippingOptions) {
        try { gbShippingOptionsMap.set(row.id, JSON.parse(row.shippingOptions)); } catch { /* ignore malformed JSON */ }
      }
    }
  }

  const reshipperMap = new Map<string, string>();
  const gbCountryPairs = orders
    .filter(o => o.groupBuyId && o.shippingCountry)
    .map(o => ({ gbId: o.groupBuyId!, country: o.shippingCountry! }));
  if (gbCountryPairs.length > 0) {
    const uniqueGbIds = [...new Set(gbCountryPairs.map(p => p.gbId))];
    const reshipperRows = await db
      .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country, reshipperUsername: gbReshippersTable.reshipperUsername })
      .from(gbReshippersTable)
      .where(inArray(gbReshippersTable.gbId, uniqueGbIds));
    for (const r of reshipperRows) reshipperMap.set(`${r.gbId}::${r.country}`, r.reshipperUsername);
  }

  // Shared-wholesale metadata: map each order's sharedOrderId -> lead (creator) + recipient
  // username so the admin list can merge a shared order's member rows under its lead.
  const sharedOrderIds = [...new Set(orders.map(o => o.sharedOrderId).filter(Boolean))] as string[];
  const shareMetaMap = new Map<string, { creatorUsername: string; deliveryUsername: string | null }>();
  if (sharedOrderIds.length > 0) {
    const shareRows = await db
      .select({
        id: wholesaleSharesTable.id,
        creatorUsername: wholesaleSharesTable.creatorUsername,
        deliveryUsername: wholesaleSharesTable.deliveryUsername,
      })
      .from(wholesaleSharesTable)
      .where(inArray(wholesaleSharesTable.id, sharedOrderIds));
    for (const s of shareRows) {
      shareMetaMap.set(s.id, { creatorUsername: s.creatorUsername, deliveryUsername: s.deliveryUsername ?? null });
    }
  }

  const orderUsernames = [...new Set(orders.map(o => o.telegramUsername).filter(Boolean))] as string[];
  const orderUsernamesBothForms = [...new Set(orderUsernames.flatMap(u => [u, u.startsWith("@") ? u.slice(1) : `@${u}`]))];
  const accountCountryMap = new Map<string, string>();
  const accountWholesaleMap = new Map<string, boolean>();
  if (orderUsernamesBothForms.length > 0) {
    const accountRows = await db
      .select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country, isWholesale: accountsTable.isWholesale })
      .from(accountsTable)
      .where(inArray(accountsTable.telegramUsername, orderUsernamesBothForms));
    for (const a of accountRows) {
      if (a.telegramUsername) {
        const u = a.telegramUsername;
        const alt = u.startsWith("@") ? u.slice(1) : `@${u}`;
        if (a.country) { accountCountryMap.set(u, a.country); accountCountryMap.set(alt, a.country); }
        if (a.isWholesale) { accountWholesaleMap.set(u, true); accountWholesaleMap.set(alt, true); }
      }
    }
  }

  const formatted = orders.map((o) => {
    const currency = o.groupBuyId ? (gbCurrencyMap.get(o.groupBuyId) ?? null) : null;
    // Only fall back to the gbReshippers leg lookup when:
    //  • no direct reshipperUsername is set, AND
    //  • the admin hasn't explicitly cleared the reshipper (reshipperCleared=true)
    const reshipperUsername = o.reshipperUsername
      ?? ((!o.reshipperCleared && o.groupBuyId && o.shippingCountry)
        ? (reshipperMap.get(`${o.groupBuyId}::${o.shippingCountry}`) ?? null)
        : null);
    const accountCountry = accountCountryMap.get(o.telegramUsername) ?? null;
    // Shared wholesale orders (orderType "wholesale_shared") are wholesale too, so
    // the whole order surfaces in the FS3 tab + Wholesale order view.
    const isWholesale = o.orderType === "wholesale" || o.orderType === "wholesale_shared";
    // Compute warning flags
    const missingAddress = !o.shippingAddress && !o.inpostQrCode && !o.royalMailQrCode;
    const hasUnresolvedBalance = parseFloat(String(o.amountDue ?? "0")) > 0 &&
      !["confirmed", "waived"].includes(o.balancePaymentStatus ?? "");
    const needsBalanceDueReview = hasUnresolvedBalance &&
      (o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed");
    const hasDraft = !!o.draftLineItems;
    const shareMeta = o.sharedOrderId ? shareMetaMap.get(o.sharedOrderId) : null;
    // Effective address / QR requirement: shipping-option default, overridden by any per-order admin flag.
    const shOpts = o.groupBuyId ? gbShippingOptionsMap.get(o.groupBuyId) : null;
    const matchedShOpt = (shOpts && o.deliveryMethodId) ? shOpts.find(opt => opt.id === o.deliveryMethodId) : null;
    const shippingOptionRequiresAddress = matchedShOpt?.requiresAddress ?? false;
    const shippingOptionRequiresQrCode = matchedShOpt?.requiresQrCode ?? false;
    let customShippingRequiresAddress = shippingOptionRequiresAddress;
    let customShippingRequiresQrCode = shippingOptionRequiresQrCode;
    if (o.requiresAddressOverride != null) customShippingRequiresAddress = o.requiresAddressOverride;
    if (o.requiresQrCodeOverride != null) customShippingRequiresQrCode = o.requiresQrCodeOverride;
    return {
      ...fmtOrder({ ...o, currency } as unknown as Record<string, any>, (liByOrder.get(o.id) ?? []) as unknown as Record<string, any>[]),
      reshipperUsername, accountCountry, isWholesale,
      missingAddress, hasUnresolvedBalance, needsBalanceDueReview, hasDraft,
      customShippingRequiresAddress, customShippingRequiresQrCode,
      shippingOptionRequiresAddress, shippingOptionRequiresQrCode,
      draftLineItems: o.draftLineItems ?? null,
      draftLineItemsSavedAt: o.draftLineItemsSavedAt?.toISOString() ?? null,
      sharedOrderCreator: shareMeta?.creatorUsername ?? null,
      sharedOrderRecipient: shareMeta?.deliveryUsername ?? null,
    };
  });

  // Apply JS-based country filter (normalizes both ISO codes and full country names)
  let countryFiltered = formatted;
  if (country && country !== "all") {
    const countries = country.split(",").map(c => c.trim()).filter(Boolean);
    if (countries.length > 0) {
      countryFiltered = formatted.filter(o => {
        const shipNorm = normalizeCountry((o as any).shippingCountry ?? "");
        if (shipNorm && countries.includes(shipNorm)) return true;
        const acctNorm = normalizeCountry((o as any).accountCountry ?? "");
        return !!(acctNorm && countries.includes(acctNorm));
      });
    }
  }

  // Apply JS-based wholesale filter
  if (wholesaleMode) {
    countryFiltered = countryFiltered.filter(o => (o as any).isWholesale === true);
  }

  // Apply JS-based payment method filter (derived from txHash prefix)
  if (payMethodQ && payMethodQ !== "all") {
    const deriveMethod = (txHash: string | null | undefined) => {
      if (!txHash) return "manual";
      if (txHash.startsWith("anonpay:")) return "anonpay";
      if (txHash === "fiat:revolut") return "revolut";
      if (txHash === "fiat:paypal") return "paypal";
      return "manual";
    };
    countryFiltered = countryFiltered.filter(o => deriveMethod((o as any).paymentTxHash) === payMethodQ);
  }

  console.log(`[admin:orders] serving ${countryFiltered.length}/${Number(total)} order(s) page=${page} pageSize=${pageSize}`);

  const geoMap = await Promise.race([
    enrichIpsFromCache(countryFiltered.map(o => o.ipAddress)),
    new Promise<Map<string, {country: string|null, city: string|null}>>((resolve) =>
      setTimeout(() => resolve(new Map()), 2000)
    ),
  ]);
  enrichIps(countryFiltered.map(o => o.ipAddress)).catch(() => {});

  res.json({
    orders: countryFiltered.map(o => {
      const key = normIp(o.ipAddress);
      const geo = key ? (geoMap.get(key) ?? { country: null, city: null }) : { country: null, city: null };
      const { paymentScreenshot, ...rest } = o as any;
      return {
        ...rest,
        hasPaymentScreenshot: paymentScreenshot !== null && paymentScreenshot !== undefined,
        geoCity: (geo as any).city ?? null,
        geoCountry: (geo as any).country ?? null,
      };
    }),
    pagination: {
      page,
      pageSize,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / pageSize),
    },
  });
  } catch (err) {
    console.error("[admin] GET /admin/orders error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to load orders" });
  }
}

router.get("/admin/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await adminOrdersHandler(req, res);
});

// ─── GET /api/admin/orders/ids — return all matching IDs (for select-all across pages) ─
router.get("/admin/orders/ids", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const {
      groupBuyId, country, reshipper,
      status: statusQ, paymentStatus: payStatusQ,
      routingType: routingTypeQ, batchLocked: batchLockedQ, balanceDueReview: balanceDueReviewQ,
      search: searchQ, dateFrom: dateFromQ, dateTo: dateToQ,
      vendor: vendorQ,
    } = req.query as Record<string, string | undefined>;

    const conditions: any[] = [isNull(ordersTable.deletedAt)];
    if (groupBuyId) conditions.push(eq(ordersTable.groupBuyId, groupBuyId));
    if (statusQ && statusQ !== "all") conditions.push(eq(ordersTable.status, statusQ));
    if (payStatusQ && payStatusQ !== "all") {
      if (payStatusQ === "confirmed") conditions.push(or(eq(ordersTable.paymentStatus, "confirmed"), eq(ordersTable.paymentStatus, "test_confirmed")));
      else if (payStatusQ === "unpaid") conditions.push(eq(ordersTable.paymentStatus, "unpaid"));
      else if (payStatusQ === "pending") conditions.push(eq(ordersTable.paymentStatus, "pending_confirmation"));
      else if (payStatusQ === "rejected") conditions.push(or(eq(ordersTable.paymentStatus, "rejected"), eq(ordersTable.paymentStatus, "failed")));
      else conditions.push(eq(ordersTable.paymentStatus, payStatusQ));
    }
    if (routingTypeQ && routingTypeQ !== "all") {
      if (routingTypeQ === "unrouted") conditions.push(or(isNull(ordersTable.routingType), eq(ordersTable.routingType, "unrouted")));
      else conditions.push(eq(ordersTable.routingType, routingTypeQ));
    }
    if (batchLockedQ === "true") conditions.push(eq(ordersTable.batchLocked, true));
    else if (batchLockedQ === "false") conditions.push(eq(ordersTable.batchLocked, false));
    if (balanceDueReviewQ === "true") {
      conditions.push(and(
        gt(ordersTable.amountDue, "0"),
        or(eq(ordersTable.paymentStatus, "confirmed"), eq(ordersTable.paymentStatus, "test_confirmed")),
        or(isNull(ordersTable.balancePaymentStatus), sql`${ordersTable.balancePaymentStatus} NOT IN ('confirmed', 'waived')`)
      ));
    }
    if (dateFromQ) conditions.push(gte(ordersTable.createdAt, new Date(dateFromQ)));
    if (dateToQ) conditions.push(lte(ordersTable.createdAt, new Date(new Date(dateToQ).getTime() + 86399999)));
    if (searchQ && searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      conditions.push(or(
        sql`lower(${ordersTable.telegramUsername}) like ${"%" + q + "%"}`,
        sql`lower(${ordersTable.code}) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.trackingNumber}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.paymentTxHash}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingName}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingCountry}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.reshipperUsername}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingEmail}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingPhone}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingAddress}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingCity}, '')) like ${"%" + q + "%"}`,
        sql`lower(coalesce(${ordersTable.shippingPostcode}, '')) like ${"%" + q + "%"}`,
      ));
    }
    if (reshipper) {
      const assignments = await db
        .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country })
        .from(gbReshippersTable)
        .where(eq(gbReshippersTable.reshipperUsername, reshipper));
      const directAssign = eq(ordersTable.reshipperUsername, reshipper);
      if (assignments.length === 0) {
        conditions.push(directAssign);
      } else {
        const uniqueGbIds = [...new Set(assignments.map(a => a.gbId))];
        const countryLegs = await db
          .select({ id: gbCountryLegsTable.id, gbId: gbCountryLegsTable.gbId, countryCode: gbCountryLegsTable.countryCode })
          .from(gbCountryLegsTable)
          .where(inArray(gbCountryLegsTable.gbId, uniqueGbIds));
        const legMap = new Map(countryLegs.map(l => [`${l.gbId}::${l.countryCode}`, l.id]));
        const pairConditions = assignments.map(a => {
          const legId = legMap.get(`${a.gbId}::${a.country}`);
          if (legId) return and(eq(ordersTable.groupBuyId, a.gbId), eq(ordersTable.countryLegId, legId));
          return and(eq(ordersTable.groupBuyId, a.gbId), eq(ordersTable.reshipperUsername, reshipper));
        });
        const legConditions = pairConditions.length === 1 ? pairConditions[0]! : or(...pairConditions as [any, any]);
        conditions.push(or(legConditions, directAssign));
      }
    }

    if (vendorQ) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM order_line_items oli JOIN products p ON oli.product_id = p.id WHERE oli.order_id = ${ordersTable.id} AND lower(p.vendor) = lower(${vendorQ}))`
      );
    }

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions as [any, any]);
    const rows = await db
      .select({ id: ordersTable.id, shippingCountry: ordersTable.shippingCountry, telegramUsername: ordersTable.telegramUsername })
      .from(ordersTable)
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt));

    // JS-side country filter (mirrors main orders endpoint — checks shippingCountry + accountCountry)
    let result = rows;
    if (country && country !== "all") {
      const countries = country.split(",").map((c: string) => normalizeCountry(c.trim())).filter(Boolean);
      if (countries.length > 0) {
        const usernames = [...new Set(rows.map(r => r.telegramUsername))];
        const usernamesBothForms = [...new Set(usernames.flatMap(u => [u, u.startsWith("@") ? u.slice(1) : `@${u}`]))];
        const accountCountryMap = new Map<string, string>();
        if (usernamesBothForms.length > 0) {
          const accs = await db
            .select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country })
            .from(accountsTable)
            .where(inArray(accountsTable.telegramUsername, usernamesBothForms));
          for (const a of accs) {
            if (a.telegramUsername && a.country) {
              const u = a.telegramUsername;
              const alt = u.startsWith("@") ? u.slice(1) : `@${u}`;
              accountCountryMap.set(u, a.country);
              accountCountryMap.set(alt, a.country);
            }
          }
        }
        result = rows.filter(r => {
          const shipNorm = normalizeCountry(r.shippingCountry ?? "");
          if (shipNorm && countries.includes(shipNorm)) return true;
          const acctNorm = normalizeCountry(accountCountryMap.get(r.telegramUsername) ?? "");
          return !!(acctNorm && countries.includes(acctNorm));
        });
      }
    }

    res.json({ ids: result.map(r => r.id) });
  } catch (err) {
    console.error("[admin] GET /admin/orders/ids error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to load order IDs" });
  }
});

// ─── GET /api/admin/orders/trash ─────────────────────────────
// Returns soft-deleted orders within the 2-day restore window (youngest first)
router.get("/admin/orders/trash", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(isNotNull(ordersTable.deletedAt), gt(ordersTable.deletedAt, cutoff)))
    .orderBy(desc(ordersTable.deletedAt));
  const orderIds = orders.map(o => o.id);
  const lineItems = orderIds.length > 0
    ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];

  // Fetch GB currencies for orders that belong to a group buy
  const gbIds = [...new Set(orders.map(o => o.groupBuyId).filter(Boolean))] as string[];
  const gbCurrencies: Record<string, string> = {};
  if (gbIds.length > 0) {
    const gbs = await db
      .select({ id: groupBuysTable.id, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, gbIds));
    for (const gb of gbs) gbCurrencies[gb.id] = gb.currency;
  }

  res.json(orders.map(o => ({
    ...o,
    currency: o.groupBuyId ? (gbCurrencies[o.groupBuyId] ?? "GBP") : "GBP",
    lineItems: lineItems.filter(li => li.orderId === o.id),
    expiresAt: new Date(new Date(o.deletedAt!).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  })));
});

// ─── POST /api/admin/orders/:id/restore ──────────────────────
router.post("/admin/orders/:id/restore", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, req.params.id), isNotNull(ordersTable.deletedAt)));
  if (!order) {
    res.status(404).json({ error: "Deleted order not found" });
    return;
  }
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  if (order.deletedAt! < cutoff) {
    res.status(410).json({ error: "Restore window has expired for this order" });
    return;
  }
  await db.update(ordersTable)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(ordersTable.id, req.params.id));
  writeLog("order", "info", "order_restored_by_admin",
    `Admin restored order ${order.code} (${order.telegramUsername}) — previously deleted by ${order.deletedBy ?? "unknown"}`,
    { orderId: order.id, code: order.code, telegramUsername: order.telegramUsername, previousDeletedBy: order.deletedBy },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});
  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.restored",
    entityId: order.id,
    actorType: "admin",
    actorUsername: getAdminUsername(res),
    metadata: { code: order.code, status: order.status, grandTotal: order.grandTotal },
  }).catch(() => {});
  res.json({ ok: true, order: { id: order.id, code: order.code } });
});

// ─── GET /api/admin/orders/:id ────────────────────────────────
router.get("/admin/orders/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  let currency: string | null = null;
  if (order.groupBuyId) {
    const [gbRow] = await db
      .select({ currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    currency = gbRow?.currency ?? null;
  }

  const fmt = fmtOrder({ ...order, currency } as unknown as Record<string, any>, lineItems as unknown as Record<string, any>[]);
  const geoMap = await enrichIps([fmt.ipAddress]);
  const key = normIp(fmt.ipAddress);
  const geo = key ? (geoMap.get(key) ?? { country: null, city: null }) : { country: null, city: null };
  res.json({ ...fmt, geoCity: geo.city ?? null, geoCountry: geo.country ?? null });
});

// ─── POST /api/admin/orders — admin creates a new order ──────
router.post("/admin/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const {
    telegramUsername,
    deliveryMethodId,
    pin: clientPin,
    vendorShipping: clientVendorShipping = 0,
    customShipping: clientCustomShipping,
    tip: clientTip = 0,
    notes,
    status: clientStatus,
    lineItems: clientLineItems,
    groupBuyId: clientGroupBuyId,
  } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "telegramUsername is required" });
    return;
  }

  const customShipping = clientCustomShipping !== undefined && clientCustomShipping !== ""
    ? Math.max(0, parseFloat(String(clientCustomShipping)) || 0)
    : undefined;
  const useCustomShipping = customShipping !== undefined;

  if (!useCustomShipping && (!deliveryMethodId || typeof deliveryMethodId !== "string")) {
    res.status(400).json({ error: "deliveryMethodId is required (or provide customShipping)" });
    return;
  }
  if (!Array.isArray(clientLineItems) || clientLineItems.length === 0) {
    res.status(400).json({ error: "At least one line item is required" });
    return;
  }

  const tg = telegramUsername.trim().startsWith("@")
    ? telegramUsername.trim()
    : `@${telegramUsername.trim()}`;

  let effectiveDeliveryMethodId = "";
  let effectiveDeliveryMethodName = "Custom";
  let deliveryPrice = customShipping ?? 0;

  if (!useCustomShipping) {
    const [deliveryMethod] = await db
      .select()
      .from(deliveryMethodsTable)
      .where(eq(deliveryMethodsTable.id, deliveryMethodId));

    if (!deliveryMethod) {
      res.status(400).json({ error: "Invalid delivery method" });
      return;
    }
    effectiveDeliveryMethodId = deliveryMethodId;
    effectiveDeliveryMethodName = deliveryMethod.name;
    deliveryPrice = parseFloat(String(deliveryMethod.price));
  }

  const VALID_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
  const status = clientStatus && VALID_STATUSES.includes(String(clientStatus))
    ? String(clientStatus)
    : "Submitted";

  const pin = clientPin && /^\d{4}$/.test(String(clientPin)) ? String(clientPin) : "0000";
  const vendorShipping = Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  const tip = Math.min(20, Math.max(0, parseFloat(String(clientTip)) || 0));

  // Build line items
  const lineItems = (clientLineItems as any[])
    .filter(li => li.productName && parseFloat(String(li.quantity)) > 0)
    .slice(0, 50)
    .map(li => ({
      productName: String(li.productName).trim().slice(0, 200),
      quantity: Math.max(0.5, parseFloat(String(li.quantity))),
      unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
    }));

  if (lineItems.length === 0) {
    res.status(400).json({ error: "At least one valid line item is required" });
    return;
  }

  const productSubtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const grandTotal = productSubtotal + deliveryPrice + vendorShipping + tip;

  const orderId = randomUUID();
  const code = String(Math.floor(1000 + Math.random() * 9000));

  await db.insert(ordersTable).values({
    id: orderId,
    code,
    telegramUsername: tg,
    status: status as any,
    deliveryMethodId: effectiveDeliveryMethodId,
    deliveryMethod: effectiveDeliveryMethodName,
    deliveryPrice: deliveryPrice.toFixed(2) as any,
    vendorShipping: vendorShipping.toFixed(2) as any,
    tip: tip.toFixed(2) as any,
    productSubtotal: productSubtotal.toFixed(2) as any,
    grandTotal: grandTotal.toFixed(2) as any,
    notes: notes ? String(notes).slice(0, 1000) : null,
    pin,
    groupBuyId: clientGroupBuyId ? String(clientGroupBuyId) : null,
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

  const [created] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const createdItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "order",
    eventType: "order.created",
    entityId: orderId,
    actorType: "admin",
    actorUsername: getAdminUsername(res),
    metadata: {
      code,
      grandTotal: grandTotal.toFixed(2),
      deliveryMethod: effectiveDeliveryMethodName,
      status,
      lineItems: lineItems.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: (li.quantity * li.unitPrice).toFixed(2),
      })),
    },
  }).catch(() => {});

  res.status(201).json(fmtOrder(created as unknown as Record<string, any>, createdItems as unknown as Record<string, any>[]));
});

// ─── PATCH /api/admin/orders/:id ─────────────────────────────
// Update status, vendorShipping, trackingNumber, adminNotes independently
router.patch("/admin/orders/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { status, vendorShipping, trackingNumber, trackingNumbers, adminNotes, adminMessage, telegramUsername, paymentStatus, paymentTxHash, paymentTxHashes, paymentUsdAmount, pin, refundStatus, refundReason, clearBalance, shippingName, shippingAddress, directShippingRequested, deliveryMethod, deliveryPrice, amountDue, adminFee, adminFeeLabel, requiresAddressOverride, requiresQrCodeOverride } = req.body;

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const VALID_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
  const VALID_PAYMENT_STATUSES = ["unpaid", "test_ready", "test_confirmed", "pending_confirmation", "confirmed", "failed", "rejected"];

  const updates: Record<string, any> = {};

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(String(status))) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }
    updates.status = String(status);
  }
  if (telegramUsername !== undefined) {
    const tg = String(telegramUsername).trim().slice(0, 100);
    if (!tg) { res.status(400).json({ error: "telegramUsername cannot be empty" }); return; }
    updates.telegramUsername = tg;
  }
  if (adminNotes !== undefined) {
    updates.adminNotes = adminNotes ? String(adminNotes).slice(0, 2000) : null;
  }
  if (adminMessage !== undefined) {
    updates.adminMessage = adminMessage ? String(adminMessage).slice(0, 1000) : null;
  }
  if (trackingNumbers !== undefined) {
    const cleaned = Array.isArray(trackingNumbers)
      ? (trackingNumbers as unknown[]).filter(v => typeof v === "string" && (v as string).trim()).map(v => (v as string).trim().slice(0, 200)).slice(0, 20)
      : [];
    updates.trackingNumbers = cleaned.length ? cleaned : null;
    updates.trackingNumber = cleaned[0] ?? null;
  } else if (trackingNumber !== undefined) {
    updates.trackingNumber = trackingNumber ? String(trackingNumber).slice(0, 200).trim() : null;
  }
  // Auto-advance to Shipped when a tracking number is set and the order isn't already Shipped/Completed
  const incomingTracking = updates.trackingNumber ?? (Array.isArray(updates.trackingNumbers) ? updates.trackingNumbers?.[0] : undefined);
  if (incomingTracking && !["Shipped", "Completed"].includes(existing.status ?? "")) {
    updates.status = "Shipped";
  }
  if (paymentStatus !== undefined) {
    if (!VALID_PAYMENT_STATUSES.includes(String(paymentStatus))) {
      res.status(400).json({ error: "Invalid paymentStatus value" });
      return;
    }
    updates.paymentStatus = String(paymentStatus);
    if (String(paymentStatus) === "confirmed" && existing.paymentStatus !== "confirmed") {
      updates.paymentConfirmedAt = new Date();
      // Clear any outstanding balance that was set while the order was in test_confirmed state
      // (VS added mid-payment flow). The confirmed payment covers the full grand total.
      updates.amountDue = "0.00";
    }
  }
  if (paymentTxHashes !== undefined) {
    const cleaned = Array.isArray(paymentTxHashes)
      ? (paymentTxHashes as unknown[]).filter(v => typeof v === "string" && (v as string).trim()).map(v => (v as string).trim().slice(0, 500)).slice(0, 20)
      : [];
    updates.paymentTxHashes = cleaned.length ? cleaned : null;
    updates.paymentTxHash = cleaned[0] ?? null;
  } else if (paymentTxHash !== undefined) {
    updates.paymentTxHash = paymentTxHash ? String(paymentTxHash).trim().slice(0, 500) : null;
  }
  if (paymentUsdAmount !== undefined) {
    const amt = parseFloat(String(paymentUsdAmount));
    updates.paymentUsdAmount = isNaN(amt) ? null : amt.toFixed(2);
  }
  if (pin !== undefined && /^\d{4}$/.test(String(pin))) updates.pin = String(pin);
  if (refundStatus !== undefined) {
    updates.refundStatus = refundStatus || null;
    if (refundStatus && !existing.refundStatus) updates.refundedAt = new Date();
    else if (!refundStatus) updates.refundedAt = null;
  }
  if (refundReason !== undefined) updates.refundReason = refundReason || null;
  if (shippingName !== undefined) updates.shippingName = shippingName ? String(shippingName).trim().slice(0, 200) : null;
  if (shippingAddress !== undefined) updates.shippingAddress = shippingAddress ? String(shippingAddress).trim().slice(0, 1000) : null;
  // Per-order override of the shipping option's address / QR requirement.
  // null clears the override (inherit shipping option default); true/false forces it.
  if (requiresAddressOverride !== undefined) {
    updates.requiresAddressOverride = requiresAddressOverride === null ? null : Boolean(requiresAddressOverride);
  }
  if (requiresQrCodeOverride !== undefined) {
    updates.requiresQrCodeOverride = requiresQrCodeOverride === null ? null : Boolean(requiresQrCodeOverride);
  }
  if (directShippingRequested !== undefined) {
    const next = Boolean(directShippingRequested);
    updates.directShippingRequested = next;
    // Recalculate grand total: add or remove the stored directShippingCost
    const storedDsc = existing.directShippingCost != null ? parseFloat(String(existing.directShippingCost)) : 0;
    const productSubtotalDs = parseFloat(String(existing.productSubtotal ?? "0"));
    const deliveryPriceDs = parseFloat(String(existing.deliveryPrice ?? "0"));
    const vsDs = parseFloat(String(existing.vendorShipping ?? "0"));
    const tipDs = parseFloat(String(existing.tip ?? "0"));
    const tcDs = parseFloat(String(existing.testingContribution ?? "0"));
    const couponDs = parseFloat(String(existing.couponDiscount ?? "0"));
    const afDs = parseFloat(String(existing.adminFee ?? "0"));
    const caDs = parseFloat(String(existing.creditsApplied ?? "0"));
    if (next) {
      // Turning ON: add the directShippingCost (already stored from customer's request), zero vendorShipping
      updates.vendorShipping = "0.00";
      updates.grandTotal = Math.max(0, productSubtotalDs + deliveryPriceDs + storedDsc + tipDs + tcDs + afDs - couponDs - caDs).toFixed(2);
    } else {
      // Turning OFF: remove directShippingCost, clear it
      updates.directShippingCost = null;
      updates.grandTotal = Math.max(0, productSubtotalDs + deliveryPriceDs + vsDs + tipDs + tcDs + afDs - couponDs - caDs).toFixed(2);
    }
  }
  if (deliveryMethod !== undefined) {
    updates.deliveryMethod = String(deliveryMethod).slice(0, 200);
  }
  if (deliveryPrice !== undefined) {
    const dp = parseFloat(String(deliveryPrice));
    if (isNaN(dp) || dp < 0) {
      res.status(400).json({ error: "deliveryPrice must be a non-negative number" }); return;
    }
    updates.deliveryPrice = dp.toFixed(2);
    // Recalculate grand total with new delivery price
    const productSubtotalDp = parseFloat(String(existing.productSubtotal ?? "0"));
    const vsDp = parseFloat(String((updates.vendorShipping as string | undefined) ?? existing.vendorShipping ?? "0"));
    const tipDp = parseFloat(String(existing.tip ?? "0"));
    const tcDp = parseFloat(String(existing.testingContribution ?? "0"));
    const couponDp = parseFloat(String(existing.couponDiscount ?? "0"));
    const afDp = parseFloat(String(existing.adminFee ?? "0"));
    const caDp = parseFloat(String(existing.creditsApplied ?? "0"));
    const dscDp = existing.directShippingRequested && existing.directShippingCost != null
      ? parseFloat(String(existing.directShippingCost)) : 0;
    updates.grandTotal = Math.max(0, productSubtotalDp + dp + vsDp + dscDp + tipDp + tcDp + afDp - couponDp - caDp).toFixed(2);
  }

  if (vendorShipping !== undefined) {
    const vs = parseFloat(String(vendorShipping));
    if (isNaN(vs) || vs < 0) {
      res.status(400).json({ error: "vendorShipping must be a non-negative number" });
      return;
    }
    updates.vendorShipping = vs.toFixed(2);
    // Recalculate grand total
    const productSubtotal = parseFloat(String(existing.productSubtotal));
    const deliveryPrice = parseFloat(String(existing.deliveryPrice ?? "0"));
    const tip = parseFloat(String(existing.tip ?? "0"));
    const testingContribution = parseFloat(String(existing.testingContribution ?? "0"));
    const couponDiscount = parseFloat(String(existing.couponDiscount ?? "0"));
    const afVs = parseFloat(String(existing.adminFee ?? "0"));
    const caVs = parseFloat(String(existing.creditsApplied ?? "0"));
    updates.grandTotal = Math.max(0, productSubtotal + deliveryPrice + vs + tip + testingContribution + afVs - couponDiscount - caVs).toFixed(2);
    // If the order was already fully confirmed, the vendor shipping is an outstanding balance the
    // customer still needs to pay. Set amountDue so BalanceDueCard is shown to them.
    // NOTE: test_confirmed is NOT treated as fully paid — the customer is still completing
    // their two-step crypto payment and the grand total (now including VS) will be verified.
    const alreadyPaid = existing.paymentStatus === "confirmed";
    const balanceAlreadySettled = ["confirmed", "waived"].includes((existing as any).balancePaymentStatus ?? "");
    if (alreadyPaid && !balanceAlreadySettled) {
      const newGrandTotal = parseFloat(updates.grandTotal as string);
      const paidAmount = parseFloat(String((existing as any).paymentUsdAmount ?? "0"));
      // If paidAmount is 0/null the order was manually confirmed without a recorded payment figure —
      // the admin already verified it was paid in full, so never create a spurious balance.
      // Otherwise: payment covers the total if it is within 4% under (crypto rounding) or any amount over.
      const paymentCoversTotal = paidAmount === 0 || paidAmount >= newGrandTotal * 0.96;
      updates.amountDue = (vs > 0 && !paymentCoversTotal) ? vs.toFixed(2) : "0.00";
      // If vendor shipping is being cleared, reset any pending balance payment state too
      if (vs === 0) updates.balancePaymentStatus = null;
    }
  }

  if (adminFee !== undefined) {
    const fee = parseFloat(String(adminFee));
    if (isNaN(fee) || fee < 0) {
      res.status(400).json({ error: "adminFee must be a non-negative number" }); return;
    }
    updates.adminFee = fee.toFixed(2);
    if (adminFeeLabel !== undefined) updates.adminFeeLabel = adminFeeLabel || null;
    // Recalculate grand total with the new admin fee
    const psAf = parseFloat(String(existing.productSubtotal ?? "0"));
    const dpAf = parseFloat(String(existing.deliveryPrice ?? "0"));
    const vsAf = parseFloat(String(existing.vendorShipping ?? "0"));
    const tipAf = parseFloat(String(existing.tip ?? "0"));
    const tcAf = parseFloat(String(existing.testingContribution ?? "0"));
    const cdAf = parseFloat(String(existing.couponDiscount ?? "0"));
    const caAf = parseFloat(String(existing.creditsApplied ?? "0"));
    const dscAf = existing.directShippingRequested && existing.directShippingCost != null
      ? parseFloat(String(existing.directShippingCost)) : 0;
    updates.grandTotal = Math.max(0, psAf + dpAf + vsAf + dscAf + tipAf + tcAf + fee - cdAf - caAf).toFixed(2);
  }

  // Allow admin to manually clear an outstanding balance (e.g. when VS was set during
  // test_confirmed state but the customer's full payment already covered it)
  if (clearBalance === true) {
    updates.amountDue = "0.00";
    updates.balancePaymentStatus = "waived";
  }

  // Allow admin to directly set the outstanding balance amount
  if (amountDue !== undefined) {
    const amt = parseFloat(String(amountDue));
    if (isNaN(amt) || amt < 0) {
      res.status(400).json({ error: "amountDue must be a non-negative number" });
      return;
    }
    updates.amountDue = amt.toFixed(2);
    if (amt > 0) {
      // Reset balance payment state so the customer sees the "You owe" prompt again
      updates.balancePaymentStatus = null;
      updates.balanceTxHash = null;
    } else {
      // Setting to zero — treat as waived
      updates.balancePaymentStatus = "waived";
    }
  }

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, req.params.id));

  const changedFields = Object.keys(updates).filter(f => f !== "grandTotal");
  const FIELD_LABELS: Record<string, string> = {
    status: "Status",
    paymentStatus: "Payment",
    trackingNumber: "Tracking",
    adminNotes: "Admin notes",
    adminMessage: "Admin message",
    vendorShipping: "Vendor shipping",
    telegramUsername: "Customer",
    pin: "PIN",
  };
  const before: Record<string, any> = {};
  const logParts = changedFields.map(f => {
    const label = FIELD_LABELS[f] ?? f;
    const oldVal = (existing as any)[f];
    const newVal = updates[f];
    before[f] = oldVal;
    const oldStr = oldVal == null || oldVal === "" ? "—" : String(oldVal);
    const newStr = newVal == null || newVal === "" ? "—" : String(newVal);
    return `${label}: "${oldStr}" → "${newStr}"`;
  });
  if (updates.grandTotal !== undefined) {
    logParts.push(`Grand total recalculated: £${updates.grandTotal}`);
  }
  writeLog("order", "info", "order_updated_by_admin",
    `Order ${existing.code} (${existing.telegramUsername}): ${logParts.join("; ")}`,
    { orderId: existing.id, code: existing.code, telegramUsername: existing.telegramUsername, before, after: updates },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  // Derive a specific event type when the status change carries semantic meaning
  const newStatus = updates.status as string | undefined;
  const newPaymentStatus = (updates.paymentStatus as string | undefined ?? "").toLowerCase();
  let orderEventType = "order.updated";
  if (newStatus && newStatus !== (existing.status ?? "")) {
    if (newStatus.toLowerCase().includes("cancel")) orderEventType = "order.cancelled";
    else if (newStatus.toLowerCase().includes("refund")) orderEventType = "order.refund_processed";
    else orderEventType = "order.status_changed";
  } else if (changedFields.includes("paymentStatus")) {
    if (newPaymentStatus.includes("approv") || newPaymentStatus.includes("paid") || newPaymentStatus.includes("complet") || newPaymentStatus === "confirmed") {
      orderEventType = "order.payment_approved";
    } else if (newPaymentStatus.includes("refund")) {
      orderEventType = "order.refund_processed";
    } else if (newPaymentStatus.includes("fail") || newPaymentStatus.includes("reject") || newPaymentStatus.includes("declin")) {
      orderEventType = "order.payment_rejected";
    } else {
      orderEventType = "order.status_changed";
    }
  } else if (changedFields.includes("trackingNumber") || changedFields.includes("trackingNumbers") || changedFields.includes("shippingProvider")) {
    orderEventType = "order.tracking_added";
  } else if (changedFields.includes("adminMessage")) {
    orderEventType = "order.admin_message_sent";
  } else if (changedFields.includes("adminNotes")) {
    orderEventType = "order.admin_notes_updated";
  }

  logCustomerActivity({
    telegramUsername: existing.telegramUsername,
    eventCategory: "order",
    eventType: orderEventType,
    entityId: existing.id,
    actorType: "admin",
    actorUsername: getAdminUsername(res),
    metadata: {
      code: existing.code,
      changedFields,
      before,
      after: updates,
    },
  }).catch(() => {});

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";

  let patchGbName = "";
  let patchGbOrganiser = "";
  let patchGbCurrency: string | null = null;
  let patchGbShippingOptions: Array<{ id: string; requiresAddress?: boolean; requiresQrCode?: boolean }> | null = null;
  if (existing.groupBuyId) {
    const [patchGbRow] = await db
      .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, currency: groupBuysTable.currency, shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, existing.groupBuyId));
    if (patchGbRow) {
      patchGbName = patchGbRow.name;
      patchGbOrganiser = patchGbRow.organiserId ? `@${patchGbRow.organiserId}` : "Admin";
      patchGbCurrency = patchGbRow.currency ?? null;
      if (patchGbRow.shippingOptions) {
        try { patchGbShippingOptions = JSON.parse(patchGbRow.shippingOptions); } catch { /* ignore malformed JSON */ }
      }
    }
  }

  const patchSym = patchGbCurrency === "GBP" ? "£" : "$";

  const patchGbContext = patchGbName
    ? `\nGB: <b>${escapeHtml(patchGbName)}</b>\nOrganiser: ${escapeHtml(patchGbOrganiser)}`
    : "";
  const patchPaidLabel = (updates.paymentStatus ?? existing.paymentStatus) === "confirmed" ? "Paid" : "Unpaid";
  const patchGrandTotal = updates.grandTotal ?? existing.grandTotal;
  const patchDelivery = existing.deliveryMethod;

  if (updates.status === "Cancelled" && existing.status !== "Cancelled") {
    createAlert("order", "medium", "Order Cancelled",
      `Order #${existing.code} was cancelled`,
      { linkUrl: `#orders:${existing.id}`, relatedEntityId: existing.id },
    ).catch(() => {});
    notifyUserFromTemplate(existing.telegramUsername, "status", "customer_order_cancelled",
      { code: existing.code, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, payment_status: patchPaidLabel, app_url: appUrl },
    ).catch(() => {});
    sendAdminFromTemplate("admin_order_cancelled",
      { code: existing.code, gb_name: patchGbContext, organiser: patchGbOrganiser, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, payment_status: patchPaidLabel },
    ).catch(() => {});
  } else if (updates.status && updates.status !== existing.status) {
    createAlert("order", "low", "Order Updated",
      `Order #${existing.code} was manually updated by admin`,
      { linkUrl: `#orders:${existing.id}`, relatedEntityId: existing.id },
    ).catch(() => {});
    const STATUS_EMOJI: Record<string, string> = {
      Processing: "⚙️", Shipped: "📦", Completed: "✅", Draft: "📝", Submitted: "🕐",
    };
    const emoji = STATUS_EMOJI[updates.status] ?? "🔔";
    const trackingLine = updates.trackingNumber
      ? `\nTracking: <code>${updates.trackingNumber}</code>`
      : (existing.trackingNumber ? `\nTracking: <code>${existing.trackingNumber}</code>` : "");
    notifyUserFromTemplate(existing.telegramUsername, "status", "customer_status_update",
      { code: existing.code, emoji, status: updates.status, gb_name: patchGbContext, tracking: trackingLine, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, payment_status: patchPaidLabel, app_url: appUrl },
    ).catch(() => {});
    sendAdminFromTemplate("admin_status_update",
      { code: existing.code, emoji, status: updates.status, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, payment_status: patchPaidLabel },
    ).catch(() => {});
  }
  if (updates.paymentStatus === "confirmed" && existing.paymentStatus !== "confirmed") {
    createAlert("order", "high", "Payment Received",
      `Payment received for order #${existing.code} — ${patchSym}${existing.grandTotal}`,
      { linkUrl: `#orders:${existing.id}`, relatedEntityId: existing.id },
    ).catch(() => {});
    // Compute payment method from the TXID being set in this patch (or the existing one)
    const _patchTxHash = (updates.paymentTxHash ?? (existing as any).paymentTxHash ?? "") as string;
    const _patchPayMethod = (() => {
      const m = (existing as any).paymentMethod as string | null;
      const s = m ?? _patchTxHash;
      if (s.startsWith("fiat:revolut") || s === "revolut") return "Revolut";
      if (s.startsWith("fiat:paypal") || s === "paypal") return "PayPal";
      if (s.startsWith("anonpay:") || s === "anonpay") return "AnonPay";
      if (s === "credits") return "Store Credits";
      if (s) return "Crypto";
      return "—";
    })();
    // Compute amount received — prefer the explicit paymentUsdAmount if set, else grand total
    const _patchAmtNum = updates.paymentUsdAmount != null
      ? parseFloat(String(updates.paymentUsdAmount))
      : ((existing as any).paymentUsdAmount != null ? parseFloat(String((existing as any).paymentUsdAmount)) : null);
    const _patchAmtReceived = _patchAmtNum != null ? `${_patchAmtNum.toFixed(2)} USDT` : patchSym + String(patchGrandTotal);
    // Build TXID line
    const _patchTxidLine = _patchTxHash ? `\nTXID: <code>${_patchTxHash}</code>` : "";
    // Build test payment info block if a test TXID exists on this order
    const _testTxHash = (existing as any).testPaymentTxHash as string | null;
    const _testAmt = (existing as any).paymentTestAmount;
    const _testAmtNum = _testAmt ? parseFloat(String(_testAmt)) : null;
    const _patchTestInfo = _testTxHash
      ? `\nTest TXID: <code>${_testTxHash}</code>${_testAmtNum != null ? ` (${_testAmtNum.toFixed(2)} USDT)` : ""}`
      : "";
    notifyUserFromTemplate(existing.telegramUsername, "payment", "customer_payment_confirmed",
      { code: existing.code, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, app_url: appUrl, amount_received: _patchAmtReceived, payment_method: _patchPayMethod },
    ).catch(() => {});
    sendAdminFromTemplate("admin_payment_confirmed",
      { code: existing.code, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, amount_received: _patchAmtReceived, payment_method: _patchPayMethod, txid_line: _patchTxidLine, test_info: _patchTestInfo },
    ).catch(() => {});
  }
  if (updates.paymentStatus === "failed" && existing.paymentStatus !== "failed") {
    createAlert("order", "high", "Payment Failed",
      `Payment failed for order #${existing.code}`,
      { linkUrl: `#orders:${existing.id}`, relatedEntityId: existing.id },
    ).catch(() => {});
    notifyUserFromTemplate(existing.telegramUsername, "payment", "customer_payment_failed",
      { code: existing.code, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery, app_url: appUrl },
    ).catch(() => {});
    sendAdminFromTemplate("admin_payment_failed",
      { code: existing.code, gb_name: patchGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: patchSym + String(patchGrandTotal), delivery: patchDelivery },
    ).catch(() => {});
  }

  // ── Tracking added / updated notification ────────────────────────────────
  // Fire when tracking numbers are first set or changed, so the member gets
  // their number and a direct 17track link via Telegram.
  // For direct / wholesale orders, also include the parcel contents.
  const trackingChanged = changedFields.includes("trackingNumber") || changedFields.includes("trackingNumbers");
  if (trackingChanged) {
    const newNums: string[] = Array.isArray(updates.trackingNumbers) && (updates.trackingNumbers as string[]).length
      ? (updates.trackingNumbers as string[])
      : (updates.trackingNumber ? [updates.trackingNumber as string] : []);
    if (newNums.length > 0 && existing.telegramUsername) {
      const trackUrl = `https://t.17track.net/en#nums=${newNums.map(encodeURIComponent).join(",")}`;
      const numLines = newNums.length === 1
        ? `Tracking: <code>${newNums[0]}</code>`
        : newNums.map((n, i) => `Tracking ${i + 1}: <code>${n}</code>`).join("\n");

      const isDirectOrWholesale = existing.routingType === "direct" || existing.orderType === "wholesale";
      const itemsSection = isDirectOrWholesale && lineItems.length > 0
        ? `\n\n📋 <b>Contents:</b>\n${lineItems.map((li: any) => `• ${li.productName} ×${Number(li.quantity)}`).join("\n")}`
        : "";

      const trackMsg = [
        `📦 <b>Your order #${existing.code} has been shipped!</b>`,
        "",
        numLines,
        itemsSection,
        "",
        `🌐 <a href="${trackUrl}">Track your parcel on 17track →</a>`,
      ].join("\n");
      notifyUser(existing.telegramUsername, "status", trackMsg).catch(() => {});
    }
  }

  // Recompute the effective address / QR requirement so the admin UI reflects the saved override.
  let patchOptReqAddress = false;
  let patchOptReqQr = false;
  if (patchGbShippingOptions && updated.deliveryMethodId) {
    const m = patchGbShippingOptions.find(o => o.id === updated.deliveryMethodId);
    if (m) { patchOptReqAddress = m.requiresAddress ?? false; patchOptReqQr = m.requiresQrCode ?? false; }
  }
  let patchReqAddress = patchOptReqAddress;
  let patchReqQr = patchOptReqQr;
  if (updated.requiresAddressOverride != null) patchReqAddress = updated.requiresAddressOverride;
  if (updated.requiresQrCodeOverride != null) patchReqQr = updated.requiresQrCodeOverride;

  res.json({
    ...fmtOrder(updated as unknown as Record<string, any>, lineItems as unknown as Record<string, any>[]),
    customShippingRequiresAddress: patchReqAddress,
    customShippingRequiresQrCode: patchReqQr,
    shippingOptionRequiresAddress: patchOptReqAddress,
    shippingOptionRequiresQrCode: patchOptReqQr,
  });
});

// ─── POST /api/admin/orders/:id/convert-to-wholesale ─────────
// Detaches the order from its group buy and converts it to a standalone
// wholesale order. Optionally enables wholesale access on the account.
router.post("/admin/orders/:id/convert-to-wholesale", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [existing] = await db
    .select({
      id: ordersTable.id,
      groupBuyId: ordersTable.groupBuyId,
      directShippingRequested: ordersTable.directShippingRequested,
      routingType: ordersTable.routingType,
      telegramUsername: ordersTable.telegramUsername,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Order not found" }); return;
  }
  if (!existing.groupBuyId) {
    res.status(400).json({ error: "Order is not part of a group buy" }); return;
  }
  const isDirect = existing.directShippingRequested === true || existing.routingType === "direct";
  if (!isDirect) {
    res.status(400).json({ error: "Only direct-to-home GB orders can be converted to wholesale" }); return;
  }

  const { enableWholesaleOnAccount } = req.body as { enableWholesaleOnAccount?: boolean };

  await db.update(ordersTable).set({
    orderType: "wholesale",
    groupBuyId: null,
    directShippingRequested: true,
    routingType: "direct",
    reshipperUsername: null,
    countryLegId: null,
  }).where(eq(ordersTable.id, existing.id));

  let accountUpdated = false;
  if (enableWholesaleOnAccount) {
    const username = existing.telegramUsername;
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
    const [acct] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
    if (acct) {
      await db.update(accountsTable).set({ isWholesale: true })
        .where(eq(accountsTable.telegramUsername, acct.telegramUsername));
      accountUpdated = true;
    }
  }

  await writeLog({
    actor: getAdminUsername(req),
    action: "order.convert_to_wholesale",
    target: existing.id,
    details: { accountUpdated, previousGroupBuyId: existing.groupBuyId },
  });

  res.json({ ok: true, accountUpdated });
});

// ─── POST /api/admin/orders/:id/send-message ─────────────────
router.post("/admin/orders/:id/send-message", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [existing] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code })
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" }); return;
  }

  const text = message.trim().slice(0, 2000);
  const fullText = `📦 <b>Message from Salts & Peps Admin</b>\nOrder #${existing.code}\n\n${text}`;

  await notifyUser(existing.telegramUsername, "status", fullText);

  writeLog("change", "info", "admin_message_sent", `Admin sent message to order #${existing.code} (@${existing.telegramUsername})`, { orderId: existing.id, code: existing.code }).catch(() => {});

  res.json({ ok: true });
});

// ─── POST /api/admin/orders/:id/qr — admin manually set/clear QR code ───────
router.post("/admin/orders/:id/qr", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

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

  const [existing] = await db
    .select({ id: ordersTable.id, code: ordersTable.code })
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const field = courier === "inpost" ? "inpostQrCode" : "royalMailQrCode";
  await db.update(ordersTable)
    .set({ [field]: qrCode ?? null })
    .where(eq(ordersTable.id, req.params.id));

  writeLog("change", "info", "admin_qr_set",
    `Admin ${qrCode ? "set" : "cleared"} ${courier} QR code for order ${existing.code}`,
    { orderId: existing.id, code: existing.code, courier },
  ).catch(() => {});

  res.json({ ok: true });
});

// ─── DELETE /api/admin/orders/:id ────────────────────────────
router.delete("/admin/orders/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Capture line items for audit snapshot (order stays in DB as soft-deleted for 2-day restore window)
  const deletedLineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, req.params.id));

  try {
    await db.update(ordersTable)
      .set({ deletedAt: new Date(), deletedBy: "admin" })
      .where(eq(ordersTable.id, req.params.id));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    res.status(500).json({ error: `Delete failed: ${msg}` });
    return;
  }

  writeLog("order", "warn", "order_deleted_by_admin",
    `Admin deleted order ${existing.code} (${existing.telegramUsername}, status: ${existing.status})`,
    {
      orderId: existing.id,
      code: existing.code,
      telegramUsername: existing.telegramUsername,
      status: existing.status,
      snapshot: {
        deliveryMethod: existing.deliveryMethod,
        grandTotal: existing.grandTotal,
        productSubtotal: existing.productSubtotal,
        deliveryPrice: existing.deliveryPrice,
        notes: existing.notes ?? null,
        shippingName: existing.shippingName ?? null,
        shippingAddress: existing.shippingAddress ?? null,
        lineItems: deletedLineItems.map(li => ({
          productName: li.productName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
        })),
      },
    },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: existing.telegramUsername,
    eventCategory: "order",
    eventType: "order.deleted",
    entityId: existing.id,
    actorType: "admin",
    actorUsername: getAdminUsername(res),
    metadata: {
      code: existing.code,
      status: existing.status,
      paymentStatus: existing.paymentStatus,
      grandTotal: existing.grandTotal,
      productSubtotal: existing.productSubtotal,
      deliveryMethod: existing.deliveryMethod,
      deliveryPrice: existing.deliveryPrice,
      tip: existing.tip,
      notes: existing.notes ?? null,
      groupBuyId: existing.groupBuyId ?? null,
      lineItems: deletedLineItems.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    },
  }).catch(() => {});

  const appUrlDel = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";

  let delSingleGbName = "";
  let delSingleGbOrganiser = "";
  let delSingleGbCurrency: string | null = null;
  if (existing.groupBuyId) {
    const [delSingleGbRow] = await db
      .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, existing.groupBuyId));
    if (delSingleGbRow) {
      delSingleGbName = delSingleGbRow.name;
      delSingleGbOrganiser = delSingleGbRow.organiserId ? `@${delSingleGbRow.organiserId}` : "Admin";
      delSingleGbCurrency = delSingleGbRow.currency ?? null;
    }
  }

  const delSingleSym = delSingleGbCurrency === "GBP" ? "£" : "$";

  const delSingleGbContext = delSingleGbName
    ? `\nGB: <b>${escapeHtml(delSingleGbName)}</b>\nOrganiser: ${escapeHtml(delSingleGbOrganiser)}`
    : "";
  const delSinglePaidLabel = existing.paymentStatus === "confirmed" ? "Paid" : "Unpaid";

  notifyUserFromTemplate(existing.telegramUsername, "deleted", "customer_order_deleted_by_admin",
    { code: existing.code, gb_name: delSingleGbContext, username: existing.telegramUsername.replace(/^@/, ""), order_total: delSingleSym + String(existing.grandTotal), delivery: existing.deliveryMethod, payment_status: delSinglePaidLabel, app_url: appUrlDel },
  ).catch(() => {});

  sendAdminFromTemplate("admin_order_deleted_by_admin",
    { code: existing.code, gb_name: delSingleGbContext, organiser: delSingleGbOrganiser, username: existing.telegramUsername.replace(/^@/, ""), order_total: delSingleSym + String(existing.grandTotal), delivery: existing.deliveryMethod, payment_status: delSinglePaidLabel },
  ).catch(() => {});

  res.json({ ok: true });
});

// ─── DELETE /api/admin/orders (bulk) ─────────────────────────
router.delete("/admin/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  if (ids.length > 100) {
    res.status(400).json({ error: "Cannot delete more than 100 orders at once" });
    return;
  }

  const safeIds = ids.map((id: unknown) => String(id).slice(0, 64));

  const ordersToDelete = await db.select().from(ordersTable).where(inArray(ordersTable.id, safeIds));

  // Fetch GB context for bulk-deleted orders
  const bulkGbIds = [...new Set(ordersToDelete.map(o => o.groupBuyId).filter(Boolean))] as string[];
  const bulkGbMap = new Map<string, { name: string; organiser: string; currency: string | null }>();
  if (bulkGbIds.length > 0) {
    const bulkGbRows = await db
      .select({ id: groupBuysTable.id, name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(inArray(groupBuysTable.id, bulkGbIds));
    for (const row of bulkGbRows) {
      bulkGbMap.set(row.id, {
        name: row.name,
        organiser: row.organiserId ? `@${row.organiserId}` : "Admin",
        currency: row.currency ?? null,
      });
    }
  }

  try {
    await db.update(ordersTable)
      .set({ deletedAt: new Date(), deletedBy: "admin" })
      .where(inArray(ordersTable.id, safeIds));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    res.status(500).json({ error: `Bulk delete failed: ${msg}` });
    return;
  }

  const bulkOrdersList = ordersToDelete.map(o => {
    const gb = o.groupBuyId ? bulkGbMap.get(o.groupBuyId) : undefined;
    const gbLine = gb ? ` | GB: ${gb.name} | Organiser: ${gb.organiser}` : "";
    const paidLbl = o.paymentStatus === "confirmed" ? "Paid" : "Unpaid";
    const bulkSym = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$" }[gb?.currency ?? "GBP"] ?? "£";
    return `• <code>#${o.code}</code> @${o.telegramUsername.replace(/^@/, "")}${gbLine}\n  User Total: ${bulkSym}${o.grandTotal} | Delivery: ${o.deliveryMethod} | Payment: ${paidLbl}`;
  }).join("\n");
  sendAdminFromTemplate("admin_bulk_delete",
    { count: String(ordersToDelete.length), orders_summary: bulkOrdersList },
  ).catch(() => {});

  const bulkAppUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
  for (const o of ordersToDelete) {
    const gb = o.groupBuyId ? bulkGbMap.get(o.groupBuyId) : undefined;
    const bulkGbContext = gb ? `\nGB: <b>${escapeHtml(gb.name)}</b>\nOrganiser: ${escapeHtml(gb.organiser)}` : "";
    const bulkPaidLabel = o.paymentStatus === "confirmed" ? "Paid" : "Unpaid";
    const bulkSym = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$" }[gb?.currency ?? "GBP"] ?? "£";
    notifyUserFromTemplate(o.telegramUsername, "deleted", "customer_order_deleted_by_admin",
      { code: o.code, gb_name: bulkGbContext, username: o.telegramUsername.replace(/^@/, ""), order_total: bulkSym + String(o.grandTotal), delivery: o.deliveryMethod, payment_status: bulkPaidLabel, app_url: bulkAppUrl },
    ).catch(() => {});
  }

  res.json({ ok: true, deleted: safeIds.length });
});

// ─── POST /api/admin/orders/mark-oos ─────────────────────────
// Mark all line items matching a list of product names/IDs as OOS, recalculate order totals
router.post("/admin/orders/mark-oos", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { productNames, productIds } = req.body as {
    productNames?: string[];
    productIds?: string[];
  };

  const hasNames = Array.isArray(productNames) && productNames.length > 0;
  const hasIds = Array.isArray(productIds) && productIds.length > 0;

  if (!hasNames && !hasIds) {
    res.status(400).json({ error: "Provide at least one productName or productId" });
    return;
  }

  const cleanNames = hasNames ? productNames!.map(n => String(n).trim()).filter(Boolean) : [];
  const cleanIds = hasIds ? productIds!.map(id => String(id).trim()).filter(Boolean) : [];

  // Find all matching non-OOS line items
  const conditions = [];
  if (cleanNames.length > 0) conditions.push(inArray(orderLineItemsTable.productName, cleanNames));
  if (cleanIds.length > 0) conditions.push(inArray(orderLineItemsTable.productId, cleanIds));

  const matchingItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(or(...conditions));

  const nonOosItems = matchingItems.filter(li => !li.isOos);

  if (nonOosItems.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 });
    return;
  }

  // Mark them OOS and recalculate totals atomically
  const itemIds = nonOosItems.map(li => li.id);
  const affectedOrderIds = [...new Set(nonOosItems.map(li => li.orderId))];

  await db.transaction(async (tx) => {
    await tx
      .update(orderLineItemsTable)
      .set({ isOos: true })
      .where(inArray(orderLineItemsTable.id, itemIds));

    for (const orderId of affectedOrderIds) {
      const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
      if (!order) continue;

      const allItems = await tx
        .select()
        .from(orderLineItemsTable)
        .where(eq(orderLineItemsTable.orderId, orderId));

      const newProductSubtotal = allItems
        .filter(li => !li.isOos)
        .reduce((sum, li) => sum + parseFloat(String(li.lineTotal)), 0);

      const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
      const vendorShipping = parseFloat(String(order.vendorShipping ?? "0"));
      const tip = parseFloat(String(order.tip ?? "0"));
      const testingContribution = parseFloat(String((order as any).testingContribution ?? "0"));
      const newGrandTotal = newProductSubtotal + deliveryPrice + vendorShipping + tip + testingContribution;

      await tx
        .update(ordersTable)
        .set({
          productSubtotal: newProductSubtotal.toFixed(2) as any,
          grandTotal: newGrandTotal.toFixed(2) as any,
        })
        .where(eq(ordersTable.id, orderId));
    }
  });

  writeLog("order", "info", "oos_marked_by_admin",
    `Admin marked ${nonOosItems.length} line item(s) as OOS across ${affectedOrderIds.length} order(s)`,
    { productNames: cleanNames, productIds: cleanIds, affectedOrderIds },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  // Telegram OOS notifications
  try {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const affectedOrders = await db
      .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, grandTotal: ordersTable.grandTotal, groupBuyId: ordersTable.groupBuyId })
      .from(ordersTable)
      .where(inArray(ordersTable.id, affectedOrderIds));

    const gbIds = [...new Set(affectedOrders.map(o => o.groupBuyId).filter(Boolean))] as string[];
    const gbs = gbIds.length > 0 ? await db.select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency }).from(groupBuysTable).where(inArray(groupBuysTable.id, gbIds)) : [];
    const gbMap = new Map(gbs.map(g => [g.id, g]));

    const usernames = [...new Set(affectedOrders.map(o => o.telegramUsername.replace(/^@/, "").toLowerCase()))];
    const accounts = usernames.length > 0 ? await db.select({ telegramUsername: accountsTable.telegramUsername, chatId: accountsTable.telegramChatId }).from(accountsTable).where(inArray(accountsTable.telegramUsername, usernames)) : [];
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
      const gb = order.groupBuyId ? gbMap.get(order.groupBuyId) : null;
      const gbName = gb?.name ?? "your group buy";
      const currency = gb?.currency ?? "£";
      const newTotal = parseFloat(String(order.grandTotal)).toFixed(2);
      const itemList = (oosByOrder.get(order.id) ?? []).map(i => `• ${esc(i)}`).join("\n");
      const msg = `⚠️ <b>Item(s) Out of Stock</b>\n<b>Group Buy:</b> ${esc(gbName)}\n\nThe following item(s) in your order have been marked out of stock and removed:\n${itemList}\n\n<b>Your updated total: ${esc(currency)}${newTotal}</b>\n\nPlease contact your organiser if you have any questions.`;
      await sendTelegramMessage(chatId, msg, "HTML").catch(() => {});
    }
  } catch (_) {}

  res.json({ ok: true, affectedLineItems: nonOosItems.length, affectedOrders: affectedOrderIds.length });
});

// ─── POST /api/admin/orders/unmark-oos ────────────────────────────────────────
// Restore previously-OOS line items back to active, recalculate order totals
router.post("/admin/orders/unmark-oos", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { productNames, productIds } = req.body as {
    productNames?: string[];
    productIds?: string[];
  };

  const hasNames = Array.isArray(productNames) && productNames.length > 0;
  const hasIds = Array.isArray(productIds) && productIds.length > 0;

  if (!hasNames && !hasIds) {
    res.status(400).json({ error: "Provide at least one productName or productId" });
    return;
  }

  const cleanNames = hasNames ? productNames!.map(n => String(n).trim()).filter(Boolean) : [];
  const cleanIds = hasIds ? productIds!.map(id => String(id).trim()).filter(Boolean) : [];

  const conditions = [];
  if (cleanNames.length > 0) conditions.push(inArray(orderLineItemsTable.productName, cleanNames));
  if (cleanIds.length > 0) conditions.push(inArray(orderLineItemsTable.productId, cleanIds));

  const matchingItems = await db.select().from(orderLineItemsTable).where(or(...conditions));
  const oosItems = matchingItems.filter(li => li.isOos);

  if (oosItems.length === 0) {
    res.json({ ok: true, affectedLineItems: 0, affectedOrders: 0 });
    return;
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
      const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
      const vendorShipping = parseFloat(String(order.vendorShipping ?? "0"));
      const tip = parseFloat(String(order.tip ?? "0"));
      const testingContribution = parseFloat(String((order as any).testingContribution ?? "0"));
      const newGrandTotal = newProductSubtotal + deliveryPrice + vendorShipping + tip + testingContribution;
      await tx.update(ordersTable).set({
        productSubtotal: newProductSubtotal.toFixed(2) as any,
        grandTotal: newGrandTotal.toFixed(2) as any,
      }).where(eq(ordersTable.id, orderId));
    }
  });

  writeLog("order", "info", "oos_unmarked_by_admin",
    `Admin restored ${oosItems.length} line item(s) from OOS across ${affectedOrderIds.length} order(s)`,
    { productNames: cleanNames, productIds: cleanIds, affectedOrderIds },
    (req.ip ?? "unknown") as string,
  ).catch(() => {});

  res.json({ ok: true, affectedLineItems: oosItems.length, affectedOrders: affectedOrderIds.length });
});

// ─── GET /api/admin/public-listing-requests ─────────────────────────────────
// List GBs with approvalStatus = "public_requested" or "pending_approval"
router.get("/admin/public-listing-requests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      approvalStatus: groupBuysTable.approvalStatus,
      organiserId: groupBuysTable.organiserId,
      hiddenFromList: groupBuysTable.hiddenFromList,
      createdAt: groupBuysTable.createdAt,
    })
    .from(groupBuysTable)
    .where(
      or(
        eq(groupBuysTable.approvalStatus, "pending_approval"),
        eq(groupBuysTable.approvalStatus, "public_requested"),
      )
    )
    .orderBy(asc(groupBuysTable.createdAt));
  res.json(rows);
});

// ─── POST /api/admin/group-buys/:id/organiser-session — create short-lived admin organiser token ─
router.post("/admin/group-buys/:id/organiser-session", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["id"]);
  const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }
  const token = createAdminOrganiserSession(gbId);
  res.json({ token });
});

// ─── POST /api/admin/group-buys/:id/approve — approve organiser GB (allow active)
router.post("/admin/group-buys/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);
  const makePublic = req.body?.makePublic === true;

  const [updated] = await db
    .update(groupBuysTable)
    .set({
      approvalStatus: "approved",
      ...(makePublic ? { hiddenFromList: false } : {}),
    })
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, approvalStatus: groupBuysTable.approvalStatus, hiddenFromList: groupBuysTable.hiddenFromList });

  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json(updated);
});

// ─── POST /api/admin/group-buys/:id/reject — reject organiser GB
router.post("/admin/group-buys/:id/reject", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);

  const [updated] = await db
    .update(groupBuysTable)
    .set({ approvalStatus: "rejected", hiddenFromList: true })
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, approvalStatus: groupBuysTable.approvalStatus });

  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json(updated);
});

// ─── GET /api/admin/group-buys/:id/all-orders-qr ─────────────
// Returns all orders for this GB with QR code data + qrPosted flag.
router.get("/admin/group-buys/:id/all-orders-qr", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

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

// ─── PATCH /api/admin/orders/:id/qr-posted ────────────────────
// Toggles the qrPosted flag on an order.
router.patch("/admin/orders/:id/qr-posted", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const orderId = String(req.params["id"]);
  const { posted } = req.body as { posted: boolean };
  if (typeof posted !== "boolean") { res.status(400).json({ error: "posted must be a boolean" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ qrPosted: posted })
    .where(eq(ordersTable.id, orderId))
    .returning({ id: ordersTable.id, qrPosted: ordersTable.qrPosted });

  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ id: updated.id, qrPosted: updated.qrPosted });
});

// ─── PATCH /api/admin/group-buys/:id/qr-viewers ──────────────
// Update the list of usernames allowed to view the QR code viewer for a GB.
// Body: { usernames: string[] }
router.patch("/admin/group-buys/:id/qr-viewers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);
  const { usernames } = req.body as { usernames?: unknown };
  if (!Array.isArray(usernames)) {
    res.status(400).json({ error: "usernames must be an array" });
    return;
  }
  const cleaned = usernames.map((u: unknown) => String(u).trim().toLowerCase()).filter(Boolean);
  const [updated] = await db
    .update(groupBuysTable)
    .set({ qrViewerUsernames: cleaned.length > 0 ? cleaned : null })
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, qrViewerUsernames: groupBuysTable.qrViewerUsernames });
  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json(updated);
});

// ─── PATCH /api/admin/group-buys/:id/leg-viewers ──────────────
// Update the list of leg viewer assignments for a GB.
// Body: { legViewerAccess: { username: string; legIds: string[] }[] }
router.patch("/admin/group-buys/:id/leg-viewers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);
  const { legViewerAccess } = req.body as { legViewerAccess?: unknown };
  if (!Array.isArray(legViewerAccess)) {
    res.status(400).json({ error: "legViewerAccess must be an array" });
    return;
  }
  const cleaned = legViewerAccess
    .filter((v: unknown) => v && typeof v === "object" && "username" in (v as object))
    .map((v: unknown) => {
      const entry = v as { username: unknown; legIds: unknown };
      return {
        username: String(entry.username ?? "").trim().toLowerCase().replace(/^@/, ""),
        legIds: Array.isArray(entry.legIds) ? entry.legIds.map(String) : [],
      };
    })
    .filter(e => e.username && e.legIds.length > 0);
  const [updated] = await db
    .update(groupBuysTable)
    .set({ legViewerAccess: cleaned.length > 0 ? cleaned : null } as Record<string, unknown>)
    .where(eq(groupBuysTable.id, id))
    .returning({ id: groupBuysTable.id, legViewerAccess: groupBuysTable.legViewerAccess });
  if (!updated) { res.status(404).json({ error: "Group buy not found" }); return; }
  res.json({ legViewerAccess: updated.legViewerAccess ?? [] });
});

// ─── GET /api/admin/group-buys-list ──────────────────────────
// Lightweight list of all GBs (id + name) for filter dropdowns
router.get("/admin/group-buys-list", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbs = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .orderBy(asc(groupBuysTable.name));
  res.json(gbs);
});

// ─── GET /api/admin/group-buys/:id/pnl ───────────────────────
router.get("/admin/group-buys/:id/pnl", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, pnlCosts: groupBuysTable.pnlCosts })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

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
  const confirmedOrders = orders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed");
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.grandTotal)), 0);
  const productRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.productSubtotal)), 0);
  const deliveryRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(String(o.deliveryPrice)), 0);

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

  const costs = (gb.pnlCosts ?? {}) as {
    materials?: number; lab?: number; shipping?: number; misc?: number; platformFee?: number; notes?: string;
  };
  const totalCosts = (costs.materials ?? 0) + (costs.lab ?? 0) + (costs.shipping ?? 0) + (costs.misc ?? 0) + (costs.platformFee ?? 0);
  const grossProfit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  res.json({
    gbId: id, gbName: gb.name,
    orders: { total: allOrders, confirmed: confirmedOrders.length },
    revenue: {
      total: parseFloat(totalRevenue.toFixed(2)),
      products: parseFloat(productRevenue.toFixed(2)),
      delivery: parseFloat(deliveryRevenue.toFixed(2)),
    },
    costs: {
      materials: costs.materials ?? 0, lab: costs.lab ?? 0, shipping: costs.shipping ?? 0,
      misc: costs.misc ?? 0, platformFee: costs.platformFee ?? 0,
      total: parseFloat(totalCosts.toFixed(2)), notes: costs.notes ?? null,
    },
    profit: { gross: parseFloat(grossProfit.toFixed(2)), marginPct: parseFloat(margin.toFixed(1)) },
    productBreakdown: Object.entries(productBreakdown).map(([name, d]) => ({
      name, totalQty: parseFloat(d.qty.toFixed(2)), totalRevenue: parseFloat(d.revenue.toFixed(2)),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue),
  });
});

// ─── PUT /api/admin/group-buys/:id/pnl-costs ─────────────────
router.put("/admin/group-buys/:id/pnl-costs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const { materials, lab, shipping, misc, platformFee, notes } = req.body as {
    materials?: number | null; lab?: number | null; shipping?: number | null;
    misc?: number | null; platformFee?: number | null; notes?: string | null;
  };

  const costs = {
    materials: materials != null ? parseFloat(String(materials)) : undefined,
    lab: lab != null ? parseFloat(String(lab)) : undefined,
    shipping: shipping != null ? parseFloat(String(shipping)) : undefined,
    misc: misc != null ? parseFloat(String(misc)) : undefined,
    platformFee: platformFee != null ? parseFloat(String(platformFee)) : undefined,
    notes: notes ? String(notes).trim() : undefined,
  };

  await db.update(groupBuysTable).set({ pnlCosts: costs }).where(eq(groupBuysTable.id, id));
  res.json({ ok: true, pnlCosts: costs });
});

// ─── GET /api/admin/order-countries ──────────────────────────
// Returns distinct shipping countries from orders, falling back to account country
router.get("/admin/order-countries", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [orderRows, accountRows] = await Promise.all([
    db.selectDistinct({ c: ordersTable.shippingCountry }).from(ordersTable).where(isNull(ordersTable.deletedAt)),
    db.selectDistinct({ c: accountsTable.country }).from(accountsTable),
  ]);
  const countries = [...new Set(
    [...orderRows.map(r => r.c), ...accountRows.map(r => r.c)]
      .filter((c): c is string => !!c && c.trim().length > 0)
      .map(normalizeCountry)
  )].sort();
  res.json(countries);
});

// ─── GET /api/admin/group-summary ────────────────────────────
// Aggregates all line items by product, optionally filtered by status and/or GB
router.get("/admin/group-summary", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const statusFilter = req.query.status as string | undefined;
  const groupBuyId = req.query.groupBuyId as string | undefined;
  const countryFilter = req.query.country as string | undefined;
  const reshipperFilter = req.query.reshipper as string | undefined;

  let orders = await db.select().from(ordersTable).where(isNull(ordersTable.deletedAt));
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  if (groupBuyId && groupBuyId !== "all") {
    orders = orders.filter((o) => o.groupBuyId === groupBuyId);
  }
  if (reshipperFilter && reshipperFilter !== "all") {
    orders = orders.filter((o) => (o.reshipperUsername ?? "").toLowerCase() === reshipperFilter.toLowerCase());
  }
  if (countryFilter && countryFilter !== "all") {
    const countries = countryFilter.split(",").filter(Boolean);
    if (countries.length > 0) {
      const accountRows = await db.select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country }).from(accountsTable);
      const accountCountryMap = new Map<string, string>();
      for (const a of accountRows) {
        if (a.telegramUsername && a.country) accountCountryMap.set(a.telegramUsername.replace(/^@/, "").toLowerCase(), normalizeCountry(a.country));
      }
      orders = orders.filter((o) => {
        const shipCountry = normalizeCountry(o.shippingCountry ?? "");
        if (shipCountry && countries.includes(shipCountry)) return true;
        const tg = (o.telegramUsername ?? "").replace(/^@/, "").toLowerCase();
        const acctCountry = accountCountryMap.get(tg) ?? "";
        return !!(acctCountry && countries.includes(acctCountry));
      });
    }
  }

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  // Aggregate by productName
  const map = new Map<
    string,
    { productId: string; productName: string; totalQty: number; unitPrice: number; totalValue: number; orderCount: number }
  >();

  for (const li of lineItems) {
    const key = li.productName;
    const existing = map.get(key) ?? {
      productId: li.productId,
      productName: li.productName,
      totalQty: 0,
      unitPrice: parseFloat(String(li.unitPrice)),
      totalValue: 0,
      orderCount: 0,
    };
    existing.totalQty += parseFloat(String(li.quantity));
    existing.totalValue += parseFloat(String(li.lineTotal));
    existing.orderCount += 1;
    map.set(key, existing);
  }

  const summary = Array.from(map.values())
    .map((item) => ({
      ...item,
      totalQty: parseFloat(item.totalQty.toFixed(2)),
      totalValue: parseFloat(item.totalValue.toFixed(2)),
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  res.json(summary);
});

// ─── GET /api/admin/group-summary/breakdown ───────────────────
// Returns per-order breakdown for a specific product name
router.get("/admin/group-summary/breakdown", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const productName = req.query.productName as string | undefined;
  const statusFilter = req.query.status as string | undefined;
  const groupBuyId = req.query.groupBuyId as string | undefined;
  const countryFilter = req.query.country as string | undefined;
  const reshipperFilter = req.query.reshipper as string | undefined;

  if (!productName) {
    res.status(400).json({ error: "productName is required" });
    return;
  }

  let orders = await db.select().from(ordersTable).where(isNull(ordersTable.deletedAt));
  if (statusFilter && statusFilter !== "all") {
    orders = orders.filter((o) => o.status === statusFilter);
  }
  if (groupBuyId && groupBuyId !== "all") {
    orders = orders.filter((o) => o.groupBuyId === groupBuyId);
  }
  if (reshipperFilter && reshipperFilter !== "all") {
    orders = orders.filter((o) => (o.reshipperUsername ?? "").toLowerCase() === reshipperFilter.toLowerCase());
  }
  if (countryFilter && countryFilter !== "all") {
    const countries = countryFilter.split(",").filter(Boolean);
    if (countries.length > 0) {
      const accountRows = await db.select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country }).from(accountsTable);
      const accountCountryMap = new Map<string, string>();
      for (const a of accountRows) {
        if (a.telegramUsername && a.country) accountCountryMap.set(a.telegramUsername.replace(/^@/, "").toLowerCase(), normalizeCountry(a.country));
      }
      orders = orders.filter((o) => {
        const shipCountry = normalizeCountry(o.shippingCountry ?? "");
        if (shipCountry && countries.includes(shipCountry)) return true;
        const tg = (o.telegramUsername ?? "").replace(/^@/, "").toLowerCase();
        const acctCountry = accountCountryMap.get(tg) ?? "";
        return !!(acctCountry && countries.includes(acctCountry));
      });
    }
  }

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(inArray(orderLineItemsTable.orderId, orderIds));

  const matchingItems = lineItems.filter(
    (li) => li.productName === productName
  );

  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const breakdown = matchingItems.map((li) => {
    const order = orderMap.get(li.orderId);
    return {
      orderId: li.orderId,
      orderCode: order?.code ?? "?",
      telegramUsername: order?.telegramUsername ?? "?",
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      orderStatus: order?.status ?? "?",
    };
  }).sort((a, b) => a.telegramUsername.localeCompare(b.telegramUsername));

  res.json(breakdown);
});

// ─── GET /api/admin/products ──────────────────────────────────
router.get("/admin/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const products = await db
    .select()
    .from(productsTable)
    .orderBy(productsTable.sortOrder, productsTable.name);

  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      vendor: p.vendor,
      price: parseFloat(String(p.price)),
      active: p.active,
      category: p.category ?? null,
      sortOrder: p.sortOrder,
      stock: p.stock ?? null,
      lowStockThreshold: p.lowStockThreshold ?? null,
    }))
  );
});

// ─── PUT /api/admin/products/:id ─────────────────────────────
router.put("/admin/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, price, active, sortOrder, category, vendor, stock, lowStockThreshold } = req.body;

    const [existing] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, req.params.id));

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (vendor !== undefined) {
      const v = String(vendor).trim();
      if (!v) { res.status(400).json({ error: "vendor cannot be blank" }); return; }
      updates.vendor = v;
    }
    if (price !== undefined) {
      const p = parseFloat(String(price));
      if (isNaN(p) || p < 0) {
        res.status(400).json({ error: "price must be non-negative" });
        return;
      }
      updates.price = p.toFixed(2);
    }
    if (active !== undefined) updates.active = Boolean(active);
    if (sortOrder !== undefined) updates.sortOrder = parseInt(String(sortOrder));
    if (category !== undefined) updates.category = category || null;
    if (stock !== undefined) updates.stock = (stock != null && stock !== "") ? parseInt(String(stock)) : null;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = (lowStockThreshold != null && lowStockThreshold !== "") ? parseInt(String(lowStockThreshold)) : null;

    if (Object.keys(updates).length === 0) {
      res.json({
        id: existing.id, name: existing.name, vendor: existing.vendor,
        price: parseFloat(String(existing.price)),
        active: existing.active, category: existing.category ?? null, sortOrder: existing.sortOrder,
        stock: existing.stock ?? null, lowStockThreshold: existing.lowStockThreshold ?? null,
      });
      return;
    }

    const [updated] = await db
      .update(productsTable)
      .set(updates)
      .where(eq(productsTable.id, req.params.id))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      vendor: updated.vendor,
      price: parseFloat(String(updated.price)),
      active: updated.active,
      category: updated.category ?? null,
      sortOrder: updated.sortOrder,
      stock: updated.stock ?? null,
      lowStockThreshold: updated.lowStockThreshold ?? null,
    });
  } catch (err) {
    console.error("[PUT /admin/products/:id] Error:", err);
    res.status(500).json({ error: "Failed to update product", detail: String(err) });
  }
});

// ─── POST /api/admin/products ─────────────────────────────────
router.post("/admin/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, price, active = true, sortOrder, vendor } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({ error: "name and price are required" });
      return;
    }
    if (!vendor || !String(vendor).trim()) {
      res.status(400).json({ error: "vendor is required" });
      return;
    }

    const p = parseFloat(String(price));
    if (isNaN(p) || p < 0) {
      res.status(400).json({ error: "price must be non-negative" });
      return;
    }

    const existing = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(sql`LOWER(${productsTable.name}) = LOWER(${String(name).trim()})`)
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: `A product named "${String(name).trim()}" already exists` });
      return;
    }

    const [created] = await db
      .insert(productsTable)
      .values({
        id: `prod-${randomUUID().split("-")[0]}`,
        name: String(name).trim(),
        vendor: String(vendor).trim(),
        price: p.toFixed(2),
        active: Boolean(active),
        category: req.body.category || null,
        sortOrder: sortOrder ? parseInt(String(sortOrder)) : null,
      })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      vendor: created.vendor,
      price: parseFloat(String(created.price)),
      active: created.active,
      category: created.category ?? null,
      sortOrder: created.sortOrder,
    });
  } catch (err) {
    console.error("[POST /admin/products] Error:", err);
    res.status(500).json({ error: "Failed to create product", detail: String(err) });
  }
});

// ─── POST /api/admin/products/extract-from-file ───────────────
// Accepts { fileName, mimeType, base64Data } and uses Gemini to extract product list
router.post("/admin/products/extract-from-file", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { fileName, mimeType, base64Data } = req.body as {
    fileName?: string;
    mimeType?: string;
    base64Data?: string;
  };

  if (!mimeType || !base64Data) {
    res.status(400).json({ error: "mimeType and base64Data are required" });
    return;
  }

  const geminiClient = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
  });

  const systemPrompt = `You are a product catalog extraction assistant for a peptide/supplement store called Salt&Peps.

Extract ALL products/items from the provided file. For each product, output a JSON array with objects having this structure:
{
  "name": "<product name including size/concentration if present>",
  "price": <number or null if not found>,
  "category": "<category string or null>",
  "vendor": "<vendor/supplier name or null>",
  "mgSize": "<mg or size descriptor e.g. '10mg' or null>"
}

Rules:
- Extract every distinct product you can find.
- name is required and should be descriptive (include dosage/size in the name if relevant, e.g. "BPC-157 10mg").
- price should be a plain number (no currency symbols). Use null if not clearly stated.
- category should be a broad grouping like "Peptides", "GLP-1", "Supplements", "Sarms", etc. Infer if not explicit.
- vendor is the supplier/brand name. Use null if unknown.
- mgSize is the size/concentration descriptor only (e.g. "10mg", "5ml"). Omit if already in name.
- Return ONLY a valid JSON array — no markdown, no code blocks, no explanation.
- No maximum — extract every product you find.`;

  try {
    let extractedText: string | null = null;
    const isExcel = mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      || mimeType === "application/vnd.ms-excel"
      || (fileName ?? "").toLowerCase().endsWith(".xlsx")
      || (fileName ?? "").toLowerCase().endsWith(".xls");

    const isCsv = mimeType === "text/csv" || (fileName ?? "").toLowerCase().endsWith(".csv");

    let contents: Parameters<typeof geminiClient.models.generateContent>[0]["contents"];

    if (isExcel) {
      const buf = Buffer.from(base64Data, "base64");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buf as any);
      const sheets: string[] = [];
      for (const worksheet of workbook.worksheets) {
        const rows: string[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const cells = (row.values as ExcelJS.CellValue[]).slice(1);
          const rowStr = cells.map(cell => {
            if (cell == null) return '""';
            const v = (typeof cell === 'object' && cell !== null && 'result' in cell)
              ? (cell as any).result
              : cell;
            return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
          }).join(',');
          rows.push(rowStr);
        });
        const csv = rows.join('\n');
        if (csv.trim()) sheets.push(`Sheet: ${worksheet.name}\n${csv}`);
      }
      extractedText = sheets.join("\n\n");
      contents = [{ role: "user", parts: [{ text: `${systemPrompt}\n\nSpreadsheet content:\n${extractedText.slice(0, 150000)}` }] }];
    } else if (isCsv) {
      extractedText = Buffer.from(base64Data, "base64").toString("utf-8");
      contents = [{ role: "user", parts: [{ text: `${systemPrompt}\n\nCSV content:\n${extractedText.slice(0, 150000)}` }] }];
    } else {
      // PNG, JPG, PDF — send as inline data
      contents = [{
        role: "user",
        parts: [
          { text: systemPrompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      }];
    }

    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { temperature: 0.1, maxOutputTokens: 65535, thinkingConfig: { thinkingBudget: 0 } },
    });

    const raw = (response.text ?? "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: "AI returned unexpected format" });
      return;
    }

    const products = parsed.map((p: any) => ({
      name: String(p.name ?? "").trim(),
      price: p.price != null ? parseFloat(String(p.price)) : null,
      category: p.category ? String(p.category).trim() : null,
      vendor: p.vendor ? String(p.vendor).trim() : null,
      mgSize: p.mgSize ? String(p.mgSize).trim() : null,
    })).filter((p: any) => p.name);

    res.json({ products });
  } catch (err) {
    console.error("[products/extract-from-file] Error:", err);
    res.status(502).json({ error: "AI extraction failed — please check the file and try again" });
  }
});

// ─── DELETE /api/admin/products/:id ──────────────────────────
router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  await db.delete(productsTable).where(eq(productsTable.id, req.params.id));
  res.json({ ok: true });
});

// ─── GET /api/admin/products/duplicates ──────────────────────
router.get("/admin/products/duplicates", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT id, name, vendor, price,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)), LOWER(TRIM(COALESCE(vendor,''))), ROUND(price::numeric, 2)
            ORDER BY id
          ) AS rn,
          COUNT(*) OVER (
            PARTITION BY LOWER(TRIM(name)), LOWER(TRIM(COALESCE(vendor,''))), ROUND(price::numeric, 2)
          ) AS cnt
        FROM products
      )
      SELECT r.id, r.name, r.vendor, r.price::text, r.rn::int,
        (SELECT COUNT(*) FROM order_line_items WHERE product_id = r.id)::int AS order_count
      FROM ranked r
      WHERE r.cnt > 1
      ORDER BY LOWER(TRIM(r.name)), r.rn
    `);

    type Row = { id: string; name: string; vendor: string | null; price: string; rn: number; order_count: number };
    const rows = result.rows as Row[];

    const groups = new Map<string, { keep: Row; remove: Row[] }>();
    for (const row of rows) {
      const key = `${row.name.trim().toLowerCase()}||${(row.vendor ?? "").trim().toLowerCase()}||${parseFloat(row.price).toFixed(2)}`;
      if (!groups.has(key)) groups.set(key, { keep: row, remove: [] });
      const g = groups.get(key)!;
      if (row.rn === 1) g.keep = row;
      else g.remove.push(row);
    }

    res.json(Array.from(groups.values()).map(g => ({
      keep: { id: g.keep.id, name: g.keep.name, vendor: g.keep.vendor, price: parseFloat(g.keep.price) },
      remove: g.remove.map(r => ({ id: r.id, name: r.name, vendor: r.vendor, price: parseFloat(r.price), orderCount: r.order_count })),
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/admin/products/deduplicate ────────────────────
router.post("/admin/products/deduplicate", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY LOWER(TRIM(name)), LOWER(TRIM(COALESCE(vendor,''))), ROUND(price::numeric, 2)
                 ORDER BY id
               ) AS rn
        FROM products
      )
      DELETE FROM products
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING id
    `);
    res.json({ removed: result.rows.length, ids: result.rows.map((r: any) => r.id) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── GET /api/admin/delivery-methods ─────────────────────────
router.get("/admin/delivery-methods", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const methods = await db.select().from(deliveryMethodsTable).orderBy(deliveryMethodsTable.sortOrder);
  res.json(methods.map((m) => ({
    id: m.id,
    name: m.name,
    price: parseFloat(String(m.price)),
    active: m.active,
    sortOrder: m.sortOrder,
    infoEnabled: m.infoEnabled,
    infoText: m.infoText ?? null,
  })));
});

// ─── PUT /api/admin/delivery-methods/:id ─────────────────────
router.put("/admin/delivery-methods/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { name, price, active, infoEnabled, infoText } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (price !== undefined) {
    const p = parseFloat(String(price));
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "price must be non-negative" }); return; }
    updates.price = p.toFixed(2);
  }
  if (active !== undefined) updates.active = Boolean(active);
  if (infoEnabled !== undefined) updates.infoEnabled = Boolean(infoEnabled);
  if (infoText !== undefined) updates.infoText = infoText === null ? null : String(infoText).trim() || null;

  const [updated] = await db
    .update(deliveryMethodsTable)
    .set(updates)
    .where(eq(deliveryMethodsTable.id, req.params.id))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    price: parseFloat(String(updated.price)),
    active: updated.active,
    infoEnabled: updated.infoEnabled,
    infoText: updated.infoText ?? null,
  });
});

// ─── POST /api/admin/apply-shipping ──────────────────────────
// Configurable split: equalPct + weightedPct (must sum to 100)
router.post("/admin/apply-shipping", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

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
    .where(and(eq(ordersTable.status, statusFilter), isNull(ordersTable.deletedAt)));

  if (orders.length === 0) {
    res.json({ message: `No ${statusFilter} orders found`, updatedCount: 0 });
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
    const newGrandTotal = parseFloat((productSubtotal + deliveryPrice + vendorShipping + tip).toFixed(2));

    // If this order was already fully confirmed, vendor shipping is an outstanding balance to collect —
    // unless the customer's recorded payment already covers the new grand total (they paid VS upfront).
    const alreadyPaid = order.paymentStatus === "confirmed";
    const balanceAlreadySettled = ["confirmed", "waived"].includes((order as any).balancePaymentStatus ?? "");
    const paidAmount = parseFloat(String((order as any).paymentUsdAmount ?? "0"));
    // If paidAmount is 0/null the order was manually confirmed — assume fully paid, no balance.
    // Otherwise: payment covers the total if it is within 4% under (crypto rounding) or any amount over.
    const paymentCoversTotal = paidAmount === 0 || paidAmount >= newGrandTotal * 0.96;
    const setAmountDue = alreadyPaid && !balanceAlreadySettled && !paymentCoversTotal;

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

// ─── PUT /api/admin/orders/:id/line-items ────────────────────
router.put("/admin/orders/:id/line-items", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;

  const { lineItems } = req.body ?? {};
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    res.status(400).json({ error: "lineItems must be a non-empty array" });
    return;
  }

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, req.params.id));

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Validate and normalise items
  const validated: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];
  for (const li of lineItems) {
    const qty = parseFloat(String(li.quantity));
    const price = parseFloat(String(li.unitPrice));
    if (!li.productName || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      res.status(400).json({ error: `Invalid line item: ${JSON.stringify(li)}` });
      return;
    }
    validated.push({ productName: String(li.productName).trim(), quantity: qty, unitPrice: price, lineTotal: parseFloat((qty * price).toFixed(2)) });
  }

  // Replace all line items
  await db.delete(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, req.params.id));
  await db.insert(orderLineItemsTable).values(
    validated.map(li => ({
      id: randomUUID(),
      orderId: req.params.id,
      productId: "",
      productName: li.productName,
      quantity: li.quantity.toFixed(2),
      unitPrice: li.unitPrice.toFixed(2),
      lineTotal: li.lineTotal.toFixed(2),
    }))
  );

  // Recalculate order totals
  const productSubtotal = validated.reduce((s, li) => s + li.lineTotal, 0);
  const deliveryPrice = parseFloat(String(existing.deliveryPrice ?? "0"));
  const vendorShipping = parseFloat(String(existing.vendorShipping ?? "0"));
  const tip = parseFloat(String(existing.tip ?? "0"));
  const grandTotal = parseFloat((productSubtotal + deliveryPrice + vendorShipping + tip).toFixed(2));

  const [updated] = await db
    .update(ordersTable)
    .set({ productSubtotal: productSubtotal.toFixed(2), grandTotal: grandTotal.toFixed(2) })
    .where(eq(ordersTable.id, req.params.id))
    .returning();

  const newLineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, req.params.id));

  res.json(fmtOrder(updated as unknown as Record<string, any>, newLineItems as unknown as Record<string, any>[]));
});

// ─── GET /api/admin/orders/:id/routing-history ───────────────
router.get("/admin/orders/:id/routing-history", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(routingHistoryTable)
      .where(eq(routingHistoryTable.orderId, req.params.id))
      .orderBy(asc(routingHistoryTable.createdAt));
    res.json(rows.map(r => ({
      id: r.id,
      orderId: r.orderId,
      changedBy: r.changedBy,
      fromRoutingType: r.fromRoutingType,
      toRoutingType: r.toRoutingType,
      fromReshipperUsername: r.fromReshipperUsername,
      toReshipperUsername: r.toReshipperUsername,
      fromCountryLegId: r.fromCountryLegId,
      toCountryLegId: r.toCountryLegId,
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.createdAt?.toISOString() ?? null,
    })));
  } catch (err) {
    console.error("[admin] GET routing-history error:", err);
    res.status(500).json({ error: "Failed to load routing history" });
  }
});

// ─── Helper: recalc vendor shipping for a single unpaid order ─
// Called automatically when countryLegId changes on a routing update.
// Paid orders (confirmed / test_confirmed) are never touched.
// Returns the updated {vendorShipping, grandTotal} strings, or null if nothing changed.
async function recalcVendorShippingForUnpaidOrder(
  order: Record<string, any>,
  newCountryLegId: string | null,
): Promise<{ vendorShipping: string; grandTotal: string } | null> {
  const PAID = ["confirmed", "test_confirmed"];
  if (PAID.includes(order.paymentStatus ?? "")) return null;
  if (!newCountryLegId || !order.groupBuyId) return null;

  const [leg] = await db
    .select()
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.id, newCountryLegId));
  if (!leg) return null;

  let vendorShipping: number | null = null;

  // Try dynamic path if leg has a wholesale vendor
  if (leg.wholesaleVendorId) {
    const [gbRow] = await db
      .select({ vendorShippingMaxKitsPerPackage: groupBuysTable.vendorShippingMaxKitsPerPackage })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    const maxKitsOverride = gbRow?.vendorShippingMaxKitsPerPackage ?? null;
    const result = await calculateVendorShipping(order.groupBuyId, leg.countryCode, [order.id], "gbp", maxKitsOverride);
    if (result) vendorShipping = result.perOrder.get(order.id) ?? 0;
  }

  // Fall back to fixed leg cost
  if (vendorShipping === null && leg.vendorShippingCost != null) {
    vendorShipping = parseFloat(String(leg.vendorShippingCost));
  }

  if (vendorShipping === null || isNaN(vendorShipping)) return null;

  const productSubtotal = parseFloat(String(order.productSubtotal ?? "0"));
  const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
  const tip = parseFloat(String(order.tip ?? "0"));
  const testingContribution = parseFloat(String(order.testingContribution ?? "0"));
  const couponDiscount = parseFloat(String(order.couponDiscount ?? "0"));
  const grandTotal = Math.max(0, productSubtotal + deliveryPrice + vendorShipping + tip + testingContribution - couponDiscount);

  return {
    vendorShipping: vendorShipping.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  };
}

// ─── PATCH /api/admin/orders/:id/routing ─────────────────────
// Set routingType, reshipperUsername, countryLegId with history log
router.patch("/admin/orders/:id/routing", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { routingType, reshipperUsername, countryLegId, reason, override } = req.body ?? {};
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    if (existing.batchLocked && !override) {
      res.status(409).json({ error: "Order is batch-locked. Provide override=true to force.", locked: true }); return;
    }
    const VALID_ROUTING_TYPES = ["direct", "reshipper", "unrouted"];
    if (routingType !== undefined && !VALID_ROUTING_TYPES.includes(routingType)) {
      res.status(400).json({ error: `routingType must be one of: ${VALID_ROUTING_TYPES.join(", ")}` }); return;
    }
    const updates: Record<string, any> = {};
    if (routingType !== undefined) updates.routingType = routingType;
    if (reshipperUsername !== undefined) updates.reshipperUsername = reshipperUsername || null;
    if (countryLegId !== undefined) updates.countryLegId = countryLegId || null;

    // Auto-recalc vendor shipping for unpaid orders when country leg changes
    const newLegId = countryLegId !== undefined ? (countryLegId || null) : (existing.countryLegId ?? null);
    const legChanged = countryLegId !== undefined && (countryLegId || null) !== (existing.countryLegId ?? null);
    if (legChanged) {
      const shippingRecalc = await recalcVendorShippingForUnpaidOrder(existing as Record<string, any>, newLegId);
      if (shippingRecalc) {
        updates.vendorShipping = shippingRecalc.vendorShipping;
        updates.grandTotal = shippingRecalc.grandTotal;
      }
    }

    const adminWho = getAdminUsername(res) ?? "admin";
    const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, req.params.id)).returning();
    // Write routing history
    await db.insert(routingHistoryTable).values({
      orderId: req.params.id,
      changedBy: adminWho,
      fromRoutingType: existing.routingType ?? null,
      toRoutingType: routingType ?? existing.routingType ?? null,
      fromReshipperUsername: existing.reshipperUsername ?? null,
      toReshipperUsername: reshipperUsername !== undefined ? (reshipperUsername || null) : (existing.reshipperUsername ?? null),
      fromCountryLegId: existing.countryLegId ?? null,
      toCountryLegId: newLegId,
      reason: reason ? String(reason).slice(0, 500) : null,
    });
    const lineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, req.params.id));
    res.json(fmtOrder(updated as unknown as Record<string, any>, lineItems as unknown as Record<string, any>[]));
  } catch (err) {
    console.error("[admin] PATCH routing error:", err);
    res.status(500).json({ error: "Failed to update routing" });
  }
});

// ─── PATCH /api/admin/orders/:id/line-items-draft ────────────
// Auto-save draft line items; clears when committed
router.patch("/admin/orders/:id/line-items-draft", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { lineItems, clear } = req.body ?? {};
    const [existing] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    if (clear) {
      await db.update(ordersTable).set({ draftLineItems: null, draftLineItemsSavedAt: null }).where(eq(ordersTable.id, req.params.id));
      res.json({ ok: true, cleared: true }); return;
    }
    if (!Array.isArray(lineItems)) { res.status(400).json({ error: "lineItems must be an array" }); return; }
    await db.update(ordersTable).set({ draftLineItems: lineItems, draftLineItemsSavedAt: new Date() }).where(eq(ordersTable.id, req.params.id));
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[admin] PATCH line-items-draft error:", err);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// ─── POST /api/admin/orders/:id/balance-resolution ───────────
// Resolve a balance due: action = "absorb" | "request"
router.post("/admin/orders/:id/balance-resolution", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { action, reason } = req.body ?? {};
    if (!["absorb", "request"].includes(action)) {
      res.status(400).json({ error: "action must be absorb or request" }); return;
    }
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    const adminWho = getAdminUsername(res) ?? "admin";
    if (action === "absorb") {
      await db.update(ordersTable).set({ amountDue: "0.00", balancePaymentStatus: "waived" }).where(eq(ordersTable.id, req.params.id));
      await db.insert(routingHistoryTable).values({
        orderId: req.params.id,
        changedBy: adminWho,
        fromRoutingType: existing.routingType ?? null,
        toRoutingType: existing.routingType ?? null,
        fromReshipperUsername: existing.reshipperUsername ?? null,
        toReshipperUsername: existing.reshipperUsername ?? null,
        reason: `Balance absorbed (waived $${existing.amountDue ?? "0"}). ${reason ? reason : ""}`.trim(),
        metadata: { action: "balance_absorbed", previousAmountDue: existing.amountDue },
      });
      res.json({ ok: true, action: "absorbed" });
    } else {
      // "request" — keep amountDue, just log that admin has requested payment
      await db.insert(routingHistoryTable).values({
        orderId: req.params.id,
        changedBy: adminWho,
        fromRoutingType: existing.routingType ?? null,
        toRoutingType: existing.routingType ?? null,
        fromReshipperUsername: existing.reshipperUsername ?? null,
        toReshipperUsername: existing.reshipperUsername ?? null,
        reason: `Balance payment requested ($${existing.amountDue ?? "0"}). ${reason ? reason : ""}`.trim(),
        metadata: { action: "balance_requested", amountDue: existing.amountDue },
      });
      res.json({ ok: true, action: "requested" });
    }
  } catch (err) {
    console.error("[admin] POST balance-resolution error:", err);
    res.status(500).json({ error: "Failed to resolve balance" });
  }
});

// ─── Routing error helper ─────────────────────────────────────
// Catches routing/calculation errors, logs them, and returns a structured shape.
function handleRoutingError(
  err: unknown,
  res: import("express").Response,
  context: { action: string; affectedOrders?: string[]; canRetry?: boolean },
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[admin] routing error [${context.action}]:`, err);
  writeLog("error", "error", context.action, message, {
    affectedOrders: context.affectedOrders,
    stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
  }).catch(() => {});
  res.status(500).json({
    code: context.action,
    message,
    affectedOrders: context.affectedOrders ?? [],
    canRetry: context.canRetry ?? true,
  });
}

// ─── POST /api/admin/orders/bulk-routing ─────────────────────
// Apply routing to multiple orders in one request.
// Body: { orderIds, routingType?, reshipperUsername?, countryLegId?, reason?, force_override? }
router.post("/admin/orders/bulk-routing", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const {
      orderIds,
      routingType,
      reshipperUsername,
      countryLegId,
      reason,
      force_override = false,
    } = req.body ?? {};

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: "orderIds must be a non-empty array" }); return;
    }
    const VALID_ROUTING_TYPES = ["direct", "reshipper", "unrouted"];
    if (routingType !== undefined && !VALID_ROUTING_TYPES.includes(routingType)) {
      res.status(400).json({ error: `routingType must be one of: ${VALID_ROUTING_TYPES.join(", ")}` }); return;
    }

    const adminWho = getAdminUsername(res) ?? "admin";
    const updated: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    const errors: string[] = [];

    for (const orderId of orderIds as string[]) {
      try {
        const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
        if (!existing) { skipped.push({ id: orderId, reason: "not_found" }); continue; }
        if (existing.batchLocked && !force_override) {
          skipped.push({ id: orderId, reason: "batch_locked" }); continue;
        }

        const updates: Record<string, unknown> = {};
        if (routingType !== undefined) updates.routingType = routingType;
        if (reshipperUsername !== undefined) updates.reshipperUsername = reshipperUsername || null;
        if (countryLegId !== undefined) updates.countryLegId = countryLegId || null;

        // Auto-recalc vendor shipping for unpaid orders when country leg changes
        const newLegId = countryLegId !== undefined ? (countryLegId || null) : (existing.countryLegId ?? null);
        const legChanged = countryLegId !== undefined && (countryLegId || null) !== (existing.countryLegId ?? null);
        if (legChanged) {
          const shippingRecalc = await recalcVendorShippingForUnpaidOrder(existing as Record<string, any>, newLegId);
          if (shippingRecalc) {
            updates.vendorShipping = shippingRecalc.vendorShipping;
            updates.grandTotal = shippingRecalc.grandTotal;
          }
        }

        await db.update(ordersTable).set(updates).where(eq(ordersTable.id, orderId));

        await db.insert(routingHistoryTable).values({
          orderId,
          changedBy: adminWho,
          fromRoutingType: existing.routingType ?? null,
          toRoutingType: routingType ?? existing.routingType ?? null,
          fromReshipperUsername: existing.reshipperUsername ?? null,
          toReshipperUsername: reshipperUsername !== undefined ? (reshipperUsername || null) : (existing.reshipperUsername ?? null),
          fromCountryLegId: existing.countryLegId ?? null,
          toCountryLegId: newLegId,
          reason: reason ? String(reason).slice(0, 500) : null,
          metadata: { source: "bulk" },
        });

        updated.push(orderId);
      } catch (err) {
        errors.push(orderId);
        console.error(`[admin] bulk-routing error for order ${orderId}:`, err);
      }
    }

    res.json({ updated, skipped, errors, totalRequested: orderIds.length });
  } catch (err) {
    handleRoutingError(err, res, { action: "bulk_routing" });
  }
});

// ─── POST /api/admin/orders/:id/financial-override ───────────
// Modify financial fields on any order. Requires reason for confirmed-payment orders.
// Writes to routing_history + audit_logs for full audit trail.
router.post("/admin/orders/:id/financial-override", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { fields, reason } = req.body ?? {};
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      res.status(400).json({ error: "fields must be a plain object of financial field overrides" }); return;
    }

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const isPaidOrder = existing.paymentStatus === "confirmed" || existing.paymentStatus === "test_confirmed";
    if (isPaidOrder && !reason) {
      res.status(400).json({ error: "reason is required when overriding financials on a confirmed-payment order" }); return;
    }

    // Whitelist of overridable financial fields
    const ALLOWED_FIELDS = [
      "vendorShipping", "grandTotal", "amountDue", "productSubtotal",
      "deliveryPrice", "tip", "couponDiscount", "creditsApplied",
      "testingContribution", "directShippingCost",
    ] as const;
    type AllowedField = typeof ALLOWED_FIELDS[number];

    const patch: Record<string, unknown> = {};
    const previousValues: Record<string, unknown> = {};

    for (const f of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, f)) {
        const raw = (fields as Record<string, unknown>)[f];
        if (raw === null || raw === undefined) {
          patch[f] = null;
        } else {
          const parsed = parseFloat(String(raw));
          if (isNaN(parsed)) {
            res.status(400).json({ error: `${f} must be a number` }); return;
          }
          patch[f] = parsed.toFixed(2);
        }
        previousValues[f] = (existing as unknown as Record<string, unknown>)[f];
      }
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No valid financial fields provided" }); return;
    }

    const adminWho = getAdminUsername(res) ?? "admin";
    const [updated] = await db
      .update(ordersTable)
      .set(patch)
      .where(eq(ordersTable.id, req.params.id))
      .returning();

    // Write to routing_history
    await db.insert(routingHistoryTable).values({
      orderId: req.params.id,
      changedBy: adminWho,
      fromRoutingType: existing.routingType ?? null,
      toRoutingType: existing.routingType ?? null,
      fromReshipperUsername: existing.reshipperUsername ?? null,
      toReshipperUsername: existing.reshipperUsername ?? null,
      reason: reason ? String(reason).slice(0, 500) : "Financial override (no reason provided)",
      metadata: {
        type: "financial_override",
        fields: Object.keys(patch),
        previousValues,
        newValues: patch,
        isPaidOrder,
      },
    });

    // Write audit log entry (elevated warn level for paid orders)
    await writeLog(
      "change",
      isPaidOrder ? "warn" : "info",
      "financial_override",
      `Admin ${adminWho} overrode financial fields on order #${existing.code}${reason ? `: ${reason}` : ""}`,
      {
        orderId: req.params.id,
        code: existing.code,
        fields: Object.keys(patch),
        previousValues,
        newValues: patch,
        isPaidOrder,
        reason,
      },
    );

    const lineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, req.params.id));
    res.json(fmtOrder(updated as unknown as Record<string, any>, lineItems as unknown as Record<string, any>[]));
  } catch (err) {
    handleRoutingError(err, res, { action: "financial_override", affectedOrders: [req.params.id] });
  }
});

// ─── GET /api/admin/group-buys/:gbId/routing-warnings ────────
// Returns a structured warning panel for the fulfillment board.
router.get("/admin/group-buys/:gbId/routing-warnings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const gbId = String(req.params["gbId"]);

    const [gb] = await db
      .select({ id: groupBuysTable.id, name: groupBuysTable.name })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));
    if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

    // Base order conditions for this GB (exclude deleted)
    const baseWhere = and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt));

    // 1. Legacy orders — routingType IS NULL
    const legacyOrders = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(and(baseWhere, isNull(ordersTable.routingType)));

    // 2. Unresolved balances — amountDue > 0 and not confirmed/waived
    const unresolvedBalances = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        amountDue: ordersTable.amountDue,
        balancePaymentStatus: ordersTable.balancePaymentStatus,
      })
      .from(ordersTable)
      .where(
        and(
          baseWhere,
          gt(ordersTable.amountDue, "0"),
          sql`(${ordersTable.balancePaymentStatus} IS NULL OR ${ordersTable.balancePaymentStatus} NOT IN ('confirmed', 'test_confirmed', 'waived'))`,
        ),
      );

    // 3. Orders amended after batch lock
    const amendedAfterBatchLock = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        batchLockedAt: ordersTable.batchLockedAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .where(
        and(
          baseWhere,
          eq(ordersTable.batchLocked, true),
          isNotNull(ordersTable.batchLockedAt),
          sql`${ordersTable.updatedAt} > ${ordersTable.batchLockedAt}`,
        ),
      );

    // 4. Missing wholesale prices — legs with wholesaleVendorId set
    //    (we flag the leg if there's no intl_shipping_rate for gbId+countryCode)
    const legs = await db
      .select({
        id: gbCountryLegsTable.id,
        countryCode: gbCountryLegsTable.countryCode,
        countryName: gbCountryLegsTable.countryName,
        wholesaleVendorId: gbCountryLegsTable.wholesaleVendorId,
      })
      .from(gbCountryLegsTable)
      .where(and(eq(gbCountryLegsTable.gbId, gbId), isNotNull(gbCountryLegsTable.wholesaleVendorId)));

    const missingWholesalePrices: { legId: string; countryCode: string; countryName: string }[] = [];
    if (legs.length > 0) {
      for (const leg of legs) {
        const [rate] = await db
          .select({ id: intlShippingRatesTable.id })
          .from(intlShippingRatesTable)
          .where(
            and(
              eq(intlShippingRatesTable.groupBuyId, gbId),
              eq(intlShippingRatesTable.country, leg.countryCode),
              eq(intlShippingRatesTable.active, true),
            ),
          )
          .limit(1);
        if (!rate) {
          missingWholesalePrices.push({ legId: leg.id, countryCode: leg.countryCode, countryName: leg.countryName });
        }
      }
    }

    // 5. Capacity alerts — recent audit_log entries
    const capacityAlerts = await db
      .select({
        id: auditLogsTable.id,
        message: auditLogsTable.message,
        metadata: auditLogsTable.metadata,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.action, "reshipper_capacity_reached"),
          sql`${auditLogsTable.metadata}->>'gbId' = ${gbId}`,
        ),
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(20);

    res.json({
      gbId,
      gbName: gb.name,
      legacyOrders: {
        count: legacyOrders.length,
        orders: legacyOrders.map(o => ({
          id: o.id,
          code: o.code,
          username: o.telegramUsername,
          createdAt: o.createdAt?.toISOString() ?? null,
        })),
      },
      unresolvedBalances: {
        count: unresolvedBalances.length,
        orders: unresolvedBalances.map(o => ({
          id: o.id,
          code: o.code,
          username: o.telegramUsername,
          amountDue: parseFloat(String(o.amountDue ?? "0")),
          balancePaymentStatus: o.balancePaymentStatus ?? null,
        })),
      },
      amendedAfterBatchLock: {
        count: amendedAfterBatchLock.length,
        orders: amendedAfterBatchLock.map(o => ({
          id: o.id,
          code: o.code,
          username: o.telegramUsername,
          batchLockedAt: o.batchLockedAt?.toISOString() ?? null,
          updatedAt: o.updatedAt?.toISOString() ?? null,
        })),
      },
      missingWholesalePrices,
      capacityAlerts: capacityAlerts.map(a => ({
        id: a.id,
        message: a.message,
        metadata: a.metadata,
        createdAt: a.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    handleRoutingError(err, res, { action: "routing_warnings" });
  }
});

// ─── FS3 Costs CRUD ───────────────────────────────────────────
// GET: returns all entries; seeds defaults if table is empty
router.get("/admin/fs3-costs", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  let rows = await db.select().from(fs3CostsTable).orderBy(fs3CostsTable.productName);
  if (rows.length === 0) {
    const seeds = Object.entries(FS3_DEFAULT_COSTS).map(([productName, unitCost]) => ({
      productName,
      unitCost: unitCost.toFixed(2),
    }));
    await db.insert(fs3CostsTable).values(seeds).onConflictDoNothing();
    rows = await db.select().from(fs3CostsTable).orderBy(fs3CostsTable.productName);
  }
  res.json(rows.map(r => ({ id: r.id, productName: r.productName, unitCost: parseFloat(String(r.unitCost)) })));
});

// POST: upsert a single entry
router.post("/admin/fs3-costs", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const productName = String(req.body?.productName ?? "").trim().slice(0, 200);
  const unitCost = parseFloat(String(req.body?.unitCost ?? ""));
  if (!productName) { res.status(400).json({ error: "productName required" }); return; }
  if (isNaN(unitCost) || unitCost < 0) { res.status(400).json({ error: "unitCost must be a non-negative number" }); return; }
  const [row] = await db
    .insert(fs3CostsTable)
    .values({ productName, unitCost: unitCost.toFixed(2) })
    .onConflictDoUpdate({ target: fs3CostsTable.productName, set: { unitCost: unitCost.toFixed(2) } })
    .returning();
  res.json({ id: row.id, productName: row.productName, unitCost: parseFloat(String(row.unitCost)) });
});

// DELETE: remove a single entry by id
router.delete("/admin/fs3-costs/:id", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(fs3CostsTable).where(eq(fs3CostsTable.id, id));
  res.json({ ok: true });
});

// DELETE /admin/fs3-costs — wipe all entries (next GET re-seeds from defaults)
router.delete("/admin/fs3-costs", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  await db.delete(fs3CostsTable);
  res.json({ ok: true });
});

// ─── FS3 Summary (admin-secret only) ─────────────────────────
router.get("/admin/fs3-summary", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;

  const countryParam = req.query.country as string | undefined;
  const routingTypeParam = req.query.routingType as string | undefined;
  const groupBuyIdParam = req.query.groupBuyId as string | undefined;
  const vendorParam = req.query.vendor as string | undefined;

  // Return group summary for all non-cancelled statuses, with full order breakdown
  let allOrders = await db
    .select()
    .from(ordersTable)
    .where(and(inArray(ordersTable.status, ["Submitted", "Processing", "Shipped", "Completed"]), isNull(ordersTable.deletedAt)));

  // Filter by routing type if requested
  if (routingTypeParam && routingTypeParam !== "all") {
    if (routingTypeParam === "reshipper") {
      const gbReshipperPairs = await db
        .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country })
        .from(gbReshippersTable);
      const gbPairSet = new Set(gbReshipperPairs.map(p => `${p.gbId}::${p.country}`));
      allOrders = allOrders.filter(o =>
        o.routingType === "reshipper" ||
        o.reshipperUsername != null ||
        (o.groupBuyId && o.shippingCountry && gbPairSet.has(`${o.groupBuyId}::${o.shippingCountry}`))
      );
    } else if (routingTypeParam === "direct") {
      allOrders = allOrders.filter(o => o.routingType === routingTypeParam);
    } else if (routingTypeParam === "wholesale") {
      allOrders = allOrders.filter(o => o.orderType === "wholesale");
    } else if (routingTypeParam === "shared") {
      allOrders = allOrders.filter(o => o.orderType === "wholesale_shared");
    }
  }

  // Filter by country if requested (matches shipping_country or account country)
  if (countryParam) {
    const countries = countryParam.split(",").filter(Boolean);
    if (countries.length > 0) {
      const accountRows = await db.select({ telegramUsername: accountsTable.telegramUsername, country: accountsTable.country }).from(accountsTable);
      const accountCountryMap = new Map<string, string>();
      for (const a of accountRows) {
        if (a.telegramUsername && a.country) accountCountryMap.set(a.telegramUsername.replace(/^@/, "").toLowerCase(), normalizeCountry(a.country));
      }
      allOrders = allOrders.filter((o) => {
        const shipCountry = normalizeCountry(o.shippingCountry ?? "");
        if (shipCountry && countries.includes(shipCountry)) return true;
        const tg = (o.telegramUsername ?? "").replace(/^@/, "").toLowerCase();
        const acctCountry = accountCountryMap.get(tg) ?? "";
        return !!(acctCountry && countries.includes(acctCountry));
      });
    }
  }

  // Snapshot orders here (after routing/country filter) for building dropdown lists.
  // GB and vendor filters are applied AFTER this point so the dropdowns stay fully populated.
  const ordersForDropdowns = allOrders;

  // Apply group buy filter (affects rows + totals; dropdowns still use ordersForDropdowns)
  if (groupBuyIdParam) {
    allOrders = allOrders.filter(o => o.groupBuyId === groupBuyIdParam);
  }

  if (allOrders.length === 0 && !vendorParam) {
    res.json({ rows: [], totals: { revenue: 0, productSubtotal: 0, deliveryRevenue: 0, vendorShipping: 0, tips: 0, orderCount: 0 }, groupBuys: [], vendors: [] });
    return;
  }

  // Fetch group buy metadata for the DROPDOWN from the pre-filter snapshot
  const dropdownGbIds = [...new Set(ordersForDropdowns.map((o) => o.groupBuyId).filter(Boolean))] as string[];
  const allGbRecords = dropdownGbIds.length > 0
    ? await db
        .select({
          id: groupBuysTable.id,
          name: groupBuysTable.name,
          manufacturer: groupBuysTable.manufacturer,
          vendorShippingAmount: groupBuysTable.vendorShippingAmount,
          vendorShippingKits: groupBuysTable.vendorShippingKits,
          vendorShippingMaxKitsPerPackage: groupBuysTable.vendorShippingMaxKitsPerPackage,
        })
        .from(groupBuysTable)
        .where(inArray(groupBuysTable.id, dropdownGbIds))
    : [];
  // gbMap for resolving vendor names — built from all GB records
  const gbMap = new Map(allGbRecords.map((g) => [g.id, { name: g.name, vendor: g.manufacturer ?? null }]));

  // Fetch line items for the currently filtered orders (after GB filter)
  const orderIds = allOrders.map((o) => o.id);
  const allLineItems = orderIds.length > 0
    ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];

  // Build order → GB lookup
  const orderGbMap = new Map(allOrders.map((o) => [o.id, o.groupBuyId ?? null]));

  // Look up vendor from the products table (for non-GB orders)
  const productIds = [...new Set(allLineItems.map((li) => li.productId).filter(Boolean))] as string[];
  const productRecords = productIds.length > 0
    ? await db.select({ id: productsTable.id, vendor: productsTable.vendor, stock: productsTable.stock, lowStockThreshold: productsTable.lowStockThreshold })
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
    : [];
  const productVendorMap = new Map(productRecords.map((p) => [p.id, p.vendor ?? null]));
  const productStockMap = new Map(productRecords.map((p) => [p.id, { stock: p.stock ?? null, lowStockThreshold: p.lowStockThreshold ?? null }]));

  // Helper: resolve vendor for a line item.
  // Product-table vendor takes precedence so the same product always maps to the
  // same vendor string regardless of which GB (if any) the order belongs to.
  const resolveVendor = (li: { orderId: string; productId: string }) => {
    const gbId = orderGbMap.get(li.orderId) ?? null;
    const gb = gbId ? gbMap.get(gbId) : undefined;
    return productVendorMap.get(li.productId) ?? gb?.vendor ?? null;
  };

  // Apply vendor filter (after productVendorMap is built)
  // vendorLineItems  — only the line items that belong to the vendor (for rows + productSubtotal)
  // filteredLineItems — all line items from orders that contain the vendor (for delivery/tips attribution)
  let filteredLineItems = allLineItems;
  let vendorLineItems = allLineItems;
  if (vendorParam) {
    const vLower = vendorParam.toLowerCase();
    const orderHasVendor = new Set<string>();
    const vendorLiIds = new Set<string>();
    for (const li of allLineItems) {
      const vendor = resolveVendor(li);
      if (vendor && vendor.toLowerCase() === vLower) {
        orderHasVendor.add(li.orderId);
        vendorLiIds.add(li.id);
      }
    }
    allOrders = allOrders.filter(o => orderHasVendor.has(o.id));
    filteredLineItems = allLineItems.filter(li => orderHasVendor.has(li.orderId));
    vendorLineItems = allLineItems.filter(li => vendorLiIds.has(li.id));
  }

  if (allOrders.length === 0) {
    res.json({ rows: [], totals: { revenue: 0, productSubtotal: 0, deliveryRevenue: 0, vendorShipping: 0, tips: 0, orderCount: 0 }, groupBuys: [], vendors: [] });
    return;
  }

  // Build product map from vendor-only line items (rows & productSubtotal must not include
  // revenue from other vendors that happen to share an order with a vendor-matched product)
  const productMap = new Map<string, {
    name: string; productId: string | null; groupBuyId: string | null; groupBuyName: string | null;
    vendor: string | null; totalQty: number; totalRevenue: number;
    stock: number | null; lowStockThreshold: number | null;
  }>();

  for (const li of vendorLineItems) {
    const gbId = orderGbMap.get(li.orderId) ?? null;
    const gb = gbId ? gbMap.get(gbId) : undefined;
    const vendor = productVendorMap.get(li.productId) ?? gb?.vendor ?? null;
    // Key by normalised product name ONLY (no vendor, no productId).
    // Including vendor in the key caused every product to appear twice:
    // GB orders resolved vendor from gb.manufacturer while standalone orders
    // resolved from products.vendor — even for the same physical product.
    // Vendor filtering is already handled by resolveVendor() above, so the
    // key only needs to guarantee one row per distinct product name.
    const key = li.productName.toLowerCase().trim();
    const qty = parseFloat(String(li.quantity));
    const lineTotal = parseFloat(String(li.lineTotal));
    if (!productMap.has(key)) {
      const stockInfo = li.productId ? productStockMap.get(li.productId) : undefined;
      productMap.set(key, {
        name: li.productName,
        productId: li.productId ?? null,
        groupBuyId: gbId,
        groupBuyName: gb?.name ?? null,
        vendor,
        totalQty: 0,
        totalRevenue: 0,
        stock: stockInfo?.stock ?? null,
        lowStockThreshold: stockInfo?.lowStockThreshold ?? null,
      });
    } else {
      // If this line item comes from a different GB context than the existing row,
      // clear the GB fields — the merged row spans multiple contexts.
      const entry = productMap.get(key)!;
      if (entry.groupBuyId !== gbId) {
        entry.groupBuyId = null;
        entry.groupBuyName = null;
      }
    }
    const entry = productMap.get(key)!;
    entry.totalQty += qty;
    entry.totalRevenue += lineTotal;
  }

  // productSubtotal is summed from vendorLineItems so it only counts the vendor's own products.
  // delivery/vendorShipping/tips are order-level — attributed to the vendor for any order they appear in.
  // totalRevenue (grandTotal) is order-level for informational use; use productSubtotal for revenue comparisons.
  const totalRevenue = allOrders.reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
  const totalDelivery = allOrders.reduce((s, o) => s + parseFloat(String(o.deliveryPrice ?? "0")), 0);
  const totalVendor = allOrders.reduce((s, o) => s + parseFloat(String(o.vendorShipping ?? "0")), 0);
  const totalTips = allOrders.reduce((s, o) => s + parseFloat(String(o.tip ?? "0")), 0);
  const productSubtotalTotal = vendorLineItems.reduce((s, li) => s + parseFloat(String(li.lineTotal ?? "0")), 0);

  const rows = Array.from(productMap.values());
  rows.sort((a, b) => a.name.localeCompare(b.name));

  // Dropdowns built from pre-GB/vendor-filter snapshot so the selects stay fully populated
  const groupBuys = allGbRecords
    .map((g) => ({
      id: g.id,
      name: g.name,
      vendorShippingAmount: g.vendorShippingAmount != null ? parseFloat(String(g.vendorShippingAmount)) : null,
      vendorShippingKits: g.vendorShippingKits ?? null,
      vendorShippingMaxKitsPerPackage: g.vendorShippingMaxKitsPerPackage ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const vendors = [...new Set(rows.map(r => r.vendor).filter(Boolean) as string[])].sort();

  res.json({
    rows,
    totals: {
      revenue: totalRevenue,
      productSubtotal: productSubtotalTotal,
      deliveryRevenue: totalDelivery,
      vendorShipping: totalVendor,
      tips: totalTips,
      orderCount: allOrders.length,
    },
    groupBuys,
    vendors,
  });
});

// ─── POST /api/admin/fs3-ping-address ────────────────────────────────────────
// Finds orders in a GB that are missing a delivery address, applies optional
// exclusion / courier filters, and sends each holder a Telegram nudge with
// a link to add their delivery details.
router.post("/admin/fs3-ping-address", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;

  const {
    gbId,
    excludeDeliveryMethods = [],
    excludeCountries = [],
    excludeUsernames = [],
    courierFilter = [],
    dryRun = false,
    message: customMessage,
  } = req.body as {
    gbId: string;
    excludeDeliveryMethods?: string[];
    excludeCountries?: string[];
    excludeUsernames?: string[];
    courierFilter?: string[];
    dryRun?: boolean;
    message?: string;
  };

  if (!gbId) { res.status(400).json({ error: "gbId is required" }); return; }

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId))
    .limit(1);
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Orders in this GB with no / empty shipping address, non-deleted, active statuses
  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      deliveryMethod: ordersTable.deliveryMethod,
      shippingCountry: ordersTable.shippingCountry,
      shippingAddress: ordersTable.shippingAddress,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      isNull(ordersTable.deletedAt),
      inArray(ordersTable.status, ["Submitted", "Processing"]),
      or(
        isNull(ordersTable.shippingAddress),
        sql`trim(coalesce(${ordersTable.shippingAddress}, '')) = ''`,
      ),
    ));

  // Courier filter — if set, ONLY include orders with these delivery methods
  let filtered = orders;
  if (courierFilter.length > 0) {
    const couriers = new Set(courierFilter.map((s: string) => s.toLowerCase()));
    filtered = filtered.filter(o => couriers.has((o.deliveryMethod ?? "").toLowerCase()));
  }

  // Exclusion filters
  if (excludeDeliveryMethods.length > 0) {
    const excluded = new Set(excludeDeliveryMethods.map((s: string) => s.toLowerCase()));
    filtered = filtered.filter(o => !excluded.has((o.deliveryMethod ?? "").toLowerCase()));
  }
  if (excludeCountries.length > 0) {
    const excluded = new Set(excludeCountries.map((s: string) => s.toLowerCase()));
    filtered = filtered.filter(o => !excluded.has((o.shippingCountry ?? "").toLowerCase()));
  }
  if (excludeUsernames.length > 0) {
    const excluded = new Set(excludeUsernames.map((u: string) => u.replace(/^@/, "").toLowerCase()));
    filtered = filtered.filter(o => !excluded.has(o.telegramUsername.replace(/^@/, "").toLowerCase()));
  }

  const recipients = filtered.map(o => ({
    username: o.telegramUsername,
    code: o.code,
    deliveryMethod: o.deliveryMethod ?? null,
    country: o.shippingCountry ?? null,
    status: o.status,
  }));

  if (dryRun) {
    res.json({ recipients, total: recipients.length });
    return;
  }

  // Resolve chat IDs
  const usernames = [...new Set(filtered.map(o => o.telegramUsername.replace(/^@/, "").toLowerCase()))];
  const accountRows = usernames.length > 0
    ? await db
        .select({ telegramUsername: accountsTable.telegramUsername, chatId: accountsTable.telegramChatId })
        .from(accountsTable)
        .where(inArray(accountsTable.telegramUsername, usernames))
    : [];
  const chatIdMap = new Map(accountRows.map(a => [a.telegramUsername.toLowerCase(), a.chatId]));

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let sent = 0;
  let failed = 0;

  for (const o of filtered) {
    const bare = o.telegramUsername.replace(/^@/, "").toLowerCase();
    const chatId = chatIdMap.get(bare);
    if (!chatId) { failed++; continue; }

    const text = customMessage
      ? customMessage
          .replace(/\{username\}/g, bare)
          .replace(/\{code\}/g, o.code)
          .replace(/\{gb_name\}/g, gb.name)
          .replace(/\{app_url\}/g, appUrl)
      : `📦 <b>Delivery address needed</b>\n\nHi @${esc(bare)}! We still need your delivery address for your <b>${esc(gb.name)}</b> order.\n\nRef: <code>${esc(o.code)}</code>${o.deliveryMethod ? ` · ${esc(o.deliveryMethod)}` : ""}\n\nPlease open your order and add your delivery details:\n👉 ${appUrl}/lookup\n\n<i>Your order code: <code>${esc(o.code)}</code></i>`;

    const ok = await sendTelegramMessage(chatId, text, "HTML").catch(() => false);
    ok ? sent++ : failed++;
  }

  res.json({ ok: true, sent, failed, total: filtered.length, recipients });
});

// ─── POST /api/admin/group-buys/:gbId/fs3-generate ───────────────────────────
// Builds routing-aware batch sheets (per reshipper + direct) from confirmed orders.
// Returns a preview; nothing is written to DB yet — that happens on fs3-submit.
router.post("/admin/group-buys/:gbId/fs3-generate", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  try {
    // Fetch all non-deleted, non-cancelled orders for this GB with their line items
    const orders = await db
      .select({
        id: ordersTable.id,
        telegramUsername: ordersTable.telegramUsername,
        status: ordersTable.status,
        paymentStatus: ordersTable.paymentStatus,
        routingType: ordersTable.routingType,
        reshipperUsername: ordersTable.reshipperUsername,
        directShippingRequested: ordersTable.directShippingRequested,
        batchLocked: ordersTable.batchLocked,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.groupBuyId, gbId),
          isNull(ordersTable.deletedAt),
          notInArray(ordersTable.status, ["Cancelled"]),
        )
      );

    if (orders.length === 0) {
      res.status(400).json({ error: "No eligible orders found for this group buy" });
      return;
    }

    const orderIds = orders.map(o => o.id);
    const lineItems = await db
      .select({
        orderId: orderLineItemsTable.orderId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
      })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    // Build a map: orderId → line items
    const itemsByOrder = new Map<string, { productName: string; quantity: number }[]>();
    for (const li of lineItems) {
      if (!itemsByOrder.has(li.orderId)) itemsByOrder.set(li.orderId, []);
      itemsByOrder.get(li.orderId)!.push({ productName: li.productName, quantity: li.quantity });
    }

    // Fetch cost prices for P&L
    const costRows = await db.select().from(fs3CostsTable);
    const costMap = new Map(costRows.map(c => [c.productName.toLowerCase(), parseFloat(String(c.unitCost ?? "0"))]));

    // Resolve routing destination for each order (same logic as frontend)
    const getRoute = (o: typeof orders[number]): string => {
      const rt = o.routingType;
      if (rt === "direct") return "direct";
      if (rt === "unrouted") return "unrouted";
      if (rt === "reshipper") return o.reshipperUsername ? `reshipper:${o.reshipperUsername.replace(/^@/, "")}` : "reshipper:unassigned";
      // Legacy fallback
      if (o.directShippingRequested) return "direct";
      if (o.reshipperUsername) return `reshipper:${o.reshipperUsername.replace(/^@/, "")}`;
      return "unrouted";
    };

    // Aggregate: route → product → quantity
    const routeProducts = new Map<string, Map<string, number>>();
    const routeOrders = new Map<string, string[]>(); // route → order IDs included

    for (const order of orders) {
      const route = getRoute(order);
      const items = itemsByOrder.get(order.id) ?? [];
      if (items.length === 0) continue;

      if (!routeProducts.has(route)) {
        routeProducts.set(route, new Map());
        routeOrders.set(route, []);
      }
      routeOrders.get(route)!.push(order.id);
      const pm = routeProducts.get(route)!;
      for (const li of items) {
        pm.set(li.productName, (pm.get(li.productName) ?? 0) + li.quantity);
      }
    }

    // Build ordered sheets: direct → reshippers (alpha) → unrouted
    const allRoutes = [...routeProducts.keys()];
    const orderedRoutes = [
      ...allRoutes.filter(r => r === "direct"),
      ...allRoutes.filter(r => r.startsWith("reshipper:")).sort(),
      ...allRoutes.filter(r => r === "unrouted"),
    ];

    const labelForRoute = (r: string): string => {
      if (r === "direct") return "Direct Shipping";
      if (r === "unrouted") return "Unrouted";
      return `Reshipper: @${r.replace("reshipper:", "")}`;
    };
    const typeForRoute = (r: string): string => {
      if (r === "direct") return "direct";
      if (r === "unrouted") return "unrouted";
      return "reshipper";
    };

    const sheets = orderedRoutes.map(route => {
      const pm = routeProducts.get(route)!;
      const products = Array.from(pm.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, qty]) => ({
          name,
          qty,
          unitCost: costMap.get(name.toLowerCase()) ?? null,
        }));
      return {
        route,
        label: labelForRoute(route),
        type: typeForRoute(route),
        orderCount: (routeOrders.get(route) ?? []).length,
        products,
      };
    });

    const totalOrders = orders.length;
    const totalProducts = sheets.reduce((s, sh) => s + sh.products.reduce((ps, p) => ps + p.qty, 0), 0);

    res.json({
      batchId: null, // not yet persisted
      totalOrders,
      totalProducts,
      sheets: sheets.map(s => ({ route: s.route, label: s.label, type: s.type, count: s.orderCount, products: s.products })),
      // Legacy shape the frontend uses for the submit pill
      _sheetsLegacy: sheets.map(s => ({ route: s.label, count: s.orderCount })),
    });
  } catch (err) {
    console.error("[fs3-generate]", err);
    res.status(500).json({ error: "Failed to generate batch sheets" });
  }
});

// ─── POST /api/admin/group-buys/:gbId/fs3-submit ─────────────────────────────
// Persists the batch to fs3_submissions and batch-locks the included orders.
router.post("/admin/group-buys/:gbId/fs3-submit", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;
  const { sheets, notes } = req.body as {
    sheets: { label: string; type: string; orderCount: number; route?: string; products?: { name: string; qty: number; unitCost: number | null }[] }[];
    notes?: string;
  };

  if (!Array.isArray(sheets) || sheets.length === 0) {
    res.status(400).json({ error: "sheets is required and must be non-empty" });
    return;
  }

  try {
    // Re-fetch orders to lock them (re-derive to avoid stale client data)
    const orders = await db
      .select({
        id: ordersTable.id,
        routingType: ordersTable.routingType,
        reshipperUsername: ordersTable.reshipperUsername,
        directShippingRequested: ordersTable.directShippingRequested,
        batchLocked: ordersTable.batchLocked,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.groupBuyId, gbId),
          isNull(ordersTable.deletedAt),
          notInArray(ordersTable.status, ["Cancelled"]),
        )
      );

    // Only lock orders that aren't already locked
    const tolock = orders.filter(o => !o.batchLocked).map(o => o.id);

    if (tolock.length > 0) {
      await db
        .update(ordersTable)
        .set({ batchLocked: true, batchLockedAt: new Date() })
        .where(inArray(ordersTable.id, tolock));
    }

    // Build the snapshot from the sheets payload (products may or may not be present)
    const batchSnapshot = sheets.map(s => ({
      route: s.route ?? s.label,
      label: s.label,
      type: s.type,
      orderCount: s.orderCount,
      products: s.products ?? [],
    }));

    const submissionId = randomUUID();
    await db.insert(fs3SubmissionsTable).values({
      id: submissionId,
      gbId,
      submittedBy: "admin",
      totalOrders: orders.length,
      processedCount: tolock.length,
      includeUnconfirmed: "false",
      notes: notes ?? null,
      sheets: sheets.map(s => ({ label: s.label, type: s.type, orderCount: s.orderCount })),
      batchSnapshot,
      status: "submitted",
    });

    await writeLog("change", "info", "fs3_batch_submit", `FS3 batch submitted for GB ${gbId}: ${tolock.length} orders locked across ${sheets.length} sheet(s)`, { gbId, submissionId, lockedCount: tolock.length });

    res.json({
      ok: true,
      submissionId,
      lockedCount: tolock.length,
      totalOrders: orders.length,
      sheets: sheets.length,
    });
  } catch (err) {
    console.error("[fs3-submit]", err);
    res.status(500).json({ error: "Failed to submit batch" });
  }
});

// ─── GET /api/admin/group-buys/:gbId/fs3-submissions ─────────────────────────
// Returns all batch submission records for a group buy (newest first).
router.get("/admin/group-buys/:gbId/fs3-submissions", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { gbId } = req.params;

  try {
    const rows = await db
      .select()
      .from(fs3SubmissionsTable)
      .where(eq(fs3SubmissionsTable.gbId, gbId))
      .orderBy(desc(fs3SubmissionsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error("[fs3-submissions]", err);
    res.status(500).json({ error: "Failed to fetch batch history" });
  }
});

// ─── Tips breakdown ──────────────────────────────────────────
router.get("/admin/tips-breakdown", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const { gbId, status } = req.query;
  if (!gbId || typeof gbId !== "string") {
    res.status(400).json({ error: "gbId is required" });
    return;
  }

  let query = db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      tip: ordersTable.tip,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.groupBuyId, gbId),
        sql`${ordersTable.tip} > 0`,
        isNull(ordersTable.deletedAt),
        ...(status && status !== "all"
          ? [eq(ordersTable.status, status as string)]
          : [notInArray(ordersTable.status, ["Cancelled"])]),
      )
    )
    .$dynamic();

  const rows = await query.orderBy(desc(ordersTable.tip));

  const total = rows.reduce((s, r) => s + parseFloat(String(r.tip ?? "0")), 0);

  res.json({
    total: parseFloat(total.toFixed(2)),
    tippers: rows.map(r => ({
      telegramUsername: r.telegramUsername,
      code: r.code,
      tip: parseFloat(String(r.tip ?? "0")),
      status: r.status,
      paymentStatus: r.paymentStatus ?? "unpaid",
    })),
  });
});

// ─── Notifications ───────────────────────────────────────────
router.get("/admin/notifications", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "notifications"));
    const notifications = row[0]?.value ? JSON.parse(row[0].value) : [];
    res.json(notifications);
  } catch { res.json([]); }
});

router.post("/admin/notifications", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { text, active = true } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: "Text is required" }); return; }
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "notifications"));
    const existing = row[0]?.value ? JSON.parse(row[0].value) : [];
    const newNotif = { id: randomUUID(), text: text.trim(), active, createdAt: new Date().toISOString() };
    existing.push(newNotif);
    await db.insert(siteConfigTable).values({ key: "notifications", value: JSON.stringify(existing) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(existing) } });
    res.json(newNotif);
  } catch (e) { res.status(500).json({ error: "Failed to save notification" }); }
});

router.patch("/admin/notifications/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { active } = req.body;
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "notifications"));
    const existing: any[] = row[0]?.value ? JSON.parse(row[0].value) : [];
    const updated = existing.map(n => n.id === id ? { ...n, active: !!active } : n);
    await db.insert(siteConfigTable).values({ key: "notifications", value: JSON.stringify(updated) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(updated) } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

router.delete("/admin/notifications/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "notifications"));
    const existing: any[] = row[0]?.value ? JSON.parse(row[0].value) : [];
    const filtered = existing.filter(n => n.id !== id);
    await db.insert(siteConfigTable).values({ key: "notifications", value: JSON.stringify(filtered) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(filtered) } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// ─── Group Buy End Date ───────────────────────────────────────
router.get("/admin/group-buy-date", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "group_buy_end_date"));
    res.json({ date: row[0]?.value || null });
  } catch { res.json({ date: null }); }
});

router.put("/admin/group-buy-date", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { date } = req.body;
  try {
    await db.insert(siteConfigTable).values({ key: "group_buy_end_date", value: date || null })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: date || null } });
    res.json({ ok: true, date });
  } catch { res.status(500).json({ error: "Failed to save date" }); }
});

// ─── Public: group buy date + notifications ───────────────────
router.get("/public/group-buy-date", async (req, res): Promise<void> => {
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "group_buy_end_date"));
    res.json({ date: row[0]?.value || null });
  } catch { res.json({ date: null }); }
});

router.get("/public/notifications", async (req, res): Promise<void> => {
  try {
    const row = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "notifications"));
    const all: any[] = row[0]?.value ? JSON.parse(row[0].value) : [];
    res.json(all.filter((n: any) => n.active));
  } catch { res.json([]); }
});

// ─── GET /api/admin/customers/:username — full customer profile ───────────────
router.get("/admin/customers/:username", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = decodeURIComponent(req.params.username);

    // Try both @username and username (without @) so mixed-format data always matches
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

    // Orders + line items for this customer (exclude soft-deleted orders)
    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(
        or(eq(ordersTable.telegramUsername, username), eq(ordersTable.telegramUsername, altUsername)),
        isNull(ordersTable.deletedAt),
      ))
      .orderBy(desc(ordersTable.createdAt));

    const lineItems = orders.length > 0
      ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orders.map(o => o.id)))
      : [];

    // Fetch group buy names for any GB orders
    const gbIds = [...new Set(orders.map(o => o.groupBuyId).filter(Boolean))] as string[];
    const gbNames: Record<string, string> = {};
    if (gbIds.length > 0) {
      const gbs = await db.select({ id: groupBuysTable.id, name: groupBuysTable.name })
        .from(groupBuysTable)
        .where(inArray(groupBuysTable.id, gbIds));
      for (const gb of gbs) gbNames[gb.id] = gb.name;
    }

    const ordersWithItems = orders.map(o => ({
      ...o,
      groupBuyName: o.groupBuyId ? (gbNames[o.groupBuyId] ?? null) : null,
      lineItems: lineItems.filter(li => li.orderId === o.id),
    }));

    // Audit logs that mention this username in message or metadata
    const term = `%${username.replace(/^@/, "")}%`;
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(ilike(auditLogsTable.message, term))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(80);

    // Customer profile details
    const [customerDetails] = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, username));

    // Account details
    const [account] = await db.select().from(accountsTable).where(
      or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername))
    );

    // Blood test sessions
    const bloodTestSessions = await db.select().from(bloodTestSessionsTable).where(
      or(eq(bloodTestSessionsTable.telegramUsername, username), eq(bloodTestSessionsTable.telegramUsername, altUsername))
    ).orderBy(desc(bloodTestSessionsTable.testDate));

    const bloodTestValues = bloodTestSessions.length > 0
      ? await db.select().from(bloodTestValuesTable).where(inArray(bloodTestValuesTable.sessionId, bloodTestSessions.map(s => s.id)))
      : [];

    const bloodTests = bloodTestSessions.map(s => ({
      ...s,
      values: bloodTestValues.filter(v => v.sessionId === s.id),
    }));

    const logsWithGeo = await enrichLogsWithGeo(logs);
    res.json({ orders: ordersWithItems, logs: logsWithGeo, customerDetails: customerDetails ?? null, account: account ?? null, bloodTests });
  } catch (err) {
    console.error("[admin/customers/:username]", err);
    res.status(500).json({ error: "Failed to fetch customer profile" });
  }
});

// ─── POST /api/admin/customers/:username/send-message — DM a member via the bot ─
router.post("/admin/customers/:username/send-message", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = decodeURIComponent(req.params.username);
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

    const { message } = req.body as { message?: string };
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const [account] = await db
      .select({ telegramUsername: accountsTable.telegramUsername, telegramChatId: accountsTable.telegramChatId })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

    if (!account) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    if (!account.telegramChatId) {
      res.status(400).json({ error: "Member hasn't linked their Telegram account, so the bot can't message them." });
      return;
    }

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const text = escapeHtml(message.trim().slice(0, 2000));
    const fullText = `💬 <b>Message from Salts &amp; Peps Admin</b>\n\n${text}`;

    const ok = await sendTelegramMessage(account.telegramChatId, fullText, "HTML", {
      recipientType: "user",
      recipientUsername: account.telegramUsername,
    });

    if (!ok) {
      res.status(502).json({ error: "Failed to send message via Telegram. Please try again." });
      return;
    }

    writeLog("change", "info", "admin_member_message_sent",
      `Admin sent a direct message to member @${account.telegramUsername}`,
      { telegramUsername: account.telegramUsername },
    ).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/customers/:username/send-message]", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── DELETE /api/admin/customers — bulk delete customers ─────────────────────
router.delete("/admin/customers", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { usernames } = req.body;
    if (!Array.isArray(usernames) || usernames.length === 0) {
      res.status(400).json({ error: "usernames must be a non-empty array" });
      return;
    }
    const safe = (usernames as unknown[])
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .slice(0, 500);
    if (safe.length === 0) {
      res.status(400).json({ error: "No valid usernames provided" });
      return;
    }
    // Include both @username and username variants so mixed-format data is covered
    const allVariants = Array.from(new Set(
      safe.flatMap(u => [u, u.startsWith("@") ? u.slice(1) : `@${u}`])
    ));
    // accountsTable cascade-deletes accountGroupBuys, gbWaitlist, organiserAuditLog
    await db.delete(accountsTable).where(inArray(accountsTable.telegramUsername, allVariants));
    await db.delete(customersTable).where(inArray(customersTable.telegramUsername, allVariants));
    const admin = getAdminUsername(res);
    await writeLog("change", "info", "admin_delete_customers", `Admin deleted ${safe.length} customer(s): ${safe.slice(0, 5).join(", ")}${safe.length > 5 ? "…" : ""}`, { usernames: safe });
    res.json({ deleted: safe.length });
  } catch (err) {
    console.error("[admin/customers DELETE]", err);
    res.status(500).json({ error: "Failed to delete customers" });
  }
});

// ─── PUT /api/admin/customers/:username/details — save customer details ───────
router.put("/admin/customers/:username/details", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = decodeURIComponent(req.params.username);
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
    const { fullName, email, phone, address, country, accountStatus, notes, tags } = req.body;
    const safeStatus = accountStatus ?? "active";

    const VALID_TAGS = ["seller", "group_buy_organiser"] as const;
    const safeTags: string[] | undefined = Array.isArray(tags)
      ? tags.filter((t: unknown): t is string => typeof t === "string" && (VALID_TAGS as readonly string[]).includes(t))
      : undefined;

    // Update accountsTable.accountStatus and country — these are authoritative
    // Try both @username and without @ since data format may vary
    const safeCountry: string | null | undefined = country !== undefined
      ? (country ? String(country).trim() : null)
      : undefined;
    await db.update(accountsTable)
      .set({ accountStatus: safeStatus, updatedAt: new Date(), ...(safeCountry !== undefined ? { country: safeCountry } : {}) })
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

    const existing = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, username));
    const baseFields = {
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      accountStatus: safeStatus,
      notes: notes ?? null,
    };
    if (existing.length > 0) {
      await db.update(customersTable)
        .set(safeTags !== undefined ? { ...baseFields, tags: safeTags } : baseFields)
        .where(eq(customersTable.telegramUsername, username));
    } else {
      await db.insert(customersTable).values({
        telegramUsername: username,
        ...baseFields,
        tags: safeTags ?? [],
      });
    }

    const [updated] = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, username));

    createAlert("customer", "low", "Customer Updated",
      `Customer record updated by admin: ${username}`,
      { linkUrl: `#usernames`, relatedEntityId: username },
    ).catch(() => {});

    const adminActor = getAdminUsername(res);
    const detailsChangedFields = Object.keys({ fullName, email, phone, address, accountStatus, notes, tags }).filter(k => req.body[k] !== undefined);

    // Emit specific event for status changes
    if (req.body["accountStatus"] !== undefined) {
      logCustomerActivity({
        telegramUsername: username,
        eventCategory: "account",
        eventType: "account.status_changed",
        actorType: "admin",
        actorUsername: adminActor,
        metadata: { accountStatus: safeStatus },
      }).catch(() => {});
    }

    // Emit specific event for tag changes
    if (req.body["tags"] !== undefined) {
      logCustomerActivity({
        telegramUsername: username,
        eventCategory: "account",
        eventType: "account.tags_updated",
        actorType: "admin",
        actorUsername: adminActor,
        metadata: { tags: safeTags },
      }).catch(() => {});
    }

    // Emit specific event for admin notes changes
    if (req.body["notes"] !== undefined) {
      logCustomerActivity({
        telegramUsername: username,
        eventCategory: "account",
        eventType: "account.notes_updated",
        actorType: "admin",
        actorUsername: adminActor,
        metadata: { notes: notes ?? null },
      }).catch(() => {});
    }

    // Always emit the general details updated event for full audit trail
    logCustomerActivity({
      telegramUsername: username,
      eventCategory: "account",
      eventType: "account.profile_updated",
      actorType: "admin",
      actorUsername: adminActor,
      metadata: {
        changedFields: detailsChangedFields,
      },
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    console.error("[admin/customers/:username/details]", err);
    res.status(500).json({ error: "Failed to update customer details" });
  }
});

// ─── PUT /api/admin/customers/:username/rename ────────────────
router.put("/admin/customers/:username/rename", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const oldUsername = decodeURIComponent(req.params.username);
    const { newUsername } = req.body;

    if (!newUsername || typeof newUsername !== "string") {
      res.status(400).json({ error: "newUsername is required" });
      return;
    }

    const trimmed = newUsername.trim();
    const tg = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    const bare = tg.replace(/^@/, "");

    if (!bare || bare.length < 3 || bare.length > 64 || !/^[a-zA-Z0-9_]+$/.test(bare)) {
      res.status(400).json({ error: "Invalid username — must be 3–64 alphanumeric characters or underscores" });
      return;
    }

    if (tg === oldUsername) {
      res.status(400).json({ error: "New username must be different from current username" });
      return;
    }

    // Pre-flight: check no orders or customer row exists for new username
    const [existingOrders, existingNewCustomer] = await Promise.all([
      db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.telegramUsername, tg)),
      db.select({ telegramUsername: customersTable.telegramUsername }).from(customersTable).where(eq(customersTable.telegramUsername, tg)),
    ]);
    if (existingOrders.length > 0 || existingNewCustomer.length > 0) {
      res.status(409).json({ error: "That username already exists — merging is not supported" });
      return;
    }

    const [existingCustomer] = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, oldUsername));

    // Atomic transaction: update orders + rename customer row
    await db.transaction(async (tx) => {
      await tx.update(ordersTable).set({ telegramUsername: tg }).where(eq(ordersTable.telegramUsername, oldUsername));
      if (existingCustomer) {
        const { telegramUsername: _old, createdAt: _ca, updatedAt: _ua, ...rest } = existingCustomer;
        await tx.insert(customersTable).values({ ...rest, telegramUsername: tg });
        await tx.delete(customersTable).where(eq(customersTable.telegramUsername, oldUsername));
      }
    });

    writeLog("change", "info", "customer_renamed",
      `Admin renamed customer ${oldUsername} → ${tg}`,
      { oldUsername, newUsername: tg },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});

    createAlert("customer", "medium", "Customer Renamed",
      `Customer renamed from ${oldUsername} to ${tg}`,
      { linkUrl: `#usernames`, relatedEntityId: tg },
    ).catch(() => {});

    // Log the rename under the NEW username (since old one no longer has an account row)
    logCustomerActivity({
      telegramUsername: tg,
      eventCategory: "account",
      eventType: "account.profile_updated",
      actorType: "admin",
      actorUsername: getAdminUsername(res),
      metadata: { changedFields: ["telegramUsername"], oldUsername, newUsername: tg },
    }).catch(() => {});

    res.json({ ok: true, newUsername: tg });
  } catch (err) {
    console.error("[admin/customers/:username/rename]", err);
    res.status(500).json({ error: "Failed to rename customer" });
  }
});

// ─── DELETE /api/admin/customers/:username/unblock-ip — clear IP block for a customer's last IP ──
router.delete("/admin/customers/:username/unblock-ip", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = decodeURIComponent(req.params.username);
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
    const [acct] = await db.select({ lastLoginIp: accountsTable.lastLoginIp })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
    if (!acct?.lastLoginIp) {
      res.status(404).json({ error: "No last login IP on record for this account" });
      return;
    }
    const ip = acct.lastLoginIp;
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.ip, ip));
    await db.update(lookupAttemptsTable)
      .set({ failedAttempts: 0, blockedUntil: null })
      .where(eq(lookupAttemptsTable.identifier, `login_ip:${ip}`));
    writeLog("change", "info", "admin_ip_unblock",
      `Admin manually cleared IP block for ${username} (IP: ${ip})`,
      { username, ip },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true, ip });
  } catch (err) {
    console.error("[admin/customers/:username/unblock-ip]", err);
    res.status(500).json({ error: "Failed to unblock IP" });
  }
});

// ─── PUT /api/admin/customers/:username/password — set customer password ──────
router.put("/admin/customers/:username/password", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const username = decodeURIComponent(req.params.username);
    const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await db.select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

    if (existing.length === 0) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.update(accountsTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

    // Auto-unblock the user's last known IP so they can log in immediately
    const [acct] = await db.select({ lastLoginIp: accountsTable.lastLoginIp })
      .from(accountsTable)
      .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
    if (acct?.lastLoginIp) {
      const ip = acct.lastLoginIp;
      await db.delete(blockedIpsTable).where(and(eq(blockedIpsTable.ip, ip), eq(blockedIpsTable.blockedBy, "system")));
      await db.update(lookupAttemptsTable)
        .set({ failedAttempts: 0, blockedUntil: null })
        .where(eq(lookupAttemptsTable.identifier, `login_ip:${ip}`));
    }

    writeLog("change", "info", "admin_password_reset",
      `Admin reset password for account: ${username}`,
      { username },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/customers/:username/password]", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// ─── GET /api/admin/customers ─────────────────────────────────
// Paginated account list with per-customer order stats.
// ?q=search  ?page=0  ?limit=50  ?gbId=<groupBuyId>  ?wholesale=true
router.get("/admin/customers", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const page = Math.max(0, parseInt(String(req.query.page ?? "0"), 10) || 0);
  const limit = Math.min(2000, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const offset = page * limit;
  const gbIdFilter = typeof req.query.gbId === "string" ? req.query.gbId.trim() : null;
  const wholesaleOnly = req.query.wholesale === "true";

  try {
    // If filtering by group buy, resolve the set of member accountIds first
    let gbMemberUsernames: Set<string> | null = null;
    if (gbIdFilter) {
      const memberships = await db
        .select({ accountId: accountGroupBuysTable.accountId })
        .from(accountGroupBuysTable)
        .where(eq(accountGroupBuysTable.groupBuyId, gbIdFilter));
      gbMemberUsernames = new Set(memberships.map(m => m.accountId));
    }

    // Aggregate order stats per telegram username from orders table
    const orderStats = await db
      .select({
        telegramUsername: ordersTable.telegramUsername,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<number>`round(coalesce(sum(${ordersTable.grandTotal}) filter (where ${ordersTable.paymentStatus} = 'confirmed'), 0)::numeric, 2)::float`,
        lastOrderAt: sql<string>`max(${ordersTable.createdAt})`,
        draftCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Draft')::int`,
        submittedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Submitted')::int`,
        processingCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Processing')::int`,
        shippedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Shipped')::int`,
        completedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Completed')::int`,
        cancelledCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Cancelled')::int`,
        pendingPaymentCount: sql<number>`count(*) filter (where ${ordersTable.paymentStatus} in ('pending_confirmation','test_ready','test_confirmed'))::int`,
      })
      .from(ordersTable)
      .groupBy(ordersTable.telegramUsername);

    // Normalize @username handling: store stats under both @user and user keys so we can look up either format
    const statsMap = new Map<string, typeof orderStats[number]>();
    for (const s of orderStats) {
      const raw = s.telegramUsername ?? "";
      statsMap.set(raw, s);
      statsMap.set(raw.startsWith("@") ? raw.slice(1) : `@${raw}`, s);
    }

    // Fetch accounts
    const accounts = await db.select().from(accountsTable).orderBy(desc(accountsTable.createdAt));

    // Merge and filter
    const zeroStats = { orderCount: 0, totalSpent: 0, lastOrderAt: null, draftCount: 0, submittedCount: 0, processingCount: 0, shippedCount: 0, completedCount: 0, cancelledCount: 0, pendingPaymentCount: 0 };
    // Fetch customer tags
    const customerTagRows = await db.select({
      telegramUsername: customersTable.telegramUsername,
      tags: customersTable.tags,
    }).from(customersTable);
    const tagsMap = new Map<string, string[]>();
    for (const row of customerTagRows) {
      const raw = row.telegramUsername ?? "";
      const tags = (row.tags as string[]) ?? [];
      tagsMap.set(raw, tags);
      tagsMap.set(raw.startsWith("@") ? raw.slice(1) : `@${raw}`, tags);
    }

    const merged = accounts.map(a => ({
      telegramUsername: a.telegramUsername,
      email: a.email,
      accountStatus: a.accountStatus,
      createdAt: a.createdAt,
      country: a.country ?? null,
      lastLoginIp: a.lastLoginIp ?? null,
      tags: tagsMap.get(a.telegramUsername ?? "") ?? [],
      telegramConnected: a.telegramChatId != null,
      organiserStatus: a.organiserStatus ?? null,
      poolLeaderStatus: a.poolLeaderStatus ?? null,
      reshipperStatus: a.reshipperStatus ?? null,
      credits: a.credits ?? 0,
      isWholesale: a.isWholesale ?? false,
      ...(statsMap.get(a.telegramUsername ?? "") ?? zeroStats),
    }));

    const filtered = merged
      .filter(c => !q || (
        c.telegramUsername.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q) ||
        (c.lastLoginIp ?? "").toLowerCase().includes(q)
      ))
      .filter(c => {
        if (!gbMemberUsernames) return true;
        const u = c.telegramUsername ?? "";
        const alt = u.startsWith("@") ? u.slice(1) : `@${u}`;
        return gbMemberUsernames.has(u) || gbMemberUsernames.has(alt);
      })
      .filter(c => !wholesaleOnly || c.isWholesale);

    const total = filtered.length;
    const page_data = filtered.slice(offset, offset + limit);

    res.json({ customers: page_data, total, page, limit });
  } catch (err) {
    console.error("[admin/customers]", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ─── GET /api/admin/usernames ─────────────────────────────────
router.get("/admin/usernames", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  try {
    const rows = await db
      .select({
        telegramUsername: ordersTable.telegramUsername,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<number>`round(sum(${ordersTable.grandTotal})::numeric, 2)::float`,
        lastOrderAt: sql<string>`max(${ordersTable.createdAt})`,
        draftCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Draft')::int`,
        submittedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Submitted')::int`,
        processingCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Processing')::int`,
        shippedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Shipped')::int`,
        completedCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Completed')::int`,
        cancelledCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'Cancelled')::int`,
      })
      .from(ordersTable)
      .groupBy(ordersTable.telegramUsername)
      .orderBy(desc(sql`max(${ordersTable.createdAt})`));

    const filtered = q ? rows.filter(r => r.telegramUsername.toLowerCase().includes(q)) : rows;
    res.json(filtered);
  } catch (err) {
    console.error("[admin/usernames]", err);
    res.status(500).json({ error: "Failed to fetch usernames" });
  }
});

// ─── GET /api/admin/audit-logs ───────────────────────────────
// Focused activity log for order changes, deletions, edits, logins.
// ?eventType=all|deletions|edits|logins|payments  ?page=0  ?limit=25
router.get("/admin/audit-logs", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const eventType = (req.query.eventType as string | undefined) ?? "all";
  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"))));
  const page = Math.max(0, parseInt(String(req.query.page ?? "0")));
  const offset = page * limit;

  const DELETION_ACTIONS = ["order_deleted_by_admin", "order_deleted_by_customer"];
  const EDIT_ACTIONS = [
    "order_updated_by_admin", "order_updated_by_customer",
    "shipping_address_updated", "username_changed", "customer_renamed",
    "admin_update_line_items", "profile_updated",
    "pin_changed", "account_password_changed", "account_password_set",
  ];
  const LOGIN_ACTIONS = [
    "admin_login_success", "admin_login_failed",
    "lookup_success", "lookup_failed", "lookup_blocked",
    "account_login", "account_login_failed", "account_order_login",
    "account_signup", "pin_claimed",
  ];
  const conditions: any[] = [];

  if (eventType === "deletions") {
    conditions.push(inArray(auditLogsTable.action, DELETION_ACTIONS));
  } else if (eventType === "edits") {
    conditions.push(inArray(auditLogsTable.action, EDIT_ACTIONS));
  } else if (eventType === "logins") {
    conditions.push(inArray(auditLogsTable.action, LOGIN_ACTIONS));
  } else if (eventType === "payments") {
    conditions.push(eq(auditLogsTable.type, "payment"));
  }
  // "all" → no filter

  if (q) {
    const term = `%${q}%`;
    conditions.push(
      sql`(${auditLogsTable.message} ilike ${term} or ${auditLogsTable.ip} ilike ${term} or ${auditLogsTable.action} ilike ${term})`
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  try {
    const [logs, countRow] = await Promise.all([
      db.select().from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
    ]);
    const logsWithGeo = await enrichLogsWithGeo(logs);
    res.json({ logs: logsWithGeo, total: countRow[0]?.count ?? 0, page, limit });
  } catch (err) {
    console.error("[admin/audit-logs]", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ─── GET /api/admin/logs ──────────────────────────────────────
router.get("/admin/logs", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  // Support comma-separated types: ?types=login,order  or legacy single: ?type=login
  const typeFilter = req.query.type as string | undefined;
  const typesFilter = req.query.types as string | undefined;
  const levelFilter = req.query.level as string | undefined;
  const actionFilter = req.query.action as string | undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : undefined;
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? "100"))));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")));

  const validTypes = ["error", "login", "order", "change", "payment", "seller"];
  const validLevels = ["info", "warn", "error"];

  const conditions = [];
  if (typesFilter) {
    const types = typesFilter.split(",").map(t => t.trim()).filter(t => validTypes.includes(t));
    if (types.length === 1) conditions.push(eq(auditLogsTable.type, types[0]));
    else if (types.length > 1) conditions.push(inArray(auditLogsTable.type, types));
  } else if (typeFilter && validTypes.includes(typeFilter)) {
    conditions.push(eq(auditLogsTable.type, typeFilter));
  }
  if (levelFilter && validLevels.includes(levelFilter)) conditions.push(eq(auditLogsTable.level, levelFilter));
  if (actionFilter) conditions.push(eq(auditLogsTable.action, actionFilter));
  if (q) conditions.push(or(
    ilike(auditLogsTable.message, `%${q}%`),
    ilike(auditLogsTable.action, `%${q}%`),
    sql`${auditLogsTable.metadata}::text ilike ${'%' + q + '%'}`,
  ));

  const where = conditions.length ? and(...conditions) : undefined;

  try {
    const [logs, countRow] = await Promise.all([
      db.select().from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
    ]);
    const logsWithGeo = await enrichLogsWithGeo(logs);
    res.json({ logs: logsWithGeo, total: countRow[0]?.count ?? 0, limit, offset });
  } catch (err) {
    console.error("[admin/logs]", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ─── DELETE /api/admin/logs ───────────────────────────────────
router.delete("/admin/logs", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const typeFilter = req.query.type as string | undefined;
  const validTypes = ["error", "login", "order", "change", "payment", "seller"];
  try {
    if (typeFilter && validTypes.includes(typeFilter)) {
      await db.delete(auditLogsTable).where(eq(auditLogsTable.type, typeFilter));
    } else {
      await db.delete(auditLogsTable);
    }
    writeLog("change", "warn", "logs_cleared",
      `Admin cleared logs${typeFilter ? ` (type: ${typeFilter})` : " (all)"}`,
      { typeFilter },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/logs delete]", err);
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

// ─── GET /api/admin/lockouts — view currently blocked identifiers ──────────
router.get("/admin/lockouts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const now = new Date();
    const lockouts = await db
      .select()
      .from(lookupAttemptsTable)
      .orderBy(desc(lookupAttemptsTable.lastAttemptAt));

    const enriched = lockouts.map(l => ({
      id: l.id,
      identifier: l.identifier,
      failedAttempts: l.failedAttempts,
      lastAttemptAt: l.lastAttemptAt,
      blockedUntil: l.blockedUntil,
      isBlocked: !!(l.blockedUntil && l.blockedUntil > now),
      minutesLeft: l.blockedUntil && l.blockedUntil > now
        ? Math.ceil((l.blockedUntil.getTime() - now.getTime()) / 60000)
        : null,
    }));

    res.json({ lockouts: enriched, total: enriched.length });
  } catch (err) {
    console.error("[admin/lockouts]", err);
    res.status(500).json({ error: "Failed to fetch lockouts" });
  }
});

// ─── DELETE /api/admin/lockouts/:id — clear a specific lockout ──────────
router.delete("/admin/lockouts/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const [attempt] = await db.select().from(lookupAttemptsTable).where(eq(lookupAttemptsTable.id, id));
    if (!attempt) { res.status(404).json({ error: "Lockout not found" }); return; }
    await db.delete(lookupAttemptsTable).where(eq(lookupAttemptsTable.id, id));
    writeLog("change", "info", "lockout_cleared",
      `Admin cleared lockout for identifier: ${attempt.identifier}`,
      { identifier: attempt.identifier, failedAttempts: attempt.failedAttempts },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/lockouts delete]", err);
    res.status(500).json({ error: "Failed to clear lockout" });
  }
});

// ─── DELETE /api/admin/lockouts — clear all lockouts ────────────────────
router.delete("/admin/lockouts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.delete(lookupAttemptsTable);
    writeLog("change", "warn", "all_lockouts_cleared",
      "Admin cleared all login lockouts",
      {},
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/lockouts delete all]", err);
    res.status(500).json({ error: "Failed to clear lockouts" });
  }
});

// ─── GET /api/admin/ip-blocks — list all blocked IPs ───────────────────────
router.get("/admin/ip-blocks", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const now = new Date();
    const blocks = await db.select().from(blockedIpsTable).orderBy(desc(blockedIpsTable.blockedAt));
    const enriched = blocks.map(b => ({
      ...b,
      isActive: !b.expiresAt || b.expiresAt > now,
    }));
    res.json({ blocks: enriched, total: enriched.length });
  } catch (err) {
    console.error("[admin/ip-blocks]", err);
    res.status(500).json({ error: "Failed to fetch IP blocks" });
  }
});

// ─── POST /api/admin/ip-blocks — manually block an IP ──────────────────────
router.post("/admin/ip-blocks", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { ip, reason, expiresInHours } = req.body;
  if (!ip || typeof ip !== "string" || ip.trim().length === 0) {
    res.status(400).json({ error: "IP address is required" });
    return;
  }
  try {
    const expiresAt = expiresInHours ? new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000) : null;
    const adminUser = getAdminUsername(res) ?? "admin";
    const [inserted] = await db.insert(blockedIpsTable).values({
      id: randomUUID(),
      ip: ip.trim(),
      reason: reason?.trim() || null,
      blockedBy: adminUser,
      expiresAt,
    }).onConflictDoUpdate({
      target: blockedIpsTable.ip,
      set: { reason: reason?.trim() || null, blockedBy: adminUser, blockedAt: new Date(), expiresAt },
    }).returning();
    writeLog("change", "warn", "ip_blocked",
      `Admin manually blocked IP: ${ip.trim()}`,
      { ip: ip.trim(), reason: reason?.trim(), expiresAt, blockedBy: adminUser },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true, block: inserted });
  } catch (err) {
    console.error("[admin/ip-blocks post]", err);
    res.status(500).json({ error: "Failed to block IP" });
  }
});

// ─── DELETE /api/admin/ip-blocks/:id — unblock an IP ───────────────────────
router.delete("/admin/ip-blocks/:id", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const [block] = await db.select().from(blockedIpsTable).where(eq(blockedIpsTable.id, id));
    if (!block) { res.status(404).json({ error: "IP block not found" }); return; }
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.id, id));
    writeLog("change", "info", "ip_unblocked",
      `Admin unblocked IP: ${block.ip}`,
      { ip: block.ip },
      (req.ip ?? "unknown") as string,
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/ip-blocks delete]", err);
    res.status(500).json({ error: "Failed to unblock IP" });
  }
});

// ─── GET /api/admin/login-attempts — failed login attempts by IP ────────────
router.get("/admin/login-attempts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const now = new Date();
    const attempts = await db
      .select()
      .from(lookupAttemptsTable)
      .where(like(lookupAttemptsTable.identifier, "login_ip:%"))
      .orderBy(desc(lookupAttemptsTable.lastAttemptAt));
    const enriched = attempts.map(a => ({
      id: a.id,
      ip: a.identifier.replace("login_ip:", ""),
      failedAttempts: a.failedAttempts,
      lastAttemptAt: a.lastAttemptAt,
      blockedUntil: a.blockedUntil,
      isRateLimited: !!(a.blockedUntil && a.blockedUntil > now),
      minutesLeft: a.blockedUntil && a.blockedUntil > now
        ? Math.ceil((a.blockedUntil.getTime() - now.getTime()) / 60000)
        : null,
    }));
    res.json({ attempts: enriched, total: enriched.length });
  } catch (err) {
    console.error("[admin/login-attempts]", err);
    res.status(500).json({ error: "Failed to fetch login attempts" });
  }
});

// ─── Default home sections ──────────────────────────────────────────────────
const DEFAULT_HOME_SECTIONS = [
  { id: "home",        label: "Hub",         enabled: true },
  { id: "orders",      label: "Orders",      enabled: true },
  { id: "compounds",   label: "Compounds",   enabled: true },
  { id: "blood-tests", label: "Blood Tests", enabled: true },
  { id: "health",      label: "Health",      enabled: true },
  { id: "glp1",        label: "GLP-1",       enabled: true },
  { id: "plotter",     label: "Plotter",     enabled: true },
  { id: "groups",      label: "Groups",      enabled: true },
  { id: "profile",     label: "Profile",     enabled: true },
  { id: "telegram",    label: "Telegram",    enabled: true },
];

// GET /api/home-sections — public, used by Home page
router.get("/home-sections", async (req: any, res: any): Promise<void> => {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "homeSections"));
    const sections = row?.value ? JSON.parse(row.value) : DEFAULT_HOME_SECTIONS;
    res.json({ sections });
  } catch (err) {
    res.json({ sections: DEFAULT_HOME_SECTIONS });
  }
});

// GET /api/admin/home-sections
router.get("/admin/home-sections", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "homeSections"));
    const sections = row?.value ? JSON.parse(row.value) : DEFAULT_HOME_SECTIONS;
    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch home sections" });
  }
});

// PUT /api/admin/home-sections
router.put("/admin/home-sections", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { sections } = req.body;
  if (!Array.isArray(sections)) { res.status(400).json({ error: "sections must be an array" }); return; }
  try {
    await db.insert(siteConfigTable).values({ key: "homeSections", value: JSON.stringify(sections) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(sections) } });
    res.json({ ok: true, sections });
  } catch (err) {
    res.status(500).json({ error: "Failed to save home sections" });
  }
});

// ─── Landing page sections ──────────────────────────────────────────────────
const DEFAULT_LANDING_SECTIONS = [
  { id: "announcements",  label: "Site Announcements",     enabled: true },
  { id: "vials_in_stock", label: "Single Vials — In Stock", enabled: true },
];

// GET /api/landing-page-sections — public, used by Home page
router.get("/landing-page-sections", async (_req: any, res: any): Promise<void> => {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "landingPageSections"));
    const sections = row?.value ? JSON.parse(row.value) : DEFAULT_LANDING_SECTIONS;
    res.json({ sections });
  } catch {
    res.json({ sections: DEFAULT_LANDING_SECTIONS });
  }
});

// GET /api/admin/landing-page-sections
router.get("/admin/landing-page-sections", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "landingPageSections"));
    const sections = row?.value ? JSON.parse(row.value) : DEFAULT_LANDING_SECTIONS;
    res.json({ sections });
  } catch {
    res.status(500).json({ error: "Failed to fetch landing page sections" });
  }
});

// PUT /api/admin/landing-page-sections
router.put("/admin/landing-page-sections", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { sections } = req.body;
  if (!Array.isArray(sections)) { res.status(400).json({ error: "sections must be an array" }); return; }
  try {
    await db.insert(siteConfigTable).values({ key: "landingPageSections", value: JSON.stringify(sections) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(sections) } });
    res.json({ ok: true, sections });
  } catch {
    res.status(500).json({ error: "Failed to save landing page sections" });
  }
});

// ─── Public nav items ───────────────────────────────────────────────────────
const DEFAULT_PUBLIC_NAV_ITEMS = [
  { id: "shop",         label: "Lonely Vial",    enabled: true },
  { id: "accessories",  label: "Accessories",    enabled: true },
  { id: "lab",          label: "Lab Reports",    enabled: true },
  { id: "testingpools", label: "Testing Pools",      enabled: true },
  { id: "community",   label: "Community Testing",  enabled: true },
  { id: "protocols",    label: "Protocols",      enabled: true },
  { id: "medications",  label: "Med Protocols",  enabled: true },
  { id: "trtaas",       label: "TRT & AAS",      enabled: true },
  { id: "learn",        label: "Learning Hub",   enabled: true },
  { id: "safety",          label: "Endotoxin Calc",      enabled: true },
  { id: "calculator",      label: "Dose Calc",           enabled: true },
  { id: "reconstitution",  label: "Reconstitution Calc", enabled: true },
  { id: "feedback",        label: "Feedback",            enabled: true },
];

// Merge stored nav items with defaults: any item in DEFAULT that is not present in
// the stored list is appended with its default enabled state. This ensures newly
// added nav items appear even when an older persisted config exists.
function mergeWithDefaults(stored: { id: string; label: string; enabled: boolean }[]) {
  const result = [...stored];
  for (const def of DEFAULT_PUBLIC_NAV_ITEMS) {
    if (!result.some(s => s.id === def.id)) {
      result.push(def);
    }
  }
  return result;
}

// GET /api/public-nav-items — public
router.get("/public-nav-items", async (_req: any, res: any): Promise<void> => {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "publicNavItems"));
    const stored = row?.value ? JSON.parse(row.value) : DEFAULT_PUBLIC_NAV_ITEMS;
    res.json({ items: mergeWithDefaults(stored) });
  } catch {
    res.json({ items: DEFAULT_PUBLIC_NAV_ITEMS });
  }
});

// GET /api/admin/public-nav-items
router.get("/admin/public-nav-items", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "publicNavItems"));
    const stored = row?.value ? JSON.parse(row.value) : DEFAULT_PUBLIC_NAV_ITEMS;
    res.json({ items: mergeWithDefaults(stored) });
  } catch {
    res.status(500).json({ error: "Failed to fetch public nav items" });
  }
});

// PUT /api/admin/public-nav-items
router.put("/admin/public-nav-items", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { items } = req.body;
  if (!Array.isArray(items)) { res.status(400).json({ error: "items must be an array" }); return; }
  try {
    await db.insert(siteConfigTable).values({ key: "publicNavItems", value: JSON.stringify(items) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(items) } });
    res.json({ ok: true, items });
  } catch {
    res.status(500).json({ error: "Failed to save public nav items" });
  }
});

// GET /api/admin/tab-order
router.get("/admin/tab-order", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "adminTabOrder"));
    res.json({ tabOrder: row?.value ? JSON.parse(row.value) : null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tab order" });
  }
});

// PUT /api/admin/tab-order
router.put("/admin/tab-order", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { tabOrder } = req.body;
  if (!Array.isArray(tabOrder)) { res.status(400).json({ error: "tabOrder must be an array" }); return; }
  try {
    await db.insert(siteConfigTable).values({ key: "adminTabOrder", value: JSON.stringify(tabOrder) })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(tabOrder) } });
    res.json({ ok: true, tabOrder });
  } catch (err) {
    res.status(500).json({ error: "Failed to save tab order" });
  }
});

// ─── GET /api/admin/alerts ────────────────────────────────────
router.get("/admin/alerts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "100"))));
  const unreadOnly = req.query.unreadOnly === "true";
  const typeFilter = typeof req.query.type === "string" ? req.query.type : undefined;
  const priorityFilter = typeof req.query.priority === "string" ? req.query.priority : undefined;
  try {
    const conditions = [];
    if (unreadOnly) conditions.push(eq(adminAlertsTable.isRead, false));
    if (typeFilter) conditions.push(eq(adminAlertsTable.type, typeFilter));
    if (priorityFilter) conditions.push(eq(adminAlertsTable.priority, priorityFilter));
    const rows = await db
      .select()
      .from(adminAlertsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(adminAlertsTable.createdAt))
      .limit(limit);
    const unreadCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminAlertsTable)
      .where(eq(adminAlertsTable.isRead, false));
    res.json({ alerts: rows, unreadCount: unreadCount[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// ─── POST /api/admin/import-batch-orders ─────────────────────
// Bulk-import historical orders. Creates customers + orders atomically.
router.post("/admin/import-batch-orders", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { orders: importOrders } = req.body;
  if (!Array.isArray(importOrders) || importOrders.length === 0) {
    res.status(400).json({ error: "orders array required" }); return;
  }

  const results: { username: string; orderCode: string; error?: string }[] = [];

  for (const o of importOrders) {
    try {
      const tg = String(o.telegramUsername || "").trim();
      const fullName = String(o.fullName || "").trim() || null;
      const deliveryMethodId = String(o.deliveryMethodId || "dm-none");
      const grandTotal = parseFloat(String(o.grandTotal)) || 0;
      const batchDate = o.batchDate ? new Date(o.batchDate) : new Date();
      const lineItems: { productName: string; productId: string; quantity: number; unitPrice: number }[] =
        Array.isArray(o.lineItems) ? o.lineItems : [];

      if (!tg) { results.push({ username: "(blank)", orderCode: "", error: "Missing username" }); continue; }

      const [dm] = await db.select().from(deliveryMethodsTable).where(eq(deliveryMethodsTable.id, deliveryMethodId));
      const deliveryPrice = dm ? parseFloat(String(dm.price)) : 0;
      const deliveryName = dm ? dm.name : deliveryMethodId;

      // Upsert customer
      const existing = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, tg));
      if (existing.length === 0) {
        await db.insert(customersTable).values({ telegramUsername: tg, fullName, accountStatus: "active" });
      } else if (fullName && !existing[0].fullName) {
        await db.update(customersTable).set({ fullName }).where(eq(customersTable.telegramUsername, tg));
      }

      // Build order
      const productSubtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      const orderId = randomUUID();
      const code = String(Math.floor(1000 + Math.random() * 9000));

      await db.insert(ordersTable).values({
        id: orderId, code, telegramUsername: tg,
        status: "Processing" as any,
        deliveryMethodId, deliveryMethod: deliveryName,
        deliveryPrice: deliveryPrice.toFixed(2) as any,
        vendorShipping: "0.00" as any, tip: "0.00" as any,
        productSubtotal: productSubtotal.toFixed(2) as any,
        grandTotal: grandTotal > 0 ? grandTotal.toFixed(2) as any : productSubtotal.toFixed(2) as any,
        notes: o.notes ? String(o.notes).slice(0, 1000) : null,
        pin: "0000",
        createdAt: batchDate,
      } as any);

      if (lineItems.length > 0) {
        await db.insert(orderLineItemsTable).values(
          lineItems.map(li => ({
            id: randomUUID(), orderId,
            productId: li.productId || "",
            productName: li.productName,
            quantity: String(li.quantity) as any,
            unitPrice: li.unitPrice.toFixed(2) as any,
            lineTotal: (li.quantity * li.unitPrice).toFixed(2) as any,
          }))
        );
      }

      results.push({ username: tg, orderCode: code });
    } catch (err: any) {
      results.push({ username: String(o.telegramUsername || ""), orderCode: "", error: err?.message || "Unknown error" });
    }
  }

  const succeeded = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  res.json({ succeeded, failed, results });
});

// ─── GET /api/admin/dashboard ─────────────────────────────────
// Returns KPI cards for the admin dashboard.
router.get("/admin/dashboard", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [allOrders, allCustomers, allGroupBuys, recentAlerts, groupBuyMemberCounts] = await Promise.all([
      db.select().from(ordersTable).where(isNull(ordersTable.deletedAt)),
      db.select().from(customersTable),
      db.select().from(groupBuysTable),
      db.select().from(adminAlertsTable).where(eq(adminAlertsTable.isRead, false)).orderBy(desc(adminAlertsTable.createdAt)).limit(5),
      db.select({
        groupBuyId: accountGroupBuysTable.groupBuyId,
        memberCount: sql<number>`count(*)::int`,
      }).from(accountGroupBuysTable).groupBy(accountGroupBuysTable.groupBuyId),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const confirmedOrders = allOrders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed");
    const activeOrders = allOrders.filter(o => !["Cancelled", "Completed"].includes(o.status));

    const totalRevenue = confirmedOrders.reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
    const todayRevenue = confirmedOrders.filter(o => new Date(o.createdAt) >= todayStart).reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
    const sevenDayRevenue = confirmedOrders.filter(o => new Date(o.createdAt) >= sevenDaysAgo).reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
    const thirtyDayRevenue = confirmedOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo).reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);

    const weekOrders = allOrders.filter(o => new Date(o.createdAt) >= sevenDaysAgo).length;
    const pendingPayment = allOrders.filter(o =>
      ["pending_confirmation", "test_ready", "test_confirmed"].includes(o.paymentStatus ?? "")
    ).length;

    const shippedCount = allOrders.filter(o => o.status === "Shipped").length;
    const processingCount = allOrders.filter(o => o.status === "Processing").length;
    const memberCountMap = new Map(groupBuyMemberCounts.map(m => [m.groupBuyId, m.memberCount]));
    const activeGroupBuys = allGroupBuys.filter(g => g.status === "active").map(g => ({
      id: g.id,
      name: g.name,
      memberCount: memberCountMap.get(g.id) ?? 0,
    }));

    const [unreadAlertCount, recentOrders] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(adminAlertsTable).where(eq(adminAlertsTable.isRead, false)),
      db.select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        status: ordersTable.status,
        paymentStatus: ordersTable.paymentStatus,
        grandTotal: ordersTable.grandTotal,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
        trackingNumber: ordersTable.trackingNumber,
      }).from(ordersTable).where(isNull(ordersTable.deletedAt)).orderBy(desc(ordersTable.updatedAt)).limit(8),
    ]);

    res.json({
      totalOrders: allOrders.length,
      activeOrders: activeOrders.length,
      totalCustomers: allCustomers.length,
      totalRevenue,
      todayRevenue,
      sevenDayRevenue,
      thirtyDayRevenue,
      weekOrders,
      pendingPayment,
      shippedCount,
      processingCount,
      activeGroupBuys: activeGroupBuys.length,
      activeGroupBuysList: activeGroupBuys,
      unreadAlerts: unreadAlertCount[0]?.count ?? 0,
      recentAlerts: recentAlerts.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      })),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        code: o.code,
        telegramUsername: o.telegramUsername,
        status: o.status,
        paymentStatus: o.paymentStatus,
        grandTotal: o.grandTotal,
        trackingNumber: o.trackingNumber,
        updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : (o.updatedAt ?? null),
        createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// ─── PATCH /api/admin/orders/bulk-tracking ────────────────────
// Accepts CSV lines (ORDER_CODE,TRACKING_NUMBER) and applies tracking + marks Shipped.
router.patch("/admin/orders/bulk-tracking", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { lines } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "lines array required" }); return;
  }

  const results: { code: string; trackingNumber: string; ok: boolean; error?: string }[] = [];

  for (const { code, trackingNumber } of lines) {
    const safeCode = String(code ?? "").trim();
    const tracking = String(trackingNumber ?? "").trim();
    if (!safeCode) { results.push({ code: safeCode, trackingNumber: tracking, ok: false, error: "Empty code" }); continue; }

    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.code, safeCode));
      if (!order) { results.push({ code: safeCode, trackingNumber: tracking, ok: false, error: "Order not found" }); continue; }

      await db.update(ordersTable)
        .set({ trackingNumber: tracking || null, status: "Shipped", updatedAt: new Date() })
        .where(eq(ordersTable.code, safeCode));

      if (tracking) {
        const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";

        let btGbName = "";
        let btGbOrganiser = "";
        if (order.groupBuyId) {
          const [btGbRow] = await db
            .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId })
            .from(groupBuysTable)
            .where(eq(groupBuysTable.id, order.groupBuyId));
          if (btGbRow) {
            btGbName = btGbRow.name;
            btGbOrganiser = btGbRow.organiserId ? `@${btGbRow.organiserId}` : "Admin";
          }
        }

        const btGbContext = btGbName ? `\nGB: <b>${escapeHtml(btGbName)}</b>\nOrganiser: ${escapeHtml(btGbOrganiser)}` : "";
        const btPaidLabel = order.paymentStatus === "confirmed" ? "Paid" : "Unpaid";

        notifyUserFromTemplate(order.telegramUsername, "status", "customer_order_shipped",
          { code: order.code, gb_name: btGbContext, tracking, username: order.telegramUsername.replace(/^@/, ""), order_total: String(order.grandTotal), delivery: order.deliveryMethod, payment_status: btPaidLabel, app_url: appUrl },
        ).catch(() => {});
      }

      results.push({ code: safeCode, trackingNumber: tracking, ok: true });
    } catch (err: any) {
      results.push({ code: safeCode, trackingNumber: tracking, ok: false, error: err?.message ?? "Unknown error" });
    }
  }

  const succeeded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  res.json({ succeeded, failed, results });
});

// ─── POST /api/admin/group-buys/:gbId/orders/bulk-add-product ────────────────
// Add a product to multiple orders in one go. Skips orders that already contain
// the product. Recalculates productSubtotal + grandTotal for each affected order.
router.post("/admin/group-buys/:gbId/orders/bulk-add-product", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const { orderIds, productId, quantity } = req.body as { orderIds?: string[]; productId?: string; quantity?: number };

  if (!Array.isArray(orderIds) || orderIds.length === 0) { res.status(400).json({ error: "orderIds required" }); return; }
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }
  const qty = parseFloat(String(quantity ?? 1));
  if (isNaN(qty) || qty <= 0) { res.status(400).json({ error: "quantity must be a positive number" }); return; }

  // Verify product belongs to this GB and get its price
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
    // Verify order belongs to this GB
    const [order] = await db
      .select({ id: ordersTable.id, deliveryPrice: ordersTable.deliveryPrice, vendorShipping: ordersTable.vendorShipping, tip: ordersTable.tip, testingContribution: ordersTable.testingContribution })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, gbId)));
    if (!order) { skipped++; continue; }

    // Check if product already on this order
    const existing = await db
      .select({ id: orderLineItemsTable.id })
      .from(orderLineItemsTable)
      .where(and(eq(orderLineItemsTable.orderId, orderId), eq(orderLineItemsTable.productId, productId)));
    if (existing.length > 0) { skipped++; continue; }

    // Insert new line item
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

    // Recalculate totals
    const allItems = await db.select({ lineTotal: orderLineItemsTable.lineTotal }).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
    const newSubtotal = parseFloat(allItems.reduce((s, li) => s + parseFloat(String(li.lineTotal)), 0).toFixed(2));
    const extras = parseFloat(String(order.deliveryPrice ?? 0)) + parseFloat(String(order.vendorShipping ?? 0)) + parseFloat(String(order.tip ?? 0)) + parseFloat(String(order.testingContribution ?? 0));
    const newGrandTotal = parseFloat((newSubtotal + extras).toFixed(2));
    await db.update(ordersTable).set({ productSubtotal: String(newSubtotal) as any, grandTotal: String(newGrandTotal) as any }).where(eq(ordersTable.id, orderId));

    added++;
  }

  res.json({ added, skipped, productName: gbProduct.productName, unitPrice, quantity: qty });
});

// ─── GET /api/admin/analytics ─────────────────────────────────
// Returns revenue, order counts, signup trends, funnel metrics, geo breakdown.
// ?range=7d|30d|90d|all  — all panels are filtered by the selected range
router.get("/admin/analytics", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const range = String(req.query.range ?? "90d");
    const now = new Date();

    // Build bucket list and derive rangeStart
    let rangeStart: Date;
    let buckets: { start: Date; end: Date; label: string }[] = [];

    if (range === "7d") {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      for (let i = 6; i >= 0; i--) {
        const s = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
        const e = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        buckets.push({ start: s, end: e, label: s.toLocaleDateString("en-GB", { weekday: "short" }) });
      }
    } else if (range === "30d") {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      for (let i = 4; i >= 0; i--) {
        const s = new Date(now.getTime() - (i + 1) * 6 * 24 * 60 * 60 * 1000);
        const e = new Date(now.getTime() - i * 6 * 24 * 60 * 60 * 1000);
        buckets.push({ start: s, end: e, label: s.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
      }
    } else if (range === "all") {
      // Truly all-time: rangeStart = epoch; buckets = last 12 months for visualization
      rangeStart = new Date(0);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const s = new Date(d.getFullYear(), d.getMonth(), 1);
        const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        buckets.push({ start: s, end: e, label: s.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) });
      }
    } else {
      // 90d default — 12 weekly buckets
      rangeStart = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);
      for (let i = 11; i >= 0; i--) {
        const s = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const e = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        buckets.push({ start: s, end: e, label: s.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
      }
    }

    const [allOrders, allLineItems, allAccounts] = await Promise.all([
      db.select({
        id: ordersTable.id,
        telegramUsername: ordersTable.telegramUsername,
        createdAt: ordersTable.createdAt,
        grandTotal: ordersTable.grandTotal,
        paymentStatus: ordersTable.paymentStatus,
        status: ordersTable.status,
        shippingCountry: ordersTable.shippingCountry,
        ipAddress: ordersTable.ipAddress,
      }).from(ordersTable).where(isNull(ordersTable.deletedAt)).orderBy(desc(ordersTable.createdAt)),
      db.select({
        orderId: orderLineItemsTable.orderId,
        productName: orderLineItemsTable.productName,
        quantity: orderLineItemsTable.quantity,
        lineTotal: orderLineItemsTable.lineTotal,
        createdAt: orderLineItemsTable.createdAt,
      }).from(orderLineItemsTable),
      db.select({
        telegramUsername: accountsTable.telegramUsername,
        accountStatus: accountsTable.accountStatus,
        createdAt: accountsTable.createdAt,
        healthDataConsent: accountsTable.healthDataConsent,
        country: accountsTable.country,
      }).from(accountsTable),
    ]);

    // For range=all: recompute buckets dynamically from earliest record date to now
    if (range === "all") {
      const allDates: Date[] = [
        ...allOrders.map(o => new Date(o.createdAt)),
        ...allAccounts.map(a => new Date(a.createdAt)),
      ].filter(d => d.getTime() > 0 && !isNaN(d.getTime()));
      if (allDates.length > 0) {
        const earliest = new Date(Math.min(...allDates.map(d => d.getTime())));
        buckets = [];
        let cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        while (cursor <= now) {
          const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
          buckets.push({
            start: cursor,
            end: nextMonth,
            label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
          });
          cursor = nextMonth;
        }
      }
    }

    // Filter orders and line items to range for range-sensitive panels
    const rangeOrders = allOrders.filter(o => new Date(o.createdAt) >= rangeStart);
    const rangeOrderIds = new Set(rangeOrders.map(o => o.id));
    const rangeLineItems = allLineItems.filter(li => rangeOrderIds.has(li.orderId));

    // Build revenue/order trend buckets
    const weeks = buckets.map(b => {
      const inBucket = allOrders.filter(o => { const d = new Date(o.createdAt); return d >= b.start && d < b.end; });
      const revenue = inBucket.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed")
        .reduce((s, o) => s + parseFloat(String(o.grandTotal ?? "0")), 0);
      return { label: b.label, revenue, orders: inBucket.length };
    });

    // Signup trend buckets
    const signupTrend = buckets.map(b => {
      const count = allAccounts.filter(a => { const d = new Date(a.createdAt); return d >= b.start && d < b.end; }).length;
      return { label: b.label, count };
    });

    // Top products — range-filtered
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const li of rangeLineItems) {
      const existing = productMap.get(li.productName) ?? { name: li.productName, qty: 0, revenue: 0 };
      existing.qty += parseFloat(String(li.quantity ?? "0"));
      existing.revenue += parseFloat(String(li.lineTotal ?? "0"));
      productMap.set(li.productName, existing);
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Order status breakdown — range-filtered
    const statusBreakdown: Record<string, number> = {};
    for (const o of rangeOrders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1;
    }

    // Geographic breakdown — range-filtered, with shippingCountry primary + IP geo fallback
    // Enrich IPs for orders that lack shippingCountry
    const ordersNeedingIpGeo = rangeOrders.filter(o => !o.shippingCountry && !!o.ipAddress);
    const ipCountryCache = new Map<string, string>();
    if (ordersNeedingIpGeo.length > 0) {
      try {
        const rawIps = ordersNeedingIpGeo.map(o => o.ipAddress).filter((ip): ip is string => !!ip);
        const enriched = await enrichIps(rawIps);
        for (const [ip, geo] of enriched.entries()) {
          const normed = normIp(ip);
          if (normed && geo.country) ipCountryCache.set(normed, geo.country);
        }
      } catch { /* geo enrichment is best-effort */ }
    }

    const geoRevMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of rangeOrders) {
      const ipCountry = o.ipAddress ? (ipCountryCache.get(normIp(o.ipAddress) ?? "") ?? null) : null;
      // Prefer explicit shippingCountry; fall back to IP-derived country
      const country = o.shippingCountry ?? ipCountry;
      if (country) {
        const g = geoRevMap.get(country) ?? { orders: 0, revenue: 0 };
        g.orders += 1;
        if (o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed") g.revenue += parseFloat(String(o.grandTotal ?? "0"));
        geoRevMap.set(country, g);
      }
    }
    const geoBreakdown = [...geoRevMap.entries()]
      .map(([country, g]) => ({ country, orders: g.orders, revenue: Math.round(g.revenue * 100) / 100 }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // Accounts by country — from accounts.country field (range-filtered: accounts created in range)
    const accountsInRangeForGeo = allAccounts.filter(a => new Date(a.createdAt) >= rangeStart);
    const accountsGeoMap = new Map<string, number>();
    for (const a of accountsInRangeForGeo) {
      if (a.country) {
        accountsGeoMap.set(a.country, (accountsGeoMap.get(a.country) ?? 0) + 1);
      }
    }
    const accountsGeo = [...accountsGeoMap.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Account stats (global — not range-filtered, for baseline context)
    const newInRange = allAccounts.filter(a => new Date(a.createdAt) >= rangeStart).length;
    const accountStats = {
      total: allAccounts.length,
      active: allAccounts.filter(a => (a.accountStatus ?? "active") === "active").length,
      suspended: allAccounts.filter(a => a.accountStatus === "suspended" || a.accountStatus === "banned").length,
      healthConsent: allAccounts.filter(a => a.healthDataConsent).length,
      newInRange,
    };

    // Funnel metrics — range-filtered orders
    const usersWithOrders = new Set(rangeOrders.map(o => o.telegramUsername));
    const usersWithConfirmedOrders = new Set(
      rangeOrders.filter(o => o.paymentStatus === "confirmed" || o.paymentStatus === "test_confirmed").map(o => o.telegramUsername)
    );
    const accountsInRange = allAccounts.filter(a => new Date(a.createdAt) >= rangeStart);
    const funnelMetrics = {
      signedUp: accountsInRange.length,
      placedOrder: [...usersWithOrders].filter(u => accountsInRange.some(a => a.telegramUsername === u)).length,
      confirmedPayment: [...usersWithConfirmedOrders].filter(u => accountsInRange.some(a => a.telegramUsername === u)).length,
      ordersFromExistingUsers: rangeOrders.filter(o => !accountsInRange.some(a => a.telegramUsername === o.telegramUsername)).length,
    };

    // Combined signups+orders correlation timeline
    const combinedTrend = buckets.map((b, i) => ({
      label: b.label,
      orders: weeks[i].orders,
      revenue: weeks[i].revenue,
      signups: signupTrend[i].count,
    }));

    res.json({ weeks, topProducts, statusBreakdown, signupTrend, combinedTrend, geoBreakdown, accountsGeo, accountStats, funnelMetrics });
  } catch (err) {
    console.error("[admin/analytics]", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

// ─── GET /api/admin/accounts ──────────────────────────────────
// Paginated account list with order aggregates.
// ?q=search  ?page=0  ?limit=50  ?status=all|active|suspended  ?role=all|organiser|pool_leader
router.get("/admin/accounts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const page = Math.max(0, parseInt(String(req.query.page ?? "0"), 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const offset = page * limit;
  const statusFilter = typeof req.query.status === "string" ? req.query.status : "all";
  const roleFilter = typeof req.query.role === "string" ? req.query.role : "all";

  try {
    const [accounts, orderStats] = await Promise.all([
      db.select({
        telegramUsername: accountsTable.telegramUsername,
        email: accountsTable.email,
        accountStatus: accountsTable.accountStatus,
        createdAt: accountsTable.createdAt,
        healthDataConsent: accountsTable.healthDataConsent,
        telegramChatId: accountsTable.telegramChatId,
        organiserStatus: accountsTable.organiserStatus,
        organiserRole: accountsTable.organiserRole,
        poolLeaderStatus: accountsTable.poolLeaderStatus,
        reshipperStatus: accountsTable.reshipperStatus,
        isWholesale: accountsTable.isWholesale,
        country: accountsTable.country,
        lastLoginIp: accountsTable.lastLoginIp,
        lastLoginAt: accountsTable.lastLoginAt,
      }).from(accountsTable).orderBy(desc(accountsTable.createdAt)),
      db.select({
        telegramUsername: ordersTable.telegramUsername,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<number>`round(coalesce(sum(${ordersTable.grandTotal}) filter (where ${ordersTable.paymentStatus} = 'confirmed'), 0)::numeric, 2)::float`,
        lastOrderAt: sql<string>`max(${ordersTable.createdAt})`,
      }).from(ordersTable).where(isNull(ordersTable.deletedAt)).groupBy(ordersTable.telegramUsername),
    ]);

    // Build order stats lookup (normalise @username)
    const orderMap = new Map<string, { orderCount: number; totalSpent: number; lastOrderAt: string | null }>();
    for (const s of orderStats) {
      const raw = s.telegramUsername ?? "";
      const entry = { orderCount: s.orderCount, totalSpent: s.totalSpent, lastOrderAt: s.lastOrderAt ?? null };
      orderMap.set(raw, entry);
      orderMap.set(raw.startsWith("@") ? raw.slice(1) : `@${raw}`, entry);
    }

    const zeroStats = { orderCount: 0, totalSpent: 0, lastOrderAt: null };

    let filtered = accounts.map(a => {
      const { telegramChatId, ...safeFields } = a;
      return {
        ...safeFields,
        telegramConnected: telegramChatId != null,
        ...(orderMap.get(a.telegramUsername ?? "") ?? zeroStats),
      };
    });

    if (q) {
      filtered = filtered.filter(a =>
        (a.telegramUsername ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => {
        if (statusFilter === "active") return (a.accountStatus ?? "active") === "active";
        if (statusFilter === "suspended") return a.accountStatus === "suspended" || a.accountStatus === "banned";
        return true;
      });
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter(a => {
        if (roleFilter === "organiser") return a.organiserStatus === "approved";
        if (roleFilter === "pool_leader") return a.poolLeaderStatus === "approved";
        if (roleFilter === "reshipper") return a.reshipperStatus === "approved";
        if (roleFilter === "organiser_applied") return a.organiserStatus === "applied";
        if (roleFilter === "pool_leader_applied") return a.poolLeaderStatus === "applied";
        if (roleFilter === "applied") return a.organiserStatus === "applied" || a.poolLeaderStatus === "applied" || a.reshipperStatus === "applied";
        return true;
      });
    }

    // KPI summary stats
    const now = new Date();
    const week7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const kpi = {
      total: accounts.length,
      active: accounts.filter(a => (a.accountStatus ?? "active") === "active").length,
      suspended: accounts.filter(a => a.accountStatus === "suspended" || a.accountStatus === "banned").length,
      newThisWeek: accounts.filter(a => new Date(a.createdAt) >= week7Ago).length,
      withOrders: accounts.filter(a => (orderMap.get(a.telegramUsername ?? "")?.orderCount ?? 0) > 0).length,
      organisers: accounts.filter(a => a.organiserStatus === "approved").length,
      poolLeaders: accounts.filter(a => a.poolLeaderStatus === "approved").length,
      reshippers: accounts.filter(a => a.reshipperStatus === "approved").length,
    };

    const total = filtered.length;
    const page_data = filtered.slice(offset, offset + limit);

    res.json({ accounts: page_data, total, page, limit, kpi });
  } catch (err) {
    console.error("[admin/accounts]", err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// ─── PATCH /api/admin/alerts/:id/read ─────────────────────────
router.patch("/admin/alerts/:id/read", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(adminAlertsTable).set({ isRead: true }).where(eq(adminAlertsTable.id, id));
  res.json({ ok: true });
});

// ─── PATCH /api/admin/alerts/read-all ─────────────────────────
router.patch("/admin/alerts/read-all", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.update(adminAlertsTable).set({ isRead: true }).where(eq(adminAlertsTable.isRead, false));
  res.json({ ok: true });
});

// ─── DELETE /api/admin/alerts ─────────────────────────────────
router.delete("/admin/alerts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const readOnly = req.query.readOnly === "true";
  if (readOnly) {
    await db.delete(adminAlertsTable).where(eq(adminAlertsTable.isRead, true));
  } else {
    await db.delete(adminAlertsTable);
  }
  res.json({ ok: true });
});

// ─── GET /api/admin/member-health ─────────────────────────────
router.get("/admin/member-health", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {

  // Fetch all accounts to know which members have opted in to health data sharing
  const allAccounts = await db.select({
    telegramUsername: accountsTable.telegramUsername,
    healthDataConsent: accountsTable.healthDataConsent,
  }).from(accountsTable);
  const consentSet = new Set(
    allAccounts.filter((a) => a.healthDataConsent).map((a) => a.telegramUsername)
  );

  // All blood test sessions ordered desc
  const allSessions = await db
    .select()
    .from(bloodTestSessionsTable)
    .orderBy(desc(bloodTestSessionsTable.testDate));

  const allValues = await db.select().from(bloodTestValuesTable);
  const allCompounds = await db.select().from(compoundLogsTable);

  // Group sessions by user (newest first per the desc order above)
  const sessionsByUser = new Map<string, typeof allSessions>();
  for (const s of allSessions) {
    if (!sessionsByUser.has(s.telegramUsername)) sessionsByUser.set(s.telegramUsername, []);
    sessionsByUser.get(s.telegramUsername)!.push(s);
  }

  const valuesBySession = new Map<string, typeof allValues>();
  for (const v of allValues) {
    if (!valuesBySession.has(v.sessionId)) valuesBySession.set(v.sessionId, []);
    valuesBySession.get(v.sessionId)!.push(v);
  }

  function parseNum(s: string | null | undefined): number | null {
    if (s == null || s === "") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  // Aggregate counts (all members, regardless of consent)
  let totalWithBloodTests = 0;
  let totalWithOutOfRange = 0;

  // Per-member flagged detail — only for consented members
  const flaggedMembers: {
    telegramUsername: string;
    testDate: string;
    flaggedMarkers: string[];
    totalMarkers: number;
  }[] = [];

  for (const [username, sessions] of sessionsByUser.entries()) {
    totalWithBloodTests++;
    const latestSession = sessions[0];
    const values = valuesBySession.get(latestSession.id) ?? [];

    const flaggedMarkers: string[] = [];
    for (const v of values) {
      const val = parseNum(v.value);
      const low = parseNum(v.refRangeLow);
      const high = parseNum(v.refRangeHigh);
      if (val == null || (low == null && high == null)) continue;
      if ((low != null && val < low) || (high != null && val > high)) {
        flaggedMarkers.push(v.biomarkerName);
      }
    }

    if (flaggedMarkers.length > 0) {
      totalWithOutOfRange++;
      // Only expose individual detail for consented members
      if (consentSet.has(username)) {
        flaggedMembers.push({
          telegramUsername: username,
          testDate: latestSession.testDate,
          flaggedMarkers,
          totalMarkers: values.length,
        });
      }
    }
  }

  flaggedMembers.sort((a, b) => b.flaggedMarkers.length - a.flaggedMarkers.length);

  // Compound popularity — active logs, aggregate counts only (no per-member detail)
  const activeCompounds = allCompounds.filter((c) => !c.endDate);
  const compoundUserMap = new Map<string, Set<string>>();
  for (const c of activeCompounds) {
    if (!compoundUserMap.has(c.compoundName)) compoundUserMap.set(c.compoundName, new Set());
    compoundUserMap.get(c.compoundName)!.add(c.telegramUsername);
  }
  const compoundStats = Array.from(compoundUserMap.entries())
    .map(([compoundName, users]) => ({ compoundName, userCount: users.size }))
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 20);

  // Full per-member blood test detail — only for consented members
  const memberTests: {
    telegramUsername: string;
    sessions: {
      id: string;
      testDate: string;
      labName: string | null;
      testName: string | null;
      measurementType: string | null;
      medicationNotes: string | null;
      notes: string | null;
      flaggedCount: number;
      values: {
        id: string;
        biomarkerName: string;
        biomarkerCategory: string;
        value: string;
        unit: string;
        refRangeLow: string | null;
        refRangeHigh: string | null;
        flagged: boolean;
      }[];
    }[];
  }[] = [];

  for (const [username, sessions] of sessionsByUser.entries()) {
    if (!consentSet.has(username)) continue;
    const memberSessionData = sessions.map(s => {
      const rawVals = valuesBySession.get(s.id) ?? [];
      const vals = rawVals.map(v => {
        const val = parseNum(v.value);
        const low = parseNum(v.refRangeLow);
        const high = parseNum(v.refRangeHigh);
        const flagged = val != null && (low != null || high != null) &&
          ((low != null && val < low) || (high != null && val > high));
        return {
          id: v.id,
          biomarkerName: v.biomarkerName,
          biomarkerCategory: v.biomarkerCategory,
          value: v.value ?? "",
          unit: v.unit,
          refRangeLow: v.refRangeLow ?? null,
          refRangeHigh: v.refRangeHigh ?? null,
          flagged,
        };
      });
      return {
        id: s.id,
        testDate: s.testDate,
        labName: s.labName ?? null,
        testName: s.testName ?? null,
        measurementType: s.measurementType ?? null,
        medicationNotes: s.medicationNotes ?? null,
        notes: s.notes ?? null,
        flaggedCount: vals.filter(v => v.flagged).length,
        values: vals,
      };
    });
    memberTests.push({ telegramUsername: username, sessions: memberSessionData });
  }
  memberTests.sort((a, b) => {
    const dateA = a.sessions[0]?.testDate ?? "";
    const dateB = b.sessions[0]?.testDate ?? "";
    return dateB.localeCompare(dateA);
  });

  res.json({
    totalWithBloodTests,
    totalWithOutOfRange,
    consentedCount: consentSet.size,
    flaggedMembers,
    compoundStats,
    totalActiveCompoundLogs: activeCompounds.length,
    totalUniqueUsersWithCompounds: new Set(activeCompounds.map((c) => c.telegramUsername)).size,
    memberTests,
  });
  } catch (err: any) {
    console.error("[member-health] Error:", err?.message ?? err);
    res.status(500).json({ error: String(err?.message ?? "Failed to load member health data") });
  }
});

// ─── GET /api/admin/notification-counts ───────────────────────
router.get("/admin/notification-counts", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [pendingOrdersResult, unreadAlertsResult, feedbackResult, pendingPaymentsResult, pendingPoolPaymentsResult, pendingReshippersResult, openTicketsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(inArray(ordersTable.status, ["Draft", "Submitted"])),
      db.select({ count: sql<number>`count(*)::int` })
        .from(adminAlertsTable)
        .where(eq(adminAlertsTable.isRead, false)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(feedbackTable),
      db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(eq(ordersTable.paymentStatus, "pending_confirmation")),
      db.select({ count: sql<number>`count(*)::int` })
        .from(poolParticipantsTable)
        .where(eq(poolParticipantsTable.paymentStatus, "submitted")),
      db.select({ count: sql<number>`count(*)::int` })
        .from(accountsTable)
        .where(eq(accountsTable.reshipperStatus, "applied")),
      db.select({ count: sql<number>`count(*)::int` })
        .from(ticketsTable)
        .where(inArray(ticketsTable.status, ["open", "in_progress"])),
    ]);
    res.json({
      pendingOrders: pendingOrdersResult[0]?.count ?? 0,
      unreadAlerts: unreadAlertsResult[0]?.count ?? 0,
      unreadFeedback: feedbackResult[0]?.count ?? 0,
      pendingPayments: pendingPaymentsResult[0]?.count ?? 0,
      pendingPoolPayments: pendingPoolPaymentsResult[0]?.count ?? 0,
      pendingReshippers: pendingReshippersResult[0]?.count ?? 0,
      openTickets: openTicketsResult[0]?.count ?? 0,
    });
  } catch {
    res.json({ pendingOrders: 0, unreadAlerts: 0, unreadFeedback: 0, pendingPayments: 0, pendingPoolPayments: 0, pendingReshippers: 0, openTickets: 0 });
  }
});

// ─── GET /api/admin/telegram-logs ────────────────────────────
router.get("/admin/telegram-logs", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { page = "0", limit = "50", username, from, to } = req.query as Record<string, string | undefined>;
    const pageNum = Math.max(0, parseInt(page ?? "0", 10) || 0);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? "50", 10) || 50));
    const offset = pageNum * limitNum;

    const conditions = [];
    if (username) conditions.push(ilike(telegramMessageLogsTable.recipientUsername, `%${username}%`));
    if (from) conditions.push(gte(telegramMessageLogsTable.sentAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(telegramMessageLogsTable.sentAt, toDate));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, countResult] = await Promise.all([
      db.select().from(telegramMessageLogsTable).where(where).orderBy(desc(telegramMessageLogsTable.sentAt)).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(telegramMessageLogsTable).where(where),
    ]);

    res.json({ logs, total: countResult[0]?.count ?? 0 });
  } catch (err) {
    console.error("[admin/telegram-logs] error:", err);
    res.status(500).json({ logs: [], total: 0 });
  }
});

// ── GET /admin/orders/:id/notes ───────────────────────────────
router.get("/admin/orders/:id/notes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const notes = await db
    .select()
    .from(orderNotesTable)
    .where(eq(orderNotesTable.orderId, req.params.id))
    .orderBy(asc(orderNotesTable.createdAt));
  res.json(notes);
});

// ── POST /admin/orders/:id/notes ──────────────────────────────
router.post("/admin/orders/:id/notes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { body, author } = req.body;
  if (!body || !String(body).trim()) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  const [note] = await db.insert(orderNotesTable).values({
    id: randomUUID(),
    orderId: req.params.id,
    author: author ? String(author).trim() : "Admin",
    body: String(body).trim(),
  }).returning();

  res.status(201).json(note);
});

// ── DELETE /admin/orders/:id/notes/:noteId ────────────────────
router.delete("/admin/orders/:orderId/notes/:noteId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(orderNotesTable).where(and(
    eq(orderNotesTable.id, req.params.noteId),
    eq(orderNotesTable.orderId, req.params.orderId),
  ));
  res.json({ ok: true });
});

// ── GET /admin/orders/payment-reconciliation ──────────────────
router.get("/admin/orders/payment-reconciliation", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const pending = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      grandTotal: ordersTable.grandTotal,
      currency: ordersTable.deliveryMethod,
      paymentStatus: ordersTable.paymentStatus,
      paymentTxHash: ordersTable.paymentTxHash,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
      createdAt: ordersTable.createdAt,
      groupBuyId: ordersTable.groupBuyId,
    })
    .from(ordersTable)
    .where(or(
      eq(ordersTable.paymentStatus, "pending_confirmation"),
      eq(ordersTable.paymentStatus, "test_confirmed"),
      eq(ordersTable.paymentStatus, "test_ready"),
    ))
    .orderBy(desc(ordersTable.createdAt));

  res.json(pending.map(o => ({ ...o, grandTotal: parseFloat(String(o.grandTotal)) })));
});

// ── GET /admin/payment-orders ─────────────────────────────────
// Returns all orders with an active/processed payment status for the Payments tab.
// Excludes "unpaid" (no payment activity yet).
router.get("/admin/payment-orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const orders = await db
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        telegramUsername: ordersTable.telegramUsername,
        grandTotal: ordersTable.grandTotal,
        paymentStatus: ordersTable.paymentStatus,
        paymentTxHash: ordersTable.paymentTxHash,
        paymentTestAmount: ordersTable.paymentTestAmount,
        testPaymentTxHash: ordersTable.testPaymentTxHash,
        paymentCryptoCurrency: ordersTable.paymentCryptoCurrency,
        paymentScreenshot: ordersTable.paymentScreenshot,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(and(
        notInArray(ordersTable.paymentStatus, ["unpaid"]),
        isNull(ordersTable.deletedAt),
      ))
      .orderBy(desc(ordersTable.createdAt))
      .limit(500);

    res.json(orders.map(o => ({
      ...o,
      grandTotal: parseFloat(String(o.grandTotal)),
      paymentTestAmount: o.paymentTestAmount != null ? parseFloat(String(o.paymentTestAmount)) : null,
      createdAt: (o.createdAt as Date).toISOString(),
    })));
  } catch (err) {
    console.error("[admin] GET /admin/payment-orders error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to load payment orders" });
  }
});

// ── GET /admin/accounts/:username/timeline ────────────────────
router.get("/admin/accounts/:username/contact", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = req.params.username;
  const alt = username.startsWith("@") ? username.slice(1) : `@${username}`;
  const [acct] = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      email: accountsTable.email,
      addressLine1: accountsTable.addressLine1,
      addressLine2: accountsTable.addressLine2,
      addressCity: accountsTable.addressCity,
      addressPostcode: accountsTable.addressPostcode,
      addressPhone: accountsTable.addressPhone,
      addressPhonePrefix: accountsTable.addressPhonePrefix,
    })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, alt)))
    .limit(1);
  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }
  res.json(acct);
});

router.get("/admin/accounts/:username/timeline", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = req.params.username;
  const alt = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [orders, bloodTests, compounds, gbMemberships, waitlisted] = await Promise.all([
    db.select({ id: ordersTable.id, code: ordersTable.code, status: ordersTable.status, paymentStatus: ordersTable.paymentStatus, grandTotal: ordersTable.grandTotal, groupBuyId: ordersTable.groupBuyId, createdAt: ordersTable.createdAt })
      .from(ordersTable)
      .where(and(
        or(eq(ordersTable.telegramUsername, username), eq(ordersTable.telegramUsername, alt)),
        isNull(ordersTable.deletedAt),
      ))
      .orderBy(desc(ordersTable.createdAt)),

    db.select({ id: bloodTestSessionsTable.id, testDate: bloodTestSessionsTable.testDate, labName: bloodTestSessionsTable.labName, testName: bloodTestSessionsTable.testName, createdAt: bloodTestSessionsTable.createdAt })
      .from(bloodTestSessionsTable)
      .where(or(eq(bloodTestSessionsTable.telegramUsername, username), eq(bloodTestSessionsTable.telegramUsername, alt)))
      .orderBy(desc(bloodTestSessionsTable.testDate)),

    db.select({ id: compoundLogsTable.id, compoundName: compoundLogsTable.compoundName, startDate: compoundLogsTable.startDate, endDate: compoundLogsTable.endDate })
      .from(compoundLogsTable)
      .where(or(eq(compoundLogsTable.telegramUsername, username), eq(compoundLogsTable.telegramUsername, alt)))
      .orderBy(desc(compoundLogsTable.startDate)),

    db.select({ id: accountGroupBuysTable.id, groupBuyId: accountGroupBuysTable.groupBuyId, tags: accountGroupBuysTable.tags, joinedAt: accountGroupBuysTable.joinedAt, gbName: groupBuysTable.name })
      .from(accountGroupBuysTable)
      .leftJoin(groupBuysTable, eq(accountGroupBuysTable.groupBuyId, groupBuysTable.id))
      .where(or(eq(accountGroupBuysTable.accountId, username), eq(accountGroupBuysTable.accountId, alt)))
      .orderBy(desc(accountGroupBuysTable.joinedAt)),

    db.select({ groupBuyId: gbWaitlistTable.groupBuyId, joinedAt: gbWaitlistTable.joinedAt, gbName: groupBuysTable.name })
      .from(gbWaitlistTable)
      .leftJoin(groupBuysTable, eq(gbWaitlistTable.groupBuyId, groupBuysTable.id))
      .where(or(eq(gbWaitlistTable.accountId, username), eq(gbWaitlistTable.accountId, alt))),
  ]);

  res.json({
    orders: orders.map(o => ({ ...o, grandTotal: parseFloat(String(o.grandTotal)), type: "order" })),
    bloodTests: bloodTests.map(b => ({ ...b, type: "blood_test" })),
    compounds: compounds.map(c => ({ ...c, type: "compound" })),
    groupBuyMemberships: gbMemberships.map(g => ({ ...g, type: "gb_member" })),
    waitlisted: waitlisted.map(w => ({ ...w, type: "gb_waitlist" })),
  });
});

// ── GET /admin/ip-lookup — geo + proxy/VPN info for an IP ────────────────────
router.get("/admin/ip-lookup", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const ip = String(req.query.ip ?? "").trim();
  if (!ip) { res.status(400).json({ error: "ip query param required" }); return; }

  try {
    // ip-api.com free tier (HTTP only, 45 req/min) — includes proxy, hosting, mobile fields
    const fields = "status,country,countryCode,regionName,city,isp,org,proxy,hosting,mobile";
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`);
    if (!response.ok) { res.status(502).json({ error: "ip-api.com request failed" }); return; }
    const data = await response.json() as Record<string, unknown>;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach ip-api.com" });
  }
});

// ── GET /admin/accounts/:username/activity ────────────────────
// Returns recent customer activity logs + recent login audit entries for an account.
router.get("/admin/accounts/:username/activity", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = req.params.username;
  const alt = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [activityLogs, loginLogs] = await Promise.all([
    db.select()
      .from(customerActivityLogsTable)
      .where(or(
        eq(customerActivityLogsTable.telegramUsername, username),
        eq(customerActivityLogsTable.telegramUsername, alt),
      ))
      .orderBy(desc(customerActivityLogsTable.createdAt))
      .limit(30),

    db.select()
      .from(auditLogsTable)
      .where(and(
        eq(auditLogsTable.type, "login"),
        ilike(auditLogsTable.message, `%${username.replace(/^@/, "")}%`),
      ))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(15),
  ]);

  res.json({ activityLogs, loginLogs });
});

// ── POST /admin/accounts/:username/rename ─────────────────────
// Renames a telegram username across all tables in a transaction.
router.post("/admin/accounts/:username/rename", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const oldRaw = req.params.username as string;
  const { newUsername } = req.body;

  if (!newUsername || typeof newUsername !== "string" || !newUsername.trim()) {
    res.status(400).json({ error: "newUsername is required" });
    return;
  }

  // Normalise: accounts stores bare (no @, lowercase). Other tables (orders, customers)
  // may store with or without @ so we match both in WHERE clauses.
  const oldBare = oldRaw.replace(/^@+/, "").toLowerCase().trim();
  const newBare = newUsername.replace(/^@+/, "").toLowerCase().trim();
  const oldWithAt = `@${oldBare}`;
  const newWithAt = `@${newBare}`;

  if (!newBare || newBare.length < 3 || newBare.length > 64 || !/^[a-z0-9_]+$/.test(newBare)) {
    res.status(400).json({ error: "Invalid username — must be 3–64 alphanumeric characters or underscores" });
    return;
  }

  if (oldBare === newBare) {
    res.status(400).json({ error: "New username is the same as the current one" });
    return;
  }

  // Check new username is not already taken (accounts stores bare, no @)
  const [existing] = await db.select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${newBare}`);

  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  // Check old account exists (match bare or @ format in case of legacy data)
  const [oldAccount] = await db.select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(sql`lower(${accountsTable.telegramUsername}) = ${oldBare}`);

  if (!oldAccount) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const actualOldUsername = oldAccount.telegramUsername; // use the exact stored value for PK updates

  // Pre-flight: customers table is keyed by telegram_username (PK, no FK to accounts).
  // Customers stores WITH @. Fail if the new key already exists.
  const [existingNewCustomer] = await db
    .select({ telegramUsername: customersTable.telegramUsername })
    .from(customersTable)
    .where(sql`lower(${customersTable.telegramUsername}) IN (${newBare}, ${newWithAt})`);
  if (existingNewCustomer) {
    res.status(409).json({ error: "A customer profile already exists for that username — merging is not supported" });
    return;
  }

  // Snapshot the old customers row. Customers stores WITH @ so check both formats.
  const [existingCustomer] = await db
    .select()
    .from(customersTable)
    .where(sql`lower(${customersTable.telegramUsername}) IN (${oldBare}, ${oldWithAt})`);

  try {
    // Perform the rename in a transaction.
    // Order matters: every FK column that references accounts.telegram_username has
    // `onUpdate: cascade`, so updating the PK on `accounts` FIRST automatically
    // propagates to child FK columns (account_group_buys.account_id,
    // gb_waitlist.account_id, gb_reshippers.reshipper_username,
    // blood_test_sessions.telegram_username, compound_logs.telegram_username,
    // glp1_logs.telegram_username, plotter_cycles.telegram_username,
    // bt_conversations.telegram_username, customer_activity_logs.telegram_username, etc).
    // After the cascade, we manually update columns that DON'T have an FK to accounts.
    // All plain-text username columns may store either @user or user format, so WHERE
    // clauses match both variants via lower() IN (bare, @bare).
    await db.transaction(async (tx) => {
      // 1. Move the PK on accounts — FK children with onUpdate:cascade follow automatically.
      await tx.execute(sql`UPDATE accounts SET telegram_username = ${newBare} WHERE telegram_username = ${actualOldUsername}`);

      // 2. Non-FK plain-text username columns (match both @user and user formats).
      await tx.execute(sql`UPDATE orders SET telegram_username = ${newWithAt} WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE orders SET reshipper_username = ${newWithAt} WHERE lower(reshipper_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE feedback SET telegram_username = ${newWithAt} WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE coupon_redemptions SET telegram_username = ${newWithAt} WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE vial_orders SET telegram_username = ${newWithAt} WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE health_insight_logs SET telegram_username = ${newWithAt} WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE telegram_message_logs SET recipient_username = ${newWithAt} WHERE lower(recipient_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE pool_participants SET account_username = ${newWithAt} WHERE lower(account_username) IN (${oldBare}, ${oldWithAt})`);
      await tx.execute(sql`UPDATE testing_pools SET leader_username = ${newWithAt} WHERE lower(leader_username) IN (${oldBare}, ${oldWithAt})`);
      // Activity-log actor field (separate from the FK telegram_username column that already cascaded)
      await tx.execute(sql`UPDATE customer_activity_logs SET actor_username = ${newWithAt} WHERE lower(actor_username) IN (${oldBare}, ${oldWithAt})`);
      // group_buys.organiser_id is plain text (no FK — see schema comment)
      await tx.execute(sql`UPDATE group_buys SET organiser_id = ${newBare} WHERE lower(organiser_id) IN (${oldBare}, ${oldWithAt})`);

      // 3. JSONB arrays in group_buys that store usernames as string elements.
      //    elem #>> '{}' extracts the raw text from a JSON string element.
      await tx.execute(sql`
        UPDATE group_buys SET payments_test_usernames = (
          SELECT jsonb_agg(CASE WHEN lower(elem #>> '{}') IN (${oldBare}, ${oldWithAt}) THEN to_jsonb(${newWithAt}::text) ELSE elem END)
          FROM jsonb_array_elements(COALESCE(payments_test_usernames, '[]'::jsonb)) AS elem
        ) WHERE payments_test_usernames IS NOT NULL
          AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(payments_test_usernames) t WHERE lower(t) IN (${oldBare}, ${oldWithAt}))
      `);
      await tx.execute(sql`
        UPDATE group_buys SET forced_usernames = (
          SELECT jsonb_agg(CASE WHEN lower(elem #>> '{}') IN (${oldBare}, ${oldWithAt}) THEN to_jsonb(${newWithAt}::text) ELSE elem END)
          FROM jsonb_array_elements(COALESCE(forced_usernames, '[]'::jsonb)) AS elem
        ) WHERE forced_usernames IS NOT NULL
          AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(forced_usernames) t WHERE lower(t) IN (${oldBare}, ${oldWithAt}))
      `);
      await tx.execute(sql`
        UPDATE group_buys SET qr_viewer_usernames = (
          SELECT jsonb_agg(CASE WHEN lower(elem #>> '{}') IN (${oldBare}, ${oldWithAt}) THEN to_jsonb(${newWithAt}::text) ELSE elem END)
          FROM jsonb_array_elements(COALESCE(qr_viewer_usernames, '[]'::jsonb)) AS elem
        ) WHERE qr_viewer_usernames IS NOT NULL
          AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(qr_viewer_usernames) t WHERE lower(t) IN (${oldBare}, ${oldWithAt}))
      `);
      await tx.execute(sql`
        UPDATE group_buys SET leg_viewer_access = (
          SELECT jsonb_agg(
            CASE WHEN lower(elem->>'username') IN (${oldBare}, ${oldWithAt})
              THEN elem || jsonb_build_object('username', ${newWithAt}::text)
              ELSE elem
            END
          )
          FROM jsonb_array_elements(COALESCE(leg_viewer_access, '[]'::jsonb)) AS elem
        ) WHERE leg_viewer_access IS NOT NULL
          AND EXISTS (SELECT 1 FROM jsonb_array_elements(leg_viewer_access) e WHERE lower(e->>'username') IN (${oldBare}, ${oldWithAt}))
      `);

      // 4. Re-key the customers profile row (PK — no FK to accounts, stored WITH @).
      if (existingCustomer) {
        const { telegramUsername: _old, createdAt: _ca, updatedAt: _ua, ...rest } = existingCustomer as any;
        await tx.execute(sql`DELETE FROM customers WHERE lower(telegram_username) IN (${oldBare}, ${oldWithAt})`);
        await tx.insert(customersTable).values({ ...rest, telegramUsername: newWithAt });
      }
    });

    writeLog("change", "info", "admin_account_rename",
      `Admin renamed account ${oldBare} → ${newBare}`,
      { oldUsername: oldBare, newUsername: newBare },
      req.ip,
    ).catch(() => {});

    res.json({ ok: true, oldUsername: oldBare, newUsername: newBare });
  } catch (err: any) {
    console.error("[admin/accounts/rename]", err);
    res.status(500).json({ error: "Rename failed", detail: err?.message });
  }
});

// ── DELETE /admin/accounts/:username ─────────────────────────────────────────
// Permanently deletes a member account and all related data.
router.delete("/admin/accounts/:username", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const raw = decodeURIComponent(req.params.username as string);
    const bare = raw.replace(/^@/, "").toLowerCase();
    const withAt = `@${bare}`;
    const allVariants = [bare, withAt];

    // Confirm the account exists before deleting
    const [existing] = await db
      .select({ telegramUsername: accountsTable.telegramUsername })
      .from(accountsTable)
      .where(or(
        eq(sql`lower(${accountsTable.telegramUsername})`, bare),
        eq(sql`lower(${accountsTable.telegramUsername})`, withAt),
      ));

    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // accountsTable has cascade deletes for accountGroupBuys, gbWaitlist, organiserAuditLog
    await db.delete(accountsTable).where(
      or(
        eq(sql`lower(${accountsTable.telegramUsername})`, bare),
        eq(sql`lower(${accountsTable.telegramUsername})`, withAt),
      )
    );
    // Also remove the matching customer record if one exists
    await db.delete(customersTable).where(inArray(customersTable.telegramUsername, allVariants));

    await writeLog("change", "info", "admin_delete_account",
      `Admin permanently deleted account @${bare}`,
      { username: bare });

    res.json({ ok: true, deleted: bare });
  } catch (err: any) {
    console.error("[admin/accounts DELETE]", err);
    res.status(500).json({ error: "Failed to delete account", detail: err?.message });
  }
});

// ── POST /admin/accounts/merge ────────────────────────────────
// Merges sourceUsername into targetUsername (target survives, source deleted)
router.post("/admin/accounts/merge", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { sourceUsername, targetUsername } = req.body;
  if (!sourceUsername || !targetUsername || sourceUsername === targetUsername) {
    res.status(400).json({ error: "sourceUsername and targetUsername must be different non-empty values" });
    return;
  }

  const [source] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, sourceUsername));
  const [target] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, targetUsername));
  if (!source) { res.status(404).json({ error: `Account '${sourceUsername}' not found` }); return; }
  if (!target) { res.status(404).json({ error: `Account '${targetUsername}' not found` }); return; }

  // Re-point orders
  await db.update(ordersTable).set({ telegramUsername: targetUsername }).where(eq(ordersTable.telegramUsername, sourceUsername));
  // Re-point blood tests
  await db.update(bloodTestSessionsTable).set({ telegramUsername: targetUsername }).where(eq(bloodTestSessionsTable.telegramUsername, sourceUsername));

  // Merge GB memberships — only where target doesn't already have one for that GB
  const srcMemberships = await db.select().from(accountGroupBuysTable).where(eq(accountGroupBuysTable.accountId, sourceUsername));
  const tgtMemberships = await db.select({ groupBuyId: accountGroupBuysTable.groupBuyId }).from(accountGroupBuysTable).where(eq(accountGroupBuysTable.accountId, targetUsername));
  const tgtGbIds = new Set(tgtMemberships.map(m => m.groupBuyId));
  for (const m of srcMemberships) {
    if (!tgtGbIds.has(m.groupBuyId)) {
      await db.update(accountGroupBuysTable).set({ accountId: targetUsername }).where(eq(accountGroupBuysTable.id, m.id));
    } else {
      await db.delete(accountGroupBuysTable).where(eq(accountGroupBuysTable.id, m.id));
    }
  }

  // Re-point compound logs
  const compoundLogsTableImport = compoundLogsTable;
  await db.update(compoundLogsTableImport).set({ telegramUsername: targetUsername }).where(eq(compoundLogsTableImport.telegramUsername, sourceUsername));

  // Delete source account
  await db.delete(accountsTable).where(eq(accountsTable.telegramUsername, sourceUsername));

  writeLog("change", "warn", "accounts_merged",
    `Account '${sourceUsername}' merged into '${targetUsername}' by admin`,
    { source: sourceUsername, target: targetUsername },
    req.ip ?? "unknown",
  ).catch(() => {});

  res.json({ ok: true, merged: sourceUsername, into: targetUsername });
});

// ── GET /admin/lab-sessions/compare/:username ─────────────────
// Returns the two most recent blood test sessions with values for comparison
router.get("/admin/lab-sessions/compare/:username", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const username = req.params.username;
  const alt = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const sessions = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(or(eq(bloodTestSessionsTable.telegramUsername, username), eq(bloodTestSessionsTable.telegramUsername, alt)))
    .orderBy(desc(bloodTestSessionsTable.testDate))
    .limit(2);

  if (sessions.length < 2) {
    res.json({ sessions, comparison: null, message: sessions.length === 0 ? "No sessions found" : "Only one session — need at least 2 to compare" });
    return;
  }

  const sessionIds = sessions.map(s => s.id);
  const allValues = await db.select().from(bloodTestValuesTable).where(inArray(bloodTestValuesTable.sessionId, sessionIds));

  const bySession: Record<string, typeof allValues> = {};
  for (const v of allValues) {
    if (!bySession[v.sessionId]) bySession[v.sessionId] = [];
    bySession[v.sessionId].push(v);
  }

  const [current, previous] = sessions;
  const currentVals = bySession[current.id] ?? [];
  const prevVals = bySession[previous.id] ?? [];
  const prevMap = new Map(prevVals.map(v => [v.biomarkerName, v]));

  const comparison = currentVals.map(cv => {
    const prev = prevMap.get(cv.biomarkerName);
    const currNum = parseFloat(String(cv.value));
    const prevNum = prev ? parseFloat(String(prev.value)) : null;
    const delta = (prevNum != null && !isNaN(prevNum)) ? +(currNum - prevNum).toFixed(4) : null;
    const outOfRange = (cv.refRangeLow != null && currNum < parseFloat(String(cv.refRangeLow))) ||
                       (cv.refRangeHigh != null && currNum > parseFloat(String(cv.refRangeHigh)));
    return {
      biomarkerName: cv.biomarkerName,
      biomarkerCategory: cv.biomarkerCategory,
      unit: cv.unit,
      current: currNum,
      previous: prevNum,
      delta,
      refRangeLow: cv.refRangeLow ? parseFloat(String(cv.refRangeLow)) : null,
      refRangeHigh: cv.refRangeHigh ? parseFloat(String(cv.refRangeHigh)) : null,
      outOfRange,
    };
  });

  res.json({ sessions, comparison });
});

// ── PATCH /admin/lab-tests/bulk-batch-code ────────────────────
// Body: { batchCode: string, testIds: number[] }
// Sets the batchCode of all specified tests to the given value.
router.patch("/admin/lab-tests/bulk-batch-code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { batchCode, testIds } = req.body as { batchCode?: string; testIds?: unknown };
  if (typeof batchCode !== "string" || batchCode.trim() === "") {
    res.status(400).json({ error: "batchCode is required" }); return;
  }
  if (!Array.isArray(testIds) || testIds.length === 0) {
    res.status(400).json({ error: "testIds must be a non-empty array" }); return;
  }
  const ids = testIds.filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid testIds provided" }); return;
  }
  await db
    .update(labTestsTable)
    .set({ batchCode: batchCode.trim() })
    .where(inArray(labTestsTable.id, ids));
  res.json({ updated: ids.length });
});

// ── GET /admin/lab-tests/export ───────────────────────────────
router.get("/admin/lab-tests/export", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const tests = await db.select().from(labTestsTable).orderBy(desc(labTestsTable.id));

  const header = "id,peptideName,supplier,purityPct,testDate,labName,testType,mgAmount,batchCode,endotoxinEuMg,sterilityPass,pending\n";
  const rows = tests.map(t =>
    [t.id, t.peptideName, t.supplier, t.purityPct ?? "", t.testDate ?? "", t.labName, t.testType ?? "", t.mgAmount ?? "", t.batchCode ?? "", t.endotoxinEuMg ?? "", t.sterilityPass ?? "", t.pending]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=lab-tests.csv");
  res.send(header + rows);
});

// ── GET /admin/blood-test-values/export ───────────────────────
router.get("/admin/blood-test-values/export", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const sessions = await db.select().from(bloodTestSessionsTable).orderBy(desc(bloodTestSessionsTable.testDate));
  const values = await db.select().from(bloodTestValuesTable);
  const sessionMap = new Map(sessions.map(s => [s.id, s]));

  const header = "sessionId,telegramUsername,testDate,labName,biomarkerName,biomarkerCategory,value,unit,refRangeLow,refRangeHigh\n";
  const rows = values.map(v => {
    const s = sessionMap.get(v.sessionId);
    return [v.sessionId, s?.telegramUsername ?? "", s?.testDate ?? "", s?.labName ?? "", v.biomarkerName, v.biomarkerCategory, v.value, v.unit, v.refRangeLow ?? "", v.refRangeHigh ?? ""]
      .map(x => `"${String(x ?? "").replace(/"/g, '""')}"`)
      .join(",");
  }).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=blood-test-results.csv");
  res.send(header + rows);
});

// ── GET /admin/scheduled-announcements ────────────────────────
router.get("/admin/scheduled-announcements", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rows = await db.select().from(scheduledAnnouncementsTable).orderBy(asc(scheduledAnnouncementsTable.sendAt));
  res.json(rows);
});

// ── POST /admin/scheduled-announcements ───────────────────────
router.post("/admin/scheduled-announcements", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { title, message, body, sendAt, groupBuyId, targetType } = req.body;
  const msgText = message || body;
  if (!title || !msgText) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }

  const [row] = await db.insert(scheduledAnnouncementsTable).values({
    id: randomUUID(),
    title: String(title).trim(),
    message: String(msgText).trim(),
    sendAt: sendAt ? new Date(sendAt) : new Date(),
    groupBuyId: groupBuyId || null,
  }).returning();

  res.status(201).json(row);
});

// ── PATCH /admin/scheduled-announcements/:id ──────────────────
router.patch("/admin/scheduled-announcements/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { title, message, sendAt, groupBuyId } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (message !== undefined) updates.message = String(message).trim();
  if (sendAt !== undefined) updates.sendAt = new Date(sendAt);
  if (groupBuyId !== undefined) updates.groupBuyId = groupBuyId || null;

  const [updated] = await db
    .update(scheduledAnnouncementsTable)
    .set(updates)
    .where(eq(scheduledAnnouncementsTable.id, req.params.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ── DELETE /admin/scheduled-announcements/:id ─────────────────
router.delete("/admin/scheduled-announcements/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(scheduledAnnouncementsTable).where(eq(scheduledAnnouncementsTable.id, req.params.id));
  res.json({ ok: true });
});

// ── POST /admin/scheduled-announcements/:id/send ─────────────
// Trigger an announcement immediately (bypass scheduled time)
router.post("/admin/scheduled-announcements/:id/send", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [ann] = await db.select().from(scheduledAnnouncementsTable).where(eq(scheduledAnnouncementsTable.id, req.params.id));
  if (!ann) { res.status(404).json({ error: "Not found" }); return; }
  if (ann.sent) { res.status(409).json({ error: "Already sent" }); return; }

  // Get recipients — if groupBuyId, only members of that GB; otherwise all accounts with chat IDs
  let recipients: { chatId: string | null; username: string }[] = [];
  if (ann.groupBuyId) {
    const members = await db
      .select({ chatId: accountsTable.telegramChatId, username: accountGroupBuysTable.accountId })
      .from(accountGroupBuysTable)
      .leftJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
      .where(eq(accountGroupBuysTable.groupBuyId, ann.groupBuyId));
    recipients = members;
  } else {
    const accounts = await db.select({ chatId: accountsTable.telegramChatId, username: accountsTable.telegramUsername }).from(accountsTable);
    recipients = accounts;
  }

  let sent = 0;
  for (const r of recipients) {
    if (r.chatId) {
      const ok = await sendTelegramMessage(r.chatId, ann.message).catch(() => false);
      if (ok) sent++;
    }
  }

  await db.update(scheduledAnnouncementsTable)
    .set({ sent: true, sentAt: new Date(), recipientCount: String(sent) })
    .where(eq(scheduledAnnouncementsTable.id, req.params.id));

  res.json({ ok: true, sent, total: recipients.length });
});

// ── GET /admin/maintenance ────────────────────────────────────
router.get("/admin/maintenance", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [cfg] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "maintenance_mode"));
  res.json({ enabled: cfg?.value === "true", message: null });
});

// ── PUT /admin/maintenance ────────────────────────────────────
router.put("/admin/maintenance", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { enabled, message } = req.body;
  const val = Boolean(enabled);

  await db
    .insert(siteConfigTable)
    .values({ key: "maintenance_mode", value: String(val) })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: String(val) } });

  if (message !== undefined) {
    await db
      .insert(siteConfigTable)
      .values({ key: "maintenance_message", value: message || "" })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: message || "" } });
  }

  res.json({ ok: true, enabled: val });
});

// ── GET /admin/low-stock ──────────────────────────────────────
// Returns products with stock set that are at or below their threshold
router.get("/admin/low-stock", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  const lowStock = products.filter(p =>
    p.stock != null && p.lowStockThreshold != null && p.stock <= p.lowStockThreshold
  );

  res.json(lowStock.map(p => ({
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    active: p.active,
  })));
});

// ─── Bulk Import: AI Parse ─────────────────────────────────────────────────────
// POST /api/admin/orders/bulk-import/parse
// Accepts raw text or JSON array, calls Gemini to extract structured order rows,
// resolves each row against real products and accounts in the DB.
router.post("/admin/orders/bulk-import/parse", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { rawText } = req.body;
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    res.status(400).json({ error: "rawText is required" });
    return;
  }
  if (rawText.length > 50000) {
    res.status(400).json({ error: "Input too large (max 50,000 characters)" });
    return;
  }

  // Load products and delivery methods from DB for matching
  const [dbProducts, dbDeliveryMethods, dbAccounts] = await Promise.all([
    db.select({ id: productsTable.id, name: productsTable.name, price: productsTable.price, active: productsTable.active }).from(productsTable),
    db.select({ id: deliveryMethodsTable.id, name: deliveryMethodsTable.name, price: deliveryMethodsTable.price }).from(deliveryMethodsTable),
    db.select({ telegramUsername: accountsTable.telegramUsername }).from(accountsTable),
  ]);

  const activeProducts = dbProducts.filter(p => p.active);
  const productNames = activeProducts.map(p => p.name);
  const deliveryNames = dbDeliveryMethods.map(d => d.name);
  const accountUsernames = dbAccounts.map(a => a.telegramUsername.replace(/^@/, "").toLowerCase());

  const geminiClient = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
  });

  const prompt = `You are an order data extraction assistant for a peptide/research chemical store called Salt&Peps.

Extract order rows from the following raw input. The input may be a CSV, spreadsheet paste, plain text list, or JSON.

Available products (use EXACT names from this list when matching, or closest match):
${productNames.slice(0, 200).join("\n")}

Available delivery methods:
${deliveryNames.join("\n")}

For each order row you find, output a JSON array with objects having this structure:
{
  "telegramUsername": "<username without @>",
  "products": [{"name": "<product name>", "quantity": <number>}],
  "deliveryMethod": "<delivery method name or best guess>",
  "notes": "<any notes or null>"
}

Rules:
- Extract as many orders as you can find.
- telegramUsername should be without the @ prefix.
- For products, match as closely as possible to the available product list. If no match, use the raw name.
- For deliveryMethod, match as closely as possible to the available delivery methods. If unclear, use the first available one.
- quantity should be a positive number (default 1 if not specified).
- Return ONLY valid JSON array, no markdown, no code blocks, no extra text.
- If input is already a JSON array in the right format, normalize it to match the schema above.
- Maximum 100 orders.

Raw input:
${rawText.slice(0, 40000)}`;

  let geminiRows: Array<{
    telegramUsername: string;
    products: Array<{ name: string; quantity: number }>;
    deliveryMethod: string;
    notes: string | null;
  }> = [];

  try {
    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = (response.text ?? "").trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) geminiRows = parsed.slice(0, 100);
  } catch (err) {
    console.error("[bulk-import/parse] Gemini error:", err);
    res.status(502).json({ error: "AI parsing failed — please check input format and try again" });
    return;
  }

  // Fuzzy match helper — finds best product match
  function fuzzyMatchProduct(name: string): { product: typeof activeProducts[0] | null; confidence: "matched" | "partial" | "unmatched" } {
    const lower = name.toLowerCase().trim();
    // Exact match
    const exact = activeProducts.find(p => p.name.toLowerCase() === lower);
    if (exact) return { product: exact, confidence: "matched" };
    // Contains match
    const contains = activeProducts.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
    if (contains) return { product: contains, confidence: "partial" };
    // Word overlap match
    const inputWords = lower.split(/\s+/).filter(w => w.length > 2);
    let bestScore = 0;
    let bestProduct: typeof activeProducts[0] | null = null;
    for (const p of activeProducts) {
      const productWords = p.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const overlap = inputWords.filter(w => productWords.includes(w)).length;
      const score = overlap / Math.max(inputWords.length, productWords.length, 1);
      if (score > bestScore) { bestScore = score; bestProduct = p; }
    }
    if (bestScore >= 0.4 && bestProduct) return { product: bestProduct, confidence: "partial" };
    return { product: null, confidence: "unmatched" };
  }

  function fuzzyMatchDelivery(name: string): typeof dbDeliveryMethods[0] | null {
    const lower = name.toLowerCase().trim();
    const exact = dbDeliveryMethods.find(d => d.name.toLowerCase() === lower);
    if (exact) return exact;
    const contains = dbDeliveryMethods.find(d => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase()));
    if (contains) return contains;
    return dbDeliveryMethods[0] ?? null;
  }

  function resolveUser(username: string): { found: boolean; normalizedUsername: string } {
    const lower = username.toLowerCase().replace(/^@/, "");
    const found = accountUsernames.includes(lower);
    return { found, normalizedUsername: `@${lower}` };
  }

  // Build preview rows
  const previewRows = geminiRows.map((row, idx) => {
    const userInfo = resolveUser(row.telegramUsername ?? "");
    const delivery = fuzzyMatchDelivery(row.deliveryMethod ?? "");

    const lineItems = (row.products ?? []).map((p: { name: string; quantity: number }) => {
      const { product, confidence } = fuzzyMatchProduct(p.name);
      return {
        rawName: p.name,
        productId: product?.id ?? null,
        productName: product?.name ?? p.name,
        quantity: Math.max(0.5, parseFloat(String(p.quantity)) || 1),
        unitPrice: product ? parseFloat(String(product.price)) : 0,
        matchConfidence: confidence,
      };
    });

    const hasUnmatchedUser = !userInfo.found;
    const hasUnmatchedProduct = lineItems.some((li: { matchConfidence: string }) => li.matchConfidence === "unmatched");
    const overallConfidence: "matched" | "partial" | "unmatched" =
      hasUnmatchedUser || hasUnmatchedProduct ? "unmatched"
      : lineItems.some((li: { matchConfidence: string }) => li.matchConfidence === "partial") ? "partial"
      : "matched";

    const productSubtotal = lineItems.reduce((s: number, li: { quantity: number; unitPrice: number }) => s + li.quantity * li.unitPrice, 0);
    const deliveryPrice = delivery ? parseFloat(String(delivery.price)) : 0;
    const grandTotal = productSubtotal + deliveryPrice;

    return {
      _rowIdx: idx,
      telegramUsername: userInfo.normalizedUsername,
      userFound: userInfo.found,
      deliveryMethodId: delivery?.id ?? null,
      deliveryMethodName: delivery?.name ?? row.deliveryMethod ?? "",
      deliveryPrice,
      lineItems,
      notes: row.notes ?? null,
      productSubtotal,
      grandTotal,
      confidence: overallConfidence,
    };
  });

  res.json({ rows: previewRows, deliveryMethods: dbDeliveryMethods, products: activeProducts.map(p => ({ id: p.id, name: p.name, price: parseFloat(String(p.price)) })) });
});

// ─── Bulk Import: Confirm ──────────────────────────────────────────────────────
// POST /api/admin/orders/bulk-import/confirm
// Accepts reviewed rows and creates orders in a transaction.
router.post("/admin/orders/bulk-import/confirm", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }
  if (rows.length > 100) {
    res.status(400).json({ error: "Maximum 100 rows per import" });
    return;
  }

  const VALID_STATUSES = ["Draft", "Submitted", "Processing", "Shipped", "Completed", "Cancelled"];

  const results: Array<{ rowIdx: number; success: boolean; orderId?: string; code?: string; error?: string; duplicate?: boolean }> = [];

  // Load delivery methods once
  const dbDeliveryMethods = await db.select().from(deliveryMethodsTable);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const tgRaw = String(row.telegramUsername ?? "").trim();
      const tg = tgRaw.startsWith("@") ? tgRaw : `@${tgRaw}`;

      if (!tg || tg === "@") {
        results.push({ rowIdx: i, success: false, error: "Missing telegram username" });
        continue;
      }

      // Resolve delivery method
      const deliveryMethodId = String(row.deliveryMethodId ?? "").trim();
      const deliveryMethod = dbDeliveryMethods.find(d => d.id === deliveryMethodId);
      if (!deliveryMethod) {
        results.push({ rowIdx: i, success: false, error: `Unknown delivery method: ${deliveryMethodId}` });
        continue;
      }

      // Validate line items
      const clientLineItems: Array<{ productName: string; quantity: number; unitPrice: number }> = (row.lineItems ?? [])
        .filter((li: any) => li.productName && parseFloat(String(li.quantity)) > 0)
        .slice(0, 50)
        .map((li: any) => ({
          productName: String(li.productName).trim().slice(0, 200),
          quantity: Math.max(0.5, parseFloat(String(li.quantity)) || 1),
          unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
        }));

      if (clientLineItems.length === 0) {
        results.push({ rowIdx: i, success: false, error: "No valid line items" });
        continue;
      }

      // Duplicate detection: same user + same product names
      const itemSignature = clientLineItems.map(li => `${li.productName}:${li.quantity}`).sort().join("|");
      const existingOrders = await db
        .select({ id: ordersTable.id, code: ordersTable.code })
        .from(ordersTable)
        .where(sql`lower(${ordersTable.telegramUsername}) = ${tg.toLowerCase()}`)
        .limit(50);

      let isDuplicate = false;
      if (existingOrders.length > 0) {
        const existingOrderIds = existingOrders.map(o => o.id);
        const existingItems = await db
          .select()
          .from(orderLineItemsTable)
          .where(inArray(orderLineItemsTable.orderId, existingOrderIds));
        for (const eo of existingOrders) {
          const eoItems = existingItems.filter(li => li.orderId === eo.id);
          const eoSig = eoItems.map(li => `${li.productName}:${parseFloat(String(li.quantity))}`).sort().join("|");
          if (eoSig === itemSignature) { isDuplicate = true; break; }
        }
      }

      const deliveryPrice = parseFloat(String(deliveryMethod.price));
      const vendorShipping = Math.max(0, parseFloat(String(row.vendorShipping ?? 0)) || 0);
      const tip = Math.min(20, Math.max(0, parseFloat(String(row.tip ?? 0)) || 0));
      const productSubtotal = clientLineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      const grandTotal = productSubtotal + deliveryPrice + vendorShipping + tip;

      const orderId = randomUUID();
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const status = VALID_STATUSES.includes(String(row.status ?? "")) ? String(row.status) : "Submitted";

      await db.insert(ordersTable).values({
        id: orderId,
        code,
        telegramUsername: tg,
        status: status as any,
        deliveryMethodId: deliveryMethod.id,
        deliveryMethod: deliveryMethod.name,
        deliveryPrice: deliveryPrice.toFixed(2) as any,
        vendorShipping: vendorShipping.toFixed(2) as any,
        tip: tip.toFixed(2) as any,
        productSubtotal: productSubtotal.toFixed(2) as any,
        grandTotal: grandTotal.toFixed(2) as any,
        notes: row.notes ? String(row.notes).slice(0, 1000) : null,
        pin: "0000",
      });

      await db.insert(orderLineItemsTable).values(
        clientLineItems.map(li => ({
          id: randomUUID(),
          orderId,
          productId: String(row.lineItems?.find((rli: any) => rli.productName === li.productName)?.productId ?? ""),
          productName: li.productName,
          quantity: String(li.quantity) as any,
          unitPrice: li.unitPrice.toFixed(2) as any,
          lineTotal: (li.quantity * li.unitPrice).toFixed(2) as any,
        }))
      );

      writeLog("order", "info", "order_bulk_imported",
        `Bulk import: order ${code} created for ${tg}`,
        { orderId, code, telegramUsername: tg, grandTotal: grandTotal.toFixed(2), isDuplicate },
        (req.ip ?? "unknown") as string,
      ).catch(() => {});

      results.push({ rowIdx: i, success: true, orderId, code, duplicate: isDuplicate });
    } catch (err: any) {
      console.error(`[bulk-import/confirm] row ${i} error:`, err);
      results.push({ rowIdx: i, success: false, error: err?.message ?? "Unknown error" });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  res.json({ results, successCount, failCount });
});

// ── GET /admin/discuss-limit ──────────────────────────────────
router.get("/admin/discuss-limit", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [cfg] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "discuss_limit"));
  const limit = cfg?.value ? (parseInt(cfg.value, 10) || 5) : 5;
  res.json({ limit });
});

// ── PUT /admin/discuss-limit ──────────────────────────────────
router.put("/admin/discuss-limit", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const raw = req.body?.limit;
  const val = Number(raw);
  if (!Number.isInteger(val) || val < 0) {
    res.status(400).json({ error: "limit must be a non-negative integer" });
    return;
  }
  await db.insert(siteConfigTable).values({ key: "discuss_limit", value: String(val) })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: String(val) } });
  res.json({ ok: true, limit: val });
});

// ── GET /admin/accounts/:username/discuss ─────────────────────
router.get("/admin/accounts/:username/discuss", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = decodeURIComponent(req.params.username);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
  const [acct] = await db.select({ discussCount: accountsTable.discussCount, discussLimitOverride: accountsTable.discussLimitOverride })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }
  const [cfg] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "discuss_limit"));
  const globalLimit = cfg?.value ? (parseInt(cfg.value, 10) || 5) : 5;
  res.json({
    discussCount: acct.discussCount,
    discussLimitOverride: acct.discussLimitOverride,
    globalLimit,
    effectiveLimit: acct.discussLimitOverride != null ? acct.discussLimitOverride : globalLimit,
  });
});

// ── PUT /admin/accounts/:username/discuss ─────────────────────
router.put("/admin/accounts/:username/discuss", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = decodeURIComponent(req.params.username);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
  const { limitOverride } = req.body;

  const [existing] = await db.select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
  if (!existing) { res.status(404).json({ error: "Account not found" }); return; }

  if (limitOverride !== null && limitOverride !== undefined) {
    const val = Number(limitOverride);
    if (!Number.isInteger(val) || val < 0) {
      res.status(400).json({ error: "limitOverride must be a non-negative integer or null" });
      return;
    }
    await db.update(accountsTable).set({ discussLimitOverride: val })
      .where(eq(accountsTable.telegramUsername, existing.telegramUsername));
  } else {
    await db.update(accountsTable).set({ discussLimitOverride: null })
      .where(eq(accountsTable.telegramUsername, existing.telegramUsername));
  }

  const [acct] = await db.select({ discussCount: accountsTable.discussCount, discussLimitOverride: accountsTable.discussLimitOverride })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, existing.telegramUsername));
  const [cfg] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "discuss_limit"));
  const globalLimit = cfg?.value ? (parseInt(cfg.value, 10) || 5) : 5;

  res.json({
    ok: true,
    discussCount: acct?.discussCount ?? 0,
    discussLimitOverride: acct?.discussLimitOverride ?? null,
    globalLimit,
    effectiveLimit: acct?.discussLimitOverride != null ? acct.discussLimitOverride : globalLimit,
  });
});

// ── PUT /admin/accounts/:username/wholesale ─────────────────────
router.put("/admin/accounts/:username/wholesale", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = decodeURIComponent(req.params.username);
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
  const { isWholesale } = req.body;

  if (typeof isWholesale !== "boolean") {
    res.status(400).json({ error: "isWholesale must be a boolean" }); return;
  }

  const [existing] = await db.select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
  if (!existing) { res.status(404).json({ error: "Account not found" }); return; }

  await db.update(accountsTable).set({ isWholesale })
    .where(eq(accountsTable.telegramUsername, existing.telegramUsername));

  res.json({ ok: true, isWholesale });
});

// ── POST /admin/accounts/bulk-role — grant/revoke a role for many accounts ──────
// Body: { usernames: string[], role: "wholesale"|"pool_leader"|"organiser", action: "grant"|"revoke" }
router.post("/admin/accounts/bulk-role", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUser = getAdminUsername(res);
  const { usernames, role, action } = req.body as {
    usernames?: unknown; role?: unknown; action?: unknown;
  };

  if (!Array.isArray(usernames) || usernames.length === 0 || !usernames.every(u => typeof u === "string")) {
    res.status(400).json({ error: "usernames must be a non-empty string array" }); return;
  }
  const VALID_ROLES = ["wholesale", "pool_leader", "organiser"];
  if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "role must be one of: wholesale, pool_leader, organiser" }); return;
  }
  if (action !== "grant" && action !== "revoke") {
    res.status(400).json({ error: "action must be one of: grant, revoke" }); return;
  }
  const act: "grant" | "revoke" = action;

  // Build all username variants (@-prefixed and bare) so matching is robust
  const variants = new Set<string>();
  for (const u of usernames as string[]) {
    const name = u.trim();
    if (!name) continue;
    variants.add(name);
    variants.add(name.startsWith("@") ? name.slice(1) : `@${name}`);
  }
  const variantList = Array.from(variants);
  if (variantList.length === 0) { res.status(400).json({ error: "No valid usernames" }); return; }

  // Resolve the canonical accounts that actually exist
  const existing = await db
    .select({ telegramUsername: accountsTable.telegramUsername, organiserStatus: accountsTable.organiserStatus })
    .from(accountsTable)
    .where(inArray(accountsTable.telegramUsername, variantList));

  if (existing.length === 0) { res.status(404).json({ error: "No matching accounts found" }); return; }
  const canonical = existing.map(e => e.telegramUsername);

  if (role === "wholesale") {
    await db.update(accountsTable)
      .set({ isWholesale: act === "grant" })
      .where(inArray(accountsTable.telegramUsername, canonical));
  } else if (role === "pool_leader") {
    await db.update(accountsTable)
      .set({ poolLeaderStatus: act === "grant" ? "approved" : null, updatedAt: new Date() })
      .where(inArray(accountsTable.telegramUsername, canonical));
  } else {
    // organiser
    await db.update(accountsTable)
      .set(act === "grant"
        ? { organiserStatus: "approved", organiserApprovedAt: new Date() }
        : { organiserStatus: null, organiserApprovedAt: null })
      .where(inArray(accountsTable.telegramUsername, canonical));

    // Per-account audit log (deterministic) + applicant notification (best-effort)
    const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";
    await Promise.allSettled(
      existing.map(acct =>
        db.insert(organiserAuditLogTable).values({
          adminUsername: adminUser,
          organiserUsername: acct.telegramUsername,
          actionType: "status_change",
          previousValue: acct.organiserStatus ?? null,
          newValue: act === "grant" ? "approved" : null,
        }),
      ),
    );
    if (act === "grant") {
      for (const acct of existing) {
        notifyUserFromTemplate(acct.telegramUsername, "role_application", "applicant_organiser_approved", {
          username: acct.telegramUsername.replace(/^@/, ""),
          app_url: appUrl,
        }).catch(() => {});
      }
    }
  }

  writeLog(
    "change", "info", "bulk_role_change",
    `Admin ${act === "grant" ? "granted" : "revoked"} ${role} for ${canonical.length} account(s)`,
    { role, action: act, usernames: canonical, adminUser },
  ).catch(() => {});

  res.json({ ok: true, updated: canonical.length, role, action: act });
});

// ─── Category Order ───────────────────────────────────────────
router.get("/admin/category-order", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "category_order"));
  res.json({ order: row?.value ? JSON.parse(row.value) : [] });
});

router.put("/admin/category-order", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { order } = req.body;
  if (!Array.isArray(order) || !order.every((c: unknown) => typeof c === "string")) {
    res.status(400).json({ error: "order must be a string array" }); return;
  }
  await db.insert(siteConfigTable).values({ key: "category_order", value: JSON.stringify(order) })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(order) } });
  res.json({ ok: true, order });
});

router.get("/public/category-order", async (_req, res): Promise<void> => {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "category_order"));
  res.json({ order: row?.value ? JSON.parse(row.value) : [] });
});

// ─── Credits endpoints ────────────────────────────────────────────────────────

// GET /api/admin/accounts/:username/credits — balance + transaction history
router.get("/admin/accounts/:username/credits", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = decodeURIComponent(String(req.params["username"]));
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [acct] = await db
    .select({ credits: accountsTable.credits })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }

  const transactions = await db
    .select()
    .from(creditTransactionsTable)
    .where(or(eq(creditTransactionsTable.accountUsername, username), eq(creditTransactionsTable.accountUsername, altUsername)))
    .orderBy(desc(creditTransactionsTable.createdAt));

  // Enrich each transaction with the human-readable order code where an orderId exists
  const orderIds = transactions.map(t => t.orderId).filter(Boolean) as string[];
  const orderCodeMap = new Map<string, string>();
  if (orderIds.length > 0) {
    const orderRows = await db
      .select({ id: ordersTable.id, code: ordersTable.code })
      .from(ordersTable)
      .where(inArray(ordersTable.id, orderIds));
    for (const row of orderRows) orderCodeMap.set(row.id, row.code);
  }

  const enriched = transactions.map(t => ({
    ...t,
    orderCode: t.orderId ? (orderCodeMap.get(t.orderId) ?? null) : null,
  }));

  res.json({ credits: acct.credits, transactions: enriched });
});

// GET /api/admin/credit-log — paginated global credit transaction log
router.get("/admin/credit-log", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "50")), 200);
  const offset = parseInt(String(req.query["offset"] ?? "0")) || 0;
  const q = String(req.query["q"] ?? "").trim().toLowerCase();
  const type = String(req.query["type"] ?? "all"); // "all" | "credit" | "debit"

  const conditions: any[] = [];
  if (q) {
    const likeQ = `%${q}%`;
    conditions.push(or(
      ilike(creditTransactionsTable.accountUsername, likeQ),
      ilike(creditTransactionsTable.reason, likeQ),
      ilike(creditTransactionsTable.adminUsername, likeQ),
    ));
  }
  if (type === "credit") conditions.push(sql`${creditTransactionsTable.amount} > 0`);
  if (type === "debit")  conditions.push(sql`${creditTransactionsTable.amount} < 0`);

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(creditTransactionsTable)
    .where(where);

  const rows = await db
    .select()
    .from(creditTransactionsTable)
    .where(where)
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with order codes
  const orderIds = rows.map(r => r.orderId).filter(Boolean) as string[];
  const orderCodeMap = new Map<string, string>();
  if (orderIds.length > 0) {
    const orderRows = await db
      .select({ id: ordersTable.id, code: ordersTable.code })
      .from(ordersTable)
      .where(inArray(ordersTable.id, orderIds));
    for (const row of orderRows) orderCodeMap.set(row.id, row.code);
  }

  const transactions = rows.map(r => ({
    ...r,
    orderCode: r.orderId ? (orderCodeMap.get(r.orderId) ?? null) : null,
  }));

  res.json({ total: count, transactions });
});

// POST /api/admin/accounts/:username/credits — add/deduct credits manually
router.post("/admin/accounts/:username/credits", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUser = getAdminUsername(res);
  const username = decodeURIComponent(String(req.params["username"]));
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const { amount, reason, orderId } = req.body as { amount: number; reason: string; orderId?: string };
  if (typeof amount !== "number" || amount === 0) { res.status(400).json({ error: "amount must be a non-zero number" }); return; }
  if (!reason || typeof reason !== "string") { res.status(400).json({ error: "reason is required" }); return; }

  const [acct] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, credits: accountsTable.credits })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!acct) { res.status(404).json({ error: "Account not found" }); return; }

  const newBalance = acct.credits + amount;
  await db.update(accountsTable)
    .set({ credits: newBalance })
    .where(eq(accountsTable.telegramUsername, acct.telegramUsername));

  // When the admin deducts credits against a specific order, stamp credits_applied
  // on that order so the payment verification knows the correct net amount.
  if (orderId && amount < 0) {
    const deducted = Math.abs(amount);
    const [targetOrder] = await db
      .select({ id: ordersTable.id, grandTotal: ordersTable.grandTotal, paymentStatus: ordersTable.paymentStatus, creditsApplied: ordersTable.creditsApplied })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));
    if (targetOrder) {
      const newCreditsApplied = (targetOrder.creditsApplied ?? 0) + deducted;
      await db.update(ordersTable)
        .set({ creditsApplied: newCreditsApplied })
        .where(eq(ordersTable.id, orderId));
      // Auto-confirm if credits now fully cover the order.
      // Use Math.ceil so a $30.99 order correctly requires ≥31 credits (not 30).
      if (Math.ceil(parseFloat(String(targetOrder.grandTotal))) <= newCreditsApplied && targetOrder.paymentStatus !== "confirmed") {
        await db.update(ordersTable).set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), amountDue: "0.00" }).where(eq(ordersTable.id, orderId));
        maybeSubmitSharedOrder(orderId).catch(() => {});
      }
    }
  }

  await db.insert(creditTransactionsTable).values({
    accountUsername: acct.telegramUsername,
    amount,
    reason,
    orderId: orderId ?? null,
    adminUsername: adminUser ?? "admin",
    createdAt: new Date(),
  });

  writeLog("change", "info", "credits_adjusted", `Admin adjusted credits for ${acct.telegramUsername} by ${amount} (${reason})`, { username: acct.telegramUsername, amount, reason, orderId }).catch(() => {});

  const sign = amount >= 0 ? "+" : "";
  const action = amount >= 0 ? "added to" : "deducted from";
  notifyUser(
    acct.telegramUsername,
    "profile",
    `💳 <b>Credits ${amount >= 0 ? "Added" : "Deducted"}</b>\n\n<b>${sign}$${amount}</b> has been ${action} your account by admin.\n\nReason: ${reason}\nNew balance: <b>$${newBalance}</b>`,
  ).catch(() => {});

  res.json({ ok: true, credits: newBalance });
});

// PATCH /api/admin/accounts/:username/pool-leader-status — update pool leader role status
router.patch("/admin/accounts/:username/pool-leader-status", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const username = decodeURIComponent(String(req.params["username"]));
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;
  const { status } = req.body as { status: string | null };
  const VALID_STATUSES = ["approved", "rejected", "suspended", null];
  if (!VALID_STATUSES.includes(status as string | null)) {
    res.status(400).json({ error: `status must be one of: approved, rejected, suspended, null` }); return;
  }
  await db.update(accountsTable)
    .set({ poolLeaderStatus: status ?? null, updatedAt: new Date() })
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));
  res.json({ ok: true, poolLeaderStatus: status });
});

// POST /api/admin/orders/:id/refund-to-credits — refund order grand total as credits
router.post("/admin/orders/:id/refund-to-credits", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const adminUser = getAdminUsername(res);
  const orderId = String(req.params["id"]);

  const [order] = await db
    .select({ id: ordersTable.id, grandTotal: ordersTable.grandTotal, telegramUsername: ordersTable.telegramUsername, code: ordersTable.code })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (!order.telegramUsername) { res.status(400).json({ error: "Order has no linked account" }); return; }

  const username = order.telegramUsername;
  const altUsername = username.startsWith("@") ? username.slice(1) : `@${username}`;

  const [acct] = await db
    .select({ telegramUsername: accountsTable.telegramUsername, credits: accountsTable.credits })
    .from(accountsTable)
    .where(or(eq(accountsTable.telegramUsername, username), eq(accountsTable.telegramUsername, altUsername)));

  if (!acct) { res.status(404).json({ error: "Customer account not found" }); return; }

  // Grand total is stored as a decimal string; round to whole USD dollars
  const totalAmount = Math.round(parseFloat(String(order.grandTotal ?? "0")));
  if (totalAmount <= 0) { res.status(400).json({ error: "Order total is zero — nothing to refund" }); return; }

  const newBalance = acct.credits + totalAmount;
  await db.update(accountsTable).set({ credits: newBalance }).where(eq(accountsTable.telegramUsername, acct.telegramUsername));

  await db.insert(creditTransactionsTable).values({
    accountUsername: acct.telegramUsername,
    amount: totalAmount,
    reason: `Refund for order ${order.code}`,
    orderId,
    adminUsername: adminUser ?? "admin",
    createdAt: new Date(),
  });

  writeLog("change", "info", "order_refunded_to_credits", `Admin refunded order ${order.code} ($${totalAmount} USD) to credits for ${acct.telegramUsername}`, { orderId, username: acct.telegramUsername, amount: totalAmount }).catch(() => {});
  res.json({ ok: true, credits: newBalance, refundedAmount: totalAmount });
});

// ─── Invite Codes ────────────────────────────────────────────
async function getAdminConfigValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

async function setAdminConfigValue(key: string, value: string) {
  await db.insert(siteConfigTable).values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}

router.get("/admin/invite-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const codes = await db.select().from(inviteCodesTable).orderBy(desc(inviteCodesTable.createdAt));
  const rawRequires = await getAdminConfigValue("signup_requires_invite");
  res.json({ codes, signupRequiresInvite: rawRequires === "true" });
});

router.post("/admin/invite-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { code, label, maxUses } = req.body as { code?: string; label?: string; maxUses?: number | null };
  if (!code || typeof code !== "string" || code.trim().length < 2) {
    res.status(400).json({ error: "Code must be at least 2 characters" });
    return;
  }
  if (!label || typeof label !== "string" || label.trim().length === 0) {
    res.status(400).json({ error: "Label is required (e.g. 'Reddit r/peptides')" });
    return;
  }
  const trimmedCode = code.trim().toUpperCase();
  const [existing] = await db.select({ code: inviteCodesTable.code }).from(inviteCodesTable)
    .where(eq(inviteCodesTable.code, trimmedCode));
  if (existing) {
    res.status(409).json({ error: "An invite code with this value already exists" });
    return;
  }
  const [created] = await db.insert(inviteCodesTable).values({
    code: trimmedCode,
    label: label.trim(),
    maxUses: typeof maxUses === "number" ? maxUses : null,
  }).returning();
  res.status(201).json(created);
});

router.patch("/admin/invite-codes/:code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { code } = req.params;
  const { label, isActive, maxUses } = req.body as { label?: string; isActive?: boolean; maxUses?: number | null };
  const updates: Record<string, unknown> = {};
  if (typeof label === "string") updates.label = label.trim();
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (maxUses !== undefined) updates.maxUses = typeof maxUses === "number" ? maxUses : null;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [updated] = await db.update(inviteCodesTable).set(updates)
    .where(eq(inviteCodesTable.code, code)).returning();
  if (!updated) { res.status(404).json({ error: "Code not found" }); return; }
  res.json(updated);
});

router.delete("/admin/invite-codes/:code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { code } = req.params;
  const [deleted] = await db.delete(inviteCodesTable).where(eq(inviteCodesTable.code, code)).returning();
  if (!deleted) { res.status(404).json({ error: "Code not found" }); return; }
  res.json({ ok: true });
});

router.patch("/admin/signup-requires-invite", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled (boolean) is required" });
    return;
  }
  await setAdminConfigValue("signup_requires_invite", enabled ? "true" : "false");
  res.json({ signupRequiresInvite: enabled });
});

// ── Batch Code Prefixes ────────────────────────────────────────────────────────
// Seed data: all known batch code prefixes { prefix, compoundName, nominalDose }
const BATCH_CODE_SEED: { prefix: string; compoundName: string; nominalDose: string }[] = [
  { prefix: "OZ5",       compoundName: "Semaglutide",              nominalDose: "5mg" },
  { prefix: "OZ10",      compoundName: "Semaglutide",              nominalDose: "10mg" },
  { prefix: "OZ20",      compoundName: "Semaglutide",              nominalDose: "20mg" },
  { prefix: "ZE10",      compoundName: "Tirzepatide",              nominalDose: "10mg" },
  { prefix: "ZE15",      compoundName: "Tirzepatide",              nominalDose: "15mg" },
  { prefix: "ZE20",      compoundName: "Tirzepatide",              nominalDose: "20mg" },
  { prefix: "ZE30",      compoundName: "Tirzepatide",              nominalDose: "30mg" },
  { prefix: "ZE45",      compoundName: "Tirzepatide",              nominalDose: "45mg" },
  { prefix: "ZE60",      compoundName: "Tirzepatide",              nominalDose: "60mg" },
  { prefix: "ZE100",     compoundName: "Tirzepatide",              nominalDose: "100mg" },
  { prefix: "RE10",      compoundName: "Retatrutide",              nominalDose: "10mg" },
  { prefix: "RE20",      compoundName: "Retatrutide",              nominalDose: "20mg" },
  { prefix: "RE30",      compoundName: "Retatrutide",              nominalDose: "30mg" },
  { prefix: "RE40",      compoundName: "Retatrutide",              nominalDose: "40mg" },
  { prefix: "RE50",      compoundName: "Retatrutide",              nominalDose: "50mg" },
  { prefix: "RE60",      compoundName: "Retatrutide",              nominalDose: "60mg" },
  { prefix: "CAG5",      compoundName: "Cagrilintide",             nominalDose: "5mg" },
  { prefix: "CAG10",     compoundName: "Cagrilintide",             nominalDose: "10mg" },
  { prefix: "51Q50",     compoundName: "5-Amino-1-methylquinolinium", nominalDose: "50mg" },
  { prefix: "51Q10",     compoundName: "5-Amino-1-methylquinolinium", nominalDose: "10mg" },
  { prefix: "T/B55",     compoundName: "BPC-157/TB-500",           nominalDose: "5/5mg" },
  { prefix: "T/B1010",   compoundName: "BPC-157/TB-500 (TB4)",     nominalDose: "10/10mg" },
  { prefix: "BP10",      compoundName: "BPC-157",                  nominalDose: "10mg" },
  { prefix: "BP20",      compoundName: "BPC-157",                  nominalDose: "20mg" },
  { prefix: "TB10",      compoundName: "TB-500",                   nominalDose: "10mg" },
  { prefix: "TB20",      compoundName: "TB-500",                   nominalDose: "20mg" },
  { prefix: "TB410",     compoundName: "TB-500 (TB4)",             nominalDose: "10mg" },
  { prefix: "TBF10",     compoundName: "TB-500 Fragment",          nominalDose: "10mg" },
  { prefix: "HK100",     compoundName: "GHK-Cu",                   nominalDose: "100mg" },
  { prefix: "HK50",      compoundName: "GHK-Cu",                   nominalDose: "50mg" },
  { prefix: "HK/KP50/20", compoundName: "GHK-Cu2+/KPV",           nominalDose: "50/20mg" },
  { prefix: "KP10",      compoundName: "KPV",                      nominalDose: "10mg" },
  { prefix: "KP30",      compoundName: "KPV",                      nominalDose: "30mg" },
  { prefix: "SS10",      compoundName: "SS-31",                    nominalDose: "10mg" },
  { prefix: "SS30",      compoundName: "SS-31",                    nominalDose: "30mg" },
  { prefix: "SS50",      compoundName: "Elamipretide (SS-31)",     nominalDose: "50mg" },
  { prefix: "MO10",      compoundName: "MOTS-C",                   nominalDose: "10mg" },
  { prefix: "MO20",      compoundName: "MOTS-C",                   nominalDose: "20mg" },
  { prefix: "M010",      compoundName: "MOTS-C",                   nominalDose: "10mg" },
  { prefix: "M040",      compoundName: "MOTS-C",                   nominalDose: "40mg" },
  { prefix: "PE10",      compoundName: "PE-22-28",                 nominalDose: "10mg" },
  { prefix: "NASX10",    compoundName: "N-Acetyl Semax",           nominalDose: "10mg" },
  { prefix: "NASX50",    compoundName: "N-Acetyl Semax",           nominalDose: "50mg" },
  { prefix: "NASK10",    compoundName: "N-Acetyl Selank Amidate",  nominalDose: "10mg" },
  { prefix: "NASK50",    compoundName: "N-Acetyl Selank",          nominalDose: "50mg" },
  { prefix: "SK10",      compoundName: "Selank",                   nominalDose: "10mg" },
  { prefix: "SX10",      compoundName: "Semax",                    nominalDose: "10mg" },
  { prefix: "MT1",       compoundName: "Melanotan I",              nominalDose: "10mg" },
  { prefix: "MT2",       compoundName: "Melanotan II",             nominalDose: "10mg" },
  { prefix: "MT210",     compoundName: "Melanotan 2",              nominalDose: "10mg" },
  { prefix: "TA110",     compoundName: "Thymosin Alpha-1",         nominalDose: "10mg" },
  { prefix: "CJND",      compoundName: "CJC no DAC/Ipamorelin",   nominalDose: "5/5mg" },
  { prefix: "CI1010",    compoundName: "CJC DAC/Ipamorelin",      nominalDose: "10/10mg" },
  { prefix: "CJD5",      compoundName: "CJC-1295 DAC",            nominalDose: "5mg" },
  { prefix: "TE10",      compoundName: "Tesamorelin",              nominalDose: "10mg" },
  { prefix: "TE20",      compoundName: "Tesamorelin",              nominalDose: "20mg" },
  { prefix: "T/155",     compoundName: "Tesamorelin/Ipamorelin",  nominalDose: "15/5mg" },
  { prefix: "H10",       compoundName: "Human Growth Hormone",     nominalDose: "10mg" },
  { prefix: "PT10",      compoundName: "PT-141",                   nominalDose: "10mg" },
  { prefix: "SN10",      compoundName: "Snap-8",                   nominalDose: "10mg" },
  { prefix: "VIP",       compoundName: "VIP",                      nominalDose: "10mg" },
  { prefix: "NA500",     compoundName: "NAD+",                     nominalDose: "500mg" },
  { prefix: "FOX10",     compoundName: "Fox-04",                   nominalDose: "10mg" },
  { prefix: "EP10",      compoundName: "Epithalon",                nominalDose: "10mg" },
  { prefix: "EP50",      compoundName: "Epithalon",                nominalDose: "50mg" },
  { prefix: "AR16",      compoundName: "ARA-290",                  nominalDose: "16mg" },
  { prefix: "ARA16",     compoundName: "ARA-290",                  nominalDose: "16mg" },
  { prefix: "DS5",       compoundName: "DSIP",                     nominalDose: "5mg" },
  { prefix: "DS10",      compoundName: "DSIP",                     nominalDose: "10mg" },
  { prefix: "IG1",       compoundName: "IGF-1 LR3",               nominalDose: "1mg" },
  { prefix: "G210",      compoundName: "GHRP-2",                   nominalDose: "10mg" },
  { prefix: "G610",      compoundName: "GHRP-6",                   nominalDose: "10mg" },
  { prefix: "A05",       compoundName: "AOD-9604",                 nominalDose: "5mg" },
  { prefix: "IP10",      compoundName: "Ipamorelin",               nominalDose: "10mg" },
  { prefix: "SR5",       compoundName: "Sermorelin",               nominalDose: "5mg" },
  { prefix: "SUR10",     compoundName: "Survotide",                nominalDose: "10mg" },
  { prefix: "KL080",     compoundName: "GHK-Cu/BPC-157/TB-500/KPV", nominalDose: "80mg total" },
  { prefix: "KLO80",     compoundName: "KLOW blend",               nominalDose: "80mg" },
  { prefix: "GLO80",     compoundName: "GLOW blend",               nominalDose: "80mg" },
  { prefix: "ILLUM",     compoundName: "illumineeuro",             nominalDose: "" },
];

// GET /admin/batch-code-prefixes
router.get("/admin/batch-code-prefixes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(batchCodePrefixesTable).orderBy(asc(batchCodePrefixesTable.prefix));
  res.json(rows);
});

// POST /admin/batch-code-prefixes/seed  (insert all defaults, skip existing)
router.post("/admin/batch-code-prefixes/seed", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const existing = await db.select({ prefix: batchCodePrefixesTable.prefix }).from(batchCodePrefixesTable);
  const existingSet = new Set(existing.map(r => r.prefix.toUpperCase()));
  const toInsert = BATCH_CODE_SEED.filter(r => !existingSet.has(r.prefix.toUpperCase()));
  if (toInsert.length > 0) {
    await db.insert(batchCodePrefixesTable).values(toInsert);
  }
  res.json({ seeded: toInsert.length, total: BATCH_CODE_SEED.length });
});

// POST /admin/batch-code-prefixes
router.post("/admin/batch-code-prefixes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { prefix, compoundName, nominalDose } = req.body as { prefix?: string; compoundName?: string; nominalDose?: string };
  if (!prefix?.trim() || !compoundName?.trim()) {
    res.status(400).json({ error: "prefix and compoundName are required" });
    return;
  }
  try {
    const [row] = await db.insert(batchCodePrefixesTable)
      .values({ prefix: prefix.trim().toUpperCase(), compoundName: compoundName.trim(), nominalDose: (nominalDose ?? "").trim() })
      .returning();
    res.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) res.status(409).json({ error: "Prefix already exists" });
    else res.status(500).json({ error: "Insert failed" });
  }
});

// PUT /admin/batch-code-prefixes/:id
router.put("/admin/batch-code-prefixes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params["id"]);
  const { prefix, compoundName, nominalDose } = req.body as { prefix?: string; compoundName?: string; nominalDose?: string };
  if (!prefix?.trim() || !compoundName?.trim()) {
    res.status(400).json({ error: "prefix and compoundName are required" });
    return;
  }
  try {
    const [row] = await db.update(batchCodePrefixesTable)
      .set({ prefix: prefix.trim().toUpperCase(), compoundName: compoundName.trim(), nominalDose: (nominalDose ?? "").trim(), updatedAt: new Date() })
      .where(eq(batchCodePrefixesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) res.status(409).json({ error: "Prefix already exists" });
    else res.status(500).json({ error: "Update failed" });
  }
});

// DELETE /admin/batch-code-prefixes/:id
router.delete("/admin/batch-code-prefixes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params["id"]);
  const [deleted] = await db.delete(batchCodePrefixesTable).where(eq(batchCodePrefixesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// POST /admin/batch-code-prefixes/apply-to-tests
// Updates all lab tests whose batchCode prefix matches an entry in batch_code_prefixes
router.post("/admin/batch-code-prefixes/apply-to-tests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const prefixes = await db.select().from(batchCodePrefixesTable);
  if (prefixes.length === 0) { res.json({ updated: 0 }); return; }
  const prefixMap = new Map(prefixes.map(p => [p.prefix.toUpperCase(), p]));
  const allTests = await db.select({ id: labTestsTable.id, batchCode: labTestsTable.batchCode }).from(labTestsTable);
  let updated = 0;
  for (const test of allTests) {
    if (!test.batchCode) continue;
    const rawPrefix = test.batchCode.split("-")[0].toUpperCase();
    const match = prefixMap.get(rawPrefix);
    if (!match) continue;
    await db.update(labTestsTable)
      .set({ peptideName: match.compoundName, nominalDose: match.nominalDose || null })
      .where(eq(labTestsTable.id, test.id));
    updated++;
  }
  res.json({ updated });
});

// ─── GET /api/admin/leg-view/:gbId?as=username ─────────────────────────────
// Admin preview: returns leg viewer data scoped to the specified user's legs.
router.get("/admin/leg-view/:gbId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const asUsername = String(req.query["as"] ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!asUsername) { res.status(400).json({ error: "Missing ?as= parameter" }); return; }

  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency, status: groupBuysTable.status, legViewerAccess: groupBuysTable.legViewerAccess })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const accessList = (gb.legViewerAccess ?? []) as { username: string; legIds: string[] }[];
  const entry = accessList.find(e => e.username.toLowerCase().replace(/^@/, "") === asUsername);
  if (!entry) { res.status(404).json({ error: `User @${asUsername} has no leg viewer access for this group buy.` }); return; }

  const allowedLegIds = entry.legIds;

  const legs = await db
    .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, countryName: gbCountryLegsTable.countryName, status: gbCountryLegsTable.status })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), inArray(gbCountryLegsTable.id, allowedLegIds)));

  const orders = await db
    .select({
      id: ordersTable.id, code: ordersTable.code, telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status, paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal, productSubtotal: ordersTable.productSubtotal,
      deliveryMethod: ordersTable.deliveryMethod, shippingName: ordersTable.shippingName,
      shippingAddress: ordersTable.shippingAddress, shippingCountry: ordersTable.shippingCountry,
      trackingNumber: ordersTable.trackingNumber, countryLegId: ordersTable.countryLegId,
      createdAt: ordersTable.createdAt, paymentTxHash: ordersTable.paymentTxHash,
      testPaymentTxHash: ordersTable.testPaymentTxHash,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.countryLegId, allowedLegIds)))
    .orderBy(desc(ordersTable.createdAt));

  const orderIds = orders.map(o => o.id);
  let lineItemsMap: Map<string, { productName: string; quantity: string; unitPrice: string; lineTotal: string }[]> = new Map();
  if (orderIds.length > 0) {
    const lineItems = await db
      .select({ orderId: orderLineItemsTable.orderId, productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity, unitPrice: orderLineItemsTable.unitPrice, lineTotal: orderLineItemsTable.lineTotal })
      .from(orderLineItemsTable)
      .where(sql`${orderLineItemsTable.orderId} = ANY(ARRAY[${sql.join(orderIds.map(oid => sql`${oid}`), sql`, `)}]::text[])`);
    for (const li of lineItems) {
      if (!lineItemsMap.has(li.orderId)) lineItemsMap.set(li.orderId, []);
      lineItemsMap.get(li.orderId)!.push(li);
    }
  }

  const enriched = orders.map(o => ({ ...o, lineItems: lineItemsMap.get(o.id) ?? [] }));
  const totalOrders = enriched.length;
  const totalRevenue = enriched.reduce((sum, o) => sum + parseFloat(o.grandTotal ?? "0"), 0);
  const statusBreakdown = enriched.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});

  res.json({
    gb: { id: gb.id, name: gb.name, currency: gb.currency, status: gb.status },
    legs,
    orders: enriched,
    summary: { totalOrders, totalRevenue, statusBreakdown },
    viewingAs: asUsername,
  });
});

// ─── Vendor management ───────────────────────────────────────

async function getExtraVendorNames(): Promise<string[]> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "extra_vendor_names"));
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as string[]; } catch { return []; }
}

async function setExtraVendorNames(names: string[]) {
  await db.insert(siteConfigTable).values({ key: "extra_vendor_names", value: JSON.stringify(names) })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(names) } });
}

// GET /api/admin/vendors — list all vendors with product counts (merged: products + config)
router.get("/admin/vendors", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const allProducts = await db.select({ vendor: productsTable.vendor }).from(productsTable);
  const counts = new Map<string, number>();
  for (const p of allProducts) {
    if (p.vendor) counts.set(p.vendor, (counts.get(p.vendor) ?? 0) + 1);
  }
  const extraNames = await getExtraVendorNames();
  for (const n of extraNames) {
    if (!counts.has(n)) counts.set(n, 0);
  }
  const vendors = [...counts.entries()]
    .map(([name, productCount]) => ({ name, productCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(vendors);
});

// POST /api/admin/vendors — add a standalone vendor name (no products)
router.post("/admin/vendors", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const extra = await getExtraVendorNames();
  if (!extra.includes(name.trim())) {
    await setExtraVendorNames([...extra, name.trim()]);
  }
  res.json({ ok: true });
});

// PUT /api/admin/vendors/rename — rename a vendor across all products + config
router.put("/admin/vendors/rename", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const { oldName, newName } = req.body;
  if (!oldName || !newName?.trim()) {
    res.status(400).json({ error: "oldName and newName are required" });
    return;
  }
  const result = await db
    .update(productsTable)
    .set({ vendor: newName.trim() })
    .where(eq(productsTable.vendor, oldName));
  const extra = await getExtraVendorNames();
  const updatedExtra = extra.map(n => n === oldName ? newName.trim() : n);
  await setExtraVendorNames(updatedExtra);
  res.json({ ok: true, updated: result.rowCount ?? 0 });
});

// DELETE /api/admin/vendors/:name — remove a vendor (reassigns products to "Unknown", removes from config)
router.delete("/admin/vendors/:name", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const name = decodeURIComponent(req.params.name);
  const result = await db
    .update(productsTable)
    .set({ vendor: "Unknown" })
    .where(eq(productsTable.vendor, name));
  const extra = await getExtraVendorNames();
  await setExtraVendorNames(extra.filter(n => n !== name));
  res.json({ ok: true, updated: result.rowCount ?? 0 });
});

// POST /api/admin/ip-enrich-all
// Resolves and caches geo data for every distinct last_login_ip across all accounts.
// Existing cache is cleared first so any stale entries (from the old lookup service) are refreshed.
router.post("/admin/ip-enrich-all", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;

  // 1. Wipe the old cache (it was populated by ipwho.is which lacked ISP/proxy data)
  await db.delete(geoIpCacheTable);

  // 2. Collect every distinct non-null IP from accounts
  const rows = await db
    .select({ ip: accountsTable.lastLoginIp })
    .from(accountsTable)
    .where(isNotNull(accountsTable.lastLoginIp));

  const uniqueIps = [...new Set(rows.map(r => normIp(r.ip)).filter(Boolean))] as string[];

  if (uniqueIps.length === 0) {
    res.json({ ok: true, total: 0, enriched: 0 });
    return;
  }

  // 3. Process in batches of 40 to respect ip-api.com's 45 req/min free tier limit
  const BATCH = 40;
  const DELAY = 1600; // ms between batches
  let enriched = 0;

  for (let i = 0; i < uniqueIps.length; i += BATCH) {
    const batch = uniqueIps.slice(i, i + BATCH);
    const map = await enrichIps(batch);
    enriched += map.size;
    if (i + BATCH < uniqueIps.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }

  res.json({ ok: true, total: uniqueIps.length, enriched });
});

// GET /api/admin/country-ip-check?country=United+Kingdom
// Returns all accounts that declare a given country, with their last-login IP resolved
// to an actual geo country so admins can spot mismatches (fake country claims).
router.get("/admin/country-ip-check", async (req: any, res: any) => {
  if (!requireAdmin(req, res)) return;
  const search = (req.query.country as string | undefined)?.trim() ?? "";
  if (!search) { res.json([]); return; }

  const rows = await db
    .select({
      telegramUsername: accountsTable.telegramUsername,
      country: accountsTable.country,
      lastLoginIp: accountsTable.lastLoginIp,
      lastLoginAt: accountsTable.lastLoginAt,
      accountStatus: accountsTable.accountStatus,
    })
    .from(accountsTable)
    .where(ilike(accountsTable.country, `%${search}%`));

  if (rows.length === 0) { res.json([]); return; }

  const geoMap = await enrichIps(rows.map(r => r.lastLoginIp));

  const out = rows.map(r => {
    const ip = normIp(r.lastLoginIp);
    const EMPTY_GEO = { country: null, city: null, region: null, isp: null, org: null, lat: null, lon: null, isProxy: null, isHosting: null };
    const geo = ip ? (geoMap.get(ip) ?? EMPTY_GEO) : EMPTY_GEO;
    const declaredNorm = (r.country ?? "").toLowerCase().trim();
    const ipNorm = (geo.country ?? "").toLowerCase().trim();
    const isMatch = !!(declaredNorm && ipNorm && (declaredNorm === ipNorm || declaredNorm.includes(ipNorm) || ipNorm.includes(declaredNorm)));
    return {
      telegramUsername: r.telegramUsername,
      declaredCountry: r.country,
      lastLoginIp: r.lastLoginIp,
      lastLoginAt: r.lastLoginAt,
      accountStatus: r.accountStatus,
      ipCountry: geo.country,
      ipCity: geo.city,
      ipRegion: geo.region,
      ipIsp: geo.isp,
      ipOrg: geo.org,
      ipLat: geo.lat,
      ipLon: geo.lon,
      isProxy: geo.isProxy,
      isHosting: geo.isHosting,
      isMatch: ip ? isMatch : null,
    };
  });

  out.sort((a, b) => {
    if (a.isMatch === false && b.isMatch !== false) return -1;
    if (b.isMatch === false && a.isMatch !== false) return 1;
    return 0;
  });

  res.json(out);
});

// ── POST /admin/orders/:id/reset-test-payment — clear test data, return to unpaid ─
router.post("/admin/orders/:id/reset-test-payment", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.paymentStatus === "confirmed") {
    res.status(400).json({ error: "Cannot reset a fully confirmed payment" });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "unpaid", paymentTestAmount: null, testPaymentTxHash: null })
    .where(eq(ordersTable.id, req.params.id))
    .returning({ id: ordersTable.id, paymentStatus: ordersTable.paymentStatus });
  res.json(updated);
});

// ── POST /admin/orders/:id/generate-test — admin generates test amount for an order ─
router.post("/admin/orders/:id/generate-test", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.paymentStatus === "confirmed") {
    res.status(400).json({ error: "Payment already confirmed" });
    return;
  }
  if (order.paymentTestAmount && order.paymentStatus === "test_ready") {
    res.json({ paymentTestAmount: parseFloat(String(order.paymentTestAmount)), paymentStatus: order.paymentStatus });
    return;
  }
  const testAmount = parseFloat((1 + Math.random()).toFixed(2));
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentTestAmount: String(testAmount), paymentStatus: "test_ready" })
    .where(eq(ordersTable.id, req.params.id))
    .returning({ id: ordersTable.id, paymentTestAmount: ordersTable.paymentTestAmount, paymentStatus: ordersTable.paymentStatus });
  res.json({ paymentTestAmount: parseFloat(String(updated.paymentTestAmount)), paymentStatus: updated.paymentStatus });
});

// ── POST /admin/orders/:id/confirm-test — admin marks test payment confirmed, allow full pay ─
router.post("/admin/orders/:id/confirm-test", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (!["test_ready", "test_confirmed"].includes(order.paymentStatus ?? "")) {
    res.status(400).json({ error: "Order is not in a test payment state" });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "test_confirmed", testPaymentTxHash: order.testPaymentTxHash ?? "admin_confirmed" })
    .where(eq(ordersTable.id, req.params.id))
    .returning({ id: ordersTable.id, paymentStatus: ordersTable.paymentStatus });

  // Send admin notification for manual test-payment confirmation
  (() => {
    const grandTotalNum = parseFloat(String(order.grandTotal));
    const testAmtNum = order.paymentTestAmount ? parseFloat(String(order.paymentTestAmount)) : null;
    const remainderNum = testAmtNum != null ? Math.max(0, grandTotalNum - testAmtNum) : grandTotalNum;
    const txid = order.testPaymentTxHash ?? "admin_confirmed";
    const code = order.code ?? order.id;
    const username = order.telegramUsername.replace(/^@/, "");
    const deliveryLabel = order.deliveryMethod ?? "—";
    const fetchGb = async () => {
      let gbContext = "";
      if (order.groupBuyId) {
        const [gb] = await db.select({ name: groupBuysTable.name }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
        if (gb) gbContext = `\nGB: <b>${escapeHtml(gb.name)}</b>`;
      }
      await sendAdminFromTemplate("admin_test_payment_confirmed", {
        code, username, gb_name: gbContext,
        test_amount: testAmtNum != null ? testAmtNum.toFixed(2) : "—",
        txid,
        remainder: remainderNum.toFixed(2),
        delivery: deliveryLabel,
      });
    };
    fetchGb().catch(() => {});
  })();

  res.json(updated);
});

// ── GET /api/admin/role-logs — consolidated activity log for all role-holders ──
// Returns paginated audit log entries for GB Organisers, Reshippers, and Pool Leaders.
// ?role=all|organiser|reshipper|pool_leader  ?username=filter  ?q=search  ?limit=50  ?offset=0
router.get("/admin/role-logs", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const role = (req.query.role as string) || "all";
  const usernameFilter = req.query.username ? String(req.query.username).replace(/^@/, "").toLowerCase() : null;
  const q = req.query.q ? String(req.query.q).trim() : null;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);

  const ORGANISER_ACTIONS = [
    "organiser_applied", "organiser_approved", "organiser_rejected",
    "organiser_suspended", "organiser_reinstated", "organiser_role_changed",
    "organiser_vendor_restrictions_changed", "organiser_gb_approved",
    "organiser_gb_rejected", "organiser_gb_removed", "organiser_gb_created",
    "organiser_gb_updated", "organiser_product_updated", "organiser_lab_approved",
    "organiser_lab_rejected", "organiser_broadcast", "organiser_message_sent",
    "organiser_applied_intl_shipping", "payment_confirmed", "payment_rejected",
  ];
  const RESHIPPER_ACTIONS = [
    "reshipper_applied", "reshipper_status_changed", "reshipper_assigned",
    "reshipper_unassigned", "reshipper_reassigned", "reshipper_bulk_reassigned",
    "reshipper_settings_updated", "reshipper_assignment_updated",
    "reshipper_invite_code_generated", "reshipper_joined_via_code",
    "reshipper_direct_message", "reshipper_broadcast",
    "order_claimed_by_reshipper", "orders_claimed_by_reshipper_bulk",
  ];
  const POOL_ACTIONS = [
    "pool_leader_applied", "pool_leader_profile_update",
    "pool_leader_review", "pool_deleted",
  ];

  let actions: string[] = [];
  if (role === "organiser") actions = ORGANISER_ACTIONS;
  else if (role === "reshipper") actions = RESHIPPER_ACTIONS;
  else if (role === "pool_leader") actions = POOL_ACTIONS;
  else actions = [...ORGANISER_ACTIONS, ...RESHIPPER_ACTIONS, ...POOL_ACTIONS];

  // Determine role label for each action
  const roleOf = (action: string): string => {
    if (ORGANISER_ACTIONS.includes(action)) return "organiser";
    if (RESHIPPER_ACTIONS.includes(action)) return "reshipper";
    if (POOL_ACTIONS.includes(action)) return "pool_leader";
    return "unknown";
  };

  try {
    const conditions: ReturnType<typeof and>[] = [inArray(auditLogsTable.action, actions)];
    if (q) {
      conditions.push(or(
        ilike(auditLogsTable.message, `%${q}%`),
        sql`${auditLogsTable.metadata}::text ilike ${'%' + q + '%'}`,
      ) as any);
    }
    if (usernameFilter) {
      conditions.push(
        or(
          sql`lower(${auditLogsTable.metadata}->>'username') = ${usernameFilter}`,
          sql`lower(${auditLogsTable.metadata}->>'organiserId') = ${usernameFilter}`,
          ilike(auditLogsTable.message, `%${usernameFilter}%`),
        ) as any,
      );
    }

    const where = and(...conditions);
    const [rows, countRow] = await Promise.all([
      db.select().from(auditLogsTable).where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
    ]);

    const entries = rows.map(r => ({
      id: r.id,
      role: roleOf(r.action ?? ""),
      action: r.action,
      message: r.message,
      metadata: r.metadata,
      username: (r.metadata as any)?.username ?? (r.metadata as any)?.organiserId ?? null,
      createdAt: r.createdAt,
    }));

    res.json({ entries, total: countRow[0]?.count ?? 0, limit, offset });
  } catch (err) {
    console.error("[admin/role-logs]", err);
    res.status(500).json({ error: "Failed to fetch role logs" });
  }
});

// GET /api/admin/orders/:id/customer-view — return the exact same payload as the customer-facing
// account endpoint so the admin can preview what the customer sees, authenticated via admin secret.
router.get("/admin/orders/:id/customer-view", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params["id"]);

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  let groupBuyPaymentsEnabled: boolean | null = null;
  let groupBuyAllowOrderAddons = true;
  let customShippingRequiresAddress = false;
  let customShippingRequiresQrCode = false;
  let groupBuyQrUploadInpostEnabled = false;
  let groupBuyQrUploadRoyalMailEnabled = false;
  let groupBuyQrUploadMessage: string | null = null;
  let groupBuyQrUploadCouriers: string[] | null = null;
  let groupBuyCurrency: string | null = null;
  if (order.groupBuyId) {
    const [gb] = await db
      .select({
        paymentsEnabled: groupBuysTable.paymentsEnabled,
        qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
        qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
        qrUploadMessage: groupBuysTable.qrUploadMessage,
        qrUploadCouriers: groupBuysTable.qrUploadCouriers,
        currency: groupBuysTable.currency,
        allowOrderAddons: groupBuysTable.allowOrderAddons,
        shippingOptions: groupBuysTable.shippingOptions,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    groupBuyAllowOrderAddons = gb?.allowOrderAddons ?? true;
    groupBuyPaymentsEnabled = gb?.paymentsEnabled ?? true;
    if (gb?.shippingOptions && order.deliveryMethodId) {
      try {
        const opts = JSON.parse(gb.shippingOptions) as Array<{ id: string; requiresAddress?: boolean; requiresQrCode?: boolean }>;
        const matched = opts.find(o => o.id === order.deliveryMethodId);
        if (matched) {
          customShippingRequiresAddress = matched.requiresAddress ?? false;
          customShippingRequiresQrCode = matched.requiresQrCode ?? false;
        }
      } catch { /* ignore */ }
    }
    groupBuyQrUploadInpostEnabled = gb?.qrUploadInpostEnabled ?? false;
    groupBuyQrUploadRoyalMailEnabled = gb?.qrUploadRoyalMailEnabled ?? false;
    groupBuyQrUploadMessage = gb?.qrUploadMessage ?? null;
    groupBuyCurrency = gb?.currency ?? null;
    if (gb?.qrUploadCouriers && (gb.qrUploadCouriers as string[]).length > 0) {
      groupBuyQrUploadCouriers = gb.qrUploadCouriers as string[];
    } else {
      const derived: string[] = [];
      if (gb?.qrUploadInpostEnabled) derived.push("InPost");
      if (gb?.qrUploadRoyalMailEnabled) derived.push("Royal Mail");
      groupBuyQrUploadCouriers = derived.length > 0 ? derived : null;
    }
  }

  // Admin per-order override takes precedence over the shipping option's defaults.
  if ((order as any).requiresAddressOverride != null) customShippingRequiresAddress = (order as any).requiresAddressOverride;
  if ((order as any).requiresQrCodeOverride != null) customShippingRequiresQrCode = (order as any).requiresQrCodeOverride;

  const qrCodes: Record<string, string> = { ...((order.qrCodes as Record<string, string> | null) ?? {}) };
  if (order.inpostQrCode && !qrCodes["inpost"]) qrCodes["inpost"] = order.inpostQrCode;
  if (order.royalMailQrCode && !qrCodes["royal-mail"]) qrCodes["royal-mail"] = order.royalMailQrCode;

  res.json({
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    deliveryMethod: order.deliveryMethod,
    deliveryMethodId: order.deliveryMethodId ?? null,
    deliveryPrice: parseFloat(String(order.deliveryPrice ?? "0")),
    vendorShipping: parseFloat(String(order.vendorShipping ?? "0")),
    productSubtotal: parseFloat(String(order.productSubtotal)),
    tip: parseFloat(String(order.tip ?? "0")),
    testingContribution: parseFloat(String(order.testingContribution ?? "0")),
    testVote: order.testVote ?? null,
    grandTotal: parseFloat(String(order.grandTotal)),
    amountDue: parseFloat(String((order as any).amountDue ?? "0")),
    hasBalanceScreenshot: !!(order as any).balanceScreenshot,
    balanceTxHash: (order as any).balanceTxHash ?? null,
    balancePaymentStatus: (order as any).balancePaymentStatus ?? null,
    creditsApplied: order.creditsApplied ?? 0,
    notes: order.notes ?? null,
    status: order.status,
    adminMessage: order.adminMessage ?? null,
    trackingNumber: order.trackingNumber ?? null,
    paymentStatus: order.paymentStatus ?? "unpaid",
    paymentTxHash: order.paymentTxHash ?? null,
    paymentTestAmount: order.paymentTestAmount ? parseFloat(String(order.paymentTestAmount)) : null,
    testPaymentTxHash: order.testPaymentTxHash ?? null,
    paymentRejectionReason: order.paymentRejectionReason ?? null,
    shippingName: order.shippingName ?? null,
    shippingAddress: order.shippingAddress ?? null,
    shippingCountry: order.shippingCountry ?? null,
    shippingPhone: order.shippingPhone ?? null,
    shippingEmail: order.shippingEmail ?? null,
    orderType: order.orderType ?? null,
    pin: order.pin ?? "0000",
    inpostQrCode: order.inpostQrCode ?? null,
    royalMailQrCode: order.royalMailQrCode ?? null,
    qrCodes,
    groupBuyId: order.groupBuyId ?? null,
    currency: groupBuyCurrency,
    groupBuyPaymentsEnabled,
    groupBuyAllowOrderAddons,
    customShippingRequiresAddress,
    customShippingRequiresQrCode,
    requiresAddressOverride: (order as any).requiresAddressOverride ?? null,
    requiresQrCodeOverride: (order as any).requiresQrCodeOverride ?? null,
    groupBuyQrUploadInpostEnabled,
    groupBuyQrUploadRoyalMailEnabled,
    groupBuyQrUploadMessage,
    groupBuyQrUploadCouriers,
    createdAt: (order.createdAt as Date).toISOString(),
    updatedAt: (order.updatedAt as Date).toISOString(),
    lineItems: lineItems.map(li => ({
      id: li.id,
      productId: li.productId,
      productName: String(li.productName),
      quantity: parseFloat(String(li.quantity)),
      unitPrice: parseFloat(String(li.unitPrice)),
      lineTotal: parseFloat(String(li.lineTotal)),
      isOos: li.isOos ?? false,
    })),
  });
});

// ─── GET /api/admin/group-buys/:gbId/fulfillment-board ────────────────────────
// Returns orders grouped by routing destination (direct/reshipper/unrouted/legacy).
// Accepts filter query params: routingType, paymentStatus, search, balanceDue,
// missingAddress, batchLocked.
router.get("/admin/group-buys/:gbId/fulfillment-board", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const gbId = String(req.params["gbId"]);
    const {
      routingType: rtFilter,
      paymentStatus: psFilter,
      search,
      balanceDue: bdFilter,
      missingAddress: maFilter,
      batchLocked: blFilter,
    } = req.query as Record<string, string | undefined>;

    const [gb] = await db.select({ id: groupBuysTable.id }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
    if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

    const baseWhere = and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt));

    const orders = await db.select().from(ordersTable).where(baseWhere);
    const orderIds = orders.map(o => o.id);

    const lineItems = orderIds.length > 0
      ? await db.select().from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds))
      : [];

    const liByOrder = new Map<string, typeof lineItems>();
    for (const li of lineItems) {
      const arr = liByOrder.get(li.orderId) ?? [];
      arr.push(li);
      liByOrder.set(li.orderId, arr);
    }

    const reshippers = await db.select().from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId));
    const reshipperByUsername = new Map(reshippers.map(r => [r.reshipperUsername, r]));

    function getGroupKey(o: typeof orders[number]): string {
      if (o.routingType === "direct") return "direct";
      if (o.routingType === "reshipper") return `reshipper:${o.reshipperUsername ?? "__unassigned__"}`;
      if (o.routingType === "unrouted") return "unrouted";
      if (o.directShippingRequested) return "direct";
      // Legacy orders (no routingType set) — still group by reshipperUsername if one is assigned,
      // so they appear under the correct reshipper column rather than all lumped into "Legacy".
      if (o.reshipperUsername) return `reshipper:${o.reshipperUsername}`;
      return "legacy";
    }

    type BoardOrder = {
      id: string; code: string; telegramUsername: string; status: string;
      paymentStatus: string; routingType: string | null; batchLocked: boolean;
      reshipperUsername: string | null; countryLegId: string | null;
      shippingCountry: string | null; shippingName: string | null;
      shippingAddress: string | null; shippingCity: string | null;
      shippingPostcode: string | null; shippingPhone: string | null;
      shippingEmail: string | null; grandTotal: number; amountDue: number;
      vendorShipping: number; directShippingCost: number | null;
      deliveryMethod: string; deliveryPrice: number; notes: string | null;
      kitCount: number; missingAddress: boolean; balanceDue: boolean;
      usedReshipperCode: boolean;
      lineItems: { productName: string; quantity: number }[];
      lastModified: string; _groupKey: string;
    };

    const boardOrders: BoardOrder[] = orders.map(o => {
      const olis = liByOrder.get(o.id) ?? [];
      const kitCount = olis.reduce((s, li) => s + parseFloat(String(li.quantity)), 0);
      const missingAddress = !o.shippingName && !o.shippingAddress;
      const amountDueNum = parseFloat(String(o.amountDue ?? "0"));
      const balanceDue = amountDueNum > 0
        && !["confirmed", "test_confirmed", "waived"].includes(o.balancePaymentStatus ?? "");
      const reshipperInfo = o.reshipperUsername ? reshipperByUsername.get(o.reshipperUsername) : undefined;
      const usedReshipperCode = !!(reshipperInfo?.reshipperCode && reshipperInfo?.reshipperCodeActive);
      return {
        id: o.id, code: o.code, telegramUsername: o.telegramUsername,
        status: o.status, paymentStatus: o.paymentStatus,
        routingType: o.routingType ?? null, batchLocked: o.batchLocked,
        reshipperUsername: o.reshipperUsername ?? null, countryLegId: o.countryLegId ?? null,
        shippingCountry: o.shippingCountry ?? null, shippingName: o.shippingName ?? null,
        shippingAddress: o.shippingAddress ?? null, shippingCity: o.shippingCity ?? null,
        shippingPostcode: o.shippingPostcode ?? null, shippingPhone: o.shippingPhone ?? null,
        shippingEmail: o.shippingEmail ?? null,
        grandTotal: parseFloat(String(o.grandTotal ?? "0")),
        amountDue: amountDueNum,
        vendorShipping: parseFloat(String(o.vendorShipping ?? "0")),
        directShippingCost: o.directShippingCost != null ? parseFloat(String(o.directShippingCost)) : null,
        deliveryMethod: o.deliveryMethod, deliveryPrice: parseFloat(String(o.deliveryPrice ?? "0")),
        notes: o.notes ?? null, kitCount, missingAddress, balanceDue, usedReshipperCode,
        lineItems: olis.map(li => ({ productName: li.productName, quantity: parseFloat(String(li.quantity)) })),
        lastModified: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt ?? ""),
        _groupKey: getGroupKey(o),
      };
    });

    let filtered = boardOrders;
    if (rtFilter && rtFilter !== "all") {
      if (rtFilter === "legacy") filtered = filtered.filter(o => o._groupKey === "legacy");
      else filtered = filtered.filter(o => o.routingType === rtFilter);
    }
    if (psFilter && psFilter !== "all") {
      if (psFilter === "paid") filtered = filtered.filter(o => ["confirmed", "test_confirmed"].includes(o.paymentStatus));
      else if (psFilter === "pending") filtered = filtered.filter(o => !["confirmed", "test_confirmed"].includes(o.paymentStatus));
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(o => o.telegramUsername.toLowerCase().includes(q) || o.code.toLowerCase().includes(q));
    }
    if (bdFilter === "1") filtered = filtered.filter(o => o.balanceDue);
    if (maFilter === "1") filtered = filtered.filter(o => o.missingAddress);
    if (blFilter === "1") filtered = filtered.filter(o => o.batchLocked);

    const groupMap = new Map<string, BoardOrder[]>();
    for (const o of filtered) {
      const arr = groupMap.get(o._groupKey) ?? [];
      arr.push(o);
      groupMap.set(o._groupKey, arr);
    }

    const groupOrder = ["direct", ...reshippers.map(r => `reshipper:${r.reshipperUsername}`), "reshipper:__unassigned__", "unrouted", "legacy"];
    // Always include every DB-registered reshipper as a column, even with 0 orders,
    // so the admin can drag orders to them from the board.
    const knownReshipperKeys = new Set(reshippers.map(r => `reshipper:${r.reshipperUsername}`));
    const seenKeys = new Set<string>();
    const orderedKeys: string[] = [];
    for (const k of [...groupOrder, ...groupMap.keys()]) {
      if (!seenKeys.has(k) && (groupMap.has(k) || knownReshipperKeys.has(k))) { orderedKeys.push(k); seenKeys.add(k); }
    }

    const groups = orderedKeys.map(key => {
      const groupOrds = groupMap.get(key) ?? [];
      const isReship = key.startsWith("reshipper:");
      const reshipperUsername = isReship ? key.slice("reshipper:".length) : null;
      const reshipperInfo = (reshipperUsername && reshipperUsername !== "__unassigned__")
        ? reshipperByUsername.get(reshipperUsername) : undefined;

      const totalKits = groupOrds.reduce((s, o) => s + o.kitCount, 0);
      const missingAddressCount = groupOrds.filter(o => o.missingAddress).length;
      const balanceDueCount = groupOrds.filter(o => o.balanceDue).length;

      const countryMap = new Map<string, number>();
      for (const o of groupOrds) {
        if (o.shippingCountry) countryMap.set(o.shippingCountry, (countryMap.get(o.shippingCountry) ?? 0) + 1);
      }
      const countryBreakdown = Array.from(countryMap.entries())
        .map(([countryCode, count]) => ({ countryCode, count }))
        .sort((a, b) => b.count - a.count);

      const cleanOrders = groupOrds.map(({ _groupKey: _k, ...o }) => o);

      let type: "direct" | "reshipper" | "unrouted" | "legacy";
      if (key === "direct") type = "direct";
      else if (isReship) type = "reshipper";
      else if (key === "unrouted") type = "unrouted";
      else type = "legacy";

      return {
        type,
        reshipperUsername: reshipperUsername === "__unassigned__" ? null : reshipperUsername,
        reshipperHubCountry: reshipperInfo?.country ?? null,
        paymentBlocked: reshipperInfo?.paymentBlocked ?? false,
        totalOrders: groupOrds.length,
        totalKits, missingAddressCount, balanceDueCount, countryBreakdown,
        vendorShippingTotal: null as number | null,
        vendorShippingPerOrder: null as number | null,
        reshipperCode: reshipperInfo?.reshipperCode ?? null,
        reshipperCodeActive: reshipperInfo?.reshipperCodeActive ?? null,
        codeCapacity: reshipperInfo?.codeCapacity ?? null,
        codeAssignedCount: groupOrds.filter(o => o.usedReshipperCode).length,
        orders: cleanOrders,
      };
    });

    const lastModified = orders.reduce((mx, o) => {
      const t = o.updatedAt instanceof Date ? o.updatedAt.getTime() : 0;
      return t > mx ? t : mx;
    }, 0);

    let canUndo = false;
    if (orderIds.length > 0) {
      const [latestHistory] = await db
        .select({ id: routingHistoryTable.id })
        .from(routingHistoryTable)
        .where(and(
          inArray(routingHistoryTable.orderId, orderIds),
          sql`(${routingHistoryTable.metadata}->>'undone') IS NULL`,
        ))
        .orderBy(desc(routingHistoryTable.createdAt))
        .limit(1);
      canUndo = !!latestHistory;
    }

    const activeReshippers = reshippers.map(r => ({
      username: r.reshipperUsername, country: r.country, enabled: r.enabled,
      paymentBlocked: r.paymentBlocked, reshipperCode: r.reshipperCode ?? null,
      reshipperCodeActive: r.reshipperCodeActive, codeCapacity: r.codeCapacity ?? null,
      codeAssignedCount: filtered.filter(o => o.reshipperUsername === r.reshipperUsername && o.usedReshipperCode).length,
    }));

    res.json({
      lastModified: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
      canUndo, activeReshippers, groups,
    });
  } catch (err) {
    console.error("[admin] GET fulfillment-board error:", err);
    res.status(500).json({ error: "Failed to load fulfillment board" });
  }
});

// ─── GET /api/admin/orders/:id/routing-preview ────────────────────────────────
// Returns projected cost/count impact before a routing drag-and-drop move.
router.get("/admin/orders/:id/routing-preview", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const { targetReshipper, targetRoutingType } = req.query as Record<string, string | undefined>;
    const [order] = await db.select({
      id: ordersTable.id, groupBuyId: ordersTable.groupBuyId,
      routingType: ordersTable.routingType, reshipperUsername: ordersTable.reshipperUsername,
    }).from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!order.groupBuyId) { res.status(400).json({ error: "Order not in a group buy" }); return; }
    const gbId = order.groupBuyId;
    const sourceRt = order.routingType;
    const sourceReship = order.reshipperUsername;

    const srcWhere = and(
      eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt),
      sourceRt ? eq(ordersTable.routingType, sourceRt) : isNull(ordersTable.routingType),
      sourceReship ? eq(ordersTable.reshipperUsername, sourceReship) : isNull(ordersTable.reshipperUsername),
    );
    const destWhere = and(
      eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt),
      targetRoutingType ? eq(ordersTable.routingType, targetRoutingType) : isNull(ordersTable.routingType),
      targetReshipper ? eq(ordersTable.reshipperUsername, targetReshipper) : isNull(ordersTable.reshipperUsername),
    );
    const [srcCount, dstCount] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(ordersTable).where(srcWhere),
      db.select({ n: sql<number>`count(*)::int` }).from(ordersTable).where(destWhere),
    ]);

    res.json({
      orderId: order.id,
      from: {
        routingType: sourceRt, reshipperUsername: sourceReship,
        batchSize: srcCount[0]?.n ?? 0, batchSizeAfterMove: Math.max(0, (srcCount[0]?.n ?? 1) - 1),
      },
      to: {
        routingType: targetRoutingType ?? null, reshipperUsername: targetReshipper ?? null,
        batchSize: dstCount[0]?.n ?? 0, batchSizeAfterMove: (dstCount[0]?.n ?? 0) + 1,
      },
    });
  } catch (err) {
    console.error("[admin] GET routing-preview error:", err);
    res.status(500).json({ error: "Failed to compute routing preview" });
  }
});

// ─── POST /api/admin/group-buys/:gbId/routing-undo ───────────────────────────
// Reverts the last routing_history entry for this GB (one level of undo).
router.post("/admin/group-buys/:gbId/routing-undo", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const gbId = String(req.params["gbId"]);
    const gbOrders = await db.select({ id: ordersTable.id })
      .from(ordersTable).where(and(eq(ordersTable.groupBuyId, gbId), isNull(ordersTable.deletedAt)));
    if (gbOrders.length === 0) { res.status(404).json({ error: "No orders for this group buy" }); return; }
    const orderIds = gbOrders.map(o => o.id);

    const [latest] = await db.select().from(routingHistoryTable)
      .where(and(
        inArray(routingHistoryTable.orderId, orderIds),
        sql`(${routingHistoryTable.metadata}->>'undone') IS NULL`,
        sql`(${routingHistoryTable.reason} IS NULL OR ${routingHistoryTable.reason} != 'undo')`,
      ))
      .orderBy(desc(routingHistoryTable.createdAt)).limit(1);

    if (!latest) { res.status(400).json({ error: "Nothing to undo" }); return; }
    if (latest.reason?.includes("batch_lock")) {
      res.status(400).json({ error: "Cannot undo a batch-lock action" }); return;
    }

    const adminWho = getAdminUsername(res) ?? "admin";
    await db.update(ordersTable).set({
      routingType: latest.fromRoutingType ?? null,
      reshipperUsername: latest.fromReshipperUsername ?? null,
      countryLegId: latest.fromCountryLegId ?? null,
    } as Record<string, unknown>).where(eq(ordersTable.id, latest.orderId));

    await db.update(routingHistoryTable).set({
      metadata: { ...(typeof latest.metadata === "object" && latest.metadata !== null ? latest.metadata : {}), undone: true, undoneBy: adminWho },
    } as Record<string, unknown>).where(eq(routingHistoryTable.id, latest.id));

    await db.insert(routingHistoryTable).values({
      orderId: latest.orderId, changedBy: adminWho,
      fromRoutingType: latest.toRoutingType ?? null, toRoutingType: latest.fromRoutingType ?? null,
      fromReshipperUsername: latest.toReshipperUsername ?? null, toReshipperUsername: latest.fromReshipperUsername ?? null,
      fromCountryLegId: latest.toCountryLegId ?? null, toCountryLegId: latest.fromCountryLegId ?? null,
      reason: "undo", metadata: { undoOf: latest.id },
    });

    res.json({ ok: true, undoneHistoryId: latest.id, orderId: latest.orderId });
  } catch (err) {
    console.error("[admin] POST routing-undo error:", err);
    res.status(500).json({ error: "Failed to undo routing" });
  }
});

// ─── PATCH /api/admin/group-buys/:gbId/reshippers/:username/payment-block ────
// Toggle payment blocking on a specific reshipper assignment for a GB.
router.patch("/admin/group-buys/:gbId/reshippers/:username/payment-block", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const gbId = String(req.params["gbId"]);
    const username = String(req.params["username"]);
    const { blocked } = req.body as { blocked?: boolean };
    if (typeof blocked !== "boolean") { res.status(400).json({ error: "blocked (boolean) is required" }); return; }

    const [reshipper] = await db.select({ id: gbReshippersTable.id })
      .from(gbReshippersTable)
      .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));
    if (!reshipper) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

    await db.update(gbReshippersTable).set({ paymentBlocked: blocked } as Record<string, unknown>)
      .where(eq(gbReshippersTable.id, reshipper.id));

    const adminWho = getAdminUsername(res) ?? "admin";
    writeLog("change", "info", blocked ? "reshipper_payments_blocked" : "reshipper_payments_unblocked",
      `Admin ${adminWho} ${blocked ? "blocked" : "unblocked"} payments for reshipper @${username} in GB ${gbId}`,
      { gbId, reshipperUsername: username, blocked, changedBy: adminWho },
    ).catch(() => {});

    res.json({ ok: true, blocked });
  } catch (err) {
    console.error("[admin] PATCH reshipper payment-block error:", err);
    res.status(500).json({ error: "Failed to update payment block" });
  }
});

// ─── PATCH /api/admin/group-buys/:gbId/reshippers/:username/code ─────────────
// Manage reshipper invite code: generate, deactivate, activate, setCapacity.
router.patch("/admin/group-buys/:gbId/reshippers/:username/code", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const gbId = String(req.params["gbId"]);
    const username = String(req.params["username"]);
    const { action, capacity } = req.body as {
      action?: "generate" | "deactivate" | "activate" | "setCapacity";
      capacity?: number | null;
    };
    const VALID_ACTIONS = ["generate", "deactivate", "activate", "setCapacity"];
    if (!action || !VALID_ACTIONS.includes(action)) {
      res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(", ")}` }); return;
    }

    const [reshipper] = await db.select().from(gbReshippersTable)
      .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.reshipperUsername, username)));
    if (!reshipper) { res.status(404).json({ error: "Reshipper assignment not found" }); return; }

    const updates: Record<string, unknown> = {};
    if (action === "generate") {
      updates.reshipperCode = randomBytes(4).toString("hex").toUpperCase();
      updates.reshipperCodeActive = true;
    } else if (action === "deactivate") {
      updates.reshipperCodeActive = false;
    } else if (action === "activate") {
      updates.reshipperCodeActive = true;
    } else if (action === "setCapacity") {
      updates.codeCapacity = typeof capacity === "number" ? capacity : null;
    }

    const [updated] = await db.update(gbReshippersTable).set(updates)
      .where(eq(gbReshippersTable.id, reshipper.id)).returning();

    const adminWho = getAdminUsername(res) ?? "admin";
    writeLog("change", "info", "reshipper_code_updated",
      `Admin ${adminWho} performed '${action}' on reshipper code for @${username} in GB ${gbId}`,
      { gbId, reshipperUsername: username, action, changedBy: adminWho },
    ).catch(() => {});

    res.json({
      ok: true,
      reshipperCode: updated.reshipperCode ?? null,
      reshipperCodeActive: updated.reshipperCodeActive,
      codeCapacity: updated.codeCapacity ?? null,
    });
  } catch (err) {
    console.error("[admin] PATCH reshipper code error:", err);
    res.status(500).json({ error: "Failed to update reshipper code" });
  }
});

// ── PATCH /api/admin/group-buys/:gbId/country-legs/:legId/kit-excluded-orders ─
// Toggle an order's inclusion in the kit count viewer total for a country leg.
router.patch("/admin/group-buys/:gbId/country-legs/:legId/kit-excluded-orders", async (req, res): Promise<void> => {
  const legId = String(req.params["legId"]);
  const gbId = String(req.params["gbId"]);
  const { orderId, excluded } = req.body as { orderId: string; excluded: boolean };

  if (!orderId || typeof excluded !== "boolean") {
    res.status(400).json({ error: "orderId and excluded (boolean) are required" });
    return;
  }

  const [leg] = await db
    .select({ id: gbCountryLegsTable.id, kitCountExcludedOrderIds: gbCountryLegsTable.kitCountExcludedOrderIds })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));

  if (!leg) { res.status(404).json({ error: "Country leg not found" }); return; }

  const current: string[] = Array.isArray(leg.kitCountExcludedOrderIds) ? leg.kitCountExcludedOrderIds : [];
  let next: string[];
  if (excluded) {
    next = current.includes(orderId) ? current : [...current, orderId];
  } else {
    next = current.filter((id: string) => id !== orderId);
  }

  await db
    .update(gbCountryLegsTable)
    .set({ kitCountExcludedOrderIds: next.length > 0 ? next : null } as Record<string, unknown>)
    .where(eq(gbCountryLegsTable.id, legId));

  res.json({ ok: true, excludedOrderIds: next });
});

// ── POST /api/admin/impersonate — generate a one-time token to view as a member (valid 5 min) ─
const impersonateTokens = new Map<string, { telegramUsername: string; expiresAt: number }>();

router.post("/admin/impersonate", async (req: any, res: any): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { telegramUsername } = req.body ?? {};
  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "telegramUsername is required" }); return;
  }
  const bare = telegramUsername.replace(/^@+/, "").toLowerCase().trim();
  // Verify the account exists
  const [account] = await db.select({ telegramUsername: accountsTable.telegramUsername })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, bare))
    .limit(1);
  if (!account) { res.status(404).json({ error: "Account not found" }); return; }
  // Clean stale tokens
  const now = Date.now();
  for (const [k, v] of impersonateTokens) { if (v.expiresAt < now) impersonateTokens.delete(k); }
  const token = randomUUID();
  impersonateTokens.set(token, { telegramUsername: bare, expiresAt: now + 300_000 });
  res.json({ token });
});

// ── GET /api/admin/impersonate-redirect?token=XYZ — set cookie and redirect ────
router.get("/admin/impersonate-redirect", async (req: any, res: any): Promise<void> => {
  const token = req.query?.token as string | undefined;
  if (!token) { res.status(400).send("Missing token"); return; }
  const entry = impersonateTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    impersonateTokens.delete(token);
    res.status(410).send("Token expired or invalid. Go back and try again."); return;
  }
  impersonateTokens.delete(token); // one-use
  issueAccountCookie(res, entry.telegramUsername);
  res.redirect("/account");
});

export default router;

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderLineItemsTable,
  lookupAttemptsTable,
  deliveryMethodsTable,
  customersTable,
  accountGroupBuysTable,
  accountsTable,
  groupBuysTable,
  gbTestingRoundsTable,
  gbReshippersTable,
  gbCountryLegsTable,
  ruleAcceptancesTable,
  siteConfigTable,
  couponCodesTable,
  couponRedemptionsTable,
  creditTransactionsTable,
  EDITABLE_STATUSES,
  type OrderStatus,
} from "@workspace/db";
import { eq, and, or, ne, sql, desc, count, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeLog } from "../lib/audit-log";
import { createAlert } from "../lib/create-alert";
import { notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { getJwtSecret } from "../middleware/account-auth";
import { logCustomerActivity } from "../lib/activity-log";

// ── Multer: receive QR files as binary multipart uploads ──────
const _qrMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("File must be an image (PNG/JPEG/WebP) or PDF"));
    }
  },
}).single("file");

function qrUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  _qrMulter(req, res, (err) => {
    if (!err) { next(); return; }
    const msg = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
      ? "File is too large. Maximum size is 10 MB."
      : (err as Error).message || "File upload error";
    res.status(400).json({ error: msg });
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const ISO_TO_COUNTRY: Record<string, string> = {
  GB: "United Kingdom", IE: "Ireland", BE: "Belgium", NL: "Netherlands",
  LU: "Luxembourg", DE: "Germany", AT: "Austria", FR: "France",
  ES: "Spain", PT: "Portugal", IT: "Italy", SE: "Sweden", DK: "Denmark",
  FI: "Finland", NO: "Norway", EE: "Estonia", LV: "Latvia", LT: "Lithuania",
  PL: "Poland", CZ: "Czech Republic", SK: "Slovakia", HU: "Hungary",
  RO: "Romania", BG: "Bulgaria", HR: "Croatia", SI: "Slovenia",
  GR: "Greece", CY: "Cyprus", MT: "Malta", CH: "Switzerland",
  US: "United States", CA: "Canada", AU: "Australia",
};

function normaliseCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return ISO_TO_COUNTRY[trimmed.toUpperCase()] ?? trimmed;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Google Sheets outbound webhook — set GOOGLE_SHEETS_WEBHOOK_URL in Replit Secrets
const GOOGLE_SHEETS_WEBHOOK_URL = process.env["GOOGLE_SHEETS_WEBHOOK_URL"] ?? "";
const GOOGLE_SHEETS_WEBHOOK_SECRET = process.env["GOOGLE_SHEETS_WEBHOOK_SECRET"] ?? "";

// ─── Input limits ─────────────────────────────────────────────
const MAX_TG_LENGTH = 64;
const MAX_NOTES_LENGTH = 1000;
const MAX_LINE_ITEMS = 50;
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_SHIPPING_NAME_LENGTH = 200;
const MAX_SHIPPING_ADDRESS_LENGTH = 1000;
const MAX_SHIPPING_EMAIL_LENGTH = 200;

// ─────────────────────────────────────────────────────────────

function getAccountFromCookie(req: import("express").Request): string | null {
  const token = req.cookies?.account_session as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { telegramUsername: string };
    return payload.telegramUsername ?? null;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

/**
 * When the parent group buy is in status "closed", returns true if the named
 * customer action has been disabled by admin/organiser via the
 * `allow_*_when_closed` flags. Returns false for orphan/non-GB orders or when
 * the GB is not closed. Admin/organiser routes are intentionally not gated.
 */
type CustomerOrderAction = "edit" | "address" | "delete";
async function isCustomerActionLockedByGb(
  groupBuyId: string | null | undefined,
  action: CustomerOrderAction,
): Promise<boolean> {
  if (!groupBuyId) return false;
  const [parentGb] = await db
    .select({
      status: groupBuysTable.status,
      allowOrderAddons: groupBuysTable.allowOrderAddons,
      allowEditOrderWhenClosed: groupBuysTable.allowEditOrderWhenClosed,
      allowEditAddressWhenClosed: groupBuysTable.allowEditAddressWhenClosed,
      allowDeleteOrderWhenClosed: groupBuysTable.allowDeleteOrderWhenClosed,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));
  if (!parentGb) return false;
  if (action === "edit" && parentGb.allowOrderAddons === false) return true;
  if (parentGb.status !== "closed") return false;
  if (action === "edit") return !parentGb.allowEditOrderWhenClosed;
  if (action === "address") return !parentGb.allowEditAddressWhenClosed;
  return !parentGb.allowDeleteOrderWhenClosed;
}

// ── Timing-safe string comparison (prevents timing attacks) ───
function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still run comparison to prevent length-based timing leaks
      timingSafeEqual(bufA, Buffer.alloc(bufA.length));
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function generateCode(): Promise<string> {
  const [row] = await db
    .select({ maxCode: sql<string>`max(cast(code as integer)) filter (where code ~ '^[0-9]+$')` })
    .from(ordersTable);
  const next = Math.max(1000, (parseInt(row?.maxCode ?? "999", 10) || 999) + 1);
  return String(next);
}

function normalizeTg(raw: string): string {
  const t = raw.trim().toLowerCase();
  return t.startsWith("@") ? t : `@${t}`;
}

/** Case-insensitive match on telegram_username column */
function tgEq(tg: string) {
  return sql`lower(${ordersTable.telegramUsername}) = ${tg}`;
}

function validateTg(tg: string): string | null {
  if (tg.length < 2 || tg.length > MAX_TG_LENGTH) return "Invalid Telegram username length";
  if (!/^@[\w.]+$/.test(tg) && !/^@.+$/.test(tg)) return null; // allow usernames with spaces (for seeded data)
  return null;
}

function formatOrderResponse(order: Record<string, unknown>, lineItems: Record<string, unknown>[], groupBuyPaymentsEnabled: boolean | null = null) {
  return {
    id: order.id,
    code: order.code,
    telegramUsername: order.telegramUsername,
    deliveryMethod: order.deliveryMethod,
    deliveryPrice: parseFloat((order.deliveryPrice as string) ?? "0"),
    vendorShipping: parseFloat((order.vendorShipping as string) ?? "0"),
    productSubtotal: parseFloat(order.productSubtotal as string),
    tip: parseFloat((order.tip as string) ?? "0"),
    testingContribution: parseFloat((order.testingContribution as string) ?? "0"),
    testVote: (order.testVote as string | null) ?? null,
    grandTotal: parseFloat(order.grandTotal as string),
    notes: order.notes ?? null,
    status: order.status,
    adminMessage: (order.adminMessage as string | null) ?? null,
    trackingNumber: (order.trackingNumber as string | null) ?? null,
    paymentStatus: order.paymentStatus ?? "unpaid",
    paymentTxHash: (order.paymentTxHash as string | null) ?? null,
    paymentTestAmount: order.paymentTestAmount ? parseFloat(String(order.paymentTestAmount)) : null,
    testPaymentTxHash: (order.testPaymentTxHash as string | null) ?? null,
    shippingName: (order.shippingName as string | null) ?? null,
    shippingPhone: (order.shippingPhone as string | null) ?? null,
    shippingEmail: (order.shippingEmail as string | null) ?? null,
    shippingAddress: (order.shippingAddress as string | null) ?? null,
    pin: (order.pin as string | null) ?? "0000",
    inpostQrCode: (order.inpostQrCode as string | null) ?? null,
    royalMailQrCode: (order.royalMailQrCode as string | null) ?? null,
    groupBuyId: (order.groupBuyId as string | null) ?? null,
    countryLegId: (order.countryLegId as string | null) ?? null,
    reshipperUsername: (order.reshipperUsername as string | null) ?? null,
    routingType: (order.routingType as string | null) ?? null,
    directShippingRequested: (order.directShippingRequested as boolean | null) ?? false,
    batchLocked: (order.batchLocked as boolean | null) ?? false,
    groupBuyPaymentsEnabled,
    deliveryMethodId: (order.deliveryMethodId as string | null) ?? null,
    creditsApplied: order.creditsApplied ? parseFloat(String(order.creditsApplied)) : 0,
    adminFee: parseFloat((order.adminFee as string) ?? "0"),
    adminFeeLabel: (order.adminFeeLabel as string | null) ?? null,
    shippingCarrier: (order.shippingCarrier as string | null) ?? null,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      productId: li.productId,
      productName: li.productName,
      quantity: parseFloat(li.quantity as string),
      unitPrice: parseFloat(li.unitPrice as string),
      lineTotal: parseFloat(li.lineTotal as string),
    })),
    createdAt: (order.createdAt as Date).toISOString(),
    updatedAt: (order.updatedAt as Date).toISOString(),
  };
}

function recalculateTotals(
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  deliveryPrice: number,
  vendorShipping: number,
  tip: number,
  testingContribution: number = 0
) {
  const productSubtotal = lineItems.reduce(
    (sum, li) => sum + Number((li.quantity * li.unitPrice).toFixed(2)),
    0
  );
  const grandTotal = Number((productSubtotal + deliveryPrice + vendorShipping + tip + testingContribution).toFixed(2));
  return { productSubtotal: Number(productSubtotal.toFixed(2)), grandTotal };
}

// Push order to Google Sheets (best-effort, non-blocking)
async function pushToGoogleSheets(order: ReturnType<typeof formatOrderResponse>) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) return;
  try {
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: GOOGLE_SHEETS_WEBHOOK_SECRET, order }),
    });
  } catch (err) {
    console.error("[Sheets] Failed to push order:", err);
  }
}

// ── POST /api/orders/claim-pin — first-time PIN setup for seeded accounts ──
// Only works if the account currently has the default PIN (0000)
router.post("/orders/claim-pin", async (req, res): Promise<void> => {
  const { telegramUsername, newPin, confirmPin } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Telegram username is required" });
    return;
  }
  if (!newPin || !/^\d{4}$/.test(String(newPin))) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" });
    return;
  }
  if (newPin !== confirmPin) {
    res.status(400).json({ error: "PINs do not match" });
    return;
  }
  if (String(newPin) === "0000") {
    res.status(400).json({ error: "Please choose a PIN other than 0000" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (tg.length > MAX_TG_LENGTH) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const allOrders = await db.select().from(ordersTable).where(tgEq(tg));

  // Need at least one order with the default PIN to allow claim
  const defaultPinOrders = allOrders.filter(o => o.pin === "0000");
  if (allOrders.length === 0 || defaultPinOrders.length === 0) {
    // Generic error — don't reveal if account doesn't exist or is already claimed
    res.status(403).json({ error: "This account cannot be claimed or has already been set up" });
    return;
  }

  // Update ALL orders for this username that still have the default PIN
  for (const o of defaultPinOrders) {
    await db.update(ordersTable).set({ pin: String(newPin) }).where(eq(ordersTable.id, o.id));
  }

  await writeLog("login", "info", "pin_claimed",
    `Account PIN set for ${tg} — ${defaultPinOrders.length} order(s) updated`,
    { telegramUsername: tg, ordersUpdated: defaultPinOrders.length },
    req.ip,
  );

  res.json({ ok: true });
});

// ── POST /api/orders — create a new order ────────────────────
router.post("/orders", async (req, res): Promise<void> => {
  const {
    telegramUsername,
    deliveryMethodId,
    vendorShipping: clientVendorShipping = 0,
    tip: clientTip = 0,
    testingContribution: clientTestingContribution = 0,
    notes,
    pin: clientPin,
    lineItems: clientLineItems,
    groupBuyId: clientGroupBuyId,
    shippingCountry: clientShippingCountry,
    orderType: clientOrderType,
    shippingName: clientShippingName,
    shippingPhone: clientShippingPhone,
    shippingEmail: clientShippingEmail,
    shippingAddress: clientShippingAddress,
    reshipperUsername: clientPreferredReshipper,
    couponCode: clientCouponCode,
    creditsApplied: clientCreditsApplied,
    directShippingRequested: clientDirectShippingRequested,
    directShippingCost: clientDirectShippingCost,
    reshipperCode: clientReshipperCode,
  } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string") {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const isWholesaleOrder = clientOrderType === "wholesale";
  if (!isWholesaleOrder && (!deliveryMethodId || typeof deliveryMethodId !== "string")) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!clientLineItems?.length) {
    res.status(400).json({ error: "At least one product is required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  const tgError = validateTg(tg);
  if (tgError) { res.status(400).json({ error: tgError }); return; }

  if (notes !== undefined && notes !== null && String(notes).length > MAX_NOTES_LENGTH) {
    res.status(400).json({ error: `Notes must be under ${MAX_NOTES_LENGTH} characters` });
    return;
  }

  // Resolve normalizedGroupBuyId early so we can fall back to GB shipping options below
  const normalizedGroupBuyId = clientGroupBuyId && typeof clientGroupBuyId === "string"
    ? clientGroupBuyId.trim().slice(0, 64)
    : null;

  let deliveryMethodRecord: { id: string; name: string; price: string } | null | undefined;

  // Wholesale orders don't use a standard delivery method — vendor shipping is used instead
  if (isWholesaleOrder) {
    deliveryMethodRecord = { id: "wholesale", name: "Vendor Shipping", price: "0" };
  } else if (String(deliveryMethodId) === "__direct_shipping" && clientDirectShippingRequested === true) {
    // Virtual method for vendor direct-to-home shipping — not in delivery_methods table
    const dsCost = clientDirectShippingCost != null ? parseFloat(String(clientDirectShippingCost)) : 0;
    deliveryMethodRecord = { id: "__direct_shipping", name: "Direct Shipping to Home", price: isNaN(dsCost) ? "0" : dsCost.toFixed(2) };
  } else {
    [deliveryMethodRecord] = await db
      .select({ id: deliveryMethodsTable.id, name: deliveryMethodsTable.name, price: deliveryMethodsTable.price })
      .from(deliveryMethodsTable)
      .where(eq(deliveryMethodsTable.id, String(deliveryMethodId).slice(0, 64)));
  }

  // If not in delivery_methods, check if it's a custom shipping option on the GB
  if (!deliveryMethodRecord && normalizedGroupBuyId) {
    const [gbRow] = await db
      .select({ shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, normalizedGroupBuyId));
    if (gbRow?.shippingOptions) {
      try {
        const opts = JSON.parse(gbRow.shippingOptions) as Array<{ id: string; label: string; price: number }>;
        const match = opts.find(o => o.id === String(deliveryMethodId));
        if (match) {
          deliveryMethodRecord = { id: match.id, name: match.label, price: String(match.price) };
        }
      } catch { /* ignore malformed JSON */ }
    }
  }

  if (!deliveryMethodRecord) {
    res.status(400).json({ error: "Invalid delivery method" });
    return;
  }

  const deliveryPrice = parseFloat(deliveryMethodRecord.price);
  let vendorShipping = Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  const tip = Math.min(20, Math.max(0, parseFloat(String(clientTip)) || 0)); // cap tip at $20
  const testingContribution = Math.max(0, parseFloat(String(clientTestingContribution)) || 0);

  if (!Array.isArray(clientLineItems) || clientLineItems.length === 0) {
    res.status(400).json({ error: "At least one product is required" });
    return;
  }
  if (clientLineItems.length > MAX_LINE_ITEMS) {
    res.status(400).json({ error: `Too many line items (max ${MAX_LINE_ITEMS})` });
    return;
  }

  for (const li of clientLineItems) {
    if (!li.productId || typeof li.productId !== "string" || li.productId.length > 64) {
      res.status(400).json({ error: "Invalid line item: missing or invalid product ID" });
      return;
    }
    if (!li.productName || typeof li.productName !== "string" || li.productName.length > MAX_PRODUCT_NAME_LENGTH) {
      res.status(400).json({ error: "Invalid line item: missing or invalid product name" });
      return;
    }
    const qty = parseFloat(String(li.quantity));
    if (isNaN(qty) || qty < 0.5 || qty > 1000) {
      res.status(400).json({ error: "Quantity must be between 0.5 and 1000" });
      return;
    }
    if (Math.round(qty * 2) !== qty * 2) {
      res.status(400).json({ error: "Quantity must be a multiple of 0.5" });
      return;
    }
  }

  const productIds = clientLineItems.map((li: { productId: string }) => li.productId);
  if (new Set(productIds).size !== productIds.length) {
    res.status(400).json({ error: "Duplicate products in order. Please combine quantities instead." });
    return;
  }

  // Admin fee — set inside the GB block below where `gb` is in scope
  let gbAdminFee = 0;
  let gbAdminFeeLabel: string | null = null;

  // Validate group buy membership if a groupBuyId is provided
  if (normalizedGroupBuyId) {
    // GB orders require an authenticated account session — validate identity from cookie, not request body
    const sessionUsername = getAccountFromCookie(req);
    if (!sessionUsername) {
      res.status(401).json({ error: "Authentication required to place group buy orders" });
      return;
    }

    const [membership] = await db
      .select({ id: accountGroupBuysTable.id, allowExtraOrder: accountGroupBuysTable.allowExtraOrder })
      .from(accountGroupBuysTable)
      .where(and(
        eq(accountGroupBuysTable.accountId, sessionUsername.toLowerCase()),
        eq(accountGroupBuysTable.groupBuyId, normalizedGroupBuyId),
      ));

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group buy" });
      return;
    }

    // Also confirm the GB is active and check testingEnabled + kit limits
    const [gb] = await db
      .select({
        status: groupBuysTable.status,
        testingEnabled: groupBuysTable.testingEnabled,
        maxKitsPerCustomer: groupBuysTable.maxKitsPerCustomer,
        maxKitsTotal: groupBuysTable.maxKitsTotal,
        organiserId: groupBuysTable.organiserId,
        sharedShippingCountries: groupBuysTable.sharedShippingCountries,
        allowExtraOrders: groupBuysTable.allowExtraOrders,
        adminFeeEnabled: groupBuysTable.adminFeeEnabled,
        adminFeeAmount: groupBuysTable.adminFeeAmount,
        adminFeeLabel: groupBuysTable.adminFeeLabel,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, normalizedGroupBuyId));

    if (!gb || (gb.status !== "active" && !gb.allowExtraOrders && !membership.allowExtraOrder)) {
      res.status(403).json({ error: "This group buy is not currently accepting orders" });
      return;
    }

    // Enforce contribution rules: only allowed when GB has testing enabled, and must be exactly $15
    if (testingContribution > 0 && !gb.testingEnabled) {
      res.status(400).json({ error: "Lab test contributions are not enabled for this group buy" });
      return;
    }

    // Enforce kit limits
    const newKitCount = clientLineItems.reduce(
      (sum: number, li: { quantity: number }) => sum + parseFloat(String(li.quantity)),
      0,
    );

    if (gb.maxKitsPerCustomer != null && !gb.allowExtraOrders && !membership.allowExtraOrder) {
      const [customerKitsRow] = await db
        .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
        .from(orderLineItemsTable)
        .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
        .where(and(
          eq(ordersTable.groupBuyId, normalizedGroupBuyId),
          eq(ordersTable.telegramUsername, tg),
        ));
      const existingCustomerKits = parseFloat(customerKitsRow?.total ?? "0");
      if (existingCustomerKits + newKitCount > gb.maxKitsPerCustomer) {
        const remaining = Math.max(0, gb.maxKitsPerCustomer - existingCustomerKits);
        res.status(400).json({
          error: `Kit limit exceeded. You can order at most ${gb.maxKitsPerCustomer} kit(s) from this group buy. You already have ${existingCustomerKits} and ${remaining} remain available.`,
        });
        return;
      }
    }

    if (gb.maxKitsTotal != null) {
      const [totalKitsRow] = await db
        .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
        .from(orderLineItemsTable)
        .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
        .where(eq(ordersTable.groupBuyId, normalizedGroupBuyId));
      const existingTotalKits = parseFloat(totalKitsRow?.total ?? "0");
      if (existingTotalKits + newKitCount > gb.maxKitsTotal) {
        const remaining = Math.max(0, gb.maxKitsTotal - existingTotalKits);
        res.status(400).json({
          error: `This group buy has reached its kit limit. Only ${remaining} kit(s) remain available from the total of ${gb.maxKitsTotal}.`,
        });
        return;
      }
    }

    // Capture admin fee while gb is in scope
    if (gb.adminFeeEnabled && gb.adminFeeAmount != null) {
      gbAdminFee = parseFloat(String(gb.adminFeeAmount));
      gbAdminFeeLabel = gbAdminFee > 0 ? (gb.adminFeeLabel ?? null) : null;
    }
  } else {
    // Non-GB orders cannot have a testing contribution
    if (testingContribution > 0) {
      res.status(400).json({ error: "Lab test contributions are only available for group buy orders" });
      return;
    }
  }

  // ── Shared shipping waiver check ──────────────────────────────────────────
  // If the GB has sharedShippingCountries configured and the customer's country
  // is in that list, check if they already have another order in a different GB
  // from the same organiser with a non-zero vendorShipping. If so, waive shipping.
  if (normalizedGroupBuyId && vendorShipping > 0 && clientShippingCountry && typeof clientShippingCountry === "string") {
    const normalizedCountry = clientShippingCountry.trim();
    if (normalizedCountry) {
      const gbForWaiver = await db
        .select({ organiserId: groupBuysTable.organiserId, sharedShippingCountries: groupBuysTable.sharedShippingCountries })
        .from(groupBuysTable)
        .where(eq(groupBuysTable.id, normalizedGroupBuyId))
        .then(rows => rows[0] ?? null);

      if (gbForWaiver?.sharedShippingCountries) {
        let eligibleCountries: string[] = [];
        try { eligibleCountries = JSON.parse(gbForWaiver.sharedShippingCountries) as string[]; } catch { /* ignore */ }
        if (Array.isArray(eligibleCountries) && eligibleCountries.some(c => c.toLowerCase() === normalizedCountry.toLowerCase())) {
          // Customer's country is in the shared-shipping list — check for an existing shipping-paid order
          const organiserId = gbForWaiver.organiserId;
          if (organiserId) {
            const otherGbIds = await db
              .select({ id: groupBuysTable.id })
              .from(groupBuysTable)
              .where(and(eq(groupBuysTable.organiserId, organiserId), ne(groupBuysTable.id, normalizedGroupBuyId)));
            if (otherGbIds.length > 0) {
              const otherIds = otherGbIds.map(r => r.id);
              const existingShippingOrder = await db
                .select({ id: ordersTable.id })
                .from(ordersTable)
                .where(and(
                  eq(ordersTable.telegramUsername, tg),
                  inArray(ordersTable.groupBuyId, otherIds),
                  sql`cast(${ordersTable.vendorShipping} as numeric) > 0`,
                  ne(ordersTable.status, "Cancelled"),
                ))
                .limit(1);
              if (existingShippingOrder.length > 0) {
                vendorShipping = 0;
              }
            }
          }
        }
      }
    }
  }

  // Normalize contribution: either 0 or the round's configured amount.
  // Fetch the active round for this GB (if any) to get the canonical amount.
  let roundContributionAmount = 15;
  if (normalizedGroupBuyId && testingContribution > 0) {
    const [activeRound] = await db
      .select({ contributionAmount: gbTestingRoundsTable.contributionAmount })
      .from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, normalizedGroupBuyId))
      .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
      .limit(1);
    if (activeRound?.contributionAmount) {
      roundContributionAmount = parseFloat(activeRound.contributionAmount as string) || 15;
    }
  }
  const normalizedContribution = testingContribution > 0 ? roundContributionAmount : 0;

  // Recalculate grand total using normalized contribution
  const { productSubtotal, grandTotal: baseGrandTotal } = recalculateTotals(clientLineItems, deliveryPrice, vendorShipping, tip, normalizedContribution);

  // ── Coupon validation ────────────────────────────────────────────────────────
  let appliedCouponCode: string | null = null;
  let couponDiscount = 0;
  let resolvedCouponId: string | null = null;

  if (clientCouponCode && typeof clientCouponCode === "string") {
    const normalizedCode = clientCouponCode.trim().toUpperCase();
    const [coupon] = await db
      .select()
      .from(couponCodesTable)
      .where(eq(couponCodesTable.code, normalizedCode));

    if (coupon && coupon.isActive) {
      const now = new Date();
      const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > now;
      const underLimit = coupon.maxUses == null || (coupon.usageCount ?? 0) < coupon.maxUses;
      if (notExpired && underLimit) {
        if (coupon.discountType === "percentage") {
          couponDiscount = Number(((baseGrandTotal * parseFloat(String(coupon.discountValue))) / 100).toFixed(2));
        } else {
          couponDiscount = Math.min(parseFloat(String(coupon.discountValue)), baseGrandTotal);
        }
        appliedCouponCode = normalizedCode;
        resolvedCouponId = coupon.id;
      }
    }
  }

  const grandTotal = Number(Math.max(0, baseGrandTotal + gbAdminFee - couponDiscount).toFixed(2));

  const orderId = randomUUID();
  const code = await generateCode();

  // Validate PIN if provided; default to "0000" otherwise
  const pin = clientPin && /^\d{4}$/.test(String(clientPin)) ? String(clientPin) : "0000";

  // Auto-assign reshipper: look up gb_reshippers for this GB + country
  const normalizedShippingCountry = clientShippingCountry && typeof clientShippingCountry === "string"
    ? clientShippingCountry.trim().slice(0, 100)
    : null;
  let autoReshipperUsername: string | null = null;

  // Resolve the user's country leg ID from their membership record (if this GB uses country legs)
  let resolvedCountryLegId: string | null = null;
  if (normalizedGroupBuyId && tg) {
    const [membership] = await db
      .select({ countryLegId: accountGroupBuysTable.countryLegId })
      .from(accountGroupBuysTable)
      .where(and(
        eq(accountGroupBuysTable.accountId, tg),
        eq(accountGroupBuysTable.groupBuyId, normalizedGroupBuyId),
      ));
    resolvedCountryLegId = membership?.countryLegId ?? null;

    // Auto-assign country leg if not yet assigned
    if (!resolvedCountryLegId) {
      // Load all legs for this GB once, then match in memory
      const gbLegs = await db
        .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, countryName: gbCountryLegsTable.countryName })
        .from(gbCountryLegsTable)
        .where(eq(gbCountryLegsTable.gbId, normalizedGroupBuyId));

      if (gbLegs.length > 0) {
        // Same robust matching as the backfill: handles full name, ISO code, "Name (CODE)", etc.
        const findLegId = (raw: string): string | null => {
          const c = raw.toLowerCase().trim();
          const match = gbLegs.find(l => {
            const code = l.countryCode.toLowerCase();
            const name = l.countryName.toLowerCase();
            return (
              c === name ||
              c === code ||
              c === `${name} (${code})` ||
              c === `${code} ${name}` ||
              c.includes(`(${code})`) ||
              c.startsWith(`${code} `)
            );
          });
          return match?.id ?? null;
        };

        // 1. Try account's stored country (name or code)
        const [acct] = await db
          .select({ country: accountsTable.country })
          .from(accountsTable)
          .where(eq(accountsTable.telegramUsername, tg));
        if (acct?.country) resolvedCountryLegId = findLegId(acct.country);

        // 2. Fall back to shipping country submitted with this order (usually an ISO code)
        if (!resolvedCountryLegId && normalizedShippingCountry) {
          resolvedCountryLegId = findLegId(normalizedShippingCountry);
        }

        // 3. Persist the resolved leg to the membership so future orders are instant
        if (resolvedCountryLegId) {
          await db
            .update(accountGroupBuysTable)
            .set({ countryLegId: resolvedCountryLegId })
            .where(and(
              eq(accountGroupBuysTable.accountId, tg),
              eq(accountGroupBuysTable.groupBuyId, normalizedGroupBuyId),
            ));
        }
      }
    }

    // If there's a country leg, pick reshipper from that leg's country
    if (resolvedCountryLegId) {
      const [leg] = await db
        .select({ countryCode: gbCountryLegsTable.countryCode })
        .from(gbCountryLegsTable)
        .where(eq(gbCountryLegsTable.id, resolvedCountryLegId));
      if (leg) {
        const candidates = await db
          .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
          .from(gbReshippersTable)
          .where(and(
            eq(gbReshippersTable.gbId, normalizedGroupBuyId),
            eq(gbReshippersTable.country, leg.countryCode),
            eq(gbReshippersTable.enabled, true),
          ));
        if (candidates.length === 1) {
          // Single reshipper — auto-assign immediately
          autoReshipperUsername = candidates[0].reshipperUsername;
        }
        // Multiple reshippers: leave unassigned so reshippers claim from the pool
      }
    }
  }

  // Fallback: use shipping country for reshipper lookup (non-leg GBs)
  if (!autoReshipperUsername && normalizedGroupBuyId && normalizedShippingCountry) {
    const candidates = await db
      .select({ reshipperUsername: gbReshippersTable.reshipperUsername })
      .from(gbReshippersTable)
      .where(and(
        eq(gbReshippersTable.gbId, normalizedGroupBuyId),
        eq(gbReshippersTable.country, normalizedShippingCountry),
        eq(gbReshippersTable.enabled, true),
      ));
    if (candidates.length === 1) {
      // Single reshipper — auto-assign immediately
      autoReshipperUsername = candidates[0].reshipperUsername;
    }
    // Multiple reshippers: leave unassigned so reshippers claim from the pool
  }

  // ── Reshipper invite code — if provided, validate and assign specific reshipper ──
  let codeRoutingType: string | null = null;
  if (normalizedGroupBuyId && clientReshipperCode && typeof clientReshipperCode === "string") {
    const normalizedCode = clientReshipperCode.trim().toUpperCase();
    const [codeReshipper] = await db
      .select({
        reshipperUsername: gbReshippersTable.reshipperUsername,
        codeCapacity: gbReshippersTable.codeCapacity,
      })
      .from(gbReshippersTable)
      .where(and(
        eq(gbReshippersTable.gbId, normalizedGroupBuyId),
        eq(gbReshippersTable.reshipperCode, normalizedCode),
        eq(gbReshippersTable.reshipperCodeActive, true),
        eq(gbReshippersTable.enabled, true),
      ));

    if (!codeReshipper) {
      res.status(400).json({ error: "Invalid or expired reshipper code. Please check the code and try again." });
      return;
    }

    // Enforce capacity limit if set
    if (codeReshipper.codeCapacity !== null) {
      const [used] = await db
        .select({ cnt: count() })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.groupBuyId, normalizedGroupBuyId),
          eq(ordersTable.reshipperUsername, codeReshipper.reshipperUsername),
          isNull(ordersTable.deletedAt),
        ));
      if ((used?.cnt ?? 0) >= codeReshipper.codeCapacity) {
        writeLog("order", "warn", "reshipper_capacity_reached",
          `Reshipper ${codeReshipper.reshipperUsername} in GB ${normalizedGroupBuyId} has reached capacity limit of ${codeReshipper.codeCapacity}`,
          { gbId: normalizedGroupBuyId, reshipperUsername: codeReshipper.reshipperUsername, capacity: codeReshipper.codeCapacity, used: used?.cnt ?? 0 },
        ).catch(() => {});
        res.status(400).json({ error: "This reshipper has reached their capacity limit. Please contact the group buy organiser." });
        return;
      }
    }

    autoReshipperUsername = codeReshipper.reshipperUsername;
    codeRoutingType = "reshipper";
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      id: orderId,
      code,
      telegramUsername: tg,
      deliveryMethod: deliveryMethodRecord.name,
      deliveryMethodId: deliveryMethodRecord.id,
      deliveryPrice: deliveryPrice.toFixed(2),
      vendorShipping: vendorShipping.toFixed(2),
      productSubtotal: productSubtotal.toFixed(2),
      tip: tip.toFixed(2),
      testingContribution: normalizedContribution.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      notes: notes ? String(notes).trim().slice(0, MAX_NOTES_LENGTH) : null,
      status: "Submitted",
      pin,
      groupBuyId: normalizedGroupBuyId,
      shippingCountry: normalizedShippingCountry,
      reshipperUsername: autoReshipperUsername,
      countryLegId: resolvedCountryLegId,
      routingType: codeRoutingType ?? (normalizedGroupBuyId ? "direct" : null),
      orderType: clientOrderType === "wholesale" ? "wholesale" : null,
      shippingName: ((clientOrderType === "wholesale" || clientDirectShippingRequested === true) && clientShippingName) ? String(clientShippingName).trim().slice(0, 120) || null : null,
      shippingPhone: clientShippingPhone ? String(clientShippingPhone).trim().slice(0, 40) || null : null,
      shippingEmail: clientShippingEmail ? String(clientShippingEmail).trim().slice(0, MAX_SHIPPING_EMAIL_LENGTH) || null : null,
      shippingAddress: ((clientOrderType === "wholesale" || clientDirectShippingRequested === true) && clientShippingAddress) ? String(clientShippingAddress).trim().slice(0, 500) || null : null,
      ipAddress: (() => { const xff = req.headers["x-forwarded-for"]; const raw = Array.isArray(xff) ? xff[0] : xff; return raw?.split(",")[0]?.trim() || req.ip || null; })(),
      couponCode: appliedCouponCode,
      couponDiscount: couponDiscount.toFixed(2),
      adminFee: clientDirectShippingRequested === true ? "0.00" : gbAdminFee.toFixed(2),
      adminFeeLabel: clientDirectShippingRequested === true ? null : gbAdminFeeLabel,
      directShippingRequested: clientDirectShippingRequested === true,
      directShippingCost: clientDirectShippingRequested === true && clientDirectShippingCost != null
        ? parseFloat(String(clientDirectShippingCost)).toFixed(2)
        : null,
    })
    .returning();

  const lineItemsToInsert = clientLineItems.map((li: {
    productId: string; productName: string; quantity: number; unitPrice: number;
  }) => ({
    id: randomUUID(),
    orderId,
    productId: li.productId,
    productName: String(li.productName).trim().slice(0, MAX_PRODUCT_NAME_LENGTH),
    quantity: parseFloat(String(li.quantity)).toFixed(2),
    unitPrice: parseFloat(String(li.unitPrice)).toFixed(2),
    lineTotal: (parseFloat(String(li.quantity)) * parseFloat(String(li.unitPrice))).toFixed(2),
  }));

  const insertedLineItems = await db
    .insert(orderLineItemsTable)
    .values(lineItemsToInsert)
    .returning();

  // Record coupon redemption if one was applied
  if (resolvedCouponId && appliedCouponCode) {
    await db.insert(couponRedemptionsTable).values({
      id: randomUUID(),
      couponId: resolvedCouponId,
      orderId,
      telegramUsername: tg,
      discountApplied: couponDiscount.toFixed(2),
    });
    await db.update(couponCodesTable)
      .set({ usageCount: sql`${couponCodesTable.usageCount} + 1` })
      .where(eq(couponCodesTable.id, resolvedCouponId));
  }

  // ── Apply store credits atomically during order creation ──────────────
  // If the client sent a creditsApplied amount and the request carries a valid
  // account session, re-verify the balance server-side and stamp it on the order.
  let appliedCredits = 0;
  const sessionUsernameForCredits = getAccountFromCookie(req);
  if (sessionUsernameForCredits && clientCreditsApplied && typeof clientCreditsApplied === "number" && clientCreditsApplied > 0) {
    try {
      const [acctRow] = await db
        .select({ credits: accountsTable.credits })
        .from(accountsTable)
        .where(eq(accountsTable.telegramUsername, sessionUsernameForCredits));
      if (acctRow && acctRow.credits > 0) {
        appliedCredits = Math.min(acctRow.credits, Math.round(clientCreditsApplied));
        if (appliedCredits > 0) {
          const newBalance = acctRow.credits - appliedCredits;
          await db.update(accountsTable).set({ credits: newBalance }).where(eq(accountsTable.telegramUsername, sessionUsernameForCredits));
          await db.update(ordersTable).set({ creditsApplied: appliedCredits }).where(eq(ordersTable.id, orderId));
          await db.insert(creditTransactionsTable).values({
            accountUsername: sessionUsernameForCredits,
            amount: -appliedCredits,
            reason: `Credits applied to order #${code}`,
            orderId,
            adminUsername: null,
            createdAt: new Date(),
          });
        }
      }
    } catch (err) {
      console.error("[orders] Failed to apply credits for order", orderId, err);
      // Non-fatal — order was created, credits just weren't applied
    }
  }

  const formatted = formatOrderResponse(
    { ...(order as unknown as Record<string, unknown>), creditsApplied: appliedCredits },
    insertedLineItems as unknown as Record<string, unknown>[],
  );
  pushToGoogleSheets(formatted).catch(() => {});

  writeLog("order", "info", "order_created",
    `New order ${code} created by ${tg} (${deliveryMethodRecord.name}, total: ${grandTotal.toFixed(2)})`,
    { orderId, code, telegramUsername: tg, grandTotal: grandTotal.toFixed(2), deliveryMethod: deliveryMethodRecord.name },
    req.ip ?? undefined,
  ).catch(() => {});

  await logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "order",
    eventType: "order.created",
    entityId: orderId,
    actorType: "customer",
    metadata: {
      code,
      grandTotal: grandTotal.toFixed(2),
      productSubtotal: productSubtotal.toFixed(2),
      deliveryMethod: deliveryMethodRecord.name,
      groupBuyId: normalizedGroupBuyId,
      lineItems: lineItemsToInsert.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    },
  }).catch(err => console.error("[orders] order.created log failed:", err));

  createAlert("order", "high", "New Order",
    `New order #${code} placed by ${tg} — $${grandTotal.toFixed(2)}`,
    { linkUrl: `#orders:${orderId}`, relatedEntityId: orderId },
  ).catch(() => {});

  const appUrl = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";

  let gbName = "";
  let gbOrganiser = "";
  let gbCurrency: string | null = null;
  if (normalizedGroupBuyId) {
    const [gbRow] = await db
      .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, normalizedGroupBuyId));
    if (gbRow) {
      gbName = gbRow.name;
      gbOrganiser = gbRow.organiserId ? `@${gbRow.organiserId}` : "Admin";
      gbCurrency = gbRow.currency ?? null;
    }
  }

  const CURRENCY_SYM: Record<string, string> = { GBP: "£", USD: "$", USDT: "$", USDC: "$", EUR: "€", CAD: "CA$", AUD: "A$" };
  const sym = (gbCurrency && CURRENCY_SYM[gbCurrency]) ? CURRENCY_SYM[gbCurrency] : "$";

  const gbContext = gbName
    ? `\nGB: <b>${escapeHtml(gbName)}</b>\nOrganiser: ${escapeHtml(gbOrganiser)}`
    : "";

  const paidLabel = "Unpaid";

  const orderDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const itemLines = lineItemsToInsert
    .map(li => `  • ${escapeHtml(li.productName)} ×${parseFloat(li.quantity) % 1 === 0 ? Math.round(parseFloat(li.quantity)) : parseFloat(li.quantity)}`)
    .join("\n");
  const totalQty = lineItemsToInsert.reduce((sum, li) => sum + parseFloat(li.quantity), 0);
  const totalQtyDisplay = totalQty % 1 === 0 ? Math.round(totalQty) : totalQty;

  notifyUserFromTemplate(tg, "new_order", "customer_new_order",
    {
      code,
      gb_name: gbContext,       // already built with proper HTML — do NOT escape again
      organiser: escapeHtml(gbOrganiser),
      username: escapeHtml(tg.replace(/^@/, "")),
      date: orderDate,
      order_total: sym + grandTotal.toFixed(2),
      items: itemLines,
      total_qty: String(totalQtyDisplay),
      delivery: escapeHtml(deliveryMethodRecord.name),
      delivery_fee: sym + deliveryPrice.toFixed(2),
      tip: sym + tip.toFixed(2),
      payment_status: paidLabel,
      app_url: appUrl,
    },
  ).catch(() => {});
  const adminItemLines = lineItemsToInsert.map(li =>
    `• ${escapeHtml(li.productName)} ×${parseFloat(li.quantity)} @ ${sym}${parseFloat(li.unitPrice).toFixed(2)} = ${sym}${parseFloat(li.lineTotal).toFixed(2)}`
  ).join("\n");
  sendAdminFromTemplate("admin_new_order",
    {
      code,
      gb_name: gbContext,       // already built with proper HTML — do NOT escape again
      organiser: escapeHtml(gbOrganiser),
      username: escapeHtml(tg.replace(/^@/, "")),
      payment_status: paidLabel,
      items: adminItemLines,
      delivery: escapeHtml(deliveryMethodRecord.name),
      delivery_fee: sym + deliveryPrice.toFixed(2),
      tip: tip > 0 ? `\nTip: ${sym}${tip.toFixed(2)}` : "",
      total_qty: String(totalQtyDisplay),
      order_total: sym + grandTotal.toFixed(2),
    },
  ).catch(() => {});

  res.status(201).json(formatted);
});

// ── POST /api/orders/lookup — look up order by Telegram username or order code + PIN ──
router.post("/orders/lookup", async (req, res): Promise<void> => {
  // Accept `identifier` (new) or `telegramUsername` (legacy) from body
  const rawIdentifier: unknown = req.body.identifier ?? req.body.telegramUsername;
  const pin: unknown = req.body.pin;

  if (!rawIdentifier || typeof rawIdentifier !== "string" || !pin || typeof pin !== "string") {
    res.status(400).json({ error: "Telegram username (or order code) and PIN are required" });
    return;
  }

  if (!/^\d{4}$/.test(pin.trim())) {
    res.status(404).json({ error: "Order not found. Please check your details and PIN." });
    return;
  }

  const raw = rawIdentifier.trim();

  // Determine if input looks like an order code (4-digit number) or a telegram username
  const isCode = /^\d{4}$/.test(raw);

  const identifier = raw.toLowerCase();
  const now = new Date();

  const [attempt] = await db
    .select()
    .from(lookupAttemptsTable)
    .where(eq(lookupAttemptsTable.identifier, identifier));

  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / 60000);
    res.status(429).json({
      error: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`,
    });
    return;
  }

  // Look up by order code or telegram username
  // For username lookups: find ALL orders for that user and pick the one with matching PIN
  let order: typeof ordersTable.$inferSelect | undefined;
  if (isCode) {
    const [found] = await db.select().from(ordersTable).where(and(eq(ordersTable.code, raw), isNull(ordersTable.deletedAt)));
    // Timing-safe PIN check even on single result
    if (found && safeEqual(found.pin ?? "____", pin.trim())) {
      order = found;
    } else {
      // Still do a safe comparison to prevent timing attacks when no order found
      safeEqual("____", pin.trim());
    }
  } else {
    const tg = normalizeTg(raw); // always has @ prefix, lowercased
    if (tg.length > MAX_TG_LENGTH) {
      res.status(404).json({ error: "Order not found. Please check your details and PIN." });
      return;
    }
    // Case-insensitive search — get ALL orders for this username
    const allOrders = await db.select().from(ordersTable).where(tgEq(tg));
    // Find the first order where PIN matches (handles users with multiple orders)
    order = allOrders.find(o => safeEqual(o.pin ?? "____", pin.trim()));
    // If no match, still do a safe compare to prevent timing attacks
    if (!order) safeEqual("____", pin.trim());
  }

  if (!order) {
    // Track failed attempt
    const newFailedCount = (attempt?.failedAttempts ?? 0) + 1;
    const blockedUntil = newFailedCount >= MAX_FAILED_ATTEMPTS
      ? new Date(now.getTime() + BLOCK_DURATION_MS)
      : null;
    if (attempt) {
      await db.update(lookupAttemptsTable)
        .set({ failedAttempts: newFailedCount, blockedUntil, lastAttemptAt: now })
        .where(eq(lookupAttemptsTable.id, attempt.id));
    } else {
      await db.insert(lookupAttemptsTable).values({
        id: randomUUID(),
        identifier,
        failedAttempts: 1,
        lastAttemptAt: now,
      });
    }
    // Audit log failed lookup
    await writeLog("login", "warn", "lookup_failed",
      `Failed order lookup for identifier: ${identifier}`,
      { identifier, failedAttempts: newFailedCount, blocked: !!blockedUntil },
      req.ip,
    );
    if (blockedUntil) {
      await writeLog("login", "warn", "lookup_blocked",
        `Lookup blocked for identifier: ${identifier} after ${newFailedCount} failed attempts`,
        { identifier, blockedUntil, failedAttempts: newFailedCount },
        req.ip,
      );
    }
    res.status(404).json({ error: "Order not found. Please check your Telegram username and PIN." });
    return;
  }

  // Success — reset failed attempts
  if (attempt && (attempt.failedAttempts ?? 0) > 0) {
    await db.update(lookupAttemptsTable)
      .set({ failedAttempts: 0, blockedUntil: null, lastAttemptAt: now })
      .where(eq(lookupAttemptsTable.id, attempt.id));
  }

  // Audit log successful lookup
  await writeLog("login", "info", "lookup_success",
    `Successful order lookup for ${order.telegramUsername} (order ${order.code})`,
    { identifier, orderId: order.id, orderCode: order.code, telegramUsername: order.telegramUsername },
    req.ip,
  );

  const lineItems = await db
    .select()
    .from(orderLineItemsTable)
    .where(eq(orderLineItemsTable.orderId, order.id));

  let gbPaymentsEnabled: boolean | null = null;
  let gbDirectShippingPaymentsEnabled: boolean | null = null;
  let gbQrUploadInpostEnabled = false;
  let gbQrUploadRoyalMailEnabled = false;
  let gbQrUploadMessage: string | null = null;
  let gbQrUploadCouriers: string[] | null = null;
  let gbPaymentBanner: string | null = null;
  let gbAllowOrderAddons: boolean | null = null;
  let gbHidePricesWhenClosed = false;
  let gbHideCostBreakdownWhenClosed = false;
  let gbHideGrandTotalWhenClosed = false;
  let gbStatus: string | null = null;
  if (order.groupBuyId) {
    const [gb] = await db
      .select({
        paymentsEnabled: groupBuysTable.paymentsEnabled,
        directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled,
        qrUploadInpostEnabled: groupBuysTable.qrUploadInpostEnabled,
        qrUploadRoyalMailEnabled: groupBuysTable.qrUploadRoyalMailEnabled,
        qrUploadMessage: groupBuysTable.qrUploadMessage,
        qrUploadCouriers: groupBuysTable.qrUploadCouriers,
        paymentBanner: groupBuysTable.paymentBanner,
        allowOrderAddons: groupBuysTable.allowOrderAddons,
        hidePricesWhenClosed: groupBuysTable.hidePricesWhenClosed,
        hideCostBreakdownWhenClosed: groupBuysTable.hideCostBreakdownWhenClosed,
        hideGrandTotalWhenClosed: groupBuysTable.hideGrandTotalWhenClosed,
        status: groupBuysTable.status,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    gbPaymentsEnabled = gb?.paymentsEnabled ?? null;
    gbDirectShippingPaymentsEnabled = gb?.directShippingPaymentsEnabled ?? null;
    gbQrUploadInpostEnabled = gb?.qrUploadInpostEnabled ?? false;
    gbQrUploadRoyalMailEnabled = gb?.qrUploadRoyalMailEnabled ?? false;
    gbQrUploadMessage = gb?.qrUploadMessage ?? null;
    gbPaymentBanner = gb?.paymentBanner ?? null;
    gbAllowOrderAddons = gb?.allowOrderAddons ?? null;
    gbHidePricesWhenClosed = gb?.hidePricesWhenClosed ?? false;
    gbHideCostBreakdownWhenClosed = gb?.hideCostBreakdownWhenClosed ?? false;
    gbHideGrandTotalWhenClosed = gb?.hideGrandTotalWhenClosed ?? false;
    gbStatus = gb?.status ?? null;
    if (gb?.qrUploadCouriers && (gb.qrUploadCouriers as string[]).length > 0) {
      gbQrUploadCouriers = gb.qrUploadCouriers as string[];
    } else {
      const derived: string[] = [];
      if (gb?.qrUploadInpostEnabled) derived.push("InPost");
      if (gb?.qrUploadRoyalMailEnabled) derived.push("Royal Mail");
      gbQrUploadCouriers = derived.length > 0 ? derived : null;
    }
  }

  // Always surface InPost QR upload for InPost delivery orders,
  // regardless of whether the GB has qrUploadInpostEnabled set.
  if (order.deliveryMethod?.toLowerCase().includes("inpost")) {
    const existing = gbQrUploadCouriers ?? [];
    if (!existing.some((c: string) => c.toLowerCase() === "inpost")) {
      gbQrUploadCouriers = [...existing, "InPost"];
    }
  }

  // Build the generic qrCodes map (merging legacy inpostQrCode / royalMailQrCode columns)
  const qrCodes: Record<string, string> = { ...((order.qrCodes as Record<string, string> | null) ?? {}) };
  if (order.inpostQrCode && !qrCodes["inpost"]) qrCodes["inpost"] = order.inpostQrCode as string;
  if (order.royalMailQrCode && !qrCodes["royal-mail"]) qrCodes["royal-mail"] = order.royalMailQrCode as string;

  res.json({
    ...formatOrderResponse(order as unknown as Record<string, unknown>, lineItems as unknown as Record<string, unknown>[], gbPaymentsEnabled),
    qrCodes,
    groupBuyQrUploadInpostEnabled: gbQrUploadInpostEnabled,
    groupBuyQrUploadRoyalMailEnabled: gbQrUploadRoyalMailEnabled,
    groupBuyQrUploadMessage: gbQrUploadMessage,
    groupBuyQrUploadCouriers: gbQrUploadCouriers,
    groupBuyDirectShippingPaymentsEnabled: gbDirectShippingPaymentsEnabled,
    groupBuyPaymentBanner: gbPaymentBanner,
    groupBuyAllowOrderAddons: gbAllowOrderAddons,
    groupBuyHidePricesWhenClosed: gbHidePricesWhenClosed,
    groupBuyHideCostBreakdownWhenClosed: gbHideCostBreakdownWhenClosed,
    groupBuyHideGrandTotalWhenClosed: gbHideGrandTotalWhenClosed,
    groupBuyStatus: gbStatus,
  });
});

// ── PATCH /api/orders/:orderId/pin — customer changes their own PIN ──
router.patch("/orders/:orderId/pin", async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const { telegramUsername, currentPin, newPin } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string" ||
      !currentPin || typeof currentPin !== "string" ||
      !newPin || typeof newPin !== "string") {
    res.status(400).json({ error: "telegramUsername, currentPin, and newPin are required" });
    return;
  }

  if (!/^\d{4}$/.test(String(newPin))) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits" });
    return;
  }
  if (!/^\d{4}$/.test(String(currentPin))) {
    res.status(401).json({ error: "Invalid username or current PIN" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (tg.length > MAX_TG_LENGTH) {
    res.status(401).json({ error: "Invalid username or current PIN" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), tgEq(tg)));

  const storedPin = order?.pin ?? "____";
  if (!order || !safeEqual(storedPin, currentPin.trim())) {
    res.status(401).json({ error: "Invalid username or current PIN" });
    return;
  }

  await db.update(ordersTable).set({ pin: String(newPin) }).where(eq(ordersTable.id, orderId));

  await writeLog("login", "info", "pin_changed",
    `PIN changed for ${tg} (order ${order.code})`,
    { telegramUsername: tg, orderId, orderCode: order.code },
    req.ip,
  );

  res.json({ ok: true });
});

// ── POST /api/orders/:orderId/inpost-qr — customer uploads InPost QR code ──
// Authenticated with telegramUsername + PIN (multipart/form-data)
router.post("/orders/:orderId/inpost-qr", qrUploadMiddleware, async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const telegramUsername = String(req.body?.telegramUsername ?? "");
  const pin = String(req.body?.pin ?? "");
  if (!telegramUsername || !pin) {
    res.status(400).json({ error: "telegramUsername and pin are required" }); return;
  }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tg = normalizeTg(telegramUsername);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.telegramUsername.toLowerCase() !== tg || !safeEqual(order.pin, pin.trim())) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  await db.update(ordersTable).set({ inpostQrCode: qrCode }).where(eq(ordersTable.id, orderId));
  res.json({ ok: true });
});

// ── POST /api/orders/:orderId/royal-mail-qr — customer uploads Royal Mail QR code ──
// Authenticated with telegramUsername + PIN (multipart/form-data)
router.post("/orders/:orderId/royal-mail-qr", qrUploadMiddleware, async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const telegramUsername = String(req.body?.telegramUsername ?? "");
  const pin = String(req.body?.pin ?? "");
  if (!telegramUsername || !pin) {
    res.status(400).json({ error: "telegramUsername and pin are required" }); return;
  }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tg = normalizeTg(telegramUsername);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.telegramUsername.toLowerCase() !== tg || !safeEqual(order.pin, pin.trim())) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  await db.update(ordersTable).set({ royalMailQrCode: qrCode }).where(eq(ordersTable.id, orderId));
  res.json({ ok: true });
});

// ── POST /api/orders/:orderId/qr-upload — generic courier QR upload (telegram+PIN auth) ──
router.post("/orders/:orderId/qr-upload", qrUploadMiddleware, async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const telegramUsername = String(req.body?.telegramUsername ?? "");
  const pin = String(req.body?.pin ?? "");
  const courierId = String(req.body?.courierId ?? "");
  if (!telegramUsername || !pin) {
    res.status(400).json({ error: "telegramUsername and pin are required" }); return;
  }
  if (!courierId || !/^[a-z0-9-]+$/.test(courierId)) {
    res.status(400).json({ error: "courierId must be a lowercase alphanumeric slug" }); return;
  }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const qrCode = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const tg = normalizeTg(telegramUsername);
  const [order] = await db
    .select({ id: ordersTable.id, telegramUsername: ordersTable.telegramUsername, pin: ordersTable.pin, qrCodes: ordersTable.qrCodes })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));
  if (!order || order.telegramUsername.toLowerCase() !== tg || !safeEqual(order.pin, pin.trim())) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const existing: Record<string, string> = (order.qrCodes as Record<string, string> | null) ?? {};
  await db.update(ordersTable).set({ qrCodes: { ...existing, [courierId]: qrCode } }).where(eq(ordersTable.id, orderId));
  res.json({ ok: true });
});

// ── PUT /api/orders/:orderId — update an existing order ──────
router.put("/orders/:orderId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;

  const {
    telegramUsername,
    code,
    deliveryMethodId,
    orderType: clientOrderType,
    vendorShipping: clientVendorShipping = 0,
    tip: clientTip = 0,
    testingContribution: clientTestingContribution = 0,
    notes,
    lineItems: clientLineItems,
    shippingName: clientShippingName,
    shippingPhone: clientShippingPhone,
    shippingEmail: clientShippingEmail,
    shippingAddress: clientShippingAddress,
    shippingCountry: clientShippingCountry,
    directShippingRequested: clientDirectShippingRequested,
    directShippingCost: clientDirectShippingCost,
  } = req.body;

  // Check the stored orderType from DB so that wholesale orders are handled
  // correctly even if the client omits orderType from the request body.
  const [storedOrderType] = await db
    .select({ orderType: ordersTable.orderType })
    .from(ordersTable)
    .where(eq(ordersTable.id, rawId));

  const isWholesaleOrder =
    clientOrderType === "wholesale" || storedOrderType?.orderType === "wholesale";

  if (!telegramUsername || typeof telegramUsername !== "string" ||
      !code || typeof code !== "string" ||
      (!isWholesaleOrder && (!deliveryMethodId || typeof deliveryMethodId !== "string")) ||
      !clientLineItems?.length) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  if (tg.length > MAX_TG_LENGTH) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.id, rawId),
      tgEq(tg),
    ));

  // Timing-safe code comparison
  const storedCode = order?.code ?? "0000";
  if (!order || !safeEqual(storedCode, code.trim())) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!EDITABLE_STATUSES.includes(order.status as OrderStatus)) {
    res.status(403).json({
      error: `This order cannot be edited (status: ${order.status}).`,
    });
    return;
  }

  if (await isCustomerActionLockedByGb(order.groupBuyId, "edit")) {
    res.status(403).json({
      error: `This group buy is closed — order items can no longer be edited.`,
      lockedByGb: true,
    });
    return;
  }

  let deliveryMethodRecord: { id: string; name: string; price: string } | null | undefined;

  // Wholesale orders don't use a standard delivery method — vendor shipping is used instead
  if (isWholesaleOrder) {
    deliveryMethodRecord = { id: "wholesale", name: "Vendor Shipping", price: "0" };
  } else if (String(deliveryMethodId) === "__direct_shipping" && clientDirectShippingRequested === true) {
    // Virtual method for vendor direct-to-home shipping — not in delivery_methods table
    const dsCost = clientDirectShippingCost != null ? parseFloat(String(clientDirectShippingCost)) : 0;
    deliveryMethodRecord = { id: "__direct_shipping", name: "Direct Shipping to Home", price: isNaN(dsCost) ? "0" : dsCost.toFixed(2) };
  } else {
    [deliveryMethodRecord] = await db
      .select({ id: deliveryMethodsTable.id, name: deliveryMethodsTable.name, price: deliveryMethodsTable.price })
      .from(deliveryMethodsTable)
      .where(eq(deliveryMethodsTable.id, String(deliveryMethodId).slice(0, 64)));
  }

  // If not in delivery_methods, check GB shipping options (for GB orders with custom options)
  if (!deliveryMethodRecord && order.groupBuyId) {
    const [gbRow] = await db
      .select({ shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (gbRow?.shippingOptions) {
      try {
        const opts = JSON.parse(gbRow.shippingOptions) as Array<{ id: string; label: string; price: number }>;
        const match = opts.find(o => o.id === String(deliveryMethodId));
        if (match) {
          deliveryMethodRecord = { id: match.id, name: match.label, price: String(match.price) };
        }
      } catch { /* ignore malformed JSON */ }
    }
  }

  if (!deliveryMethodRecord) {
    res.status(400).json({ error: "Invalid delivery method" });
    return;
  }

  const deliveryPrice = parseFloat(deliveryMethodRecord.price);
  const vendorShipping = Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  const tip = Math.min(20, Math.max(0, parseFloat(String(clientTip)) || 0));

  if (!Array.isArray(clientLineItems) || clientLineItems.length > MAX_LINE_ITEMS) {
    res.status(400).json({ error: `Too many line items (max ${MAX_LINE_ITEMS})` });
    return;
  }

  for (const li of clientLineItems) {
    if (!li.productId || typeof li.productId !== "string" || li.productId.length > 64 ||
        !li.productName || typeof li.productName !== "string" || li.productName.length > MAX_PRODUCT_NAME_LENGTH) {
      res.status(400).json({ error: "Invalid line item" });
      return;
    }
    const qty = parseFloat(String(li.quantity));
    if (isNaN(qty) || qty < 0.5 || qty > 1000) {
      res.status(400).json({ error: "Quantity must be between 0.5 and 1000" });
      return;
    }
  }

  const productIds = clientLineItems.map((li: { productId: string }) => li.productId);
  if (new Set(productIds).size !== productIds.length) {
    res.status(400).json({ error: "Duplicate products in order. Please combine quantities instead." });
    return;
  }

  // Parse and validate testingContribution for update, matching create-order rules
  const rawUpdateContribution = parseFloat(String(clientTestingContribution)) || 0;
  const hasContribution = rawUpdateContribution > 0;

  if (hasContribution && !order.groupBuyId) {
    res.status(400).json({ error: "Lab test contributions are only available for group buy orders" });
    return;
  }

  let normalizedUpdateContribution = 0;
  if (hasContribution && order.groupBuyId) {
    const [gbForUpdate] = await db
      .select({ testingEnabled: groupBuysTable.testingEnabled })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));

    if (!gbForUpdate?.testingEnabled) {
      res.status(400).json({ error: "Lab test contributions are not enabled for this group buy" });
      return;
    }
    // Look up the active round's contribution amount (same as create-order logic)
    const [updateRound] = await db
      .select({ contributionAmount: gbTestingRoundsTable.contributionAmount })
      .from(gbTestingRoundsTable)
      .where(eq(gbTestingRoundsTable.groupBuyId, order.groupBuyId!))
      .orderBy(sql`${gbTestingRoundsTable.createdAt} DESC`)
      .limit(1);
    normalizedUpdateContribution = parseFloat(String(updateRound?.contributionAmount ?? "15")) || 15;
  }

  const { productSubtotal, grandTotal: baseUpdateTotal } = recalculateTotals(clientLineItems, deliveryPrice, vendorShipping, tip, normalizedUpdateContribution);
  const existingAdminFee = clientDirectShippingRequested === true ? 0 : parseFloat(String(order.adminFee ?? "0"));
  const grandTotal = Number(Math.max(0, baseUpdateTotal + existingAdminFee).toFixed(2));

  // Capture old line items for audit log before deleting them
  const oldLineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, rawId));

  const [updatedOrder] = await db
    .update(ordersTable)
    .set({
      deliveryMethod: deliveryMethodRecord.name,
      deliveryMethodId: deliveryMethodRecord.id,
      deliveryPrice: deliveryPrice.toFixed(2),
      vendorShipping: vendorShipping.toFixed(2),
      productSubtotal: productSubtotal.toFixed(2),
      tip: tip.toFixed(2),
      testingContribution: normalizedUpdateContribution.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      notes: notes ? String(notes).trim().slice(0, MAX_NOTES_LENGTH) : null,
      directShippingRequested: clientDirectShippingRequested === true,
      directShippingCost: clientDirectShippingRequested === true && clientDirectShippingCost != null
        ? parseFloat(String(clientDirectShippingCost)).toFixed(2)
        : null,
      ...(isWholesaleOrder && {
        shippingName: clientShippingName ? String(clientShippingName).trim().slice(0, 256) : null,
        shippingPhone: clientShippingPhone ? String(clientShippingPhone).trim().slice(0, 64) : null,
        shippingEmail: clientShippingEmail ? String(clientShippingEmail).trim().slice(0, 256) : null,
        shippingAddress: clientShippingAddress ? String(clientShippingAddress).trim().slice(0, 1024) : null,
        shippingCountry: clientShippingCountry ? String(clientShippingCountry).trim().slice(0, 128) : null,
      }),
    })
    .where(eq(ordersTable.id, rawId))
    .returning();

  await db.delete(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, rawId));

  const lineItemsToInsert = clientLineItems.map((li: {
    productId: string; productName: string; quantity: number; unitPrice: number;
  }) => ({
    id: randomUUID(),
    orderId: rawId,
    productId: li.productId,
    productName: String(li.productName).trim().slice(0, MAX_PRODUCT_NAME_LENGTH),
    quantity: parseFloat(String(li.quantity)).toFixed(2),
    unitPrice: parseFloat(String(li.unitPrice)).toFixed(2),
    lineTotal: (parseFloat(String(li.quantity)) * parseFloat(String(li.unitPrice))).toFixed(2),
  }));

  const insertedLineItems = await db
    .insert(orderLineItemsTable)
    .values(lineItemsToInsert)
    .returning();

  const formatted = formatOrderResponse(updatedOrder as unknown as Record<string, unknown>, insertedLineItems as unknown as Record<string, unknown>[]);
  pushToGoogleSheets(formatted).catch(() => {});

  writeLog("order", "info", "order_updated_by_customer",
    `Customer updated order ${order.code} (${order.telegramUsername})`,
    {
      orderId: rawId,
      code: order.code,
      telegramUsername: order.telegramUsername,
      before: {
        deliveryMethod: order.deliveryMethod,
        grandTotal: order.grandTotal,
        notes: order.notes,
        lineItems: oldLineItems.map(li => ({ productName: li.productName, quantity: li.quantity, unitPrice: li.unitPrice })),
      },
      after: {
        deliveryMethod: deliveryMethodRecord.name,
        grandTotal: grandTotal.toFixed(2),
        notes: notes ?? null,
        lineItems: lineItemsToInsert.map(li => ({ productName: li.productName, quantity: li.quantity, unitPrice: li.unitPrice })),
      },
    },
    req.ip ?? undefined,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.updated",
    entityId: rawId,
    actorType: "customer",
    metadata: {
      code: order.code,
      grandTotal: grandTotal.toFixed(2),
      deliveryMethod: deliveryMethodRecord.name,
      lineItems: lineItemsToInsert.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    },
  }).catch(err => console.error("[orders] order.updated log failed:", err));

  createAlert("order", "medium", "Order Edited",
    `Order #${order.code} was edited by @${order.telegramUsername.replace(/^@/, "")} — new total: $${grandTotal.toFixed(2)}`,
    { linkUrl: `#orders:${rawId}`, relatedEntityId: rawId },
  ).catch(() => {});

  let editGbCurrency: string | null = null;
  if (order.groupBuyId) {
    const [editGbRow] = await db
      .select({ currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    editGbCurrency = editGbRow?.currency ?? null;
  }
  const editSym = editGbCurrency === "GBP" ? "£" : "$";

  const editAdminItemLines = lineItemsToInsert.map(li =>
    `• ${escapeHtml(li.productName)} ×${parseFloat(li.quantity)} @ ${editSym}${parseFloat(li.unitPrice).toFixed(2)} = ${editSym}${parseFloat(li.lineTotal).toFixed(2)}`
  ).join("\n");
  const editAdminTipLine = tip > 0 ? `\nTip: ${editSym}${tip.toFixed(2)}` : "";
  notifyUserFromTemplate(order.telegramUsername, "status", "customer_order_edited",
    {
      code: order.code,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      order_total: editSym + grandTotal.toFixed(2),
      delivery: escapeHtml(deliveryMethodRecord.name),
    },
  ).catch(() => {});
  sendAdminFromTemplate("admin_order_edited",
    {
      code: order.code,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      items: editAdminItemLines,
      delivery: escapeHtml(deliveryMethodRecord.name),
      delivery_fee: editSym + deliveryPrice.toFixed(2),
      tip: editAdminTipLine,
      order_total: editSym + grandTotal.toFixed(2),
    },
  ).catch(() => {});

  res.json(formatted);
});

// ── POST /api/orders/:orderId/shipping-address ───────────────
// Requires orderId + telegramUsername + PIN for auth
router.post("/orders/:orderId/shipping-address", async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const { telegramUsername, pin, shippingName, shippingAddress, shippingCity, shippingPostcode, shippingCountry } = req.body;

  if (!shippingName?.trim() || !shippingAddress?.trim()) {
    res.status(400).json({ error: "Name and address are required" });
    return;
  }
  if (shippingName.trim().length > MAX_SHIPPING_NAME_LENGTH) {
    res.status(400).json({ error: "Name is too long" });
    return;
  }
  if (shippingAddress.trim().length > MAX_SHIPPING_ADDRESS_LENGTH) {
    res.status(400).json({ error: "Address is too long" });
    return;
  }

  if (!telegramUsername || !pin) {
    res.status(400).json({ error: "Username and PIN are required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const tg = normalizeTg(String(telegramUsername));
  const storedPin = order.pin ?? "____";
  if (!safeEqual(order.telegramUsername.toLowerCase(), tg) || !safeEqual(storedPin, String(pin).trim())) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (await isCustomerActionLockedByGb(order.groupBuyId, "address")) {
    res.status(403).json({
      error: `This group buy is closed — shipping address can no longer be edited.`,
      lockedByGb: true,
    });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({
      shippingName: shippingName.trim().slice(0, MAX_SHIPPING_NAME_LENGTH),
      shippingAddress: shippingAddress.trim().slice(0, MAX_SHIPPING_ADDRESS_LENGTH),
      ...(shippingCity ? { shippingCity: String(shippingCity).trim().slice(0, 100) } : {}),
      ...(shippingPostcode ? { shippingPostcode: String(shippingPostcode).trim().slice(0, 20) } : {}),
      ...(shippingCountry ? { shippingCountry: String(shippingCountry).trim().slice(0, 128) } : {}),
    })
    .where(eq(ordersTable.id, orderId))
    .returning({ shippingName: ordersTable.shippingName, shippingAddress: ordersTable.shippingAddress });

  writeLog("order", "info", "shipping_address_updated",
    `Customer set shipping address on order ${order.code} (${order.telegramUsername})`,
    {
      orderId,
      code: order.code,
      telegramUsername: order.telegramUsername,
      before: { shippingName: order.shippingName ?? null, shippingAddress: order.shippingAddress ?? null },
      after: { shippingName: shippingName.trim(), shippingAddress: shippingAddress.trim() },
    },
    req.ip ?? undefined,
  ).catch(() => {});

  res.json({ ok: true, shippingName: updated.shippingName, shippingAddress: updated.shippingAddress });
});

// ── PATCH /api/orders/change-username — customer renames their Telegram username across all orders ──
router.patch("/orders/change-username", async (req, res): Promise<void> => {
  const { telegramUsername, pin, newUsername } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string" ||
      !pin || typeof pin !== "string" ||
      !newUsername || typeof newUsername !== "string") {
    res.status(400).json({ error: "telegramUsername, pin and newUsername are required" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  const newTg = normalizeTg(newUsername);

  if (tg.length > MAX_TG_LENGTH || newTg.length < 2 || newTg.length > MAX_TG_LENGTH) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  if (tg === newTg) {
    res.status(400).json({ error: "New username must be different from your current one" });
    return;
  }

  // Authenticate via any of the user's orders
  const [order] = await db.select().from(ordersTable).where(tgEq(tg)).limit(1);
  if (!order) {
    res.status(404).json({ error: "No orders found for this username" });
    return;
  }
  const storedPin = order.pin ?? "____";
  if (!safeEqual(storedPin, pin.trim())) {
    res.status(401).json({ error: "Incorrect PIN" });
    return;
  }

  // Block if new username already has orders
  const [conflict] = await db.select({ id: ordersTable.id }).from(ordersTable).where(tgEq(newTg)).limit(1);
  if (conflict) {
    res.status(409).json({ error: "That username already has orders attached. Contact support." });
    return;
  }

  // Rename across all orders
  await db.update(ordersTable).set({ telegramUsername: newTg }).where(tgEq(tg));

  writeLog("order", "info", "username_changed",
    `Customer changed username from ${tg} to ${newTg}`,
    { oldUsername: tg, newUsername: newTg },
    req.ip ?? undefined,
  ).catch(() => {});

  res.json({ ok: true, newUsername: newTg });
});

// ── POST /api/orders/my-orders — return ALL orders for a username + PIN ──────
router.post("/orders/my-orders", async (req, res): Promise<void> => {
  const rawUsername: unknown = req.body.telegramUsername;
  const pin: unknown = req.body.pin;

  if (!rawUsername || typeof rawUsername !== "string" || !pin || typeof pin !== "string") {
    res.status(400).json({ error: "Telegram username and PIN are required" });
    return;
  }
  if (!/^\d{4}$/.test(pin.trim())) {
    res.status(401).json({ error: "Invalid username or PIN" });
    return;
  }

  const tg = normalizeTg(rawUsername.trim());
  if (tg.length > MAX_TG_LENGTH) {
    res.status(401).json({ error: "Invalid username or PIN" });
    return;
  }

  const identifier = tg.toLowerCase();
  const now = new Date();

  const [attempt] = await db.select().from(lookupAttemptsTable).where(eq(lookupAttemptsTable.identifier, identifier));
  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    const minutesLeft = Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.` });
    return;
  }

  const allOrders = await db.select().from(ordersTable).where(tgEq(tg)).orderBy(desc(ordersTable.createdAt));
  const pinMatch = allOrders.find(o => safeEqual(o.pin ?? "____", pin.trim()));
  if (!pinMatch) {
    safeEqual("____", pin.trim());
    const newFailedCount = (attempt?.failedAttempts ?? 0) + 1;
    const blockedUntil = newFailedCount >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + BLOCK_DURATION_MS) : null;
    if (attempt) {
      await db.update(lookupAttemptsTable).set({ failedAttempts: newFailedCount, blockedUntil, lastAttemptAt: now }).where(eq(lookupAttemptsTable.id, attempt.id));
    } else {
      await db.insert(lookupAttemptsTable).values({ id: randomUUID(), identifier, failedAttempts: 1, lastAttemptAt: now });
    }
    res.status(401).json({ error: "Invalid username or PIN" });
    return;
  }

  if (attempt && (attempt.failedAttempts ?? 0) > 0) {
    await db.update(lookupAttemptsTable).set({ failedAttempts: 0, blockedUntil: null, lastAttemptAt: now }).where(eq(lookupAttemptsTable.id, attempt.id));
  }

  const orders = await db.select().from(ordersTable).where(tgEq(tg)).orderBy(desc(ordersTable.createdAt));
  const result = await Promise.all(orders.map(async order => {
    const lineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, order.id));
    return formatOrderResponse(order as unknown as Record<string, unknown>, lineItems as unknown as Record<string, unknown>[]);
  }));

  res.json({ orders: result, username: pinMatch.telegramUsername });
});

// ── DELETE /api/orders/:orderId — customer self-deletes a Draft/Submitted order ──
router.delete("/orders/:orderId", async (req, res): Promise<void> => {
  const { orderId } = req.params;
  const { telegramUsername, pin } = req.body;

  if (!telegramUsername || typeof telegramUsername !== "string" ||
      !pin || typeof pin !== "string") {
    res.status(400).json({ error: "telegramUsername and pin are required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const tg = normalizeTg(telegramUsername);
  const storedPin = order.pin ?? "____";
  if (!safeEqual(order.telegramUsername.toLowerCase(), tg) || !safeEqual(storedPin, pin.trim())) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const deletableStatuses: OrderStatus[] = ["Draft", "Submitted"];
  if (!deletableStatuses.includes(order.status as OrderStatus)) {
    res.status(403).json({ error: `Orders with status "${order.status}" cannot be deleted. Contact support if needed.` });
    return;
  }

  if (await isCustomerActionLockedByGb(order.groupBuyId, "delete")) {
    res.status(403).json({
      error: `This group buy is closed — orders can no longer be deleted.`,
      lockedByGb: true,
    });
    return;
  }

  // Capture line items snapshot before soft-deletion
  const deletedLineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));

  await db.update(ordersTable)
    .set({ deletedAt: new Date(), deletedBy: "customer" })
    .where(eq(ordersTable.id, orderId));

  writeLog("order", "warn", "order_deleted_by_customer",
    `Customer deleted order ${order.code} (${order.telegramUsername}, status: ${order.status})`,
    {
      orderId,
      code: order.code,
      telegramUsername: order.telegramUsername,
      status: order.status,
      snapshot: {
        deliveryMethod: order.deliveryMethod,
        grandTotal: order.grandTotal,
        productSubtotal: order.productSubtotal,
        deliveryPrice: order.deliveryPrice,
        notes: order.notes ?? null,
        shippingName: order.shippingName ?? null,
        shippingAddress: order.shippingAddress ?? null,
        lineItems: deletedLineItems.map(li => ({
          productName: li.productName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
        })),
      },
    },
    req.ip ?? undefined,
  ).catch(() => {});

  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.deleted",
    entityId: orderId,
    actorType: "customer",
    metadata: {
      code: order.code,
      grandTotal: order.grandTotal,
      productSubtotal: order.productSubtotal,
      deliveryPrice: order.deliveryPrice,
      deliveryMethod: order.deliveryMethod,
      status: order.status,
      paymentStatus: order.paymentStatus,
      tip: order.tip,
      notes: order.notes ?? null,
      groupBuyId: order.groupBuyId ?? null,
      lineItems: deletedLineItems.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    },
  }).catch(err => console.error("[orders] order.deleted log failed:", err));

  createAlert("order", "medium", "Order Cancelled",
    `Order #${order.code} was cancelled`,
    { linkUrl: `#orders`, relatedEntityId: orderId },
  ).catch(() => {});

  const appUrlForDel = process.env["APP_URL"] ?? "https://saltandpeps.co.uk";

  let delGbName = "";
  let delGbOrganiser = "";
  let delGbCurrency: string | null = null;
  if (order.groupBuyId) {
    const [delGbRow] = await db
      .select({ name: groupBuysTable.name, organiserId: groupBuysTable.organiserId, currency: groupBuysTable.currency })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (delGbRow) {
      delGbName = delGbRow.name;
      delGbOrganiser = delGbRow.organiserId ? `@${delGbRow.organiserId}` : "Admin";
      delGbCurrency = delGbRow.currency ?? null;
    }
  }

  const delSym = delGbCurrency === "GBP" ? "£" : "$";

  const delGbContext = delGbName
    ? `\nGB: <b>${escapeHtml(delGbName)}</b>\nOrganiser: ${escapeHtml(delGbOrganiser)}`
    : "";
  const delPaidLabel = order.paymentStatus === "confirmed" ? "Paid" : "Unpaid";

  notifyUserFromTemplate(order.telegramUsername, "deleted", "customer_order_deleted",
    {
      code: order.code,
      gb_name: delGbContext,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      order_total: delSym + String(order.grandTotal),
      delivery: escapeHtml(order.deliveryMethod ?? ""),
      payment_status: delPaidLabel,
      app_url: appUrlForDel,
    },
  ).catch(() => {});

  sendAdminFromTemplate("admin_order_deleted_by_customer",
    {
      code: order.code,
      gb_name: delGbContext,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      order_total: delSym + String(order.grandTotal),
      delivery: escapeHtml(order.deliveryMethod ?? ""),
      payment_status: delPaidLabel,
    },
  ).catch(() => {});

  res.json({ ok: true });
});

// ── POST /api/orders/my-profile — get customer profile (auth by username+pin) ─
router.post("/orders/my-profile", async (req, res): Promise<void> => {
  const { telegramUsername, pin } = req.body;
  if (!telegramUsername || !pin) { res.status(400).json({ error: "telegramUsername and pin required" }); return; }

  const tg = normalizeTg(String(telegramUsername));
  const [order] = await db.select().from(ordersTable)
    .where(eq(ordersTable.telegramUsername, tg))
    .limit(1);

  if (!order || !safeEqual(order.pin ?? "____", String(pin).trim())) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }

  const [profile] = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, tg));
  res.json({ profile: profile ?? null });
});

// ── PUT /api/orders/my-profile — update own customer profile ──────────────────
router.put("/orders/my-profile", async (req, res): Promise<void> => {
  const { telegramUsername, pin, fullName, email, phone, address } = req.body;
  if (!telegramUsername || !pin) { res.status(400).json({ error: "telegramUsername and pin required" }); return; }

  const tg = normalizeTg(String(telegramUsername));
  const [order] = await db.select().from(ordersTable)
    .where(eq(ordersTable.telegramUsername, tg))
    .limit(1);

  if (!order || !safeEqual(order.pin ?? "____", String(pin).trim())) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }

  const existing = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, tg));
  if (existing.length > 0) {
    await db.update(customersTable).set({
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
    }).where(eq(customersTable.telegramUsername, tg));
  } else {
    await db.insert(customersTable).values({
      telegramUsername: tg,
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
    });
  }

  const [updated] = await db.select().from(customersTable).where(eq(customersTable.telegramUsername, tg));
  res.json({ profile: updated });
});

// POST /api/orders/:id/payment-screenshot — upload proof of payment
router.post("/orders/:id/payment-screenshot", async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { screenshot } = req.body;

  if (!screenshot) {
    res.status(400).json({ error: "screenshot is required" });
    return;
  }
  const s = String(screenshot);
  if (!/^data:image\/(jpeg|jpg|png);base64,/.test(s)) {
    res.status(400).json({ error: "screenshot must be a JPEG or PNG data URL" });
    return;
  }
  const base64Part = s.split(",")[1] ?? "";
  const byteLength = Math.ceil((base64Part.length * 3) / 4);
  if (byteLength > 15 * 1024 * 1024) {
    res.status(400).json({ error: "screenshot must be under 15 MB" });
    return;
  }

  const [order] = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ paymentScreenshot: s })
    .where(eq(ordersTable.id, id));

  writeLog("change", "info", "payment_screenshot_uploaded",
    `Payment screenshot uploaded for order #${order.code}`,
    { orderId: id, telegramUsername: order.telegramUsername },
  ).catch(() => {});

  res.json({ ok: true });
});

// POST /api/orders/:id/confirm-fiat — buyer signals they have paid via Revolut/PayPal
router.post("/orders/:id/confirm-fiat", async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const { method } = req.body;

  if (!method || !["revolut", "paypal"].includes(method)) {
    res.status(400).json({ error: "method must be 'revolut' or 'paypal'" });
    return;
  }

  const [order] = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      groupBuyId: ordersTable.groupBuyId,
      paymentStatus: ordersTable.paymentStatus,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!order.groupBuyId) {
    res.status(400).json({ error: "This order is not part of a group buy" });
    return;
  }

  const [gb] = await db
    .select({
      organiserPayments: groupBuysTable.organiserPayments,
      allowedCountries: groupBuysTable.allowedCountries,
      excludedCountries: groupBuysTable.excludedCountries,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, order.groupBuyId));

  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  // Country restriction check — same logic as crypto/AnonPay endpoints.
  // Orders store "@username"; accounts table uses bare username without "@".
  const allowed = (gb.allowedCountries ?? []) as string[];
  const excluded = (gb.excludedCountries ?? []) as string[];
  if (allowed.length > 0 || excluded.length > 0) {
    const bareUsername = (order.telegramUsername ?? "").replace(/^@/, "");
    const [acct] = await db
      .select({ country: accountsTable.country })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, bareUsername));
    const userCountry = normaliseCountry(acct?.country ?? null);
    if (allowed.length > 0) {
      if (!userCountry || !allowed.includes(userCountry)) {
        res.status(403).json({ error: `Payments for this group buy are only accepted from: ${allowed.join(", ")}` });
        return;
      }
    }
    if (excluded.length > 0 && userCountry && excluded.includes(userCountry)) {
      res.status(403).json({ error: `Payments from your country (${userCountry}) are not accepted for this group buy.` });
      return;
    }
  }

  const op = gb.organiserPayments as Record<string, string> | null;
  const hasRevolut = !!(op?.revolutHandle);
  const hasPaypal = !!(op?.paypalHandle);
  if (method === "revolut" && !hasRevolut) {
    res.status(400).json({ error: "This group buy does not have a Revolut payment option" });
    return;
  }
  if (method === "paypal" && !hasPaypal) {
    res.status(400).json({ error: "This group buy does not have a PayPal payment option" });
    return;
  }

  const allowedStatuses = ["unpaid", "test_ready", "test_confirmed"];
  if (!allowedStatuses.includes(order.paymentStatus ?? "unpaid")) {
    res.status(400).json({ error: "Payment cannot be confirmed from current status" });
    return;
  }

  await db
    .update(ordersTable)
    .set({
      paymentStatus: "pending_confirmation",
      paymentTxHash: `fiat:${method}`,
      paymentRejectionReason: null,
    })
    .where(eq(ordersTable.id, id));

  writeLog("change", "info", "fiat_payment_claimed", `Buyer claimed ${method} payment for order #${order.code}`, { orderId: id, method }).catch(() => {});

  logCustomerActivity({
    telegramUsername: order.telegramUsername,
    eventCategory: "order",
    eventType: "order.payment_submitted",
    entityId: id,
    actorType: "customer",
    metadata: { code: order.code, method },
  }).catch(err => console.error("[orders] order.payment_submitted log failed:", err));

  res.json({ ok: true, paymentStatus: "pending_confirmation" });
});

export default router;

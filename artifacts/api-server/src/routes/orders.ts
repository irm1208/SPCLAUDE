import { getOnwardOrderPreference, saveOnwardOrderPreference, validateEuDeliveryCheckout } from "../lib/gb-onward-delivery";
import { resolveGroupOrderRoute } from "../lib/group-buy-delivery-routing-service";
import { OnwardDeliveryError, validOnwardMethod } from "../lib/gb-onward-delivery-rules";
import { assertNoActiveRefund, refundMutableOrderWhere, RefundMutationBlockedError } from "../lib/refund-mutation-guard";
import { assertSupplierOrderEditable } from "../lib/supplier-batch-protection";
import { normalizeToCode as supplierCountryCode } from "../lib/country-utils";
import { groupBuyCreditsAllowed } from "../lib/group-buy-credit-policy";
import { calculateCouponDiscount, CouponError, couponProblem, couponQuoteMatches } from "../lib/group-buy-coupon-policy";
import { assertGroupStock } from "../lib/group-buy-stock";
import { gbHalfKitClaimsTable } from "@workspace/db";
import { cancelUnpaidHalfClaims, prepareNewOrderHalfKit, recordNewOrderHalfKit } from "../lib/half-kit-offers";
import { parseHalfKitCheckout, assertHalfKitCheckoutItems, halfKitSelections } from "../lib/half-kit-new-order-rules";
import { HalfKitError } from "../lib/half-kit-rules";
import { editOrderWithHalfKits } from "../lib/half-kit-order-edit";
import { resolveSharedOrderPaymentMethods } from "../lib/shared-order-payment-routing";
import { shippingOptionMatchesCountry, resolveCustomPostage, type CustomPostageOption } from "../lib/group-buy-shipping-options";
import { activeSharedOrderMembershipWhere } from "../lib/shared-order-active-membership";
import { claimCoupon, couponAccountUses, recordCouponRedemption } from "../lib/coupon-redemption";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import {
  ordersTable,
  wholesaleSharesTable,
  orderLineItemsTable,
  lookupAttemptsTable,
  deliveryMethodsTable,
  customersTable,
  accountGroupBuysTable,
  accountsTable,
  productsTable,
  groupBuysTable,
  groupBuyProductsTable,
  gbTestingRoundsTable,
  gbReshippersTable,
  gbCountryLegsTable,
  ruleAcceptancesTable,
  siteConfigTable,
  couponCodesTable,
  creditTransactionsTable,
  EDITABLE_STATUSES,
  type OrderStatus,
} from "@workspace/db";
import { eq, and, or, ne, sql, desc, count, inArray, notInArray, isNull, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { writeLog } from "../lib/audit-log";
import { createAlert } from "../lib/create-alert";
import { resolveNewOrderVendorShippingIsTbd } from "../lib/vendor-shipping-tbd";
import { notifyUserFromTemplate, sendAdminFromTemplate } from "../lib/telegram";
import { requireAccount } from "../middleware/account-auth";
import { logCustomerActivity } from "../lib/activity-log";
import { getActiveWholesaleVendor } from "./config";
import { calcTotalShipping, pickRegionForCountry, type ShippingVendor } from "../lib/wholesale-shipping";
import { calculateAdditionMerge } from "../lib/order-addition-merge";
import { resolveGroupBuyAdminFee } from "../lib/group-buy-admin-fee";
import { centsToUsdString, subtractMoneyClamped, usdToCents } from "../lib/refund-money";
import { inferGroupBuyContext } from "../lib/group-buy-order-context";

// ── Server-authoritative wholesale shipping ──────────────────────────────────
// Wholesale shipping is priced by kit-count tiers per destination region, so it must
// never be trusted from the client: otherwise a customer could order 5 kits, then edit
// the order to add more kits while keeping the cheaper (or zero) shipping they first sent.
// This recomputes the charge from the active vendor's tier table using the order's
// destination country and total kit count (sum of line-item quantities), exactly like the
// shared-order path. Falls back to the clamped client value only when shipping cannot be
// auto-calculated (no active vendor, country not mapped to a region, or custom/per-kg pricing).
async function resolveWholesaleShipping(
  clientVendorShipping: unknown,
  shippingCountry: unknown,
  lineItems: unknown,
): Promise<number> {
  const clientVal = Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  const country = typeof shippingCountry === "string" ? shippingCountry.trim() : "";
  if (!country) return clientVal;
  const vendor = await getActiveWholesaleVendor();
  if (!vendor) return clientVal;
  const picked = pickRegionForCountry(vendor as unknown as ShippingVendor, country);
  if (!picked) return clientVal;
  const items = Array.isArray(lineItems) ? lineItems : [];
  const kits = items.reduce(
    // Clamp per-item so a crafted negative quantity can't shrink the kit count into a cheaper tier.
    (s: number, li: { quantity?: number | string }) => s + Math.max(0, Number(li?.quantity) || 0),
    0,
  );
  const computed = calcTotalShipping(vendor as unknown as ShippingVendor, picked.region, kits);
  return computed !== null ? computed : clientVal;
}

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
const MAX_LINE_ITEMS = 500;
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_SHIPPING_NAME_LENGTH = 200;
const MAX_SHIPPING_ADDRESS_LENGTH = 1000;
const MAX_SHIPPING_EMAIL_LENGTH = 200;

// ─────────────────────────────────────────────────────────────

function getAccountFromCookie(req: import("express").Request): string | null {
  return req.account?.telegramUsername ?? null;
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
    vendorShippingIsTbd: typeof order.vendorShippingIsTbd === "boolean" ? order.vendorShippingIsTbd : null,
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
    onwardDeliveryMethod: order.onwardDeliveryMethod ?? null,
    additionOfOrderId: (order.additionOfOrderId as string | null) ?? null,
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

const LEGACY_ORDER_ACCESS_DISABLED = true;
router.use((req, res, next): void => {
  if (!LEGACY_ORDER_ACCESS_DISABLED) {
    next();
    return;
  }

  const key = `${req.method} ${req.path}`;
  const exactRoutes = new Set([
    "POST /orders/claim-pin",
    "POST /orders/lookup",
    "PATCH /orders/change-username",
    "POST /orders/my-orders",
    "POST /orders/my-profile",
    "PUT /orders/my-profile",
  ]);
  const legacyOrderAction =
    /^\/orders\/[^/]+\/(?:pin|inpost-qr|royal-mail-qr|qr-upload|shipping-address|payment-screenshot|confirm-fiat)$/.test(req.path);
  const legacyOrderMutation =
    /^\/orders\/[^/]+$/.test(req.path) && (req.method === "PUT" || req.method === "DELETE");
  const signedInOrderUpdate =
    req.method === "PUT"
    && legacyOrderMutation
    && Boolean(req.cookies?.account_session);
  // These routes require a validated account session and ownership below.
  // A cookie only permits reaching that validation; it is not authorization.
  const signedInPaymentAction =
    req.method === "POST"
    && /^\/orders\/[^/]+\/(?:payment-screenshot|confirm-fiat)$/.test(req.path)
    && Boolean(req.cookies?.account_session);

  if (exactRoutes.has(key) || (legacyOrderAction && !signedInPaymentAction) || (legacyOrderMutation && !signedInOrderUpdate)) {
    const forwardedFor = Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"].join(",")
      : req.headers["x-forwarded-for"] ?? null;
    const userAgent = req.headers["user-agent"] ?? null;
    const requestFingerprint = createHash("sha256")
      .update([
        forwardedFor,
        req.headers["cf-connecting-ip"],
        req.headers["x-real-ip"],
        userAgent,
        req.headers["accept-language"],
        req.headers["sec-ch-ua"],
      ].map(value => String(value ?? "")).join("|"))
      .digest("hex");
    writeLog(
      "login",
      "warn",
      "legacy_order_access_blocked",
      "Blocked request to disabled legacy order credential route",
      {
        method: req.method,
        path: req.path,
        requestId: (req as Request & { correlationId?: string }).correlationId ?? null,
        forwardedFor,
        connectingIp: req.headers["cf-connecting-ip"] ?? null,
        realIp: req.headers["x-real-ip"] ?? null,
        userAgent,
        acceptLanguage: req.headers["accept-language"] ?? null,
        requestFingerprint,
      },
      req.ip,
    ).catch(() => {});
    res.status(410).json({
      error: "Legacy PIN-based order access is temporarily disabled. Please sign in to your account.",
    });
    return;
  }
  next();
});

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
    await db.update(ordersTable).set({ pin: String(newPin) }).where(refundMutableOrderWhere(eq(ordersTable.id, o.id)));
  }

  await writeLog("login", "info", "pin_claimed",
    `Account PIN set for ${tg} — ${defaultPinOrders.length} order(s) updated`,
    { telegramUsername: tg, ordersUpdated: defaultPinOrders.length },
    req.ip,
  );

  res.json({ ok: true });
});

// ── POST /api/orders — create a new order ────────────────────
router.post("/orders", async (req, res, next): Promise<void> => {
  // Preserve the existing guest flow, but never downgrade a blocked/invalid
  // signed-in session to a guest or trust a JWT without current account checks.
  if (req.cookies?.account_session) {
    await requireAccount(req, res, next);
    return;
  }
  next();
}, async (req, res): Promise<void> => {
  if (!validOnwardMethod(req.body?.onwardDeliveryMethod)) {
    res.status(400).json({ error: "Choose pickup point or home delivery." }); return;
  }
  let halfKitCheckout: ReturnType<typeof parseHalfKitCheckout> = null;
  try {
    halfKitCheckout = parseHalfKitCheckout(req.body?.halfKitCheckout);
    if (halfKitCheckout) assertHalfKitCheckoutItems(halfKitCheckout, req.body.lineItems, req.body);
  } catch (error) {
    res.status(error instanceof HalfKitError ? error.status : 400).json({ error: (error as Error).message });
    return;
  }
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
    couponDiscountQuoted,
    creditsApplied: clientCreditsApplied,
    directShippingRequested: clientDirectShippingRequested,
    directShippingCost: clientDirectShippingCost,
    reshipperCode: clientReshipperCode,
    additionOfOrderId: clientAdditionOfOrderId,
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

  // Guest/PIN submissions must not bypass an account suspension by omitting
  // the session cookie. Accounts are authoritative; customer-only records
  // retain the same protection for historical guest identities.
  const [orderingAccount] = await db.select({ accountStatus: accountsTable.accountStatus })
    .from(accountsTable).where(sql`lower(ltrim(${accountsTable.telegramUsername}, '@')) = ${tg.replace(/^@/, "").toLowerCase()}`).limit(1);
  const [legacyCustomer] = orderingAccount ? [] : await db.select({ accountStatus: customersTable.accountStatus })
    .from(customersTable).where(sql`lower(ltrim(${customersTable.telegramUsername}, '@')) = ${tg.replace(/^@/, "").toLowerCase()}`).limit(1);
  const orderingStatus = orderingAccount?.accountStatus ?? legacyCustomer?.accountStatus;
  if ((orderingAccount && orderingStatus !== "active") || orderingStatus === "suspended" || orderingStatus === "banned") {
    res.status(403).json({ error: "Account is not active" });
    return;
  }

  if (notes !== undefined && notes !== null && String(notes).length > MAX_NOTES_LENGTH) {
    res.status(400).json({ error: `Notes must be under ${MAX_NOTES_LENGTH} characters` });
    return;
  }

  // Resolve normalizedGroupBuyId early so we can fall back to GB shipping options below
  let normalizedGroupBuyId = clientGroupBuyId && typeof clientGroupBuyId === "string"
    ? clientGroupBuyId.trim().slice(0, 64)
    : null;
  // A signed-in customer may have lost the GB ID from browser state. Infer it
  // only when exactly one member GB is accepting orders and contains every
  // submitted product. The normal GB validation below remains authoritative.
  const contextUsername = getAccountFromCookie(req);
  const submittedProductIds = Array.isArray(clientLineItems)
    ? clientLineItems.map((item: { productId?: unknown }) => item?.productId)
    : [];
  if (
    !normalizedGroupBuyId &&
    !isWholesaleOrder &&
    !clientAdditionOfOrderId &&
    !halfKitCheckout &&
    contextUsername &&
    normalizeTg(contextUsername) === tg &&
    submittedProductIds.length > 0 &&
    submittedProductIds.every((id): id is string => typeof id === "string" && id.length > 0) &&
    new Set(submittedProductIds).size === submittedProductIds.length
  ) {
    const memberships = await db
      .select({
        groupBuyId: accountGroupBuysTable.groupBuyId,
        allowExtraOrder: accountGroupBuysTable.allowExtraOrder,
      })
      .from(accountGroupBuysTable)
      .where(eq(accountGroupBuysTable.accountId, contextUsername.toLowerCase()));

    if (memberships.length > 0) {
      const memberGroupBuyIds = [...new Set(memberships.map(row => row.groupBuyId))];
      const [memberGroups, eligibleProducts] = await Promise.all([
        db
          .select({
            id: groupBuysTable.id,
            name: groupBuysTable.name,
            status: groupBuysTable.status,
            allowExtraOrders: groupBuysTable.allowExtraOrders,
          })
          .from(groupBuysTable)
          .where(inArray(groupBuysTable.id, memberGroupBuyIds)),
        db
          .select({
            groupBuyId: groupBuyProductsTable.groupBuyId,
            productId: groupBuyProductsTable.productId,
          })
          .from(groupBuyProductsTable)
          .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
          .where(and(
            inArray(groupBuyProductsTable.groupBuyId, memberGroupBuyIds),
            inArray(groupBuyProductsTable.productId, submittedProductIds),
            eq(groupBuyProductsTable.active, true),
            eq(productsTable.active, true),
          )),
      ]);

      const resolution = inferGroupBuyContext({
        authenticatedUsername: contextUsername,
        submittedUsername: tg,
        isWholesaleOrder,
        productIds: submittedProductIds,
        memberships,
        groupBuys: memberGroups,
        eligibleProducts,
      });
      if (resolution.kind === "ambiguous") {
        res.status(409).json({
          error: "Choose which group buy this order belongs to before continuing.",
          code: "GROUP_BUY_SELECTION_REQUIRED",
          eligibleGroupBuys: resolution.eligibleGroupBuys,
        });
        return;
      }
      if (resolution.kind === "unique") normalizedGroupBuyId = resolution.groupBuyId;
    }
  }
  let newHalfGroup: any = null;
  if (halfKitCheckout) {
    const session = getAccountFromCookie(req);
    if (!session || normalizeTg(session) !== tg || !normalizedGroupBuyId) {
      res.status(403).json({ error: "Sign in to your own account to order a half kit." }); return;
    }
    const [replay] = await db.select().from(gbHalfKitClaimsTable).where(eq(gbHalfKitClaimsTable.requestId, halfKitCheckout.requestId));
    if (replay) {
      const [owned] = await db.select().from(ordersTable).where(eq(ordersTable.id, replay.orderId));
      if (!owned || normalizeTg(owned.telegramUsername) !== tg || owned.groupBuyId !== normalizedGroupBuyId
        || replay.offerId !== halfKitCheckout.offerId || replay.state !== "active") {
        res.status(409).json({ error: "This purchase request was already used." }); return;
      }
      const previousClaims = await db.select().from(gbHalfKitClaimsTable).where(eq(gbHalfKitClaimsTable.orderId, owned.id));
      if (!halfKitSelections(halfKitCheckout).every(selection => previousClaims.some(claim =>
        claim.requestId === selection.requestId && claim.offerId === selection.offerId && claim.state === "active"))) {
        res.status(409).json({ error: "This purchase was already submitted with a different selection. Open My Orders." }); return;
      }
      const lines = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, owned.id));
      res.status(201).json(formatOrderResponse({ ...owned, onwardDeliveryMethod: owned.groupBuyId ? await getOnwardOrderPreference(owned.id) : null }, lines as unknown as Record<string, unknown>[])); return;
    }
    try {
      for (const selection of halfKitSelections(halfKitCheckout)) {
        newHalfGroup = (await prepareNewOrderHalfKit(db, normalizedGroupBuyId, session, selection)).group;
      }
    } catch (error) {
      if (!(error instanceof HalfKitError)) throw error;
      res.status(error.status).json({ error: error.message, code: error.code }); return;
    }
  }

  if (normalizedGroupBuyId && !isWholesaleOrder) {
    try { await validateEuDeliveryCheckout(normalizedGroupBuyId, { username: tg }, req.body); }
    catch (error) {
      res.status(error instanceof OnwardDeliveryError ? error.status : 400).json({ error: (error as Error).message }); return;
    }
  }
  // ── Addition (top-up) order validation ────────────────────────────────────
  // A non-null additionOfOrderId marks this as a free-shipping "addition" of a
  // parent order: it rides along with the parent's shipment, so every shipping
  // charge is forced to 0 and the shipping address is copied (locked) from the
  // parent. Validate the parent belongs to the same customer and group buy.
  // Wholesale orders can never be additions — ignore a stale draft field silently.
  let additionParent: typeof ordersTable.$inferSelect | null = null;
  if (!isWholesaleOrder && clientAdditionOfOrderId != null && clientAdditionOfOrderId !== "") {
    const sessionUsername = getAccountFromCookie(req);
    if (!sessionUsername) {
      res.status(401).json({ error: "Authentication required to add items to an existing order" });
      return;
    }
    if (!safeEqual(sessionUsername.replace(/^@/, "").toLowerCase(), tg.replace(/^@/, "").toLowerCase())) {
      res.status(403).json({ error: "You can only add items to your own order" });
      return;
    }
    const parentId = String(clientAdditionOfOrderId).slice(0, 64);
    const [parent] = await db.select().from(ordersTable).where(eq(ordersTable.id, parentId));
    if (!parent || parent.deletedAt || !safeEqual(parent.telegramUsername.toLowerCase(), tg)) {
      res.status(400).json({ error: "Invalid original order for this addition" });
      return;
    }
    if (parent.status === "Cancelled") {
      res.status(400).json({ error: "Cannot add items to a cancelled order" });
      return;
    }
    if (parent.paymentStatus !== "confirmed") {
      res.status(400).json({ error: "Additions are only allowed on a paid order" });
      return;
    }
    if (parent.additionOfOrderId) {
      res.status(400).json({ error: "Cannot create an addition of an addition order" });
      return;
    }
    if (parent.orderType === "wholesale") {
      res.status(400).json({ error: "Wholesale orders do not support additions" });
      return;
    }
    // The validated parent is the authority for an addition's group-buy context.
    // Do not reject a valid add-on because persisted browser draft state supplied a
    // stale or missing groupBuyId. All downstream membership, product, limit, fee,
    // and routing checks now run against the parent's group buy instead.
    normalizedGroupBuyId = parent.groupBuyId ?? null;
    additionParent = parent;
  }

  let deliveryMethodRecord: { id: string; name: string; price: string } | null | undefined;

  // Additions inherit the parent's delivery method label but never its price (always free).
  if (additionParent) {
    deliveryMethodRecord = {
      id: additionParent.deliveryMethodId || "",
      name: additionParent.deliveryMethod,
      price: "0",
    };
  } else if (isWholesaleOrder) {
    // Wholesale orders don't use a standard delivery method — vendor shipping is used instead
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
  if (normalizedGroupBuyId && !additionParent && String(deliveryMethodId) !== "__direct_shipping") {
    const [gbRow] = await db
      .select({ shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, normalizedGroupBuyId));
    if (gbRow?.shippingOptions) {
      try {
        const opts = JSON.parse(gbRow.shippingOptions) as CustomPostageOption[];
        if (opts.some(o => shippingOptionMatchesCountry(o, req.body?.shippingCountry))) {
          deliveryMethodRecord = resolveCustomPostage(opts, String(deliveryMethodId), { ...req.body, lineItems: clientLineItems }) ?? undefined;
        }
      } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid postage options" }); return; }
    }
  }

  if (!deliveryMethodRecord) {
    res.status(400).json({ error: "Invalid delivery method" });
    return;
  }

  const deliveryPrice = parseFloat(deliveryMethodRecord.price);
  let vendorShipping = Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  if (additionParent) {
    vendorShipping = 0; // additions ride along free — no vendor shipping
  } else if (halfKitCheckout) {
    vendorShipping = newHalfGroup.vendorShippingEnabled && newHalfGroup.vendorShippingAmount != null
      ? Math.max(0, Number(newHalfGroup.vendorShippingAmount)) : 0;
  } else if (isWholesaleOrder) {
    // Never trust the client's wholesale shipping — recompute it server-side.
    vendorShipping = await resolveWholesaleShipping(clientVendorShipping, clientShippingCountry, clientLineItems);
  }
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
  let gbAdminFeeEnabled = false;
  let gbAdminFeeType = "fixed";
  let gbAdminFeeRaw: number | null = null;
  let gbAdminFeeCountries: unknown = null;
  let gbKitFees = 0;
  let vendorShippingIsTbdForOrder = false;
  let memberDeliveryCountry: string | null = null;

  // Validate group buy membership if a groupBuyId is provided
  if (normalizedGroupBuyId) {
    // GB orders require an authenticated account session — validate identity from cookie, not request body
    const sessionUsername = getAccountFromCookie(req);
    if (!sessionUsername) {
      res.status(401).json({ error: "Authentication required to place group buy orders" });
      return;
    }

    const [membership] = await db
      .select({
        id: accountGroupBuysTable.id,
        allowExtraOrder: accountGroupBuysTable.allowExtraOrder,
        countryLegId: accountGroupBuysTable.countryLegId,
      })
      .from(accountGroupBuysTable)
      .where(and(
        eq(accountGroupBuysTable.accountId, sessionUsername.toLowerCase()),
        eq(accountGroupBuysTable.groupBuyId, normalizedGroupBuyId),
      ));

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group buy" });
      return;
    }

    if (membership.countryLegId) {
      const [memberLeg] = await db
        .select({
          countryCode: gbCountryLegsTable.countryCode,
          countryName: gbCountryLegsTable.countryName,
        })
        .from(gbCountryLegsTable)
        .where(eq(gbCountryLegsTable.id, membership.countryLegId));
      memberDeliveryCountry = memberLeg?.countryName ?? memberLeg?.countryCode ?? null;
    }
    if (!memberDeliveryCountry) {
      const [memberAccount] = await db
        .select({ country: accountsTable.country })
        .from(accountsTable)
        .where(eq(accountsTable.telegramUsername, sessionUsername.toLowerCase()));
      memberDeliveryCountry = memberAccount?.country?.trim() || null;
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
        allowCredits: groupBuysTable.allowCredits,
        adminFeeEnabled: groupBuysTable.adminFeeEnabled,
        adminFeeType: groupBuysTable.adminFeeType,
        adminFeeAmount: groupBuysTable.adminFeeAmount,
        adminFeeLabel: groupBuysTable.adminFeeLabel,
        adminFeeCountries: groupBuysTable.adminFeeCountries,
        vendorShippingAmount: groupBuysTable.vendorShippingAmount,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, normalizedGroupBuyId));

    if (!gb || (gb.status !== "active" && !gb.allowExtraOrders && !membership.allowExtraOrder && !halfKitCheckout)) {
      res.status(403).json({ error: "This group buy is not currently accepting orders" });
      return;
    }
    if (typeof clientCreditsApplied === "number" && clientCreditsApplied > 0 && gb.allowCredits === false) {
      res.status(403).json({ error: "Store credits cannot be used for this group buy", code: "GROUP_BUY_CREDITS_DISABLED" });
      return;
    }
    vendorShippingIsTbdForOrder = resolveNewOrderVendorShippingIsTbd({
      groupBuyId: normalizedGroupBuyId,
      orderType: typeof clientOrderType === "string" ? clientOrderType : null,
      directShippingRequested: clientDirectShippingRequested === true,
      isAddition: Boolean(additionParent),
      configuredAmount: gb.vendorShippingAmount,
      vendorShipping,
    });

    const canonicalProducts = await db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        price: productsTable.price,
        priceOverride: groupBuyProductsTable.priceOverride,
      })
      .from(groupBuyProductsTable)
      .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
      .where(and(
        eq(groupBuyProductsTable.groupBuyId, normalizedGroupBuyId),
        eq(groupBuyProductsTable.active, true),
        eq(productsTable.active, true),
        inArray(groupBuyProductsTable.productId, productIds),
      ));
    const canonicalById = new Map(canonicalProducts.map(product => [product.productId, product]));
    if (canonicalById.size !== productIds.length) {
      res.status(400).json({ error: "One or more products are not available in this group buy" });
      return;
    }
    for (const item of clientLineItems) {
      const canonical = canonicalById.get(item.productId)!;
      item.productName = canonical.productName;
      item.unitPrice = halfKitCheckout ? halfKitSelections(halfKitCheckout).find(selection => selection.productId === item.productId)!.price * 2 : parseFloat(String(canonical.priceOverride ?? canonical.price));
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
          isNull(ordersTable.deletedAt),
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
        .where(and(
          eq(ordersTable.groupBuyId, normalizedGroupBuyId),
          isNull(ordersTable.deletedAt),
        ));
      const existingTotalKits = parseFloat(totalKitsRow?.total ?? "0");
      if (existingTotalKits + newKitCount > gb.maxKitsTotal) {
        const remaining = Math.max(0, gb.maxKitsTotal - existingTotalKits);
        res.status(400).json({
          error: `This group buy has reached its kit limit. Only ${remaining} kit(s) remain available from the total of ${gb.maxKitsTotal}.`,
        });
        return;
      }
    }

    // ── Per-product per-customer limit check ─────────────────────────────────
    if (!gb.allowExtraOrders && !membership.allowExtraOrder) {
      const productLimits = await db
        .select({ productId: groupBuyProductsTable.productId, maxPerCustomer: groupBuyProductsTable.maxPerCustomer })
        .from(groupBuyProductsTable)
        .where(and(
          eq(groupBuyProductsTable.groupBuyId, normalizedGroupBuyId),
          isNotNull(groupBuyProductsTable.maxPerCustomer),
        ));

      for (const limit of productLimits) {
        const newItem = (clientLineItems as Array<{ productId: string; productName?: string; quantity: number }>)
          .find(li => li.productId === limit.productId);
        if (!newItem) continue;

        const newQty = parseFloat(String(newItem.quantity));
        const [existingRow] = await db
          .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
          .from(orderLineItemsTable)
          .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
          .where(and(
            eq(ordersTable.groupBuyId, normalizedGroupBuyId),
            eq(ordersTable.telegramUsername, tg),
            eq(orderLineItemsTable.productId, limit.productId),
            isNull(ordersTable.deletedAt),
          ));

        const existingQty = parseFloat(existingRow?.total ?? "0");
        if (existingQty + newQty > limit.maxPerCustomer!) {
          const remaining = Math.max(0, limit.maxPerCustomer! - existingQty);
          const productName = newItem.productName ?? "this product";
          res.status(400).json({
            error: `Product limit exceeded for "${productName}". Max ${limit.maxPerCustomer} per customer — you have ${existingQty} ordered and ${remaining} remaining.`,
          });
          return;
        }
      }
    }

    // Capture admin fee config while gb is in scope. The concrete fee amount is
    // resolved below, once the product subtotal is known (needed for percentage fees).
    gbAdminFeeEnabled = gb.adminFeeEnabled === true;
    gbAdminFeeType = gb.adminFeeType === "percent" ? "percent" : "fixed";
    gbAdminFeeRaw = gb.adminFeeAmount != null ? parseFloat(String(gb.adminFeeAmount)) : 0;
    gbAdminFeeLabel = gb.adminFeeLabel ?? null;
    gbAdminFeeCountries = gb.adminFeeCountries;

    // ── Kit fees (feePerKit × quantity per product) ───────────────────────────
    if (clientLineItems.length > 0) {
      const productIds = (clientLineItems as Array<{ productId: string }>).map(li => li.productId);
      const kitFeeRows = await db
        .select({ productId: groupBuyProductsTable.productId, feePerKit: groupBuyProductsTable.feePerKit })
        .from(groupBuyProductsTable)
        .where(and(
          eq(groupBuyProductsTable.groupBuyId, normalizedGroupBuyId),
          inArray(groupBuyProductsTable.productId, productIds),
        ));
      const kitFeeMap = new Map(
        kitFeeRows.map(r => [r.productId, r.feePerKit != null ? parseFloat(String(r.feePerKit)) : 0])
      );
      for (const li of clientLineItems as Array<{ productId: string; quantity: number }>) {
        const fee = kitFeeMap.get(li.productId) ?? 0;
        if (fee > 0) gbKitFees += fee * parseFloat(String(li.quantity));
      }
      gbKitFees = Number(gbKitFees.toFixed(2));
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

  // Resolve the admin fee now that the product subtotal is known. Percentage fees
  // are computed against the product subtotal; fixed fees use the configured amount.
  // Direct-to-home orders and additions never carry the admin fee or kit fees.
  if (clientDirectShippingRequested === true || additionParent) {
    gbAdminFee = 0;
    gbAdminFeeLabel = null;
    gbKitFees = 0;
  } else if (normalizedGroupBuyId) {
    const resolvedAdminFee = resolveGroupBuyAdminFee({
      enabled: gbAdminFeeEnabled,
      feeType: gbAdminFeeType,
      baseAmount: gbAdminFeeRaw,
      label: gbAdminFeeLabel,
      countryOverrides: gbAdminFeeCountries,
      shippingCountry: clientShippingCountry,
      fallbackCountry: memberDeliveryCountry,
      productSubtotal,
    });
    gbAdminFee = resolvedAdminFee.amount;
    gbAdminFeeLabel = resolvedAdminFee.label;
  }

  // ── Coupon validation ────────────────────────────────────────────────────────
  let appliedCouponCode: string | null = null;
  let couponDiscount = 0;
  let resolvedCouponId: string | null = null;
  const couponContext = { groupBuyId: normalizedGroupBuyId, productSubtotal, total: baseGrandTotal };

  if (clientCouponCode && typeof clientCouponCode === "string") {
    const normalizedCode = clientCouponCode.trim().toUpperCase();
    const [coupon] = await db
      .select()
      .from(couponCodesTable)
      .where(eq(couponCodesTable.code, normalizedCode));

    if (!coupon) { res.status(400).json({ error: "Invalid coupon code" }); return; }
    const usesByAccount = coupon.maxUsesPerAccount != null ? await couponAccountUses(db, coupon.id, tg) : 0;
    const problem = couponProblem(coupon, { ...couponContext, usesByAccount });
    if (problem) { res.status(400).json({ error: problem }); return; }
    couponDiscount = calculateCouponDiscount(coupon, couponContext);
    if (!couponQuoteMatches(couponDiscountQuoted, couponDiscount)) {
      res.status(409).json({ error: "The coupon calculation changed. Refresh your order and reapply the code before submitting." });
      return;
    }
    appliedCouponCode = normalizedCode;
    resolvedCouponId = coupon.id;
  }

  const grandTotal = Number(Math.max(0, baseGrandTotal + gbAdminFee + gbKitFees - couponDiscount).toFixed(2));

  if (additionParent) {
    const sessionUsername = getAccountFromCookie(req);
    const mergeOutcome = await db.transaction(async (tx) => {
      await assertGroupStock(tx, normalizedGroupBuyId, clientLineItems);
      const couponClaim = resolvedCouponId ? await claimCoupon(tx, resolvedCouponId, tg, couponContext, couponDiscount) : null;
      const creditRequested = Boolean(sessionUsername && typeof clientCreditsApplied === "number" && clientCreditsApplied > 0);
      const [lockedAccount] = creditRequested
        ? await tx.select({ telegramUsername: accountsTable.telegramUsername, credits: accountsTable.credits })
          .from(accountsTable)
          .where(or(
            eq(accountsTable.telegramUsername, normalizeTg(sessionUsername!)),
            eq(accountsTable.telegramUsername, `@${normalizeTg(sessionUsername!)}`),
          ))
          .for("update")
        : [null];
      const [lockedParent] = await tx
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, additionParent.id))
        .for("update");
      if (lockedParent) await assertNoActiveRefund(tx, lockedParent.id);
      if (creditRequested && lockedParent && !await groupBuyCreditsAllowed(lockedParent.groupBuyId, async id => {
        const [group] = await tx.select({ allowCredits: groupBuysTable.allowCredits })
          .from(groupBuysTable).where(eq(groupBuysTable.id, id)).for("share");
        return group?.allowCredits;
      })) {
        return { error: "Store credits cannot be used for this group buy" } as const;
      }

      if (
        !lockedParent
        || lockedParent.deletedAt
        || !safeEqual(lockedParent.telegramUsername.toLowerCase(), tg)
        || lockedParent.paymentStatus !== "confirmed"
        || lockedParent.status === "Cancelled"
        || lockedParent.additionOfOrderId
        || lockedParent.orderType === "wholesale"
        || lockedParent.orderType === "wholesale_shared"
        || ["verifying", "pending_confirmation"].includes(lockedParent.balancePaymentStatus ?? "")
      ) {
        return { error: "The original paid order changed. Please refresh and try again." } as const;
      }

      if ((lockedParent.groupBuyId ?? null) !== normalizedGroupBuyId) {
        return { error: "The original order is no longer part of this group buy." } as const;
      }

      const existingItems = await tx
        .select()
        .from(orderLineItemsTable)
        .where(eq(orderLineItemsTable.orderId, lockedParent.id));

      const mergedItems = [...existingItems];
      const protectedHalfLines = new Set((await tx.select({ lineItemId: gbHalfKitClaimsTable.lineItemId })
        .from(gbHalfKitClaimsTable).where(and(eq(gbHalfKitClaimsTable.orderId, lockedParent.id),
          eq(gbHalfKitClaimsTable.state, "active")))).map(row => row.lineItemId));
      for (const item of clientLineItems as Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
      }>) {
        const quantity = parseFloat(String(item.quantity));
        const unitPrice = parseFloat(String(item.unitPrice));
        const matchingItem = mergedItems.find(existing =>
          existing.productId === item.productId
          && !protectedHalfLines.has(existing.id)
          && Math.abs(parseFloat(String(existing.unitPrice)) - unitPrice) < 0.001
        );

        if (matchingItem) {
          const mergedQuantity = Number((parseFloat(String(matchingItem.quantity)) + quantity).toFixed(2));
          const mergedLineTotal = Number((mergedQuantity * unitPrice).toFixed(2));
          const [updatedItem] = await tx
            .update(orderLineItemsTable)
            .set({
              quantity: mergedQuantity.toFixed(2),
              lineTotal: mergedLineTotal.toFixed(2),
            })
            .where(refundMutableOrderWhere(eq(orderLineItemsTable.id, matchingItem.id), orderLineItemsTable.orderId))
            .returning();
          Object.assign(matchingItem, updatedItem);
        } else {
          const [insertedItem] = await tx
            .insert(orderLineItemsTable)
            .values({
              id: randomUUID(),
              orderId: lockedParent.id,
              productId: item.productId,
              productName: String(item.productName).trim().slice(0, MAX_PRODUCT_NAME_LENGTH),
              quantity: quantity.toFixed(2),
              unitPrice: unitPrice.toFixed(2),
              lineTotal: (quantity * unitPrice).toFixed(2),
            })
            .returning();
          mergedItems.push(insertedItem);
        }
      }

      let appliedCredits = 0;
      let appliedCreditsUsd = "0.00";
      if (
        creditRequested
      ) {
        let requestedCreditsCents: bigint;
        try {
          requestedCreditsCents = usdToCents(String(clientCreditsApplied));
        } catch {
          requestedCreditsCents = 0n;
        }
        if (lockedAccount && requestedCreditsCents > 0n) {
          const availableCreditsCents = usdToCents(String(lockedAccount.credits ?? "0"));
          const remainingTotalCents = usdToCents(grandTotal.toFixed(2));
          const deductedCents = [availableCreditsCents, requestedCreditsCents, remainingTotalCents]
            .reduce((minimum, value) => value < minimum ? value : minimum);
          if (deductedCents > 0n) {
            appliedCreditsUsd = centsToUsdString(deductedCents);
            appliedCredits = Number(appliedCreditsUsd);
            await tx
              .update(accountsTable)
              .set({ credits: centsToUsdString(availableCreditsCents - deductedCents) as unknown as number })
              .where(eq(accountsTable.telegramUsername, lockedAccount.telegramUsername));
            await tx.insert(creditTransactionsTable).values({
              accountUsername: lockedAccount.telegramUsername,
              amount: `-${appliedCreditsUsd}` as unknown as number,
              reason: `Credits applied to order #${lockedParent.code}`,
              orderId: lockedParent.id,
              adminUsername: null,
              createdAt: new Date(),
            });
          }
        }
      }

      const addedAmountDue = Number(subtractMoneyClamped(grandTotal.toFixed(2), appliedCreditsUsd));
      const totals = calculateAdditionMerge({
        parentProductSubtotal: parseFloat(String(lockedParent.productSubtotal ?? "0")),
        parentGrandTotal: parseFloat(String(lockedParent.grandTotal ?? "0")),
        parentAmountDue: parseFloat(String(lockedParent.amountDue ?? "0")),
        parentTip: parseFloat(String(lockedParent.tip ?? "0")),
        parentTestingContribution: parseFloat(String(lockedParent.testingContribution ?? "0")),
        addedProductSubtotal: productSubtotal,
        addedTotal: grandTotal,
        addedAmountDue,
        addedTip: tip,
        addedTestingContribution: normalizedContribution,
      });

      if (lockedParent.paymentStatus === "confirmed" && Number(lockedParent.amountDue ?? 0) === 0) {
        await tx.update(gbHalfKitClaimsTable).set({ paidAt: new Date() }).where(and(
          eq(gbHalfKitClaimsTable.orderId, lockedParent.id), eq(gbHalfKitClaimsTable.state, "active"),
          isNull(gbHalfKitClaimsTable.paidAt),
        ));
      }
      const [updatedParent] = await tx
        .update(ordersTable)
        .set({
          productSubtotal: totals.productSubtotal.toFixed(2),
          grandTotal: totals.grandTotal.toFixed(2),
          amountDue: totals.amountDue.toFixed(2),
          balanceCryptoQuote: null,
          tip: totals.tip.toFixed(2),
          testingContribution: totals.testingContribution.toFixed(2),
          couponCode: lockedParent.couponCode ?? appliedCouponCode,
          couponDiscount: (
            parseFloat(String(lockedParent.couponDiscount ?? "0")) + couponDiscount
          ).toFixed(2),
          creditsApplied: centsToUsdString(
            usdToCents(String(lockedParent.creditsApplied ?? "0")) + usdToCents(appliedCreditsUsd),
          ) as unknown as number,
          balancePaymentStatus: totals.amountDue > 0 ? "unpaid" : null,
          balanceTxHash: null,
          balanceScreenshot: null,
          balanceConfirmedAt: null,
          ...(lockedParent.balancePaymentStatus === "confirmed" && lockedParent.balanceTxHash ? {
            paymentTxHashes: [...new Set([...(lockedParent.paymentTxHashes ?? []), lockedParent.balanceTxHash])],
          } : {}),
        })
        .where(refundMutableOrderWhere(eq(ordersTable.id, lockedParent.id)))
        .returning();
      if (!updatedParent) throw new RefundMutationBlockedError(lockedParent.id);

      if (couponClaim) await recordCouponRedemption(tx, couponClaim, lockedParent.id, tg, couponDiscount);

      return {
        updatedParent,
        mergedItems,
        addedAmountDue,
        appliedCredits,
      } as const;
    }).catch(error => {
      if (error instanceof CouponError) return { error: error.message } as const;
      throw error;
    });

    if ("error" in mergeOutcome) {
      res.status(409).json({ error: mergeOutcome.error });
      return;
    }

    const formatted = formatOrderResponse(
      { ...mergeOutcome.updatedParent, onwardDeliveryMethod: mergeOutcome.updatedParent.groupBuyId ? await getOnwardOrderPreference(mergeOutcome.updatedParent.id) : null },
      mergeOutcome.mergedItems as unknown as Record<string, unknown>[],
    );
    const response = {
      ...formatted,
      amountDue: parseFloat(String(mergeOutcome.updatedParent.amountDue ?? "0")),
      balancePaymentStatus: mergeOutcome.updatedParent.balancePaymentStatus ?? null,
      mergedIntoExistingOrder: true,
    };

    pushToGoogleSheets(formatted).catch(() => {});
    writeLog(
      "order",
      "info",
      "order_addition_merged",
      `Items added to paid order ${mergeOutcome.updatedParent.code} (${tg}); balance due ${mergeOutcome.addedAmountDue.toFixed(2)}`,
      {
        orderId: mergeOutcome.updatedParent.id,
        code: mergeOutcome.updatedParent.code,
        telegramUsername: tg,
        addedAmount: mergeOutcome.addedAmountDue.toFixed(2),
      },
      req.ip ?? undefined,
    ).catch(() => {});
    logCustomerActivity({
      telegramUsername: tg,
      eventCategory: "order",
      eventType: "order.addition_merged",
      entityId: mergeOutcome.updatedParent.id,
      actorType: "customer",
      metadata: {
        code: mergeOutcome.updatedParent.code,
        addedAmount: mergeOutcome.addedAmountDue.toFixed(2),
        groupBuyId: normalizedGroupBuyId,
      },
    }).catch(err => console.error("[orders] order.addition_merged log failed:", err));
    createAlert(
      "order",
      "high",
      "Items Added to Order",
      `Order #${mergeOutcome.updatedParent.code} updated by ${tg} — balance ${mergeOutcome.addedAmountDue.toFixed(2)}`,
      {
        linkUrl: `#orders:${mergeOutcome.updatedParent.id}`,
        relatedEntityId: mergeOutcome.updatedParent.id,
      },
    ).catch(() => {});

    res.json(response);
    return;
  }

  const orderId = randomUUID();
  const code = await generateCode();

  // Validate PIN if provided; default to "0000" otherwise
  const pin = clientPin && /^\d{4}$/.test(String(clientPin)) ? String(clientPin) : "0000";

  // Auto-assign reshipper: look up gb_reshippers for this GB + country
  const effectiveShippingCountry = (
    clientShippingCountry && typeof clientShippingCountry === "string"
      ? clientShippingCountry
      : memberDeliveryCountry
  );
  const normalizedShippingCountry = effectiveShippingCountry
    ? effectiveShippingCountry.trim().slice(0, 100)
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

  }

  let deliveryRoute: Awaited<ReturnType<typeof resolveGroupOrderRoute>> | null = null;
  if (normalizedGroupBuyId) {
    try {
      deliveryRoute = await resolveGroupOrderRoute({
        gbId: normalizedGroupBuyId, methodId: String(deliveryMethodRecord.id),
        direct: clientDirectShippingRequested === true,
        country: normalizedShippingCountry, username: tg,
        preferred: typeof clientPreferredReshipper === "string" ? clientPreferredReshipper : null,
        items: clientLineItems,
      });
      autoReshipperUsername = deliveryRoute.reshipperUsername;
    } catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
  }

  // ── Reshipper invite code — if provided, validate and assign specific reshipper ──
  let codeRoutingType: string | null = null;
  if (normalizedGroupBuyId && clientReshipperCode && typeof clientReshipperCode === "string") {
    if (deliveryRoute?.routingType === "direct") { res.status(400).json({ error: "A reshipper code cannot be used with Direct Shipping." }); return; }
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

    if (deliveryRoute?.fixedReshipper && deliveryRoute.reshipperUsername !== codeReshipper.reshipperUsername) {
      res.status(400).json({ error: "This postage option is assigned to another reshipper." }); return;
    }
    autoReshipperUsername = codeReshipper.reshipperUsername;
    codeRoutingType = "reshipper";
  }

  const creation = await db.transaction(async tx => {
  if (halfKitCheckout) {
    const selections = halfKitSelections(halfKitCheckout).sort((a, b) => a.offerId.localeCompare(b.offerId));
    for (const selection of selections) {
      newHalfGroup = (await prepareNewOrderHalfKit(tx, normalizedGroupBuyId!, tg, selection, true, selections.length)).group;
      const [replay] = await tx.select().from(gbHalfKitClaimsTable).where(eq(gbHalfKitClaimsTable.requestId, selection.requestId));
      if (replay) throw new HalfKitError("This purchase was already submitted. Refresh My Orders.");
    }
  }
  await assertGroupStock(tx, normalizedGroupBuyId, clientLineItems);
  const couponClaim = resolvedCouponId ? await claimCoupon(tx, resolvedCouponId, tg, couponContext, couponDiscount) : null;
  const [order] = await tx
    .insert(ordersTable)
    .values({
      id: orderId,
      code,
      telegramUsername: tg,
      deliveryMethod: deliveryMethodRecord.name,
      deliveryMethodId: deliveryMethodRecord.id,
      deliveryPrice: deliveryPrice.toFixed(2),
      vendorShipping: vendorShipping.toFixed(2),
      vendorShippingIsTbd: vendorShippingIsTbdForOrder,
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
      routingType: codeRoutingType ?? deliveryRoute?.routingType ?? null,
      orderType: clientOrderType === "wholesale" ? "wholesale" : null,
      shippingName: clientShippingName ? String(clientShippingName).trim().slice(0, 120) || null : null,
      shippingPhone: clientShippingPhone ? String(clientShippingPhone).trim().slice(0, 40) || null : null,
      shippingEmail: clientShippingEmail ? String(clientShippingEmail).trim().slice(0, MAX_SHIPPING_EMAIL_LENGTH) || null : null,
      shippingAddress: clientShippingAddress ? String(clientShippingAddress).trim().slice(0, 1024) || null : null,
      ipAddress: (() => { const xff = req.headers["x-forwarded-for"]; const raw = Array.isArray(xff) ? xff[0] : xff; return raw?.split(",")[0]?.trim() || req.ip || null; })(),
      couponCode: appliedCouponCode,
      couponDiscount: couponDiscount.toFixed(2),
      adminFee: clientDirectShippingRequested === true ? "0.00" : gbAdminFee.toFixed(2),
      adminFeeLabel: clientDirectShippingRequested === true ? null : gbAdminFeeLabel,
      kitFees: gbKitFees.toFixed(2),
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

  const insertedLineItems = await tx
    .insert(orderLineItemsTable)
    .values(lineItemsToInsert)
    .returning();

  let halfCredits = 0;
  if (halfKitCheckout) {
    // The new order, credit spend and one-time offer allocation commit together.
    if (typeof clientCreditsApplied === "number" && clientCreditsApplied > 0) {
      const session = getAccountFromCookie(req)!;
      const [account] = await tx.select().from(accountsTable)
        .where(eq(accountsTable.telegramUsername, session.toLowerCase())).for("update");
      if (!account) throw new HalfKitError("Account not found.", 403);
      if (newHalfGroup.allowCredits !== true) throw new HalfKitError("Credits are disabled for this group buy.", 403);
      const available = usdToCents(String(account.credits ?? 0));
      const requested = usdToCents(String(clientCreditsApplied));
      const total = usdToCents(grandTotal.toFixed(2));
      const used = [available, requested, total].reduce((a, b) => a < b ? a : b);
      if (used > 0n) {
        halfCredits = Number(centsToUsdString(used));
        await tx.update(accountsTable).set({ credits: centsToUsdString(available - used) as unknown as number })
          .where(eq(accountsTable.telegramUsername, account.telegramUsername));
        await tx.update(ordersTable).set({ creditsApplied: halfCredits }).where(eq(ordersTable.id, orderId));
        await tx.insert(creditTransactionsTable).values({
          accountUsername: account.telegramUsername, amount: -halfCredits, orderId,
          reason: `Credits applied to half-kit order #${code}`, operationKey: `half-kit-new-order:${halfKitCheckout.requestId}`,
        });
      }
    }
    let remainingCredits = halfCredits;
    for (const selection of halfKitSelections(halfKitCheckout)) {
      const line = insertedLineItems.find(item => item.productId === selection.productId)!;
      await recordNewOrderHalfKit(tx, selection, newHalfGroup, order, line, remainingCredits);
      remainingCredits = Math.max(0, Math.round((remainingCredits - selection.price) * 100) / 100);
    }
  }
  // Record coupon redemption if one was applied
  if (couponClaim) await recordCouponRedemption(tx, couponClaim, orderId, tg, couponDiscount);
  if (normalizedGroupBuyId) await saveOnwardOrderPreference(tx, orderId, req.body.onwardDeliveryMethod);
  return { order, insertedLineItems, lineItemsToInsert, halfCredits };
  }).catch(error => {
    if (error instanceof CouponError || error instanceof HalfKitError || error instanceof OnwardDeliveryError) return { error: error.message, status: error instanceof HalfKitError || error instanceof OnwardDeliveryError ? error.status : 400, code: error instanceof HalfKitError ? error.code : undefined } as const;
    throw error;
  });
  if ("error" in creation) { res.status(creation.status ?? 400).json({ error: creation.error, code: creation.code }); return; }
  const { order, insertedLineItems, lineItemsToInsert } = creation;

  // ── Apply store credits atomically during order creation ──────────────
  // If the client sent a creditsApplied amount and the request carries a valid
  // account session, re-verify the balance server-side and stamp it on the order.
  let appliedCredits = creation.halfCredits;
  let appliedCreditsUsd = appliedCredits.toFixed(2);
  let creditPolicyBlocked = false;
  const sessionUsernameForCredits = getAccountFromCookie(req);
  if (!halfKitCheckout && sessionUsernameForCredits && clientCreditsApplied && typeof clientCreditsApplied === "number" && clientCreditsApplied > 0) {
    const requestedCreditsCents = usdToCents(String(clientCreditsApplied));
    await db.transaction(async tx => {
      // Lock account before order to match every other credit-spend path.
      const [acctRow] = await tx
        .select({ credits: accountsTable.credits })
        .from(accountsTable)
        .where(eq(accountsTable.telegramUsername, sessionUsernameForCredits))
        .for("update");
      const [lockedOrder] = await tx
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .for("update");
      if (!acctRow) throw new Error("account_not_found");
      if (!lockedOrder) throw new Error("order_not_found");
      if (requestedCreditsCents <= 0n) return;
      if (!await groupBuyCreditsAllowed(normalizedGroupBuyId, async id => {
        const [group] = await tx.select({ allowCredits: groupBuysTable.allowCredits })
          .from(groupBuysTable).where(eq(groupBuysTable.id, id)).for("share");
        return group?.allowCredits;
      })) {
        creditPolicyBlocked = true;
        return; // Order is saved without credits; no wallet debit or credit transaction is made.
      }

      const availableCreditsCents = usdToCents(String(acctRow.credits ?? "0"));
      const orderTotalCents = usdToCents(grandTotal.toFixed(2));
      const deductedCents = [availableCreditsCents, requestedCreditsCents, orderTotalCents]
        .reduce((minimum, value) => value < minimum ? value : minimum);
      if (deductedCents <= 0n) return;

      appliedCreditsUsd = centsToUsdString(deductedCents);
      appliedCredits = Number(appliedCreditsUsd);
      const newBalance = centsToUsdString(availableCreditsCents - deductedCents);
      await tx.update(accountsTable)
        .set({ credits: newBalance as unknown as number })
        .where(eq(accountsTable.telegramUsername, sessionUsernameForCredits));
      await tx.update(ordersTable)
        .set({ creditsApplied: appliedCreditsUsd as unknown as number })
        .where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));
      await tx.insert(creditTransactionsTable).values({
        accountUsername: sessionUsernameForCredits,
        amount: `-${appliedCreditsUsd}` as unknown as number,
        reason: `Credits applied to order #${code}`,
        orderId,
        adminUsername: null,
        createdAt: new Date(),
      });
    });
  }

  const formatted = formatOrderResponse(
    { ...(order as unknown as Record<string, unknown>), creditsApplied: appliedCredits, onwardDeliveryMethod: order.groupBuyId ? await getOnwardOrderPreference(order.id) : null },
    insertedLineItems as unknown as Record<string, unknown>[],
  );
  if (creditPolicyBlocked) (formatted as Record<string, unknown>).creditPolicyBlocked = true;
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
  res.status(410).json({ error: "Public order lookup is temporarily disabled." });
  return;

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

  let reshipperInfo: { country: string | null; paymentMethods: Record<string, unknown> | null } | null = null;
  if (order.reshipperUsername) {
    const [reshipper] = await db
      .select({
        country: accountsTable.country,
        reshipperPaymentMethods: accountsTable.reshipperPaymentMethods,
      })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, order.reshipperUsername));
    if (reshipper) {
      reshipperInfo = {
        country: reshipper.country ?? null,
        paymentMethods: (reshipper.reshipperPaymentMethods as Record<string, unknown> | null) ?? null,
      };
    }
  }

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
  let gbOrganiser: string | null = null;
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
        organiserId: groupBuysTable.organiserId,
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
    gbOrganiser = gb?.organiserId ?? null;
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

  // Whether the customer's self-delete is locked by the group buy "Delete Order" setting
  const groupBuyDeleteLocked = await isCustomerActionLockedByGb(order.groupBuyId, "delete");

  res.json({
    ...formatOrderResponse({ ...order, onwardDeliveryMethod: order.groupBuyId ? await getOnwardOrderPreference(order.id) : null }, lineItems as unknown as Record<string, unknown>[], gbPaymentsEnabled),
    qrCodes,
    groupBuyQrUploadInpostEnabled: gbQrUploadInpostEnabled,
    groupBuyQrUploadRoyalMailEnabled: gbQrUploadRoyalMailEnabled,
    groupBuyQrUploadMessage: gbQrUploadMessage,
    groupBuyQrUploadCouriers: gbQrUploadCouriers,
    groupBuyDirectShippingPaymentsEnabled: gbDirectShippingPaymentsEnabled,
    groupBuyPaymentBanner: gbPaymentBanner,
    groupBuyAllowOrderAddons: gbAllowOrderAddons,
    groupBuyDeleteLocked,
    groupBuyHidePricesWhenClosed: gbHidePricesWhenClosed,
    groupBuyHideCostBreakdownWhenClosed: gbHideCostBreakdownWhenClosed,
    groupBuyHideGrandTotalWhenClosed: gbHideGrandTotalWhenClosed,
    groupBuyStatus: gbStatus,
    groupBuyOrganiser: gbOrganiser,
    reshipperInfo,
  });
});

// ── PATCH /api/orders/:orderId/pin — customer changes their own PIN ──
router.patch("/orders/:orderId/pin", async (req, res): Promise<void> => {
  const orderId = String(req.params["orderId"]);
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

  await db.update(ordersTable).set({ pin: String(newPin) }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));

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
  const orderId = String(req.params["orderId"]);
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
  await db.update(ordersTable).set({ inpostQrCode: qrCode }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));
  res.json({ ok: true });
});

// ── POST /api/orders/:orderId/royal-mail-qr — customer uploads Royal Mail QR code ──
// Authenticated with telegramUsername + PIN (multipart/form-data)
router.post("/orders/:orderId/royal-mail-qr", qrUploadMiddleware, async (req, res): Promise<void> => {
  const orderId = String(req.params["orderId"]);
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
  await db.update(ordersTable).set({ royalMailQrCode: qrCode }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));
  res.json({ ok: true });
});

// ── POST /api/orders/:orderId/qr-upload — generic courier QR upload (telegram+PIN auth) ──
router.post("/orders/:orderId/qr-upload", qrUploadMiddleware, async (req, res): Promise<void> => {
  const orderId = String(req.params["orderId"]);
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
  await db.update(ordersTable).set({ qrCodes: { ...existing, [courierId]: qrCode } }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));
  res.json({ ok: true });
});

// ── PUT /api/orders/:orderId — update an existing order ──────
router.put("/orders/:orderId", requireAccount, async (req, res): Promise<void> => {
  if (!validOnwardMethod(req.body?.onwardDeliveryMethod)) {
    res.status(400).json({ error: "Choose pickup point or home delivery." }); return;
  }
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
  const accountUsername = req.account!.telegramUsername;
  if (!safeEqual(normalizeTg(accountUsername).toLowerCase(), tg.toLowerCase())) {
    res.status(403).json({ error: "You can only update your own order" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.id, rawId),
      tgEq(tg),
      isNull(ordersTable.deletedAt),
    ));

  // Timing-safe code comparison
  const storedCode = order?.code ?? "0000";
  if (!order || !safeEqual(storedCode, code.trim())) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.groupBuyId && order.orderType !== "wholesale" && order.orderType !== "wholesale_shared") {
    try { await validateEuDeliveryCheckout(order.groupBuyId, { username: tg }, { ...order, ...req.body }, rawId); }
    catch (error) {
      res.status(error instanceof OnwardDeliveryError ? error.status : 400).json({ error: (error as Error).message }); return;
    }
  }
  // Shared wholesale orders are materialised from a locked shared parcel. Their items
  // and per-member shipping split are frozen at lock time and managed at the share
  // level — editing an individual order here would drop the cross-member shipping
  // split (it can't be recomputed from one order's kit count) and desync the parcel
  // from the vendor. Manage shared orders from the shared order page instead.
  if (order.orderType === "wholesale_shared") {
    res.status(403).json({ error: "This order is part of a shared wholesale parcel and can't be edited individually. Manage it from the shared order page." });
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
  if (order.groupBuyId && String(deliveryMethodId) !== "__direct_shipping" && !order.additionOfOrderId) {
    const [gbRow] = await db
      .select({ shippingOptions: groupBuysTable.shippingOptions })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (gbRow?.shippingOptions) {
      try {
        const opts = JSON.parse(gbRow.shippingOptions) as CustomPostageOption[];
        if (opts.some(o => shippingOptionMatchesCountry(o, clientShippingCountry ?? order.shippingCountry))) {
          deliveryMethodRecord = resolveCustomPostage(opts, String(deliveryMethodId), { ...order, ...req.body, lineItems: clientLineItems,
            shippingCountry: clientShippingCountry ?? order.shippingCountry }) ?? undefined;
        }
      } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid postage options" }); return; }
    }
  }

  if (!deliveryMethodRecord) {
    res.status(400).json({ error: "Invalid delivery method" });
    return;
  }

  // Additions (top-ups) permanently ride along with the parent's shipment: ignore any
  // client-sent delivery price / vendor shipping and force every shipping charge to 0.
  const isAddition = !!order.additionOfOrderId;
  const deliveryPrice = isAddition ? 0 : parseFloat(deliveryMethodRecord.price);
  let vendorShipping = isAddition ? 0 : Math.max(0, parseFloat(String(clientVendorShipping)) || 0);
  if (!isAddition && isWholesaleOrder) {
    // Never trust the client's wholesale shipping — recompute it server-side against the new
    // kit count so adding kits on edit can't dodge the higher tier. Fall back to the stored
    // destination country when the edit omits it.
    vendorShipping = await resolveWholesaleShipping(
      clientVendorShipping,
      clientShippingCountry ?? order.shippingCountry,
      clientLineItems,
    );
  }
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

  // ── Per-product and GB-level per-customer limit checks (on edit / top-up) ─
  if (order.groupBuyId) {
    const [editGb] = await db
      .select({ allowExtraOrders: groupBuysTable.allowExtraOrders, maxKitsPerCustomer: groupBuysTable.maxKitsPerCustomer })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));

    const [editMembership] = await db
      .select({ allowExtraOrder: accountGroupBuysTable.allowExtraOrder })
      .from(accountGroupBuysTable)
      .where(and(
        eq(accountGroupBuysTable.groupBuyId, order.groupBuyId),
        eq(accountGroupBuysTable.accountId, tg),
      ));

    if (!editGb?.allowExtraOrders && !editMembership?.allowExtraOrder) {
      // GB-level total-kits-per-customer check (exclude current order being replaced)
      if (editGb?.maxKitsPerCustomer != null) {
        const newKitCount = (clientLineItems as Array<{ quantity: number }>)
          .reduce((sum, li) => sum + parseFloat(String(li.quantity)), 0);

        const [customerKitsRow] = await db
          .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
          .from(orderLineItemsTable)
          .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
          .where(and(
            eq(ordersTable.groupBuyId, order.groupBuyId),
            sql`lower(${ordersTable.telegramUsername}) = ${tg}`,
            ne(ordersTable.id, rawId),
            isNull(ordersTable.deletedAt),
          ));

        const existingCustomerKits = parseFloat(customerKitsRow?.total ?? "0");
        if (existingCustomerKits + newKitCount > editGb.maxKitsPerCustomer) {
          const remaining = Math.max(0, editGb.maxKitsPerCustomer - existingCustomerKits);
          res.status(400).json({
            error: `Kit limit exceeded. You can have at most ${editGb.maxKitsPerCustomer} kit(s) from this group buy. Your other orders total ${existingCustomerKits} and ${remaining} remain available.`,
          });
          return;
        }
      }

      // Per-product per-customer check
      const productLimits = await db
        .select({ productId: groupBuyProductsTable.productId, maxPerCustomer: groupBuyProductsTable.maxPerCustomer })
        .from(groupBuyProductsTable)
        .where(and(
          eq(groupBuyProductsTable.groupBuyId, order.groupBuyId),
          isNotNull(groupBuyProductsTable.maxPerCustomer),
        ));

      for (const limit of productLimits) {
        const newItem = (clientLineItems as Array<{ productId: string; productName?: string; quantity: number }>)
          .find(li => li.productId === limit.productId);

        const newQty = newItem ? parseFloat(String(newItem.quantity)) : 0;

        // Exclude the current order being edited — its quantities are being replaced
        const [existingRow] = await db
          .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
          .from(orderLineItemsTable)
          .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
          .where(and(
            eq(ordersTable.groupBuyId, order.groupBuyId),
            eq(ordersTable.telegramUsername, tg),
            eq(orderLineItemsTable.productId, limit.productId),
            ne(ordersTable.id, rawId),
            isNull(ordersTable.deletedAt),
          ));

        const existingQty = parseFloat(existingRow?.total ?? "0");
        if (existingQty + newQty > limit.maxPerCustomer!) {
          const remaining = Math.max(0, limit.maxPerCustomer! - existingQty);
          const productName = newItem?.productName ?? "this product";
          res.status(400).json({
            error: `Product limit exceeded for "${productName}". Max ${limit.maxPerCustomer} per customer — you have ${existingQty} in other orders and ${remaining} remaining.`,
          });
          return;
        }
      }
    }
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
  // Resolve the admin fee for this edit. Fixed fees keep the amount stored on the order;
  // percentage fees are recomputed against the new subtotal so the fee tracks line-item changes.
  const storedAdminFee = parseFloat(String(order.adminFee ?? "0"));
  let resolvedAdminFee = (clientDirectShippingRequested === true || isAddition) ? 0 : storedAdminFee;
  let recomputedAdminFeeLabel: string | null | undefined =
    (clientDirectShippingRequested === true || isAddition) ? null : undefined;
  // Only recompute percentage fees for orders that already carry an admin fee, so a percent fee
  // tracks line-item changes without retroactively adding a fee to orders that never had one
  // (mirrors the fixed-fee path, which preserves the stored amount).
  if (clientDirectShippingRequested !== true && order.groupBuyId && storedAdminFee > 0) {
    const [gbFee] = await db
      .select({
        adminFeeEnabled: groupBuysTable.adminFeeEnabled,
        adminFeeType: groupBuysTable.adminFeeType,
        adminFeeAmount: groupBuysTable.adminFeeAmount,
        adminFeeLabel: groupBuysTable.adminFeeLabel,
        adminFeeCountries: groupBuysTable.adminFeeCountries,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));
    if (gbFee?.adminFeeEnabled && gbFee.adminFeeType === "percent") {
      const resolved = resolveGroupBuyAdminFee({
        enabled: gbFee.adminFeeEnabled,
        feeType: gbFee.adminFeeType,
        baseAmount: gbFee.adminFeeAmount,
        label: gbFee.adminFeeLabel,
        countryOverrides: gbFee.adminFeeCountries,
        shippingCountry: clientShippingCountry ?? order.shippingCountry,
        productSubtotal,
      });
      resolvedAdminFee = resolved.amount;
      recomputedAdminFeeLabel = resolved.label;
    }
  }
  const grandTotal = Number(Math.max(0, baseUpdateTotal + resolvedAdminFee).toFixed(2));

  // Capture old line items for audit log before deleting them
  const oldLineItems = await db.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, rawId));

  const activeHalfClaims = await db.select({ id: gbHalfKitClaimsTable.id }).from(gbHalfKitClaimsTable)
    .where(and(eq(gbHalfKitClaimsTable.orderId, rawId), eq(gbHalfKitClaimsTable.state, "active"))).limit(1);
  let updatedDeliveryRoute: Awaited<ReturnType<typeof resolveGroupOrderRoute>> | null = null;
  const destinationChanged = typeof clientShippingCountry === "string" &&
    supplierCountryCode(clientShippingCountry) !== supplierCountryCode(order.shippingCountry ?? "");
  const deliveryChanged = deliveryMethodRecord.id !== order.deliveryMethodId ||
    (clientDirectShippingRequested === true) !== Boolean(order.directShippingRequested) || destinationChanged;
  if (order.groupBuyId && !order.additionOfOrderId && (!order.reshipperUsername || deliveryChanged)) {
    try {
      updatedDeliveryRoute = await resolveGroupOrderRoute({
        gbId: order.groupBuyId, methodId: String(deliveryMethodRecord.id),
        direct: clientDirectShippingRequested === true,
        country: typeof clientShippingCountry === "string" ? clientShippingCountry : order.shippingCountry,
        username: order.telegramUsername, preferred: destinationChanged ? null : order.reshipperUsername, items: clientLineItems,
        legacyDirectKits: order.directShippingRequested ? oldLineItems.reduce((sum, item) => sum + Number(item.quantity), 0) : undefined,
      });
    } catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
  }
  const routeUpdate = updatedDeliveryRoute ? {
    reshipperUsername: updatedDeliveryRoute.reshipperUsername, routingType: updatedDeliveryRoute.routingType,
  } : {};
  const { updatedOrder, insertedLineItems, lineItemsToInsert } = await db.transaction(async tx => {
  if (updatedDeliveryRoute) {
    const [routeSnapshot] = await tx.select({ reshipperUsername: ordersTable.reshipperUsername, routingType: ordersTable.routingType })
      .from(ordersTable).where(eq(ordersTable.id, rawId)).for("update");
    if (!routeSnapshot || routeSnapshot.reshipperUsername !== order.reshipperUsername || routeSnapshot.routingType !== order.routingType) {
      throw new HalfKitError("The order's shipping route changed. Reload the order before saving.");
    }
  }
  if (activeHalfClaims.length) {
    if (!order.groupBuyId) throw new HalfKitError("This reserved half-kit order needs organiser review.");
    const result = await editOrderWithHalfKits(tx, rawId, order.groupBuyId, req.body);
    if (updatedDeliveryRoute) {
      const [routed] = await tx.update(ordersTable).set(routeUpdate).where(eq(ordersTable.id, rawId)).returning();
      result.updatedOrder = routed;
    }
    if (req.body.onwardDeliveryMethod || String(deliveryMethodId).startsWith("eu-postage-")) await tx.update(ordersTable).set({
      shippingName: String(clientShippingName ?? order.shippingName ?? "").trim(),
      shippingAddress: String(clientShippingAddress ?? order.shippingAddress ?? "").trim(),
      shippingPhone: String(clientShippingPhone ?? order.shippingPhone ?? "").trim(),
      shippingEmail: String(clientShippingEmail ?? order.shippingEmail ?? "").trim(),
      shippingCountry: String(clientShippingCountry ?? order.shippingCountry ?? "").trim(),
    }).where(eq(ordersTable.id, rawId));
    await saveOnwardOrderPreference(tx, rawId, req.body.onwardDeliveryMethod);
    return result;
  }
  await assertGroupStock(tx, order.groupBuyId, clientLineItems, rawId);
  const [lockedOrder] = await tx.select({ id: ordersTable.id }).from(ordersTable)
    .where(eq(ordersTable.id, rawId)).for("update");
  if (!lockedOrder) throw new Error("Order no longer exists.");
  await assertNoActiveRefund(tx, rawId);
  const [updatedOrder] = await tx
    .update(ordersTable)
    .set({
      deliveryMethod: isAddition ? order.deliveryMethod : deliveryMethodRecord.name,
      ...routeUpdate,
      deliveryMethodId: isAddition ? order.deliveryMethodId : deliveryMethodRecord.id,
      deliveryPrice: deliveryPrice.toFixed(2),
      vendorShipping: vendorShipping.toFixed(2),
      productSubtotal: productSubtotal.toFixed(2),
      tip: tip.toFixed(2),
      testingContribution: normalizedUpdateContribution.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      adminFee: resolvedAdminFee.toFixed(2),
      // Editing the order changes the total, so any previously-locked crypto USD
      // amount is now stale. Clear it (unless the order is paid-like) so the payment
      // panel re-locks to the exact new total on next open — never showing a stale
      // coin amount from before the edit. "test_confirmed" counts as paid-like here
      // (a test payment was already sent), matching the app's PAID status set.
      ...(!["confirmed", "test_confirmed"].includes(order.paymentStatus ?? "") && { paymentUsdAmount: null }),
      ...(recomputedAdminFeeLabel !== undefined && { adminFeeLabel: recomputedAdminFeeLabel }),
      notes: notes ? String(notes).trim().slice(0, MAX_NOTES_LENGTH) : null,
      directShippingRequested: isAddition ? (order.directShippingRequested ?? false) : clientDirectShippingRequested === true,
      directShippingCost: isAddition
        ? null
        : (clientDirectShippingRequested === true && clientDirectShippingCost != null
          ? parseFloat(String(clientDirectShippingCost)).toFixed(2)
          : null),
      ...((isWholesaleOrder || (order.groupBuyId && (req.body.onwardDeliveryMethod || String(deliveryMethodId).startsWith("eu-postage-")))) && {
        shippingName: String(clientShippingName ?? order.shippingName ?? "").trim().slice(0, 256) || null,
        shippingPhone: String(clientShippingPhone ?? order.shippingPhone ?? "").trim().slice(0, 64) || null,
        shippingEmail: String(clientShippingEmail ?? order.shippingEmail ?? "").trim().slice(0, 256) || null,
        shippingAddress: String(clientShippingAddress ?? order.shippingAddress ?? "").trim().slice(0, 1024) || null,
        shippingCountry: String(clientShippingCountry ?? order.shippingCountry ?? "").trim().slice(0, 128) || null,
      }),
    })
    .where(refundMutableOrderWhere(eq(ordersTable.id, rawId)))
    .returning();
  if (!updatedOrder) throw new RefundMutationBlockedError(rawId);

  await tx.delete(orderLineItemsTable).where(refundMutableOrderWhere(eq(orderLineItemsTable.orderId, rawId), orderLineItemsTable.orderId));

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

  const insertedLineItems = await tx
    .insert(orderLineItemsTable)
    .values(lineItemsToInsert)
    .returning();
  if (order.groupBuyId) await saveOnwardOrderPreference(tx, rawId, req.body.onwardDeliveryMethod);
  return { updatedOrder, insertedLineItems, lineItemsToInsert };
  });

  const formatted = formatOrderResponse({ ...updatedOrder, onwardDeliveryMethod: updatedOrder.groupBuyId ? await getOnwardOrderPreference(rawId) : null }, insertedLineItems as unknown as Record<string, unknown>[]);
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
        deliveryMethod: updatedOrder.deliveryMethod,
        grandTotal: updatedOrder.grandTotal,
        notes: updatedOrder.notes,
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
      grandTotal: updatedOrder.grandTotal,
      deliveryMethod: updatedOrder.deliveryMethod,
      lineItems: lineItemsToInsert.map(li => ({
        productName: li.productName,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    },
  }).catch(err => console.error("[orders] order.updated log failed:", err));

  createAlert("order", "medium", "Order Edited",
    `Order #${order.code} was edited by @${order.telegramUsername.replace(/^@/, "")} — new total: $${updatedOrder.grandTotal}`,
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
  const editAdminTipLine = Number(updatedOrder.tip) > 0 ? `\nTip: ${editSym}${Number(updatedOrder.tip).toFixed(2)}` : "";
  notifyUserFromTemplate(order.telegramUsername, "status", "customer_order_edited",
    {
      code: order.code,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      order_total: editSym + updatedOrder.grandTotal,
      delivery: escapeHtml(updatedOrder.deliveryMethod),
    },
  ).catch(() => {});
  sendAdminFromTemplate("admin_order_edited",
    {
      code: order.code,
      username: escapeHtml(order.telegramUsername.replace(/^@/, "")),
      items: editAdminItemLines,
      delivery: escapeHtml(updatedOrder.deliveryMethod),
      delivery_fee: editSym + updatedOrder.deliveryPrice,
      tip: editAdminTipLine,
      order_total: editSym + updatedOrder.grandTotal,
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

  // Additions (top-ups) inherit the parent order's address and ship together with it,
  // so their address is locked — it can never be changed independently.
  if (order.additionOfOrderId) {
    res.status(403).json({
      error: "This is an add-on to an earlier order — it ships to that order's address, which can't be changed here.",
    });
    return;
  }

  if (shippingCountry && supplierCountryCode(String(shippingCountry)) !== supplierCountryCode(order.shippingCountry ?? "")) {
    await assertSupplierOrderEditable(db, [order.id]);
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
    .where(refundMutableOrderWhere(eq(ordersTable.id, orderId)))
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
  await db.update(ordersTable).set({ telegramUsername: newTg }).where(refundMutableOrderWhere(tgEq(tg)));

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

  if (order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed") {
    res.status(403).json({ error: `This order has already been paid and can no longer be deleted. Contact support if needed.` });
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

  try {
  await db.transaction(async tx => {
    await cancelUnpaidHalfClaims(tx, orderId, order.telegramUsername);
    await tx.update(ordersTable)
      .set({ deletedAt: new Date(), deletedBy: "customer" })
      .where(refundMutableOrderWhere(eq(ordersTable.id, orderId)));
  });
  } catch (error) {
    if (error instanceof HalfKitError) { res.status(error.status).json({ error: error.message }); return; }
    throw error;
  }

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
router.post("/orders/:id/payment-screenshot", requireAccount, async (req, res): Promise<void> => {
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

  if (!safeEqual(normalizeTg(req.account!.telegramUsername).toLowerCase(), normalizeTg(order.telegramUsername).toLowerCase())) {
    res.status(403).json({ error: "You can only upload payment proof for your own order" });
    return;
  }

  const [saved] = await db
    .update(ordersTable)
    .set({ paymentScreenshot: s })
    .where(refundMutableOrderWhere(and(
      eq(ordersTable.id, id),
      eq(ordersTable.telegramUsername, order.telegramUsername),
      isNull(ordersTable.deletedAt),
      activeSharedOrderMembershipWhere(),
    )))
    .returning({ id: ordersTable.id });
  if (!saved) {
    res.status(409).json({ error: "This order is no longer available for payment proof. Please refresh." });
    return;
  }

  writeLog("change", "info", "payment_screenshot_uploaded",
    `Payment screenshot uploaded for order #${order.code}`,
    { orderId: id, telegramUsername: order.telegramUsername },
  ).catch(() => {});

  res.json({ ok: true });
});

// POST /api/orders/:id/confirm-fiat — buyer signals they have paid via Revolut/PayPal
router.post("/orders/:id/confirm-fiat", requireAccount, async (req, res): Promise<void> => {
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
      orderType: ordersTable.orderType,
      sharedOrderId: ordersTable.sharedOrderId,
      paymentStatus: ordersTable.paymentStatus,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!safeEqual(normalizeTg(req.account!.telegramUsername).toLowerCase(), normalizeTg(order.telegramUsername).toLowerCase())) {
    res.status(403).json({ error: "You can only submit payment for your own order" });
    return;
  }

  let op: Record<string, string> | null = null;
  if (order.orderType === "wholesale_shared" && order.sharedOrderId) {
    const [share] = await db.select().from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id, order.sharedOrderId));
    if (!share || share.status === "cancelled") {
      res.status(400).json({ error: "This shared order is no longer available for payment" });
      return;
    }
    const methods = resolveSharedOrderPaymentMethods(share, { anonPayTicker: null, anonPayNetwork: null });
    op = {
      revolutHandle: methods.revolutHandle ?? "",
      paypalHandle: methods.paypalHandle ?? "",
    };
  } else {
    if (!order.groupBuyId) {
      res.status(400).json({ error: "This order does not support organiser fiat payments" });
      return;
    }

    const [gb] = await db
      .select({
        organiserPayments: groupBuysTable.organiserPayments,
      })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, order.groupBuyId));

    if (!gb) {
      res.status(404).json({ error: "Group buy not found" });
      return;
    }

    op = gb.organiserPayments as Record<string, string> | null;
  }
  const hasRevolut = !!(op?.revolutHandle);
  const hasPaypal = !!(op?.paypalHandle);
  if (method === "revolut" && !hasRevolut) {
    res.status(400).json({ error: "This order does not have a Revolut payment option" });
    return;
  }
  if (method === "paypal" && !hasPaypal) {
    res.status(400).json({ error: "This order does not have a PayPal payment option" });
    return;
  }

  const allowedStatuses = ["unpaid", "test_ready", "test_confirmed"];
  if (!allowedStatuses.includes(order.paymentStatus ?? "unpaid")) {
    res.status(400).json({ error: "Payment cannot be confirmed from current status" });
    return;
  }

  const [submitted] = await db
    .update(ordersTable)
    .set({
      paymentStatus: "pending_confirmation",
      paymentTxHash: `fiat:${method}`,
      paymentRejectionReason: null,
    })
    .where(refundMutableOrderWhere(and(
      eq(ordersTable.id, id),
      eq(ordersTable.telegramUsername, order.telegramUsername),
      order.paymentStatus === null ? isNull(ordersTable.paymentStatus) : eq(ordersTable.paymentStatus, order.paymentStatus),
      isNull(ordersTable.deletedAt),
      notInArray(ordersTable.status, ["Cancelled", "Refunded"]),
      activeSharedOrderMembershipWhere(),
    )))
    .returning({ id: ordersTable.id });
  if (!submitted) {
    res.status(409).json({ error: "The order or payment status changed. Please refresh before submitting payment again." });
    return;
  }

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

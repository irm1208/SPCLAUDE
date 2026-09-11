import { Router, type IRouter } from "express";
import { createAlert } from "../lib/create-alert";
import { sendTelegramMessage } from "../lib/telegram";
import { writeLog } from "../lib/audit-log";
import { randomUUID, createHash, timingSafeEqual, randomInt } from "crypto";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../middleware/account-auth";
import { db } from "@workspace/db";
import {
  vialProductsTable, vialDiscountCodesTable,
  vialOrdersTable, vialOrderItemsTable,
  vialVendorsTable, siteConfigTable,
  vialManufacturersTable, auditLogsTable,
} from "@workspace/db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { isStablecoin, fetchFiatToUsd } from "../lib/crypto-pricing";
import { verifyTransaction, effectiveStableCurrency } from "../lib/payment-verify";
import { isBlockedAutomatedRegistrationName } from "../lib/registration-abuse";
import { verifyTurnstile } from "../lib/turnstile";
import { requireAdmin } from "../middleware/require-admin";

const router: IRouter = Router();

// ─── Helpers ───────────────────────────────────────────────────
function hashPassword(password: string): string {
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) throw new Error("ADMIN_SECRET is not set — cannot hash seller password");
  return createHash("sha256").update(password + ":" + secret).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch { return false; }
}

async function requireSeller(req: any, res: any): Promise<any | null> {
  const vendorId = req.headers["x-seller-id"];
  const token = req.headers["x-seller-token"];
  if (!vendorId || !token) { res.status(401).json({ error: "Seller auth required" }); return null; }
  const [vendor] = await db.select().from(vialVendorsTable).where(eq(vialVendorsTable.id, String(vendorId)));
  if (!vendor || !vendor.sellerPasswordHash) { res.status(401).json({ error: "Seller not found" }); return null; }
  if (!safeCompare(String(token), vendor.sellerPasswordHash)) { res.status(401).json({ error: "Invalid credentials" }); return null; }
  return vendor;
}

async function getConfig(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

/** Returns true if the request is allowed through. Returns false and sends a 401 if
 *  shop_members_only is enabled and the caller is not logged in. */
async function checkShopAccess(req: any, res: any): Promise<boolean> {
  const flag = await getConfig("shop_members_only");
  if (flag !== "true") return true;
  const token = req.cookies?.account_session as string | undefined;
  if (!token) { res.status(401).json({ error: "members_only" }); return false; }
  try { jwt.verify(token, getJwtSecret()); return true; }
  catch { res.status(401).json({ error: "members_only" }); return false; }
}

function genOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "LV-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function fmtProduct(p: any, vendor?: any) {
  return {
    id: p.id, name: p.name, description: p.description, category: p.category,
    mgSize: p.mgSize, price: parseFloat(p.price), currency: p.currency ?? "USDT",
    stock: p.stock, manufacturer: p.manufacturer ?? null, batchNumber: p.batchNumber, labReportUrl: p.labReportUrl,
    imageUrl: p.imageUrl ?? null,
    active: p.active, sortOrder: p.sortOrder,
    vendorId: p.vendorId ?? null,
    vendorName: vendor?.name ?? null,
    vendorTelegram: vendor?.contactTelegram ?? null,
    vendorShipsTo: vendor?.shipsTo ?? null,
    vendorCountry: vendor?.country ?? null,
    vendorRating: vendor?.rating ? parseFloat(vendor.rating) : null,
    vendorLogoUrl: vendor?.logoUrl ?? null,
    vendorWallet: vendor?.walletAddress ?? null,
    vendorRevolutLink: vendor?.revolutLink ?? null,
    vendorPaypalLink: vendor?.paypalLink ?? null,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  };
}

function fmtVendor(v: any, productCount?: number) {
  return {
    id: v.id, name: v.name, tagline: v.tagline, description: v.description,
    contactTelegram: v.contactTelegram, telegramChatId: v.telegramChatId ?? null,
    logoUrl: v.logoUrl,
    shipsTo: v.shipsTo ?? null, country: v.country ?? null,
    rating: v.rating ? parseFloat(v.rating) : null,
    walletAddress: v.walletAddress ?? null,
    revolutLink: v.revolutLink ?? null,
    paypalLink: v.paypalLink ?? null,
    notifyVendor: v.notifyVendor !== false,
    active: v.active, sortOrder: v.sortOrder, createdAt: v.createdAt,
    productCount: productCount ?? 0,
    hasDashboard: !!v.sellerPasswordHash,
  };
}


function fmtCode(c: any) {
  return {
    id: c.id, code: c.code, discountType: c.discountType,
    discountValue: parseFloat(c.discountValue),
    minOrderAmount: c.minOrderAmount ? parseFloat(c.minOrderAmount) : null,
    maxUses: c.maxUses, usesCount: c.usesCount, expiresAt: c.expiresAt,
    active: c.active, notes: c.notes, createdAt: c.createdAt,
  };
}

function fmtOrder(o: any, items: any[] = [], { revealWallet = true } = {}, vendor?: { revolutLink?: string | null; paypalLink?: string | null } | null) {
  const accepted = (o.orderStatus ?? "accepted") === "accepted";
  return {
    id: o.id, code: o.code, telegramUsername: o.telegramUsername,
    shippingName: o.shippingName, shippingAddress: o.shippingAddress,
    email: o.email, notes: o.notes, status: o.status,
    orderStatus: o.orderStatus ?? "accepted",
    subtotal: parseFloat(o.subtotal), discountAmount: parseFloat(o.discountAmount),
    total: parseFloat(o.total), discountCodeUsed: o.discountCodeUsed,
    // USDT amount the buyer must send (fiat total converted to USD ≈ USDT).
    // Falls back to the fiat total for legacy orders created before conversion.
    paymentUsdAmount: o.paymentUsdAmount != null ? parseFloat(o.paymentUsdAmount) : parseFloat(o.total),
    paymentCurrency: o.paymentCurrency ?? "USDT",
    paymentStatus: o.paymentStatus, paymentTxHash: o.paymentTxHash,
    walletAddress: (revealWallet && accepted) ? o.walletAddress : null,
    revolutLink: (revealWallet && accepted && vendor?.revolutLink) ? vendor.revolutLink : null,
    paypalLink: (revealWallet && accepted && vendor?.paypalLink) ? vendor.paypalLink : null,
    adminNotes: o.adminNotes,
    createdAt: o.createdAt,
    items: items.map(i => ({
      id: i.id, productId: i.productId, productName: i.productName,
      quantity: i.quantity, unitPrice: parseFloat(i.unitPrice),
      lineTotal: parseFloat(i.lineTotal),
    })),
  };
}

// ─── Crypto Verification ───────────────────────────────────────
// The shop settles to a single Ethereum (ERC-20) wallet. Buyers may pay in USDT
// or USDC — both 1:1 with USD and sent to the same address — so verification is
// delegated to the shared verifyTransaction helper, which checks the correct
// token contract for the chosen stablecoin.

// ══════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════

router.get("/vial/vendors", async (req, res): Promise<void> => {
  if (!await checkShopAccess(req, res)) return;
  const vendors = await db.select().from(vialVendorsTable)
    .where(eq(vialVendorsTable.active, true))
    .orderBy(vialVendorsTable.sortOrder, vialVendorsTable.createdAt);
  const products = await db.select().from(vialProductsTable).where(eq(vialProductsTable.active, true));
  res.json(vendors.map(v => fmtVendor(v, products.filter(p => p.vendorId === v.id).length)));
});

router.get("/vial/products", async (req, res): Promise<void> => {
  if (!await checkShopAccess(req, res)) return;
  const products = await db
    .select().from(vialProductsTable)
    .where(eq(vialProductsTable.active, true))
    .orderBy(vialProductsTable.sortOrder, vialProductsTable.createdAt);
  const vendorIds = [...new Set(products.map(p => p.vendorId).filter(Boolean))] as string[];
  const vendors = vendorIds.length
    ? await db.select().from(vialVendorsTable).where(inArray(vialVendorsTable.id, vendorIds))
    : [];
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
  res.json(products.map(p => fmtProduct(p, p.vendorId ? vendorMap[p.vendorId] : undefined)));
});

router.get("/vial/products/:id", async (req, res): Promise<void> => {
  if (!await checkShopAccess(req, res)) return;
  const [p] = await db.select().from(vialProductsTable).where(eq(vialProductsTable.id, req.params.id));
  if (!p || !p.active) { res.status(404).json({ error: "Product not found" }); return; }
  const vendor = p.vendorId ? (await db.select().from(vialVendorsTable).where(eq(vialVendorsTable.id, p.vendorId)))[0] : undefined;
  res.json(fmtProduct(p, vendor));
});

router.post("/vial/validate-code", async (req, res): Promise<void> => {
  const { code, subtotal } = req.body;
  if (!code || typeof code !== "string") { res.status(400).json({ error: "code required" }); return; }
  const sub = parseFloat(subtotal) || 0;

  const [dc] = await db
    .select().from(vialDiscountCodesTable)
    .where(eq(vialDiscountCodesTable.code, code.trim().toUpperCase()));

  if (!dc || !dc.active) { res.status(404).json({ error: "Invalid or inactive discount code" }); return; }
  if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) { res.status(400).json({ error: "Discount code has expired" }); return; }
  if (dc.maxUses !== null && dc.usesCount >= dc.maxUses) { res.status(400).json({ error: "Discount code has reached its usage limit" }); return; }
  if (dc.minOrderAmount && sub < parseFloat(dc.minOrderAmount)) {
    res.status(400).json({ error: `Minimum order of $${parseFloat(dc.minOrderAmount).toFixed(2)} required` });
    return;
  }

  const value = parseFloat(dc.discountValue);
  let discountAmount: number;
  if (dc.discountType === "percent") {
    discountAmount = parseFloat((sub * value / 100).toFixed(2));
  } else {
    discountAmount = Math.min(value, sub);
  }

  res.json({
    id: dc.id, code: dc.code, discountType: dc.discountType,
    discountValue: value, discountAmount,
    description: dc.discountType === "percent" ? `${value}% off` : `$${value.toFixed(2)} off`,
  });
});

router.post("/vial/checkout", async (req, res): Promise<void> => {
  const { items, telegramUsername, email, notes, discountCode } = req.body;

  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: "No items in order" }); return; }
  if (!telegramUsername || typeof telegramUsername !== "string") { res.status(400).json({ error: "Telegram username required" }); return; }

  const validatedItems: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];
  let orderCurrency = "USDT";
  for (const item of items) {
    const qty = parseInt(item.quantity);
    if (!item.productId || isNaN(qty) || qty <= 0) { res.status(400).json({ error: "Invalid item" }); return; }
    const [p] = await db.select().from(vialProductsTable).where(eq(vialProductsTable.id, String(item.productId)));
    if (!p || !p.active) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
    if (p.stock < qty) { res.status(400).json({ error: `Insufficient stock for ${p.name}` }); return; }
    if (validatedItems.length === 0) orderCurrency = (p.currency ?? "USDT").toUpperCase();
    const unitPrice = parseFloat(p.price);
    validatedItems.push({
      productId: p.id, productName: p.name, quantity: qty,
      unitPrice, lineTotal: parseFloat((unitPrice * qty).toFixed(2)),
    });
  }

  const subtotal = parseFloat(validatedItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));

  let discountAmount = 0;
  let discountCodeId: string | null = null;
  let discountCodeUsed: string | null = null;
  if (discountCode && typeof discountCode === "string") {
    const [dc] = await db
      .select().from(vialDiscountCodesTable)
      .where(eq(vialDiscountCodesTable.code, discountCode.trim().toUpperCase()));
    if (dc && dc.active && !(dc.expiresAt && new Date(dc.expiresAt) < new Date()) &&
        !(dc.maxUses !== null && dc.usesCount >= dc.maxUses) &&
        !(dc.minOrderAmount && subtotal < parseFloat(dc.minOrderAmount))) {
      const value = parseFloat(dc.discountValue);
      discountAmount = dc.discountType === "percent"
        ? parseFloat((subtotal * value / 100).toFixed(2))
        : Math.min(value, subtotal);
      discountCodeId = dc.id;
      discountCodeUsed = dc.code;
    }
  }

  const total = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));

  // The vial shop is paid in USDT (≈1 USD). Convert the fiat total to USD so the
  // buyer is shown — and verified against — the correct USDT amount. Stablecoin-
  // priced products need no conversion.
  const usdTotal = isStablecoin(orderCurrency)
    ? total
    : parseFloat((total * await fetchFiatToUsd(orderCurrency)).toFixed(2));

  // Resolve the wallet address: prefer the vendor's own wallet (if all items
  // belong to a single vendor that has one set), then fall back to the admin wallet.
  let walletAddress: string | null = null;
  {
    const productIds0 = validatedItems.map(i => i.productId);
    const products0 = await db.select({ vendorId: vialProductsTable.vendorId })
      .from(vialProductsTable).where(inArray(vialProductsTable.id, productIds0));
    const uniqueVendorIds0 = [...new Set(products0.map(p => p.vendorId).filter(Boolean))] as string[];
    if (uniqueVendorIds0.length === 1) {
      const [v0] = await db.select({ walletAddress: vialVendorsTable.walletAddress })
        .from(vialVendorsTable).where(eq(vialVendorsTable.id, uniqueVendorIds0[0]));
      walletAddress = v0?.walletAddress ?? null;
    }
    if (!walletAddress) walletAddress = await getConfig("walletAddress");
  }

  let code = genOrderCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await db.select({ id: vialOrdersTable.id }).from(vialOrdersTable).where(eq(vialOrdersTable.code, code));
    if (existing.length === 0) break;
    code = genOrderCode();
  }

  const orderId = randomUUID();

  await db.insert(vialOrdersTable).values({
    id: orderId, code,
    telegramUsername: telegramUsername.replace(/^@/, "").trim(),
    shippingName: null,
    shippingAddress: null,
    email: email ? String(email).trim() : null,
    notes: notes ? String(notes).trim() : null,
    status: "pending",
    orderStatus: "pending_acceptance",
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
    discountCodeId, discountCodeUsed,
    paymentStatus: "unpaid",
    walletAddress: walletAddress || null,
    paymentUsdAmount: usdTotal.toFixed(2),
    shippingPrice: "0.00",
  });

  for (const item of validatedItems) {
    await db.insert(vialOrderItemsTable).values({
      id: randomUUID(), orderId,
      productId: item.productId, productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    });
  }

  if (discountCodeId) {
    await db.update(vialDiscountCodesTable)
      .set({ usesCount: sql`${vialDiscountCodesTable.usesCount} + 1` })
      .where(eq(vialDiscountCodesTable.id, discountCodeId));
  }

  const items2 = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, orderId));
  const order = await db.select().from(vialOrdersTable).where(eq(vialOrdersTable.id, orderId));

  // ─── Notify sellers of new order pending acceptance ───────────
  try {
    const productIds2 = validatedItems.map(i => i.productId);
    const products2 = await db.select().from(vialProductsTable).where(inArray(vialProductsTable.id, productIds2));
    const vendorIds2 = [...new Set(products2.map(p => p.vendorId).filter(Boolean))] as string[];
    if (vendorIds2.length > 0) {
      const vendors2 = await db.select().from(vialVendorsTable).where(inArray(vialVendorsTable.id, vendorIds2));
      const itemsList2 = validatedItems.map(i => `• ${i.productName} ×${i.quantity} — $${i.lineTotal.toFixed(2)} USDT`).join("\n");
      for (const vendor2 of vendors2) {
        if (!vendor2.telegramChatId) continue;
        if (vendor2.notifyVendor === false) continue;
        const msg2 =
          `📦 <b>New Order — Awaiting Your Approval</b>\n\n` +
          `Order: <code>${code}</code>\n` +
          `Total: <b>$${total.toFixed(2)} USDT</b>\n\n` +
          `<b>Items:</b>\n${itemsList2}` +
          (notes ? `\n\n<b>Buyer's Note:</b>\n${notes}` : "") +
          `\n\n⚠️ Log into your seller dashboard to <b>accept or reject</b> this order.\n` +
          `The buyer is waiting for your response.`;
        await sendTelegramMessage(vendor2.telegramChatId, msg2);
      }
    }
  } catch { /* best-effort */ }

  // ─── Notify admin of new order ────────────────────────────────
  // Resolve sellers for both Telegram message and DB alert
  let adminSellerNames = "Unknown";
  let adminItemsSummary = validatedItems.map(i => `${i.productName} ×${i.quantity} ($${i.lineTotal.toFixed(2)})`).join(", ");
  try {
    const productIds3 = validatedItems.map(i => i.productId);
    const products3 = await db.select().from(vialProductsTable).where(inArray(vialProductsTable.id, productIds3));
    const vendorIds3 = [...new Set(products3.map(p => p.vendorId).filter(Boolean))] as string[];
    if (vendorIds3.length > 0) {
      const vendors3 = await db.select().from(vialVendorsTable).where(inArray(vialVendorsTable.id, vendorIds3));
      adminSellerNames = vendors3.map(v => v.name).join(", ") || "Unknown";
    }
  } catch { /* best-effort — use fallback names */ }

  // Admin Telegram (best-effort, failure does NOT block DB alert)
  try {
    const adminChatId = await getConfig("telegramAdminChatId") || process.env["TELEGRAM_ADMIN_CHAT_ID"];
    if (adminChatId) {
      const itemsList3 = validatedItems.map(i => `• ${i.productName} ×${i.quantity} — $${i.lineTotal.toFixed(2)} USDT`).join("\n");
      const adminMsg =
        `🛒 <b>New Lonely Vial Order</b>\n\n` +
        `Order: <code>${code}</code>\n` +
        `Seller(s): <b>${adminSellerNames}</b>\n` +
        `Buyer: @${telegramUsername}\n` +
        `Total: <b>$${total.toFixed(2)} USDT</b>\n\n` +
        `<b>Items:</b>\n${itemsList3}` +
        (notes ? `\n\n<b>Buyer's Note:</b>\n${notes}` : "");
      await sendTelegramMessage(adminChatId, adminMsg);
    }
  } catch { /* best-effort */ }

  // DB alert — separate try block so Telegram failure cannot prevent creation
  try {
    const alertBody = [
      `Seller(s): ${adminSellerNames}`,
      `Buyer: @${telegramUsername}`,
      `Items: ${adminItemsSummary}`,
      `Total: $${total.toFixed(2)} USDT`,
      ...(notes ? [`Notes: ${notes}`] : []),
    ].join(" · ");
    await createAlert("order", "medium", `New Lonely Vial Order — ${code}`, alertBody);
  } catch { /* best-effort */ }

  res.status(201).json(fmtOrder(order[0], items2));
});

router.get("/vial/orders/:id", async (req, res): Promise<void> => {
  const [o] = await db.select().from(vialOrdersTable).where(eq(vialOrdersTable.id, req.params.id));
  if (!o) { res.status(404).json({ error: "Order not found" }); return; }
  const items = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, o.id));

  // Fetch vendor payment info from the first item's product
  let vendorPayment: { revolutLink?: string | null; paypalLink?: string | null } | null = null;
  const firstItem = items[0];
  if (firstItem?.productId) {
    const [product] = await db
      .select({ vendorId: vialProductsTable.vendorId })
      .from(vialProductsTable)
      .where(eq(vialProductsTable.id, firstItem.productId));
    if (product?.vendorId) {
      const [vendor] = await db
        .select({ revolutLink: vialVendorsTable.revolutLink, paypalLink: vialVendorsTable.paypalLink })
        .from(vialVendorsTable)
        .where(eq(vialVendorsTable.id, product.vendorId));
      if (vendor) vendorPayment = vendor;
    }
  }

  res.json(fmtOrder(o, items, { revealWallet: true }, vendorPayment));
});

router.post("/vial/orders/:id/pay", async (req, res): Promise<void> => {
  const { txHash, shippingName, shippingAddress } = req.body;
  const cleanHash = typeof txHash === "string" ? txHash.trim() : "";
  if (!cleanHash || !/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
    res.status(400).json({ error: "Invalid transaction hash format. Expected a 0x-prefixed 64-character hex string." });
    return;
  }
  if (!shippingName || typeof shippingName !== "string" || !shippingName.trim()) {
    res.status(400).json({ error: "Full name is required" }); return;
  }
  if (!shippingAddress || typeof shippingAddress !== "string" || !shippingAddress.trim()) {
    res.status(400).json({ error: "Shipping address is required" }); return;
  }

  const [order] = await db.select().from(vialOrdersTable).where(eq(vialOrdersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if ((order.orderStatus ?? "accepted") !== "accepted") {
    res.status(400).json({ error: "Order has not been accepted by the seller yet" }); return;
  }
  if (order.paymentStatus === "confirmed") { res.status(400).json({ error: "Payment already confirmed" }); return; }

  const walletAddress = order.walletAddress || await getConfig("walletAddress");
  if (!walletAddress) { res.status(400).json({ error: "Wallet address not configured" }); return; }

  // Resolve which stablecoin to verify against. The shop's base rail is USDT on
  // Ethereum (ERC-20); buyers may instead choose USDC, but ONLY when the wallet is
  // a valid EVM address. Never trust the client blindly — effectiveStableCurrency
  // falls back to USDT for any unsupported/invalid choice.
  const payCurrency = effectiveStableCurrency("USDT", "ERC-20", walletAddress, req.body?.cryptoCurrency);

  // Verify against the amount locked at checkout (fiat total → USD). Both USDT and
  // USDC are 1:1 with USD. Legacy orders without a locked amount fall back to total.
  const expectedAmount = order.paymentUsdAmount != null ? parseFloat(String(order.paymentUsdAmount)) : parseFloat(order.total);
  const result = await verifyTransaction(cleanHash, walletAddress, expectedAmount, payCurrency, "ERC-20");

  if (!result.verified) {
    await db.update(vialOrdersTable)
      .set({ paymentTxHash: cleanHash, paymentCurrency: payCurrency })
      .where(eq(vialOrdersTable.id, order.id));
    res.json({ verified: false, pending: (result as any).pending ?? false, reason: result.reason });
    return;
  }

  const [updated] = await db
    .update(vialOrdersTable)
    .set({
      paymentStatus: "confirmed", paymentTxHash: cleanHash, paymentCurrency: payCurrency,
      shippingName: shippingName.trim(), shippingAddress: shippingAddress.trim(),
    })
    .where(eq(vialOrdersTable.id, order.id))
    .returning();

  const orderItems = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, order.id));
  for (const item of orderItems) {
    await db.update(vialProductsTable)
      .set({ stock: sql`GREATEST(0, ${vialProductsTable.stock} - ${item.quantity})` })
      .where(eq(vialProductsTable.id, item.productId));
  }

  // ─── Notify sellers via Telegram ──────────────────────────────
  try {
    const productIds = orderItems.map(i => i.productId).filter(Boolean);
    if (productIds.length > 0) {
      const products = await db.select().from(vialProductsTable)
        .where(inArray(vialProductsTable.id, productIds));
      const vendorIds = [...new Set(products.map(p => p.vendorId).filter(Boolean))] as string[];
      if (vendorIds.length > 0) {
        const vendors = await db.select().from(vialVendorsTable)
          .where(inArray(vialVendorsTable.id, vendorIds));
        for (const vendor of vendors) {
          if (!vendor.telegramChatId) continue;
          if (vendor.notifyVendor === false) continue;
          const vendorProductIds = new Set(products.filter(p => p.vendorId === vendor.id).map(p => p.id));
          const vendorItems = orderItems.filter(i => vendorProductIds.has(i.productId));
          const itemsList = vendorItems.map(i => `• ${i.productName} ×${i.quantity} — $${parseFloat(i.lineTotal).toFixed(2)} ${payCurrency}`).join("\n");
          const msg =
            `🎉 <b>New Order Confirmed!</b>\n\n` +
            `Order: <code>${order.code}</code>\n` +
            `Amount: <b>$${parseFloat(order.total).toFixed(2)} ${payCurrency}</b>\n\n` +
            `<b>Ship to:</b>\n${updated.shippingName}\n${updated.shippingAddress}\n` +
            (order.telegramUsername ? `<b>Telegram:</b> @${order.telegramUsername}\n` : "") +
            (order.email ? `<b>Email:</b> ${order.email}\n` : "") +
            `\n<b>Your items:</b>\n${itemsList}`;
          await sendTelegramMessage(vendor.telegramChatId, msg);
        }
      }
    }
  } catch { /* seller notification errors must never break the response */ }

  res.json({ verified: true, paymentStatus: updated.paymentStatus, currency: payCurrency, amountUsdt: (result as any).amountUsdt });
});

// ══════════════════════════════════════════════════════════════
// SELLER ROUTES
// ══════════════════════════════════════════════════════════════

router.post("/vial/seller/login", async (req, res): Promise<void> => {
  const { name, password } = req.body;
  if (!name || !password) { res.status(400).json({ error: "Store name and password required" }); return; }
  const vendors = await db.select().from(vialVendorsTable)
    .where(sql`lower(${vialVendorsTable.name}) = lower(${String(name).trim()})`);
  const vendor = vendors.find(v => v.sellerPasswordHash);
  if (!vendor) { res.status(401).json({ error: "Invalid credentials" }); return; }
  const hash = hashPassword(String(password));
  if (!safeCompare(hash, vendor.sellerPasswordHash!)) { res.status(401).json({ error: "Invalid credentials" }); return; }
  writeLog("seller", "info", "seller_login", `Seller "${vendor.name}" logged in`, { vendorId: vendor.id, vendorName: vendor.name }, req.ip).catch(() => {});
  res.json({
    vendorId: vendor.id,
    vendorName: vendor.name,
    token: hash,
    country: vendor.country,
    rating: vendor.rating ? parseFloat(vendor.rating) : null,
    shipsTo: vendor.shipsTo,
  });
});

router.post("/vial/seller/signup", async (req, res): Promise<void> => {
  const { name, tagline, contactTelegram, country, shipsTo, password, turnstileToken } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Store name is required" }); return; }
  if (!contactTelegram?.trim()) { res.status(400).json({ error: "Telegram handle is required" }); return; }
  if (!password || String(password).length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (isBlockedAutomatedRegistrationName(name) || isBlockedAutomatedRegistrationName(contactTelegram)) {
    writeLog("security", "warn", "automated_signup_blocked",
      "Automated seller registration blocked",
      { registrationType: "seller" },
      req.ip,
    ).catch(() => {});
    res.status(403).json({ error: "Registration could not be completed" });
    return;
  }
  if (!(await verifyTurnstile({ token: turnstileToken, remoteIp: req.ip })).ok) {
    writeLog("security", "warn", "captcha_verification_failed",
      "Public seller registration CAPTCHA verification failed",
      { registrationType: "seller" },
      req.ip,
    ).catch(() => {});
    res.status(403).json({ error: "Registration could not be completed" });
    return;
  }
  const existing = await db.select({ id: vialVendorsTable.id })
    .from(vialVendorsTable)
    .where(eq(vialVendorsTable.name, String(name).trim()));
  if (existing.length > 0) { res.status(409).json({ error: "A store with that name already exists" }); return; }
  const hash = hashPassword(String(password));
  const [vendor] = await db.insert(vialVendorsTable).values({
    id: randomUUID(),
    name: String(name).trim(),
    tagline: tagline?.trim() || null,
    contactTelegram: String(contactTelegram).trim().replace(/^@/, "") || null,
    country: country?.trim() || null,
    shipsTo: shipsTo || null,
    sellerPasswordHash: hash,
    active: false,
    sortOrder: null,
  }).returning();

  createAlert(
    "seller",
    "high",
    "New Seller Application",
    `${String(name).trim()} (@${String(contactTelegram).trim().replace(/^@/, "")}) has submitted a seller application and is awaiting review.`,
    { linkUrl: "#vialshop", relatedEntityId: vendor.id },
  ).catch(() => {});

  res.status(201).json({ message: "Application submitted. Your account is pending admin approval.", vendorId: vendor.id });
});

router.get("/vial/seller/products", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const products = await db.select().from(vialProductsTable)
    .where(eq(vialProductsTable.vendorId, vendor.id))
    .orderBy(vialProductsTable.sortOrder, vialProductsTable.createdAt);
  res.json(products.map(p => fmtProduct(p, vendor)));
});

router.post("/vial/seller/products", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const { name, description, category, mgSize, price, currency, stock, manufacturer, batchNumber, labReportUrl, imageUrl } = req.body;
  if (!name?.trim() || price === undefined) { res.status(400).json({ error: "name and price required" }); return; }
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) { res.status(400).json({ error: "Invalid price" }); return; }
  const [created] = await db.insert(vialProductsTable).values({
    id: randomUUID(),
    vendorId: vendor.id,
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    category: category ? String(category).trim() : null,
    mgSize: mgSize ? String(mgSize).trim() : null,
    price: p.toFixed(2),
    currency: currency ? String(currency).trim().toUpperCase() : "USDT",
    stock: Math.max(0, parseInt(stock) || 0),
    manufacturer: manufacturer ? String(manufacturer).trim() : null,
    batchNumber: batchNumber ? String(batchNumber).trim() : null,
    labReportUrl: labReportUrl ? String(labReportUrl).trim() : null,
    imageUrl: imageUrl ? String(imageUrl).trim() : null,
    active: true,
  }).returning();
  writeLog("seller", "info", "seller_product_create", `Seller "${vendor.name}" created product "${created.name}"`, { vendorId: vendor.id, vendorName: vendor.name, productId: created.id, productName: created.name }, req.ip).catch(() => {});
  res.status(201).json(fmtProduct(created, vendor));
});

router.put("/vial/seller/products/:id", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const [existing] = await db.select().from(vialProductsTable)
    .where(and(eq(vialProductsTable.id, req.params.id), eq(vialProductsTable.vendorId, vendor.id)));
  if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
  const { name, description, category, mgSize, price, currency, stock, manufacturer, batchNumber, labReportUrl, imageUrl, active } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (category !== undefined) updates.category = category ? String(category).trim() : null;
  if (mgSize !== undefined) updates.mgSize = mgSize ? String(mgSize).trim() : null;
  if (currency !== undefined) updates.currency = String(currency).trim().toUpperCase() || "USDT";
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "Invalid price" }); return; }
    updates.price = p.toFixed(2);
  }
  if (stock !== undefined) updates.stock = Math.max(0, parseInt(stock) || 0);
  if (manufacturer !== undefined) updates.manufacturer = manufacturer ? String(manufacturer).trim() : null;
  if (batchNumber !== undefined) updates.batchNumber = batchNumber ? String(batchNumber).trim() : null;
  if (labReportUrl !== undefined) updates.labReportUrl = labReportUrl ? String(labReportUrl).trim() : null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl ? String(imageUrl).trim() : null;
  if (active !== undefined) updates.active = Boolean(active);
  const [updated] = await db.update(vialProductsTable).set(updates)
    .where(and(eq(vialProductsTable.id, req.params.id), eq(vialProductsTable.vendorId, vendor.id)))
    .returning();
  writeLog("seller", "info", "seller_product_update", `Seller "${vendor.name}" updated product "${updated.name}"`, { vendorId: vendor.id, vendorName: vendor.name, productId: updated.id, productName: updated.name }, req.ip).catch(() => {});
  res.json(fmtProduct(updated, vendor));
});

router.delete("/vial/seller/products/:id", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const [existing] = await db.select().from(vialProductsTable)
    .where(and(eq(vialProductsTable.id, req.params.id), eq(vialProductsTable.vendorId, vendor.id)));
  if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
  await db.update(vialProductsTable).set({ active: false })
    .where(and(eq(vialProductsTable.id, req.params.id), eq(vialProductsTable.vendorId, vendor.id)));
  writeLog("seller", "info", "seller_product_delete", `Seller "${vendor.name}" removed product "${existing.name}"`, { vendorId: vendor.id, vendorName: vendor.name, productId: existing.id, productName: existing.name }, req.ip).catch(() => {});
  res.json({ ok: true });
});

router.get("/vial/seller/orders", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const vendorProducts = await db.select({ id: vialProductsTable.id })
    .from(vialProductsTable).where(eq(vialProductsTable.vendorId, vendor.id));
  const productIds = vendorProducts.map(p => p.id);
  if (!productIds.length) { res.json([]); return; }
  const orderItems = await db.select().from(vialOrderItemsTable)
    .where(inArray(vialOrderItemsTable.productId, productIds));
  const orderIds = [...new Set(orderItems.map(i => i.orderId))];
  if (!orderIds.length) { res.json([]); return; }
  const orders = await db.select().from(vialOrdersTable)
    .where(inArray(vialOrdersTable.id, orderIds))
    .orderBy(desc(vialOrdersTable.createdAt));
  const allItems = await db.select().from(vialOrderItemsTable)
    .where(inArray(vialOrderItemsTable.orderId, orderIds));
  res.json(orders.map(o => fmtOrder(o, allItems.filter(i => i.orderId === o.id))));
});

router.post("/vial/seller/orders/:id/accept", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const [order] = await db.select().from(vialOrdersTable).where(eq(vialOrdersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const vendorProducts = await db.select({ id: vialProductsTable.id })
    .from(vialProductsTable).where(eq(vialProductsTable.vendorId, vendor.id));
  const orderItems = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, order.id));
  const vendorProductIds = new Set(vendorProducts.map(p => p.id));
  const hasItems = orderItems.some(i => vendorProductIds.has(i.productId));
  if (!hasItems) { res.status(403).json({ error: "Order does not contain your products" }); return; }
  if ((order.orderStatus ?? "accepted") !== "pending_acceptance") {
    res.status(400).json({ error: "Order is not pending acceptance" }); return;
  }
  const [updated] = await db.update(vialOrdersTable)
    .set({ orderStatus: "accepted" })
    .where(eq(vialOrdersTable.id, order.id)).returning();
  const items = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, order.id));
  writeLog("seller", "info", "seller_order_accept", `Seller "${vendor.name}" accepted order ${order.code}`, { vendorId: vendor.id, vendorName: vendor.name, orderId: order.id, orderCode: order.code }, req.ip).catch(() => {});
  res.json(fmtOrder(updated, items));
});

router.post("/vial/seller/orders/:id/reject", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const [order] = await db.select().from(vialOrdersTable).where(eq(vialOrdersTable.id, req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const vendorProducts = await db.select({ id: vialProductsTable.id })
    .from(vialProductsTable).where(eq(vialProductsTable.vendorId, vendor.id));
  const orderItems = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, order.id));
  const vendorProductIds = new Set(vendorProducts.map(p => p.id));
  const hasItems = orderItems.some(i => vendorProductIds.has(i.productId));
  if (!hasItems) { res.status(403).json({ error: "Order does not contain your products" }); return; }
  if ((order.orderStatus ?? "accepted") !== "pending_acceptance") {
    res.status(400).json({ error: "Order is not pending acceptance" }); return;
  }
  const [updated] = await db.update(vialOrdersTable)
    .set({ orderStatus: "rejected" })
    .where(eq(vialOrdersTable.id, order.id)).returning();
  const items = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, order.id));
  writeLog("seller", "warn", "seller_order_reject", `Seller "${vendor.name}" rejected order ${order.code}`, { vendorId: vendor.id, vendorName: vendor.name, orderId: order.id, orderCode: order.code }, req.ip).catch(() => {});
  res.json(fmtOrder(updated, items));
});

router.get("/vial/seller/profile", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  res.json(fmtVendor(vendor, 0));
});

router.get("/vial/seller/shop-config", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const membersOnly = (await getConfig("shop_members_only")) === "true";
  res.json({ membersOnly });
});

router.patch("/vial/seller/shop-config", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const { membersOnly } = req.body;
  if (typeof membersOnly !== "boolean") { res.status(400).json({ error: "membersOnly (boolean) is required" }); return; }
  const value = membersOnly ? "true" : "false";
  const now = new Date();
  await db.insert(siteConfigTable)
    .values({ key: "shop_members_only", value, updatedAt: now })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value, updatedAt: now } });
  res.json({ membersOnly });
});

router.put("/vial/seller/profile", async (req, res): Promise<void> => {
  const vendor = await requireSeller(req, res);
  if (!vendor) return;
  const { tagline, description, shipsTo, country, walletAddress, revolutLink, paypalLink } = req.body;
  const [updated] = await db.update(vialVendorsTable)
    .set({
      tagline: tagline !== undefined ? (tagline?.trim() || null) : vendor.tagline,
      description: description !== undefined ? (description?.trim() || null) : vendor.description,
      shipsTo: shipsTo !== undefined ? (shipsTo?.trim() || null) : vendor.shipsTo,
      country: country !== undefined ? (country?.trim() || null) : vendor.country,
      walletAddress: walletAddress !== undefined ? (walletAddress?.trim() || null) : vendor.walletAddress,
      revolutLink: revolutLink !== undefined ? (revolutLink?.trim() || null) : vendor.revolutLink,
      paypalLink: paypalLink !== undefined ? (paypalLink?.trim() || null) : vendor.paypalLink,
    })
    .where(eq(vialVendorsTable.id, vendor.id))
    .returning();
  res.json(fmtVendor(updated, 0));
});

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════

router.get("/admin/vial/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const products = await db.select().from(vialProductsTable).orderBy(vialProductsTable.sortOrder, vialProductsTable.createdAt);
  const vendorIds = [...new Set(products.map(p => p.vendorId).filter(Boolean))] as string[];
  const vendors = vendorIds.length
    ? await db.select().from(vialVendorsTable).where(inArray(vialVendorsTable.id, vendorIds))
    : [];
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
  res.json(products.map(p => fmtProduct(p, p.vendorId ? vendorMap[p.vendorId] : undefined)));
});

router.post("/admin/vial/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, description, category, mgSize, price, currency, stock, manufacturer, batchNumber, labReportUrl, imageUrl, active, sortOrder, vendorId } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: "name and price required" }); return; }
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) { res.status(400).json({ error: "Invalid price" }); return; }
  const [created] = await db.insert(vialProductsTable).values({
    id: randomUUID(), name: String(name).trim(),
    description: description ? String(description).trim() : null,
    category: category ? String(category).trim() : null,
    mgSize: mgSize ? String(mgSize).trim() : null,
    price: p.toFixed(2),
    currency: currency ? String(currency).trim().toUpperCase() : "USDT",
    stock: parseInt(stock) || 0,
    manufacturer: manufacturer ? String(manufacturer).trim() : null,
    batchNumber: batchNumber ? String(batchNumber).trim() : null,
    labReportUrl: labReportUrl ? String(labReportUrl).trim() : null,
    imageUrl: imageUrl ? String(imageUrl).trim() : null,
    active: active !== false,
    sortOrder: sortOrder ? parseInt(sortOrder) : null,
    vendorId: vendorId || null,
  }).returning();
  res.status(201).json(fmtProduct(created));
});

router.put("/admin/vial/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, description, category, mgSize, price, currency, stock, manufacturer, batchNumber, labReportUrl, imageUrl, active, sortOrder, vendorId } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (category !== undefined) updates.category = category ? String(category).trim() : null;
  if (mgSize !== undefined) updates.mgSize = mgSize ? String(mgSize).trim() : null;
  if (vendorId !== undefined) updates.vendorId = vendorId || null;
  if (currency !== undefined) updates.currency = String(currency).trim().toUpperCase() || "USDT";
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { res.status(400).json({ error: "Invalid price" }); return; }
    updates.price = p.toFixed(2);
  }
  if (stock !== undefined) updates.stock = Math.max(0, parseInt(stock) || 0);
  if (manufacturer !== undefined) updates.manufacturer = manufacturer ? String(manufacturer).trim() : null;
  if (batchNumber !== undefined) updates.batchNumber = batchNumber ? String(batchNumber).trim() : null;
  if (labReportUrl !== undefined) updates.labReportUrl = labReportUrl ? String(labReportUrl).trim() : null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl ? String(imageUrl).trim() : null;
  if (active !== undefined) updates.active = Boolean(active);
  if (sortOrder !== undefined) updates.sortOrder = sortOrder !== null ? parseInt(sortOrder) : null;
  const [updated] = await db.update(vialProductsTable).set(updates).where(eq(vialProductsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(fmtProduct(updated));
});

router.delete("/admin/vial/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(vialProductsTable).where(eq(vialProductsTable.id, req.params.id));
  res.json({ ok: true });
});

router.get("/admin/vial/vendors", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const vendors = await db.select().from(vialVendorsTable).orderBy(vialVendorsTable.sortOrder, vialVendorsTable.createdAt);
  const products = await db.select().from(vialProductsTable);
  res.json(vendors.map(v => fmtVendor(v, products.filter(p => p.vendorId === v.id).length)));
});

router.post("/admin/vial/vendors", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, tagline, description, contactTelegram, telegramChatId, logoUrl, shipsTo, country, rating, active, sortOrder, sellerPassword, walletAddress, revolutLink, paypalLink, notifyVendor } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  const [created] = await db.insert(vialVendorsTable).values({
    id: randomUUID(), name: String(name).trim(),
    tagline: tagline ? String(tagline).trim() : null,
    description: description ? String(description).trim() : null,
    contactTelegram: contactTelegram ? String(contactTelegram).replace(/^@/, "").trim() : null,
    telegramChatId: telegramChatId ? String(telegramChatId).trim() : null,
    logoUrl: logoUrl ? String(logoUrl).trim() : null,
    shipsTo: shipsTo ? String(shipsTo).trim() : null,
    country: country ? String(country).trim() : null,
    rating: rating ? parseFloat(rating).toFixed(2) : null,
    sellerPasswordHash: sellerPassword ? hashPassword(String(sellerPassword)) : null,
    walletAddress: walletAddress ? String(walletAddress).trim() : null,
    revolutLink: revolutLink ? String(revolutLink).trim() : null,
    paypalLink: paypalLink ? String(paypalLink).trim() : null,
    notifyVendor: notifyVendor !== false,
    active: active !== false,
    sortOrder: sortOrder ? parseInt(sortOrder) : null,
  }).returning();

  createAlert("seller", "medium", "New Seller",
    `New seller registration: ${created.name}`,
    { linkUrl: `#vialshop`, relatedEntityId: created.id },
  ).catch(() => {});

  res.status(201).json(fmtVendor(created, 0));
});

router.put("/admin/vial/vendors/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, tagline, description, contactTelegram, telegramChatId, logoUrl, shipsTo, country, rating, active, sortOrder, sellerPassword, walletAddress, revolutLink, paypalLink, notifyVendor } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (tagline !== undefined) updates.tagline = tagline ? String(tagline).trim() : null;
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (contactTelegram !== undefined) updates.contactTelegram = contactTelegram ? String(contactTelegram).replace(/^@/, "").trim() : null;
  if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId ? String(telegramChatId).trim() : null;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl ? String(logoUrl).trim() : null;
  if (shipsTo !== undefined) updates.shipsTo = shipsTo ? String(shipsTo).trim() : null;
  if (country !== undefined) updates.country = country ? String(country).trim() : null;
  if (rating !== undefined) updates.rating = rating !== null && rating !== "" ? parseFloat(rating).toFixed(2) : null;
  if (sellerPassword !== undefined && sellerPassword !== "") updates.sellerPasswordHash = hashPassword(String(sellerPassword));
  if (walletAddress !== undefined) updates.walletAddress = walletAddress ? String(walletAddress).trim() : null;
  if (revolutLink !== undefined) updates.revolutLink = revolutLink ? String(revolutLink).trim() : null;
  if (paypalLink !== undefined) updates.paypalLink = paypalLink ? String(paypalLink).trim() : null;
  if (notifyVendor !== undefined) updates.notifyVendor = Boolean(notifyVendor);
  if (active !== undefined) updates.active = Boolean(active);
  if (sortOrder !== undefined) updates.sortOrder = sortOrder !== null ? parseInt(sortOrder) : null;
  const [updated] = await db.update(vialVendorsTable).set(updates).where(eq(vialVendorsTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(fmtVendor(updated));
});

router.delete("/admin/vial/vendors/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(vialVendorsTable).where(eq(vialVendorsTable.id, req.params.id));
  res.json({ ok: true });
});

router.get("/admin/vial/discount-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const codes = await db.select().from(vialDiscountCodesTable).orderBy(desc(vialDiscountCodesTable.createdAt));
  res.json(codes.map(fmtCode));
});

router.post("/admin/vial/discount-codes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, active, notes } = req.body;
  if (!code?.trim() || !discountType || discountValue === undefined) {
    res.status(400).json({ error: "code, discountType, discountValue required" }); return;
  }
  if (!["percent", "fixed"].includes(discountType)) { res.status(400).json({ error: "discountType must be percent or fixed" }); return; }
  const [created] = await db.insert(vialDiscountCodesTable).values({
    id: randomUUID(), code: String(code).trim().toUpperCase(),
    discountType: String(discountType),
    discountValue: parseFloat(discountValue).toFixed(2),
    minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount).toFixed(2) : null,
    maxUses: maxUses ? parseInt(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: active !== false,
    notes: notes ? String(notes).trim() : null,
  }).returning();
  res.status(201).json(fmtCode(created));
});

router.put("/admin/vial/discount-codes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { discountType, discountValue, minOrderAmount, maxUses, expiresAt, active, notes } = req.body;
  const updates: any = {};
  if (discountType !== undefined) {
    if (!["percent", "fixed"].includes(discountType)) { res.status(400).json({ error: "discountType must be percent or fixed" }); return; }
    updates.discountType = discountType;
  }
  if (discountValue !== undefined) updates.discountValue = parseFloat(discountValue).toFixed(2);
  if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount ? parseFloat(minOrderAmount).toFixed(2) : null;
  if (maxUses !== undefined) updates.maxUses = maxUses ? parseInt(maxUses) : null;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (active !== undefined) updates.active = Boolean(active);
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;
  const [updated] = await db.update(vialDiscountCodesTable).set(updates)
    .where(eq(vialDiscountCodesTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Code not found" }); return; }
  res.json(fmtCode(updated));
});

router.delete("/admin/vial/discount-codes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(vialDiscountCodesTable).where(eq(vialDiscountCodesTable.id, req.params.id));
  res.json({ ok: true });
});

router.get("/admin/vial/orders", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const orders = await db.select().from(vialOrdersTable).orderBy(desc(vialOrdersTable.createdAt));
  const orderIds = orders.map(o => o.id);
  const items = orderIds.length
    ? await db.select().from(vialOrderItemsTable).where(inArray(vialOrderItemsTable.orderId, orderIds))
    : [];
  const itemsByOrder = Object.fromEntries(orders.map(o => [o.id, items.filter(i => i.orderId === o.id)]));
  res.json(orders.map(o => fmtOrder(o, itemsByOrder[o.id] || [])));
});

router.put("/admin/vial/orders/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { status, adminNotes, paymentStatus } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = String(status);
  if (adminNotes !== undefined) updates.adminNotes = adminNotes ? String(adminNotes).trim() : null;
  if (paymentStatus !== undefined) updates.paymentStatus = String(paymentStatus);
  const [updated] = await db.update(vialOrdersTable).set(updates)
    .where(eq(vialOrdersTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  const items = await db.select().from(vialOrderItemsTable).where(eq(vialOrderItemsTable.orderId, updated.id));
  res.json(fmtOrder(updated, items));
});

// ══════════════════════════════════════════════════════════════
// ADMIN — MANUFACTURERS
// ══════════════════════════════════════════════════════════════

router.get("/admin/vial/manufacturers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(vialManufacturersTable).orderBy(vialManufacturersTable.name);
  res.json(rows);
});

router.post("/admin/vial/manufacturers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, country, website, notes, active } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  const [created] = await db.insert(vialManufacturersTable).values({
    id: randomUUID(),
    name: String(name).trim(),
    country: country ? String(country).trim() : null,
    website: website ? String(website).trim() : null,
    notes: notes ? String(notes).trim() : null,
    active: active !== false,
  }).returning();
  res.status(201).json(created);
});

router.put("/admin/vial/manufacturers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, country, website, notes, active } = req.body;
  const updates: Partial<{ name: string; country: string | null; website: string | null; notes: string | null; active: boolean }> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (country !== undefined) updates.country = country ? String(country).trim() : null;
  if (website !== undefined) updates.website = website ? String(website).trim() : null;
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;
  if (active !== undefined) updates.active = Boolean(active);
  const [updated] = await db.update(vialManufacturersTable).set(updates)
    .where(eq(vialManufacturersTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Manufacturer not found" }); return; }
  res.json(updated);
});

router.delete("/admin/vial/manufacturers/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(vialManufacturersTable).where(eq(vialManufacturersTable.id, req.params.id));
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// ADMIN — SELLERS (tracking panel)
// ══════════════════════════════════════════════════════════════

router.get("/admin/vial/sellers", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const vendors = await db.select().from(vialVendorsTable).orderBy(vialVendorsTable.sortOrder, vialVendorsTable.createdAt);
  const products = await db.select().from(vialProductsTable);
  const orders = await db.select().from(vialOrdersTable);
  const orderItems = await db.select().from(vialOrderItemsTable);
  const loginLogs = await db.select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.action, "seller_login"))
    .orderBy(desc(auditLogsTable.createdAt));

  const result = vendors.map(v => {
    const vendorProducts = products.filter(p => p.vendorId === v.id);
    const vendorProductIds = new Set(vendorProducts.map(p => p.id));
    const confirmedOrderIds = new Set(orders.filter(o => o.paymentStatus === "confirmed").map(o => o.id));
    const vendorItems = orderItems.filter(i => vendorProductIds.has(i.productId));
    const confirmedItems = vendorItems.filter(i => confirmedOrderIds.has(i.orderId));
    const revenue = confirmedItems.reduce((sum, i) => sum + parseFloat(i.lineTotal), 0);
    const uniqueOrderIds = new Set(vendorItems.map(i => i.orderId));
    const lastLoginLog = loginLogs.find(l => {
      const meta = l.metadata as Record<string, unknown> | null;
      return meta?.vendorId === v.id;
    });
    return {
      ...fmtVendor(v, vendorProducts.length),
      activeProductCount: vendorProducts.filter(p => p.active).length,
      totalRevenue: parseFloat(revenue.toFixed(2)),
      totalOrders: uniqueOrderIds.size,
      lastLogin: lastLoginLog?.createdAt ?? null,
    };
  });
  res.json(result);
});

router.get("/admin/vial/sellers/:id/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const products = await db.select().from(vialProductsTable)
    .where(eq(vialProductsTable.vendorId, req.params.id))
    .orderBy(vialProductsTable.sortOrder, vialProductsTable.createdAt);
  const [vendor] = await db.select().from(vialVendorsTable).where(eq(vialVendorsTable.id, req.params.id));
  res.json(products.map(p => fmtProduct(p, vendor)));
});

router.get("/admin/vial/sellers/:id/sales", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const vendorProducts = await db.select({ id: vialProductsTable.id })
    .from(vialProductsTable).where(eq(vialProductsTable.vendorId, req.params.id));
  const productIds = vendorProducts.map(p => p.id);
  if (!productIds.length) { res.json([]); return; }
  const items = await db.select().from(vialOrderItemsTable)
    .where(inArray(vialOrderItemsTable.productId, productIds));
  const orderIds = [...new Set(items.map(i => i.orderId))];
  if (!orderIds.length) { res.json([]); return; }
  const orders = await db.select().from(vialOrdersTable)
    .where(inArray(vialOrdersTable.id, orderIds))
    .orderBy(desc(vialOrdersTable.createdAt));
  const allItems = await db.select().from(vialOrderItemsTable)
    .where(inArray(vialOrderItemsTable.orderId, orderIds));
  res.json(orders.map(o => fmtOrder(o, allItems.filter(i => i.orderId === o.id))));
});

router.get("/admin/vial/sellers/:id/activity", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const vendorId = req.params.id;
  const logs = await db.select()
    .from(auditLogsTable)
    .where(and(
      eq(auditLogsTable.type, "seller"),
      sql`(${auditLogsTable.metadata}->>'vendorId') = ${vendorId}`,
    ))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(200);
  res.json(logs);
});

router.put("/admin/vial/sellers/:id/password", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { newPassword } = req.body;
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const [seller] = await db.select().from(vialVendorsTable)
    .where(eq(vialVendorsTable.id, req.params.id));
  if (!seller || !seller.sellerPasswordHash) {
    res.status(404).json({ error: "Seller account not found" });
    return;
  }
  await db.update(vialVendorsTable).set({
    sellerPasswordHash: hashPassword(newPassword),
    resetCode: null,
    resetCodeExpiresAt: null,
  }).where(eq(vialVendorsTable.id, seller.id));
  writeLog("seller", "warn", "seller_password_reset_by_admin",
    `Seller password reset by admin: ${seller.name}`,
    { vendorId: seller.id, vendorName: seller.name }, req.ip).catch(() => {});
  res.json({ ok: true, message: "Seller password updated successfully." });
});

// POST /api/vial/seller/forgot-password
// Sends a 6-digit OTP to the seller's linked Telegram chat ID.
router.post("/vial/seller/forgot-password", async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Store name is required" });
    return;
  }

  const vendors = await db.select()
    .from(vialVendorsTable)
    .where(sql`lower(${vialVendorsTable.name}) = lower(${name.trim()})`);
  const vendor = vendors[0];

  if (!vendor) {
    await new Promise(r => setTimeout(r, 400));
    res.json({ ok: true, message: "If a store with that name exists and has Telegram linked, a reset code has been sent." });
    return;
  }

  if (!vendor.telegramChatId) {
    res.status(422).json({ error: "This store account doesn't have a Telegram chat linked. Contact admin for assistance." });
    return;
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.update(vialVendorsTable)
    .set({ resetCode: codeHash, resetCodeExpiresAt: expiresAt })
    .where(eq(vialVendorsTable.id, vendor.id));

  await sendTelegramMessage(
    vendor.telegramChatId,
    `🔐 <b>Seller Password Reset</b>\n\nYour one-time reset code for <b>${vendor.name}</b> is:\n\n<code>${code}</code>\n\nThis code expires in <b>10 minutes</b>. If you didn't request this, please ignore it.`,
    "HTML",
  );

  writeLog("seller", "info", "seller_password_reset_requested",
    `Password reset code sent for seller: ${vendor.name}`,
    { vendorId: vendor.id, vendorName: vendor.name },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, message: "If a store with that name exists and has Telegram linked, a reset code has been sent." });
});

// POST /api/vial/seller/reset-password
// Verifies the OTP and sets a new seller password.
router.post("/vial/seller/reset-password", async (req, res): Promise<void> => {
  const { name, code, newPassword } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Store name is required" });
    return;
  }
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Reset code is required" });
    return;
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const vendors = await db.select()
    .from(vialVendorsTable)
    .where(sql`lower(${vialVendorsTable.name}) = lower(${name.trim()})`);
  const vendor = vendors[0];

  if (!vendor?.resetCode || !vendor.resetCodeExpiresAt) {
    res.status(400).json({ error: "No reset code found. Please request a new one." });
    return;
  }

  if (vendor.resetCodeExpiresAt < new Date()) {
    res.status(400).json({ error: "Reset code has expired. Please request a new one." });
    return;
  }

  const codeHash = createHash("sha256").update(code.trim()).digest("hex");
  if (codeHash !== vendor.resetCode) {
    res.status(400).json({ error: "Invalid reset code." });
    return;
  }

  const newHash = hashPassword(newPassword);

  await db.update(vialVendorsTable)
    .set({ sellerPasswordHash: newHash, resetCode: null, resetCodeExpiresAt: null })
    .where(eq(vialVendorsTable.id, vendor.id));

  writeLog("seller", "info", "seller_password_reset_completed",
    `Password reset completed for seller: ${vendor.name}`,
    { vendorId: vendor.id, vendorName: vendor.name },
    req.ip,
  ).catch(() => {});

  res.json({ ok: true, message: "Password updated successfully." });
});

export default router;

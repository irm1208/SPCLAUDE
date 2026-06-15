import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteConfigTable, ruleAcceptancesTable, accountsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { invalidateTelegramCache, getTelegramStatus, sendAdminTestMessage, setWebhook, buildWebhookUrl } from "../lib/telegram";

const router: IRouter = Router();

async function getConfigValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

async function setConfigValue(key: string, value: string) {
  await db
    .insert(siteConfigTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}

function requireAdmin(req: any, res: any): boolean {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env["ADMIN_SECRET"]) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const DEFAULT_DELIVERY_TIPS = [
  "Use your **full legal name** as it appears on your letterbox",
  "Include a **flat/apartment number** if applicable",
  "Double-check your **postcode** — this affects routing",
  "All parcels arrive in **plain, unmarked packaging**",
  "Add your **phone and email** so couriers can reach you if needed",
];

async function getDeliveryTips(): Promise<{ enabled: boolean; items: string[] }> {
  const [enabledRaw, itemsRaw] = await Promise.all([
    getConfigValue("delivery_tips_enabled"),
    getConfigValue("delivery_tips_items"),
  ]);
  const enabled = enabledRaw === null ? true : enabledRaw === "true";
  let items = DEFAULT_DELIVERY_TIPS;
  if (itemsRaw) {
    try { items = JSON.parse(itemsRaw) as string[]; } catch { /* use default */ }
  }
  return { enabled, items };
}

router.get("/config", async (_req, res): Promise<void> => {
  const vendorShipping = process.env["VENDOR_SHIPPING_PRICE"]
    ? parseFloat(process.env["VENDOR_SHIPPING_PRICE"])
    : 0;

  const pinEnabled = !!process.env["ORDER_PIN"];

  const [
    rawWarning, groupBuysPageMessage, wholesalePageMessage,
    rawWholesaleApproval, rawAdminFeeEnabled, rawAdminFeeAmount,
    rawAdminFeeCountries, rawSignupRequiresInvite, deliveryTips,
  ] = await Promise.all([
    getConfigValue("vendorShippingWarning"),
    getConfigValue("groupBuysPageMessage"),
    getConfigValue("wholesale_page_message"),
    getConfigValue("wholesale_requires_approval"),
    getConfigValue("shipping_admin_fee_enabled"),
    getConfigValue("shipping_admin_fee_amount"),
    getConfigValue("shipping_admin_fee_countries"),
    getConfigValue("signup_requires_invite"),
    getDeliveryTips(),
  ]);

  const vendorShippingWarning = rawWarning === null ? true : rawWarning === "true";
  const wholesaleRequiresApproval = rawWholesaleApproval === "true";
  const shippingAdminFeeEnabled = rawAdminFeeEnabled === "true";
  const shippingAdminFeeAmount = rawAdminFeeAmount ? parseFloat(rawAdminFeeAmount) : 10;
  const shippingAdminFeeCountries: string[] = rawAdminFeeCountries
    ? (() => { try { return JSON.parse(rawAdminFeeCountries); } catch { return []; } })()
    : [];
  const signupRequiresInvite = rawSignupRequiresInvite === "true";

  res.json({
    vendorShipping,
    currency: "USD",
    pinEnabled,
    vendorShippingWarning,
    groupBuysPageMessage: groupBuysPageMessage ?? null,
    wholesalePageMessage: wholesalePageMessage ?? null,
    wholesaleRequiresApproval,
    shippingAdminFeeEnabled,
    shippingAdminFeeAmount,
    shippingAdminFeeCountries,
    signupRequiresInvite,
    deliveryTipsEnabled: deliveryTips.enabled,
    deliveryTipsItems: deliveryTips.items,
  });
});

// ─── GET /api/admin/delivery-tips ────────────────────────────────────────────
router.get("/admin/delivery-tips", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  res.json(await getDeliveryTips());
});

// ─── PATCH /api/admin/delivery-tips ──────────────────────────────────────────
router.patch("/admin/delivery-tips", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { enabled, items } = req.body as { enabled?: boolean; items?: string[] };
  if (enabled !== undefined) {
    await setConfigValue("delivery_tips_enabled", enabled ? "true" : "false");
  }
  if (items !== undefined) {
    if (!Array.isArray(items) || !items.every(i => typeof i === "string")) {
      res.status(400).json({ error: "items must be an array of strings" });
      return;
    }
    await setConfigValue("delivery_tips_items", JSON.stringify(items));
  }
  res.json(await getDeliveryTips());
});

router.patch("/admin/group-buys-page-message", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { message } = req.body as { message?: string };
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (trimmed) {
    await setConfigValue("groupBuysPageMessage", trimmed);
  } else {
    await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "groupBuysPageMessage"));
  }
  res.json({ groupBuysPageMessage: trimmed || null });
});

router.post("/verify-pin", (req, res): void => {
  const { pin } = req.body;
  const expectedPin = process.env["ORDER_PIN"];

  if (!expectedPin) {
    res.json({ valid: true });
    return;
  }

  if (!pin || String(pin).trim() !== String(expectedPin).trim()) {
    res.json({ valid: false });
    return;
  }

  res.json({ valid: true });
});

router.patch("/admin/vendor-shipping-warning", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be boolean" });
    return;
  }
  await setConfigValue("vendorShippingWarning", enabled ? "true" : "false");
  res.json({ vendorShippingWarning: enabled });
});

router.get("/admin/telegram-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const status = await getTelegramStatus();
  res.json(status);
});

router.put("/admin/telegram-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { botToken, adminChatId } = req.body as { botToken?: string; adminChatId?: string };
  if (botToken !== undefined) {
    const trimmed = String(botToken).trim();
    if (trimmed) await setConfigValue("telegramBotToken", trimmed);
    else {
      await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "telegramBotToken"));
    }
  }
  if (adminChatId !== undefined) {
    const trimmed = String(adminChatId).trim();
    if (trimmed) await setConfigValue("telegramAdminChatId", trimmed);
    else {
      await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "telegramAdminChatId"));
    }
  }
  invalidateTelegramCache();
  const status = await getTelegramStatus();
  res.json(status);
});

router.post("/admin/telegram-config/test", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const result = await sendAdminTestMessage();
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});

router.post("/admin/telegram-config/register-webhook", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  // Derive domain: PUBLIC_URL wins (production custom domain), then REPLIT_DEV_DOMAIN (dev), then request Host
  const envDomain = process.env["PUBLIC_URL"] ?? process.env["REPLIT_DEV_DOMAIN"] ?? "";
  const requestHost = (req.headers["x-forwarded-host"] as string | undefined)
    ?? req.get("host")
    ?? "";
  const domain = envDomain || requestHost;
  if (!domain) {
    res.status(400).json({ error: "No public domain configured. Set REPLIT_DEV_DOMAIN or PUBLIC_URL." });
    return;
  }
  const webhookUrl = buildWebhookUrl(domain);
  const ok = await setWebhook(webhookUrl);
  if (!ok) {
    res.status(502).json({ error: "Failed to register webhook with Telegram. Check that the bot token is valid." });
    return;
  }
  res.json({ ok: true, webhookUrl });
});

// ─── GET /api/admin/shipping-config ────────────────────────────
router.get("/admin/shipping-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rawEnabled = await getConfigValue("shipping_admin_fee_enabled");
  const rawAmount = await getConfigValue("shipping_admin_fee_amount");
  const rawCountries = await getConfigValue("shipping_admin_fee_countries");
  res.json({
    adminFeeEnabled: rawEnabled === "true",
    adminFeeAmount: rawAmount ? parseFloat(rawAmount) : 10,
    adminFeeCountries: rawCountries
      ? (() => { try { return JSON.parse(rawCountries); } catch { return []; } })()
      : [],
  });
});

// ─── PATCH /api/admin/shipping-config ──────────────────────────
router.patch("/admin/shipping-config", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { adminFeeEnabled, adminFeeAmount, adminFeeCountries } = req.body as {
    adminFeeEnabled?: boolean;
    adminFeeAmount?: number | string;
    adminFeeCountries?: string[];
  };

  if (adminFeeEnabled !== undefined) {
    await setConfigValue("shipping_admin_fee_enabled", Boolean(adminFeeEnabled) ? "true" : "false");
  }
  if (adminFeeAmount !== undefined) {
    const amount = parseFloat(String(adminFeeAmount));
    if (!isNaN(amount) && amount >= 0) {
      await setConfigValue("shipping_admin_fee_amount", amount.toFixed(2));
    }
  }
  if (adminFeeCountries !== undefined) {
    if (!Array.isArray(adminFeeCountries) || !adminFeeCountries.every(c => typeof c === "string")) {
      res.status(400).json({ error: "adminFeeCountries must be an array of strings" });
      return;
    }
    await setConfigValue("shipping_admin_fee_countries", JSON.stringify(adminFeeCountries));
  }

  const updatedEnabled = await getConfigValue("shipping_admin_fee_enabled");
  const updatedAmount = await getConfigValue("shipping_admin_fee_amount");
  const updatedCountries = await getConfigValue("shipping_admin_fee_countries");
  res.json({
    adminFeeEnabled: updatedEnabled === "true",
    adminFeeAmount: updatedAmount ? parseFloat(updatedAmount) : 10,
    adminFeeCountries: updatedCountries
      ? (() => { try { return JSON.parse(updatedCountries); } catch { return []; } })()
      : [],
  });
});

// ─── Wholesale Vendor Shipping ───────────────────────────────────────────────

export interface WholesaleVendorRegion {
  name: string;
  prices?: number[];      // one price per tier (standard tier table)
  priceNote?: string;     // e.g. "80USD/kg" — shown as a single cell spanning all tiers
  customNote?: string;    // multi-line description (e.g. USA complex pricing)
  countries?: string[];   // full country names that auto-select this region on the wholesale page
}

export interface WholesaleVendor {
  id: string;
  name: string;
  tiers: string[];                // column header labels (e.g. ["1–5", "6–10", "11–15", "16–25"])
  tierBounds: number[];           // upper kit-count for each tier (e.g. [5, 10, 15, 25])
  maxKitsPerPackage: number;      // kits before cycling to next package (e.g. 25)
  regions: WholesaleVendorRegion[];
}

async function getVendors(): Promise<WholesaleVendor[]> {
  const raw = await getConfigValue("wholesale_vendors");
  if (!raw) return [];
  try { return JSON.parse(raw) as WholesaleVendor[]; } catch { return []; }
}

async function getActiveVendorId(): Promise<string | null> {
  return getConfigValue("wholesale_active_vendor");
}

// GET /api/wholesale-vendor — returns active vendor for wholesale customers
router.get("/wholesale-vendor", async (_req, res): Promise<void> => {
  const [vendors, activeId] = await Promise.all([getVendors(), getActiveVendorId()]);
  if (!activeId) { res.json(null); return; }
  const vendor = vendors.find(v => v.id === activeId) ?? null;
  res.json(vendor);
});

// GET /api/admin/wholesale-vendors — list all vendors
router.get("/admin/wholesale-vendors", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [vendors, activeId] = await Promise.all([getVendors(), getActiveVendorId()]);
  res.json({ vendors, activeVendorId: activeId });
});

// POST /api/admin/wholesale-vendors — create vendor
router.post("/admin/wholesale-vendors", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, tiers, tierBounds, maxKitsPerPackage, regions } = req.body as Partial<WholesaleVendor>;
  if (!name?.trim() || !Array.isArray(tiers) || !Array.isArray(regions)) {
    res.status(400).json({ error: "name, tiers, and regions are required" }); return;
  }
  const vendors = await getVendors();
  const newVendor: WholesaleVendor = {
    id: Date.now().toString(36),
    name: name.trim(),
    tiers,
    tierBounds: Array.isArray(tierBounds) ? tierBounds : tiers.map((_, i) => (i + 1) * 5),
    maxKitsPerPackage: typeof maxKitsPerPackage === "number" ? maxKitsPerPackage : 25,
    regions,
  };
  vendors.push(newVendor);
  await setConfigValue("wholesale_vendors", JSON.stringify(vendors));
  res.json(newVendor);
});

// PUT /api/admin/wholesale-vendors/:id — update vendor
router.put("/admin/wholesale-vendors/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { name, tiers, tierBounds, maxKitsPerPackage, regions } = req.body as Partial<WholesaleVendor>;
  const vendors = await getVendors();
  const idx = vendors.findIndex(v => v.id === id);
  if (idx === -1) { res.status(404).json({ error: "Vendor not found" }); return; }
  if (name?.trim()) vendors[idx].name = name.trim();
  if (Array.isArray(tiers)) vendors[idx].tiers = tiers;
  if (Array.isArray(tierBounds)) vendors[idx].tierBounds = tierBounds;
  if (typeof maxKitsPerPackage === "number") vendors[idx].maxKitsPerPackage = maxKitsPerPackage;
  if (Array.isArray(regions)) vendors[idx].regions = regions;
  await setConfigValue("wholesale_vendors", JSON.stringify(vendors));
  res.json(vendors[idx]);
});

// DELETE /api/admin/wholesale-vendors/:id — delete vendor
router.delete("/admin/wholesale-vendors/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const vendors = await getVendors();
  const filtered = vendors.filter(v => v.id !== id);
  await setConfigValue("wholesale_vendors", JSON.stringify(filtered));
  const activeId = await getActiveVendorId();
  if (activeId === id) await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_active_vendor"));
  res.json({ ok: true });
});

// PATCH /api/admin/wholesale-vendors/:id/activate — set active vendor
router.patch("/admin/wholesale-vendors/:id/activate", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const vendors = await getVendors();
  if (!vendors.find(v => v.id === id)) { res.status(404).json({ error: "Vendor not found" }); return; }
  await setConfigValue("wholesale_active_vendor", id);
  res.json({ activeVendorId: id });
});

// PATCH /api/admin/wholesale-vendors/deactivate — clear active vendor
router.patch("/admin/wholesale-vendors/deactivate", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_active_vendor"));
  res.json({ activeVendorId: null });
});

// GET /api/admin/wholesale-settings — get approval + page message + payment settings
router.get("/admin/wholesale-settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [requiresApproval, pageMessage, usdtWallet, anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork] = await Promise.all([
    getConfigValue("wholesale_requires_approval"),
    getConfigValue("wholesale_page_message"),
    getConfigValue("wholesale_usdt_wallet"),
    getConfigValue("wholesale_anon_pay_enabled"),
    getConfigValue("wholesale_anon_pay_wallet"),
    getConfigValue("wholesale_anon_pay_ticker"),
    getConfigValue("wholesale_anon_pay_network"),
  ]);
  res.json({
    requiresApproval: requiresApproval === "true",
    pageMessage: pageMessage ?? null,
    usdtWallet: usdtWallet ?? null,
    anonPayEnabled: anonPayEnabled === "true",
    anonPayWallet: anonPayWallet ?? null,
    anonPayTicker: anonPayTicker ?? "usdt",
    anonPayNetwork: anonPayNetwork ?? "ERC20",
  });
});

// PATCH /api/admin/wholesale-settings — update approval + page message + payment settings
router.patch("/admin/wholesale-settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { requiresApproval, pageMessage, usdtWallet, anonPayEnabled, anonPayWallet, anonPayTicker, anonPayNetwork } = req.body as {
    requiresApproval?: boolean;
    pageMessage?: string | null;
    usdtWallet?: string | null;
    anonPayEnabled?: boolean;
    anonPayWallet?: string | null;
    anonPayTicker?: string | null;
    anonPayNetwork?: string | null;
  };
  if (requiresApproval !== undefined) {
    await setConfigValue("wholesale_requires_approval", requiresApproval ? "true" : "false");
  }
  if (pageMessage !== undefined) {
    const trimmed = typeof pageMessage === "string" ? pageMessage.trim() : "";
    if (trimmed) await setConfigValue("wholesale_page_message", trimmed);
    else await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_page_message"));
  }
  if (usdtWallet !== undefined) {
    const trimmed = typeof usdtWallet === "string" ? usdtWallet.trim() : "";
    if (trimmed) await setConfigValue("wholesale_usdt_wallet", trimmed);
    else await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_usdt_wallet"));
  }
  if (anonPayEnabled !== undefined) {
    await setConfigValue("wholesale_anon_pay_enabled", anonPayEnabled ? "true" : "false");
  }
  if (anonPayWallet !== undefined) {
    const trimmed = typeof anonPayWallet === "string" ? anonPayWallet.trim() : "";
    if (trimmed) await setConfigValue("wholesale_anon_pay_wallet", trimmed);
    else await db.delete(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_anon_pay_wallet"));
  }
  if (anonPayTicker !== undefined) {
    const trimmed = typeof anonPayTicker === "string" ? anonPayTicker.trim() : "";
    if (trimmed) await setConfigValue("wholesale_anon_pay_ticker", trimmed);
  }
  if (anonPayNetwork !== undefined) {
    const trimmed = typeof anonPayNetwork === "string" ? anonPayNetwork.trim() : "";
    if (trimmed) await setConfigValue("wholesale_anon_pay_network", trimmed);
  }
  const [ra, pm, uw, ape, apw, apt, apn] = await Promise.all([
    getConfigValue("wholesale_requires_approval"),
    getConfigValue("wholesale_page_message"),
    getConfigValue("wholesale_usdt_wallet"),
    getConfigValue("wholesale_anon_pay_enabled"),
    getConfigValue("wholesale_anon_pay_wallet"),
    getConfigValue("wholesale_anon_pay_ticker"),
    getConfigValue("wholesale_anon_pay_network"),
  ]);
  res.json({
    requiresApproval: ra === "true",
    pageMessage: pm ?? null,
    usdtWallet: uw ?? null,
    anonPayEnabled: ape === "true",
    anonPayWallet: apw ?? null,
    anonPayTicker: apt ?? "usdt",
    anonPayNetwork: apn ?? "ERC20",
  });
});

export type RuleFormat = "standard" | "info" | "warning" | "important";
export interface Rule { id: string; text: string; enabled: boolean; format: RuleFormat; }

const DEFAULT_RULES: Rule[] = [
  { id: "1", text: "Do not share the website (saltandpeps.co.uk) with anyone outside the group.", enabled: true, format: "important" },
  { id: "2", text: "Keep all prices, vendor details, and related information private. Do not share them outside the group.", enabled: true, format: "important" },
  { id: "3", text: "Do not contact the vendor in any way that mentions group buys, our group, saltandpeps website, internal ordering, or shipping to the country.", enabled: true, format: "warning" },
  { id: "4", text: "Do not post in any vendor telegram groups or public groups about our group buys, group orders, or anything related to this group.", enabled: true, format: "warning" },
  { id: "5", text: "Orders should be sensible. Do not over order or spend beyond your means.", enabled: true, format: "standard" },
  { id: "6", text: "Reshippers are chosen by the group in each country. You can pay either the reshipper or the admin. Reshippers handle shipping parcels within their country. If a parcel is seized by customs or returned, and the vendor allows reshipping, the order will be sent again.", enabled: true, format: "info" },
  { id: "7", text: "By placing an order, you agree to follow these rules. If you do not agree, do not take part.", enabled: true, format: "standard" },
];

async function getRulesetVersion(): Promise<number> {
  const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "ruleset_version"));
  return row?.value ? parseInt(row.value, 10) : 1;
}

async function getRulesetRules(): Promise<Rule[]> {
  const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "ruleset_rules"));
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
        return (parsed as string[]).map((text, i) => ({ id: String(i + 1), text, enabled: true, format: "standard" as RuleFormat }));
      }
      return parsed as Rule[];
    } catch { return DEFAULT_RULES; }
  }
  return DEFAULT_RULES;
}

// ── GET /api/site-settings/ruleset — public endpoint ─────────────────────────
router.get("/site-settings/ruleset", async (_req, res): Promise<void> => {
  const [version, rules] = await Promise.all([getRulesetVersion(), getRulesetRules()]);
  res.json({ version, rules: rules.filter(r => r.enabled).map(r => ({ text: r.text, format: r.format })) });
});

// ── GET /api/admin/ruleset — admin: full stats + acceptance list ─────────────
router.get("/admin/ruleset", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const version = await getRulesetVersion();
  const rules = await getRulesetRules();
  const [{ totalMembers }] = await db.select({ totalMembers: count() }).from(accountsTable);
  const [{ totalAccepted }] = await db.select({ totalAccepted: count() }).from(ruleAcceptancesTable).where(eq(ruleAcceptancesTable.version, version));
  const acceptances = await db
    .select({ accountId: ruleAcceptancesTable.accountId, version: ruleAcceptancesTable.version, acceptedAt: ruleAcceptancesTable.acceptedAt })
    .from(ruleAcceptancesTable)
    .orderBy(desc(ruleAcceptancesTable.acceptedAt));
  res.json({ version, rules, totalMembers, totalAccepted, acceptances });
});

// ── PATCH /api/admin/ruleset — admin: update rules and/or bump version ───────
router.patch("/admin/ruleset", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { rules, bumpVersion } = req.body as { rules?: Rule[]; bumpVersion?: boolean };
  if (rules !== undefined) {
    if (!Array.isArray(rules) || rules.length === 0) {
      res.status(400).json({ error: "rules must be a non-empty array" });
      return;
    }
    await setConfigValue("ruleset_rules", JSON.stringify(rules));
  }
  if (bumpVersion) {
    const current = await getRulesetVersion();
    await setConfigValue("ruleset_version", String(current + 1));
  }
  const [version, updatedRules] = await Promise.all([getRulesetVersion(), getRulesetRules()]);
  res.json({ version, rules: updatedRules });
});

export default router;

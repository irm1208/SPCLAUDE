import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  groupBuysTable,
  groupBuyProductsTable,
  groupBuyDeliveryMethodsTable,
  accountGroupBuysTable,
  accountsTable,
  productsTable,
  deliveryMethodsTable,
  ordersTable,
  orderLineItemsTable,
  gbReshippersTable,
  gbCountryLegsTable,
  gbWaitlistTable,
  siteConfigTable,
} from "@workspace/db";
import { eq, and, asc, desc, not, sql, inArray } from "drizzle-orm";
import { requireAccount, getJwtSecret } from "../middleware/account-auth";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const router: IRouter = Router();

import { normalizeToCode, COUNTRY_CODE_TO_NAME } from "../lib/country-utils";

async function isMember(telegramUsername: string, groupBuyId: string): Promise<boolean> {
  const rows = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(
      eq(accountGroupBuysTable.accountId, telegramUsername),
      eq(accountGroupBuysTable.groupBuyId, groupBuyId),
    ));
  return rows.length > 0;
}

// Helper: check if the account is the organiser of a GB (organiserId is a plain-text username)
async function isOrganiserOf(telegramUsername: string, groupBuyId: string): Promise<boolean> {
  const [gb] = await db
    .select({ organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));
  if (!gb?.organiserId) return false;
  const norm = (v: string) => v.trim().toLowerCase().replace(/^@/, "");
  return norm(gb.organiserId) === norm(telegramUsername);
}

// Helper: buyer-view read access — members, or the GB's organiser previewing as a buyer
async function canViewAsBuyer(telegramUsername: string, groupBuyId: string): Promise<boolean> {
  if (await isMember(telegramUsername, groupBuyId)) return true;
  return isOrganiserOf(telegramUsername, groupBuyId);
}

// Helper: check if a GB is visible to a given account (country + blocked account checks)
function gbVisibleToAccount(
  gb: { allowedCountries?: string[] | null; excludedCountries?: string[] | null; blockedAccounts?: string[] | null },
  username: string,
  accountCountry: string | null,
): boolean {
  if (gb.blockedAccounts && gb.blockedAccounts.map(u => u.toLowerCase()).includes(username.toLowerCase())) return false;
  if (accountCountry) {
    const acctCode = normalizeToCode(accountCountry);
    if (gb.allowedCountries && gb.allowedCountries.length > 0) {
      const allowedCodes = gb.allowedCountries.map(normalizeToCode);
      if (!allowedCodes.includes(acctCode)) return false;
    }
    if (gb.excludedCountries && gb.excludedCountries.length > 0) {
      const excludedCodes = gb.excludedCountries.map(normalizeToCode);
      if (excludedCodes.includes(acctCode)) return false;
    }
  }
  return true;
}

// GET /api/group-buys/active — list all active GBs (for the join dropdown)
// GBs marked hiddenFromList are excluded from this list.
// Country restrictions and blocked accounts are also enforced.
router.get("/group-buys/active", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  // Look up the account's country for visibility checks
  const [acctRow] = await db
    .select({ country: accountsTable.country })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));
  const accountCountry = acctRow?.country ?? null;

  const rows = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      invitePinHash: groupBuysTable.invitePinHash,
      allowedCountries: groupBuysTable.allowedCountries,
      excludedCountries: groupBuysTable.excludedCountries,
      blockedAccounts: groupBuysTable.blockedAccounts,
      organiserId: groupBuysTable.organiserId,
      entryFeeEnabled: groupBuysTable.entryFeeEnabled,
      entryFeeAmount: groupBuysTable.entryFeeAmount,
      entryFeeLabel: groupBuysTable.entryFeeLabel,
    })
    .from(groupBuysTable)
    .where(and(
      eq(groupBuysTable.status, "active"),
      not(groupBuysTable.hiddenFromList),
    ));

  // Fetch reshipper country assignments for these GBs
  const gbIds = rows.map(r => r.id);
  const reshipperRows = gbIds.length > 0
    ? await db
        .select({ gbId: gbReshippersTable.gbId, country: gbReshippersTable.country })
        .from(gbReshippersTable)
        .where(inArray(gbReshippersTable.gbId, gbIds))
    : [];

  const reshipperCountriesByGb = new Map<string, string[]>();
  for (const r of reshipperRows) {
    if (!reshipperCountriesByGb.has(r.gbId)) reshipperCountriesByGb.set(r.gbId, []);
    reshipperCountriesByGb.get(r.gbId)!.push(r.country);
  }

  // Also fetch countryLegsEnabled so the join modal knows to show country picker
  const countryLegsEnabledRows = await db
    .select({ id: groupBuysTable.id, countryLegsEnabled: groupBuysTable.countryLegsEnabled })
    .from(groupBuysTable)
    .where(rows.length > 0 ? inArray(groupBuysTable.id, rows.map(r => r.id)) : eq(groupBuysTable.id, "NONE"));
  const countryLegsByGb = new Map(countryLegsEnabledRows.map(r => [r.id, r.countryLegsEnabled]));

  // Filter by country restrictions and blocked accounts
  const visibleRows = rows.filter(r => gbVisibleToAccount(r, tg, accountCountry));

  res.json(visibleRows.map(r => {
    const hasCountryLegs = countryLegsByGb.get(r.id) ?? false;
    return {
      id: r.id,
      name: r.name,
      requiresPin: !!r.invitePinHash,
      allowedCountries: r.allowedCountries ?? null,
      excludedCountries: r.excludedCountries ?? null,
      organiserId: r.organiserId ?? null,
      // When country legs are enabled, reshipper-country visibility doesn't apply —
      // the leg itself controls access. Return empty so the frontend shows it to everyone.
      reshipperCountries: hasCountryLegs ? [] : (reshipperCountriesByGb.get(r.id) ?? []),
      countryLegsEnabled: hasCountryLegs,
      entryFeeEnabled: r.entryFeeEnabled ?? false,
      entryFeeAmount: r.entryFeeAmount != null ? parseFloat(String(r.entryFeeAmount)) : null,
      entryFeeLabel: r.entryFeeLabel ?? null,
    };
  }));
});

// Columns shared between member and forced GB queries
const GB_SELECT_COLS = {
  id: groupBuysTable.id,
  name: groupBuysTable.name,
  description: groupBuysTable.description,
  status: groupBuysTable.status,
  closeDate: groupBuysTable.closeDate,
  manufacturer: groupBuysTable.manufacturer,
  manufacturerCountry: groupBuysTable.manufacturerCountry,
  organiserId: groupBuysTable.organiserId,
  infoCards: groupBuysTable.infoCards,
  currency: groupBuysTable.currency,
  sortOrder: groupBuysTable.sortOrder,
  testingEnabled: groupBuysTable.testingEnabled,
  labTestSupplier: groupBuysTable.labTestSupplier,
  vendorShippingEnabled: groupBuysTable.vendorShippingEnabled,
  vendorShippingMessage: groupBuysTable.vendorShippingMessage,
  vendorShippingAmount: groupBuysTable.vendorShippingAmount,
  paymentMessageEnabled: groupBuysTable.paymentMessageEnabled,
  paymentMessage: groupBuysTable.paymentMessage,
  paymentsEnabled: groupBuysTable.paymentsEnabled,
  shippingOptions: groupBuysTable.shippingOptions,
  allowedCountries: groupBuysTable.allowedCountries,
  excludedCountries: groupBuysTable.excludedCountries,
  blockedAccounts: groupBuysTable.blockedAccounts,
  maxKitsPerCustomer: groupBuysTable.maxKitsPerCustomer,
  maxKitsTotal: groupBuysTable.maxKitsTotal,
  allowHalfKits: groupBuysTable.allowHalfKits,
  allowOrderAddons: groupBuysTable.allowOrderAddons,
  allowEditOrderWhenClosed: groupBuysTable.allowEditOrderWhenClosed,
  allowEditAddressWhenClosed: groupBuysTable.allowEditAddressWhenClosed,
  allowDeleteOrderWhenClosed: groupBuysTable.allowDeleteOrderWhenClosed,
  orderPageMessage: groupBuysTable.orderPageMessage,
  paymentBanner: groupBuysTable.paymentBanner,
  countryLegsEnabled: groupBuysTable.countryLegsEnabled,
  allowReshipperCode: groupBuysTable.allowReshipperCode,
  hidePricesOnInvoice: groupBuysTable.hidePricesOnInvoice,
  hidePricesOnGbViewer: groupBuysTable.hidePricesOnGbViewer,
  hidePricesOnOrderForm: groupBuysTable.hidePricesOnOrderForm,
  hideOrderTotalOnOrderForm: groupBuysTable.hideOrderTotalOnOrderForm,
  adminFeeEnabled: groupBuysTable.adminFeeEnabled,
  adminFeeType: groupBuysTable.adminFeeType,
  adminFeeAmount: groupBuysTable.adminFeeAmount,
  adminFeeLabel: groupBuysTable.adminFeeLabel,
  entryFeeEnabled: groupBuysTable.entryFeeEnabled,
  entryFeeAmount: groupBuysTable.entryFeeAmount,
  entryFeeLabel: groupBuysTable.entryFeeLabel,
  directShippingEnabled: groupBuysTable.directShippingEnabled,
  directShippingPaymentsEnabled: groupBuysTable.directShippingPaymentsEnabled,
  telegramImageUrl: groupBuysTable.telegramImageUrl,
};

async function getProductCount(gbId: string): Promise<number> {
  const c = await db
    .select({ id: groupBuyProductsTable.id })
    .from(groupBuyProductsTable)
    .where(and(
      eq(groupBuyProductsTable.groupBuyId, gbId),
      eq(groupBuyProductsTable.active, true),
    ));
  return c.length;
}

function shapeGb(gb: Record<string, unknown>, productCount: number) {
  return {
    ...gb,
    infoCards: gb["infoCards"] ? (() => { try { return JSON.parse(gb["infoCards"] as string); } catch { return []; } })() : [],
    shippingOptions: gb["shippingOptions"] ? (() => { try { return JSON.parse(gb["shippingOptions"] as string); } catch { return []; } })() : [],
    adminFeeCountries: gb["adminFeeCountries"] ? (() => { try { return JSON.parse(gb["adminFeeCountries"] as string); } catch { return []; } })() : [],
    sharedShippingCountries: gb["sharedShippingCountries"] ? (() => { try { return JSON.parse(gb["sharedShippingCountries"] as string); } catch { return []; } })() : [],
    vendorShippingAmount: gb["vendorShippingAmount"] != null ? parseFloat(String(gb["vendorShippingAmount"])) : null,
    adminFeeAmount: gb["adminFeeAmount"] != null ? parseFloat(String(gb["adminFeeAmount"])) : null,
    entryFeeAmount: gb["entryFeeAmount"] != null ? parseFloat(String(gb["entryFeeAmount"])) : null,
    productCount,
  };
}

// Helper: count kits this user has already ordered for a given GB
async function getUserKitCount(gbId: string, tg: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
    .from(orderLineItemsTable)
    .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(and(
      eq(ordersTable.groupBuyId, gbId),
      eq(ordersTable.telegramUsername, tg),
    ));
  return parseFloat(row?.total ?? "0");
}

// Helper: count total kits ordered for a given GB across all users
async function getTotalKitCount(gbId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)` })
    .from(orderLineItemsTable)
    .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.groupBuyId, gbId));
  return parseFloat(row?.total ?? "0");
}

// GET /api/group-buys — list GBs the logged-in account is a member of, plus any forced GBs
router.get("/group-buys", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  // Member GBs (joined via accountGroupBuysTable)
  const memberRows = await db
    .select({ ...GB_SELECT_COLS, _countryLegId: accountGroupBuysTable.countryLegId })
    .from(accountGroupBuysTable)
    .innerJoin(groupBuysTable, eq(accountGroupBuysTable.groupBuyId, groupBuysTable.id))
    .where(eq(accountGroupBuysTable.accountId, tg));

  const memberIds = new Set(memberRows.map(r => r.id));
  // Build a map of gbId → countryLegId for members
  const memberCountryLegIdMap = new Map<string, string | null>(
    memberRows.map(r => [r.id, r._countryLegId ?? null])
  );

  // Look up account's country for visibility checks
  const [acctRowGb] = await db
    .select({ country: accountsTable.country, archivedGroupBuyIds: accountsTable.archivedGroupBuyIds })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));
  const accountCountryGb = acctRowGb?.country ?? null;
  const archivedGbSet = new Set<string>(acctRowGb?.archivedGroupBuyIds ?? []);

  // Forced GBs — GBs where this customer's username is in the forcedUsernames array
  const forcedRows = await db
    .select(GB_SELECT_COLS)
    .from(groupBuysTable)
    .where(sql`${groupBuysTable.forcedUsernames} @> ${JSON.stringify([tg])}::jsonb`);

  // Deduplicate: exclude forced GBs the user is already a member of.
  // Also apply visibility restrictions — blocked/country-restricted forced GBs are hidden.
  const extraForced = forcedRows.filter(r => !memberIds.has(r.id) && gbVisibleToAccount(r, tg, accountCountryGb));

  const allRows = [...memberRows, ...extraForced];

  const result = await Promise.all(
    allRows.map(async gb => {
      const [productCount, kitsOrderedByUser, kitsOrderedTotal] = await Promise.all([
        getProductCount(gb.id),
        (gb.maxKitsPerCustomer != null || gb.maxKitsTotal != null) ? getUserKitCount(gb.id, tg) : Promise.resolve(0),
        gb.maxKitsTotal != null ? getTotalKitCount(gb.id) : Promise.resolve(0),
      ]);
      return {
        ...shapeGb(gb as Record<string, unknown>, productCount),
        maxKitsPerCustomer: gb.maxKitsPerCustomer ?? null,
        maxKitsTotal: gb.maxKitsTotal ?? null,
        kitsOrderedByUser,
        kitsOrderedTotal,
        countryLegId: memberCountryLegIdMap.get(gb.id) ?? null,
        archived: archivedGbSet.has(gb.id),
      };
    })
  );

  res.json(result);
});

// POST /api/group-buys/:id/archive — hide a GB from the user's personal list (per-account, reversible)
router.post("/group-buys/:id/archive", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!id || id.length > 200) {
    res.status(400).json({ error: "Invalid group buy id" });
    return;
  }
  // Only allow archiving a real group buy (prevents arbitrary-id bloat on the account row)
  const [gb] = await db
    .select({ id: groupBuysTable.id })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));
  if (!gb) {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }
  // Atomic append-if-absent: a single row-locked UPDATE so concurrent archive
  // actions (e.g. bulk-cleaning the list) cannot overwrite each other's changes.
  await db
    .update(accountsTable)
    .set({ archivedGroupBuyIds: sql`${accountsTable.archivedGroupBuyIds} || ${JSON.stringify([id])}::jsonb` })
    .where(and(
      eq(accountsTable.telegramUsername, tg),
      sql`NOT (${accountsTable.archivedGroupBuyIds} @> ${JSON.stringify([id])}::jsonb)`,
    ));
  res.json({ ok: true, archived: true });
});

// POST /api/group-buys/:id/unarchive — restore a previously archived GB
router.post("/group-buys/:id/unarchive", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!id || id.length > 200) {
    res.status(400).json({ error: "Invalid group buy id" });
    return;
  }
  // Atomic remove-by-value: rebuild the array without this id in one row-locked
  // UPDATE so concurrent archive/unarchive actions cannot clobber each other.
  await db
    .update(accountsTable)
    .set({ archivedGroupBuyIds: sql`COALESCE((SELECT jsonb_agg(elem) FROM jsonb_array_elements_text(${accountsTable.archivedGroupBuyIds}) AS elem WHERE elem <> ${id}), '[]'::jsonb)` })
    .where(eq(accountsTable.telegramUsername, tg));
  res.json({ ok: true, archived: false });
});

// GET /api/group-buys/:id/buyer-preview — full GB summary (same shape as a GET /group-buys
// list entry) for the GB's organiser, so they can preview the order form as a buyer would
// see it without being a member. Organiser only; archived GBs are blocked.
router.get("/group-buys/:id/buyer-preview", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  if (!id || id.length > 200) {
    res.status(400).json({ error: "Invalid group buy id" });
    return;
  }

  const [gb] = await db
    .select(GB_SELECT_COLS)
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb || gb.status === "archived") {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const organiserId = gb.organiserId;
  const norm = (v: string) => v.trim().toLowerCase().replace(/^@/, "");
  if (!organiserId || norm(organiserId) !== norm(tg)) {
    res.status(403).json({ error: "Only the organiser can preview this group buy" });
    return;
  }

  const [productCount, kitsOrderedTotal] = await Promise.all([
    getProductCount(gb.id),
    gb.maxKitsTotal != null ? getTotalKitCount(gb.id) : Promise.resolve(0),
  ]);

  res.json({
    ...shapeGb(gb as Record<string, unknown>, productCount),
    maxKitsPerCustomer: gb.maxKitsPerCustomer ?? null,
    maxKitsTotal: gb.maxKitsTotal ?? null,
    kitsOrderedByUser: 0,
    kitsOrderedTotal,
    countryLegId: null,
    archived: false,
  });
});

// GET /api/group-buys/:id/products — products for a GB (member only)
router.get("/group-buys/:id/products", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const canView = await canViewAsBuyer(tg, id);
  if (!canView) {
    res.status(403).json({ error: "Not a member of this group buy" });
    return;
  }

  const [gb] = await db
    .select({ status: groupBuysTable.status })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  // draft, active and closed are all accessible to members; only archived is blocked.
  if (!gb || gb.status === "archived") {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const rows = await db
    .select({
      gbpId: groupBuyProductsTable.id,
      productId: groupBuyProductsTable.productId,
      priceOverride: groupBuyProductsTable.priceOverride,
      active: groupBuyProductsTable.active,
      sortOrder: groupBuyProductsTable.sortOrder,
      maxPerCustomer: groupBuyProductsTable.maxPerCustomer,
      name: productsTable.name,
      category: productsTable.category,
      price: productsTable.price,
      vendor: productsTable.vendor,
      mgSize: productsTable.mgSize,
      halfKitEnabled: productsTable.halfKitEnabled,
    })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(
      eq(groupBuyProductsTable.groupBuyId, id),
      eq(groupBuyProductsTable.active, true),
    ))
    .orderBy(asc(groupBuyProductsTable.sortOrder), asc(productsTable.sortOrder), asc(productsTable.name));

  const result = rows.map(r => ({
    id: r.productId,
    gbpId: r.gbpId,
    name: r.name,
    category: r.category,
    price: r.priceOverride != null ? parseFloat(r.priceOverride) : parseFloat(r.price),
    basePrice: parseFloat(r.price),
    priceOverrideApplied: r.priceOverride != null,
    sortOrder: r.sortOrder,
    vendor: r.vendor,
    mgSize: r.mgSize,
    halfKitEnabled: r.halfKitEnabled,
    maxPerCustomer: r.maxPerCustomer,
  }));

  res.json(result);
});

// GET /api/group-buys/:id/preview-prices — public pricing preview (auth required, no membership check)
// Lets any logged-in user preview a GB's product prices before joining.
// Respects the admin hide_prices / hide_prices_when_closed flags.
router.get("/group-buys/:id/preview-prices", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);

  const [gb] = await db
    .select({
      status: groupBuysTable.status,
      hidePrices: groupBuysTable.hidePrices,
      hidePricesWhenClosed: groupBuysTable.hidePricesWhenClosed,
      currency: groupBuysTable.currency,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb || gb.status === "archived") {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const pricesHidden =
    gb.hidePrices ||
    (gb.hidePricesWhenClosed && gb.status !== "active" && gb.status !== "draft");

  if (pricesHidden) {
    res.json({ hidden: true, products: [] });
    return;
  }

  const rows = await db
    .select({
      productId: groupBuyProductsTable.productId,
      priceOverride: groupBuyProductsTable.priceOverride,
      sortOrder: groupBuyProductsTable.sortOrder,
      name: productsTable.name,
      price: productsTable.price,
      productSortOrder: productsTable.sortOrder,
    })
    .from(groupBuyProductsTable)
    .innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(
      eq(groupBuyProductsTable.groupBuyId, id),
      eq(groupBuyProductsTable.active, true),
    ))
    .orderBy(asc(groupBuyProductsTable.sortOrder), asc(productsTable.sortOrder), asc(productsTable.name));

  res.json({
    hidden: false,
    currency: gb.currency ?? "GBP",
    products: rows.map(r => ({
      id: r.productId,
      name: r.name,
      price: r.priceOverride != null ? parseFloat(r.priceOverride) : parseFloat(r.price),
    })),
  });
});

// GET /api/group-buys/:id/delivery-methods — delivery methods for a GB (member only)
router.get("/group-buys/:id/delivery-methods", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const canView = await canViewAsBuyer(tg, id);
  if (!canView) {
    res.status(403).json({ error: "Not a member of this group buy" });
    return;
  }

  const [gb] = await db
    .select({ status: groupBuysTable.status, directShippingEnabled: groupBuysTable.directShippingEnabled })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  // draft, active and closed are all accessible to members; only archived is blocked.
  if (!gb || gb.status === "archived") {
    res.status(404).json({ error: "Group buy not found" });
    return;
  }

  const rows = await db
    .select({
      id: deliveryMethodsTable.id,
      name: deliveryMethodsTable.name,
      price: deliveryMethodsTable.price,
      sortOrder: deliveryMethodsTable.sortOrder,
    })
    .from(groupBuyDeliveryMethodsTable)
    .innerJoin(deliveryMethodsTable, eq(groupBuyDeliveryMethodsTable.deliveryMethodId, deliveryMethodsTable.id))
    .where(eq(groupBuyDeliveryMethodsTable.groupBuyId, id));

  res.json(rows.map(r => ({ ...r, price: parseFloat(r.price) })));
});

// GET /api/group-buys/:id/direct-shipping-info — vendor price table for direct-to-home shipping
router.get("/group-buys/:id/direct-shipping-info", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);

  const canView = await canViewAsBuyer(tg, id);
  if (!canView) {
    res.status(403).json({ error: "Not a member of this group buy" });
    return;
  }

  const [gb] = await db
    .select({
      directShippingEnabled: groupBuysTable.directShippingEnabled,
      directShippingVendorId: groupBuysTable.directShippingVendorId,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb || !gb.directShippingEnabled) {
    res.json({ enabled: false });
    return;
  }

  if (!gb.directShippingVendorId) {
    res.json({ enabled: true, vendor: null });
    return;
  }

  const [configRow] = await db
    .select({ value: siteConfigTable.value })
    .from(siteConfigTable)
    .where(eq(siteConfigTable.key, "wholesale_vendors"));

  if (!configRow?.value) {
    res.json({ enabled: true, vendor: null });
    return;
  }

  let vendor: any;
  try {
    const all = JSON.parse(configRow.value) as any[];
    vendor = all.find(v => v.id === gb.directShippingVendorId);
  } catch {
    res.json({ enabled: true, vendor: null });
    return;
  }

  if (!vendor) {
    res.json({ enabled: true, vendor: null });
    return;
  }

  // Determine user's region from their stored country code
  const [acct] = await db
    .select({ country: accountsTable.country })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, tg));

  let userRegionName: string | null = null;
  if (acct?.country) {
    const countryName = COUNTRY_CODE_TO_NAME[acct.country.toUpperCase()] ?? acct.country;
    const norm = countryName.trim().toLowerCase();
    const matched = (vendor.regions as any[]).find(r =>
      (r.countries ?? []).some((c: string) => c.toLowerCase() === norm) ||
      r.name.toLowerCase() === norm ||
      norm.includes(r.name.toLowerCase()) ||
      r.name.toLowerCase().includes(norm)
    );
    userRegionName = matched?.name ?? null;
  }

  const tiers: string[] = vendor.tiers ?? [];
  const tierBounds: number[] = vendor.tierBounds ?? tiers.map((_: string, i: number) => (i + 1) * 5);

  res.json({
    enabled: true,
    tiers,
    tierBounds,
    maxKitsPerPackage: (vendor.maxKitsPerPackage ?? 25) as number,
    userRegionName,
    regions: (vendor.regions as any[]).map(r => ({
      name: r.name as string,
      prices: (r.prices ?? null) as number[] | null,
      priceNote: (r.priceNote ?? null) as string | null,
      customNote: (r.customNote ?? null) as string | null,
    })),
  });
});

// GET /api/group-buys/my-viewer-access — GBs where this account has QR or leg viewer access
router.get("/group-buys/my-viewer-access", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  const rows = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      status: groupBuysTable.status,
      qrViewerUsernames: groupBuysTable.qrViewerUsernames,
      legViewerAccess: groupBuysTable.legViewerAccess,
    })
    .from(groupBuysTable)
    .where(
      sql`(
        ${groupBuysTable.qrViewerUsernames} @> ${JSON.stringify([tg])}::jsonb
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(${groupBuysTable.legViewerAccess}, '[]'::jsonb)) AS elem
          WHERE elem->>'username' = ${tg}
        )
      )`
    );

  const result = rows.map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    hasQrAccess: Array.isArray(r.qrViewerUsernames) && r.qrViewerUsernames.includes(tg),
    hasLegAccess: Array.isArray(r.legViewerAccess) && r.legViewerAccess.some((a: { username: string }) => a.username === tg),
  }));

  res.json(result);
});

// ── POST /api/group-buys/:id/waitlist — join waitlist (requires account session) ─
router.post("/group-buys/:id/waitlist", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const tg = req.account!.telegramUsername;

  const [gb] = await db
    .select({ id: groupBuysTable.id, status: groupBuysTable.status })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, id));

  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  if (gb.status !== "closed") {
    res.status(400).json({ error: "You can only join the waitlist for a closed group buy" });
    return;
  }

  const [existing] = await db
    .select({ id: gbWaitlistTable.id })
    .from(gbWaitlistTable)
    .where(and(eq(gbWaitlistTable.groupBuyId, id), eq(gbWaitlistTable.accountId, tg)));

  if (existing) {
    res.json({ ok: true, alreadyJoined: true });
    return;
  }

  await db.insert(gbWaitlistTable).values({ id: randomUUID(), groupBuyId: id, accountId: tg });
  res.json({ ok: true, alreadyJoined: false });
});

// ── DELETE /api/group-buys/:id/waitlist — leave waitlist ──────
router.delete("/group-buys/:id/waitlist", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const tg = req.account!.telegramUsername;

  await db.delete(gbWaitlistTable).where(
    and(eq(gbWaitlistTable.groupBuyId, id), eq(gbWaitlistTable.accountId, tg))
  );
  res.json({ ok: true });
});

// ── GET /api/group-buys/:id/waitlist/status — check if member is on waitlist
router.get("/group-buys/:id/waitlist/status", requireAccount, async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  const tg = req.account!.telegramUsername;

  const [entry] = await db
    .select({ id: gbWaitlistTable.id })
    .from(gbWaitlistTable)
    .where(and(eq(gbWaitlistTable.groupBuyId, id), eq(gbWaitlistTable.accountId, tg)));

  res.json({ onWaitlist: !!entry });
});

// GET /api/group-buys/:id/capacity — per-product GB fill level (no raw stock exposed)
// Returns totalOrdered and a fillPercent (0-100) derived server-side from Qiyunle stock.
// Raw stock is never sent to the client — only the computed percentage and status label.
router.get("/group-buys/:id/capacity", requireAccount, async (req, res): Promise<void> => {
  const gbId = String(req.params["id"]);

  try {
    const gbRow = await db.execute(sql`SELECT show_stock_view FROM group_buys WHERE id = ${gbId} LIMIT 1`);
    const stockViewEnabled: boolean = gbRow.rows.length > 0 ? ((gbRow.rows[0] as any).show_stock_view ?? true) : true;

    const rows = await db.execute(sql`
      SELECT
        p.name                          AS product_name,
        p.stock                         AS stock,
        COUNT(DISTINCT m.id)            AS mapping_count,
        COALESCE(ord.total_ordered, 0)  AS total_ordered
      FROM   group_buy_products gbp
      JOIN   products p              ON p.id = gbp.product_id
      LEFT   JOIN qiyunle_mappings m ON m.product_id = p.id
      LEFT   JOIN (
        SELECT oli.product_id, SUM(oli.quantity::numeric) AS total_ordered
        FROM   order_line_items oli
        JOIN   orders o ON o.id = oli.order_id
        WHERE  o.group_buy_id = ${gbId}
          AND  o.status NOT IN ('Cancelled', 'Draft')
        GROUP  BY oli.product_id
      ) ord ON ord.product_id = p.id
      WHERE  gbp.group_buy_id = ${gbId}
        AND  gbp.active = true
      GROUP  BY p.id, p.name, p.stock, ord.total_ordered
      ORDER  BY p.name
    `);

    const result = (rows.rows as any[])
      .map(r => {
        const totalOrdered = parseFloat(r.total_ordered) || 0;
        const stock = parseFloat(r.stock) || 0;
        const mapped = parseInt(r.mapping_count, 10) > 0;

        let fillPercent = 0;
        let status: "available" | "limited" | "low" | "full" = "available";

        if (stock > 0) {
          // Works for both Qiyunle-mapped and manually-stocked products
          fillPercent = Math.min(100, Math.round((totalOrdered / stock) * 100));
          status = fillPercent >= 95 ? "full" : fillPercent >= 75 ? "low" : fillPercent >= 50 ? "limited" : "available";
        } else if (mapped || totalOrdered > 0) {
          // Stock is 0 or negative (oversold). If we know about the product
          // (mapped to Qiyunle, or already has orders), surface it as OOS so
          // the dropdown stops showing a green "In Stock" dot.
          fillPercent = 100;
          status = "full";
        }

        return { productName: r.product_name, totalOrdered, stock, fillPercent, status, mapped };
      })
      .filter(r => r.stock > 0 || r.mapped || r.totalOrdered > 0); // include manually-stocked, mapped, or ordered

    // Sort: tightest stock first, then by totalOrdered desc
    const order = { full: 0, low: 1, limited: 2, available: 3 } as const;
    result.sort((a, b) => order[a.status] - order[b.status] || b.totalOrdered - a.totalOrdered);

    res.json({ items: result, stockViewEnabled });
  } catch (e: unknown) {
    console.error("[capacity] Error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/group-buys/:id/popularity — product popularity (public, scores are anonymised 0-100)
router.get("/group-buys/:id/popularity", async (req, res): Promise<void> => {
  const id = String(req.params["id"]);

  const rows = await db
    .select({
      productName: orderLineItemsTable.productName,
      total: sql<string>`coalesce(sum(cast(${orderLineItemsTable.quantity} as numeric)), 0)`,
    })
    .from(orderLineItemsTable)
    .innerJoin(ordersTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.groupBuyId, id))
    .groupBy(orderLineItemsTable.productName)
    .orderBy(desc(sql`sum(cast(${orderLineItemsTable.quantity} as numeric))`));

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const maxTotal = parseFloat(rows[0]!.total);
  const result = rows.map(r => ({
    productName: r.productName,
    score: maxTotal > 0 ? Math.round((parseFloat(r.total) / maxTotal) * 100) : 0,
  }));

  res.json(result);
});

// ── GET /api/group-buys/:gbId/country-legs/:legId/kit-count ──────────────────
// Returns kit totals for a specific country leg. Accessible to leg viewers (account session)
// or admin (x-admin-secret header).
router.get("/group-buys/:gbId/country-legs/:legId/kit-count", async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const legId = String(req.params["legId"]);

  // Check auth: admin secret header OR account session with leg viewer access for this legId
  const adminSecret = req.headers["x-admin-secret"] as string | undefined;
  const isAdmin = adminSecret && adminSecret === process.env.ADMIN_SECRET;

  let authed = !!isAdmin;
  if (!authed) {
    // Parse account JWT directly from cookie (no middleware used here)
    const token = req.cookies?.account_session as string | undefined;
    if (!token) { res.status(401).json({ error: "Login required" }); return; }
    let tg: string;
    try {
      const payload = jwt.verify(token, getJwtSecret()) as { telegramUsername: string };
      tg = payload.telegramUsername.toLowerCase().replace(/^@/, "");
    } catch {
      res.status(401).json({ error: "Session expired — please log in again" }); return;
    }

    // Check legViewerAccess on the GB for this specific legId
    const [gb] = await db
      .select({ legViewerAccess: groupBuysTable.legViewerAccess })
      .from(groupBuysTable)
      .where(eq(groupBuysTable.id, gbId));
    if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

    const access = Array.isArray(gb.legViewerAccess) ? gb.legViewerAccess : [];
    const entry = access.find((a: { username: string }) => a.username.toLowerCase().replace(/^@/, "") === tg);
    if (entry && Array.isArray((entry as { legIds: string[] }).legIds) && (entry as { legIds: string[] }).legIds.includes(legId)) {
      authed = true;
    }
  }

  if (!authed) { res.status(403).json({ error: "Access denied" }); return; }

  // Fetch leg + GB info
  const [legRow] = await db
    .select({
      id: gbCountryLegsTable.id,
      gbId: gbCountryLegsTable.gbId,
      countryName: gbCountryLegsTable.countryName,
      countryCode: gbCountryLegsTable.countryCode,
      vendorPackageCount: gbCountryLegsTable.vendorPackageCount,
      kitCountExcludedOrderIds: gbCountryLegsTable.kitCountExcludedOrderIds,
    })
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));

  if (!legRow) { res.status(404).json({ error: "Country leg not found" }); return; }

  const [gbRow] = await db
    .select({ name: groupBuysTable.name, currency: groupBuysTable.currency })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gbRow) { res.status(404).json({ error: "Group buy not found" }); return; }

  // Fetch all non-deleted orders for this leg
  const orders = await db
    .select({
      id: ordersTable.id,
      code: ordersTable.code,
      telegramUsername: ordersTable.telegramUsername,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      grandTotal: ordersTable.grandTotal,
      productSubtotal: ordersTable.productSubtotal,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.countryLegId, legId), eq(ordersTable.groupBuyId, gbId), sql`${ordersTable.deletedAt} IS NULL`))
    .orderBy(asc(ordersTable.createdAt));

  // Fetch line items for all orders
  const orderIds = orders.map(o => o.id);
  const lineItems = orderIds.length > 0
    ? await db
      .select({
        orderId: orderLineItemsTable.orderId,
        quantity: orderLineItemsTable.quantity,
        productName: orderLineItemsTable.productName,
      })
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds))
    : [];

  const lineItemsByOrder = new Map<string, typeof lineItems>();
  for (const li of lineItems) {
    const arr = lineItemsByOrder.get(li.orderId) ?? [];
    arr.push(li);
    lineItemsByOrder.set(li.orderId, arr);
  }

  const excludedIds: string[] = Array.isArray(legRow.kitCountExcludedOrderIds) ? legRow.kitCountExcludedOrderIds : [];

  const ordersWithKits = orders.map(o => {
    const lis = lineItemsByOrder.get(o.id) ?? [];
    const kits = lis.length > 0
      ? lis.reduce((s, li) => s + parseFloat(String(li.quantity)), 0)
      : 1; // fallback: 1 kit per order when no line items
    return {
      id: o.id,
      code: o.code,
      telegramUsername: o.telegramUsername,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotal: String(o.grandTotal ?? "0"),
      kits,
      excluded: excludedIds.includes(o.id),
      createdAt: (o.createdAt as Date).toISOString(),
    };
  });

  const includedKits = ordersWithKits.filter(o => !o.excluded).reduce((s, o) => s + o.kits, 0);
  const totalKits = ordersWithKits.reduce((s, o) => s + o.kits, 0);

  res.json({
    gbName: gbRow.name,
    legName: legRow.countryName,
    legCode: legRow.countryCode,
    currency: gbRow.currency,
    vendorPackageCount: legRow.vendorPackageCount ?? null,
    totalKits,
    includedKits,
    excludedCount: ordersWithKits.filter(o => o.excluded).length,
    orders: ordersWithKits,
  });
});

export default router;

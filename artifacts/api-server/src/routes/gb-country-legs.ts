/**
 * GB Country Legs — API routes for per-country sub-groups within a Group Buy.
 *
 * Admin routes  : /api/admin/group-buys/:gbId/country-legs/**
 * Organiser routes: /api/organiser/group-buys/:gbId/country-legs/**
 * Public routes : /api/group-buys/:gbId/country-legs (list active legs, no invite codes)
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  gbCountryLegsTable,
  groupBuysTable,
  gbReshippersTable,
  accountGroupBuysTable,
  ordersTable,
  orderLineItemsTable,
} from "@workspace/db";
import { eq, and, asc, inArray, sql, gt, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { requireAdmin } from "../middleware/require-admin";
import { requireAccount } from "../middleware/account-auth";
import { requireOrganiser } from "../middleware/require-organiser";
import { notifyUser } from "../lib/telegram";
import { calculateVendorShipping } from "../lib/vendor-shipping";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) code += chars[bytes[i] % chars.length];
  // Format: XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

function shortId(len = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

/** Fetch order counts per country leg ID for a given GB */
async function fetchOrderCounts(gbId: string, legIds: string[]): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  if (legIds.length === 0) return countMap;
  const rows = await db
    .select({
      countryLegId: ordersTable.countryLegId,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.countryLegId, legIds)))
    .groupBy(ordersTable.countryLegId);
  for (const r of rows) {
    if (r.countryLegId) countMap.set(r.countryLegId, r.n);
  }
  return countMap;
}

/** Attach reshipper info to each leg (multiple reshippers per country supported) */
async function attachReshippers(gbId: string, legs: typeof gbCountryLegsTable.$inferSelect[]) {
  if (legs.length === 0) return legs.map(l => ({ ...l, reshippers: [] as ReshipperRow[], reshipper: null as ReshipperRow | null }));
  const reshippers = await db
    .select({
      id: gbReshippersTable.id,
      country: gbReshippersTable.country,
      reshipperUsername: gbReshippersTable.reshipperUsername,
      enabled: gbReshippersTable.enabled,
      paymentTarget: gbReshippersTable.paymentTarget,
      enabledPaymentMethods: gbReshippersTable.enabledPaymentMethods,
      reshipperPaymentDetails: gbReshippersTable.reshipperPaymentDetails,
      reshipperFeeEnabled: gbReshippersTable.reshipperFeeEnabled,
      reshipperFeeType: gbReshippersTable.reshipperFeeType,
      reshipperFeeAmount: gbReshippersTable.reshipperFeeAmount,
      allowPayments: gbReshippersTable.allowPayments,
      allowVendorShippingSplit: gbReshippersTable.allowVendorShippingSplit,
    })
    .from(gbReshippersTable)
    .where(and(eq(gbReshippersTable.gbId, gbId), eq(gbReshippersTable.enabled, true)));

  const byCountry = new Map<string, ReshipperRow[]>();
  for (const r of reshippers) {
    if (!byCountry.has(r.country)) byCountry.set(r.country, []);
    byCountry.get(r.country)!.push(r);
  }
  return legs.map(l => {
    const list = byCountry.get(l.countryCode) ?? [];
    return {
      ...l,
      reshippers: list,
      // Legacy single-reshipper field: first enabled reshipper (for admin/organiser views that spread the whole row)
      reshipper: list[0] ?? null,
    };
  });
}

type ReshipperRow = {
  id: string;
  country: string;
  reshipperUsername: string;
  enabled: boolean;
  paymentTarget: string;
  enabledPaymentMethods: Record<string, unknown> | null;
  reshipperPaymentDetails: Record<string, unknown> | null;
  reshipperFeeEnabled: boolean;
  reshipperFeeType: string;
  reshipperFeeAmount: string | null;
  allowPayments: boolean;
  allowVendorShippingSplit: boolean;
};

// ── PUBLIC: GET /api/group-buys/:gbId/country-legs ───────────────────────────
// Returns active legs for the join modal (no invite codes exposed).
// Members additionally receive reshipper payment details needed by the order form.
router.get("/group-buys/:gbId/country-legs", requireAccount, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  // accountGroupBuysTable.accountId stores telegramUsername (see schema)
  const accountId = req.account!.telegramUsername;

  const [gb] = await db
    .select({ id: groupBuysTable.id, countryLegsEnabled: groupBuysTable.countryLegsEnabled })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  if (!gb || !gb.countryLegsEnabled) { res.json([]); return; }

  // Fetch membership to determine access level and assigned leg
  const [membership] = await db
    .select({ id: accountGroupBuysTable.id, countryLegId: accountGroupBuysTable.countryLegId })
    .from(accountGroupBuysTable)
    .where(and(eq(accountGroupBuysTable.groupBuyId, gbId), eq(accountGroupBuysTable.accountId, accountId)))
    .limit(1);
  const isMember = !!membership;

  // Active legs are shown to everyone for join-modal country selection
  const activeLegs = await db
    .select()
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.status, "active")))
    .orderBy(asc(gbCountryLegsTable.sortOrder), asc(gbCountryLegsTable.countryName));

  // Members also receive their own assigned leg even if it has been closed (for order form reshipper resolution)
  let legs = activeLegs;
  if (isMember && membership.countryLegId && !activeLegs.find(l => l.id === membership.countryLegId)) {
    const [assignedLeg] = await db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.id, membership.countryLegId)).limit(1);
    if (assignedLeg) legs = [...activeLegs, assignedLeg];
  }

  const withReship = await attachReshippers(gbId, legs);

  const isMyLeg = (legId: string) => isMember && membership.countryLegId === legId;

  res.json(withReship.map(l => ({
    id: l.id,
    countryCode: l.countryCode,
    countryName: l.countryName,
    inviteEnabled: l.inviteEnabled,
    status: l.status,
    directShippingEnabled: l.directShippingEnabled,
    // Full array — payment details only exposed for the member's own assigned leg
    reshippers: l.reshippers.map(r => ({
      telegramUsername: r.reshipperUsername,
      ...(isMyLeg(l.id) ? {
        paymentTarget: r.paymentTarget,
        enabledPaymentMethods: r.enabledPaymentMethods,
        reshipperPaymentDetails: r.reshipperPaymentDetails,
      } : {}),
    })),
    // Legacy single-reshipper field for backward compat
    reshipper: l.reshipper ? {
      telegramUsername: l.reshipper.reshipperUsername,
      ...(isMyLeg(l.id) ? {
        paymentTarget: l.reshipper.paymentTarget,
        enabledPaymentMethods: l.reshipper.enabledPaymentMethods,
        reshipperPaymentDetails: l.reshipper.reshipperPaymentDetails,
      } : {}),
    } : null,
  })));
});

// ── ADMIN: GET /api/admin/group-buys/:gbId/country-legs ──────────────────────
router.get("/admin/group-buys/:gbId/country-legs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const legs = await db
    .select()
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.gbId, gbId))
    .orderBy(asc(gbCountryLegsTable.sortOrder), asc(gbCountryLegsTable.countryName));
  const [withReship, orderCounts] = await Promise.all([
    attachReshippers(gbId, legs),
    fetchOrderCounts(gbId, legs.map(l => l.id)),
  ]);
  res.json(withReship.map(l => ({ ...l, orderCount: orderCounts.get(l.id) ?? 0 })));
});

// ── ADMIN: POST /api/admin/group-buys/:gbId/country-legs ─────────────────────
router.post("/admin/group-buys/:gbId/country-legs", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const { countryCode, countryName, inviteEnabled } = req.body as {
    countryCode: string;
    countryName: string;
    inviteEnabled?: boolean;
  };
  if (!countryCode || !countryName) {
    res.status(400).json({ error: "countryCode and countryName are required" });
    return;
  }
  if (!/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    res.status(400).json({ error: "countryCode must be exactly 2 letters (ISO 3166-1 alpha-2)" });
    return;
  }
  const [existing] = await db.select({ id: gbCountryLegsTable.id }).from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, countryCode.toUpperCase()))).limit(1);
  if (existing) { res.status(409).json({ error: `Country code ${countryCode.toUpperCase()} already exists in this group buy` }); return; }
  const [leg] = await db
    .insert(gbCountryLegsTable)
    .values({
      id: shortId(10),
      gbId,
      countryCode: countryCode.toUpperCase(),
      countryName,
      inviteEnabled: inviteEnabled ?? false,
      inviteCode: inviteEnabled ? generateInviteCode() : null,
      status: "active",
      sortOrder: 0,
    })
    .returning();
  res.status(201).json(leg);
});

// ── ADMIN: PATCH /api/admin/group-buys/:gbId/country-legs/:legId ─────────────
router.patch("/admin/group-buys/:gbId/country-legs/:legId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const legId = String(req.params["legId"]);
  const { inviteEnabled, status, sortOrder, message, countryNote, vendorShippingCost, vendorPackageCount, directShippingEnabled, wholesaleVendorId } = req.body as {
    inviteEnabled?: boolean;
    status?: string;
    sortOrder?: number;
    message?: string | null;
    countryNote?: string | null;
    vendorShippingCost?: number | string | null;
    vendorPackageCount?: number | null;
    directShippingEnabled?: boolean;
    wholesaleVendorId?: string | null;
  };

  const [existing] = await db.select().from(gbCountryLegsTable).where(eq(gbCountryLegsTable.id, legId));
  if (!existing) { res.status(404).json({ error: "Country leg not found" }); return; }

  const patch: Partial<typeof gbCountryLegsTable.$inferInsert> = {};
  if (inviteEnabled !== undefined) {
    patch.inviteEnabled = inviteEnabled;
    if (inviteEnabled && !existing.inviteCode) patch.inviteCode = generateInviteCode();
    if (!inviteEnabled) patch.inviteCode = null;
  }
  if (status !== undefined) {
    if (!["active", "closed"].includes(status)) { res.status(400).json({ error: "status must be 'active' or 'closed'" }); return; }
    patch.status = status;
  }
  if (sortOrder !== undefined) patch.sortOrder = sortOrder;
  if (message !== undefined) patch.message = message?.trim() || null;
  if (countryNote !== undefined) patch.countryNote = countryNote?.trim() || null;
  if (vendorShippingCost !== undefined) {
    (patch as Record<string, unknown>)["vendorShippingCost"] =
      vendorShippingCost != null && vendorShippingCost !== "" && vendorShippingCost !== null
        ? parseFloat(String(vendorShippingCost)).toFixed(2)
        : null;
  }
  if (vendorPackageCount !== undefined) {
    patch.vendorPackageCount = vendorPackageCount != null ? Number(vendorPackageCount) : null;
  }
  if (directShippingEnabled !== undefined) patch.directShippingEnabled = directShippingEnabled;
  if (wholesaleVendorId !== undefined) patch.wholesaleVendorId = wholesaleVendorId?.trim() || null;

  const [updated] = await db
    .update(gbCountryLegsTable)
    .set(patch)
    .where(eq(gbCountryLegsTable.id, legId))
    .returning();
  res.json(updated);
});

// ── ADMIN: POST /api/admin/group-buys/:gbId/apply-leg-shipping ───────────────
// Splits vendor shipping costs across orders in each country leg by kit quantity.
//
// Dynamic path (new GBs): when the leg has wholesaleVendorId set, the calculator
//   calls calculateVendorShipping() using the leg's countryCode as the reshipper
//   hub country. If it finds a rate, it uses that; otherwise falls back to legacy.
//
// Legacy path: uses the fixed vendorShippingCost stored on the leg. This is
//   always used for legs without wholesaleVendorId, and as a fallback when no
//   dynamic rate is available.
//
// Financial protection: confirmed/test_confirmed payment orders are skipped
//   unless force_override=true is passed in the body.
router.post("/admin/group-buys/:gbId/apply-leg-shipping", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const {
    statusFilter = "Submitted",
    force_override = false,
  } = req.body as { statusFilter?: string; force_override?: boolean };

  const legs = await db
    .select()
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.gbId, gbId))
    .orderBy(asc(gbCountryLegsTable.sortOrder), asc(gbCountryLegsTable.countryName));

  // Include legs that have either a fixed cost OR a wholesale vendor (dynamic path)
  const legsWithCost = legs.filter(
    l =>
      (l.vendorShippingCost != null && parseFloat(String(l.vendorShippingCost)) > 0) ||
      l.wholesaleVendorId != null,
  );

  if (legsWithCost.length === 0) {
    res.json({ message: "No legs with a shipping cost set", legsUpdated: 0, ordersUpdated: 0, breakdown: [] });
    return;
  }

  type LegResult = {
    legId: string;
    countryName: string;
    countryCode: string;
    shippingCost: number;
    packageCount: number | null;
    totalKits: number;
    costPerKit: number | null;
    ordersUpdated: number;
    skippedPaid: number;
    usedDynamicCalc: boolean;
    orders: { orderId: string; username: string; kits: number; vendorShipping: number; newGrandTotal: number }[];
  };

  const breakdown: LegResult[] = [];
  let totalOrdersUpdated = 0;

  for (const leg of legsWithCost) {
    const allOrders = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.groupBuyId, gbId),
        eq(ordersTable.countryLegId, leg.id),
        eq(ordersTable.status, statusFilter),
        sql`${ordersTable.deletedAt} is null`,
      ));

    // Protect paid orders unless force_override is set
    const paidStatuses = ["confirmed", "test_confirmed"];
    const orders = force_override
      ? allOrders
      : allOrders.filter(o => !paidStatuses.includes(o.paymentStatus ?? ""));
    const skippedPaid = allOrders.length - orders.length;

    if (orders.length === 0) {
      const fixedCost = leg.vendorShippingCost != null ? parseFloat(String(leg.vendorShippingCost)) : 0;
      breakdown.push({
        legId: leg.id,
        countryName: leg.countryName,
        countryCode: leg.countryCode,
        shippingCost: fixedCost,
        packageCount: leg.vendorPackageCount,
        totalKits: 0,
        costPerKit: null,
        ordersUpdated: 0,
        skippedPaid,
        usedDynamicCalc: false,
        orders: [],
      });
      continue;
    }

    const orderIds = orders.map(o => o.id);

    // ── Try dynamic path first if wholesaleVendorId is set ──────────────────
    let shippingCost: number | null = null;
    let packageCount: number | null = leg.vendorPackageCount;
    let usedDynamicCalc = false;

    if (leg.wholesaleVendorId) {
      // Determine the reshipper hub country: prefer the reshipperHubCountry on orders,
      // fall back to the leg's own countryCode.
      const reshipperCountries = orders
        .map(o => (o as any).reshipperHubCountry as string | null)
        .filter(Boolean) as string[];
      const primaryCountry = reshipperCountries.length > 0
        ? reshipperCountries.sort((a, b) =>
            reshipperCountries.filter(c => c === b).length - reshipperCountries.filter(c => c === a).length
          )[0]
        : leg.countryCode;

      const dynamicResult = await calculateVendorShipping(gbId, primaryCountry, orderIds);
      if (dynamicResult) {
        shippingCost = dynamicResult.totalCost;
        packageCount = dynamicResult.packageCount;
        usedDynamicCalc = true;

        // Apply per-order shares from the calculator
        const legUpdates: LegResult["orders"] = [];
        for (const order of orders) {
          const vendorShipping = dynamicResult.perOrder.get(order.id) ?? 0;
          const productSubtotal = parseFloat(String(order.productSubtotal));
          const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
          const tip = parseFloat(String(order.tip ?? "0"));
          const newGrandTotal = parseFloat((productSubtotal + deliveryPrice + vendorShipping + tip).toFixed(2));
          legUpdates.push({
            orderId: order.id,
            username: order.telegramUsername,
            kits: dynamicResult.perOrder.get(order.id) !== undefined
              ? (order as any).kits ?? 1
              : 1,
            vendorShipping,
            newGrandTotal,
          });
        }

        for (const u of legUpdates) {
          await db
            .update(ordersTable)
            .set({
              vendorShipping: u.vendorShipping.toFixed(2),
              grandTotal: u.newGrandTotal.toFixed(2),
            })
            .where(eq(ordersTable.id, u.orderId));
        }

        totalOrdersUpdated += legUpdates.length;
        breakdown.push({
          legId: leg.id,
          countryName: leg.countryName,
          countryCode: leg.countryCode,
          shippingCost,
          packageCount,
          totalKits: dynamicResult.totalKits,
          costPerKit: dynamicResult.totalKits > 0 ? shippingCost / dynamicResult.totalKits : null,
          ordersUpdated: legUpdates.length,
          skippedPaid,
          usedDynamicCalc,
          orders: legUpdates,
        });
        continue;
      }
      // Dynamic calc returned null — fall through to legacy path
    }

    // ── Legacy path: use fixed vendorShippingCost ────────────────────────────
    const fixedCost = leg.vendorShippingCost != null ? parseFloat(String(leg.vendorShippingCost)) : 0;
    if (fixedCost <= 0) {
      breakdown.push({
        legId: leg.id,
        countryName: leg.countryName,
        countryCode: leg.countryCode,
        shippingCost: 0,
        packageCount,
        totalKits: 0,
        costPerKit: null,
        ordersUpdated: 0,
        skippedPaid,
        usedDynamicCalc: false,
        orders: [],
      });
      continue;
    }
    shippingCost = fixedCost;

    const lineItems = await db
      .select()
      .from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orderIds));

    const qtyMap = new Map<string, number>();
    for (const li of lineItems) {
      const cur = qtyMap.get(li.orderId) ?? 0;
      qtyMap.set(li.orderId, cur + parseFloat(String(li.quantity)));
    }

    const totalKits = Array.from(qtyMap.values()).reduce((s, q) => s + q, 0);
    const costPerKit = totalKits > 0 ? shippingCost / totalKits : shippingCost / orders.length;

    const legUpdates: LegResult["orders"] = [];

    for (const order of orders) {
      const orderKits = qtyMap.get(order.id) ?? 1;
      const vendorShipping = parseFloat((costPerKit * orderKits).toFixed(2));
      const productSubtotal = parseFloat(String(order.productSubtotal));
      const deliveryPrice = parseFloat(String(order.deliveryPrice ?? "0"));
      const tip = parseFloat(String(order.tip ?? "0"));
      const newGrandTotal = parseFloat((productSubtotal + deliveryPrice + vendorShipping + tip).toFixed(2));
      legUpdates.push({ orderId: order.id, username: order.telegramUsername, kits: orderKits, vendorShipping, newGrandTotal });
    }

    for (const u of legUpdates) {
      await db
        .update(ordersTable)
        .set({
          vendorShipping: u.vendorShipping.toFixed(2),
          grandTotal: u.newGrandTotal.toFixed(2),
        })
        .where(eq(ordersTable.id, u.orderId));
    }

    totalOrdersUpdated += legUpdates.length;
    breakdown.push({
      legId: leg.id,
      countryName: leg.countryName,
      countryCode: leg.countryCode,
      shippingCost,
      packageCount,
      totalKits,
      costPerKit: totalKits > 0 ? costPerKit : null,
      ordersUpdated: legUpdates.length,
      skippedPaid,
      usedDynamicCalc: false,
      orders: legUpdates,
    });
  }

  const legsApplied = breakdown.filter(b => b.ordersUpdated > 0).length;
  res.json({
    message: `Leg shipping applied to ${totalOrdersUpdated} order(s) across ${legsApplied} leg(s)`,
    legsUpdated: legsApplied,
    ordersUpdated: totalOrdersUpdated,
    breakdown,
  });
});

// ── ADMIN: POST /api/admin/group-buys/:gbId/bill-vendor-shipping-balance ────────
// For orders that are already paid (confirmed / test_confirmed) but had vendor
// shipping applied AFTER payment, this endpoint raises amount_due = vendorShipping
// so customers see the "You owe £X" card and can submit a balance payment.
router.post("/admin/group-buys/:gbId/bill-vendor-shipping-balance", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const gbId = String(req.params["gbId"]);
  const {
    notify = false,
    overwrite = false, // if true, sets amount_due even if it already has a value
    statusFilter = ["confirmed", "test_confirmed"],
    countryLegId,
  } = req.body as {
    notify?: boolean;
    overwrite?: boolean;
    statusFilter?: string[];
    countryLegId?: string | null;
  };

  const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];

  // Fetch GB for currency + name
  const [gb] = await db
    .select({ id: groupBuysTable.id, name: groupBuysTable.name, currency: groupBuysTable.currency })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  const currency = (gb.currency ?? "GBP").toUpperCase();
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : `${currency} `;

  // Build order query — status in statuses, vendorShipping > 0
  const baseConditions = [
    eq(ordersTable.groupBuyId, gbId),
    gt(ordersTable.vendorShipping, "0"),
    sql`${ordersTable.deletedAt} is null`,
  ];
  if (countryLegId) baseConditions.push(eq(ordersTable.countryLegId, countryLegId));
  // Filter by status list
  const statusCondition = statuses.length === 1
    ? eq(ordersTable.status, statuses[0])
    : or(...statuses.map(s => eq(ordersTable.status, s)))!;
  baseConditions.push(statusCondition);

  // Only target orders where amount_due is 0 (not already billed) unless overwrite
  if (!overwrite) {
    baseConditions.push(sql`(${ordersTable.amountDue} IS NULL OR ${ordersTable.amountDue} = 0)`);
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(...baseConditions));

  if (orders.length === 0) {
    res.json({ message: "No qualifying orders found (all may already be billed, or no vendor shipping applied)", updatedCount: 0, breakdown: [] });
    return;
  }

  type BillResult = { orderId: string; username: string; vendorShipping: number; newAmountDue: number; notified: boolean };
  const breakdown: BillResult[] = [];

  for (const order of orders) {
    const vendorShipping = parseFloat(String(order.vendorShipping ?? "0"));
    if (vendorShipping <= 0) continue;

    const prevAmountDue = parseFloat(String((order as any).amountDue ?? "0"));
    const newAmountDue = overwrite ? vendorShipping : parseFloat((prevAmountDue + vendorShipping).toFixed(2));

    await db
      .update(ordersTable)
      .set({ amountDue: newAmountDue.toFixed(2) as any })
      .where(eq(ordersTable.id, order.id));

    let notified = false;
    if (notify) {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const text =
        `🚚 <b>Vendor Shipping Added to Your Order</b>\n\n` +
        `An additional vendor shipping charge has been added to your order for <b>${esc(gb.name ?? "the group buy")}</b>.\n\n` +
        `<b>Vendor shipping:</b> ${sym}${vendorShipping.toFixed(2)}\n` +
        `<b>Outstanding balance:</b> ${sym}${newAmountDue.toFixed(2)}\n\n` +
        `Please log in to your account and submit the outstanding payment to complete your order.`;
      notified = await notifyUser(order.telegramUsername, "vendor_shipping_billed", text).then(() => true).catch(() => false);
    }

    breakdown.push({ orderId: order.id, username: order.telegramUsername, vendorShipping, newAmountDue, notified });
  }

  res.json({
    message: `Vendor shipping billed on ${breakdown.length} order(s)${notify ? " — notifications sent" : ""}`,
    updatedCount: breakdown.length,
    breakdown,
  });
});

// ── ADMIN: POST /api/admin/group-buys/:gbId/country-legs/:legId/regenerate-invite
router.post("/admin/group-buys/:gbId/country-legs/:legId/regenerate-invite", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const legId = String(req.params["legId"]);
  const [updated] = await db
    .update(gbCountryLegsTable)
    .set({ inviteCode: generateInviteCode(), inviteEnabled: true })
    .where(eq(gbCountryLegsTable.id, legId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Country leg not found" }); return; }
  res.json(updated);
});

// ── ADMIN: DELETE /api/admin/group-buys/:gbId/country-legs/:legId ─────────────
router.delete("/admin/group-buys/:gbId/country-legs/:legId", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const legId = String(req.params["legId"]);
  await db.delete(gbCountryLegsTable).where(eq(gbCountryLegsTable.id, legId));
  res.json({ ok: true });
});

// ── ORGANISER: GET /api/organiser/group-buys/:gbId/country-legs ──────────────
router.get("/organiser/group-buys/:gbId/country-legs", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  // Verify ownership
  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  const tg = req.organiser?.telegramUsername;
  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }
  const legs = await db
    .select()
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.gbId, gbId))
    .orderBy(asc(gbCountryLegsTable.sortOrder), asc(gbCountryLegsTable.countryName));
  const [withReship, orderCounts] = await Promise.all([
    attachReshippers(gbId, legs),
    fetchOrderCounts(gbId, legs.map(l => l.id)),
  ]);
  res.json(withReship.map(l => ({ ...l, orderCount: orderCounts.get(l.id) ?? 0 })));
});

// ── ORGANISER: POST /api/organiser/group-buys/:gbId/country-legs ─────────────
router.post("/organiser/group-buys/:gbId/country-legs", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));
  const tg = req.organiser?.telegramUsername;
  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }
  const { countryCode, countryName, inviteEnabled } = req.body as {
    countryCode: string;
    countryName: string;
    inviteEnabled?: boolean;
  };
  if (!countryCode || !countryName) {
    res.status(400).json({ error: "countryCode and countryName are required" });
    return;
  }
  if (!/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    res.status(400).json({ error: "countryCode must be exactly 2 letters (ISO 3166-1 alpha-2)" });
    return;
  }
  const [existingLeg] = await db.select({ id: gbCountryLegsTable.id }).from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), eq(gbCountryLegsTable.countryCode, countryCode.toUpperCase()))).limit(1);
  if (existingLeg) { res.status(409).json({ error: `Country code ${countryCode.toUpperCase()} already exists in this group buy` }); return; }
  const [leg] = await db
    .insert(gbCountryLegsTable)
    .values({
      id: shortId(10),
      gbId,
      countryCode: countryCode.toUpperCase(),
      countryName,
      inviteEnabled: inviteEnabled ?? false,
      inviteCode: inviteEnabled ? generateInviteCode() : null,
      status: "active",
      sortOrder: 0,
    })
    .returning();
  res.status(201).json(leg);
});

// ── ORGANISER: PATCH /api/organiser/group-buys/:gbId/country-legs/:legId ──────
router.patch("/organiser/group-buys/:gbId/country-legs/:legId", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const legId = String(req.params["legId"]);
  const [gb] = await db.select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const tg = req.organiser?.telegramUsername;
  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }
  const [existing] = await db.select().from(gbCountryLegsTable).where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));
  if (!existing) { res.status(404).json({ error: "Country leg not found" }); return; }

  const { inviteEnabled, status, sortOrder, message, countryNote, directShippingEnabled } = req.body as {
    inviteEnabled?: boolean;
    status?: string;
    sortOrder?: number;
    message?: string | null;
    countryNote?: string | null;
    directShippingEnabled?: boolean;
  };
  const patch: Partial<typeof gbCountryLegsTable.$inferInsert> = {};
  if (inviteEnabled !== undefined) {
    patch.inviteEnabled = inviteEnabled;
    if (inviteEnabled && !existing.inviteCode) patch.inviteCode = generateInviteCode();
    if (!inviteEnabled) patch.inviteCode = null;
  }
  if (status !== undefined) {
    if (!["active", "closed"].includes(status)) { res.status(400).json({ error: "status must be 'active' or 'closed'" }); return; }
    patch.status = status;
  }
  if (sortOrder !== undefined) patch.sortOrder = sortOrder;
  if (message !== undefined) patch.message = message?.trim() || null;
  if (countryNote !== undefined) patch.countryNote = countryNote?.trim() || null;
  if (directShippingEnabled !== undefined) patch.directShippingEnabled = directShippingEnabled;

  const [updated] = await db.update(gbCountryLegsTable).set(patch).where(eq(gbCountryLegsTable.id, legId)).returning();
  res.json(updated);
});

// ── ORGANISER: POST /api/organiser/group-buys/:gbId/country-legs/:legId/regenerate-invite
router.post("/organiser/group-buys/:gbId/country-legs/:legId/regenerate-invite", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const legId = String(req.params["legId"]);
  const [gb] = await db.select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const tg = req.organiser?.telegramUsername;
  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }
  const [updated] = await db
    .update(gbCountryLegsTable)
    .set({ inviteCode: generateInviteCode(), inviteEnabled: true })
    .where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Country leg not found" }); return; }
  res.json(updated);
});

// ── ORGANISER: DELETE /api/organiser/group-buys/:gbId/country-legs/:legId ─────
router.delete("/organiser/group-buys/:gbId/country-legs/:legId", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const legId = String(req.params["legId"]);
  const [gb] = await db.select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId }).from(groupBuysTable).where(eq(groupBuysTable.id, gbId));
  const tg = req.organiser?.telegramUsername;
  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }
  await db.delete(gbCountryLegsTable).where(and(eq(gbCountryLegsTable.id, legId), eq(gbCountryLegsTable.gbId, gbId)));
  res.json({ ok: true });
});

// ── ORGANISER: POST /api/organiser/group-buys/:gbId/backfill-country-legs ─────
// Auto-assigns unassigned members + their orders to country legs based on the
// account.country field, matching case-insensitively against leg.countryName.
router.post("/organiser/group-buys/:gbId/backfill-country-legs", requireAccount, requireOrganiser, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const tg = req.organiser?.telegramUsername;

  const [gb] = await db
    .select({ id: groupBuysTable.id, organiserId: groupBuysTable.organiserId, countryLegsEnabled: groupBuysTable.countryLegsEnabled })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, gbId));

  if (!gb || (!req.organiser?.isAdmin && gb.organiserId !== tg)) {
    res.status(403).json({ error: "Not your group buy" });
    return;
  }

  if (!gb.countryLegsEnabled) {
    res.status(400).json({ error: "Country legs are not enabled on this group buy" });
    return;
  }

  // Build lookup: countryName or ISO code (both lowercased) → legId
  const legs = await db
    .select({ id: gbCountryLegsTable.id, countryCode: gbCountryLegsTable.countryCode, countryName: gbCountryLegsTable.countryName })
    .from(gbCountryLegsTable)
    .where(eq(gbCountryLegsTable.gbId, gbId));

  if (legs.length === 0) {
    res.json({ membersAssigned: 0, ordersAssigned: 0, skipped: 0 });
    return;
  }

  /** Match tolerating: full name, ISO code, "Name (CODE)", "CODE Name", or "(CODE)" anywhere */
  function findLeg(accountCountry: string): string | undefined {
    const c = accountCountry.toLowerCase().trim();
    const match = legs.find(l => {
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
    return match?.id;
  }

  // Find all members with no leg assigned yet
  const unassigned = await db
    .select({
      accountId: accountGroupBuysTable.accountId,
      country: accountsTable.country,
    })
    .from(accountGroupBuysTable)
    .innerJoin(accountsTable, eq(accountGroupBuysTable.accountId, accountsTable.telegramUsername))
    .where(and(
      eq(accountGroupBuysTable.groupBuyId, gbId),
      sql`${accountGroupBuysTable.countryLegId} is null`,
    ));

  let membersAssigned = 0;
  let ordersAssigned = 0;
  let skipped = 0;

  for (const row of unassigned) {
    if (!row.country) { skipped++; continue; }
    const legId = findLeg(row.country);
    if (!legId) { skipped++; continue; }

    // Update the membership record
    await db
      .update(accountGroupBuysTable)
      .set({ countryLegId: legId })
      .where(and(
        eq(accountGroupBuysTable.groupBuyId, gbId),
        eq(accountGroupBuysTable.accountId, row.accountId),
      ));
    membersAssigned++;

    // Update all unassigned orders in this GB for this member
    const result = await db
      .update(ordersTable)
      .set({ countryLegId: legId })
      .where(and(
        eq(ordersTable.groupBuyId, gbId),
        eq(ordersTable.telegramUsername, row.accountId),
        sql`${ordersTable.countryLegId} is null`,
      ))
      .returning({ id: ordersTable.id });
    ordersAssigned += result.length;
  }

  res.json({ membersAssigned, ordersAssigned, skipped });
});

// ── MEMBER: PATCH /api/group-buys/:gbId/my-country-leg ───────────────────────
// Lets an existing member self-assign a country leg without leaving and rejoining.
// Used for members who joined before country legs were enabled on the GB.
router.patch("/group-buys/:gbId/my-country-leg", requireAccount, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const accountId = req.account!.telegramUsername;
  const { countryLegId } = req.body as { countryLegId: string };

  if (!countryLegId) {
    res.status(400).json({ error: "countryLegId is required" });
    return;
  }

  // Verify membership
  const [membership] = await db
    .select({ id: accountGroupBuysTable.id })
    .from(accountGroupBuysTable)
    .where(and(eq(accountGroupBuysTable.groupBuyId, gbId), eq(accountGroupBuysTable.accountId, accountId)))
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this group buy" });
    return;
  }

  // Verify the leg exists, belongs to this GB, and is active
  const [leg] = await db
    .select()
    .from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.id, countryLegId), eq(gbCountryLegsTable.gbId, gbId)))
    .limit(1);

  if (!leg) {
    res.status(404).json({ error: "Country leg not found" });
    return;
  }
  if (leg.status !== "active") {
    res.status(400).json({ error: "This country group is not currently accepting members" });
    return;
  }

  await db
    .update(accountGroupBuysTable)
    .set({ countryLegId })
    .where(and(eq(accountGroupBuysTable.groupBuyId, gbId), eq(accountGroupBuysTable.accountId, accountId)));

  res.json({ ok: true, countryLegId });
});

// ── MEMBER: POST /api/group-buys/:gbId/validate-country-invite ───────────────
// Validates a country invite code without joining. Used by the join modal to
// give immediate feedback before the user hits the final Join button.
// requireAccount is intentional: invite validation is a pre-join step that
// only makes sense for authenticated users (join itself is always authenticated).
router.post("/group-buys/:gbId/validate-country-invite", requireAccount, async (req, res): Promise<void> => {
  const gbId = String(req.params["gbId"]);
  const { countryCode, inviteCode } = req.body as { countryCode: string; inviteCode: string };
  if (!countryCode || !inviteCode) {
    res.status(400).json({ error: "countryCode and inviteCode are required" });
    return;
  }
  const [leg] = await db
    .select()
    .from(gbCountryLegsTable)
    .where(and(
      eq(gbCountryLegsTable.gbId, gbId),
      eq(gbCountryLegsTable.countryCode, countryCode.toUpperCase()),
    ));
  if (!leg) { res.status(404).json({ error: "Country not available for this group buy" }); return; }
  if (leg.status !== "active") { res.status(400).json({ error: "This country group is not currently accepting members" }); return; }
  if (!leg.inviteEnabled) { res.json({ valid: true }); return; }
  const normalizedStored = (leg.inviteCode ?? "").toUpperCase().replace(/[\s-]/g, "");
  const normalizedInput = inviteCode.trim().toUpperCase().replace(/[\s-]/g, "");
  if (normalizedStored !== normalizedInput) {
    res.status(400).json({ error: "Invalid invite code" });
    return;
  }
  res.json({ valid: true });
});

export default router;

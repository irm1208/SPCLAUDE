import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { accountsTable, db, ordersTable } from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { normalizeTg } from "../lib/normalize";
import { normalizeWholesaleTrackingDetails } from "../lib/tracking-auto-refresh-model";
import { getTrackingPackages, projectTrackingPackages, getOrderTrackingStatus } from "@workspace/shipping/tracking";

const router: IRouter = Router();

function canonicalTrackingNumbers(trackingNumber: string | null, trackingNumbers: unknown): string[] {
  const candidates = Array.isArray(trackingNumbers) && trackingNumbers.length
    ? trackingNumbers
    : trackingNumber ? [trackingNumber] : [];
  return [...new Set(candidates
    .filter((number): number is string => typeof number === "string")
    .map(number => number.trim())
    .filter(Boolean))];
}

type TrackingParcel = {
  trackingNumber: string;
  carrier?: string;
  status: string | null;
  statusCode?: string;
  events: Array<{ date: string; status: string; location: string }>;
  lastChecked: string | Date | null;
};

function trackingParcels(order: {
  trackingNumber: string | null;
  trackingNumbers: unknown;
  trackingStatus: string | null;
  trackingEvents: Array<{ date: string; status: string; location: string }> | null;
  trackingLastChecked: Date | null;
  trackingDetails: unknown;
}): TrackingParcel[] {
  const numbers = canonicalTrackingNumbers(order.trackingNumber, order.trackingNumbers);
  const details = normalizeWholesaleTrackingDetails(order.trackingDetails);
  return numbers.map((trackingNumber, index) => {
    const detail = details[trackingNumber];
    if (detail) return {
      trackingNumber,
      ...(typeof detail.carrier === "string" ? { carrier: detail.carrier } : {}),
      status: typeof detail.status === "string" ? detail.status : null,
      ...(typeof detail.statusCode === "string" ? { statusCode: detail.statusCode } : {}),
      events: Array.isArray(detail.events) ? detail.events : [],
      lastChecked: detail.lastChecked ?? null,
    };
    return index === 0
      ? { trackingNumber, status: order.trackingStatus, events: order.trackingEvents ?? [], lastChecked: order.trackingLastChecked }
      : { trackingNumber, status: null, events: [], lastChecked: null };
  });
}

router.get("/account/wholesale-tracking", requireAccount, async (req, res): Promise<void> => {
  const username = normalizeTg(req.account!.telegramUsername);
  const normalizedUsername = username.replace(/^@/, "").toLowerCase();

  const [accountRows, orders] = await Promise.all([
    db.select({ telegramNotifications: accountsTable.telegramNotifications })
      .from(accountsTable)
      .where(sql`lower(${accountsTable.telegramUsername}) = ${normalizedUsername}`),
    db.select({
      id: ordersTable.id,
      code: ordersTable.code,
      trackingNumber: ordersTable.trackingNumber,
      trackingNumbers: ordersTable.trackingNumbers,
      trackingPackages: ordersTable.trackingPackages,
      trackingStatus: ordersTable.trackingStatus,
      trackingEvents: ordersTable.trackingEvents,
      trackingLastChecked: ordersTable.trackingLastChecked,
      trackingDetails: ordersTable.trackingDetails,
    })
      .from(ordersTable)
      .where(and(
        sql`regexp_replace(lower(${ordersTable.telegramUsername}), '^@', '') = ${normalizedUsername}`,
        eq(ordersTable.orderType, "wholesale"),
        isNull(ordersTable.sharedOrderId),
        isNull(ordersTable.groupBuyId),
        isNull(ordersTable.deletedAt),
        or(
          ne(ordersTable.trackingNumber, ""),
          sql`jsonb_array_length(coalesce(${ordersTable.trackingNumbers}, '[]'::jsonb)) > 0`,
        ),
      ))
      .orderBy(desc(ordersTable.createdAt)),
  ]);

  const prefs = accountRows[0]?.telegramNotifications;
  const alertsEnabled = !!(prefs && typeof prefs === "object" &&
    (prefs as Record<string, unknown>).wholesale_tracking === true);

  res.json({
    alertsEnabled,
    orders: orders.map(order => ({
      id: order.id,
      code: order.code,
      trackingNumbers: canonicalTrackingNumbers(order.trackingNumber, order.trackingNumbers),
      trackingStatus: order.trackingStatus,
      trackingEvents: order.trackingEvents ?? [],
      trackingLastChecked: order.trackingLastChecked,
      trackingParcels: trackingParcels(order),
      trackingPackages: getTrackingPackages(order),
      trackingPackageViews: projectTrackingPackages(order),
      packageTrackingStatus: getOrderTrackingStatus(projectTrackingPackages(order)),
    })),
  });
});

export default router;
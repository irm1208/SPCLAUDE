import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { accountsTable, db, ordersTable } from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { normalizeTg } from "../lib/normalize";

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
      trackingStatus: ordersTable.trackingStatus,
      trackingEvents: ordersTable.trackingEvents,
      trackingLastChecked: ordersTable.trackingLastChecked,
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
    })),
  });
});

export default router;
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { autoSubmitPaidVendorOrder } from "./vendor-portal-service";
import { registerScheduler } from "./scheduler-registry";

let cursor = "";
let running = false;
let pending: ReturnType<typeof setTimeout> | null = null;
let lastFailure: string | null = null;

/** Bounded scan also recovers paid orders missed during restarts or blocked on delivery details. */
export async function reconcilePaidVendorOrders() {
  if (running) return;
  running = true;
  try {
    const rows = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(
      gt(ordersTable.id, cursor), isNull(ordersTable.deletedAt), isNull(ordersTable.groupBuyId),
      inArray(ordersTable.orderType, ["wholesale", "wholesale_shared"]),
      inArray(ordersTable.status, ["Submitted", "Processing"]), eq(ordersTable.paymentStatus, "confirmed"),
      sql`(COALESCE(${ordersTable.amountDue}, 0) <= 0 OR ${ordersTable.balancePaymentStatus} IN ('confirmed', 'waived'))`,
      pendingVendorRoutingPredicate(),
    )).orderBy(asc(ordersTable.id)).limit(50);
    const failures: string[] = [];
    for (const row of rows) {
      try { await autoSubmitPaidVendorOrder(row.id); }
      catch (error) { failures.push(`${row.id}: ${error instanceof Error ? error.message : "Submission failed"}`); }
      cursor = row.id;
    }
    if (rows.length < 50) cursor = "";
    lastFailure = failures.join("; ") || null;
    if (lastFailure) throw new Error(lastFailure);
  } finally { running = false; }
}

export function requestVendorPortalReconciliation() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    void reconcilePaidVendorOrders().catch(error => console.error("[vendor-portal paid routing]", error));
  }, 250);
  pending.unref();
}

export function registerVendorPortalScheduler() {
  registerScheduler({
    name: "vendor-portal-paid-orders", label: "Paid orders to vendor portal",
    description: "Automatically submit paid wholesale orders to their assigned vendors and retry incomplete orders.",
    defaultIntervalMs: 30_000, minIntervalMs: 15_000, maxIntervalMs: 300_000, initialDelayMs: 5_000,
    run: reconcilePaidVendorOrders,
    channelStatus: () => ({ submissionError: lastFailure, submissionRunning: running }),
  });
}

/** Excludes already routed or recalled lines while allowing unresolved assignments to retry. */
export function pendingVendorRoutingPredicate() {
  return sql`EXISTS (
        SELECT 1 FROM order_line_items pending_line
        CROSS JOIN LATERAL (SELECT COALESCE(NULLIF(pending_line.vendor_id, ''),
          (SELECT NULLIF(share.vendor_id, '') FROM wholesale_shares share WHERE share.id = ${ordersTable.sharedOrderId}),
          NULLIF(${ordersTable.wholesaleVendorId}, '')) AS vendor_id) assigned
        WHERE pending_line.order_id = ${ordersTable.id}
        AND NOT EXISTS (
          SELECT 1 FROM vendor_submissions routed
          WHERE routed.order_ids @> jsonb_build_array(${ordersTable.id})
          AND (routed.vendor_id = assigned.vendor_id OR routed.source_key = 'order:' || ${ordersTable.id})
        )
        AND NOT EXISTS (
          SELECT 1 FROM vendor_audit recalled
          WHERE recalled.action = 'submission_recalled'
          AND recalled.details->>'sourceKey' IN (
            'order:' || ${ordersTable.id},
            'share:' || ${ordersTable.sharedOrderId},
            'share:' || ${ordersTable.sharedOrderId} || ':vendor:' || assigned.vendor_id
          )
          AND (recalled.details->>'vendorId' = assigned.vendor_id OR ${ordersTable.sharedOrderId} IS NULL)
        )
      )`;
}

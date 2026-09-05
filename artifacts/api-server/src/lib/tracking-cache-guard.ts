import { and, eq, isNull, sql } from "drizzle-orm";
import { ordersTable } from "@workspace/db/schema";
import type { TrackingSource } from "@workspace/shipping/tracking";

/** Prevent edit/refresh and refresh/refresh races, including unchanged-number re-pairing. */
export function unchangedTrackingCache(order: TrackingSource & { id: string }) {
  const json = (value: unknown) => value == null ? null : JSON.stringify(value);
  return and(
    eq(ordersTable.id, order.id),
    isNull(ordersTable.deletedAt),
    isNull(ordersTable.sharedOrderId),
    sql`${ordersTable.trackingNumber} IS NOT DISTINCT FROM ${order.trackingNumber ?? null}`,
    sql`${ordersTable.trackingNumbers} IS NOT DISTINCT FROM ${json(order.trackingNumbers)}::jsonb`,
    sql`${ordersTable.trackingPackages} IS NOT DISTINCT FROM ${json(order.trackingPackages)}::jsonb`,
    sql`${ordersTable.trackingDetails} IS NOT DISTINCT FROM ${json(order.trackingDetails)}::jsonb`,
    sql`${ordersTable.trackingStatus} IS NOT DISTINCT FROM ${order.trackingStatus ?? null}`,
    sql`${ordersTable.trackingLastChecked} IS NOT DISTINCT FROM ${order.trackingLastChecked instanceof Date ? order.trackingLastChecked.toISOString() : order.trackingLastChecked ?? null}::timestamptz`,
  );
}
import { and, sql } from "drizzle-orm";
import { ordersTable } from "@workspace/db/schema";
import type { TrackingSource } from "@workspace/shipping/tracking";

type TrackingWriteCasSource = TrackingSource & {
  trackingShippedItems?: unknown;
};

/** Cache-inclusive CAS used by manual writers so a concurrent refresh cannot be reverted. */
export function unchangedTrackingWriteFields(source: TrackingWriteCasSource) {
  const json = (value: unknown) => value == null ? null : JSON.stringify(value);
  const checked = source.trackingLastChecked instanceof Date
    ? source.trackingLastChecked.toISOString()
    : source.trackingLastChecked ?? null;
  return and(
    sql`${ordersTable.trackingNumber} IS NOT DISTINCT FROM ${source.trackingNumber ?? null}`,
    sql`${ordersTable.trackingNumbers} IS NOT DISTINCT FROM ${json(source.trackingNumbers)}::jsonb`,
    sql`${ordersTable.trackingPackages} IS NOT DISTINCT FROM ${json(source.trackingPackages)}::jsonb`,
    sql`${ordersTable.trackingDetails} IS NOT DISTINCT FROM ${json(source.trackingDetails)}::jsonb`,
    sql`${ordersTable.trackingStatus} IS NOT DISTINCT FROM ${source.trackingStatus ?? null}`,
    sql`${ordersTable.trackingLastChecked} IS NOT DISTINCT FROM ${checked}::timestamptz`,
    sql`${ordersTable.trackingEvents} IS NOT DISTINCT FROM ${json(source.trackingEvents)}::jsonb`,
    sql`${ordersTable.trackingShippedItems} IS NOT DISTINCT FROM ${json(source.trackingShippedItems)}::jsonb`,
  );
}
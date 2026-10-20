import { and, asc, eq, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { db, gbSupplierShipmentsTable as shipments, gbSupplierBatchesTable as batches } from "@workspace/db";
import { canonicalUsername } from "./group-buy-updates-model";
import { lockHalfKitMoney } from "./half-kit-lock";
import { SupplierBatchError, fingerprint } from "./supplier-batches-model";
import { supplierFulfilmentAccess, supplierFulfilmentDetail, type FulfilmentActor } from "./supplier-fulfilment";
import { track17Client } from "./track17-service";
import { isTrackingRefreshDue, isManualTrackingRefreshAllowed, TRACKING_STALE_AFTER_MS } from "./tracking-refresh-policy";

type Database = typeof db;
/** Only carrier evidence is cached here: never member status, money or quantities. */
export async function refreshSupplierShipment(id: string, batchId: string, shipmentId: string, actor: FulfilmentActor, body: any,
  database: Database = db, automatic = false,
  lookup = async (s: any) => {
    const result = await track17Client.getTrackingInfoDetailed(s.trackingNumber, s.carrier, { extraParams: s.trackingParams });
    if (result.kind !== "success") throw new SupplierBatchError("Tracking provider could not return this parcel. Please retry after the cooldown.", 502);
    const { parseTrack17Response } = await import("./tracking-auto-refresh");
    return parseTrack17Response(result.accepted);
  }) {
  const claimed = await database.transaction(async tx => {
    await lockHalfKitMoney(tx, id);
    await supplierFulfilmentAccess(tx, id, actor, true);
    const [b] = await tx.select({ id: batches.id }).from(batches).where(and(eq(batches.id, batchId), eq(batches.groupBuyId, id), eq(batches.state, "ordered")));
    const [s] = await tx.select().from(shipments).where(and(
      eq(shipments.id, shipmentId), eq(shipments.batchId, batchId), isNull(shipments.cancelledAt),
      actor.reshipper ? eq(shipments.recipientUsername, canonicalUsername(actor.username)) : undefined,
    )).for("update");
    if (!b || !s) throw new SupplierBatchError("Shipment not found.", 404);
    if (!s.trackingNumber) throw new SupplierBatchError("Add supplier package tracking first.", 400);
    if (!automatic && body?.expectedVersion !== s.version) throw new SupplierBatchError("This shipment changed. Refresh first.");
    const allowed = automatic ? isTrackingRefreshDue(s.lastChecked, s.trackingStatus) : isManualTrackingRefreshAllowed(s.lastChecked, s.trackingStatus);
    if (!allowed) {
      if (automatic) return null;
      throw new SupplierBatchError("Tracking is terminal or was recently checked. Non-terminal tracking can be refreshed after five minutes.", 429);
    }
    const [claim] = await tx.update(shipments).set({ lastChecked: new Date(), version: s.version + 1 })
      .where(and(eq(shipments.id, s.id), eq(shipments.version, s.version))).returning();
    return claim;
  });
  if (!claimed) return null;
  // A failed attempt retains lastChecked: it must not produce a hot retry loop.
  const result = await lookup(claimed);
  await database.update(shipments).set({
    trackingStatus: result.status, trackingEvents: result.events, updatedAt: new Date(),
  }).where(and(
    eq(shipments.id, claimed.id), eq(shipments.version, claimed.version), isNull(shipments.cancelledAt),
    eq(shipments.trackingNumber, claimed.trackingNumber!), eq(shipments.carrier, claimed.carrier),
    sql`${shipments.trackingParams} = ${JSON.stringify(claimed.trackingParams)}::jsonb`,
  ));
  return automatic ? null : supplierFulfilmentDetail(id, batchId, actor, database);
}

/** Bounded, DB-first scan; uses the existing provider coordinator and six-hour policy. */
export async function refreshDueSupplierShipments() {
  const rows = await db.select({ id: shipments.id, batchId: shipments.batchId, groupBuyId: batches.groupBuyId })
    .from(shipments).innerJoin(batches, eq(batches.id, shipments.batchId)).where(and(
      eq(batches.state, "ordered"), isNull(shipments.cancelledAt),
      sql`${shipments.trackingNumber} IS NOT NULL`,
      notInArray(shipments.trackingStatus, ["delivered", "expired"]),
      or(isNull(shipments.lastChecked), lt(shipments.lastChecked, new Date(Date.now() - TRACKING_STALE_AFTER_MS))),
    )).orderBy(asc(shipments.lastChecked), asc(shipments.createdAt)).limit(20);
  for (const s of rows) {
    try { await refreshSupplierShipment(s.groupBuyId, s.batchId, s.id, { username: "system-tracking", admin: true }, {}, db, true); }
    catch (error) { console.warn("[supplier-tracking]", s.id, error instanceof SupplierBatchError ? error.message : "Refresh failed"); }
  }
}

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, gbHalfKitClaimsTable as claims } from "@workspace/db";
import type { HalfKitShippingSnapshot } from "./half-kit-shipping-rules";
export { preserveHalfKitShipping } from "./half-kit-shipping-rules";

/** Caller holds the half-kit money mutex throughout shipping reconciliation. */
export async function halfKitShippingSnapshots(orderIds: string[], database: any = db) {
  const snapshots = new Map<string, HalfKitShippingSnapshot>();
  if (!orderIds.length) return snapshots;
  await database.update(claims).set({ paidAt: new Date() }).where(and(
    eq(claims.state, "active"), isNull(claims.paidAt),
    inArray(claims.orderId, orderIds),
    sql`exists (select 1 from orders o where o.id=${claims.orderId}
      and o.payment_status='confirmed' and coalesce(o.amount_due,0)=0)`,
  ));
  const rows = await database.select().from(claims).where(and(inArray(claims.orderId, orderIds), eq(claims.state, "active")));
  for (const row of rows) {
    const prior = snapshots.get(row.orderId) ?? { vendor: 0, delivery: 0 };
    snapshots.set(row.orderId, {
      vendor: Number((prior.vendor + Number(row.vendorShippingCharge)).toFixed(2)),
      delivery: Number((prior.delivery + Number(row.deliveryCharge)).toFixed(2)),
    });
  }
  return snapshots;
}

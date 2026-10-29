import { db, gbCountryLegsTable, gbReshippersTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { resolvePostageReshipper } from "./group-buy-delivery-routing";
import { parcelUsernameKey, type MemberParcelOrder } from "./member-gb-parcels";

/**
 * Resolve a member's saved order route, never a parcel destination. Legacy
 * country legs qualify only with one enabled, group-authorised coverage match.
 * Explicit usernames win; direct orders, missing/foreign legs and ambiguity
 * remain untouched. Nothing is persisted during a member read.
 */
export async function loadMemberParcelRouting<T extends MemberParcelOrder>(gbId: string, orders: T[]) {
  const assignments = await db.select().from(gbReshippersTable)
    .where(eq(gbReshippersTable.gbId, gbId));
  const legacy = orders.filter(order => !parcelUsernameKey(order.reshipperUsername)
    && order.countryLegId && order.directShippingRequested !== true && order.routingType !== "direct");
  const legIds = [...new Set(legacy.map(order => order.countryLegId!))];
  const legs = legIds.length ? await db.select().from(gbCountryLegsTable)
    .where(and(eq(gbCountryLegsTable.gbId, gbId), inArray(gbCountryLegsTable.id, legIds))) : [];
  const resolved = orders.map(order => {
    if (!legacy.includes(order)) return order;
    const leg = legs.find(row => row.id === order.countryLegId);
    if (!leg) return order;
    const recipient = resolvePostageReshipper(null, leg.countryCode, assignments);
    return recipient ? { ...order, reshipperUsername: recipient } : order;
  });
  return { orders: resolved, usernames: assignments.map(row => row.reshipperUsername) };
}

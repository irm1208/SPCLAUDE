import { ordersTable, groupBuysTable, orderLineItemsTable, accountGroupBuysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { resolveGroupOrderRoute } from "./group-buy-delivery-routing-service";
import { refundMutableOrderWhere } from "./refund-mutation-guard";

export class MoveOrderGroupError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Do not persist a new group without resolving its own delivery assignments. */
export async function moveOrderGroup(database: any, orderId: string, targetGbId: string) {
  return database.transaction(async (tx: any) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
    if (!order) throw new MoveOrderGroupError("Order not found", 404);
    const [target] = await tx.select().from(groupBuysTable).where(eq(groupBuysTable.id, targetGbId));
    if (!target) throw new MoveOrderGroupError("Target group buy not found", 404);
    const items = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
    const route = await resolveGroupOrderRoute({
      gbId: targetGbId, methodId: order.deliveryMethodId,
      direct: order.deliveryMethodId === "__direct_shipping" || order.directShippingRequested === true,
      country: order.shippingCountry, username: order.telegramUsername,
      // Never carry an assignment from the old group into a different group.
      preferred: order.groupBuyId === targetGbId ? order.reshipperUsername : null,
      items: items.map((item: { quantity: string }) => ({ quantity: Number(item.quantity) })),
    }, tx);
    const [updated] = await tx.update(ordersTable).set({
      groupBuyId: targetGbId, reshipperUsername: route.reshipperUsername,
      routingType: route.routingType, reshipperCleared: false,
      countryLegId: order.groupBuyId === targetGbId ? order.countryLegId ?? null : null,
    }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId))).returning({ id: ordersTable.id });
    if (!updated) throw new MoveOrderGroupError("Order is locked by a refund. No changes were made.", 409);
    await tx.insert(accountGroupBuysTable).values({
      id: randomUUID(), accountId: order.telegramUsername, groupBuyId: targetGbId,
    }).onConflictDoNothing();
    return {
      previousGbId: order.groupBuyId, newGbId: targetGbId,
      reshipperUsername: route.reshipperUsername, routingType: route.routingType,
      reshipperCleared: false,
      countryLegId: order.groupBuyId === targetGbId ? order.countryLegId ?? null : null,
    };
  });
}

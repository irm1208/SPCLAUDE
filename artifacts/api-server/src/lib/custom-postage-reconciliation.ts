import { and, eq } from "drizzle-orm";
import { groupBuysTable, ordersTable, orderLineItemsTable, gbHalfKitClaimsTable } from "@workspace/db";
import { customPostagePrice, customPostagePatch, shippingOptionMatchesCountry, type CustomPostageOption } from "./group-buy-shipping-options";
import { HalfKitError } from "./half-kit-rules";

/** Used inside the existing half-kit transaction; never rewrites unrelated orders. */
export async function reconcileCustomPostage(tx: any, orderId: string) {
  const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
  if (!order?.groupBuyId || order.additionOfOrderId || order.directShippingRequested || !order.deliveryMethodId?.startsWith("eu-postage-")) return order;
  const [group] = await tx.select({ shippingOptions: groupBuysTable.shippingOptions }).from(groupBuysTable).where(eq(groupBuysTable.id, order.groupBuyId));
  const options = JSON.parse(group?.shippingOptions || "[]") as CustomPostageOption[];
  const option = options.find(option => option.id === order.deliveryMethodId && shippingOptionMatchesCountry(option, order.shippingCountry));
  if (!option?.kitPrices) throw new HalfKitError("Your delivery option has changed. Ask the organiser to update it before changing quantities.");
  const lines = await tx.select({ quantity: orderLineItemsTable.quantity }).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
  const kits = lines.reduce((sum: number, line: { quantity: number }) => sum + Number(line.quantity), 0);
  if (!kits) return order; // Whole-order cancellation may temporarily have no remaining lines.
  const price = customPostagePrice(option, kits);
  if (price === null) throw new HalfKitError("No delivery rate is available for the new kit quantity. Ask the organiser for a quote.");
  const claims = await tx.select({ deliveryCharge: gbHalfKitClaimsTable.deliveryCharge }).from(gbHalfKitClaimsTable)
    .where(and(eq(gbHalfKitClaimsTable.orderId, orderId), eq(gbHalfKitClaimsTable.state, "active")));
  const target = price + claims.reduce((sum: number, claim: { deliveryCharge: unknown }) => sum + Number(claim.deliveryCharge || 0), 0);
  const patch = customPostagePatch(order, target);
  if (!Object.keys(patch).length) return order;
  const [updated] = await tx.update(ordersTable).set({ ...patch, updatedAt: new Date() }).where(eq(ordersTable.id, orderId)).returning();
  return updated;
}

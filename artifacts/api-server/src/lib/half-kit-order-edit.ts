import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  gbHalfKitClaimsTable as claims, groupBuyProductsTable, groupBuysTable,
  orderLineItemsTable, ordersTable, productsTable,
} from "@workspace/db";
import { assertGroupStock } from "./group-buy-stock";
import { assertNoActiveRefund, refundMutableOrderWhere, RefundMutationBlockedError } from "./refund-mutation-guard";
import { HalfKitError, money } from "./half-kit-rules";
import { planHalfKitOrderEdit, type HalfKitEditOptions } from "./half-kit-order-edit-rules";
import { resolveGroupBuyAdminFee } from "./group-buy-admin-fee";
import { assertSupplierOrderEditable } from "./supplier-batch-protection";
import { reconcileCustomPostage } from "./custom-postage-reconciliation";

/**
 * The caller holds the request-wide half-kit money mutex. Do not reacquire it
 * on this transaction's connection. All writes roll back together.
 */
export async function editOrderWithHalfKits(tx: any, orderId: string, groupId: string, input: any,
  options: HalfKitEditOptions = {}): Promise<{
  updatedOrder: typeof ordersTable.$inferSelect;
  insertedLineItems: Array<typeof orderLineItemsTable.$inferSelect>;
  lineItemsToInsert: Array<typeof orderLineItemsTable.$inferSelect>;
}> {
  await assertSupplierOrderEditable(tx, [orderId]);
  await assertGroupStock(tx, groupId, input.lineItems.filter((item: any) => Number(item.quantity) > 0), orderId);
  const [order] = await tx.select().from(ordersTable).where(and(
    eq(ordersTable.id, orderId), eq(ordersTable.groupBuyId, groupId), isNull(ordersTable.deletedAt),
  )).for("update");
  if (!order) throw new HalfKitError("Order not found.", 404);
  await assertNoActiveRefund(tx, orderId);
  const activeClaims = await tx.select().from(claims).where(and(eq(claims.orderId, orderId), eq(claims.state, "active")));
  const existing = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId)).for("update");
  const ids = input.lineItems.map((item: any) => item.productId);
  const catalogue = await tx.select({
    productId: productsTable.id, productName: productsTable.name, price: productsTable.price,
    priceOverride: groupBuyProductsTable.priceOverride,
  }).from(groupBuyProductsTable).innerJoin(productsTable, eq(groupBuyProductsTable.productId, productsTable.id))
    .where(and(eq(groupBuyProductsTable.groupBuyId, groupId), eq(groupBuyProductsTable.active, true),
      eq(productsTable.active, true), inArray(productsTable.id, ids)));
  const plan = planHalfKitOrderEdit(order, existing, activeClaims.map((claim: any) => claim.lineItemId), input, catalogue, options);
  // Any increased ordinary quantity also needs to be available; unchanged
  // historical lines can remain even if the organiser delisted that product.
  for (const line of plan.lines) {
    const prior = existing.find((old: any) => old.id === line.id);
    if ((!prior || Number(line.quantity) > Number(prior.quantity))
      && !catalogue.some((product: any) => product.productId === line.productId)) {
      throw new HalfKitError("A selected product is no longer available in this group buy.", 400);
    }
  }
  const [group] = await tx.select().from(groupBuysTable).where(eq(groupBuysTable.id, groupId));
  if (plan.subtotalDelta !== 0 && !order.directShippingRequested && !order.additionOfOrderId
    && money(order.adminFee) > 0 && group?.adminFeeEnabled && group.adminFeeType === "percent") {
    const resolvedFee = resolveGroupBuyAdminFee({
      enabled: true, feeType: "percent", baseAmount: group.adminFeeAmount,
      label: group.adminFeeLabel, countryOverrides: group.adminFeeCountries,
      shippingCountry: order.shippingCountry, productSubtotal: Math.abs(plan.subtotalDelta),
    }).amount;
    const fee = plan.subtotalDelta < 0 ? -Math.min(money(order.adminFee), resolvedFee) : resolvedFee;
    plan.orderPatch.adminFee = money(money(order.adminFee) + fee).toFixed(2);
    plan.orderPatch.grandTotal = money(money(plan.orderPatch.grandTotal) + fee).toFixed(2);
    if (order.paymentStatus === "confirmed") plan.orderPatch.amountDue = money(money(plan.orderPatch.amountDue) + fee).toFixed(2);
  }
  // Mark previously settled claims before a fresh balance is introduced.
  if (order.paymentStatus === "confirmed" && money(order.amountDue) === 0) {
    await tx.update(claims).set({ paidAt: new Date() }).where(and(
      eq(claims.orderId, orderId), eq(claims.state, "active"), isNull(claims.paidAt),
    ));
  }
  const [updatedOrder] = await tx.update(ordersTable).set({
    ...plan.orderPatch,
    notes: input.notes ? String(input.notes).trim().slice(0, 1000) : null,
    updatedAt: new Date(),
  }).where(refundMutableOrderWhere(eq(ordersTable.id, orderId))).returning();
  if (!updatedOrder) throw new RefundMutationBlockedError(orderId);
  const oldIds = new Set(existing.map((line: any) => line.id));
  const retainedIds = new Set(plan.lines.map(line => line.id));
  const protectedIds = new Set(activeClaims.map((claim: any) => claim.lineItemId));
  for (const old of existing) if (!retainedIds.has(old.id)) {
    if (protectedIds.has(old.id)) throw new HalfKitError("Reserved half-kit lines cannot be removed here.");
    const removed = await tx.delete(orderLineItemsTable).where(refundMutableOrderWhere(
      and(eq(orderLineItemsTable.id, old.id), eq(orderLineItemsTable.orderId, orderId)), orderLineItemsTable.orderId,
    )).returning({ id: orderLineItemsTable.id });
    if (removed.length !== 1) throw new RefundMutationBlockedError(orderId);
  }
  for (const line of plan.lines) {
    if (oldIds.has(line.id)) {
      const old = existing.find((item: any) => item.id === line.id);
      if (line.quantity !== old.quantity || line.lineTotal !== old.lineTotal) {
        await tx.update(orderLineItemsTable).set({ quantity: line.quantity, lineTotal: line.lineTotal })
          .where(and(eq(orderLineItemsTable.id, line.id), eq(orderLineItemsTable.orderId, orderId)));
      }
    } else await tx.insert(orderLineItemsTable).values({ ...line, orderId });
  }
  const allLines = await tx.select().from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId, orderId));
  return { updatedOrder: await reconcileCustomPostage(tx, orderId) ?? updatedOrder, insertedLineItems: allLines, lineItemsToInsert: allLines };
}

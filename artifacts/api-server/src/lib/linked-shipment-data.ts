import { gbSupplierBatchesTable, gbSupplierShipmentsTable, orderLineItemsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { buildShipmentContext } from "./linked-shipment-context";
import { regionalBatchReference } from "./supplier-batches-model";

/** No unscoped projection: pass only orders the caller is allowed to read. */
export async function loadShipmentContext(store: any, gbId: string, orders: any[]) {
  if (!orders.length) return [];
  const lines = await store.select({
    orderId: orderLineItemsTable.orderId, productId: orderLineItemsTable.productId,
    productName: orderLineItemsTable.productName, quantity: orderLineItemsTable.quantity,
  }).from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orders.map(o => o.id)));
  const batches = await store.select({
    id: gbSupplierBatchesTable.id, reference: gbSupplierBatchesTable.reference,
    state: gbSupplierBatchesTable.state, snapshot: gbSupplierBatchesTable.snapshot,
  }).from(gbSupplierBatchesTable).where(eq(gbSupplierBatchesTable.groupBuyId, gbId));
  const activeIds = batches.filter((b: any) => b.state !== "released").map((b: any) => b.id);
  const receipts = activeIds.length ? await store.select({
    batchId: gbSupplierShipmentsTable.batchId, recipientUsername: gbSupplierShipmentsTable.recipientUsername,
    cancelledAt: gbSupplierShipmentsTable.cancelledAt, receiptChecked: gbSupplierShipmentsTable.receiptChecked,
    receipt: gbSupplierShipmentsTable.receipt, contents: gbSupplierShipmentsTable.contents,
  }).from(gbSupplierShipmentsTable).where(inArray(gbSupplierShipmentsTable.batchId, activeIds)) : [];
  return buildShipmentContext(orders, lines, batches.map((b: any) => ({
    ...b, reference: regionalBatchReference(b.reference, b.snapshot?.region),
  })), receipts);
}

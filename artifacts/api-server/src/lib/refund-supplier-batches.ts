import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  gbSupplierBatchesTable as batches, gbSupplierAllocationsTable as allocations,
  gbSupplierShipmentsTable as shipments, gbSupplierEventsTable as events,
  gbSupplierSettingsTable as settings,
} from "@workspace/db";
import { GroupBuyRefundError } from "./group-buy-refund-error";
import { correctionSnapshots } from "./supplier-batch-correction-model";
export { lockHalfKitMoney as lockRefundSupplierGroup } from "./half-kit-lock";

const includesOrder = (b: any, id: string) => b.snapshot?.orders?.some((o: any) => o.id === id);
const submitted = (b: any) => b.state === "ordered" || b.orderedAt != null;

/** All active slices matter: a partial move may leave the root in another batch. */
async function activeAllocations(tx: any, order: Record<string, any>) {
  const rows = await tx.select().from(batches).where(and(
    eq(batches.groupBuyId, order.groupBuyId), ne(batches.state, "released"),
  )).orderBy(asc(batches.id)).for("update");
  const reservations = await tx.select().from(allocations).where(eq(allocations.orderId, order.id)).for("update");
  if (reservations.some((r: any) => !rows.some((b: any) => b.id === r.batchId))) {
    throw new GroupBuyRefundError("refund_batch_state_changed");
  }
  return rows.filter((b: any) => includesOrder(b, order.id) || reservations.some((r: any) => r.batchId === b.id));
}

export async function assertRefundBeforeVendor(tx: any, order: Record<string, any>) {
  if (!order.id || !order.groupBuyId) throw new GroupBuyRefundError("not_group_buy_order");
  if (order.batchLocked) throw new GroupBuyRefundError("submitted_to_vendor");
  const active = await activeAllocations(tx, order);
  if (active.some(submitted)) throw new GroupBuyRefundError("submitted_to_vendor");
  return active;
}

/** Read-only, batched member projection; never infer submission from Processing. */
export async function submittedSupplierOrderIds(database: any, orders: { id: string; groupBuyId: string | null; batchLocked?: boolean }[]) {
  const result = new Set(orders.filter(o => o.batchLocked).map(o => o.id));
  const groups = [...new Set(orders.map(o => o.groupBuyId).filter((id): id is string => !!id))];
  if (!groups.length) return result;
  const rows = await database.select().from(batches).where(and(
    inArray(batches.groupBuyId, groups), ne(batches.state, "released"),
    sql`(${batches.state} = 'ordered' OR ${batches.orderedAt} IS NOT NULL)`,
  ));
  const reserved = await database.select().from(allocations).where(inArray(allocations.orderId, orders.map(o => o.id)));
  for (const order of orders) {
    if (rows.some((b: any) => b.groupBuyId === order.groupBuyId
      && (includesOrder(b, order.id) || reserved.some((r: any) => r.orderId === order.id && r.batchId === b.id)))) result.add(order.id);
  }
  return result;
}

/** Called only inside successful refund completion, under the supplier group mutex. */
export async function removeRefundedSupplierAllocations(
  tx: any, order: Record<string, any>, refundId: string, actor: string,
) {
  const active = await assertRefundBeforeVendor(tx, order);
  const now = new Date(), reason = `Order #${order.code} refunded before vendor submission`;
  for (const b of active) {
    if (b.state !== "prepared") throw new GroupBuyRefundError("refund_batch_state_changed");
    const parcels = await tx.select().from(shipments).where(eq(shipments.batchId, b.id)).orderBy(asc(shipments.id)).for("update");
    const packageChanges = [];
    for (const p of parcels.filter((p: any) => !p.cancelledAt && p.contents.some((i: any) => i.orderId === order.id))) {
      if (p.receiptChecked || p.receipt?.length) throw new GroupBuyRefundError("refund_batch_receipt_checked");
      const contents = p.contents.filter((i: any) => i.orderId !== order.id);
      await tx.update(shipments).set({
        contents, version: p.version + 1, updatedAt: now,
        ...(!contents.length ? { cancelledAt: now, cancelReason: reason } : {}),
      }).where(and(eq(shipments.id, p.id), eq(shipments.version, p.version)));
      packageChanges.push({ shipmentId: p.id, beforeContents: p.contents, afterContents: contents });
    }
    const old = b.snapshot.orders.find((o: any) => o.id === order.id);
    // A stale reservation must also be removed, without inventing snapshot quantities.
    const next = old ? correctionSnapshots(b.snapshot, [order.id]).remaining : b.snapshot;
    const removal = { refundId, orderId: order.id, orderCode: order.code, kits: old?.kits ?? 0, createdAt: now.toISOString(), actor };
    const snapshot = { ...next, refundRemovals: [...(b.snapshot.refundRemovals ?? []), removal] };
    await tx.update(batches).set({
      snapshot, ...(!snapshot.orders.length ? { state: "released", releasedAt: now, releaseReason: reason } : {}),
    }).where(eq(batches.id, b.id));
    await tx.insert(events).values({ id: randomUUID(), groupBuyId: order.groupBuyId, kind: "refund_removed",
      detail: { ...removal, batchId: b.id, reference: b.reference, beforeSnapshot: b.snapshot, afterSnapshot: snapshot, packageChanges },
    });
  }
  await tx.delete(allocations).where(eq(allocations.orderId, order.id));
  if (active.length) await tx.update(settings).set({ version: sql`${settings.version}+1` }).where(eq(settings.groupBuyId, order.groupBuyId));
}

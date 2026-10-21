import { and, asc, eq, inArray } from "drizzle-orm";
import { db, accountGroupBuysTable, groupBuysTable, ordersTable, gbSupplierSettingsTable, gbSupplierBatchesTable, gbSupplierAllocationsTable, gbSupplierShipmentsTable } from "@workspace/db";
import { SupplierBatchError, type BatchOrder, type SupplierConfig } from "./supplier-batches-model";
import { orderReadiness, type QuantityShipment } from "./supplier-fulfilment-model";

type MemberBatch = { id: string; reference: string; state: string; createdAt: Date; orderedAt: Date | null;
  snapshot: { region: { name: string }; kits: number; orders: BatchOrder[] } };
type MemberShipment = QuantityShipment & { batchId: string };

/** Explicit allow-list: never spread staff batch/snapshot/shipment objects into a member response. */
export function memberBatchSummary(batch: MemberBatch, shipments: MemberShipment[], ownBatchIds: Set<string>) {
  const active = shipments.filter(s => s.batchId === batch.id && !s.cancelledAt);
  let status = batch.state === "released" ? "Released — not ordered" : batch.state === "prepared" ? "Prepared" : "Ordered from supplier";
  if (batch.state === "ordered" && active.length) {
    const readiness = batch.snapshot.orders.map(o => orderReadiness(o, active, []));
    const complete = readiness.length > 0 && readiness.every(r => r.ready);
    const anyReceived = readiness.some(r => r.items.some(i => i.received > 0));
    status = complete ? "Received by reshipper" : anyReceived ? "Part received by reshipper" : "Supplier packages arranged";
  }
  return { id: batch.id, reference: batch.reference, region: batch.snapshot.region.name, kits: batch.snapshot.kits,
    status, createdAt: batch.createdAt.toISOString(), orderedAt: batch.orderedAt?.toISOString() ?? null,
    isYourBatch: batch.state !== "released" && ownBatchIds.has(batch.id) };
}

export async function memberSupplierBatches(id: string, username: string, database = db) {
  return database.transaction(async tx => {
    const [group] = await tx.select({ name: groupBuysTable.name, status: groupBuysTable.status, forced: groupBuysTable.forcedUsernames })
      .from(groupBuysTable).where(eq(groupBuysTable.id, id));
    const [member] = await tx.select({ id: accountGroupBuysTable.id }).from(accountGroupBuysTable)
      .where(and(eq(accountGroupBuysTable.groupBuyId, id), eq(accountGroupBuysTable.accountId, username)));
    if (!group || group.status === "archived" || (!member && !group.forced?.includes(username)))
      throw new SupplierBatchError("Group buy not found or you are not a member.", 404);
    const [settings] = await tx.select({ config: gbSupplierSettingsTable.config }).from(gbSupplierSettingsTable)
      .where(eq(gbSupplierSettingsTable.groupBuyId, id));
    if ((settings?.config as SupplierConfig | undefined)?.showToMembers !== true)
      throw new SupplierBatchError("Batch status is not shared with members for this group buy.", 403);
    const batches = await tx.select({ id: gbSupplierBatchesTable.id, reference: gbSupplierBatchesTable.reference, state: gbSupplierBatchesTable.state,
      createdAt: gbSupplierBatchesTable.createdAt, orderedAt: gbSupplierBatchesTable.orderedAt, snapshot: gbSupplierBatchesTable.snapshot })
      .from(gbSupplierBatchesTable).where(eq(gbSupplierBatchesTable.groupBuyId, id)).orderBy(asc(gbSupplierBatchesTable.sequence));
    if (!batches.length) return { groupBuy: { id, name: group.name }, batches: [] };
    const ids = batches.map(b => b.id);
    const [shipments, owned] = await Promise.all([
      tx.select({ batchId: gbSupplierShipmentsTable.batchId, contents: gbSupplierShipmentsTable.contents, receipt: gbSupplierShipmentsTable.receipt,
        receiptChecked: gbSupplierShipmentsTable.receiptChecked, cancelledAt: gbSupplierShipmentsTable.cancelledAt })
        .from(gbSupplierShipmentsTable).where(inArray(gbSupplierShipmentsTable.batchId, ids)),
      tx.select({ batchId: gbSupplierAllocationsTable.batchId }).from(gbSupplierAllocationsTable)
        .innerJoin(ordersTable, eq(ordersTable.id, gbSupplierAllocationsTable.orderId))
        .where(and(inArray(gbSupplierAllocationsTable.batchId, ids), eq(ordersTable.telegramUsername, username), eq(ordersTable.groupBuyId, id))),
    ]);
    const own = new Set(owned.map(o => o.batchId));
    return { groupBuy: { id, name: group.name }, batches: batches.map(b => memberBatchSummary(b as MemberBatch, shipments as unknown as MemberShipment[], own)) };
  }, { isolationLevel: "repeatable read" });
}

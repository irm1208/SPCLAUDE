import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  ordersTable, gbSupplierBatchesTable as batches, gbSupplierAllocationsTable as allocations,
  gbSupplierEventsTable as events, gbSupplierShipmentsTable as shipments, gbSupplierSettingsTable as settings,
} from "@workspace/db";
import { SupplierBatchError, fingerprint, type BatchOrder } from "./supplier-batches-model";
import { correctionSnapshots } from "./supplier-batch-correction-model";
import { splitBatchQuantities, reservationBatch } from "./supplier-batch-additions";
import { assertNoActiveRefunds } from "./refund-mutation-guard";
import type { UpdateActor } from "./group-buy-updates-model";

/** Reconstruct exactly the recorded move. Never merge a later changed allocation. */
export function planMoveUndo(source: any, target: any, event: any) {
  const d = event.detail;
  if (!["orders_moved", "quantities_moved"].includes(event.kind) || !d.beforeSnapshot?.orders
    || !Array.isArray(d.orderIds) || !d.orderIds.length || !Array.isArray(d.packageChanges)
    || !source || !target || source.id !== d.batchId || target.id !== d.targetBatchId
    || source.groupBuyId !== target.groupBuyId || source.state !== "ordered" || target.state !== "prepared") {
    throw new SupplierBatchError("This move cannot be undone: the original batch must be submitted and the destination still prepared.", 409);
  }
  const expected = event.kind === "quantities_moved"
    ? splitBatchQuantities({ id: source.id, snapshot: d.beforeSnapshot }, d.lines)
    : correctionSnapshots(d.beforeSnapshot, d.orderIds);
  const withoutNotes = (snapshot: any) => {
    const { corrections: _notes, ...value } = snapshot;
    return value;
  };
  if (fingerprint(withoutNotes(source.snapshot)) !== fingerprint(withoutNotes(expected.remaining))
    || fingerprint(withoutNotes(target.snapshot)) !== fingerprint(withoutNotes(d.afterTargetSnapshot ?? expected.moved))) {
    throw new SupplierBatchError("These batches changed after the move. Undo is blocked to protect later work.", 409);
  }
  return expected;
}

/** Called only inside the canonical half-kit/group transaction lock. */
export async function undoMove(tx: any, group: any, batchId: string, actor: UpdateActor, body: any,
  dependencies: { state: (tx: any, group: any, reconcile?: boolean) => Promise<any>;
    audit: (tx: any, id: string, actor: string, action: string, detail: any) => Promise<void> }) {
  if (!actor.admin) throw new SupplierBatchError("Only Admin can undo a batch allocation move.", 403);
  if (body?.confirm !== true || typeof body.moveEventId !== "string"
    || typeof body.expectedBatchToken !== "string" || typeof body.expectedTargetToken !== "string"
    || typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 1000) {
    throw new SupplierBatchError("Review both batches, confirm Undo and give a reason (up to 1000 characters).", 400);
  }
  const id = group.id;
  const [event] = await tx.select().from(events).where(and(
    eq(events.id, body.moveEventId), eq(events.groupBuyId, id),
  ));
  if (!event || event.detail.batchId !== batchId) throw new SupplierBatchError("Move not found in this batch.", 404);
  const [replay] = await tx.select({ id: events.id }).from(events).where(and(
    eq(events.groupBuyId, id), eq(events.kind, "move_undone"),
    sql`${events.detail}->>'moveEventId' = ${event.id}`,
  ));
  if (replay) return; // Idempotent, including a second request with the original tokens.
  const current = await dependencies.state(tx, group, false);
  const source = current.batches.find((b: any) => b.id === batchId);
  const target = current.batches.find((b: any) => b.id === event.detail.targetBatchId);
  if (!source || !target || source.snapshot.token !== body.expectedBatchToken
    || target.snapshot.token !== body.expectedTargetToken) {
    throw new SupplierBatchError("A batch changed. Reload and review Undo again.", 409);
  }
  const { moved } = planMoveUndo(source, target, event);
  const ids: string[] = event.detail.orderIds;
  if ([...source.exceptions, ...target.exceptions].some((e: any) => ids.includes(e.orderId))) {
    throw new SupplierBatchError("An affected order changed after the move. Resolve its exception first.", 409);
  }
  const wholeIds = moved.orders.filter((o: BatchOrder) => !o.fullOrder).map((o: BatchOrder) => o.id);
  const selected = await tx.select().from(ordersTable).where(and(
    eq(ordersTable.groupBuyId, id), inArray(ordersTable.id, ids),
  )).orderBy(asc(ordersTable.id)).for("update");
  if (selected.length !== ids.length || selected.some((o: any) =>
    o.status !== (wholeIds.includes(o.id) ? "Submitted" : "Processing")
    || o.deletedAt || o.paymentStatus !== "confirmed" || Number(o.amountDue ?? 0) > 0
    || ["verifying", "pending_confirmation"].includes(o.balancePaymentStatus))) {
    throw new SupplierBatchError("Undo requires fully paid, unshipped orders without pending balance verification.", 409);
  }
  await assertNoActiveRefunds(tx, ids);
  const reservations = await tx.select().from(allocations)
    .where(inArray(allocations.orderId, ids)).for("update");
  if (moved.orders.some((o: BatchOrder) => !reservations.some((a: any) => a.orderId === o.id
    && a.batchId === (wholeIds.includes(o.id) ? target.id : reservationBatch(o, source.id))))) {
    throw new SupplierBatchError("An order reservation changed. Undo is blocked.", 409);
  }
  const packages = await tx.select().from(shipments).where(inArray(shipments.batchId, [source.id, target.id]))
    .orderBy(asc(shipments.id)).for("update");
  if (packages.some((p: any) => p.batchId === target.id)) {
    throw new SupplierBatchError("The destination has supplier packages. Undo is blocked to protect that delivery.", 409);
  }
  // Check every source parcel containing affected orders, not only the old manifest.
  const affected = packages.filter((p: any) => event.detail.packageChanges.some((c: any) => c.shipmentId === p.id)
    || p.contents.some((c: any) => ids.includes(c.orderId)));
  if (affected.some((p: any) => p.receiptChecked || p.receipt.length)) {
    throw new SupplierBatchError("An affected supplier package has an inspected receipt. Undo is blocked.", 409);
  }
  for (const change of event.detail.packageChanges) {
    const p = packages.find((p: any) => p.id === change.shipmentId && p.batchId === source.id);
    const cancelledByMove = p?.cancelledAt && !change.afterContents.length
      && p.cancelReason === `Allocation moved to ${target.reference}: ${event.detail.reason}`;
    if (!p || fingerprint(p.contents) !== fingerprint(change.afterContents) || (p.cancelledAt && !cancelledByMove)) {
      throw new SupplierBatchError("Supplier package contents changed after the move. Undo is blocked.", 409);
    }
  }
  // Newly created source parcels for affected orders must not be overwritten or duplicated.
  if (affected.some((p: any) => !event.detail.packageChanges.some((c: any) => c.shipmentId === p.id))) {
    throw new SupplierBatchError("A new supplier package contains an affected order. Undo is blocked.", 409);
  }
  const now = new Date(), reason = body.reason.trim();
  const markUndone = (notes: any[]) => (notes ?? []).map(note =>
    note.reference === (note.direction === "out" ? target.reference : source.reference)
      && note.reason === event.detail.reason && !note.undoneAt
      ? { ...note, undoneAt: now.toISOString(), undoneBy: actor.username, undoReason: reason } : note);
  const restored = { ...event.detail.beforeSnapshot,
    token: fingerprint({ undo: event.id, source: source.snapshot.token, target: target.snapshot.token }),
    corrections: markUndone(source.snapshot.corrections),
  };
  await tx.update(batches).set({ snapshot: restored }).where(eq(batches.id, source.id));
  await tx.update(batches).set(event.detail.beforeTargetSnapshot ? {
    snapshot: { ...event.detail.beforeTargetSnapshot,
      token: fingerprint({ undo: event.id, previous: target.snapshot.token }),
      corrections: markUndone(target.snapshot.corrections) },
  } : {
    state: "released", releasedAt: now, releaseReason: `Move undone: returned to ${source.reference}. ${reason}`,
    snapshot: { ...target.snapshot, corrections: markUndone(target.snapshot.corrections) },
  }).where(eq(batches.id, target.id));
  if (wholeIds.length) {
    const changed = await tx.update(allocations).set({ batchId: source.id }).where(and(
      eq(allocations.batchId, target.id), inArray(allocations.orderId, wholeIds),
    )).returning({ orderId: allocations.orderId });
    if (changed.length !== wholeIds.length) throw new SupplierBatchError("Order reservations changed.", 409);
    await tx.update(ordersTable).set({ status: "Processing" }).where(inArray(ordersTable.id, wholeIds));
  }
  for (const change of event.detail.packageChanges) {
    const p = packages.find((p: any) => p.id === change.shipmentId);
    await tx.update(shipments).set({
      contents: change.beforeContents, cancelledAt: null, cancelReason: null, version: p.version + 1, updatedAt: now,
    }).where(and(eq(shipments.id, p.id), eq(shipments.version, p.version)));
  }
  await tx.update(settings).set({ version: sql`${settings.version} + 1` }).where(eq(settings.groupBuyId, id));
  await dependencies.audit(tx, id, actor.username, "move_undone", {
    moveEventId: event.id, batchId: source.id, targetBatchId: target.id,
    reference: source.reference, targetReference: target.reference, orderIds: ids, kits: moved.kits, reason,
    beforeSourceSnapshot: source.snapshot, beforeTargetSnapshot: target.snapshot,
    restoredSnapshot: restored, packageChanges: event.detail.packageChanges,
  });
}

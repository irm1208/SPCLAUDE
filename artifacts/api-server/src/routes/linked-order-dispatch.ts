import type { IRouter, Request } from "express";
import { db, ordersTable, orderLineItemsTable } from "@workspace/db";
import { eq, inArray, or } from "drizzle-orm";
import type { DispatchRouterCfg } from "./admin-dispatch";
import { lockHalfKitMoney } from "../lib/half-kit-lock";
import { assertNoActiveRefunds, refundMutationErrorOrderId, withRefundMutationGuard } from "../lib/refund-mutation-guard";
import { combinedShippingReason, combineShippingLines, shippingIdentity } from "../lib/combined-order-shipping";
import { writeLog } from "../lib/audit-log";
import { loadShipmentContext } from "../lib/linked-shipment-data";
import { assertExpectedAllocations, linkedShipmentBlocker } from "../lib/linked-shipment-context";
import { clearReceiptDispatch, receiptDispatches, recordReceiptDispatch } from "../lib/receipt-dispatch-ledger";

type Order = typeof ordersTable.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class CombinedShippingError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const active = (order: Order) => !order.deletedAt && order.status !== "Cancelled";
const shipped = (order: Order) => ["Shipped", "Completed"].includes(order.status);
/** Hold the addition mutex before locking order/refund rows, across the entire old dispatch operation. */
export async function withLinkedDispatchBoundary<T>(database: any, gbId: string, ids: string[], work: (tx: Tx) => Promise<T>, mode: "dispatch" | "undo" | "legacy-stock" = "dispatch", expectedAllocations?: Record<string, string>): Promise<T> {
  return database.transaction(async (tx: Tx) => {
    await lockHalfKitMoney(tx, gbId);
    const rows: Order[] = await tx.select().from(ordersTable).where(eq(ordersTable.groupBuyId, gbId)).orderBy(ordersTable.id).for("update");
    const ledger = await receiptDispatches(tx, ids);
    let receiptIds: string[] = [];
    if (mode === "undo") {
      for (const value of ledger.values()) {
        if (value.groupBuyId !== gbId || value.orderIds.some(id => !ids.includes(id))) {
          throw new CombinedShippingError("Select every order in the combined parcel to undo its dispatch together.");
        }
      }
      for (const selected of rows.filter(row => ids.includes(row.id) && shipped(row) && row.trackingNumber)) {
        if (ledger.has(selected.id)) continue;
        const rootId = selected.additionOfOrderId ?? selected.id;
        const sameParcel = rows.filter(row => active(row) && shipped(row) && row.trackingNumber === selected.trackingNumber
          && (row.id === rootId || row.additionOfOrderId === rootId));
        if (sameParcel.length > 1 && sameParcel.some(row => !ids.includes(row.id))) {
          throw new CombinedShippingError("Select every order in the combined parcel to undo its dispatch together.");
        }
      }
    } else {
      if (ids.some(id => !rows.some(r => r.id === id && active(r) && !shipped(r)))) {
        throw new CombinedShippingError("An order changed or was already shipped. Reload before dispatching.");
      }
      const selected = rows.filter(row => ids.includes(row.id) && active(row) && !shipped(row));
      const context = await loadShipmentContext(tx, gbId, rows);
      try { assertExpectedAllocations(context, ids, expectedAllocations); }
      catch (e) { throw new CombinedShippingError((e as Error).message); }
      const blocker = linkedShipmentBlocker(context, selected.map(o => o.id));
      if (blocker) throw new CombinedShippingError(blocker);
      // A batch's checked per-order receipts are the inventory source for linked
      // orders. Legacy generic parcels have no batch identity and cannot safely
      // be deducted merely because their product names happen to match.
      for (const order of selected) {
        const c = context.find(c => c.id === order.id);
        if (c?.relatedOrderIds.length || order.additionOfOrderId) {
          if (c?.readiness || c?.reviewReason) throw new CombinedShippingError(c.reviewReason ?? c.readiness!);
          if (mode === "legacy-stock") throw new CombinedShippingError("Linked batch orders use their checked supplier receipts. Use batch-aware Mark Shipped, not generic parcel stock.");
          receiptIds.push(order.id);
        }
      }
    }
    const result = await withRefundMutationGuard(tx, ids, work);
    const after: Order[] = await tx.select().from(ordersTable).where(inArray(ordersTable.id, ids));
    if (mode === "undo") {
      await clearReceiptDispatch(tx, after.filter(o => !shipped(o) && ledger.has(o.id)).map(o => o.id));
    } else {
      for (const o of after.filter(o => receiptIds.includes(o.id) && shipped(o))) {
        await recordReceiptDispatch(tx, { source: "supplier_receipts", groupBuyId: gbId, orderIds: [o.id], trackingNumber: o.trackingNumber });
      }
    }
    return result;
  });
}
const fields = (order: Order) => ({
  id: order.id, code: order.code, telegramUsername: order.telegramUsername, status: order.status,
  deliveryMethod: order.deliveryMethod, shippingName: order.shippingName, shippingAddress: order.shippingAddress,
  shippingCity: order.shippingCity, shippingPostcode: order.shippingPostcode, shippingCountry: order.shippingCountry,
  reshipperUsername: order.reshipperUsername, routingType: order.routingType,
});

/** Registered inside the existing authenticated, role-scoped dispatch factory. */
export function registerLinkedOrderDispatch(router: IRouter, cfg: DispatchRouterCfg, database: any = db) {
  async function authorize(req: Request, orders: Order[]) {
    for (const order of orders) if (!await cfg.assertOrderAccess(req, order.id)) {
      throw new CombinedShippingError("You do not have access to every order in this linked shipment.", 403);
    }
  }
  async function family(store: any, parentId: string, gbId: string, lock = false): Promise<Order[]> {
    let query = store.select().from(ordersTable).where(or(eq(ordersTable.id, parentId), eq(ordersTable.additionOfOrderId, parentId))).orderBy(ordersTable.id);
    const rows: Order[] = await (lock ? query.for("update") : query);
    const parent = rows.find(order => order.id === parentId && !order.additionOfOrderId);
    if (!parent || !active(parent) || parent.groupBuyId !== gbId) throw new CombinedShippingError("Original order not found.", 404);
    const included = [parent, ...rows.filter(order => order.id !== parentId && active(order))];
    if (included.length < 2 || included.some(order => order.groupBuyId !== gbId)) throw new CombinedShippingError("No valid linked add-on shipment found.");
    return included;
  }
  async function linesFor(store: any, orders: Order[]) {
    const lines: (typeof orderLineItemsTable.$inferSelect)[] = await store.select().from(orderLineItemsTable)
      .where(inArray(orderLineItemsTable.orderId, orders.map(order => order.id)));
    if (orders.some(order => !lines.some(line => line.orderId === order.id))) throw new CombinedShippingError("An included order has no line items.");
    return combineShippingLines(lines.map(line => ({ productName: line.productName, quantity: Number(line.quantity) })));
  }
  const fail = (res: any, error: unknown) => {
    const refund = refundMutationErrorOrderId(error);
    if (refund) { res.status(409).json({ error: "Combined dispatch is paused while a refund is active." }); return; }
    if (error instanceof CombinedShippingError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[linked-order-dispatch]", error);
    res.status(500).json({ error: "Could not process the linked shipment." });
  };

  router.get(`${cfg.prefix}/:gbId/shipment-context`, async (req, res) => {
    try {
      const gbId = String(req.params.gbId);
      const all: Order[] = await database.select().from(ordersTable).where(eq(ordersTable.groupBuyId, gbId));
      const visible: Order[] = [];
      const owner = cfg.reshipperScope?.(req);
      for (const order of all) {
        if (!active(order) || (owner && shippingIdentity(order.reshipperUsername) !== owner && shippingIdentity(order.dispatchedByReshipper) !== owner)) continue;
        if (await cfg.assertOrderAccess(req, order.id)) visible.push(order);
      }
      const context = await loadShipmentContext(database, gbId, visible);
      for (const c of context) {
        // Warn without disclosing an inaccessible sibling's reference or count.
        if (all.some(o => active(o) && o.additionOfOrderId === c.id && !visible.some(v => v.id === o.id))) {
          c.reviewReason = "Linked shipment access requires staff review.";
        }
      }
      res.set("Cache-Control", "private, no-store").json({ orders: context });
    } catch (error) { fail(res, error); }
  });

  router.get(`${cfg.prefix}/:gbId/linked-orders`, async (req, res) => {
    try {
      const gbId = String(req.params.gbId);
      const all: Order[] = await database.select().from(ordersTable).where(eq(ordersTable.groupBuyId, gbId));
      const rootIds = [...new Set(all.filter(order => active(order) && order.additionOfOrderId).map(order => order.additionOfOrderId!))];
      const groups = [];
      const context = await loadShipmentContext(database, gbId, all);
      for (const parentId of rootIds) {
        const parent = all.find(order => order.id === parentId && active(order) && !order.additionOfOrderId);
        if (!parent) continue;
        const familyOrders = [parent, ...all.filter(order => order.additionOfOrderId === parentId && active(order))];
        // Never project another reshipper's child, address or reference, even on a malformed legacy family.
        try { await authorize(req, familyOrders); } catch { continue; }
        const parentContext = context.find(o => o.id === parentId);
        const includedIds = parentContext?.shipmentOrderIds ?? [];
        const orders = familyOrders.filter(o => includedIds.includes(o.id));
        const separateOrders = familyOrders.filter(o => !includedIds.includes(o.id)).map(o => {
          const c = context.find(c => c.id === o.id)!;
          return { ...c, reason: shipped(o) ? "Already shipped" : c.reviewReason ?? "Separate shipment — another batch",
            supplierBatchReferences: c.batches.map(b => `${b.reference} · ${b.kits} kits`) };
        });
        let reason = parentContext?.reviewReason ?? (orders.length < 2
          ? shipped(parent) ? "Original order already shipped. Fulfil remaining additions separately from Orders or Dispatch."
            : "Separate supplier batches: pack and dispatch each order separately from Orders or Dispatch."
          : combinedShippingReason(orders)), lines: Array<{ productName: string; quantity: number }> = [];
        reason ??= orders.map(o => context.find(c => c.id === o.id)?.readiness).find(Boolean) ?? null;
        const dispatched = familyOrders.every(shipped) && !!parent.trackingNumber && familyOrders.every(order => order.trackingNumber === parent.trackingNumber);
        const printOrders = dispatched ? familyOrders : orders;
        try { lines = await linesFor(database, printOrders); } catch { reason ??= "An included order has no valid product lines."; }
        const completedReason = combinedShippingReason(printOrders.map(order => ({ ...order, status: "Processing", dispatchConfirmedAt: null })));
        groups.push({
          parentId, orders: printOrders.map(order => ({ id: order.id, code: order.code, status: order.status, paymentStatus: order.paymentStatus,
            allocationToken: context.find(o => o.id === order.id)?.allocationToken })),
          separateOrders,
          printOrder: { ...fields(parent), lineItems: lines, includedOrderCodes: printOrders.map(order => order.code),
            supplierBatchReferences: printOrders.flatMap(o => context.find(c => c.id === o.id)?.batches.map(b => `#${o.code} · ${b.reference} · ${b.kits} kits`) ?? []),
            shipmentNotes: separateOrders.map(o => `#${o.code}: ${o.reason} · ${o.supplierBatchReferences.join(", ")}`) },
          canDispatch: !reason && !dispatched, canPrint: lines.length > 0 && (!reason || (dispatched && !completedReason)),
          reason: dispatched ? null : reason, dispatched, trackingNumber: dispatched ? parent.trackingNumber : null,
          stockSource: "supplier_receipts", parcels: [],
        });
      }
      res.set("Cache-Control", "no-store").json({ groups });
    } catch (error) { fail(res, error); }
  });

  router.post(`${cfg.prefix}/:gbId/linked-orders/:parentId/dispatch`, async (req, res) => {
    try {
      const gbId = String(req.params.gbId), parentId = String(req.params.parentId);
      const trackingNumber = typeof req.body.trackingNumber === "string" ? req.body.trackingNumber.trim() : "";
      const parcelIds = Array.isArray(req.body.parcelIds) ? [...new Set(req.body.parcelIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))] as string[] : [];
      if (!trackingNumber || trackingNumber.length > 200 || /[\r\n]/.test(trackingNumber) || parcelIds.length > 0) {
        res.status(400).json({ error: "Provide one tracking number. Linked batch shipments use checked supplier receipts, not generic source parcels." }); return;
      }
      const result = await database.transaction(async (tx: any) => {
        // Same group money mutex as additions/batch preparation: the family cannot grow during dispatch.
        await lockHalfKitMoney(tx, gbId);
        const orders = await family(tx, parentId, gbId, true);
        await authorize(req, orders);
        if (orders.every(shipped) && orders.every(order => order.trackingNumber === trackingNumber)) {
          return { orderIds: orders.map(o => o.id), trackingNumber, replayed: true };
        }
        const context = await loadShipmentContext(tx, gbId, orders);
        const parentContext = context.find(o => o.id === parentId);
        if (!parentContext || parentContext.reviewReason) throw new CombinedShippingError(parentContext?.reviewReason ?? "Reload the shipment allocation.");
        const included = orders.filter(o => parentContext.shipmentOrderIds.includes(o.id));
        const reason = combinedShippingReason(included) ?? included.map(o => context.find(c => c.id === o.id)?.readiness).find(Boolean);
        if (reason) throw new CombinedShippingError(reason);
        const orderIds = included.map(order => order.id);
        try { assertExpectedAllocations(context, orderIds, req.body.expectedAllocations); }
        catch (e) { throw new CombinedShippingError((e as Error).message); }
        await assertNoActiveRefunds(tx, orderIds);
        await linesFor(tx, included);
        // Supplier receipts are already reserved to these exact order/product
        // identities. The locked order's shipment state consumes them once;
        // generic parcel inventory is deliberately untouched.
        const now = new Date();
        await tx.update(ordersTable).set({
          status: "Shipped", dispatchConfirmedAt: now, dispatchedByReshipper: orders[0].reshipperUsername,
          trackingNumber, trackingNumbers: [trackingNumber], trackingPackages: null, trackingShippedItems: {},
          trackingStatus: null, trackingEvents: [], trackingDetails: {},
          trackingLastChecked: null, updatedAt: now,
        }).where(inArray(ordersTable.id, orderIds));
        await recordReceiptDispatch(tx, { source: "supplier_receipts", groupBuyId: gbId, orderIds, trackingNumber });
        return { orderIds, trackingNumber, replayed: false };
      });
      if (!result.replayed) {
        void writeLog("order", "info", "combined_order_dispatch", "Linked orders dispatched together", { groupBuyId: gbId, parentId,
          orderIds: result.orderIds, trackingNumber: result.trackingNumber }).catch(error => console.error("[linked-dispatch audit]", error));
      }
      res.json({ ok: true, ...result });
    } catch (error) { fail(res, error); }
  });

  // Prevent the old individual-dispatch actions from silently splitting an undispatched family.
  for (const action of ["confirm", "mark-orders-shipped", "mark-shipped-by-reshipper"]) {
    router.post(`${cfg.prefix}/:gbId/${action}`, async (req, res, next) => {
      try {
        const rows: Order[] = await database.select().from(ordersTable).where(eq(ordersTable.groupBuyId, String(req.params.gbId)));
        const requested = Array.isArray(req.body.orderIds) ? new Set(req.body.orderIds) : null;
        if (!requested && !(action === "mark-shipped-by-reshipper" && req.body.reshipper)) { next(); return; }
        const selected = rows.filter(order => active(order) && !shipped(order) && (requested ? requested.has(order.id)
          : shippingIdentity(order.reshipperUsername) === shippingIdentity(req.body.reshipper)));
        const allowed = [];
        for (const order of selected) if (await cfg.assertOrderAccess(req, order.id)) allowed.push(order);
        const context = await loadShipmentContext(database, String(req.params.gbId), rows);
        const blocker = linkedShipmentBlocker(context, allowed.map(o => o.id));
        if (blocker) {
          res.status(409).json({ error: blocker }); return;
        }
        next();
      } catch (error) { fail(res, error); }
    });
  }
}

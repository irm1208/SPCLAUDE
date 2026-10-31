import type { IRouter, Request } from "express";
import { db, ordersTable, orderLineItemsTable, gbParcelsTable, type ParcelItem } from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import type { DispatchRouterCfg } from "./admin-dispatch";
import { lockHalfKitMoney } from "../lib/half-kit-lock";
import { assertNoActiveRefunds, refundMutationErrorOrderId, withRefundMutationGuard } from "../lib/refund-mutation-guard";
import { allocateCombinedStock, combinedShippingReason, combineShippingLines, shippingIdentity } from "../lib/combined-order-shipping";
import { writeLog } from "../lib/audit-log";

type Order = typeof ordersTable.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class CombinedShippingError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const active = (order: Order) => !order.deletedAt && order.status !== "Cancelled";
const shipped = (order: Order) => ["Shipped", "Completed"].includes(order.status);
function requiresCombined(rows: Order[], selected: Order[]) {
  return selected.some(order => {
    const parent = order.additionOfOrderId ? rows.find(row => row.id === order.additionOfOrderId) : order;
    if (!parent || !active(parent) || shipped(parent)) return false;
    const children = rows.filter(row => row.additionOfOrderId === parent.id && active(row));
    return children.length > 0 && !children.some(shipped);
  });
}

/** Hold the addition mutex before locking order/refund rows, across the entire old dispatch operation. */
export async function withLinkedDispatchBoundary<T>(database: any, gbId: string, ids: string[], work: (tx: Tx) => Promise<T>, mode: "dispatch" | "undo" = "dispatch"): Promise<T> {
  return database.transaction(async (tx: Tx) => {
    await lockHalfKitMoney(tx, gbId);
    const rows: Order[] = await tx.select().from(ordersTable).where(eq(ordersTable.groupBuyId, gbId));
    if (mode === "undo") {
      for (const selected of rows.filter(row => ids.includes(row.id) && shipped(row) && row.trackingNumber)) {
        const rootId = selected.additionOfOrderId ?? selected.id;
        const sameParcel = rows.filter(row => active(row) && shipped(row) && row.trackingNumber === selected.trackingNumber
          && (row.id === rootId || row.additionOfOrderId === rootId));
        if (sameParcel.length > 1 && sameParcel.some(row => !ids.includes(row.id))) {
          throw new CombinedShippingError("Select every order in the combined parcel to undo its dispatch together.");
        }
      }
    } else if (requiresCombined(rows, rows.filter(row => ids.includes(row.id) && active(row) && !shipped(row)))) {
      throw new CombinedShippingError("This order has linked add-ons. Use the Linked orders tab to pack and dispatch them together.");
    }
    return withRefundMutationGuard(tx, ids, work);
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
  const matchingParcel = (parcel: typeof gbParcelsTable.$inferSelect, parent: Order) =>
    parcel.groupBuyId === parent.groupBuyId && parcel.status === "delivered"
    && shippingIdentity(parcel.reshipperUsername) === shippingIdentity(parent.reshipperUsername);
  const fail = (res: any, error: unknown) => {
    const refund = refundMutationErrorOrderId(error);
    if (refund) { res.status(409).json({ error: "Combined dispatch is paused while a refund is active." }); return; }
    if (error instanceof CombinedShippingError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[linked-order-dispatch]", error);
    res.status(500).json({ error: "Could not process the linked shipment." });
  };

  router.get(`${cfg.prefix}/:gbId/linked-orders`, async (req, res) => {
    try {
      const gbId = String(req.params.gbId);
      const all: Order[] = await database.select().from(ordersTable).where(eq(ordersTable.groupBuyId, gbId));
      const rootIds = [...new Set(all.filter(order => active(order) && order.additionOfOrderId).map(order => order.additionOfOrderId!))];
      const parcels: (typeof gbParcelsTable.$inferSelect)[] = await database.select().from(gbParcelsTable).where(eq(gbParcelsTable.groupBuyId, gbId));
      const groups = [];
      for (const parentId of rootIds) {
        const parent = all.find(order => order.id === parentId && active(order) && !order.additionOfOrderId);
        if (!parent) continue;
        const orders = [parent, ...all.filter(order => order.additionOfOrderId === parentId && active(order))];
        // Never project another reshipper's child, address or reference, even on a malformed legacy family.
        try { await authorize(req, orders); } catch { continue; }
        let reason = combinedShippingReason(orders), lines: Array<{ productName: string; quantity: number }> = [];
        const dispatched = orders.every(shipped) && !!parent.trackingNumber && orders.every(order => order.trackingNumber === parent.trackingNumber);
        try { lines = await linesFor(database, orders); } catch { reason ??= "An included order has no valid product lines."; }
        const sources = parcels.filter(parcel => matchingParcel(parcel, parent));
        if (!reason) {
          try { allocateCombinedStock(lines, sources as any); } catch (error) { reason = (error as Error).message; }
        }
        const completedReason = combinedShippingReason(orders.map(order => ({ ...order, status: "Processing", dispatchConfirmedAt: null })));
        groups.push({
          parentId, orders: orders.map(order => ({ id: order.id, code: order.code, status: order.status, paymentStatus: order.paymentStatus })),
          printOrder: { ...fields(parent), lineItems: lines, includedOrderCodes: orders.map(order => order.code) },
          canDispatch: !reason && !dispatched, canPrint: lines.length > 0 && (!reason || (dispatched && !completedReason)),
          reason: dispatched ? null : reason, dispatched, trackingNumber: dispatched ? parent.trackingNumber : null,
          parcels: sources.map(parcel => ({ id: parcel.id, label: parcel.label, status: parcel.status })),
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
      if (!trackingNumber || trackingNumber.length > 200 || /[\r\n]/.test(trackingNumber) || !parcelIds.length || parcelIds.length > 100) {
        res.status(400).json({ error: "Provide one tracking number and select the delivered source parcels." }); return;
      }
      const result = await database.transaction(async (tx: any) => {
        // Same group money mutex as additions/batch preparation: the family cannot grow during dispatch.
        await lockHalfKitMoney(tx, gbId);
        const orders = await family(tx, parentId, gbId, true);
        await authorize(req, orders);
        const orderIds = orders.map(order => order.id);
        if (orders.every(shipped) && orders.every(order => order.trackingNumber === trackingNumber)) {
          return { orderIds, trackingNumber, replayed: true };
        }
        const reason = combinedShippingReason(orders);
        if (reason) throw new CombinedShippingError(reason);
        await assertNoActiveRefunds(tx, orderIds);
        const parcels: (typeof gbParcelsTable.$inferSelect)[] = await tx.select().from(gbParcelsTable)
          .where(and(eq(gbParcelsTable.groupBuyId, gbId), inArray(gbParcelsTable.id, parcelIds))).orderBy(gbParcelsTable.id).for("update");
        if (parcels.length !== parcelIds.length || parcels.some(parcel => !matchingParcel(parcel, orders[0]))) {
          throw new CombinedShippingError("Source parcels must be delivered and match this shipment's group buy and reshipper.");
        }
        let allocations;
        try { allocations = allocateCombinedStock(await linesFor(tx, orders), parcels as any); }
        catch (error) { throw new CombinedShippingError((error as Error).message); }
        for (const parcel of allocations) await tx.update(gbParcelsTable).set({ items: parcel.items as ParcelItem[] }).where(eq(gbParcelsTable.id, parcel.id));
        const now = new Date();
        await tx.update(ordersTable).set({
          status: "Shipped", dispatchConfirmedAt: now, dispatchedByReshipper: orders[0].reshipperUsername,
          trackingNumber, trackingNumbers: [trackingNumber], trackingPackages: null, trackingShippedItems: {},
          trackingStatus: null, trackingEvents: [], trackingDetails: {},
          trackingLastChecked: null, updatedAt: now,
        }).where(inArray(ordersTable.id, orderIds));
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
        if (requiresCombined(rows, allowed)) {
          res.status(409).json({ error: "This order has linked add-ons. Use the Linked orders tab to pack and dispatch them together." }); return;
        }
        next();
      } catch (error) { fail(res, error); }
    });
  }
}

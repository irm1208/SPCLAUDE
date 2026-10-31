import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, groupBuysTable, productsTable, ordersTable, orderLineItemsTable, gbParcelsTable, type ParcelItem } from "@workspace/db";
import { registerLinkedOrderDispatch, withLinkedDispatchBoundary } from "../linked-order-dispatch";
import type { DispatchRouterCfg } from "../admin-dispatch";

vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
type StockItem = ParcelItem & { dispatchedQty?: number };

describe.runIf(process.env.COMBINED_SHIPPING_DB_TESTS === "1")("linked dispatch / real PostgreSQL with rollback", () => {
  it("enforces ownership, paid balances, routing and delivered stock; ships once and retains separate money", async () => {
    const rollback = new Error("rollback combined shipping fixtures");
    let server: Server | undefined;
    try {
      await db.transaction(async tx => {
        const gbId = randomUUID(), otherGbId = randomUUID(), parentId = randomUUID(), childId = randomUUID();
        const productId = randomUUID(), parcelId = randomUUID(), foreignParcelId = randomUUID();
        const username = `combined-test-${randomUUID()}`, shipper = `shipper-${randomUUID()}`;
        await tx.insert(groupBuysTable).values([
          { id: gbId, name: "Synthetic linked shipping", status: "active" },
          { id: otherGbId, name: "Synthetic unrelated shipping", status: "active" },
        ]);
        await tx.insert(productsTable).values({ id: productId, name: "Synthetic product 10mg", price: "10" });
        const baseOrder = { telegramUsername: username, groupBuyId: gbId, status: "Processing", paymentStatus: "confirmed",
          productSubtotal: "10", grandTotal: "10", deliveryPrice: "0", vendorShipping: "0", amountDue: "0",
          refundStatus: "none", reshipperUsername: shipper, routingType: "reshipper",
          deliveryMethod: "Synthetic Post", deliveryMethodId: "synthetic-post", shippingName: "Synthetic Member",
          shippingAddress: "1 Example Street", shippingCountry: "United Kingdom" };
        await tx.insert(ordersTable).values([
          { ...baseOrder, id: parentId, code: `test-parent-${parentId}` },
          { ...baseOrder, id: childId, code: `ADD-${childId}`, additionOfOrderId: parentId },
        ]);
        await tx.insert(orderLineItemsTable).values([
          { id: randomUUID(), orderId: parentId, productId, productName: "Synthetic product 10mg", quantity: "2", unitPrice: "10", lineTotal: "20" },
          { id: randomUUID(), orderId: childId, productId, productName: "Synthetic product 10mg", quantity: "1", unitPrice: "10", lineTotal: "10" },
        ]);
        await tx.insert(gbParcelsTable).values([
          { id: parcelId, groupBuyId: gbId, label: "Synthetic delivered stock", reshipperUsername: shipper,
            trackingNumber: `test-inbound-${parcelId}`, status: "delivered", items: [{ name: "Synthetic product 10mg", qty: 5, dispatchedQty: 1 }] as StockItem[] },
          { id: foreignParcelId, groupBuyId: otherGbId, label: "Other GB stock", reshipperUsername: shipper,
            trackingNumber: `test-inbound-${foreignParcelId}`, status: "delivered", items: [{ name: "Synthetic product 10mg", qty: 100 }] },
        ]);
        const store = new Proxy(tx, { get(target, property) {
          if (property === "transaction") return async (callback: (transaction: typeof tx) => unknown) => callback(tx);
          const value = (target as any)[property];
          return typeof value === "function" ? value.bind(target) : value;
        } });
        const cfg: DispatchRouterCfg = {
          prefix: "/test/dispatch", ordersImagesPrefix: "/test/orders", includeAux: false,
          auth: (_req, _res, next) => next(), assertGbAccess: async () => true, assertImageAccess: async () => false,
          assertOrderAccess: async (req, id) => req.headers["x-owner"] !== "outsider"
            && (id === parentId || id === childId) && (await tx.select().from(ordersTable).where(eq(ordersTable.id, id))).length === 1,
        };
        const router = express.Router();
        registerLinkedOrderDispatch(router, cfg, store);
        router.post("/test/dispatch/:gbId/confirm", (_req, res) => res.json({ legacy: true }));
        const app = express(); app.use(express.json()); app.use(router);
        server = await new Promise<Server>(resolve => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
        const port = (server.address() as { port: number }).port;
        const base = `http://127.0.0.1:${port}/test/dispatch/${gbId}`;
        const read = async (owner?: string) => (await fetch(`${base}/linked-orders`, { headers: owner ? { "x-owner": owner } : {} })).json() as Promise<{ groups: any[] }>;
        const dispatch = async (body: Record<string, unknown> = {}, owner?: string) => {
          const response = await fetch(`${base}/linked-orders/${parentId}/dispatch`, { method: "POST",
            headers: { "Content-Type": "application/json", ...(owner ? { "x-owner": owner } : {}) },
            body: JSON.stringify({ trackingNumber: "TEST-ONE-PARCEL", parcelIds: [parcelId], ...body }) });
          return { status: response.status, body: await response.json() as Record<string, any> };
        };
        const snapshot = async () => ({
          orders: await tx.select().from(ordersTable).where(inArray(ordersTable.id, [parentId, childId])).orderBy(ordersTable.id),
          parcels: await tx.select().from(gbParcelsTable).where(inArray(gbParcelsTable.id, [parcelId, foreignParcelId])).orderBy(gbParcelsTable.id),
        });

        const initial = await snapshot();
        const groups = (await read()).groups;
        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({ canDispatch: true, canPrint: true });
        expect(groups[0].printOrder.lineItems).toEqual([{ productName: "Synthetic product 10mg", quantity: 3 }]);
        expect(groups[0].printOrder.includedOrderCodes).toHaveLength(2);
        expect((await read("outsider")).groups).toEqual([]);
        expect((await dispatch({}, "outsider")).status).toBe(403);
        expect((await dispatch({ parcelIds: [foreignParcelId] })).status).toBe(409);
        expect(await snapshot()).toEqual(initial);

        for (const update of [{ paymentStatus: "unpaid" }, { amountDue: "1" }, { shippingAddress: "A different address" },
          { reshipperUsername: "different-shipper" }, { refundStatus: "requested" }]) {
          await tx.update(ordersTable).set(update).where(eq(ordersTable.id, childId));
          expect((await read()).groups[0].canDispatch).toBe(false);
          expect((await dispatch()).status).toBe(409);
          await tx.update(ordersTable).set({ ...baseOrder }).where(eq(ordersTable.id, childId));
        }
        await tx.update(gbParcelsTable).set({ items: [{ name: "Synthetic product 10mg", qty: 2, dispatchedQty: 0 }] as StockItem[] }).where(eq(gbParcelsTable.id, parcelId));
        expect((await read()).groups[0].canDispatch).toBe(false);
        expect((await dispatch()).status).toBe(409);
        await tx.update(gbParcelsTable).set({ items: initial.parcels.find(parcel => parcel.id === parcelId)!.items }).where(eq(gbParcelsTable.id, parcelId));

        const oldDispatch = await fetch(`${base}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: [parentId] }) });
        expect(oldDispatch.status).toBe(409);
        await expect(withLinkedDispatchBoundary(store, gbId, [parentId], async () => { throw new Error("must not mutate"); }))
          .rejects.toThrow("Linked orders");

        const sent = await dispatch();
        expect(sent.status, JSON.stringify(sent.body)).toBe(200);
        expect(sent.body.orderIds.sort()).toEqual([parentId, childId].sort());
        const after = await snapshot();
        for (const order of after.orders) {
          expect(order.status).toBe("Shipped");
          expect(order.trackingNumber).toBe("TEST-ONE-PARCEL");
          expect(order.trackingNumbers).toEqual(["TEST-ONE-PARCEL"]);
          expect(order.dispatchConfirmedAt).toBeTruthy();
          const original = initial.orders.find(row => row.id === order.id)!;
          for (const key of ["grandTotal", "paymentStatus", "productSubtotal", "deliveryPrice", "vendorShipping", "additionOfOrderId", "code"] as const) {
            expect(order[key]).toEqual(original[key]);
          }
        }
        expect((after.parcels.find(parcel => parcel.id === parcelId)!.items as StockItem[])[0].dispatchedQty).toBe(4);
        expect((await dispatch()).body.replayed).toBe(true);
        expect(await snapshot()).toEqual(after);
        expect((await dispatch({ trackingNumber: "ANOTHER-NUMBER" })).status).toBe(409);
        expect((await read()).groups[0]).toMatchObject({ dispatched: true, canPrint: true, canDispatch: false, trackingNumber: "TEST-ONE-PARCEL" });
        await expect(withLinkedDispatchBoundary(store, gbId, [parentId], async () => {}, "undo"))
          .rejects.toThrow("every order");
        expect(await withLinkedDispatchBoundary(store, gbId, [parentId, childId], async () => "allowed", "undo")).toBe("allowed");

        await tx.update(ordersTable).set({ status: "Processing", dispatchConfirmedAt: null, trackingNumber: null }).where(eq(ordersTable.id, childId));
        expect((await read()).groups[0].canDispatch).toBe(false);
        expect((await dispatch()).status).toBe(409);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); }
  }, 45000);
});

import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, accountsTable, groupBuysTable, productsTable, ordersTable, orderLineItemsTable, gbParcelsTable,
  gbSupplierBatchesTable, gbSupplierShipmentsTable, siteConfigTable, type ParcelItem } from "@workspace/db";
import { registerLinkedOrderDispatch, withLinkedDispatchBoundary } from "../linked-order-dispatch";
import type { DispatchRouterCfg } from "../admin-dispatch";

vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
type StockItem = ParcelItem & { dispatchedQty?: number };

describe.runIf(process.env.COMBINED_SHIPPING_DB_TESTS === "1")("linked dispatch / real PostgreSQL with rollback", () => {
  it("enforces exact batch receipts, paid balances and ownership; ships same-batch once and later-batch independently", async () => {
    const rollback = new Error("rollback combined shipping fixtures");
    let server: Server | undefined;
    try {
      await db.transaction(async tx => {
        const gbId = randomUUID(), otherGbId = randomUUID(), parentId = randomUUID(), childId = randomUUID();
        const productId = randomUUID(), parcelId = randomUUID(), foreignParcelId = randomUUID();
        const username = `combined-test-${randomUUID()}`, shipper = `shipper-${randomUUID()}`;
        const batchId = randomUUID(), laterBatchId = randomUUID(), shipmentId = randomUUID();
        await tx.insert(accountsTable).values({ telegramUsername: shipper });
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
        const batchOrders = [
          { id: parentId, items: [{ productId, productName: "Synthetic product 10mg", quantity: 2 }], kits: 2 },
          { id: childId, items: [{ productId, productName: "Synthetic product 10mg", quantity: 1 }], kits: 1 },
        ];
        await tx.insert(gbSupplierBatchesTable).values({
          id: batchId, groupBuyId: gbId, sequence: 1, reference: "GB-TEST / 001",
          state: "ordered", previewToken: randomUUID(), createdBy: "synthetic-test",
          snapshot: { orders: batchOrders },
        });
        const receipt = [{ orderId: parentId, productId, good: 2, damaged: 0 }, { orderId: childId, productId, good: 1, damaged: 0 }];
        const contents = batchOrders.map(o => ({ orderId: o.id, productId, productName: "Synthetic product 10mg", quantity: o.kits }));
        await tx.insert(gbSupplierShipmentsTable).values({
          id: shipmentId, batchId, recipientUsername: shipper, contents, receipt, receiptChecked: 1,
          requestKey: randomUUID(), requestHash: randomUUID(), label: "Synthetic checked batch", createdBy: "synthetic-test",
        });
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
            && (req.headers["x-owner"] !== "parent-only" || id === parentId)
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
            body: JSON.stringify({ trackingNumber: "TEST-ONE-PARCEL", parcelIds: [], ...body }) });
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
        expect((await dispatch({ parcelIds: [foreignParcelId] })).status).toBe(400);
        expect(await snapshot()).toEqual(initial);
        const privateContext = await (await fetch(`${base}/shipment-context`, { headers: { "x-owner": "parent-only" } })).json() as { orders: any[] };
        expect(privateContext.orders).toHaveLength(1);
        expect(privateContext.orders[0].relatedOrderIds).toEqual([]);
        expect(JSON.stringify(privateContext)).not.toContain(childId);

        for (const update of [{ paymentStatus: "unpaid" }, { amountDue: "1" }, { shippingAddress: "A different address" },
          { reshipperUsername: "different-shipper" }, { refundStatus: "requested" }]) {
          await tx.update(ordersTable).set(update).where(eq(ordersTable.id, childId));
          expect((await read()).groups[0].canDispatch).toBe(false);
          expect((await dispatch()).status).toBe(409);
          await tx.update(ordersTable).set({ ...baseOrder }).where(eq(ordersTable.id, childId));
        }
        await tx.update(gbSupplierShipmentsTable).set({ receiptChecked: 0 }).where(eq(gbSupplierShipmentsTable.id, shipmentId));
        expect((await read()).groups[0].canDispatch).toBe(false);
        expect((await dispatch()).status).toBe(409);
        await tx.update(gbSupplierShipmentsTable).set({ receiptChecked: 1 }).where(eq(gbSupplierShipmentsTable.id, shipmentId));

        const oldDispatch = await fetch(`${base}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: [parentId] }) });
        expect(oldDispatch.status).toBe(409);
        await expect(withLinkedDispatchBoundary(store, gbId, [parentId], async () => { throw new Error("must not mutate"); }))
          .rejects.toThrow("Linked orders");

        const sent = await dispatch();
        expect(sent.status, JSON.stringify(sent.body)).toBe(200);
        expect(sent.body.orderIds.sort()).toEqual([parentId, childId].sort());
        const after = await snapshot();
        const [source] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, `supplier-receipt-dispatch:${parentId}`));
        expect(JSON.parse(source?.value ?? "null")).toMatchObject({ source: "supplier_receipts", orderIds: [parentId, childId] });
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
        expect(after.parcels).toEqual(initial.parcels); // Never consume unrelated generic stock.
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

        // Later-batch addition: paid original may go now; unpaid addition stays untouched.
        await tx.update(ordersTable).set({ status: "Processing", dispatchConfirmedAt: null, trackingNumber: null }).where(eq(ordersTable.id, parentId));
        await tx.update(gbSupplierBatchesTable).set({ snapshot: { orders: [batchOrders[0]] } }).where(eq(gbSupplierBatchesTable.id, batchId));
        await tx.insert(gbSupplierBatchesTable).values({
          id: laterBatchId, groupBuyId: gbId, sequence: 2, reference: "GB-TEST / 002", state: "ordered",
          previewToken: randomUUID(), createdBy: "synthetic-test", snapshot: { orders: [batchOrders[1]] },
        });
        await tx.update(gbSupplierShipmentsTable).set({ contents: [contents[0]], receipt: [receipt[0]] }).where(eq(gbSupplierShipmentsTable.id, shipmentId));
        await tx.update(ordersTable).set({ paymentStatus: "unpaid" }).where(eq(ordersTable.id, childId));
        expect(await withLinkedDispatchBoundary(store, gbId, [parentId], async guarded => {
          await guarded.update(ordersTable).set({ status: "Shipped" }).where(eq(ordersTable.id, parentId));
          return "only-original";
        })).toBe("only-original");
        expect((await snapshot()).orders.find(o => o.id === childId)?.status).toBe("Processing");
        await expect(withLinkedDispatchBoundary(store, gbId, [childId], async () => {})).rejects.toThrow(/payment/);
        await expect(withLinkedDispatchBoundary(store, gbId, [parentId], async () => {})).rejects.toThrow(/already shipped/);
        await tx.update(ordersTable).set({ paymentStatus: "confirmed" }).where(eq(ordersTable.id, childId));
        await tx.insert(gbSupplierShipmentsTable).values({
          id: randomUUID(), batchId: laterBatchId, recipientUsername: shipper,
          contents: [contents[1]], receipt: [receipt[1]], receiptChecked: 1,
          requestKey: randomUUID(), requestHash: randomUUID(), label: "Synthetic next batch", createdBy: "synthetic-test",
        });
        expect(await withLinkedDispatchBoundary(store, gbId, [childId], async () => "separate-addition")).toBe("separate-addition");
        await expect(withLinkedDispatchBoundary(store, gbId, [childId], async () => {}, "dispatch", { [childId]: "old-allocation" }))
          .rejects.toThrow(/allocation changed/i);
        expect((await snapshot()).parcels).toEqual(initial.parcels);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve())); }
  }, 45000);
});

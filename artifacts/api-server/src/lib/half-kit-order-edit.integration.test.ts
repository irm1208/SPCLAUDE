import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

describe.skipIf(process.env.HALF_KIT_EDIT_DB_TESTS !== "1")("claim-preserving order edits in PostgreSQL", () => {
  async function fixture(run: (tx: any, store: any, data: any) => Promise<void>) {
    const store = await import("@workspace/db");
    const { editOrderWithHalfKits } = await import("./half-kit-order-edit");
    const rollback = new Error("rollback synthetic half-kit edit fixtures");
    await expect(store.db.transaction(async tx => {
      const id = randomUUID(), halfId = randomUUID(), vialId = randomUUID(), orderId = randomUUID();
      const lineId = randomUUID(), offerId = randomUUID(), claimId = randomUUID();
      await tx.insert(store.groupBuysTable).values({ id, name: "Temporary edit test", status: "draft", currency: "USD" });
      await tx.insert(store.productsTable).values([
        { id: halfId, name: "Reserved half", price: "100" },
        { id: vialId, name: "Genetek 30ml vial", price: "7" },
      ]);
      await tx.insert(store.groupBuyProductsTable).values([
        { id: randomUUID(), groupBuyId: id, productId: halfId, active: true },
        { id: randomUUID(), groupBuyId: id, productId: vialId, active: true, stockOverride: "10" },
      ]);
      await tx.insert(store.ordersTable).values({
        id: orderId, code: "test-edit", telegramUsername: "synthetic-half-edit",
        groupBuyId: id, deliveryMethod: "Royal Mail", deliveryMethodId: "royal", deliveryPrice: "5",
        vendorShipping: "9", productSubtotal: "30", grandTotal: "54", adminFee: "10",
        creditsApplied: 2, paymentStatus: "unpaid",
      });
      await tx.insert(store.orderLineItemsTable).values({
        id: lineId, orderId, productId: halfId, productName: "Reserved half",
        quantity: "0.50", unitPrice: "60", lineTotal: "30",
      });
      await tx.insert(store.gbHalfKitOffersTable).values({
        id: offerId, groupBuyId: id, productId: halfId, price: "30",
        deliveryCharge: "2", vendorShippingCharge: "9", currency: "USD", createdBy: "synthetic-half-edit",
      });
      await tx.insert(store.gbHalfKitClaimsTable).values({
        id: claimId, offerId, groupBuyId: id, orderId, lineItemId: lineId, requestId: randomUUID(),
        offerVersion: 1, productId: halfId, productName: "Reserved half", username: "synthetic-half-edit",
        price: "30", deliveryCharge: "2", vendorShippingCharge: "9", cashDue: "41", currency: "USD",
      });
      const input = {
        deliveryMethodId: "royal", tip: 0, testingContribution: 0, notes: "Keep this note",
        lineItems: [
          { productId: halfId, productName: "Reserved half", quantity: 0.5, unitPrice: 100 },
          { productId: vialId, productName: "Genetek 30ml vial", quantity: 4, unitPrice: 0.01 },
        ],
      };
      await run(tx, store, { id, halfId, vialId, orderId, lineId, claimId, input, editOrderWithHalfKits });
      throw rollback;
    })).rejects.toBe(rollback);
  }
  it("adds four vials, keeps the claimed line and extra shipping, and is retry-safe", async () => {
    await fixture(async (tx, store, f) => {
      const result = await f.editOrderWithHalfKits(tx, f.orderId, f.id, f.input);
      expect(result.updatedOrder).toMatchObject({
        productSubtotal: "58.00", grandTotal: "82.00", deliveryPrice: "5.00",
        vendorShipping: "9.00", creditsApplied: 2, adminFee: "10.00", notes: "Keep this note",
      });
      expect(result.insertedLineItems).toHaveLength(2);
      expect(result.insertedLineItems.find((line: any) => line.id === f.lineId)).toMatchObject({
        quantity: "0.50", unitPrice: "60.00", lineTotal: "30.00",
      });
      const [claim] = await tx.select().from(store.gbHalfKitClaimsTable).where(eq(store.gbHalfKitClaimsTable.id, f.claimId));
      expect(claim).toMatchObject({ lineItemId: f.lineId, state: "active", price: "30.00" });
      const replay = await f.editOrderWithHalfKits(tx, f.orderId, f.id, f.input);
      expect(replay.updatedOrder.grandTotal).toBe("82.00");
      expect(replay.insertedLineItems).toHaveLength(2);
    });
  });
  it("refuses a claimed-half change and an out-of-stock addition without modifying the order", async () => {
    await fixture(async (tx, store, f) => {
      await expect(f.editOrderWithHalfKits(tx, f.orderId, f.id, {
        ...f.input, lineItems: f.input.lineItems.map((line: any) => line.productId === f.halfId ? { ...line, quantity: 1 } : line),
      })).rejects.toThrow(/half-kit quantities/);
      await expect(f.editOrderWithHalfKits(tx, f.orderId, f.id, {
        ...f.input, lineItems: f.input.lineItems.map((line: any) => line.productId === f.vialId ? { ...line, quantity: 11 } : line),
      })).rejects.toThrow(/Only 10/);
      const [order] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(order.grandTotal).toBe("54.00");
      const lines = await tx.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, f.orderId));
      expect(lines).toHaveLength(1);
    });
  });
  it("preserves paid claims and adds only the extra price plus applicable percentage fee to the balance", async () => {
    await fixture(async (tx, store, f) => {
      await tx.update(store.ordersTable).set({ paymentStatus: "confirmed", amountDue: "0" }).where(eq(store.ordersTable.id, f.orderId));
      await tx.update(store.groupBuysTable).set({
        adminFeeEnabled: true, adminFeeType: "percent", adminFeeAmount: "10",
      }).where(eq(store.groupBuysTable.id, f.id));
      const result = await f.editOrderWithHalfKits(tx, f.orderId, f.id, f.input);
      expect(result.updatedOrder).toMatchObject({
        paymentStatus: "confirmed", amountDue: "30.80", grandTotal: "84.80", adminFee: "12.80",
        balancePaymentStatus: "unpaid", creditsApplied: 2,
      });
      const [claim] = await tx.select().from(store.gbHalfKitClaimsTable).where(eq(store.gbHalfKitClaimsTable.id, f.claimId));
      expect(claim.paidAt).toBeInstanceOf(Date);
    });
  });
  it("reverses only ordinary product costs and their percentage fee, retaining half-kit charges", async () => {
    await fixture(async (tx, store, f) => {
      await tx.update(store.ordersTable).set({ creditsApplied: 0 }).where(eq(store.ordersTable.id, f.orderId));
      await tx.update(store.groupBuysTable).set({
        adminFeeEnabled: true, adminFeeType: "percent", adminFeeAmount: "10",
      }).where(eq(store.groupBuysTable.id, f.id));
      await f.editOrderWithHalfKits(tx, f.orderId, f.id, f.input);
      const result = await f.editOrderWithHalfKits(tx, f.orderId, f.id, {
        ...f.input, lineItems: f.input.lineItems.map((line: any) =>
          line.productId === f.vialId ? { ...line, quantity: 0 } : line),
      }, { allowUnpaidOrdinaryReductions: true });
      expect(result.updatedOrder).toMatchObject({
        productSubtotal: "30.00", grandTotal: "54.00", adminFee: "10.00",
        deliveryPrice: "5.00", vendorShipping: "9.00", paymentUsdAmount: null,
      });
      expect(result.insertedLineItems).toHaveLength(1);
      expect(result.insertedLineItems[0].id).toBe(f.lineId);
    });
  });
  it("saves the real organiser PATCH form through its actual route handler without replacing the claimed line", async () => {
    const { default: router } = await import("../routes/organiser");
    const route = router.stack.find((layer: any) =>
      layer.route?.path === "/organiser/group-buys/:gbId/orders/:orderId" && layer.route.methods.patch)?.route;
    if (!route?.stack.length) throw new Error("Organiser edit route is missing");
    const handler = route.stack.at(-1)!.handle;
    await fixture(async (tx, store, f) => {
      await tx.update(store.groupBuysTable).set({
        organiserId: "synthetic-half-edit", organiserOrderEditEnabled: true,
        organiserCanEditQuantities: true, organiserCanEditNotes: true,
      }).where(eq(store.groupBuysTable.id, f.id));
      // Keep the real handler's database work inside the rollback-only fixture.
      const selects = vi.spyOn(store.db, "select").mockImplementation((...args: any[]) => tx.select(...args));
      const transactions = vi.spyOn(store.db, "transaction").mockImplementation((run: any) => run(tx));
      try {
        const json = vi.fn();
        const res: any = { json, status: vi.fn().mockReturnThis() };
        const request: any = {
          organiser: { telegramUsername: "synthetic-half-edit", organiserStatus: "approved" },
          params: { gbId: f.id, orderId: f.orderId },
          body: {
            status: "Submitted", paymentStatus: "unpaid", adminNotes: "Four extra vials",
            trackingNumbers: [], paymentTxHashes: [],
            lineItems: [{ id: f.lineId, quantity: 0.5 }, { productId: f.vialId, quantity: 4 }],
          },
        };
        await handler(request, res, (error: unknown) => { if (error) throw error; });
        expect(res.status).not.toHaveBeenCalled();
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
          ok: true, order: expect.objectContaining({
            grandTotal: 82, productSubtotal: 58, adminNotes: "Four extra vials",
            lineItems: expect.arrayContaining([
              expect.objectContaining({ id: f.lineId, quantity: 0.5, lineTotal: 30 }),
              expect.objectContaining({ quantity: 4, lineTotal: 28 }),
            ]),
          }),
        }));
        const [claim] = await tx.select().from(store.gbHalfKitClaimsTable).where(eq(store.gbHalfKitClaimsTable.id, f.claimId));
        expect(claim.lineItemId).toBe(f.lineId);
        // The organiser's remove control sends an existing line with quantity 0.
        // Exercise the same actual route, not just a standalone planner.
        await tx.update(store.ordersTable).set({ creditsApplied: 0 }).where(eq(store.ordersTable.id, f.orderId));
        const vial = json.mock.calls[0][0].order.lineItems.find((li: any) => li.id !== f.lineId);
        request.body.lineItems = [{ id: f.lineId, quantity: 0.5 }, { id: vial.id, quantity: 0 }];
        json.mockClear();
        await handler(request, res, (error: unknown) => { if (error) throw error; });
        expect(json).toHaveBeenCalledWith(expect.objectContaining({
          ok: true, order: expect.objectContaining({
            grandTotal: 54, productSubtotal: 30,
            lineItems: [expect.objectContaining({ id: f.lineId, quantity: 0.5, lineTotal: 30 })],
          }),
        }));
        const remaining = await tx.select().from(store.orderLineItemsTable).where(eq(store.orderLineItemsTable.orderId, f.orderId));
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(f.lineId);
      } finally {
        selects.mockRestore();
        transactions.mockRestore();
      }
    });
  });
});

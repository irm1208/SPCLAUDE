import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";

it.skipIf(process.env.CUSTOM_POSTAGE_DB_TESTS !== "1")("reconciles the new band and disables matrix estimates without changing the confirmed product payment", async () => {
  const store = await import("@workspace/db");
  const { reconcileCustomPostage } = await import("./custom-postage-reconciliation");
  const { estimateForOrder } = await import("./gb-onward-delivery");
  const rollback = new Error("rollback synthetic custom postage test");
  await expect(store.db.transaction(async tx => {
    const groupId = randomUUID(), productId = randomUUID(), orderId = randomUUID();
    const option = { id: "eu-postage-AT-home", label: "Austria — Home delivery", country: "AT", price: 15,
      source: "eu-postage", kitPrices: { upTo5: 15, upTo25: 20 } };
    await tx.insert(store.groupBuysTable).values({ id: groupId, name: "Synthetic custom postage test", currency: "USD", shippingOptions: JSON.stringify([option]) });
    await tx.insert(store.productsTable).values({ id: productId, name: "Synthetic kits", price: "100" });
    await tx.insert(store.ordersTable).values({ id: orderId, code: `test-${orderId}`, telegramUsername: `postage-test-${orderId}`,
      groupBuyId: groupId, shippingCountry: "AT", deliveryMethodId: option.id, deliveryMethod: option.label,
      deliveryPrice: "15", productSubtotal: "100", grandTotal: "115", paymentStatus: "confirmed", amountDue: "0" });
    await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId, productName: "Synthetic kits", quantity: 5.5, unitPrice: "18.18", lineTotal: "100" });
    const updated = await reconcileCustomPostage(tx, orderId);
    expect(updated).toMatchObject({ deliveryPrice: "20.00", grandTotal: "120.00", amountDue: "5.00", paymentStatus: "confirmed" });
    expect(await estimateForOrder(tx, updated)).toMatchObject({ status: "not_applicable", options: [] });
    // Running reconciliation twice cannot add the delivery difference again.
    await reconcileCustomPostage(tx, orderId);
    const [again] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId));
    expect(again.amountDue).toBe("5.00");
    throw rollback;
  })).rejects.toBe(rollback);
}, 30000);

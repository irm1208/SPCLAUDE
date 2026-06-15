import { db } from "./index.js";
import { groupBuysTable, groupBuyProductsTable, groupBuyDeliveryMethodsTable } from "./schema/group_buys.js";
import { productsTable } from "./schema/products.js";
import { deliveryMethodsTable } from "./schema/delivery_methods.js";
import { ordersTable } from "./schema/orders.js";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const GB1_ID = "gb-1";

async function main() {
  console.log("[seed-gb1] Starting Group Buy 1 migration…");

  const existing = await db.select().from(groupBuysTable).where(eq(groupBuysTable.id, GB1_ID));
  if (existing.length === 0) {
    await db.insert(groupBuysTable).values({
      id: GB1_ID,
      name: "Group Buy 1",
      description: "Original Peps Anonymous group buy — migrated automatically.",
      status: "active",
      currency: "GBP",
    });
    console.log(`[seed-gb1] Created group_buys row id=${GB1_ID}`);
  } else {
    console.log(`[seed-gb1] group_buys id=${GB1_ID} already exists — skipping insert`);
  }

  const products = await db.select({ id: productsTable.id }).from(productsTable);
  console.log(`[seed-gb1] Linking ${products.length} products to GB1…`);
  let productsLinked = 0;
  for (const p of products) {
    const existingLink = await db
      .select()
      .from(groupBuyProductsTable)
      .where(and(
        eq(groupBuyProductsTable.groupBuyId, GB1_ID),
        eq(groupBuyProductsTable.productId, p.id),
      ));
    if (existingLink.length === 0) {
      await db.insert(groupBuyProductsTable).values({
        id: randomUUID(),
        groupBuyId: GB1_ID,
        productId: p.id,
        active: true,
      });
      productsLinked++;
    }
  }
  console.log(`[seed-gb1] Products linked (${productsLinked} new, ${products.length - productsLinked} already existed)`);

  const deliveryMethods = await db.select({ id: deliveryMethodsTable.id }).from(deliveryMethodsTable);
  console.log(`[seed-gb1] Linking ${deliveryMethods.length} delivery methods to GB1…`);
  let dmLinked = 0;
  for (const dm of deliveryMethods) {
    const existingLink = await db
      .select()
      .from(groupBuyDeliveryMethodsTable)
      .where(and(
        eq(groupBuyDeliveryMethodsTable.groupBuyId, GB1_ID),
        eq(groupBuyDeliveryMethodsTable.deliveryMethodId, dm.id),
      ));
    if (existingLink.length === 0) {
      await db.insert(groupBuyDeliveryMethodsTable).values({
        id: randomUUID(),
        groupBuyId: GB1_ID,
        deliveryMethodId: dm.id,
      });
      dmLinked++;
    }
  }
  console.log(`[seed-gb1] Delivery methods linked (${dmLinked} new, ${deliveryMethods.length - dmLinked} already existed)`);

  await db
    .update(ordersTable)
    .set({ groupBuyId: GB1_ID })
    .where(isNull(ordersTable.groupBuyId));
  console.log(`[seed-gb1] Updated orders with null groupBuyId → ${GB1_ID}`);

  console.log("[seed-gb1] Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-gb1] Fatal error:", err);
  process.exit(1);
});

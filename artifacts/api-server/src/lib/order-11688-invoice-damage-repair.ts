import {
  auditLogsTable,
  db,
  orderLineItemsTable,
  ordersTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { assertNoActiveRefund } from "./refund-mutation-guard";

const ORDER_ID = "328de343-0659-4e6c-abe6-ea6cc8d03ee7";
const ORDER_CODE = "11688";
const REPAIR_MARKER = "order_11688_invoice_damage_repaired";

const DAMAGED_ITEM = {
  id: "6f71afda-64a8-43c5-8ee6-728c09a325fc",
  productId: "",
  productName: "Black Ops 7 Diamond Account",
  quantity: "10.00",
  unitPrice: "20.00",
  lineTotal: "200.00",
};

const ORIGINAL_ITEMS = [
  {
    id: "f52acc86-2b1a-4a37-aae0-147ec2b11826",
    orderId: ORDER_ID,
    productId: "prod-7ab7fb71",
    productName: "Retatrutide 60mg",
    quantity: "1.50",
    unitPrice: "220.00",
    lineTotal: "330.00",
    isOos: false,
    createdAt: new Date("2026-09-14T19:10:59.492436Z"),
    updatedAt: new Date("2026-09-17T18:55:03.326Z"),
  },
  {
    id: "72ee3569-9307-408e-a46e-cf4abc43047f",
    orderId: ORDER_ID,
    productId: "p079",
    productName: "GHK-CU 50mg",
    quantity: "0.50",
    unitPrice: "50.00",
    lineTotal: "25.00",
    isOos: false,
    createdAt: new Date("2026-09-14T19:10:59.492436Z"),
    updatedAt: new Date("2026-09-17T18:55:03.340Z"),
  },
  {
    id: "9b43c894-bb38-42e3-8573-00a30fa72c08",
    orderId: ORDER_ID,
    productId: "p008",
    productName: "Tirzepatide 100mg",
    quantity: "1.00",
    unitPrice: "220.00",
    lineTotal: "220.00",
    isOos: false,
    createdAt: new Date("2026-09-15T22:59:42.256762Z"),
    updatedAt: new Date("2026-09-17T18:55:03.354Z"),
  },
  {
    id: "832f223c-375f-4b14-9d0f-6f77a6a07a85",
    orderId: ORDER_ID,
    productId: "p084",
    productName: "KPV 10mg",
    quantity: "0.50",
    unitPrice: "60.00",
    lineTotal: "30.00",
    isOos: false,
    createdAt: new Date("2026-09-15T23:47:35.531662Z"),
    updatedAt: new Date("2026-09-17T18:55:03.367Z"),
  },
] as const;

function itemMatches(
  actual: typeof orderLineItemsTable.$inferSelect,
  expected: typeof DAMAGED_ITEM,
): boolean {
  return (
    actual.id === expected.id &&
    actual.productId === expected.productId &&
    actual.productName === expected.productName &&
    actual.quantity === expected.quantity &&
    actual.unitPrice === expected.unitPrice &&
    actual.lineTotal === expected.lineTotal
  );
}

export async function repairOrder11688InvoiceDamage(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${REPAIR_MARKER}))`);

    const [alreadyApplied] = await tx
      .select({ id: auditLogsTable.id })
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, REPAIR_MARKER))
      .limit(1);
    if (alreadyApplied) return;

    await tx.execute(sql`select id from orders where id = ${ORDER_ID} for update`);
    const [order] = await tx
      .select({
        id: ordersTable.id,
        code: ordersTable.code,
        productSubtotal: ordersTable.productSubtotal,
        deliveryPrice: ordersTable.deliveryPrice,
        vendorShipping: ordersTable.vendorShipping,
        adminFee: ordersTable.adminFee,
        grandTotal: ordersTable.grandTotal,
      })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, ORDER_ID), eq(ordersTable.code, ORDER_CODE)))
      .limit(1);

    if (!order) {
      throw new Error("[order-11688-repair] Target order was not found");
    }

    const currentItems = await tx
      .select()
      .from(orderLineItemsTable)
      .where(eq(orderLineItemsTable.orderId, ORDER_ID));

    const hasExpectedDamagedOrder =
      order.productSubtotal === "200.00" &&
      order.deliveryPrice === "0.00" &&
      order.vendorShipping === "0.00" &&
      order.adminFee === "10.00" &&
      order.grandTotal === "200.00" &&
      currentItems.length === 1 &&
      itemMatches(currentItems[0]!, DAMAGED_ITEM);

    if (!hasExpectedDamagedOrder) {
      throw new Error(
        "[order-11688-repair] Refusing repair because affected order fields or line items changed",
      );
    }

    await assertNoActiveRefund(tx, ORDER_ID);

    await tx
      .update(ordersTable)
      .set({
        productSubtotal: "605.00",
        deliveryPrice: "3.00",
        vendorShipping: "0.00",
        grandTotal: "618.00",
      })
      .where(and(
        eq(ordersTable.id, ORDER_ID),
        eq(ordersTable.productSubtotal, "200.00"),
        eq(ordersTable.deliveryPrice, "0.00"),
        eq(ordersTable.vendorShipping, "0.00"),
        eq(ordersTable.adminFee, "10.00"),
        eq(ordersTable.grandTotal, "200.00"),
      ));

    await tx
      .delete(orderLineItemsTable)
      .where(and(
        eq(orderLineItemsTable.orderId, ORDER_ID),
        eq(orderLineItemsTable.id, DAMAGED_ITEM.id),
      ));
    await tx.insert(orderLineItemsTable).values([...ORIGINAL_ITEMS]);

    await tx.insert(auditLogsTable).values({
      type: "order",
      level: "warn",
      action: REPAIR_MARKER,
      message: "Restored order 11688 from the immediate pre-damage backup",
      metadata: {
        orderId: ORDER_ID,
        code: ORDER_CODE,
        restoredFields: [
          "productSubtotal",
          "deliveryPrice",
          "vendorShipping",
          "grandTotal",
          "lineItems",
        ],
        invoicePreserved: true,
        sourceBackup: "2026-09-20T16:23:03Z",
      },
    });
  });

  console.warn("[order-11688-repair] Restored damaged order; customized invoice preserved");
}
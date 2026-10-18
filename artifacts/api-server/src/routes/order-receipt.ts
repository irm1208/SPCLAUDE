import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireAccount } from "../middleware/account-auth";
import { assertNoActiveRefund } from "../lib/refund-mutation-guard";
import { logCustomerActivity } from "../lib/activity-log";

const router = Router();

// Account identity is server-owned. Never accept a member name or status from the body.
router.post("/account/orders/:id/received", requireAccount, async (req, res, next): Promise<void> => {
  const username = req.account!.telegramUsername.replace(/^@/, "").toLowerCase();
  const id = String(req.params.id);
  try {
    const result = await db.transaction(async tx => {
      const ownership = and(
        eq(ordersTable.id, id),
        isNull(ordersTable.deletedAt),
        sql`lower(${ordersTable.telegramUsername}) IN (${username}, ${`@${username}`})`,
      );
      // Serializes confirmations against cancellation, refund creation and repeat clicks.
      const [order] = await tx.select().from(ordersTable).where(ownership).for("update");
      if (!order) return { error: "Order not found", httpStatus: 404 } as const;
      if (order.status === "Completed" && order.memberReceivedAt) {
        return { status: "Completed", memberReceivedAt: order.memberReceivedAt, changed: false } as const;
      }
      if (order.status !== "Shipped") {
        return { error: "Only shipped orders can be marked as received.", httpStatus: 409 } as const;
      }
      await assertNoActiveRefund(tx, id);
      const receivedAt = new Date();
      // This deliberately touches no payment, shared-parent, tracking or other member fields.
      await tx.update(ordersTable).set({
        status: "Completed",
        memberReceivedAt: receivedAt,
        updatedAt: receivedAt,
      }).where(and(ownership, eq(ordersTable.status, "Shipped")));
      return { status: "Completed", memberReceivedAt: receivedAt, changed: true } as const;
    });
    if (result.httpStatus) {
      res.status(result.httpStatus).json({ error: result.error });
      return;
    }
    if (result.changed) {
      void logCustomerActivity({
        telegramUsername: username,
        eventCategory: "order",
        eventType: "order_received",
        entityId: id,
        actorUsername: username,
        actorType: "customer",
        metadata: { memberReceivedAt: result.memberReceivedAt.toISOString() },
      }).catch(error => console.error("[order-receipt] Activity log failed", error));
    }
    res.json({ status: result.status, memberReceivedAt: result.memberReceivedAt.toISOString() });
  } catch (error) { next(error); }
});

export default router;

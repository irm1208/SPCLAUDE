import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, groupBuysTable, ordersTable, orderNotesTable } from "@workspace/db";
import { requireOrganiser } from "../middleware/require-organiser";
import { writeLog } from "../lib/audit-log";
import { assertNoActiveRefunds, refundMutableOrderWhere, refundMutationConflictResponse } from "../lib/refund-mutation-guard";

const router: IRouter = Router();
class PaymentConflict extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// A scoped receipt-confirmation action, not permission to edit products, totals,
// TXIDs, fulfilment, or independent balance payments.
router.post("/organiser/group-buys/:gbId/orders/mark-paid", requireOrganiser, async (req, res) => {
  const { orderIds, note } = req.body ?? {};
  if (!Array.isArray(orderIds) || !orderIds.length || orderIds.length > 100 ||
      orderIds.some(id => typeof id !== "string" || !id.trim() || id.length > 200) ||
      typeof note !== "string" || !note.trim() || note.trim().length > 2000) {
    res.status(400).json({ error: "Select 1–100 orders and enter a payment note (maximum 2,000 characters)." }); return;
  }
  const ids = [...new Set<string>(orderIds)];
  const gbId = String(req.params.gbId);
  const actor = req.organiser!.telegramUsername;
  try {
    const result = await db.transaction(async tx => {
      const [group] = await tx.select({ id: groupBuysTable.id, canEditPayment: groupBuysTable.organiserCanEditPaymentStatus }).from(groupBuysTable)
        .where(req.organiser!.isAdmin ? eq(groupBuysTable.id, gbId)
          : and(eq(groupBuysTable.id, gbId), eq(groupBuysTable.organiserId, actor))).for("update");
      if (!group) throw new PaymentConflict("Group buy not found", 404);
      if (!req.organiser!.isAdmin && !group.canEditPayment) {
        throw new PaymentConflict("Manual payment updates are disabled for this group buy. Ask Admin to enable payment-status editing.", 403);
      }
      const orders = await tx.select().from(ordersTable)
        .where(and(eq(ordersTable.groupBuyId, gbId), inArray(ordersTable.id, ids)))
        .orderBy(asc(ordersTable.id)).for("update");
      if (orders.length !== ids.length) throw new PaymentConflict("One or more orders were not found in this group buy.", 404);
      await assertNoActiveRefunds(tx, ids);
      for (const order of orders) {
        if (order.deletedAt || order.refundedAt || order.orderType === "test" ||
            ["Cancelled", "Refunded", "Draft"].includes(order.status) || order.paymentStatus === "refunded") {
          throw new PaymentConflict(`Order #${order.code} cannot be marked paid. Remove cancelled, refunded, deleted, draft or test orders from your selection.`, 409);
        }
      }
      const now = new Date();
      const changed: string[] = [];
      for (const order of orders) {
        if (order.paymentStatus === "confirmed") continue;
        const stampedNote = `Manual payment confirmed · @${actor} · ${now.toISOString()}\n${note.trim()}`;
        const updated = await tx.update(ordersTable).set({
          paymentStatus: "confirmed",
          paymentConfirmedAt: now,
          paymentRejectionReason: null,
          adminNotes: [order.adminNotes, stampedNote].filter(Boolean).join("\n\n"),
        }).where(refundMutableOrderWhere(and(
          eq(ordersTable.id, order.id), eq(ordersTable.groupBuyId, gbId),
          eq(ordersTable.paymentStatus, order.paymentStatus), isNull(ordersTable.deletedAt),
        ))).returning({ id: ordersTable.id });
        if (!updated.length) throw new PaymentConflict("An order changed while confirming payment. Refresh and try again.", 409);
        await tx.insert(orderNotesTable).values({
          id: `manual-paid:${randomUUID()}`, orderId: order.id, author: actor, body: note.trim(), createdAt: now,
        });
        changed.push(order.id);
      }
      return { updated: changed.length, skipped: orders.length - changed.length, orderIds: changed };
    });
    if (result.updated) await writeLog("payment", "info", "organiser_manual_payment_confirmed",
      `Organiser @${actor} manually confirmed ${result.updated} order payment(s) with a private note.`,
      { gbId, username: actor, orderIds: result.orderIds });
    res.json(result);
  } catch (error) {
    const refund = refundMutationConflictResponse(error) || refundMutationConflictResponse((error as { cause?: unknown })?.cause);
    if (refund) { res.status(refund.status).json(refund.body); return; }
    if (error instanceof PaymentConflict) { res.status(error.status).json({ error: error.message }); return; }
    res.status(500).json({ error: "Payment confirmation could not be saved. No orders were changed. Please try again." });
  }
});
export default router;

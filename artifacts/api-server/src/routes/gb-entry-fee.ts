import { Router, type IRouter } from "express";
import { db, groupBuysTable, gbEntryFeePaymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAccount } from "../middleware/account-auth";
import { shapeEntryFeePayment, type EntryFeeGb } from "../lib/gb-entry-fee";
import { sendAdminMessage, notifyUser } from "../lib/telegram";

const router: IRouter = Router();

async function loadGb(groupBuyId: string): Promise<(EntryFeeGb & { name: string; organiserId: string | null }) | null> {
  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      name: groupBuysTable.name,
      organiserId: groupBuysTable.organiserId,
      currency: groupBuysTable.currency,
      entryFeeAmount: groupBuysTable.entryFeeAmount,
      entryFeeLabel: groupBuysTable.entryFeeLabel,
      organiserPayments: groupBuysTable.organiserPayments,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, groupBuyId));
  return gb ?? null;
}

// GET /api/account/entry-fee/:groupBuyId — fetch the customer's own entry fee payment status for a GB
router.get("/account/entry-fee/:groupBuyId", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const groupBuyId = String(req.params["groupBuyId"]);

  const [payment] = await db
    .select()
    .from(gbEntryFeePaymentsTable)
    .where(and(eq(gbEntryFeePaymentsTable.groupBuyId, groupBuyId), eq(gbEntryFeePaymentsTable.accountId, tg)));

  if (!payment) { res.status(404).json({ error: "No entry fee payment found for this group buy" }); return; }

  const gb = await loadGb(groupBuyId);
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  res.json(await shapeEntryFeePayment(payment, gb));
});

// POST /api/account/entry-fee/:paymentId/submit-tx — customer submits a crypto tx hash for their entry fee
router.post("/account/entry-fee/:paymentId/submit-tx", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const paymentId = String(req.params["paymentId"]);
  const { txHash } = req.body ?? {};

  if (!txHash || typeof txHash !== "string" || txHash.length < 8 || txHash.length > 200) {
    res.status(400).json({ error: "Provide a valid transaction hash" });
    return;
  }

  const [payment] = await db
    .select()
    .from(gbEntryFeePaymentsTable)
    .where(eq(gbEntryFeePaymentsTable.id, paymentId));

  if (!payment || payment.accountId !== tg) { res.status(404).json({ error: "Entry fee payment not found" }); return; }

  const gb = await loadGb(payment.groupBuyId);
  if (!gb) { res.status(404).json({ error: "Group buy not found" }); return; }

  if (payment.status === "confirmed") {
    res.json(await shapeEntryFeePayment(payment, gb));
    return;
  }

  const [updated] = await db
    .update(gbEntryFeePaymentsTable)
    .set({
      paymentTxHash: txHash.trim(),
      status: "submitted",
      submittedAt: new Date(),
      rejectionReason: null,
    })
    .where(eq(gbEntryFeePaymentsTable.id, paymentId))
    .returning();

  res.json(await shapeEntryFeePayment(updated ?? payment, gb));

  // Best-effort: let the organiser/admin know a payment is awaiting review — auto-verify
  // only catches genuine on-chain matches, so anything it can't confirm (wrong network,
  // insufficient confirmations, a bad hash) would otherwise sit "submitted" forever with
  // no one aware a manual confirm/reject in the GB Organiser panel is needed.
  const amountLabel = `${payment.amount} ${gb.currency}`;
  const alertMsg =
    `💳 <b>Entry fee submitted</b> — <i>${gb.name}</i>\n` +
    `@${tg} submitted a tx hash for ${amountLabel}.\n` +
    `Review &amp; confirm in the GB Organiser panel if it isn't auto-verified within a few minutes.`;
  sendAdminMessage(alertMsg).catch(() => {});
  if (gb.organiserId && gb.organiserId.replace(/^@/, "").toLowerCase() !== tg.replace(/^@/, "").toLowerCase()) {
    notifyUser(gb.organiserId, "payment", alertMsg).catch(() => {});
  }
});

export default router;

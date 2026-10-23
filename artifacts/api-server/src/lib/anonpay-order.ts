import { and, eq, isNull, like, or } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { assertNoActiveRefunds, refundMutableOrderWhere } from "./refund-mutation-guard";
import { usdToCents } from "./refund-money";

const pendingStatuses = ["pending_confirmation", "awaiting_payment", "test_confirmed", "unpaid"];

/** Trocador's public AnonPay response, including its actual outgoing-TX field. */
export function parseAnonPayStatus(data: unknown) {
  const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const status = String(record.Status ?? record.status ?? record.payment_status ?? "").trim().toLowerCase();
  const hash = [
    record["Payment Transaction Hash"], record.Hash, record.hash, record.tx_hash,
    record.txhash, record.HashTo, record.hash_to,
  ].find(value => typeof value === "string" && value.trim());
  return {
    status,
    finished: ["anonpayfinished", "finished", "complete", "completed"].includes(status),
    outgoingHash: typeof hash === "string" ? hash.trim() : "",
  };
}

/** Compare the locked receive amount with the net number requested by order
 * checkout (USD-par stablecoin units), never the sender's exchange asset.
 * Never settle an edited order using its old invoice.
 */
export function anonPayAmountMatches(data: unknown, grossUsd: string, creditsApplied: number): boolean {
  try {
    const value = (data as Record<string, unknown> | null)?.AmountTo;
    if (typeof value !== "string" && typeof value !== "number") return false;
    const expected = usdToCents(grossUsd) - usdToCents(String(creditsApplied));
    return expected > 0n && usdToCents(String(value)) === expected;
  } catch { return false; }
}

/** A saved AnonPay session is enough to poll, even if the browser never returns. */
export function pendingPaymentStatusWhere() {
  return or(
    eq(ordersTable.paymentStatus, "pending_confirmation"),
    eq(ordersTable.paymentStatus, "awaiting_payment"),
    eq(ordersTable.paymentStatus, "test_confirmed"),
    and(eq(ordersTable.paymentStatus, "unpaid"), like(ordersTable.paymentTxHash, "anonpay:%")),
  )!;
}

type AnonPayOrderSnapshot = Pick<typeof ordersTable.$inferSelect,
  "id" | "paymentStatus" | "paymentTxHash" | "grandTotal" | "creditsApplied" | "paymentUsdAmount">;

/** Share the same atomic finalisation between the browser poll and scheduler.
 * A cancelled/replaced session, edited price, concurrent confirmation or refund
 * must not be overwritten after the external network request finishes.
 */
export async function confirmAnonPayOrder(order: AnonPayOrderSnapshot, newTxHash: string): Promise<boolean> {
  const session = order.paymentTxHash?.split("|")[0];
  if (!session?.startsWith("anonpay:") || session === "anonpay:" ||
      newTxHash.split("|")[0] !== session || !pendingStatuses.includes(order.paymentStatus)) return false;
  const saved = await db.transaction(async tx => {
    await assertNoActiveRefunds(tx, [order.id]);
    return tx.update(ordersTable)
      .set({ paymentStatus: "confirmed", paymentConfirmedAt: new Date(), paymentTxHash: newTxHash })
      .where(refundMutableOrderWhere(and(
        eq(ordersTable.id, order.id),
        eq(ordersTable.paymentStatus, order.paymentStatus),
        eq(ordersTable.paymentTxHash, order.paymentTxHash!),
        eq(ordersTable.grandTotal, order.grandTotal),
        eq(ordersTable.creditsApplied, order.creditsApplied),
        order.paymentUsdAmount === null ? isNull(ordersTable.paymentUsdAmount) : eq(ordersTable.paymentUsdAmount, order.paymentUsdAmount),
        isNull(ordersTable.deletedAt),
      )))
      .returning({ id: ordersTable.id });
  });
  return saved.length > 0;
}

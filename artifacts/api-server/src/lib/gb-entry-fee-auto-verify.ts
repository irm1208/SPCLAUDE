/**
 * Automatically verifies submitted group buy entry fee payments (crypto tx hash).
 * Mirrors pool-payment-auto-verify.ts — runs on an interval, checks each "submitted"
 * payment's on-chain tx against the resolved wallet/currency/network, and confirms +
 * grants membership on success via confirmEntryFeePayment.
 *
 * Runs every 10 minutes.
 */
import { db, gbEntryFeePaymentsTable, groupBuysTable } from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { verifyTransaction } from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";
import { resolveEffectiveEntryFeeCrypto, confirmEntryFeePayment, type EntryFeeGb } from "./gb-entry-fee";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function checkPayment(payment: {
  id: string;
  groupBuyId: string;
  paymentTxHash: string | null;
  paymentCryptoCurrency: string | null;
  amountUsd: string | null;
}): Promise<void> {
  const txHash = payment.paymentTxHash ?? "";
  if (!txHash) return;

  const [gb] = await db
    .select({
      id: groupBuysTable.id,
      currency: groupBuysTable.currency,
      entryFeeAmount: groupBuysTable.entryFeeAmount,
      entryFeeLabel: groupBuysTable.entryFeeLabel,
      organiserPayments: groupBuysTable.organiserPayments,
    })
    .from(groupBuysTable)
    .where(eq(groupBuysTable.id, payment.groupBuyId));
  if (!gb) {
    console.warn(`[gb-entry-fee-auto-verify] GB not found for payment ${payment.id} (${payment.groupBuyId})`);
    return;
  }

  const crypto = await resolveEffectiveEntryFeeCrypto(gb as EntryFeeGb, payment.paymentCryptoCurrency);
  if (!crypto.walletAddress) {
    console.warn(`[gb-entry-fee-auto-verify] No wallet for payment ${payment.id} (GB ${payment.groupBuyId}, currency=${payment.paymentCryptoCurrency})`);
    return;
  }

  const amountUsd = parseFloat(String(payment.amountUsd ?? "0"));
  if (!amountUsd) {
    console.warn(`[gb-entry-fee-auto-verify] Zero/null amountUsd for payment ${payment.id}`);
    return;
  }

  console.log(`[gb-entry-fee-auto-verify] Checking payment ${payment.id} — ${amountUsd} ${crypto.currency} on ${crypto.network} tx=${txHash.slice(0, 12)}…`);
  const result = await verifyTransaction(txHash, crypto.walletAddress, amountUsd, crypto.currency, crypto.network, 0.01);
  if (!result.verified) {
    const r = result as { verified: false; reason: string; pending?: boolean };
    console.log(`[gb-entry-fee-auto-verify] Not verified — payment ${payment.id}: ${r.reason}${r.pending ? " (pending)" : ""}`);
    return;
  }

  await confirmEntryFeePayment(payment.id, "auto-verify");
  console.log(`[gb-entry-fee-auto-verify] Confirmed — payment ${payment.id} (GB ${payment.groupBuyId}, $${amountUsd})`);
}

async function runGbEntryFeeAutoVerify(): Promise<void> {
  try {
    const pending = await db
      .select({
        id: gbEntryFeePaymentsTable.id,
        groupBuyId: gbEntryFeePaymentsTable.groupBuyId,
        paymentTxHash: gbEntryFeePaymentsTable.paymentTxHash,
        paymentCryptoCurrency: gbEntryFeePaymentsTable.paymentCryptoCurrency,
        amountUsd: gbEntryFeePaymentsTable.amountUsd,
      })
      .from(gbEntryFeePaymentsTable)
      .where(and(eq(gbEntryFeePaymentsTable.status, "submitted"), isNotNull(gbEntryFeePaymentsTable.paymentTxHash)));

    if (pending.length === 0) return;
    console.log(`[gb-entry-fee-auto-verify] Checking ${pending.length} submitted entry fee payment(s)…`);

    for (const p of pending) {
      try {
        await checkPayment(p);
      } catch (err: any) {
        console.error(`[gb-entry-fee-auto-verify] Error on payment ${p.id}:`, err?.message ?? err);
      }
    }
  } catch (err: any) {
    console.error("[gb-entry-fee-auto-verify] Error:", err?.message ?? err);
  }
}

export function startGbEntryFeeAutoVerify(): void {
  registerScheduler({
    name: "gb-entry-fee-auto-verify",
    label: "GB entry fee payment verify",
    description: "Verifies submitted group buy entry fee payments (crypto).",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60 * 1000,
    initialDelayMs: 60_000,
    run: runGbEntryFeeAutoVerify,
  });
}

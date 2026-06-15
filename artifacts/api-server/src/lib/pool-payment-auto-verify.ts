/**
 * Automatically verifies testing pool contributions when payment is confirmed.
 *
 * - Crypto (txid): calls blockchain RPC to verify the transaction matches the
 *   expected amount and recipient, then marks the contribution as "verified".
 * - AnonPay: polls the Trocador status endpoint and marks as "verified" when
 *   the payment is reported as finished.
 *
 * Runs every 10 minutes.
 */
import { db, poolParticipantsTable, testingPoolsTable } from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { verifyTransaction } from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ANONPAY_PREFIX = "anonpay:";
const ANONPAY_DONE = new Set(["anonpayfinished", "finished", "complete", "completed"]);

async function checkAnonPay(participant: { id: string; poolId: string; paymentTxHash: string | null }): Promise<void> {
  const raw = participant.paymentTxHash ?? "";
  if (!raw.startsWith(ANONPAY_PREFIX)) return;
  const paymentId = raw.slice(ANONPAY_PREFIX.length);
  if (!paymentId) return;

  try {
    const res = await fetch(
      `https://trocador.app/anonpay/status/${encodeURIComponent(paymentId)}?format=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return;
    const data: any = await res.json();
    const status = ((data["Status"] ?? data["status"]) as string ?? "").toLowerCase();
    if (!ANONPAY_DONE.has(status)) return;
  } catch {
    return;
  }

  await db
    .update(poolParticipantsTable)
    .set({ paymentStatus: "verified", paymentVerifiedAt: new Date() })
    .where(eq(poolParticipantsTable.id, participant.id));
  console.log(`[pool-auto-verify] AnonPay confirmed — participant ${participant.id} (pool ${participant.poolId})`);
}

async function checkCrypto(participant: {
  id: string;
  poolId: string;
  paymentTxHash: string | null;
  amountUsd: string;
}): Promise<void> {
  const txHash = participant.paymentTxHash ?? "";
  if (!txHash || txHash.startsWith(ANONPAY_PREFIX)) return;

  const [pool] = await db
    .select({
      payoutWalletAddress: testingPoolsTable.payoutWalletAddress,
      payoutCurrency: testingPoolsTable.payoutCurrency,
      payoutNetwork: testingPoolsTable.payoutNetwork,
    })
    .from(testingPoolsTable)
    .where(eq(testingPoolsTable.id, participant.poolId));

  if (!pool?.payoutWalletAddress || !pool.payoutCurrency || !pool.payoutNetwork) return;

  const amountUsd = parseFloat(String(participant.amountUsd));
  const result = await verifyTransaction(
    txHash,
    pool.payoutWalletAddress,
    amountUsd,
    pool.payoutCurrency,
    pool.payoutNetwork,
    0.15
  );

  if (!result.verified) return;

  await db
    .update(poolParticipantsTable)
    .set({ paymentStatus: "verified", paymentVerifiedAt: new Date() })
    .where(eq(poolParticipantsTable.id, participant.id));
  console.log(`[pool-auto-verify] Crypto confirmed — participant ${participant.id} (pool ${participant.poolId}, $${amountUsd})`);
}

async function runPoolPaymentAutoVerify(): Promise<void> {
  try {
    const pending = await db
      .select({
        id: poolParticipantsTable.id,
        poolId: poolParticipantsTable.poolId,
        paymentMethod: poolParticipantsTable.paymentMethod,
        paymentTxHash: poolParticipantsTable.paymentTxHash,
        amountUsd: poolParticipantsTable.amountUsd,
      })
      .from(poolParticipantsTable)
      .where(
        and(
          eq(poolParticipantsTable.paymentStatus, "submitted"),
          isNotNull(poolParticipantsTable.paymentTxHash)
        )
      );

    if (pending.length === 0) return;
    console.log(`[pool-auto-verify] Checking ${pending.length} submitted contribution(s)…`);

    for (const p of pending) {
      try {
        const hash = p.paymentTxHash ?? "";
        if (hash.startsWith(ANONPAY_PREFIX)) {
          await checkAnonPay(p);
        } else if (p.paymentMethod === "crypto") {
          await checkCrypto(p);
        }
      } catch (err: any) {
        console.error(`[pool-auto-verify] Error on participant ${p.id}:`, err?.message ?? err);
      }
    }
  } catch (err: any) {
    console.error("[pool-auto-verify] Error:", err?.message ?? err);
  }
}

export function startPoolPaymentAutoVerify(): void {
  registerScheduler({
    name: "pool-payment-auto-verify",
    label: "Testing pool payment verify",
    description: "Verifies submitted testing pool contributions (crypto + AnonPay).",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60 * 1000,
    initialDelayMs: 60_000,
    run: runPoolPaymentAutoVerify,
  });
}

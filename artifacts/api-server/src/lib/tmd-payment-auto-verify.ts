import { and, eq, isNotNull } from "drizzle-orm";
import { db, tmdPoolMembersTable } from "@workspace/db";
import { verifyTransaction } from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";
import { markMemberPayment } from "./tmd-pools-service";

/**
 * Confirms submitted Testmedaddy payments without the organiser lifting a finger:
 * - crypto: checks the transaction on-chain against the address, currency and network
 *   the member was shown when they paid (copied onto the member row at that moment);
 * - AnonPay: polls Trocador for the session status.
 * Screenshots (Revolut, PayPal) stay manual.
 */
const INTERVAL_MS = 5 * 60_000;
export const ANONPAY_PREFIX = "anonpay:";
const ANONPAY_DONE = new Set(["anonpayfinished", "finished", "complete", "completed"]);
export const TMD_AMOUNT_TOLERANCE = 0.15;

let lastError: string | null = null;

async function anonPayFinished(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://trocador.app/anonpay/status/${encodeURIComponent(sessionId)}?format=json`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return false;
    const data: any = await res.json();
    return ANONPAY_DONE.has(String(data?.Status ?? data?.status ?? "").toLowerCase());
  } catch { return false; }
}

export async function runTmdPaymentAutoVerify(): Promise<void> {
  const pending = await db.select().from(tmdPoolMembersTable)
    .where(and(eq(tmdPoolMembersTable.paymentStatus, "submitted"), isNotNull(tmdPoolMembersTable.paymentRef)));
  const failures: string[] = [];
  for (const member of pending) {
    try {
      const ref = member.paymentRef ?? "";
      let confirmed = false;
      if (ref.startsWith(ANONPAY_PREFIX)) {
        confirmed = await anonPayFinished(ref.slice(ANONPAY_PREFIX.length));
      } else if (member.paymentMethod === "crypto" && member.paymentAddress && member.paymentCurrency && member.paymentNetwork) {
        // Stablecoins are checked against the USD share; volatile coins against the coin amount quoted when the member paid.
        const expected = member.paymentAmountCrypto ? Number(member.paymentAmountCrypto) : Number(member.amountUsd);
        const result = await verifyTransaction(ref, member.paymentAddress, expected, member.paymentCurrency, member.paymentNetwork, TMD_AMOUNT_TOLERANCE);
        confirmed = result.verified;
      }
      if (confirmed) {
        await db.transaction(tx => markMemberPayment(tx, member, "verified", "auto-verify"));
        console.log(`[tmd-auto-verify] confirmed member ${member.id} (pool ${member.poolId})`);
      }
    } catch (error) {
      failures.push(`${member.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  lastError = failures.join("; ") || null;
  if (lastError) throw new Error(lastError);
}

export function startTmdPaymentAutoVerify(): void {
  registerScheduler({
    name: "tmd-payment-auto-verify",
    label: "Testmedaddy payment verify",
    description: "Confirms submitted Testmedaddy pool payments on-chain and via AnonPay.",
    defaultIntervalMs: INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60_000,
    initialDelayMs: 90_000,
    run: runTmdPaymentAutoVerify,
    channelStatus: () => ({ lastError }),
  });
}

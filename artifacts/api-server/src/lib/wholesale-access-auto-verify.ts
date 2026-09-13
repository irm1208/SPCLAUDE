/**
 * Automatically confirms wholesale access fee payments once the on-chain tx
 * is verified.
 *
 * Mirrors gb-entry-fee-auto-verify.ts: picks up `wholesale_access_requests`
 * rows with status="pending" + a non-null paymentTxHash, resolves the wallet
 * from the stored currency/network via getAdminCryptoOptions(), calls
 * verifyTransaction, and — on success — performs the same actions as the
 * admin "confirm" endpoint:
 *   • sets account.isWholesale = true
 *   • adds credits equal to the fee
 *   • inserts a creditTransactions row
 *   • marks the request as confirmed
 *   • notifies the member via Telegram
 *
 * Runs every 10 minutes.
 */
import {
  db,
  wholesaleAccessRequestsTable,
  accountsTable,
  creditTransactionsTable,
} from "@workspace/db";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { verifyTransaction } from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";
import { getWholesaleAccessOutstandingAmount } from "./wholesale-access-payment";
import { notifyUser } from "./telegram";
import { writeLog } from "./audit-log";
import { centsToUsdString, usdToCents } from "./refund-money";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export async function confirmWholesaleAccess(requestId: number): Promise<void> {
  const confirmation = await db.transaction(async tx => {
    // Lock the request first, then the account. The pending predicate is the
    // idempotency key: retries and concurrent workers can only claim it once.
    const [req] = await tx
      .select()
      .from(wholesaleAccessRequestsTable)
      .where(and(
        eq(wholesaleAccessRequestsTable.id, requestId),
        eq(wholesaleAccessRequestsTable.status, "pending"),
      ))
      .for("update");
    if (!req) return null;

    const [acct] = await tx
      .select({ telegramUsername: accountsTable.telegramUsername, credits: accountsTable.credits })
      .from(accountsTable)
      .where(or(
        eq(accountsTable.telegramUsername, req.accountUsername),
        eq(accountsTable.telegramUsername, req.accountUsername.startsWith("@") ? req.accountUsername.slice(1) : `@${req.accountUsername}`),
      ))
      .for("update");
    if (!acct) throw new Error(`Account not found for wholesale access request ${requestId}`);

    const refundCents = usdToCents(String(req.amountUsd));
    const newBalance = centsToUsdString(usdToCents(String(acct.credits ?? "0")) + refundCents);
    await tx.update(accountsTable)
      .set({ isWholesale: true, credits: newBalance as unknown as number, updatedAt: new Date() })
      .where(eq(accountsTable.telegramUsername, acct.telegramUsername));
    await tx.insert(creditTransactionsTable).values({
      accountUsername: acct.telegramUsername,
      amount: centsToUsdString(refundCents) as unknown as number,
      reason: `Wholesale access fee refund ($${centsToUsdString(refundCents)} access fee)`,
      adminUsername: "auto-verify",
      createdAt: new Date(),
    });
    await tx.update(wholesaleAccessRequestsTable)
      .set({ status: "confirmed", confirmedAt: new Date(), adminUsername: "auto-verify" })
      .where(and(
        eq(wholesaleAccessRequestsTable.id, requestId),
        eq(wholesaleAccessRequestsTable.status, "pending"),
      ));
    return { req, acct, newBalance, refundAmount: centsToUsdString(refundCents) };
  });
  if (!confirmation) return;
  const { req, acct, newBalance, refundAmount } = confirmation;

  notifyUser(
    acct.telegramUsername,
    "profile",
    `✅ <b>Wholesale Access Granted</b>\n\nYour access fee of <b>$${refundAmount}</b> has been confirmed and credited back to your account.\n\nYou now have full access to the wholesale shop. Visit the Wholesale section in your account portal.`,
  ).catch(() => {});

  writeLog(
    "change",
    "info",
    "wholesale_access_confirmed",
    `Auto-verified wholesale access for ${acct.telegramUsername} (request ${requestId}, $${refundAmount})`,
    { username: acct.telegramUsername, requestId },
  ).catch(() => {});

  console.log(`[wholesale-access-auto-verify] Confirmed request ${requestId} for ${acct.telegramUsername} ($${refundAmount})`);
}

async function checkRequest(row: {
  id: number;
  paymentTxHash: string | null;
  testPaymentTxHash: string | null;
  paymentTestAmount: number | null;
  paymentCryptoCurrency: string | null;
  paymentCryptoNetwork: string | null;
  amountUsd: number;
}): Promise<void> {
  const txHash = row.paymentTxHash ?? "";
  if (!txHash) return;

  // Resolve wallet via the same getAdminCryptoOptions used when the rate was locked.
  const { getAdminCryptoOptions } = await import("../routes/payments");
  const options = await getAdminCryptoOptions();

  const currency = (row.paymentCryptoCurrency ?? "USDT").toUpperCase();
  const network  = row.paymentCryptoNetwork ?? "ERC-20";

  const opt = options.find(
    o => o.currency.toUpperCase() === currency && o.network.toLowerCase() === network.toLowerCase(),
  ) ?? options.find(o => o.currency.toUpperCase() === currency)
    ?? options[0];

  if (!opt?.walletAddress) {
    console.warn(`[wholesale-access-auto-verify] No wallet for request ${row.id} (currency=${currency} network=${network})`);
    return;
  }

  const outstandingAmount = getWholesaleAccessOutstandingAmount(row);
  if (outstandingAmount <= 0) {
    console.warn(`[wholesale-access-auto-verify] Invalid outstanding amount for request ${row.id}`);
    return;
  }
  console.log(`[wholesale-access-auto-verify] Checking request ${row.id} — $${outstandingAmount} ${currency} on ${network} tx=${txHash.slice(0, 12)}…`);

  const result = await verifyTransaction(txHash, opt.walletAddress, outstandingAmount, currency, network, 0.01);
  if (!result.verified) {
    const r = result as { verified: false; reason: string; pending?: boolean };
    console.log(`[wholesale-access-auto-verify] Not verified — request ${row.id}: ${r.reason}${r.pending ? " (pending)" : ""}`);
    return;
  }

  await confirmWholesaleAccess(row.id);
}

async function runWholesaleAccessAutoVerify(): Promise<void> {
  try {
    const pending = await db
      .select({
        id: wholesaleAccessRequestsTable.id,
        paymentTxHash: wholesaleAccessRequestsTable.paymentTxHash,
        testPaymentTxHash: wholesaleAccessRequestsTable.testPaymentTxHash,
        paymentTestAmount: wholesaleAccessRequestsTable.paymentTestAmount,
        paymentCryptoCurrency: wholesaleAccessRequestsTable.paymentCryptoCurrency,
        paymentCryptoNetwork: wholesaleAccessRequestsTable.paymentCryptoNetwork,
        amountUsd: wholesaleAccessRequestsTable.amountUsd,
      })
      .from(wholesaleAccessRequestsTable)
      .where(
        and(
          eq(wholesaleAccessRequestsTable.status, "pending"),
          isNotNull(wholesaleAccessRequestsTable.paymentTxHash),
        )
      );

    if (pending.length === 0) return;
    console.log(`[wholesale-access-auto-verify] Checking ${pending.length} pending request(s)…`);

    for (const row of pending) {
      try {
        await checkRequest(row);
      } catch (err: any) {
        console.error(`[wholesale-access-auto-verify] Error on request ${row.id}:`, err?.message ?? err);
      }
    }
  } catch (err: any) {
    console.error("[wholesale-access-auto-verify] Error:", err?.message ?? err);
  }
}

/**
 * Trigger an immediate verify attempt for a single request (fire-and-forget).
 * Called right after the user submits their tx hash so they don't wait for
 * the 10-minute scheduler cycle.
 */
export function triggerWholesaleAccessCheck(requestId: number): void {
  db.select({
    id: wholesaleAccessRequestsTable.id,
    paymentTxHash: wholesaleAccessRequestsTable.paymentTxHash,
    testPaymentTxHash: wholesaleAccessRequestsTable.testPaymentTxHash,
    paymentTestAmount: wholesaleAccessRequestsTable.paymentTestAmount,
    paymentCryptoCurrency: wholesaleAccessRequestsTable.paymentCryptoCurrency,
    paymentCryptoNetwork: wholesaleAccessRequestsTable.paymentCryptoNetwork,
    amountUsd: wholesaleAccessRequestsTable.amountUsd,
  })
    .from(wholesaleAccessRequestsTable)
    .where(
      and(
        eq(wholesaleAccessRequestsTable.id, requestId),
        eq(wholesaleAccessRequestsTable.status, "pending"),
        isNotNull(wholesaleAccessRequestsTable.paymentTxHash),
      )
    )
    .limit(1)
    .then(async ([row]) => {
      if (!row) return;
      await checkRequest(row);
    })
    .catch((err: any) => {
      console.error(`[wholesale-access-auto-verify] Immediate check error for request ${requestId}:`, err?.message ?? err);
    });
}

export function startWholesaleAccessAutoVerify(): void {
  registerScheduler({
    name: "wholesale-access-auto-verify",
    label: "Wholesale access payment auto-verify",
    description: "Auto-confirms wholesale access fee payments once the on-chain crypto tx is verified.",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60 * 1000,
    initialDelayMs: 75_000,
    run: runWholesaleAccessAutoVerify,
  });
}

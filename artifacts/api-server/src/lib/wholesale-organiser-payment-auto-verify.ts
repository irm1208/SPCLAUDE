/**
 * Automatically confirms organiser-to-platform payments only when the submitted
 * transaction contains the full expected amount and no member credits were used.
 *
 * Partial payments and all credit-adjusted payments stay pending for explicit
 * administrator confirmation.
 */
import {
  db,
  ordersTable,
  wholesaleSharesTable,
  wholesaleShareMembersTable,
} from "@workspace/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { verifyTransaction } from "./payment-verify";
import { confirmWholesaleOrganiserPayment } from "./wholesale-organiser-payment-confirmation";
import { calculateWholesaleOrganiserAmountDue } from "./wholesale-organiser-payment-amount";
import { evaluateOrganiserPaymentAutoConfirmation } from "./wholesale-organiser-payment-auto-policy";
import { normalizeWholesaleOrganiserPaymentIdentity } from "./wholesale-organiser-payment-identity";
import { registerScheduler } from "./scheduler-registry";
import { notifyUser } from "./telegram";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

async function computeOrganiserPaymentState(
  shareId: string,
  totalVendorShipping: string | null,
): Promise<{ amountDue: number; totalCreditsApplied: number }> {
  const members = await db
    .select({
      items: wholesaleShareMembersTable.items,
      orderId: wholesaleShareMembersTable.orderId,
    })
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, shareId));

  const orderIds = members
    .map(member => member.orderId)
    .filter((orderId): orderId is string => typeof orderId === "string" && orderId.length > 0);
  const orders = orderIds.length > 0
    ? await db
        .select({ id: ordersTable.id, creditsApplied: ordersTable.creditsApplied })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.sharedOrderId, shareId),
          inArray(ordersTable.id, orderIds),
        ))
    : [];
  const creditsByOrderId = new Map(orders.map(order => [order.id, order.creditsApplied]));
  const paymentMembers = members.map(member => ({
    items: member.items,
    creditsApplied: member.orderId ? creditsByOrderId.get(member.orderId) : null,
  }));
  const totalCreditsApplied = Number(paymentMembers.reduce((sum, member) => {
    const creditsApplied = Number(member.creditsApplied ?? 0);
    return Number.isFinite(creditsApplied) && creditsApplied > 0
      ? sum + creditsApplied
      : sum;
  }, 0).toFixed(2));

  return {
    amountDue: calculateWholesaleOrganiserAmountDue(paymentMembers, totalVendorShipping) ?? 0,
    totalCreditsApplied,
  };
}

async function checkShare(row: {
  id: string;
  organiserPaymentTxHash: string | null;
  organiserPaymentCurrency: string | null;
  organiserPaymentNetwork: string | null;
  totalVendorShipping: string | null;
  creatorUsername: string;
}): Promise<void> {
  const rawTxHash = row.organiserPaymentTxHash ?? "";
  if (!rawTxHash) return;
  const identity = normalizeWholesaleOrganiserPaymentIdentity({
    txHash: rawTxHash,
    currency: row.organiserPaymentCurrency ?? "USDT",
    network: row.organiserPaymentNetwork ?? "ERC-20",
  });
  const { txHash, currency, network } = identity;

  const { getAdminCryptoOptions } = await import("../routes/payments");
  const options = await getAdminCryptoOptions();
  const opt = options.find(
    option => {
      const optionIdentity = normalizeWholesaleOrganiserPaymentIdentity({
        txHash,
        currency: option.currency,
        network: option.network,
      });
      return optionIdentity.currency === currency && optionIdentity.network === network;
    },
  );

  if (!opt?.walletAddress) {
    console.warn(
      `[wholesale-organiser-auto-verify] No exact admin wallet for share ${row.id} (currency=${currency} network=${network})`,
    );
    return;
  }

  const { amountDue, totalCreditsApplied } = await computeOrganiserPaymentState(
    row.id,
    row.totalVendorShipping,
  );
  const preVerificationDecision = evaluateOrganiserPaymentAutoConfirmation({
    amountDue,
    totalCreditsApplied,
    currency,
    verifiedAmount: null,
  });
  if (preVerificationDecision.reason === "invalid_amount") {
    console.warn(
      `[wholesale-organiser-auto-verify] Computed amountDue=${amountDue} for share ${row.id} — requires manual admin confirmation`,
    );
    return;
  }
  if (preVerificationDecision.reason === "credits_applied") {
    console.log(
      `[wholesale-organiser-auto-verify] Share ${row.id} used $${totalCreditsApplied.toFixed(2)} in member credits — requires manual admin confirmation`,
    );
    return;
  }
  if (preVerificationDecision.reason === "unsupported_currency") {
    console.log(
      `[wholesale-organiser-auto-verify] ${currency} is not a USD stablecoin — requires manual admin confirmation for share ${row.id}`,
    );
    return;
  }

  console.log(
    `[wholesale-organiser-auto-verify] Checking share ${row.id} — $${amountDue} ${currency} on ${network} tx=${txHash.slice(0, 12)}…`,
  );
  const verification = await verifyTransaction(
    txHash,
    opt.walletAddress,
    amountDue,
    currency,
    network,
    0,
  );
  const finalDecision = evaluateOrganiserPaymentAutoConfirmation({
    amountDue,
    totalCreditsApplied,
    currency,
    verifiedAmount: verification.verified ? verification.amountUsdt : null,
  });
  if (!verification.verified || !finalDecision.autoConfirm) {
    const result = verification as { verified: false; reason: string; pending?: boolean };
    console.log(
      `[wholesale-organiser-auto-verify] Partial or unverified payment for share ${row.id} — requires manual admin confirmation: ${verification.verified ? "received amount is below the full amount due" : `${result.reason}${result.pending ? " (pending)" : ""}`}`,
    );
    return;
  }

  const confirmation = await confirmWholesaleOrganiserPayment({
    shareId: row.id,
    source: "automatic",
    expectedCurrentParentStatus: "pending",
    expectedPaymentIdentity: {
      txHash,
      currency,
      network,
    },
    expectedAmountDue: amountDue,
    receivedAmountUsd: verification.amountUsdt,
    requireNoCredits: true,
  });
  if (confirmation.kind === "confirmed") {
    notifyUser(
      confirmation.creatorUsername,
      "payment",
      `✅ <b>Platform payment confirmed</b>\n\nYour full payment for shared order <code>${row.id}</code> was verified on-chain and confirmed automatically.\n\nYour order is now being processed.`,
    ).catch(() => {});
    console.log(
      `[wholesale-organiser-auto-verify] Confirmed full organiser payment for share ${row.id} (@${confirmation.creatorUsername})`,
    );
  }
}

async function runWholesaleOrganiserPaymentAutoVerify(): Promise<void> {
  try {
    const pending = await db
      .select({
        id: wholesaleSharesTable.id,
        organiserPaymentTxHash: wholesaleSharesTable.organiserPaymentTxHash,
        organiserPaymentCurrency: wholesaleSharesTable.organiserPaymentCurrency,
        organiserPaymentNetwork: wholesaleSharesTable.organiserPaymentNetwork,
        totalVendorShipping: wholesaleSharesTable.totalVendorShipping,
        creatorUsername: wholesaleSharesTable.creatorUsername,
      })
      .from(wholesaleSharesTable)
      .where(and(
        eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
        isNotNull(wholesaleSharesTable.organiserPaymentTxHash),
      ));

    if (pending.length === 0) return;
    console.log(`[wholesale-organiser-auto-verify] Checking ${pending.length} pending share(s)…`);
    for (const row of pending) {
      try {
        await checkShare(row);
      } catch (error: any) {
        console.error(
          `[wholesale-organiser-auto-verify] Error on share ${row.id}:`,
          error?.message ?? error,
        );
      }
    }
  } catch (error: any) {
    console.error("[wholesale-organiser-auto-verify] Error:", error?.message ?? error);
  }
}

export function triggerWholesaleOrganiserPaymentCheck(shareId: string): void {
  db.select({
    id: wholesaleSharesTable.id,
    organiserPaymentTxHash: wholesaleSharesTable.organiserPaymentTxHash,
    organiserPaymentCurrency: wholesaleSharesTable.organiserPaymentCurrency,
    organiserPaymentNetwork: wholesaleSharesTable.organiserPaymentNetwork,
    totalVendorShipping: wholesaleSharesTable.totalVendorShipping,
    creatorUsername: wholesaleSharesTable.creatorUsername,
  })
    .from(wholesaleSharesTable)
    .where(and(
      eq(wholesaleSharesTable.id, shareId),
      eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
      isNotNull(wholesaleSharesTable.organiserPaymentTxHash),
    ))
    .limit(1)
    .then(async ([row]) => {
      if (!row) return;
      await checkShare(row);
    })
    .catch((error: any) => {
      console.error(
        `[wholesale-organiser-auto-verify] Immediate check error for share ${shareId}:`,
        error?.message ?? error,
      );
    });
}

export function startWholesaleOrganiserPaymentAutoVerify(): void {
  registerScheduler({
    name: "wholesale-organiser-payment-auto-verify",
    label: "Wholesale organiser platform payment auto-verify",
    description:
      "Auto-confirms full organiser-to-platform crypto payments without member credits; partial and credit-adjusted payments require manual admin confirmation.",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60 * 1000,
    initialDelayMs: 90_000,
    run: runWholesaleOrganiserPaymentAutoVerify,
  });
}
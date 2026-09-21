/**
 * Automatically confirms wholesale shared-order organiser platform payments once
 * the on-chain tx is verified.
 *
 * When an organiser has their own crypto wallet (leadCryptoOptions), members pay
 * the organiser directly. The organiser then forwards the combined product subtotal
 * + vendor shipping, less member-applied credits, to the Salt&Peps admin wallet.
 * This scheduler picks up shares
 * with organiserPaymentStatus="pending" + a stored tx hash, verifies the transfer
 * on-chain, and — on success — performs the same action as the admin
 * "confirm-organiser-payment" endpoint:
 *   • delegates the atomic share/order transition and audit to the shared service
 *   • notifies the organiser when the service confirms the payment
 *
 * Runs every 10 minutes. A one-shot immediate check is also exported for use right
 * after the organiser submits their tx hash.
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
import { registerScheduler } from "./scheduler-registry";
import { notifyUser } from "./telegram";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function computeOrganiserAmountDue(shareId: string, totalVendorShipping: string | null): Promise<number> {
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
  return calculateWholesaleOrganiserAmountDue(
    members.map(member => ({
      items: member.items,
      creditsApplied: member.orderId ? creditsByOrderId.get(member.orderId) : null,
    })),
    totalVendorShipping,
  ) ?? 0;
}

// ── Check a single share ───────────────────────────────────────────────────────

async function checkShare(row: {
  id: string;
  organiserPaymentTxHash: string | null;
  organiserPaymentCurrency: string | null;
  organiserPaymentNetwork: string | null;
  totalVendorShipping: string | null;
  creatorUsername: string;
}): Promise<void> {
  const txHash = row.organiserPaymentTxHash ?? "";
  if (!txHash) return;

  const { getAdminCryptoOptions } = await import("../routes/payments");
  const options = await getAdminCryptoOptions();

  const currency = (row.organiserPaymentCurrency ?? "USDT").toUpperCase();
  const network  = row.organiserPaymentNetwork ?? "ERC-20";

  const opt = options.find(
    o => o.currency.toUpperCase() === currency && o.network.toLowerCase() === network.toLowerCase(),
  );

  if (!opt?.walletAddress) {
    console.warn(
      `[wholesale-organiser-auto-verify] No exact admin wallet for share ${row.id} (currency=${currency} network=${network})`,
    );
    return;
  }

  const amountDue = await computeOrganiserAmountDue(row.id, row.totalVendorShipping);
  if (amountDue <= 0) {
    console.warn(`[wholesale-organiser-auto-verify] Computed amountDue=${amountDue} for share ${row.id} — skipping`);
    return;
  }

  console.log(
    `[wholesale-organiser-auto-verify] Checking share ${row.id} — $${amountDue} ${currency} on ${network} tx=${txHash.slice(0, 12)}…`,
  );

  const verification = await verifyTransaction(txHash, opt.walletAddress, amountDue, currency, network, 0.01);
  if (!verification.verified) {
    const r = verification as { verified: false; reason: string; pending?: boolean };
    console.log(
      `[wholesale-organiser-auto-verify] Not verified — share ${row.id}: ${r.reason}${r.pending ? " (pending)" : ""}`,
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
  });

  if (confirmation.kind === "confirmed") {
    notifyUser(
      confirmation.creatorUsername,
      "payment",
      `✅ <b>Platform payment confirmed</b>\n\nYour forwarded payment for shared order <code>${row.id}</code> has been verified on-chain and confirmed.\n\nYour order is now being processed.`,
    ).catch(() => {});
    console.log(`[wholesale-organiser-auto-verify] Confirmed organiser payment for share ${row.id} (@${confirmation.creatorUsername})`);
  }
}

// ── Scheduler run ──────────────────────────────────────────────────────────────

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
      .where(
        and(
          eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
          isNotNull(wholesaleSharesTable.organiserPaymentTxHash),
        ),
      );

    if (pending.length === 0) return;
    console.log(`[wholesale-organiser-auto-verify] Checking ${pending.length} pending share(s)…`);

    for (const row of pending) {
      try {
        await checkShare(row);
      } catch (err: any) {
        console.error(`[wholesale-organiser-auto-verify] Error on share ${row.id}:`, err?.message ?? err);
      }
    }
  } catch (err: any) {
    console.error("[wholesale-organiser-auto-verify] Error:", err?.message ?? err);
  }
}

// ── Immediate trigger (fire-and-forget) ────────────────────────────────────────

/**
 * Trigger an immediate verify attempt for a single share right after the
 * organiser submits their tx hash, without waiting for the next scheduler cycle.
 */
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
    .where(
      and(
        eq(wholesaleSharesTable.id, shareId),
        eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
        isNotNull(wholesaleSharesTable.organiserPaymentTxHash),
      ),
    )
    .limit(1)
    .then(async ([row]) => {
      if (!row) return;
      await checkShare(row);
    })
    .catch((err: any) => {
      console.error(
        `[wholesale-organiser-auto-verify] Immediate check error for share ${shareId}:`,
        err?.message ?? err,
      );
    });
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

export function startWholesaleOrganiserPaymentAutoVerify(): void {
  registerScheduler({
    name: "wholesale-organiser-payment-auto-verify",
    label: "Wholesale organiser platform payment auto-verify",
    description:
      "Auto-confirms organiser-to-platform crypto payments for shared wholesale orders once the on-chain tx is verified.",
    defaultIntervalMs: CHECK_INTERVAL_MS,
    minIntervalMs: 60_000,
    maxIntervalMs: 6 * 60 * 60 * 1000,
    initialDelayMs: 90_000,
    run: runWholesaleOrganiserPaymentAutoVerify,
  });
}

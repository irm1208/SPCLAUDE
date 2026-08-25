/**
 * Automatically confirms wholesale shared-order organiser platform payments once
 * the on-chain tx is verified.
 *
 * When an organiser has their own crypto wallet (leadCryptoOptions), members pay
 * the organiser directly. The organiser then forwards the combined product subtotal
 * + vendor shipping to the Salt&Peps admin wallet. This scheduler picks up shares
 * with organiserPaymentStatus="pending" + a stored tx hash, verifies the transfer
 * on-chain, and — on success — performs the same action as the admin
 * "confirm-organiser-payment" endpoint:
 *   • sets organiserPaymentStatus = "confirmed"
 *   • sets organiserPaymentConfirmedAt
 *   • notifies the organiser via Telegram
 *   • writes an audit log entry
 *
 * Runs every 10 minutes. A one-shot immediate check is also exported for use right
 * after the organiser submits their tx hash.
 */
import {
  db,
  wholesaleSharesTable,
  wholesaleShareMembersTable,
} from "@workspace/db";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { verifyTransaction } from "./payment-verify";
import { registerScheduler } from "./scheduler-registry";
import { notifyUser } from "./telegram";
import { writeLog } from "./audit-log";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ── Amount computation ─────────────────────────────────────────────────────────

function memberSubtotal(items: Array<{ quantity?: unknown; unitPrice?: unknown }>): number {
  return Number(
    items
      .reduce((s, i) => s + Number(((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)).toFixed(2)), 0)
      .toFixed(2),
  );
}

async function computeOrganiserAmountDue(shareId: string, totalVendorShipping: string | null): Promise<number> {
  const members = await db
    .select({ items: wholesaleShareMembersTable.items })
    .from(wholesaleShareMembersTable)
    .where(eq(wholesaleShareMembersTable.shareId, shareId));

  const combinedSubtotal = Number(
    members.reduce((s, m) => s + memberSubtotal((m.items ?? []) as Array<{ quantity?: unknown; unitPrice?: unknown }>), 0).toFixed(2),
  );
  const shipping = totalVendorShipping != null ? Number(totalVendorShipping) : 0;
  return Number((combinedSubtotal + shipping).toFixed(2));
}

// ── Confirm helper ─────────────────────────────────────────────────────────────

async function confirmOrganiserPayment(shareId: string, organiserUsername: string): Promise<void> {
  // Re-fetch inside confirm to guard against double-confirm races.
  const [share] = await db
    .select({
      id: wholesaleSharesTable.id,
      organiserPaymentStatus: wholesaleSharesTable.organiserPaymentStatus,
      creatorUsername: wholesaleSharesTable.creatorUsername,
    })
    .from(wholesaleSharesTable)
    .where(
      and(
        eq(wholesaleSharesTable.id, shareId),
        eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
      ),
    )
    .limit(1);

  if (!share) return; // already confirmed or rolled back

  await db
    .update(wholesaleSharesTable)
    .set({
      organiserPaymentStatus: "confirmed",
      organiserPaymentConfirmedAt: new Date(),
    })
    .where(
      and(
        eq(wholesaleSharesTable.id, shareId),
        eq(wholesaleSharesTable.organiserPaymentStatus, "pending"),
      ),
    );

  notifyUser(
    organiserUsername,
    "payment",
    `✅ <b>Platform payment confirmed</b>\n\nYour forwarded payment for shared order <code>${shareId}</code> has been verified on-chain and confirmed.\n\nYour order is now being processed.`,
  ).catch(() => {});

  writeLog(
    "order",
    "info",
    "wholesale_share_organiser_payment_auto_confirmed",
    `Auto-verified organiser platform payment for share ${shareId} (@${organiserUsername})`,
    { shareId, organiserUsername },
  ).catch(() => {});

  console.log(`[wholesale-organiser-auto-verify] Confirmed organiser payment for share ${shareId} (@${organiserUsername})`);
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

  const opt =
    options.find(o => o.currency.toUpperCase() === currency && o.network.toLowerCase() === network.toLowerCase()) ??
    options.find(o => o.currency.toUpperCase() === currency) ??
    options[0];

  if (!opt?.walletAddress) {
    console.warn(
      `[wholesale-organiser-auto-verify] No admin wallet for share ${row.id} (currency=${currency} network=${network})`,
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

  const result = await verifyTransaction(txHash, opt.walletAddress, amountDue, currency, network, 0.01);
  if (!result.verified) {
    const r = result as { verified: false; reason: string; pending?: boolean };
    console.log(
      `[wholesale-organiser-auto-verify] Not verified — share ${row.id}: ${r.reason}${r.pending ? " (pending)" : ""}`,
    );
    return;
  }

  await confirmOrganiserPayment(row.id, row.creatorUsername);
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

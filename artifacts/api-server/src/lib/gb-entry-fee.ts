/**
 * Shared helpers for the group buy "paid entry fee" feature.
 *
 * Lifecycle of a gb_entry_fee_payments row:
 *   pending   — created the first time a customer attempts to join a fee-gated GB
 *   submitted — customer has supplied a crypto tx hash, awaiting verification
 *   confirmed — payment verified (auto by the scheduler, or manually by admin/organiser);
 *               membership (account_group_buys) is granted at this point
 *   rejected  — manually rejected by admin/organiser; customer may resubmit a new tx hash
 *
 * Entry fees are a gate-to-join charge collected before shipping/country-leg specifics
 * necessarily matter, so — unlike product-order payments — they never route through a
 * per-country reshipper wallet. Wallet resolution is always: GB organiser wallet, else the
 * global site wallet (mirrors resolveOrderCrypto's GB branch in routes/payments.ts, minus
 * the reshipper-country lookup).
 */
import { db, groupBuysTable, gbEntryFeePaymentsTable, accountGroupBuysTable, siteConfigTable, type GbEntryFeePayment } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  isValidEthAddress,
  isValidBtcAddress,
  isValidSolanaAddress,
  effectiveStableCurrency,
  isEthErc20StableRail,
  ERC20_STABLE_CURRENCIES,
} from "./payment-verify";
import { fetchFiatToUsd } from "./crypto-pricing";

export type EntryFeeGb = {
  id: string;
  currency: string;
  entryFeeAmount: string | number | null;
  entryFeeLabel?: string | null;
  organiserPayments?: unknown;
};

async function getConfig(key: string): Promise<string | null> {
  const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

/** Convert a fee amount in the GB's currency to USD (for on-chain verification). */
export async function convertEntryFeeToUsd(amount: number, currency: string): Promise<number> {
  const cur = (currency ?? "USD").toUpperCase();
  if (cur === "USD") return amount;
  const rate = await fetchFiatToUsd(cur);
  return Math.round(amount * rate * 100) / 100;
}

/** Resolve the wallet/currency/network to collect a GB's entry fee into. */
export async function resolveEntryFeeCrypto(gb: EntryFeeGb): Promise<{ walletAddress: string | null; currency: string; network: string }> {
  const defaultCurrency = "USDT";
  const defaultNetwork = "ERC-20";
  const op = (gb.organiserPayments ?? null) as Record<string, string | null> | null;
  const currency = op?.["cryptoCurrency"]?.trim() || defaultCurrency;
  const network = op?.["cryptoNetwork"]?.trim() || defaultNetwork;
  const gbWallet = op?.["cryptoWalletAddress"] ?? null;
  let walletAddress: string | null;
  if (gbWallet && (isValidEthAddress(gbWallet) || isValidBtcAddress(gbWallet) || isValidSolanaAddress(gbWallet))) {
    walletAddress = gbWallet;
  } else {
    walletAddress = await getConfig("walletAddress");
  }
  return { walletAddress, currency, network };
}

/** Crypto payment options a customer may choose between for an entry fee (mirrors getOrderCryptoOptions). */
export async function getEntryFeeCryptoOptions(gb: EntryFeeGb): Promise<{ walletAddress: string | null; currency: string; network: string; options: { currency: string; network: string }[] }> {
  const base = await resolveEntryFeeCrypto(gb);
  if (isEthErc20StableRail(base.currency, base.network, base.walletAddress)) {
    return { ...base, options: ERC20_STABLE_CURRENCIES.map(c => ({ currency: c, network: base.network })) };
  }
  return { ...base, options: [{ currency: base.currency, network: base.network }] };
}

/** Resolve the wallet/currency to VERIFY against, honouring the customer's persisted stablecoin choice.
 *
 * We trust the stored paymentCryptoCurrency for ERC-20 stablecoins directly — it was already
 * server-validated at submit time (via getEntryFeeCryptoOptions).  effectiveStableCurrency's
 * isEthErc20StableRail guard (which requires base.currency === "USDT") is intentionally bypassed
 * here so that a USDC choice is honoured even when the global wallet or organiser wallet config
 * causes isEthErc20StableRail to return false.
 */
export async function resolveEffectiveEntryFeeCrypto(gb: EntryFeeGb, paymentCryptoCurrency: string | null): Promise<{ walletAddress: string | null; currency: string; network: string }> {
  const base = await resolveEntryFeeCrypto(gb);
  const stored = (paymentCryptoCurrency ?? "").toUpperCase().trim();
  // If the stored currency is a known ERC-20 stablecoin and the rail is ERC-20 with a valid ETH
  // wallet, use it directly rather than re-deriving through effectiveStableCurrency.
  if (
    stored &&
    (ERC20_STABLE_CURRENCIES as readonly string[]).includes(stored) &&
    /erc.?20|ethereum/i.test(base.network) &&
    base.walletAddress && isValidEthAddress(base.walletAddress)
  ) {
    return { walletAddress: base.walletAddress, currency: stored, network: base.network };
  }
  const currency = effectiveStableCurrency(base.currency, base.network, base.walletAddress, paymentCryptoCurrency);
  return { walletAddress: base.walletAddress, currency, network: base.network };
}

/**
 * Get the (single) entry fee payment row for an account+GB, creating a fresh "pending"
 * row snapshotting the current fee amount/currency/wallet if none exists yet. Never
 * recreates or re-snapshots a row that has moved past "pending" (rejected rows are
 * reset instead — see resetRejectedEntryFeePayment).
 */
export async function getOrCreateEntryFeePayment(gb: EntryFeeGb, accountId: string, countryLegId: string | null): Promise<GbEntryFeePayment> {
  const [existing] = await db
    .select()
    .from(gbEntryFeePaymentsTable)
    .where(and(eq(gbEntryFeePaymentsTable.groupBuyId, gb.id), eq(gbEntryFeePaymentsTable.accountId, accountId)));

  if (existing) {
    // Keep the country-leg snapshot fresh if the customer re-attempts join after picking
    // a different leg — but never once the payment is confirmed (membership already granted).
    if (countryLegId != null && existing.countryLegId !== countryLegId && existing.status !== "confirmed") {
      const [updated] = await db
        .update(gbEntryFeePaymentsTable)
        .set({ countryLegId })
        .where(eq(gbEntryFeePaymentsTable.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const amount = parseFloat(String(gb.entryFeeAmount ?? "0"));
  // Add a random 1–99 cent suffix so every customer sees a unique amount (e.g. 10.54 vs 10.23).
  // This lets us match an on-chain transaction to a specific customer without relying solely on
  // the TXID, and makes it impossible to recycle someone else's txid.
  const randomCents = Math.floor(Math.random() * 99) + 1;
  const randomizedAmount = Math.round((amount + randomCents * 0.01) * 100) / 100;
  const amountUsd = await convertEntryFeeToUsd(randomizedAmount, gb.currency);
  const crypto = await resolveEntryFeeCrypto(gb);

  const [created] = await db
    .insert(gbEntryFeePaymentsTable)
    .values({
      id: randomUUID(),
      groupBuyId: gb.id,
      accountId,
      status: "pending",
      amount: amount.toFixed(2),
      currency: gb.currency,
      randomizedAmount: randomizedAmount.toFixed(2),
      amountUsd: amountUsd.toFixed(2),
      paymentMethod: "crypto",
      paymentCryptoCurrency: crypto.currency,
      paymentCryptoNetwork: crypto.network,
      countryLegId,
    })
    .onConflictDoNothing({ target: [gbEntryFeePaymentsTable.groupBuyId, gbEntryFeePaymentsTable.accountId] })
    .returning();

  if (created) return created;

  // Lost a create race — someone else inserted first, just fetch it.
  const [raced] = await db
    .select()
    .from(gbEntryFeePaymentsTable)
    .where(and(eq(gbEntryFeePaymentsTable.groupBuyId, gb.id), eq(gbEntryFeePaymentsTable.accountId, accountId)));
  return raced;
}

/** Allow a customer to retry after a rejection — resets the row back to "pending". */
export async function resetRejectedEntryFeePayment(paymentId: string): Promise<GbEntryFeePayment | null> {
  const [updated] = await db
    .update(gbEntryFeePaymentsTable)
    .set({
      status: "pending",
      paymentTxHash: null,
      submittedAt: null,
      confirmedAt: null,
      confirmedBy: null,
      rejectionReason: null,
    })
    .where(and(eq(gbEntryFeePaymentsTable.id, paymentId), eq(gbEntryFeePaymentsTable.status, "rejected")))
    .returning();
  return updated ?? null;
}

/** Grant GB membership for a confirmed entry fee payment (idempotent). */
export async function grantEntryFeeMembership(payment: { groupBuyId: string; accountId: string; countryLegId: string | null }): Promise<void> {
  await db
    .insert(accountGroupBuysTable)
    .values({
      id: randomUUID(),
      accountId: payment.accountId,
      groupBuyId: payment.groupBuyId,
      countryLegId: payment.countryLegId,
    })
    .onConflictDoNothing();
}

/**
 * Mark a payment confirmed and grant membership, atomically (both succeed or both roll back
 * so a payment can never be left "confirmed" without the customer actually gaining access).
 *
 * Idempotent: if the payment is already confirmed, this heals a previously-stuck row by
 * re-attempting the (conflict-safe) membership grant instead of silently no-op'ing.
 */
export async function confirmEntryFeePayment(paymentId: string, confirmedBy: string): Promise<GbEntryFeePayment | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(gbEntryFeePaymentsTable)
      .where(eq(gbEntryFeePaymentsTable.id, paymentId));
    if (!existing) return null;

    let updated = existing;
    if (existing.status !== "confirmed") {
      const [row] = await tx
        .update(gbEntryFeePaymentsTable)
        .set({ status: "confirmed", confirmedAt: new Date(), confirmedBy })
        .where(and(eq(gbEntryFeePaymentsTable.id, paymentId), ne(gbEntryFeePaymentsTable.status, "confirmed")))
        .returning();
      if (!row) return null;
      updated = row;
    }

    await tx
      .insert(accountGroupBuysTable)
      .values({
        id: randomUUID(),
        accountId: updated.accountId,
        groupBuyId: updated.groupBuyId,
        countryLegId: updated.countryLegId,
      })
      .onConflictDoNothing();

    return updated;
  });
}

/** Reject a submitted payment, allowing the customer to resubmit. */
export async function rejectEntryFeePayment(paymentId: string, reason: string | null): Promise<GbEntryFeePayment | null> {
  const [updated] = await db
    .update(gbEntryFeePaymentsTable)
    .set({ status: "rejected", rejectionReason: reason ? String(reason).trim() : null })
    .where(eq(gbEntryFeePaymentsTable.id, paymentId))
    .returning();
  return updated ?? null;
}

/** Shape a payment row + GB for a customer-facing API response. */
export async function shapeEntryFeePayment(payment: GbEntryFeePayment, gb: EntryFeeGb) {
  const cryptoOptions = await getEntryFeeCryptoOptions(gb);
  // Use the randomized amount (unique per customer) for display and verification.
  // Falls back to the base amount for rows created before the feature was added.
  const displayAmount = payment.randomizedAmount != null
    ? parseFloat(String(payment.randomizedAmount))
    : parseFloat(String(payment.amount));
  return {
    id: payment.id,
    groupBuyId: payment.groupBuyId,
    status: payment.status,
    amount: displayAmount,
    currency: payment.currency,
    label: gb.entryFeeLabel ?? null,
    hasTxHash: !!payment.paymentTxHash,
    rejectionReason: payment.rejectionReason ?? null,
    submittedAt: payment.submittedAt,
    confirmedAt: payment.confirmedAt,
    payment: {
      walletAddress: cryptoOptions.walletAddress,
      currency: payment.paymentCryptoCurrency ?? cryptoOptions.currency,
      network: payment.paymentCryptoNetwork ?? cryptoOptions.network,
      amount: displayAmount,
      amountUsd: payment.amountUsd != null ? parseFloat(String(payment.amountUsd)) : null,
      availableCryptoOptions: cryptoOptions.options,
    },
  };
}

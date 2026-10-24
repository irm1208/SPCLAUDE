import { z } from "zod";
import { createHash } from "node:crypto";
import { isValidBtcAddress, isValidEthAddress, isValidSolanaAddress, isValidTxHash, verifyTransaction } from "./payment-verify";
import { normaliseWalletAddress } from "./payment-audit";
import type { FeeOrder } from "./reshipper-payout-rules";
import { getPayoutAsset } from "@workspace/payout-assets";

export const walletOwnershipSchema = z.object({
  accountId: z.string().min(1),
  collector: z.enum(["admin", "reshipper"]),
  network: z.enum(["ERC-20", "Arbitrum One", "Polygon", "Solana", "TRC-20", "Bitcoin Mainnet", "Ethereum", "BSC"]),
  address: z.string().trim().min(1).max(200),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullable(),
}).superRefine((wallet, ctx) => {
  const valid = wallet.network === "Solana" ? isValidSolanaAddress(wallet.address)
    : wallet.network === "Bitcoin Mainnet" ? isValidBtcAddress(wallet.address)
    : wallet.network === "TRC-20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(wallet.address)
    : isValidEthAddress(wallet.address);
  if (!valid) ctx.addIssue({ code: "custom", message: "Enter a valid address for this network.", path: ["address"] });
  if (wallet.effectiveUntil && new Date(wallet.effectiveUntil).getTime() <= new Date(wallet.effectiveFrom).getTime())
    ctx.addIssue({ code: "custom", message: "Owned until must be after owned from.", path: ["effectiveUntil"] });
});
export type CollectionWallet = z.infer<typeof walletOwnershipSchema>;
// Payout destinations are separate from historical customer-payment ownership.
export function parsePayoutWallet(raw: unknown) {
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const checked = walletOwnershipSchema.safeParse({
    address: input.address, network: input.network, accountId: "payout-destination", collector: "reshipper",
    effectiveFrom: "2000-01-01T00:00:00.000Z", effectiveUntil: null,
  });
  if (!checked.success) return null;
  if (input.currency !== undefined && (typeof input.currency !== "string" || !getPayoutAsset(checked.data.network, input.currency))) return null;
  return { address: checked.data.address, network: checked.data.network, ...(typeof input.currency === "string" ? { currency: input.currency } : {}) };
}
export type CollectionCheck = {
  collector: "admin" | "reshipper" | null; reason: string;
  address?: string; network?: string; txid?: string;
  declaration?: CollectionWallet;
};
export function collectionPaymentKey(order: FeeOrder) {
  return createHash("sha256").update(JSON.stringify([
    order.paymentTxHash, order.paymentTxHashes, order.balanceTxHash, order.paymentCryptoCurrency,
    order.paymentCryptoNetwork, order.paymentUsdAmount, order.paymentCryptoRate, order.paymentConfirmedAt,
    order.paymentTestAmount, order.creditsApplied,
  ])).digest("hex");
}
export const walletNetwork = (raw: string) => {
  const n = raw.trim().toLowerCase();
  if (/arbitrum/.test(n)) return "Arbitrum One";
  if (/polygon/.test(n)) return "Polygon";
  if (/solana/.test(n)) return "Solana";
  if (/trc|tron/.test(n)) return "TRC-20";
  if (/bsc|bep.?20|binance/.test(n)) return "BSC";
  if (/bitcoin/.test(n)) return "Bitcoin Mainnet";
  if (/erc.?20/.test(n)) return "ERC-20";
  if (/ethereum/.test(n)) return "ERC-20";
  return raw;
};

/** Reads chain evidence only. Never changes customer payments or fee entitlements. */
export async function checkCollectionWallet(
  order: FeeOrder, wallets: CollectionWallet[], verify: typeof verifyTransaction = verifyTransaction,
): Promise<CollectionCheck> {
  const hold = (reason: string): CollectionCheck => ({ collector: null, reason });
  if (order.paymentStatus !== "confirmed" || Number(order.amountDue) !== 0 || order.deletedAt ||
    ["cancelled", "refunded", "draft"].includes(order.status.toLowerCase()) || order.routingType === "direct" ||
    (order.refundStatus && !["none", "rejected", "declined", "cancelled"].includes(order.refundStatus.toLowerCase())))
    return hold("Order is not eligible for automatic collection review.");
  const hashes = [...new Set([order.paymentTxHash, ...(order.paymentTxHashes ?? [])].filter(Boolean).map(value => {
    const v = value!.trim();
    return /^(?:0x)?[a-f0-9]{64}$/i.test(v) ? v.replace(/^0x/i, "").toLowerCase() : v;
  }))];
  if (hashes.length !== 1 || order.balanceTxHash || Number(order.paymentTestAmount ?? 0) > 0 || Number(order.creditsApplied ?? 0) > 0)
    return hold("Multiple, test, balance or credit-adjusted payments need review.");
  const txid = order.paymentTxHash?.trim();
  if (!txid || !isValidTxHash(txid)) return hold("No single blockchain payment TXID is recorded.");
  const currency = order.paymentCryptoCurrency, network = order.paymentCryptoNetwork;
  // Legacy USDT/USDC payments stored the USD amount without a rate: these
  // tokens are priced 1:1 by checkout. Still verify that full amount on-chain.
  // Never guess a volatile coin's historical rate or replace an invalid saved rate.
  const usd = Number(order.paymentUsdAmount);
  const rate = order.paymentCryptoRate == null && (currency === "USDT" || currency === "USDC")
    ? 1 : Number(order.paymentCryptoRate);
  const paidAt = order.paymentConfirmedAt ? new Date(order.paymentConfirmedAt).getTime() : NaN;
  if (!currency || !network || !Number.isFinite(usd) || usd <= 0 || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(paidAt))
    return hold("The original payment date, network or locked amount is missing.");
  const applicable = wallets.filter(w => w.accountId === order.reshipperAccountId && walletNetwork(w.network) === walletNetwork(network) &&
    new Date(w.effectiveFrom).getTime() <= paidAt && (!w.effectiveUntil || paidAt < new Date(w.effectiveUntil).getTime()));
  if (!applicable.length) return hold("No declared wallet ownership covers this payment date and network. Add the historical wallet once, then retry.");
  const seen = new Map<string, CollectionWallet>();
  for (const wallet of applicable) {
    const key = normaliseWalletAddress(wallet.address);
    if (seen.has(key) && seen.get(key)!.collector !== wallet.collector) return hold("Conflicting wallet ownership declarations need correction.");
    seen.set(key, wallet);
  }
  const matches: CollectionCheck[] = [];
  for (const wallet of seen.values()) {
    try {
      const result = await verify(txid, wallet.address, usd / rate, currency, network, 0.01);
      if (result.verified && result.recipientAddress && normaliseWalletAddress(result.recipientAddress) === normaliseWalletAddress(wallet.address)) {
        matches.push({ collector: wallet.collector, address: result.recipientAddress, network, txid, declaration: wallet,
          reason: wallet.collector === "admin" ? "Verified payment to an Admin-owned wallet." : "Verified payment directly to the reshipper-owned wallet." });
      }
    } catch { return hold("Blockchain check unavailable. Nothing was classified; retry later."); }
  }
  return matches.length === 1 ? matches[0] : hold(matches.length > 1
    ? "Multiple receiving wallets matched. Manual review is required."
    : "No verified full payment to a declared wallet was found. Check the TXID, amount and receiving wallet.");
}

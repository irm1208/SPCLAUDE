import { normalizeTg } from "./normalize";
import { centsToUsdString, usdToCents } from "./refund-money";
import { isValidTxHash } from "./payment-verify";
import { transactionKind } from "./payment-audit";

export const REFUND_ELIGIBILITY_CODES = [
  "refunds_disabled",
  "not_owner",
  "not_group_buy_order",
  "deleted_order",
  "ineligible_payment_evidence",
  "already_cancelled",
  "already_refunded",
  "non_positive_total",
  "active_refund_exists",
] as const;

export type RefundEligibilityCode = typeof REFUND_ELIGIBILITY_CODES[number];

export type RefundEligibility = {
  eligible: boolean;
  reasonCode: RefundEligibilityCode | null;
  amountUsd: string | null;
};

export type RefundEligibilityOrder = {
  telegramUsername: string;
  groupBuyId: string | null | undefined;
  orderType?: string | null;
  deletedAt: Date | string | null | undefined;
  status: string | null | undefined;
  refundStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
  paymentTxHash: string | null | undefined;
  paymentTxHashes?: string[] | null | undefined;
  paymentConfirmedAt: Date | string | null | undefined;
  paymentCryptoCurrency?: string | null;
  paymentCryptoNetwork?: string | null;
  grandTotal: string | number | null | undefined;
  paymentScreenshot?: string | null;
};

export type RefundEligibilityInput = {
  accountId: string;
  order: RefundEligibilityOrder | null | undefined;
  groupBuy: { id: string; cryptoRefundsEnabled: boolean } | null | undefined;
  activeRefund: { id: string; status: string } | null | undefined;
};

function ineligible(reasonCode: RefundEligibilityCode): RefundEligibility {
  return { eligible: false, reasonCode, amountUsd: null };
}

function isSupportedCryptoRail(currency: string, network: string): boolean {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();
  if (cur === "USDT") {
    return /arbitrum|polygon|solana|tron|trc|erc.?20|ethereum|bep.?20|bsc|binance/.test(net);
  }
  if (cur === "USDC") {
    return /arbitrum|polygon|solana|erc.?20|ethereum/.test(net);
  }
  if (cur === "ETH") return /mainnet|ethereum|erc.?20/.test(net);
  if (cur === "BTC") return /mainnet|bitcoin/.test(net);
  return false;
}

function isHashFormatForNetwork(hash: string, currency: string, network: string): boolean {
  const cur = currency.toUpperCase().trim();
  const net = network.toLowerCase().trim();
  if (/solana/.test(net)) {
    return /^[1-9A-HJ-NP-Za-km-z]{86,88}$/.test(hash);
  }
  if (cur === "BTC" && /bitcoin|mainnet/.test(net)) {
    return /^[0-9a-fA-F]{64}$/.test(hash);
  }
  if (/arbitrum|polygon|tron|trc|erc.?20|ethereum|mainnet|bep.?20|bsc|binance/.test(net)) {
    return /^(?:0x)?[0-9a-fA-F]{64}$/.test(hash);
  }
  return false;
}

function isAuthoritativeTransactionHash(
  hash: unknown,
  currency: string | null | undefined,
  network: string | null | undefined,
): hash is string {
  if (
    typeof hash !== "string"
    || !currency
    || !network
    || transactionKind(hash) !== "crypto"
    || !isSupportedCryptoRail(currency, network)
  ) {
    return false;
  }
  const cleanHash = hash.trim();
  return isValidTxHash(cleanHash) && isHashFormatForNetwork(cleanHash, currency, network);
}

function hasAuthoritativePaymentEvidence(order: RefundEligibilityOrder): boolean {
  const hashes = [
    order.paymentTxHash,
    ...(Array.isArray(order.paymentTxHashes) ? order.paymentTxHashes : []),
  ];
  return hashes.some(hash => isAuthoritativeTransactionHash(
    hash,
    order.paymentCryptoCurrency,
    order.paymentCryptoNetwork,
  ));
}

/**
 * Pure, server-owned eligibility check. Request-body amounts, screenshots, and
 * test payment fields are intentionally absent from this contract.
 */
export function evaluateRefundEligibility(input: RefundEligibilityInput): RefundEligibility {
  const { order } = input;

  if (
    !order
    || !order.groupBuyId
    || ["wholesale", "wholesale_shared"].includes(order.orderType ?? "")
    || !input.groupBuy
    || input.groupBuy.id !== order.groupBuyId
  ) {
    return ineligible("not_group_buy_order");
  }
  if (!input.groupBuy.cryptoRefundsEnabled) {
    return ineligible("refunds_disabled");
  }
  if (normalizeTg(input.accountId) !== normalizeTg(order.telegramUsername)) {
    return ineligible("not_owner");
  }
  if (order.deletedAt != null) {
    return ineligible("deleted_order");
  }
  if (
    order.paymentStatus !== "confirmed"
    || order.paymentConfirmedAt == null
    || !hasAuthoritativePaymentEvidence(order)
  ) {
    return ineligible("ineligible_payment_evidence");
  }
  if (order.status === "Cancelled") {
    return ineligible("already_cancelled");
  }
  if (order.refundStatus === "refunded") {
    return ineligible("already_refunded");
  }
  if (
    input.activeRefund
    && ["requested", "verifying", "verification_failed"].includes(input.activeRefund.status)
  ) {
    return ineligible("active_refund_exists");
  }

  let totalCents: bigint;
  try {
    totalCents = usdToCents(String(order.grandTotal));
  } catch {
    return ineligible("non_positive_total");
  }
  if (totalCents <= 0n) {
    return ineligible("non_positive_total");
  }

  return {
    eligible: true,
    reasonCode: null,
    amountUsd: centsToUsdString(totalCents),
  };
}
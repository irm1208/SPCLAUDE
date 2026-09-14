import { normalizeTg } from "./normalize";
import { centsToUsdString, usdToCents } from "./refund-money";

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
  paymentUsdAmount?: string | number | null;
  grandTotal: string | number | null | undefined;
  paymentScreenshot?: string | null;
};

/** Proof constructed by the server payment verifier, never by a request body. */
export type ServerPaymentEvidenceProof = {
  readonly verified: true;
  readonly source: "server-payment-verifier";
  readonly txHash: string;
  readonly currency: string;
  readonly network: string;
  /** Recipient observed by the successful server verifier. */
  readonly recipientWallet: string;
  /** Exact server-side amount supplied to the verifier. */
  readonly expectedAmountUsd: string;
  /** Amount observed by the successful verifier, retained for auditability. */
  readonly verifiedAmountUsd: string;
};

export type RefundEligibilityInput = {
  accountId: string;
  order: RefundEligibilityOrder | null | undefined;
  groupBuy: { id: string; cryptoRefundsEnabled: boolean } | null | undefined;
  activeRefund: { id: string; status: string } | null | undefined;
};

export type RefundRequestAvailabilityInput = RefundEligibilityInput;

function ineligible(reasonCode: RefundEligibilityCode): RefundEligibility {
  return { eligible: false, reasonCode, amountUsd: null };
}

function normalizePaymentNetwork(network: string): string {
  return network.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

export function isSupportedRefundPaymentRail(currency: string, network: string): boolean {
  const rails: Record<string, ReadonlySet<string>> = {
    USDT: new Set(["ERC20", "ERC20ETHEREUM", "ETHEREUM", "ETHEREUMMAINNET", "TRC20", "TRC20TRON", "ARBITRUMONE", "BEP20", "BEP20BSC", "SOL", "SOLSOLANA", "SOLANA", "POLYGON"]),
    USDC: new Set(["ERC20", "ERC20ETHEREUM", "ETHEREUM", "ETHEREUMMAINNET", "ARBITRUMONE", "SOL", "SOLSOLANA", "SOLANA", "BEP20", "BEP20BSC", "POLYGON"]),
    ETH: new Set(["ETHEREUM", "ETHEREUMMAINNET", "ERC20", "ERC20ETHEREUM"]),
    BTC: new Set(["BITCOIN", "BITCOINMAINNET"]),
  };
  return rails[currency.toUpperCase().trim()]?.has(normalizePaymentNetwork(network)) ?? false;
}

/**
 * Pure, server-owned eligibility check. Request-body amounts, screenshots,
 * transaction references, verifier proof, and test payment fields are
 * intentionally absent from this decision.
 */
function evaluateRefundEligibilityCore(input: RefundRequestAvailabilityInput): RefundEligibility {
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

/**
 * Pure server-side eligibility decision. Confirmed payment state is sufficient
 * regardless of transaction-reference fields or verifier proof.
 */
export function evaluateRefundEligibility(input: RefundEligibilityInput): RefundEligibility {
  return evaluateRefundEligibilityCore(input);
}

/**
 * Customer-page visibility check. A confirmed order can show the request form
 * from its server-owned payment state.
 */
export function evaluateRefundRequestAvailability(
  input: RefundRequestAvailabilityInput,
): RefundEligibility {
  return evaluateRefundEligibilityCore(input);
}
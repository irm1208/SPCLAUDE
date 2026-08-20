export const PAYMENT_AUDIT_SCOPES = ["all", "group_buy", "wholesale", "shared_order"] as const;
export type PaymentAuditScope = typeof PAYMENT_AUDIT_SCOPES[number];

export const PAYMENT_AUDIT_STATUSES = ["verified", "underpaid", "wrong_wallet", "review", "not_chain"] as const;
export type PaymentAuditStatus = typeof PAYMENT_AUDIT_STATUSES[number];

export type WalletHistoryCandidate = {
  scope: string;
  network: string;
  address: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export function paymentAuditScopeForOrder(order: {
  groupBuyId: string | null;
  orderType: string | null;
}): PaymentAuditScope {
  if (order.orderType === "wholesale_shared") return "shared_order";
  if (order.orderType === "wholesale") return "wholesale";
  if (order.groupBuyId) return "group_buy";
  return "all";
}

export function normaliseAuditNetwork(network: string | null | undefined): string {
  return (network ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normaliseWalletAddress(address: string | null | undefined): string {
  const value = (address ?? "").trim();
  return /^0x[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : value;
}

export function walletHistoryForPayment(
  entries: WalletHistoryCandidate[],
  scope: PaymentAuditScope,
  network: string,
  paymentDate: Date,
): WalletHistoryCandidate[] {
  const normalisedNetwork = normaliseAuditNetwork(network);
  return entries.filter(entry => {
    const scopeMatches = entry.scope === "all" || entry.scope === scope;
    const networkMatches = normaliseAuditNetwork(entry.network) === normalisedNetwork;
    const started = entry.effectiveFrom.getTime() <= paymentDate.getTime();
    const notExpired = !entry.effectiveUntil || entry.effectiveUntil.getTime() >= paymentDate.getTime();
    return scopeMatches && networkMatches && started && notExpired;
  }).sort((left, right) => {
    const scopeRank = (entry: WalletHistoryCandidate) => entry.scope === scope ? 0 : 1;
    const scopeDiff = scopeRank(left) - scopeRank(right);
    if (scopeDiff !== 0) return scopeDiff;
    return right.effectiveFrom.getTime() - left.effectiveFrom.getTime()
      || normaliseWalletAddress(left.address).localeCompare(normaliseWalletAddress(right.address));
  });
}

export function hasExpectedAuditAmount(receivedAmount: number, expectedAmount: number): boolean {
  if (!Number.isFinite(receivedAmount) || !Number.isFinite(expectedAmount) || expectedAmount <= 0) return false;
  const underpaymentTolerance = Math.max(expectedAmount * 0.01, 0.02);
  return receivedAmount >= expectedAmount - underpaymentTolerance && receivedAmount <= expectedAmount * 1.02;
}

export function transactionKind(txHash: string): "crypto" | "fiat" | "anonpay" {
  const value = txHash.trim().toLowerCase();
  if (value.startsWith("fiat:")) return "fiat";
  if (value.startsWith("anonpay:")) return "anonpay";
  return "crypto";
}
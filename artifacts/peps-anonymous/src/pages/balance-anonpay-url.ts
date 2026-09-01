const ANONPAY_PREFIX = "anonpay:";

export function buildBalanceAnonPayUrl(paymentId: string): string | null {
  const cleanId = paymentId.split("|", 1)[0]?.trim();
  if (!cleanId) return null;
  return `https://trocador.app/en/anonpay/${encodeURIComponent(cleanId)}`;
}

export function getBalanceAnonPayUrl(
  txHash: string | null | undefined,
  status: string | null | undefined,
): string | null {
  if (status !== "pending_confirmation" || !txHash?.startsWith(ANONPAY_PREFIX)) return null;
  return buildBalanceAnonPayUrl(txHash.slice(ANONPAY_PREFIX.length));
}
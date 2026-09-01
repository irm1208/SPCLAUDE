export function shouldRefreshPrimaryPaymentLock(
  paymentStatus: string,
  lockedUsd: number | null,
  currentUsd: number,
): boolean {
  if (paymentStatus === "confirmed") return false;
  if (lockedUsd == null) return true;
  return Math.abs(lockedUsd - currentUsd) > currentUsd * 0.03;
}
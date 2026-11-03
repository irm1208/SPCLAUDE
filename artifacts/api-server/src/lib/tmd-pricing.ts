/** Pure pricing maths for Testmedaddy pools. Kept free of IO so it is unit-testable. */

export type PricedItem = { priceUsd: number | string; quantity: number };
export type PoolCosts = { shippingUsd: number | string; organiserTipUsd: number | string; platformFeePct: number | string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: number | string | null | undefined) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };

export function poolBreakdown(items: PricedItem[], costs: PoolCosts) {
  const tests = r2(items.reduce((sum, i) => sum + num(i.priceUsd) * Math.max(1, Math.floor(i.quantity || 1)), 0));
  const shipping = r2(num(costs.shippingUsd));
  const tip = r2(num(costs.organiserTipUsd));
  const subtotal = r2(tests + shipping + tip);
  const feePct = Math.min(100, Math.max(0, num(costs.platformFeePct)));
  const fee = r2(subtotal * feePct / 100);
  return { tests, shipping, tip, subtotal, feePct, fee, target: r2(subtotal + fee) };
}

/**
 * What one member pays. "fixed" charges the organiser's chosen share; "even" divides the
 * target by the expected number of members (minMembers) so the share never changes
 * after someone has paid. Always at least $1 so the on-chain verifier has a real amount.
 */
export function memberShare(pool: { splitMode: string; fixedShareUsd: number | string | null; targetUsd: number | string; minMembers: number }): number {
  if (pool.splitMode === "fixed" && num(pool.fixedShareUsd) > 0) return r2(num(pool.fixedShareUsd));
  const divisor = Math.max(1, pool.minMembers || 1);
  return Math.max(1, r2(num(pool.targetUsd) / divisor));
}

export function fundingProgress(targetUsd: number | string, verifiedUsd: number | string) {
  const target = num(targetUsd), verified = num(verifiedUsd);
  const pct = target > 0 ? Math.min(100, Math.round((verified / target) * 100)) : 0;
  return { target: r2(target), verified: r2(verified), remaining: r2(Math.max(0, target - verified)), pct, funded: target > 0 && verified >= target };
}

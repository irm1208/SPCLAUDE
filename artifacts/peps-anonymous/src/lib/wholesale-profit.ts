/** Per-kit gross product profit only; shipping, fees and discounts are excluded. */
export function wholesaleProfit(cost: string, sell: string): { profit: number; margin: number | null } | null {
  if (!cost.trim() || !sell.trim()) return null;
  const c = Number(cost), s = Number(sell);
  if (!Number.isFinite(c) || !Number.isFinite(s) || c < 0 || s < 0) return null;
  const profit = Math.round((s - c) * 100) / 100;
  return { profit, margin: s === 0 ? null : profit / s * 100 };
}

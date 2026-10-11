import { CURRENCY_SYMBOLS } from "./currency";

// Match the group-buy schema default, not the site's generic dollar fallback.
export function groupCouponCurrency(currency?: string | null): string {
  return currency?.trim().toUpperCase() || "GBP";
}

export function formatGroupCouponAmount(amount: number, currency?: string | null): string {
  const code = groupCouponCurrency(currency);
  return `${CURRENCY_SYMBOLS[code] ?? ""}${amount.toFixed(2)} ${code}`;
}

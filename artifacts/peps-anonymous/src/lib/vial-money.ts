/** Product currency, not the site's general GBP display preference. */
export function formatVialMoney(amount: number, currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  const value = amount.toFixed(2);
  if (!code) return `${value} (currency not recorded)`;
  const symbol = ({ GBP: "£", EUR: "€", USD: "$" } as Record<string, string>)[code];
  return symbol ? `${symbol}${value}` : `${value} ${code}`;
}

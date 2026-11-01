/** Preserve checkout currency while displaying grouped, two-decimal amounts. */
export function formatOrderPrice(amount: number, currency?: string | null): string {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$" };
  const symbol = (currency && symbols[currency]) || "$";
  return `${symbol}${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

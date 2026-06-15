export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$",
};

export function currSym(currency?: string | null): string {
  return (currency && CURRENCY_SYMBOLS[currency]) ? CURRENCY_SYMBOLS[currency] : "$";
}

export function fmtC(n: number, currency?: string | null): string {
  return `${currSym(currency)}${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

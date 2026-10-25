import { fetchFiatToUsd, isStablecoin } from "./crypto-pricing";

export type VialPriceItem = { currency: string; unitPrice: number; quantity: number };

export function formatVialPrice(amount: number, currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  const symbol = ({ GBP: "£", EUR: "€", USD: "$" } as Record<string, string>)[code ?? ""];
  return symbol ? `${symbol}${amount.toFixed(2)}` : `${amount.toFixed(2)} ${code || "(currency not recorded)"}`;
}

export function vialPricingCurrency(items: VialPriceItem[]): string {
  const currency = items[0]?.currency.trim().toUpperCase();
  if (!currency || items.some(i => i.currency.trim().toUpperCase() !== currency)) {
    throw new Error("All items must use the same currency. Please check out separately.");
  }
  if (items.some(i => !Number.isFinite(i.unitPrice) || i.unitPrice < 0 ||
    !Number.isSafeInteger(i.quantity) || i.quantity < 1)) {
    throw new Error("Invalid product price or quantity");
  }
  return currency;
}

export async function priceVialOrder(
  items: VialPriceItem[],
  discountAmount: number,
  getRate: typeof fetchFiatToUsd = fetchFiatToUsd,
) {
  const currency = vialPricingCurrency(items);
  const subtotal = Number(items.reduce((sum, item) => sum + Number((item.unitPrice * item.quantity).toFixed(2)), 0).toFixed(2));
  if (!Number.isFinite(discountAmount) || discountAmount < 0) throw new Error("Invalid discount");
  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));
  const rate = isStablecoin(currency) ? 1 : await getRate(currency, { strict: true });
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid exchange rate");
  const paymentUsdAmount = Number((total * rate).toFixed(2));
  if (!Number.isFinite(subtotal) || !Number.isFinite(paymentUsdAmount)) throw new Error("Invalid order total");
  return { currency, subtotal, total, paymentUsdAmount };
}

import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";
import { deliveryContactError } from "./eu-delivery-checkout";
import { HalfKitError } from "./half-kit-rules";

type CountryScopedOption = { country?: unknown };
export type KitPrices = { upTo5: number | null; upTo25: number | null };
export type CustomPostageOption = { id: string; label: string; price: number; country?: string | null; source?: string; kitPrices?: KitPrices; requiresAddress?: boolean; requiresQrCode?: boolean; reshipperUsername?: string | null };
export function customPostagePatch(order: { deliveryPrice: unknown; grandTotal: unknown; amountDue: unknown; paymentStatus: string }, target: number) {
  const delta = Math.round((target - Number(order.deliveryPrice)) * 100) / 100;
  if (!delta) return {};
  if (order.paymentStatus !== "unpaid" && delta < 0) throw new HalfKitError("A paid order's delivery charge cannot be reduced automatically. Contact the organiser.");
  if (!["unpaid", "confirmed"].includes(order.paymentStatus)) throw new HalfKitError("Finish the current payment verification before changing delivery bands.");
  return {
    deliveryPrice: target.toFixed(2), grandTotal: (Number(order.grandTotal) + delta).toFixed(2),
    ...(order.paymentStatus === "confirmed" ? {
      amountDue: (Number(order.amountDue) + delta).toFixed(2), balancePaymentStatus: "unpaid",
      balanceCryptoQuote: null, balanceTxHash: null, balanceScreenshot: null, balanceConfirmedAt: null,
    } : { paymentUsdAmount: null }),
  };
}

export function customPostagePrice(option: { price: unknown; kitPrices?: KitPrices }, kits: number): number | null {
  if (!option.kitPrices) return Number(option.price);
  if (!Number.isFinite(kits) || kits <= 0 || kits > 25) return null;
  return kits <= 5 ? option.kitPrices.upTo5 : option.kitPrices.upTo25;
}
export function usesCustomEuPostage(raw: string | null | undefined, country: unknown): boolean {
  try { return (JSON.parse(raw || "[]") as CustomPostageOption[]).some(option => option.source === "eu-postage" && shippingOptionMatchesCountry(option, country)); }
  catch { return false; }
}
export function resolveCustomPostage(options: CustomPostageOption[], id: string, body: Record<string, any>): { id: string; name: string; price: string } | null {
  const option = options.find(option => option.id === id && shippingOptionMatchesCountry(option, body.shippingCountry));
  if (!option) return null;
  const kits = Array.isArray(body.lineItems) ? body.lineItems.reduce((sum: number, item: any) => sum + (item.productId && Number(item.quantity) > 0 ? Number(item.quantity) : 0), 0) : 0;
  const price = customPostagePrice(option, kits);
  if (price === null || !Number.isFinite(price)) return null;
  if (option.source === "eu-postage") {
    const error = deliveryContactError(body);
    if (error) throw new Error(error);
  }
  return { id: option.id, name: option.label, price: String(price) };
}

export function shippingOptionMatchesCountry(option: CountryScopedOption, destinationCountry: unknown): boolean {
  if (option.country == null || option.country === "") return true;
  if (typeof option.country !== "string" || typeof destinationCountry !== "string" || !destinationCountry.trim()) return false;
  const target = normalizeToCode(option.country);
  return Boolean(COUNTRY_CODE_TO_NAME[target]) && target === normalizeToCode(destinationCountry);
}

export function validateGroupBuyShippingOptions(options: unknown): string | null {
  if (!Array.isArray(options)) return "shippingOptions must be an array";
  const ids = new Set<string>();
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (typeof option !== "object" || option === null || Array.isArray(option)) {
      return `shippingOptions[${index}] must be an object`;
    }
    const raw = option as Record<string, unknown>;
    if (typeof raw.id !== "string" || !raw.id.trim()) return `shippingOptions[${index}].id must be a non-empty string`;
    if (ids.has(raw.id)) return "Shipping option IDs must be unique";
    ids.add(raw.id);
    if (typeof raw.label !== "string" || !raw.label.trim()) return `shippingOptions[${index}].label must be a non-empty string`;
    const price = typeof raw.price === "number" ? raw.price : Number.parseFloat(String(raw.price));
    if (!Number.isFinite(price) || price < 0) return `shippingOptions[${index}].price must be a non-negative number`;
    if (raw.kitPrices != null) {
      const tiers = raw.kitPrices as KitPrices;
      if (typeof tiers !== "object" || Array.isArray(tiers) || !["upTo5", "upTo25"].every(key => {
        const value = tiers[key as keyof KitPrices];
        return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10000 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7);
      }) || (tiers.upTo5 === null && tiers.upTo25 === null)) return "Enter valid kit-band prices; leave unavailable bands blank";
    }
    if (raw.source === "eu-postage" && (!raw.country || !raw.kitPrices)) return "EU postage requires a country and kit-band prices";
    if (raw.reshipperUsername != null && (typeof raw.reshipperUsername !== "string" || !raw.reshipperUsername.trim() || raw.reshipperUsername.length > 100)) {
      return "Choose a valid postage reshipper.";
    }
    if (raw.country != null && raw.country !== "") {
      if (typeof raw.country !== "string" || !COUNTRY_CODE_TO_NAME[normalizeToCode(raw.country)]) {
        return `shippingOptions[${index}].country must be a supported country`;
      }
    }
  }
  return null;
}

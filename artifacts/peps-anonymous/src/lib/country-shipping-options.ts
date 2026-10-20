import { COUNTRY_LIST } from "@/data/countries";

export type CountryScopedShippingOption = {
  id: string;
  country?: string | null;
  [key: string]: unknown;
};
export type KitPrices = { upTo5: number | null; upTo25: number | null };
export type CustomPostageOption = { id: string; label: string; price: number; country?: string | null; source?: string; kitPrices?: KitPrices; requiresAddress?: boolean; requiresQrCode?: boolean; reshipperUsername?: string | null };

export function customPostagePrice(option: { price: number; kitPrices?: KitPrices }, kits: number): number | null {
  if (!option.kitPrices) return option.price;
  if (!Number.isFinite(kits) || kits <= 0 || kits > 25) return null;
  return kits <= 5 ? option.kitPrices.upTo5 : option.kitPrices.upTo25;
}
export function importEuCustomPostage(existing: CustomPostageOption[], matrix: { currency: string; rates: {country: string; pickupSmall: number | null; pickupLarge: number | null; homeSmall: number | null; homeLarge: number | null}[] }, currency: string): CustomPostageOption[] {
  const fiat = (c: string) => ["USD", "USDT", "USDC"].includes(c.toUpperCase()) ? "USD" : c.toUpperCase();
  if (fiat(matrix.currency) !== fiat(currency)) throw new Error(`Rate currency ${matrix.currency} must match the group-buy currency ${currency}. No currency conversion has been applied.`);
  const imported: CustomPostageOption[] = [];
  for (const row of matrix.rates) {
    if (!isEuOnwardDestination(row.country)) continue;
    const name = COUNTRY_LIST.find(country => country.code === row.country)?.name ?? row.country;
    for (const method of ["pickup", "home"] as const) {
      const small = method === "pickup" ? row.pickupSmall : row.homeSmall;
      const large = method === "pickup" ? row.pickupLarge : row.homeLarge;
      if (small === null && large === null) continue;
      imported.push({ id: `eu-postage-${row.country}-${method}`, label: `${name} — ${method === "pickup" ? "Pickup point" : "Home delivery"}`,
        country: row.country, price: small ?? large!, source: "eu-postage", kitPrices: { upTo5: small, upTo25: large },
        requiresAddress: true, requiresQrCode: false });
    }
  }
  if (!imported.length) throw new Error("No EU postage prices are available to import.");
  // Only replace previously imported countries; never change unrelated custom couriers.
  const countries = new Set(imported.map(option => option.country));
  return [...existing.filter(option => !(option.source === "eu-postage" && countries.has(option.country))), ...imported];
}

export function normalizeShippingCountry(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "UK") return "GB";
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return COUNTRY_LIST.find(country => country.name.toLowerCase() === value.toLowerCase())?.code ?? null;
}

const EU_ONWARD_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export function isEuOnwardDestination(raw: string | null | undefined): boolean {
  const countryCode = normalizeShippingCountry(raw);
  return countryCode !== null && EU_ONWARD_COUNTRY_CODES.has(countryCode);
}

export function resolveShippingDestinationCountry(
  shippingCountry: string | null | undefined,
  accountCountry: string | null | undefined,
  countryLegCode: string | null | undefined,
): string | null {
  return [shippingCountry, accountCountry, countryLegCode]
    .find(country => typeof country === "string" && country.trim().length > 0)
    ?.trim() ?? null;
}

export function filterShippingOptionsForCountry<T extends CountryScopedShippingOption>(
  options: T[],
  destinationCountry: string | null | undefined,
): T[] {
  const destination = normalizeShippingCountry(destinationCountry);
  return options.filter(option => {
    if (option.country == null || option.country === "") return true;
    const target = normalizeShippingCountry(option.country);
    return destination !== null && target === destination;
  });
}

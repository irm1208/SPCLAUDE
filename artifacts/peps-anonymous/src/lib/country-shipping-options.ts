import { COUNTRY_LIST } from "@/data/countries";

export type CountryScopedShippingOption = {
  id: string;
  country?: string | null;
  [key: string]: unknown;
};

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

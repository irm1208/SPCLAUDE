import { COUNTRIES } from "@/data/countries";
import { normalizeShippingCountry } from "./country-shipping-options";

export type GroupBuyCountryRestrictions = {
  allowedCountries?: string[] | null;
  excludedCountries?: string[] | null;
};

/** Empty allowlist means unrestricted; exclusions always win. */
export function groupBuyCountryOptions(restrictions: GroupBuyCountryRestrictions | null) {
  const key = (country: string) => normalizeShippingCountry(country) ?? country.trim().toUpperCase();
  const allowed = restrictions?.allowedCountries;
  const allowedCodes = new Set(allowed?.map(key));
  const excludedCodes = new Set(restrictions?.excludedCountries?.map(key));
  return COUNTRIES.filter(country =>
    (!allowed?.length || allowedCodes.has(key(country))) && !excludedCodes.has(key(country)));
}

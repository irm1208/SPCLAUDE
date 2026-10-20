import { COUNTRY_LIST } from "../data/countries";
import { isEuOnwardDestination, normalizeShippingCountry, type CountryScopedShippingOption } from "./country-shipping-options";

/** Multi-country coverage overrides the legacy single-country assignment. */
export function reshipperShippingCountries(assignments: { country?: string | null; countries?: string[] | null }[]): string[] {
  const countries = new Set<string>();
  for (const assignment of assignments) {
    for (const value of assignment.countries?.length ? assignment.countries : [assignment.country]) {
      if (!value) continue;
      if (["EU", "EUROPEAN UNION"].includes(value.trim().toUpperCase())) {
        for (const country of COUNTRY_LIST) if (isEuOnwardDestination(country.code)) countries.add(country.code);
      } else {
        const code = normalizeShippingCountry(value);
        if (code && COUNTRY_LIST.some(country => country.code === code)) countries.add(code);
      }
    }
  }
  return [...countries];
}

/** Keep source indexes so editing a filtered row never changes another country's option. */
export function visibleReshipperShippingOptions<T extends CountryScopedShippingOption>(options: T[], countries: string[]) {
  const assigned = new Set(countries.map(normalizeShippingCountry).filter(Boolean));
  return options.map((option, index) => ({
    option, index,
    editable: Boolean(option.country && assigned.has(normalizeShippingCountry(option.country))),
  })).filter(({ option }) =>
    !option.country || assigned.has(normalizeShippingCountry(option.country)));
}

import { COUNTRY_CODE_TO_NAME, normalizeToCode } from "./country-utils";

type CountryScopedOption = { country?: unknown };

export function shippingOptionMatchesCountry(option: CountryScopedOption, destinationCountry: unknown): boolean {
  if (option.country == null || option.country === "") return true;
  if (typeof option.country !== "string" || typeof destinationCountry !== "string" || !destinationCountry.trim()) return false;
  const target = normalizeToCode(option.country);
  return Boolean(COUNTRY_CODE_TO_NAME[target]) && target === normalizeToCode(destinationCountry);
}

export function validateGroupBuyShippingOptions(options: unknown): string | null {
  if (!Array.isArray(options)) return "shippingOptions must be an array";
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (typeof option !== "object" || option === null || Array.isArray(option)) {
      return `shippingOptions[${index}] must be an object`;
    }
    const raw = option as Record<string, unknown>;
    if (typeof raw.id !== "string" || !raw.id.trim()) return `shippingOptions[${index}].id must be a non-empty string`;
    if (typeof raw.label !== "string" || !raw.label.trim()) return `shippingOptions[${index}].label must be a non-empty string`;
    const price = typeof raw.price === "number" ? raw.price : Number.parseFloat(String(raw.price));
    if (!Number.isFinite(price) || price < 0) return `shippingOptions[${index}].price must be a non-negative number`;
    if (raw.country != null && raw.country !== "") {
      if (typeof raw.country !== "string" || !COUNTRY_CODE_TO_NAME[normalizeToCode(raw.country)]) {
        return `shippingOptions[${index}].country must be a supported country`;
      }
    }
  }
  return null;
}

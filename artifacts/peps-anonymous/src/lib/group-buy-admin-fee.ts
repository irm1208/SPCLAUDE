import { COUNTRY_LIST } from "../data/countries.ts";

type CountryOverride = {
  country: string;
  amount: number;
  enabled: boolean;
};

export type ReviewAdminFeeInput = {
  enabled: boolean | null | undefined;
  feeType: string | null | undefined;
  baseAmount: unknown;
  label: string | null | undefined;
  countryOverrides: unknown;
  shippingCountry: string | null | undefined;
  productSubtotal: number;
};

function normalizeCountry(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === "UK") return "GB";
  return COUNTRY_LIST.find(country => country.code.toUpperCase() === trimmed.toUpperCase())?.code.toUpperCase()
    ?? COUNTRY_LIST.find(country => country.name.toLowerCase() === trimmed.toLowerCase())?.code.toUpperCase()
    ?? trimmed.toUpperCase();
}

export function resolveReviewAdminFee(input: ReviewAdminFeeInput): { amount: number; label: string | null } {
  if (!input.enabled) return { amount: 0, label: null };

  const overrides = Array.isArray(input.countryOverrides)
    ? input.countryOverrides.filter((entry): entry is CountryOverride => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Record<string, unknown>;
        return typeof candidate["country"] === "string"
          && candidate["enabled"] === true
          && Number.isFinite(Number(candidate["amount"]))
          && Number(candidate["amount"]) >= 0;
      })
    : [];
  const shippingCountry = input.shippingCountry?.trim();
  const matchingOverride = shippingCountry
    ? overrides.find(entry => normalizeCountry(entry.country) === normalizeCountry(shippingCountry))
    : undefined;
  const configuredAmount = matchingOverride
    ? Number(matchingOverride.amount)
    : Math.max(0, Number(input.baseAmount) || 0);
  const amount = input.feeType === "percent"
    ? Number(((Math.max(0, input.productSubtotal) * configuredAmount) / 100).toFixed(2))
    : Number(configuredAmount.toFixed(2));
  return { amount, label: amount > 0 ? (input.label ?? null) : null };
}
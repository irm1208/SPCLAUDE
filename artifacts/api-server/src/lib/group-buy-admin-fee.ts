import { normalizeToCode } from "./country-utils";

export type GroupBuyAdminFeeCountryOverride = {
  country: string;
  amount: number;
  enabled: boolean;
};

export type GroupBuyAdminFeeInput = {
  enabled: boolean | null | undefined;
  feeType: string | null | undefined;
  baseAmount: unknown;
  label: string | null | undefined;
  countryOverrides: unknown;
  shippingCountry: string | null | undefined;
  productSubtotal: number;
};

export type ResolvedGroupBuyAdminFee = {
  amount: number;
  label: string | null;
};

export function parseGroupBuyAdminFeeCountries(value: unknown): GroupBuyAdminFeeCountryOverride[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is GroupBuyAdminFeeCountryOverride => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Record<string, unknown>;
    const amount = Number(candidate["amount"]);
    return typeof candidate["country"] === "string"
      && candidate["enabled"] === true
      && Number.isFinite(amount)
      && amount >= 0;
  }).map(entry => ({ ...entry, amount: Number(entry.amount) }));
}

export function resolveGroupBuyAdminFee(input: GroupBuyAdminFeeInput): ResolvedGroupBuyAdminFee {
  if (!input.enabled) return { amount: 0, label: null };

  const shippingCountry = input.shippingCountry?.trim();
  const matchingOverride = shippingCountry
    ? parseGroupBuyAdminFeeCountries(input.countryOverrides).find(
        entry => normalizeToCode(entry.country) === normalizeToCode(shippingCountry),
      )
    : undefined;
  const configuredAmount = matchingOverride?.amount ?? Math.max(0, Number(input.baseAmount) || 0);
  const amount = input.feeType === "percent"
    ? Number(((Math.max(0, input.productSubtotal) * configuredAmount) / 100).toFixed(2))
    : Number(configuredAmount.toFixed(2));
  return {
    amount,
    label: amount > 0 ? (input.label ?? null) : null,
  };
}
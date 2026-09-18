import { safeMoneyToCents, safeSubtractMoneyClamped } from "./exact-money";

export type CreditPaymentStatus = "partial" | "full";

function roundedCents(value: number | string | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  const thirdDecimal = fraction[2];
  return cents + (thirdDecimal !== undefined && thirdDecimal >= "5" ? 1n : 0n);
}

export function getCreditPaymentStatus(
  creditsApplied: number | string | null | undefined,
  grandTotal: number | string | null | undefined,
): CreditPaymentStatus | null {
  const creditCents = roundedCents(creditsApplied) ?? safeMoneyToCents(creditsApplied ?? "");
  const totalCents = roundedCents(grandTotal) ?? safeMoneyToCents(grandTotal ?? "");
  if (creditCents === null || totalCents === null || creditCents <= 0n) return null;
  return creditCents < totalCents ? "partial" : "full";
}

export function getCreditAdjustedTotal(
  grandTotal: number | string | null | undefined,
  creditsApplied: number | string | null | undefined,
): number {
  return safeSubtractMoneyClamped(grandTotal ?? 0, creditsApplied ?? 0);
}
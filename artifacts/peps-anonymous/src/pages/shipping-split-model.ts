export function normalizeShippingAmount(value: number | string | null | undefined): number {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateShippingDifference(
  current: number | string | null | undefined,
  proposed: number | string | null | undefined,
): number {
  return roundCurrency(normalizeShippingAmount(proposed) - normalizeShippingAmount(current));
}

export function calculateShippingShortfall(target: number, assigned: number): number {
  return roundCurrency(target - assigned);
}
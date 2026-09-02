export function normalizeShippingAmount(value: number | string | null | undefined): number {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}
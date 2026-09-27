export const MAX_POOL_TEST_PRICE_USD = 99_999_999.99;

export function parseStrictPoolMoney(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount <= MAX_POOL_TEST_PRICE_USD ? amount : null;
}

export function parsePoolTestPriceUsd(value: unknown): number | null {
  return parseStrictPoolMoney(value);
}

export function computeTestingPoolTarget(
  tests: Array<{ unitPriceUsd: string | number }>,
  quantity: number,
  costs: { vialCostUsd: number; shippingCostUsd: number; organiserTipUsd: number },
): number {
  const testTotal = tests.reduce((sum, test) => sum + Number(test.unitPriceUsd || 0), 0);
  return Number((
    testTotal +
    Math.max(0, quantity - 1) * 60 +
    costs.vialCostUsd +
    costs.shippingCostUsd +
    costs.organiserTipUsd
  ).toFixed(2));
}
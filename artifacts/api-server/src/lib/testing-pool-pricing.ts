export const MAX_POOL_TEST_PRICE_USD = 99_999_999.99;
export const DEFAULT_EXTRA_VIAL_PRICE_USD = 60;
export const DEFAULT_MAX_VIAL_COUNT = 4;
export const MAX_POOL_VIAL_COUNT = 20;

export function fitsTestingPoolTarget(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_POOL_TEST_PRICE_USD;
}

export function parsePoolVialCount(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count <= MAX_POOL_VIAL_COUNT ? count : null;
}

export function validatePoolVialQuantities(tests: Array<{ quantity?: unknown }>, maxVialCount: number): number | null {
  let quantity: number | null = null;
  for (const test of tests) {
    const count = parsePoolVialCount(test.quantity ?? 1);
    if (count == null || count > maxVialCount || (quantity !== null && count !== quantity)) return null;
    quantity = count;
  }
  return quantity ?? 1;
}

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
  costs: { vialCostUsd: number; shippingCostUsd: number; organiserTipUsd: number; extraVialPriceUsd?: number },
): number {
  const testTotal = tests.reduce((sum, test) => sum + Number(test.unitPriceUsd || 0), 0);
  return Number((
    testTotal +
    Math.max(0, quantity - 1) * (costs.extraVialPriceUsd ?? DEFAULT_EXTRA_VIAL_PRICE_USD) +
    costs.vialCostUsd +
    costs.shippingCostUsd +
    costs.organiserTipUsd
  ).toFixed(2));
}
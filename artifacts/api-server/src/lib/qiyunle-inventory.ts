export function filterNonPositiveStockItems<T extends { nums: string }>(items: T[]): T[] {
  return items.filter((item) => {
    const stock = Number.parseInt(item.nums, 10);
    return Number.isNaN(stock) || stock > 0;
  });
}

export function findUnavailableMappedCodes(
  mappedCodes: Iterable<string>,
  currentPositiveCodes: Iterable<string>,
): string[] {
  const current = new Set(currentPositiveCodes);
  return [...mappedCodes].filter((code) => !current.has(code)).sort();
}

interface QiyunleBatchMapping {
  qiyunleCode: string;
  productId: string;
}

function batchBaseCode(code: string): string {
  return code.trim().replace(/-\d{4}(?:\d{2})?$/, "").toUpperCase();
}

export function findUniqueBatchProductId(
  code: string,
  mappings: QiyunleBatchMapping[],
): string | null {
  const base = batchBaseCode(code);
  const productIds = new Set(
    mappings
      .filter((mapping) => batchBaseCode(mapping.qiyunleCode) === base)
      .map((mapping) => mapping.productId),
  );

  return productIds.size === 1 ? [...productIds][0] : null;
}
export function filterNonPositiveStockItems<T extends { nums: string }>(items: T[]): T[] {
  return items.filter((item) => {
    const stock = Number.parseInt(item.nums, 10);
    return Number.isNaN(stock) || stock > 0;
  });
}
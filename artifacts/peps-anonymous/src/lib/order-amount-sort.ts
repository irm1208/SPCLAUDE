/** Compare displayed order totals numerically; missing/invalid totals stay last. */
export function compareOrderAmounts(left: unknown, right: unknown, direction: "asc" | "desc"): number {
  const amount = (value: unknown) =>
    typeof value === "number" || (typeof value === "string" && value.trim() !== "")
      ? Number(value) : NaN;
  const a = amount(left);
  const b = amount(right);
  if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0;
  if (!Number.isFinite(b)) return -1;
  return direction === "asc" ? a - b : b - a;
}

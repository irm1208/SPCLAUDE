export type OrderPanelQuantityRules = {
  allowHalfKits: boolean;
  maxQuantity?: number;
  increaseDisabled?: boolean;
};

/** Validate typed quantities too; HTML min/max alone do not enforce order limits. */
export function clampOrderPanelQuantity(requested: number, current: number, rules: OrderPanelQuantityRules): number | null {
  if (!Number.isFinite(requested) || requested <= 0) return null;
  const step = rules.allowHalfKits ? 0.5 : 1;
  const max = Math.min(rules.maxQuantity ?? Infinity, rules.increaseDisabled ? current : Infinity);
  if (max < step) return null;
  const bounded = Math.min(max, Math.max(step, requested));
  return Math.floor(bounded / step + 1e-9) * step;
}

/**
 * Explicit group-specific shipping policy, keyed by the immutable group ID.
 * HGH 36IU includes direct-to-home postage; a missing vendor elsewhere still
 * means an unquoted charge, not free shipping.
 */
export function hasFreeDirectHomeShipping(groupBuyId: unknown): boolean {
  return groupBuyId === "UAJBM";
}

export function resolveDirectHomeShippingCost(groupBuyId: unknown, quotedCost: number): number {
  return hasFreeDirectHomeShipping(groupBuyId) ? 0 : quotedCost;
}

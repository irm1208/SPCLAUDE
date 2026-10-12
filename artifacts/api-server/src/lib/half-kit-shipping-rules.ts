export interface HalfKitShippingSnapshot { vendor: number; delivery: number }

/** Preserve immutable offer charges; only replace the ordinary base shipping. */
export function preserveHalfKitShipping(
  order: { grandTotal: unknown; vendorShipping?: unknown; deliveryPrice?: unknown; adminFee?: unknown },
  snapshot: HalfKitShippingSnapshot | undefined,
  base: { vendor?: number; delivery?: number },
) {
  if (!snapshot) return null;
  const vendorShipping = base.vendor === undefined ? Number(order.vendorShipping ?? 0) : base.vendor + snapshot.vendor;
  const deliveryPrice = base.delivery === undefined ? Number(order.deliveryPrice ?? 0) : base.delivery + snapshot.delivery;
  return {
    vendorShipping: Number(vendorShipping.toFixed(2)),
    deliveryPrice: Number(deliveryPrice.toFixed(2)),
    grandTotal: Number((Number(order.grandTotal) + vendorShipping - Number(order.vendorShipping ?? 0)
      + deliveryPrice - Number(order.deliveryPrice ?? 0)).toFixed(2)),
    adminFee: Number(order.adminFee ?? 0),
  };
}

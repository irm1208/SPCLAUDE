type ShippingOrder = {
  id: string; additionOfOrderId: string | null; groupBuyId: string | null; telegramUsername: string;
  shippingName?: string | null; shippingAddress?: string | null; shippingCountry?: string | null;
  shippingCity?: string | null; shippingPostcode?: string | null; reshipperUsername?: string | null;
  countryLegId?: string | null; routingType?: string | null; deliveryMethodId?: string | null;
  directShippingRequested?: boolean; status: string; paymentStatus?: string | null;
  amountDue?: string | number | null; refundStatus?: string | null; balancePaymentStatus?: string | null;
  dispatchConfirmedAt?: Date | null; deletedAt?: Date | null; orderType?: string | null;
};
export type ShippingLine = { productName: string; quantity: number };
export type ShippingParcel = { id: string; items: Array<{ name: string; qty: number; dispatchedQty?: number; [key: string]: unknown }> };
export const shippingIdentity = (value?: string | null) => (value ?? "").trim().replace(/^@/, "").toLowerCase();
const text = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function combinedShippingReason(orders: ShippingOrder[]): string | null {
  const parent = orders.find(order => !order.additionOfOrderId);
  if (!parent || orders.length < 2) return "An original order and at least one active add-on are required.";
  if (!parent.groupBuyId || !parent.shippingName?.trim() || !parent.shippingAddress?.trim() || !parent.shippingCountry?.trim()) {
    return "Complete the original order's delivery name, address and country first.";
  }
  for (const order of orders) {
    if (order.id !== parent.id && order.additionOfOrderId !== parent.id) return "Orders are not linked to this original order.";
    if (order.groupBuyId !== parent.groupBuyId || shippingIdentity(order.telegramUsername) !== shippingIdentity(parent.telegramUsername)
      || ["wholesale", "wholesale_shared"].includes(order.orderType ?? "")) return "Only the same member's linked group-buy orders can ship together.";
    if (["shippingName", "shippingAddress", "shippingCity", "shippingPostcode", "shippingCountry", "countryLegId",
      "routingType", "deliveryMethodId", "directShippingRequested"].some(key => text(order[key as keyof ShippingOrder]) !== text(parent[key as keyof ShippingOrder]))
      || shippingIdentity(order.reshipperUsername) !== shippingIdentity(parent.reshipperUsername)) {
      return "Delivery details or reshipper differ. Staff must review them before combining.";
    }
    if (order.deletedAt || ["Cancelled", "Shipped", "Completed"].includes(order.status) || order.dispatchConfirmedAt) {
      return "An included order is cancelled or already dispatched. Already-shipped parcels cannot be combined.";
    }
    if (!["confirmed", "test_confirmed"].includes(order.paymentStatus ?? "") || !Number.isFinite(Number(order.amountDue ?? 0)) || Number(order.amountDue ?? 0) > 0
      || ["verifying", "pending_confirmation"].includes(order.balancePaymentStatus ?? "")) {
      return "Waiting for every included order and outstanding balance to be paid.";
    }
    if (order.refundStatus && !["none", "rejected", "cancelled", "canceled"].includes(order.refundStatus)) {
      return "An included order has an active refund. Combined dispatch is paused.";
    }
  }
  return null;
}

export function combineShippingLines(lines: ShippingLine[]): ShippingLine[] {
  const combined = new Map<string, ShippingLine>();
  for (const line of lines) {
    if (!line.productName?.trim() || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) {
      throw new Error("An included order has invalid product quantities.");
    }
    const key = text(line.productName), previous = combined.get(key);
    combined.set(key, { productName: previous?.productName ?? line.productName, quantity: (previous?.quantity ?? 0) + Number(line.quantity) });
  }
  return [...combined.values()];
}

/** Plan first on copies, then persist all parcel/order writes in the caller's transaction. */
export function allocateCombinedStock(lines: ShippingLine[], parcels: ShippingParcel[]): ShippingParcel[] {
  if (!lines.length) throw new Error("An included order has no line items.");
  const updated = parcels.map(parcel => ({ ...parcel, items: parcel.items.map(item => ({ ...item })) }));
  for (const line of combineShippingLines(lines)) {
    let needed = line.quantity;
    for (const parcel of updated) for (const item of parcel.items) {
      if (text(item.name) !== text(line.productName)) continue;
      const available = Math.max(0, Number(item.qty) - Number(item.dispatchedQty ?? 0));
      if (!Number.isFinite(available)) throw new Error("Invalid parcel stock.");
      const used = Math.min(available, needed);
      item.dispatchedQty = Number(item.dispatchedQty ?? 0) + used;
      needed -= used;
    }
    if (needed > 0) throw new Error(`Insufficient delivered stock for ${line.productName}. All included orders must be ready.`);
  }
  return updated;
}

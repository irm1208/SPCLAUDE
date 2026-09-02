export function normalizeShippingAmount(value: number | string | null | undefined): number {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateShippingDifference(
  current: number | string | null | undefined,
  proposed: number | string | null | undefined,
): number {
  return roundCurrency(normalizeShippingAmount(proposed) - normalizeShippingAmount(current));
}

export function calculateShippingShortfall(target: number, assigned: number): number {
  return roundCurrency(target - assigned);
}

export type ShippingSplitLineItem = {
  productId?: string | null;
  quantity: number | string;
};

export type ShippingSplitOrder = {
  id: string;
  lineItems?: ShippingSplitLineItem[];
};

function orderQuantity(order: ShippingSplitOrder): number {
  return (order.lineItems ?? []).reduce(
    (sum, item) => sum + Math.max(0, normalizeShippingAmount(item.quantity)),
    0,
  );
}

function allocateNormally(
  total: number,
  equalPct: number,
  orders: ShippingSplitOrder[],
): Record<string, number> {
  if (orders.length === 0) return {};
  const weightedPct = 100 - equalPct;
  const totalCents = Math.round(total * 100);
  const totalQuantity = orders.reduce((sum, order) => sum + orderQuantity(order), 0);
  let assignedCents = 0;

  return Object.fromEntries(orders.map((order, index) => {
    const equalShare = (equalPct / 100) / orders.length;
    const weightedShare = totalQuantity > 0
      ? (weightedPct / 100) * orderQuantity(order) / totalQuantity
      : 0;
    const cents = index === orders.length - 1
      ? totalCents - assignedCents
      : Math.round(totalCents * (equalShare + weightedShare));
    assignedCents += cents;
    return [order.id, cents / 100];
  }));
}

export function allocateShippingSplit(
  total: number,
  equalPct: number,
  orders: ShippingSplitOrder[],
  singleVialProductIds: ReadonlySet<string> = new Set(),
): Record<string, number> {
  const normalAllocation = allocateNormally(total, equalPct, orders);
  if (singleVialProductIds.size === 0) return normalAllocation;

  const vialOrders: ShippingSplitOrder[] = [];
  const regularOrders: ShippingSplitOrder[] = [];

  for (const order of orders) {
    const hasSelectedVial = (order.lineItems ?? []).some(
      item => item.productId && singleVialProductIds.has(item.productId),
    );
    (hasSelectedVial ? vialOrders : regularOrders).push(order);
  }

  if (vialOrders.length === 0) return normalAllocation;

  const adjusted: Record<string, number> = {};
  let vialAssignedCents = 0;

  for (const order of vialOrders) {
    const totalQuantity = orderQuantity(order);
    const vialQuantity = (order.lineItems ?? []).reduce(
      (sum, item) => sum + (
        item.productId && singleVialProductIds.has(item.productId)
          ? Math.max(0, normalizeShippingAmount(item.quantity))
          : 0
      ),
      0,
    );
    const normalQuantity = Math.max(0, totalQuantity - vialQuantity);
    const adjustedRatio = totalQuantity > 0
      ? (normalQuantity + vialQuantity / 10) / totalQuantity
      : 1;
    const cents = Math.round((normalAllocation[order.id] ?? 0) * 100 * adjustedRatio);
    adjusted[order.id] = cents / 100;
    vialAssignedCents += cents;
  }

  const remainingCents = Math.max(0, Math.round(total * 100) - vialAssignedCents);
  const regularAllocation = allocateNormally(remainingCents / 100, equalPct, regularOrders);

  return { ...adjusted, ...regularAllocation };
}
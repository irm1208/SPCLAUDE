export function normalizeShippingAmount(value: number | string | null | undefined): number {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
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
  productName?: string;
  quantity: number | string;
};

export function totalOrderQuantity(
  lineItems: Array<{ quantity: number | string }> | undefined,
): number {
  return lineItems?.reduce(
    (sum, item) => sum + Math.max(0, normalizeShippingAmount(item.quantity)),
    0,
  ) ?? 0;
}

export type ShippingSplitOrder = {
  id: string;
  lineItems?: ShippingSplitLineItem[];
};

export function includedOrderQuantity(
  order: ShippingSplitOrder,
  excludedProductIds: ReadonlySet<string> = new Set(),
): number {
  return (order.lineItems ?? []).reduce(
    (sum, item) => sum + (
      item.productId && excludedProductIds.has(item.productId)
        ? 0
        : Math.max(0, normalizeShippingAmount(item.quantity))
    ),
    0,
  );
}

export type ProductQuantitySummary = {
  productId: string;
  productName: string;
  quantity: number;
};

export function summarizeProductQuantities(
  orders: ShippingSplitOrder[],
  excludedProductIds: ReadonlySet<string> = new Set(),
): ProductQuantitySummary[] {
  const products = new Map<string, ProductQuantitySummary>();

  for (const order of orders) {
    for (const item of order.lineItems ?? []) {
      if (!item.productId || excludedProductIds.has(item.productId)) continue;
      const quantity = Math.max(0, normalizeShippingAmount(item.quantity));
      const current = products.get(item.productId);
      products.set(item.productId, {
        productId: item.productId,
        productName: item.productName || item.productId,
        quantity: (current?.quantity ?? 0) + quantity,
      });
    }
  }

  return [...products.values()].sort((a, b) => a.productName.localeCompare(b.productName));
}

export type ShippingCalculationBreakdown = {
  hasSelectedVialProduct: boolean;
  normalOrderAmount: number;
  totalQuantity: number;
  vialQuantity: number;
  regularProductAmount: number;
  normalVialAmount: number;
  perKitAmount: number;
  perVialAmount: number;
  adjustedVialAmount: number;
  adjustedOrderAmount: number;
};

export function getShippingCalculationBreakdown(
  order: ShippingSplitOrder,
  normalOrderAmount: number,
  singleVialProductIds: ReadonlySet<string>,
  excludedProductIds: ReadonlySet<string> = new Set(),
): ShippingCalculationBreakdown {
  const totalQuantity = includedOrderQuantity(order, excludedProductIds);
  const vialQuantity = (order.lineItems ?? []).reduce(
    (sum, item) => sum + (
      item.productId &&
      !excludedProductIds.has(item.productId) &&
      singleVialProductIds.has(item.productId)
        ? Math.max(0, normalizeShippingAmount(item.quantity))
        : 0
    ),
    0,
  );
  const hasSelectedVialProduct = vialQuantity > 0;

  if (!hasSelectedVialProduct || totalQuantity <= 0) {
    return {
      hasSelectedVialProduct: false,
      normalOrderAmount,
      totalQuantity,
      vialQuantity: 0,
      regularProductAmount: roundTo(normalOrderAmount, 4),
      normalVialAmount: 0,
      perKitAmount: 0,
      perVialAmount: 0,
      adjustedVialAmount: 0,
      adjustedOrderAmount: roundCurrency(normalOrderAmount),
    };
  }

  const normalVialAmount = normalOrderAmount * vialQuantity / totalQuantity;
  const regularProductAmount = normalOrderAmount - normalVialAmount;
  const perKitAmount = normalVialAmount / vialQuantity;
  const perVialAmount = perKitAmount / 10;
  const adjustedVialAmount = perVialAmount * vialQuantity;

  return {
    hasSelectedVialProduct,
    normalOrderAmount,
    totalQuantity,
    vialQuantity,
    regularProductAmount: roundTo(regularProductAmount, 4),
    normalVialAmount: roundTo(normalVialAmount, 4),
    perKitAmount: roundTo(perKitAmount, 4),
    perVialAmount: roundTo(perVialAmount, 4),
    adjustedVialAmount: roundCurrency(adjustedVialAmount),
    adjustedOrderAmount: roundCurrency(regularProductAmount + adjustedVialAmount),
  };
}

function allocateNormally(
  total: number,
  equalPct: number,
  orders: ShippingSplitOrder[],
  excludedProductIds: ReadonlySet<string> = new Set(),
): Record<string, number> {
  if (orders.length === 0) return {};
  const eligibleOrders = orders.filter(order => includedOrderQuantity(order, excludedProductIds) > 0);
  if (eligibleOrders.length === 0) {
    return Object.fromEntries(orders.map(order => [order.id, 0]));
  }
  const weightedPct = 100 - equalPct;
  const totalCents = Math.round(total * 100);
  const totalQuantity = eligibleOrders.reduce(
    (sum, order) => sum + includedOrderQuantity(order, excludedProductIds),
    0,
  );
  let assignedCents = 0;

  const eligibleAllocation = Object.fromEntries(eligibleOrders.map((order, index) => {
    const equalShare = (equalPct / 100) / eligibleOrders.length;
    const weightedShare = totalQuantity > 0
      ? (weightedPct / 100) * includedOrderQuantity(order, excludedProductIds) / totalQuantity
      : 0;
    const cents = index === eligibleOrders.length - 1
      ? totalCents - assignedCents
      : Math.round(totalCents * (equalShare + weightedShare));
    assignedCents += cents;
    return [order.id, cents / 100];
  }));

  return Object.fromEntries(orders.map(order => [order.id, eligibleAllocation[order.id] ?? 0]));
}

export function allocateShippingSplit(
  total: number,
  equalPct: number,
  orders: ShippingSplitOrder[],
  singleVialProductIds: ReadonlySet<string> = new Set(),
  excludedProductIds: ReadonlySet<string> = new Set(),
): Record<string, number> {
  const normalAllocation = allocateNormally(total, equalPct, orders, excludedProductIds);
  if (singleVialProductIds.size === 0) return normalAllocation;

  const vialOrders: ShippingSplitOrder[] = [];
  const regularOrders: ShippingSplitOrder[] = [];

  for (const order of orders) {
    if (includedOrderQuantity(order, excludedProductIds) <= 0) continue;
    const hasSelectedVial = (order.lineItems ?? []).some(
      item => item.productId &&
        !excludedProductIds.has(item.productId) &&
        singleVialProductIds.has(item.productId),
    );
    (hasSelectedVial ? vialOrders : regularOrders).push(order);
  }

  if (vialOrders.length === 0) return normalAllocation;

  const adjusted: Record<string, number> = {};
  let vialAssignedCents = 0;

  for (const order of vialOrders) {
    const breakdown = getShippingCalculationBreakdown(
      order,
      normalAllocation[order.id] ?? 0,
      singleVialProductIds,
      excludedProductIds,
    );
    const cents = Math.round(breakdown.adjustedOrderAmount * 100);
    adjusted[order.id] = breakdown.adjustedOrderAmount;
    vialAssignedCents += cents;
  }

  const remainingCents = Math.max(0, Math.round(total * 100) - vialAssignedCents);
  const regularAllocation = allocateNormally(
    remainingCents / 100,
    equalPct,
    regularOrders,
    excludedProductIds,
  );

  return {
    ...Object.fromEntries(orders.map(order => [order.id, 0])),
    ...adjusted,
    ...regularAllocation,
  };
}
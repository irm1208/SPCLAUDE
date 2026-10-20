import { filterAssignedFulfilmentOrders } from "./reshipper-fulfilment";

export interface ReshipperCollectionOrder {
  reshipperUsername?: string | null;
  status: string;
  paymentStatus: string;
  adminFee: string | number;
  deliveryPrice: string | number;
  amountDue: string | number;
  refundedAt?: string | null;
  deletedAt?: string | null;
  directShippingRequested?: boolean;
  onwardPostageCollected?: { currency: string; amount: number }[];
  onwardPostageError?: string;
}

function cents(value: string | number, label: string): number {
  if (value === null || value === undefined || String(value).trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0)
    throw new Error(`An order has an invalid ${label}. Refresh the dashboard before relying on these totals.`);
  return Math.round(Number(value) * 100);
}

export function reshipperCollections<T extends ReshipperCollectionOrder>(orders: T[], username: string, currency = "USD") {
  let adminFeesCents = 0, postageCents = 0, paidOrderCount = 0;
  const otherPostage = new Map<string, number>();
  for (const order of filterAssignedFulfilmentOrders(orders, username)) {
    if (order.deletedAt || order.refundedAt || order.directShippingRequested || order.status.toLowerCase() === "refunded") continue;
    if (order.onwardPostageError) throw new Error(order.onwardPostageError);
    for (const receipt of order.onwardPostageCollected ?? []) {
      const amount = cents(receipt.amount, "onward postage");
      if (receipt.currency.toUpperCase() === currency.toUpperCase()) postageCents += amount;
      else otherPostage.set(receipt.currency, (otherPostage.get(receipt.currency) ?? 0) + amount);
    }
    if (order.paymentStatus !== "confirmed" || cents(order.amountDue, "balance") > 0) continue;
    adminFeesCents += cents(order.adminFee, "admin fee");
    postageCents += cents(order.deliveryPrice, "member postage");
    paidOrderCount++;
  }
  return { adminFeesCents, postageCents, paidOrderCount,
    otherPostage: [...otherPostage].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cents]) => ({ currency, cents })) };
}

import { createHash } from "node:crypto";
import { resolveGroupBuyAdminFee } from "./group-buy-admin-fee";

export class RevisionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type RevisionItem = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number };
const money = (v: unknown) => Number(v ?? 0);
const cents = (v: unknown) => Math.round(money(v) * 100);
export function revisionEligibility(order: any): string | null {
  if (order.deletedAt || !["Submitted", "Processing"].includes(order.status))
    return "Only active, unshipped orders can be revised.";
  if (order.paymentStatus !== "unpaid" || order.paymentConfirmedAt || order.refundedAt
    || order.paymentTxHash || order.paymentTxHashes?.length || order.testPaymentTxHash || order.paymentScreenshot
    || money(order.paymentTestAmount) > 0 || money(order.amountDue) > 0 || order.balanceTxHash
    || order.balanceScreenshot || (order.balancePaymentStatus && order.balancePaymentStatus !== "unpaid"))
    return "Only unpaid orders without an active or partial payment can be revised.";
  if (order.refundStatus && !["rejected", "cancelled"].includes(order.refundStatus))
    return "An order with a refund request cannot be revised.";
  if (order.orderType && ["wholesale", "wholesale_shared"].includes(order.orderType))
    return "This option is for group-buy orders only.";
  return null;
}
export function revisionItems(lines: any[]): RevisionItem[] {
  return lines.map(l => ({ id: l.id, productId: l.productId, productName: l.productName,
    quantity: money(l.quantity), unitPrice: money(l.unitPrice), lineTotal: money(l.lineTotal) }));
}
/** Only financial/destination/identity facts matter; notes and notification timestamps do not invalidate a proposal. */
export function revisionSnapshot(order: any, lines: any[], group: any): string {
  const fields = ["id", "groupBuyId", "telegramUsername", "status", "orderType", "paymentStatus",
    "productSubtotal", "grandTotal", "adminFee", "adminFeeLabel", "couponCode", "couponDiscount", "creditsApplied",
    "kitFees", "organiserFee", "adminAdjustmentFee", "deliveryPrice", "deliveryMethodId", "vendorShipping",
    "tip", "testingContribution", "directShippingRequested", "directShippingCost", "shippingCountry",
    "shippingAddress", "reshipperUsername", "countryLegId", "additionOfOrderId", "amountDue"];
  const values = fields.map(key => [key, order[key] ?? null]);
  return createHash("sha256").update(JSON.stringify({
    values, lines: [...revisionItems(lines)].sort((a, b) => a.id.localeCompare(b.id)),
    fees: [group.currency, group.adminFeeEnabled, group.adminFeeType, group.adminFeeAmount,
      group.adminFeeCountries, group.adminFeeLabel],
  })).digest("hex");
}
export function planRevision(order: any, lines: any[], changes: unknown, ownedProducts: Set<string>, group: any) {
  if (!Array.isArray(changes) || changes.length !== lines.length || !lines.length)
    throw new RevisionError("Include every original order item exactly once.");
  const seen = new Set<string>();
  const items = changes.map(change => {
    if (!change || typeof change.id !== "string" || seen.has(change.id)) throw new RevisionError("Invalid or duplicate item.");
    seen.add(change.id);
    const old = lines.find(l => l.id === change.id);
    if (!old) throw new RevisionError("An item is not part of this order.");
    const qty = change.quantity, price = change.unitPrice;
    if (typeof qty !== "number" || !Number.isFinite(qty) || qty < 0 || qty > money(old.quantity)
      || !Number.isInteger(qty * 2))
      throw new RevisionError("Quantities may only be reduced in whole or half-kit amounts.");
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 1_000_000
      || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001)
      throw new RevisionError("Enter a non-negative price with at most two decimal places.");
    if ((qty !== money(old.quantity) || cents(price) !== cents(old.unitPrice)) && !ownedProducts.has(old.productId))
      throw new RevisionError("Only products added by this group buy's organiser may be changed.", 403);
    if (old.isOos && qty !== 0) throw new RevisionError("Out-of-stock items cannot be restored through a revision.");
    return { id: old.id, productId: old.productId, productName: old.productName,
      quantity: qty, unitPrice: price, lineTotal: Math.round(qty * cents(price)) / 100 };
  });
  const subtotal = items.reduce((sum, item) => sum + cents(item.lineTotal), 0);
  if (subtotal === 0) throw new RevisionError("At least one item must remain. Use the existing cancellation process for an empty order.");
  if (subtotal < cents(order.couponDiscount)) throw new RevisionError("The revised products cannot be less than the existing discount.");
  let adminFee = cents(order.adminFee);
  if (adminFee > 0 && !order.directShippingRequested && group.adminFeeType === "percent") {
    adminFee = cents(resolveGroupBuyAdminFee({ enabled: group.adminFeeEnabled, feeType: group.adminFeeType,
      baseAmount: group.adminFeeAmount, label: group.adminFeeLabel, countryOverrides: group.adminFeeCountries,
      shippingCountry: order.shippingCountry, productSubtotal: subtotal / 100 }).amount);
  }
  // Keep all previously quoted extras/discounts/credits. No shipping or credit ledger writes.
  const total = cents(order.grandTotal) + subtotal - cents(order.productSubtotal) + adminFee - cents(order.adminFee);
  if (subtotal >= 10_000_000_000 || total >= 10_000_000_000)
    throw new RevisionError("The revised amount is above the supported order limit.");
  if (!Number.isSafeInteger(total) || total <= 0 || total < cents(order.creditsApplied))
    throw new RevisionError("This revision would consume or refund allocated credits. Resolve those separately before requesting changes.");
  return { items, productSubtotal: (subtotal / 100).toFixed(2), adminFee: (adminFee / 100).toFixed(2),
    grandTotal: (total / 100).toFixed(2) };
}

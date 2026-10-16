import { randomUUID } from "node:crypto";
import { eligibleHalfKitOrder, HalfKitError, money } from "./half-kit-rules";

type Line = {
  id: string; productId: string; productName: string;
  quantity: string; unitPrice: string; lineTotal: string;
};
type Product = { productId: string; productName: string; price: unknown; priceOverride: unknown };
const fixed = (value: unknown) => money(value).toFixed(2);

/** Additive customer edits only. Existing line IDs and all half-kit snapshots survive. */
export function planHalfKitOrderEdit(
  order: any, existing: Line[], protectedLineIds: string[], input: any, catalogue: Product[],
) {
  if (!eligibleHalfKitOrder(order)) {
    throw new HalfKitError("This order cannot be edited while a payment is being checked or after dispatch.");
  }
  if (input.deliveryMethodId !== order.deliveryMethodId) {
    throw new HalfKitError("Keep the current delivery option when adding products to an order with reserved half kits.");
  }
  if (money(input.tip) !== money(order.tip) || money(input.testingContribution) !== money(order.testingContribution)
    || (input.directShippingRequested === true) !== (order.directShippingRequested === true)) {
    throw new HalfKitError("Keep the existing charges when adding products to an order with reserved half kits.");
  }
  if (input.couponCode && input.couponCode !== order.couponCode) {
    throw new HalfKitError("A new coupon cannot be applied to an order with reserved half kits.");
  }
  if (!Array.isArray(input.lineItems) || !input.lineItems.length) throw new HalfKitError("Keep the existing order items.", 400);
  const quantities = new Map<string, number>();
  for (const item of input.lineItems) {
    const quantity = Number(item.quantity);
    if (!item.productId || !Number.isFinite(quantity) || quantity < 0.5 || quantity > 1000 || quantity * 2 % 1 !== 0
      || quantities.has(item.productId)) throw new HalfKitError("Invalid or duplicate product quantity.", 400);
    quantities.set(item.productId, quantity);
  }
  const protectedIds = new Set(protectedLineIds);
  if (!protectedLineIds.length || protectedLineIds.some(id => !existing.some(line => line.id === id))) {
    throw new HalfKitError("The reserved half-kit lines have changed. Please ask the organiser to review this order.");
  }
  // Multiple snapshots can refer to the same product. The normal editor cannot
  // safely represent those separately; do not collapse them into one repriced line.
  if (new Set(existing.map(line => line.productId)).size !== existing.length) {
    throw new HalfKitError("This order has separate reserved lines for the same product. Please ask the organiser to review it.");
  }
  let addedSubtotal = 0;
  const lines: Line[] = existing.map(line => {
    const quantity = quantities.get(line.productId);
    if (quantity === undefined || quantity < Number(line.quantity)) {
      throw new HalfKitError("Keep all existing items and reserved half kits. This edit can only add products or quantities.");
    }
    if (protectedIds.has(line.id) && quantity !== Number(line.quantity)) {
      throw new HalfKitError("Reserved half-kit quantities cannot be changed here. Add another available half kit separately.");
    }
    const extra = money((quantity - Number(line.quantity)) * Number(line.unitPrice));
    addedSubtotal = money(addedSubtotal + extra);
    return extra === 0 && quantity === Number(line.quantity) ? { ...line } : {
      ...line, quantity: quantity.toFixed(2), lineTotal: fixed(money(line.lineTotal) + extra),
    };
  });
  const byProduct = new Map(catalogue.map(product => [product.productId, product]));
  for (const [productId, quantity] of quantities) {
    if (existing.some(line => line.productId === productId)) continue;
    const product = byProduct.get(productId);
    if (!product) throw new HalfKitError("A selected product is no longer available in this group buy.", 400);
    const unitPrice = money(product.priceOverride ?? product.price);
    if (unitPrice < 0) throw new HalfKitError("Invalid product price.", 400);
    const lineTotal = money(quantity * unitPrice);
    addedSubtotal = money(addedSubtotal + lineTotal);
    lines.push({ id: randomUUID(), productId, productName: product.productName,
      quantity: quantity.toFixed(2), unitPrice: fixed(unitPrice), lineTotal: fixed(lineTotal) });
  }
  // Preserve historical discounts, applied credits and all supplementary offer
  // charges. Only the server-priced additions change the stored gross total.
  const orderPatch: Record<string, any> = {
    productSubtotal: fixed(money(order.productSubtotal) + addedSubtotal),
    grandTotal: fixed(money(order.grandTotal) + addedSubtotal),
  };
  if (addedSubtotal > 0 && order.paymentStatus === "confirmed") {
    Object.assign(orderPatch, {
      amountDue: fixed(money(order.amountDue) + addedSubtotal),
      balancePaymentStatus: "unpaid", balanceCryptoQuote: null,
      balanceTxHash: null, balanceScreenshot: null, balanceConfirmedAt: null,
      ...(order.balancePaymentStatus === "confirmed" && order.balanceTxHash
        && !/^(?:fiat:|anonpay:)/i.test(order.balanceTxHash) ? {
          paymentTxHashes: [...new Set([...(order.paymentTxHashes ?? []), order.balanceTxHash])],
        } : {}),
    });
  } else if (addedSubtotal > 0 && order.paymentStatus !== "confirmed") orderPatch.paymentUsdAmount = null;
  return { lines, orderPatch, addedSubtotal };
}

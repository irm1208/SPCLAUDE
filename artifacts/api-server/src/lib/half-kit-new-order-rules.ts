import { HalfKitError, offerMoney } from "./half-kit-rules";

type HalfKitSelection = { offerId: string; version: number; requestId: string; price: number; productId: string };
export type HalfKitCheckout = HalfKitSelection & { additionalOffers?: HalfKitSelection[] };
export function halfKitSelections(checkout: HalfKitCheckout): HalfKitSelection[] {
  return [checkout, ...(checkout.additionalOffers ?? [])];
}
export function parseHalfKitCheckout(value: unknown): HalfKitCheckout | null {
  if (value == null) return null;
  const v = value as HalfKitCheckout;
  if (typeof v !== "object" || typeof v.offerId !== "string" || !v.offerId || v.offerId.length > 128
    || typeof v.productId !== "string" || !v.productId || !Number.isInteger(v.version) || v.version < 1
    || typeof v.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.requestId)) {
    throw new HalfKitError("Invalid half-kit checkout. Select the half kit again.", 400);
  }
  const first = { offerId: v.offerId, productId: v.productId, version: v.version, requestId: v.requestId, price: offerMoney(v.price) };
  if (v.additionalOffers === undefined) return first;
  if (!Array.isArray(v.additionalOffers) || v.additionalOffers.length > 99
    || v.additionalOffers.some(item => !item || typeof item !== "object" || "additionalOffers" in item)) {
    throw new HalfKitError("Invalid half-kit selection.", 400);
  }
  const additionalOffers = v.additionalOffers.map(item => parseHalfKitCheckout(item)!);
  const selections = [first, ...additionalOffers];
  for (const key of ["offerId", "productId", "requestId"] as const) {
    if (new Set(selections.map(item => item[key])).size !== selections.length) {
      throw new HalfKitError("Select each available half kit only once.", 400);
    }
  }
  return { ...first, additionalOffers };
}
export function assertHalfKitCheckoutItems(checkout: HalfKitCheckout, items: unknown, body: Record<string, unknown>) {
  if (body.orderType || body.additionOfOrderId || body.couponCode) {
    throw new HalfKitError("A half-kit checkout cannot use coupons or be a wholesale or top-up order.", 400);
  }
  const selections = halfKitSelections(checkout);
  if (!Array.isArray(items) || items.length !== selections.length
    || new Set(items.map(item => item?.productId)).size !== selections.length
    || selections.some(selection => !items.some(item => item?.productId === selection.productId && Number(item.quantity) === 0.5))) {
    throw new HalfKitError("This checkout must contain exactly the selected published half kits, at 0.5 kit each.", 400);
  }
}

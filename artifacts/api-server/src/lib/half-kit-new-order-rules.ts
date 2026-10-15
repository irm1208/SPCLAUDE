import { HalfKitError, offerMoney } from "./half-kit-rules";

export type HalfKitCheckout = { offerId: string; version: number; requestId: string; price: number; productId: string };
export function parseHalfKitCheckout(value: unknown): HalfKitCheckout | null {
  if (value == null) return null;
  const v = value as HalfKitCheckout;
  if (typeof v !== "object" || typeof v.offerId !== "string" || !v.offerId || v.offerId.length > 128
    || typeof v.productId !== "string" || !v.productId || !Number.isInteger(v.version) || v.version < 1
    || typeof v.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.requestId)) {
    throw new HalfKitError("Invalid half-kit checkout. Select the half kit again.", 400);
  }
  return { offerId: v.offerId, productId: v.productId, version: v.version, requestId: v.requestId, price: offerMoney(v.price) };
}
export function assertHalfKitCheckoutItems(checkout: HalfKitCheckout, items: unknown, body: Record<string, unknown>) {
  if (body.orderType || body.additionOfOrderId || body.couponCode) {
    throw new HalfKitError("A half-kit checkout cannot use coupons or be a wholesale or top-up order.", 400);
  }
  if (!Array.isArray(items) || items.length !== 1 || items[0]?.productId !== checkout.productId || Number(items[0]?.quantity) !== 0.5) {
    throw new HalfKitError("This checkout is for exactly one published half kit. Select it again to continue.", 400);
  }
}

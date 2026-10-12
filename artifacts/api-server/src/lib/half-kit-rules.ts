export class HalfKitError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
export const money = (value: unknown): number => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) throw new HalfKitError("Invalid monetary amount.", 400);
  return Math.round((number + Number.EPSILON) * 100) / 100;
};
export function offerMoney(value: unknown): number {
  if (typeof value !== "number" || value < 0 || value > 1_000_000 || money(value) !== value) {
    throw new HalfKitError("Enter a non-negative price with no more than two decimal places.", 400);
  }
  return value;
}
export function hasRemainingHalf(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0 && Math.abs(quantity % 1 - 0.5) < 0.000001;
}
export function claimAmounts(price: number, delivery: number, vendor: number, availableCredit: number) {
  [price, delivery, vendor, availableCredit].forEach(offerMoney);
  const gross = money(price + delivery + vendor);
  const credit = Math.min(gross, availableCredit);
  return { gross, credit, cash: money(gross - credit) };
}
type OrderState = {
  status: string; paymentStatus?: string | null; amountDue?: string | number | null;
  balancePaymentStatus?: string | null; balanceTxHash?: string | null; balanceScreenshot?: string | null;
  paymentTxHash?: string | null; paymentScreenshot?: string | null;
  deletedAt?: unknown; dispatchConfirmedAt?: unknown;
};
export function eligibleHalfKitOrder(order: OrderState): boolean {
  return ["Submitted", "Processing"].includes(order.status)
    && ["unpaid", "confirmed"].includes(order.paymentStatus ?? "unpaid")
    && !order.deletedAt && !order.dispatchConfirmedAt
    && !(order.paymentStatus === "unpaid" && (order.paymentTxHash || order.paymentScreenshot))
    && !["verifying", "pending_confirmation", "pending"].includes(order.balancePaymentStatus ?? "")
    && !((order.balanceTxHash || order.balanceScreenshot) && order.balancePaymentStatus !== "confirmed");
}
export function halfKitClaimPaid(claim: { cashDue: string | number; paidAt?: unknown }, order: OrderState): boolean {
  return !!claim.paidAt || money(claim.cashDue) === 0
    || (order.paymentStatus === "confirmed" && money(order.amountDue) === 0)
    || ["refunded", "refund_confirmed"].includes(order.paymentStatus ?? "");
}

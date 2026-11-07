export interface SharedCostLine {
  amount: number | null;
  rate?: number | null;
  currency: string | null;
  status: "known" | "estimate" | "not_set" | "calculated_later" | "not_required";
  basis: "per_person" | "per_kit" | "your_share" | "your_order";
  includedInOrder: boolean;
  note?: string;
}
export interface SharedOrderCosts {
  stage: "invitation" | "estimate" | "locked";
  currency: string;
  organiser: SharedCostLine;
  perKit: SharedCostLine;
  vendorShipping: SharedCostLine;
  onwardShipping: SharedCostLine;
  adjustment?: SharedCostLine;
  orderTotal: number | null;
}
type Amount = number | string | null | undefined;
interface ShareCostsInput {
  status: string; isPublic?: boolean; organiserFlatFee?: Amount; feePerKit?: Amount;
  deliveryUsername?: string | null; creatorUsername: string;
}
interface MemberCostsInput { username: string; organiserFee?: Amount; kits: number; adminAdjustmentFee?: Amount }
interface OrderCostsInput {
  paymentStatus?: string | null; currency?: string | null; organiserFee?: Amount;
  kitFees?: Amount; vendorShipping?: Amount; adminAdjustmentFee?: Amount; grandTotal?: Amount;
}
const amount = (value: Amount): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Read-only allowlisted disclosure. No member list, payment destinations or
 * addresses belong here. Rates mirror the existing join/lock rules; final money
 * always comes from the order, including payment-protected reopened orders.
 */
export function buildSharedOrderCosts(
  share: ShareCostsInput, viewer: string, member?: MemberCostsInput | null,
  order?: OrderCostsInput | null, liveShipping?: number | null,
): SharedOrderCosts {
  const recipient = !!share.deliveryUsername && share.deliveryUsername.toLowerCase() === viewer.toLowerCase();
  const snapshot = !!member && (share.status !== "open" || (!!order && order.paymentStatus !== "unpaid"));
  const currency = snapshot && order?.currency ? order.currency : "USD";
  const lockedAmount = (key: keyof OrderCostsInput) => order ? amount(order[key]) : null;
  const line = (value: number | null, basis: SharedCostLine["basis"], estimated = false, note?: string): SharedCostLine => ({
    amount: value, currency, basis, includedInOrder: true,
    status: value == null ? "not_set" : estimated ? "estimate" : "known", ...(note ? { note } : {}),
  });
  const organiserAmount = snapshot ? lockedAmount("organiserFee")
    : recipient ? 0 : member ? amount(member.organiserFee ?? 0)
      : share.isPublic ? amount(share.organiserFlatFee ?? 0) : 0;
  const configuredRate = amount(share.feePerKit ?? 0);
  const rate = snapshot ? null : configuredRate == null ? null : Math.max(0, configuredRate);
  const perKitAmount = snapshot ? lockedAmount("kitFees") : rate == null ? null
    : member ? Number((Math.max(0, member.kits) * rate).toFixed(2)) : rate === 0 ? 0 : null;
  const perKit = { ...line(perKitAmount, snapshot ? "your_order" : "per_kit", !!member && !snapshot,
    snapshot ? "Per-kit charges included in your saved order total."
      : member ? "Based on your saved basket. Save item changes to update this estimate."
        : "Applied to the number of kits you order; included in the order total."), rate };
  if (!snapshot && !member && rate != null && rate > 0) perKit.status = "calculated_later";
  return {
    stage: snapshot ? "locked" : member ? "estimate" : "invitation",
    currency,
    organiser: line(organiserAmount, member ? "your_order" : "per_person", !!member && !snapshot,
      snapshot ? "Included in your saved order total."
        : recipient ? "The parcel recipient is exempt from the organiser fee."
          : "Current organiser fee; it may change while this shared order is open."),
    perKit,
    vendorShipping: line(snapshot ? lockedAmount("vendorShipping") : amount(liveShipping), "your_share", !snapshot,
      snapshot ? "Your saved vendor-shipping share, included in the order."
        : "Your share depends on suppliers, destination, basket and group size; finalised when the group locks."),
    // Shared orders currently store forwarding addresses/tracking, not a personal
    // postage quotation. Account reshipper fees from group buys are NOT a quote.
    onwardShipping: {
      amount: recipient ? 0 : null, currency: null, basis: "your_order",
      status: recipient ? "not_required" : "not_set", includedInOrder: false,
      note: recipient ? "You receive the vendor parcel; no onward leg for your own items."
        : "Not set yet — ask the organiser. Onward postage is separate from your order total.",
    },
    adjustment: member ? line(snapshot ? lockedAmount("adminAdjustmentFee") : amount(member.adminAdjustmentFee ?? 0), "your_order", !snapshot) : undefined,
    orderTotal: snapshot ? lockedAmount("grandTotal") : null,
  };
}

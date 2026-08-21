import { splitShipping } from "./wholesale-shipping";

export type AdminAdjustmentItem = {
  quantity: number;
  unitPrice: number;
};

export type AdminAdjustmentMember = {
  id: string;
  items: AdminAdjustmentItem[];
  tip: number;
  adjustmentFee: number;
  adjustmentMessage?: string | null;
  kitFees?: number;
  organiserFee?: number;
};

export function calculateSharedOrderAdjustment(input: {
  members: AdminAdjustmentMember[];
  splitMode: "even" | "by_size";
  totalShipping: number;
}): Array<{ id: string; subtotal: number; shippingShare: number; grandTotal: number }> {
  if (!Number.isFinite(input.totalShipping) || input.totalShipping < 0) {
    throw new Error("Shipping must be a non-negative amount.");
  }

  for (const member of input.members) {
    if (!Number.isFinite(member.adjustmentFee) || member.adjustmentFee < 0) {
      throw new Error("Additional fee must be a non-negative amount.");
    }
    if (member.adjustmentFee > 0 && !member.adjustmentMessage?.trim()) {
      throw new Error("An explanation is required for an additional fee.");
    }
  }

  const weights = input.members.map(member =>
    member.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
  );
  const shippingShares = splitShipping(input.totalShipping, weights, input.splitMode);

  return input.members.map((member, index) => {
    const subtotal = Number(member.items.reduce(
      (total, item) => total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0,
    ).toFixed(2));
    const shippingShare = Number((shippingShares[index] ?? 0).toFixed(2));
    const grandTotal = Number((
      subtotal + shippingShare + (Number(member.tip) || 0) +
      (Number(member.kitFees) || 0) + member.adjustmentFee +
      (Number(member.organiserFee) || 0)
    ).toFixed(2));
    return { id: member.id, subtotal, shippingShare, grandTotal };
  });
}
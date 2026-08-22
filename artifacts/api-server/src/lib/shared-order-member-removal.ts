import { calculateSharedOrderAdjustment } from "./shared-order-admin-adjustments";

export type MemberRemovalMember = {
  id: string;
  username: string;
  isCreator: boolean;
  orderId: string | null;
  items: Array<{ quantity: number; unitPrice: number }>;
  tip: number;
  shippingShare: number | null;
  organiserFee?: number;
  kitFees?: number;
  adminAdjustmentFee?: number;
  adminAdjustmentMessage?: string | null;
};

export type MemberRemovalOrder = {
  id: string;
  paymentStatus: string;
  vendorShipping: number;
  grandTotal: number;
  amountDue: number;
  kitFees?: number;
  organiserFee?: number;
};

export type SharedOrderMemberRemovalPlan = {
  removedMembers: MemberRemovalMember[];
  retainedMembers: MemberRemovalMember[];
  removedOrders: Array<{
    orderId: string;
    paymentStatus: string;
    requiresPaymentReview: boolean;
  }>;
  retainedOrderUpdates: Array<{
    memberId: string;
    orderId: string;
    shippingShare: number;
    vendorShipping: number;
    grandTotal: number;
    amountDue: number;
    paymentProtected: boolean;
  }>;
};

const roundCents = (value: number) => Number(value.toFixed(2));

export function buildSharedOrderMemberRemovalPlan(input: {
  members: MemberRemovalMember[];
  orders: MemberRemovalOrder[];
  usernames: string[];
  splitMode: "even" | "by_size";
  totalShipping: number;
}): SharedOrderMemberRemovalPlan {
  const requested = Array.from(new Set(
    input.usernames
      .map(username => username.replace(/^@/, "").trim().toLowerCase())
      .filter(Boolean),
  ));
  if (requested.length === 0) throw new Error("Choose at least one member to remove.");

  const requestedSet = new Set(requested);
  const removedMembers = input.members.filter(member => requestedSet.has(member.username.replace(/^@/, "").toLowerCase()));
  const missing = requested.filter(username =>
    !input.members.some(member => member.username.replace(/^@/, "").toLowerCase() === username),
  );
  if (missing.length > 0) throw new Error(`These members are not part of this shared order: ${missing.join(", ")}.`);
  if (removedMembers.some(member => member.isCreator)) {
    throw new Error("The organiser can't be removed. Cancel the shared order instead.");
  }

  const retainedMembers = input.members.filter(member => !requestedSet.has(member.username.replace(/^@/, "").toLowerCase()));
  if (retainedMembers.length < 2) {
    throw new Error("At least 2 members must remain in the shared order.");
  }

  const orderById = new Map(input.orders.map(order => [order.id, order]));
  for (const member of input.members) {
    if (!member.orderId || !orderById.has(member.orderId)) {
      throw new Error(`No materialised order was found for @${member.username}.`);
    }
  }

  const removedOrders = removedMembers.map(member => {
    const order = orderById.get(member.orderId!)!;
    return {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      requiresPaymentReview: order.paymentStatus !== "unpaid",
    };
  });

  const calculations = calculateSharedOrderAdjustment({
    members: retainedMembers.map(member => {
      const order = orderById.get(member.orderId!)!;
      return {
        id: member.id,
        items: member.items,
        tip: member.tip,
        adjustmentFee: Number(member.adminAdjustmentFee ?? 0),
        adjustmentMessage: member.adminAdjustmentMessage,
        kitFees: Number(order.kitFees ?? member.kitFees ?? 0),
        organiserFee: Number(order.organiserFee ?? member.organiserFee ?? 0),
      };
    }),
    splitMode: input.splitMode,
    totalShipping: input.totalShipping,
  });
  const calculationById = new Map(calculations.map(calculation => [calculation.id, calculation]));

  const retainedOrderUpdates = retainedMembers.map(member => {
    const order = orderById.get(member.orderId!)!;
    const calculation = calculationById.get(member.id)!;
    const paymentProtected = order.paymentStatus !== "unpaid";
    const currentShipping = Number(order.vendorShipping ?? member.shippingShare ?? 0);
    const vendorShipping = paymentProtected
      ? roundCents(Math.max(currentShipping, calculation.shippingShare))
      : calculation.shippingShare;
    const recalculatedTotal = roundCents(calculation.grandTotal + (vendorShipping - calculation.shippingShare));
    const grandTotal = paymentProtected
      ? roundCents(Math.max(Number(order.grandTotal), recalculatedTotal))
      : recalculatedTotal;
    const amountDue = paymentProtected
      ? roundCents(Number(order.amountDue ?? 0) + Math.max(0, grandTotal - Number(order.grandTotal)))
      : Number(order.amountDue ?? 0);

    return {
      memberId: member.id,
      orderId: order.id,
      shippingShare: vendorShipping,
      vendorShipping,
      grandTotal,
      amountDue,
      paymentProtected,
    };
  });

  return { removedMembers, retainedMembers, removedOrders, retainedOrderUpdates };
}
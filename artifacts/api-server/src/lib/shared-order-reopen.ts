export type ReopenMember = {
  id: string;
  orderId: string | null;
};

export type ReopenOrder = {
  id: string;
  paymentStatus: string | null;
};

export type SharedOrderReopenPlan = {
  preserveOrderIds: string[];
  updateUnpaidOrderIds: string[];
  createOrderMemberIds: string[];
};

/**
 * Decide how the next lock should materialise members after a share was reopened.
 * Existing orders are never discarded by reopening: unpaid orders can be updated,
 * while any payment-started order must be preserved as the payment record.
 */
export function buildSharedOrderReopenPlan(
  members: ReopenMember[],
  orders: ReopenOrder[],
): SharedOrderReopenPlan {
  const ordersById = new Map(orders.map(order => [order.id, order]));
  const preserveOrderIds: string[] = [];
  const updateUnpaidOrderIds: string[] = [];
  const createOrderMemberIds: string[] = [];

  for (const member of members) {
    if (!member.orderId) {
      createOrderMemberIds.push(member.id);
      continue;
    }
    const order = ordersById.get(member.orderId);
    if (!order) {
      createOrderMemberIds.push(member.id);
    } else if (order.paymentStatus === "unpaid") {
      updateUnpaidOrderIds.push(member.orderId);
    } else {
      preserveOrderIds.push(member.orderId);
    }
  }

  return { preserveOrderIds, updateUnpaidOrderIds, createOrderMemberIds };
}
export type OverviewOrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "dispatched";

export interface OverviewOrder {
  id: string;
  status: OverviewOrderStatus;
  total: number;
  memberName: string;
  products: string[];
  createdAt: string;
}

export type OverviewBoardId = "awaiting" | "paid" | "packing" | "dispatched";

interface BoardDefinition {
  id: OverviewBoardId;
  label: string;
  statuses: readonly OverviewOrderStatus[];
}

const BOARD_DEFINITIONS: readonly BoardDefinition[] = [
  { id: "awaiting", label: "Awaiting payment", statuses: ["pending"] },
  { id: "paid", label: "Paid", statuses: ["paid"] },
  { id: "packing", label: "Packing", statuses: ["processing"] },
  { id: "dispatched", label: "Dispatched", statuses: ["shipped", "delivered", "dispatched"] },
];

export function buildOverviewSnapshot(
  orders: readonly OverviewOrder[],
  members: number,
  currency: string,
) {
  const board = BOARD_DEFINITIONS.map(definition => ({
    id: definition.id,
    label: definition.label,
    orders: orders.filter(order => definition.statuses.includes(order.status)),
  }));

  const stageCounts: Record<OverviewBoardId, number> = {
    awaiting: 0,
    paid: 0,
    packing: 0,
    dispatched: 0,
  };

  for (const column of board) {
    stageCounts[column.id] = column.orders.length;
  }

  return {
    board,
    stageCounts,
    revenue: orders.reduce(
      (total, order) => order.status === "cancelled" ? total : total + order.total,
      0,
    ),
    members,
    currency,
  };
}

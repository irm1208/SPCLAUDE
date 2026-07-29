import type { OrganiserOrder } from "./order.ts";

export interface OrganiserMember {
  id: string;
  username: string;
  name: string;
  country: string;
  orderCount: number;
  totalSpent: number;
  paidCount: number;
  pendingCount: number;
  fulfilmentCount: number;
  productCount: number;
  lastOrderAt: string | null;
  orderIds: string[];
  attention: boolean;
  hasTelegram?: boolean;
}

export interface ApiOrganiserMember {
  telegramUsername: string;
  hasTelegram: boolean;
}

const PAID_STATUSES = new Set(["paid", "processing", "shipped", "delivered", "dispatched"]);
const FULFILLED_STATUSES = new Set(["shipped", "delivered", "dispatched"]);

export function createMemberDirectory(orders: readonly OrganiserOrder[]): OrganiserMember[] {
  const members = new Map<string, OrganiserMember>();
  const newestFirst = [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  newestFirst.forEach(order => {
    const id = order.memberUsername.trim().toLowerCase() || order.memberName.trim().toLowerCase();
    const current = members.get(id) ?? {
      id,
      username: order.memberUsername,
      name: order.memberName,
      country: order.country,
      orderCount: 0,
      totalSpent: 0,
      paidCount: 0,
      pendingCount: 0,
      fulfilmentCount: 0,
      productCount: 0,
      lastOrderAt: order.createdAt,
      orderIds: [],
      attention: false,
    };

    current.orderCount += 1;
    current.totalSpent += order.total;
    current.productCount += order.products.reduce((total, product) => total + product.quantity, 0);
    current.paidCount += PAID_STATUSES.has(order.status) ? 1 : 0;
    current.pendingCount += order.status === "pending" ? 1 : 0;
    current.fulfilmentCount += FULFILLED_STATUSES.has(order.status) ? 1 : 0;
    current.attention = current.attention || order.status === "pending" || Boolean(order.flagged);
    current.orderIds.push(order.id);
    members.set(id, current);
  });

  return [...members.values()].sort((left, right) =>
    new Date(right.lastOrderAt ?? 0).getTime() - new Date(left.lastOrderAt ?? 0).getTime(),
  );
}

function memberDisplayName(username: string): string {
  return username
    .replace(/^@/, "")
    .split(/[_.-]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Member";
}

export function mergeMemberDirectory(
  orders: readonly OrganiserOrder[],
  joinedMembers: readonly ApiOrganiserMember[],
): OrganiserMember[] {
  const members = new Map(createMemberDirectory(orders).map(member => [member.id, member]));

  joinedMembers.forEach(joined => {
    const username = joined.telegramUsername.replace(/^@/, "").trim();
    const id = username.toLowerCase();
    const existing = members.get(id);
    members.set(id, existing ? { ...existing, hasTelegram: joined.hasTelegram } : {
      id,
      username,
      name: memberDisplayName(username),
      country: "Unknown",
      orderCount: 0,
      totalSpent: 0,
      paidCount: 0,
      pendingCount: 0,
      fulfilmentCount: 0,
      productCount: 0,
      lastOrderAt: null,
      orderIds: [],
      attention: false,
      hasTelegram: joined.hasTelegram,
    });
  });

  return [...members.values()].sort((left, right) => {
    if (!left.lastOrderAt) return right.lastOrderAt ? 1 : left.name.localeCompare(right.name);
    if (!right.lastOrderAt) return -1;
    return new Date(right.lastOrderAt).getTime() - new Date(left.lastOrderAt).getTime();
  });
}

import {
  ACTIVITY_EVENTS,
  type ActivityEvent,
  type FulfilmentStatus,
  type MemberRecord,
  type OrderRecord,
  type PaymentStatus,
} from "./data.ts";

export type DirectorySortKey =
  | "name"
  | "orders"
  | "totalSpent"
  | "lastOrderAt";

export type DirectoryFilters = {
  query: string;
  country: string;
  payment: "all" | PaymentStatus;
  fulfilment: "all" | FulfilmentStatus;
  sortKey: DirectorySortKey;
  direction: "asc" | "desc";
};

export type MemberSummary = {
  memberCount: number;
  orderCount: number;
  totalSpent: number;
  attentionCount: number;
  confirmedMemberCount: number;
  countryCount: number;
};

export const summarizeMembers = (
  members: MemberRecord[],
  orders: OrderRecord[],
): MemberSummary => ({
  memberCount: members.length,
  orderCount: orders.length,
  totalSpent: members.reduce(
    (total, member) => total + member.totalSpent,
    0,
  ),
  attentionCount: members.filter((member) => member.attention).length,
  confirmedMemberCount: members.filter(
    (member) => member.paymentStatus === "confirmed",
  ).length,
  countryCount: new Set(members.map((member) => member.country)).size,
});

export const filterMembers = (
  members: MemberRecord[],
  filters: DirectoryFilters,
): MemberRecord[] => {
  const query = filters.query.trim().toLowerCase();
  const country = filters.country.trim().toLowerCase();

  return members.filter((member) => {
    const matchesQuery =
      query.length === 0 ||
      member.name.toLowerCase().includes(query) ||
      member.username.toLowerCase().includes(query) ||
      member.country.toLowerCase().includes(query);
    const matchesCountry =
      country.length === 0 ||
      country === "all" ||
      member.country.toLowerCase() === country ||
      member.countryCode.toLowerCase() === country;
    const matchesPayment =
      filters.payment === "all" ||
      member.paymentStatus === filters.payment;
    const matchesFulfilment =
      filters.fulfilment === "all" ||
      member.fulfilmentStatus === filters.fulfilment;

    return (
      matchesQuery &&
      matchesCountry &&
      matchesPayment &&
      matchesFulfilment
    );
  });
};

export const sortMembers = (
  members: MemberRecord[],
  key: DirectorySortKey,
  direction: "asc" | "desc",
): MemberRecord[] => {
  const directionMultiplier = direction === "asc" ? 1 : -1;

  return [...members].sort((left, right) => {
    if (key === "lastOrderAt") {
      if (left.lastOrderAt === right.lastOrderAt) {
        return 0;
      }
      if (left.lastOrderAt === null) {
        return 1;
      }
      if (right.lastOrderAt === null) {
        return -1;
      }
      return left.lastOrderAt.localeCompare(right.lastOrderAt) * directionMultiplier;
    }

    if (key === "name") {
      return left.name.localeCompare(right.name) * directionMultiplier;
    }

    const leftValue = key === "orders" ? left.orderCount : left.totalSpent;
    const rightValue = key === "orders" ? right.orderCount : right.totalSpent;
    return (leftValue - rightValue) * directionMultiplier;
  });
};

export const getMemberOrders = (
  orders: OrderRecord[],
  memberId: string,
): OrderRecord[] => orders.filter((order) => order.memberId === memberId);

export const getMemberActivity = (memberId: string): ActivityEvent[] =>
  ACTIVITY_EVENTS.filter((event) => event.memberId === memberId);

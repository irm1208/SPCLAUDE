export type MemberOrderSection = "active" | "completed";
export type MemberOrderType = "all" | "gb" | "shared" | "wholesale" | "shop";

type OrderCard = {
  kind: string;
  title: string;
  order: { id: string; status: string; code?: string | number; lineItems: { productName: string }[] };
};

/** Account-owned completion is deliberately independent of fulfilment/payment. */
export function filterMemberOrderCards<T extends OrderCard>(cards: T[], completedIds: ReadonlySet<string>, filters: {
  section: MemberOrderSection; type: MemberOrderType; status: string; search: string;
}): T[] {
  const query = filters.search.trim().toLowerCase();
  return cards.filter(card => {
    if (completedIds.has(card.order.id) !== (filters.section === "completed")) return false;
    if (filters.type !== "all" && card.kind !== filters.type) return false;
    if (filters.status !== "all" && card.order.status !== filters.status) return false;
    return !query || `${card.title} ${card.order.code} ${card.order.lineItems.map(item => item.productName).join(" ")}`.toLowerCase().includes(query);
  });
}

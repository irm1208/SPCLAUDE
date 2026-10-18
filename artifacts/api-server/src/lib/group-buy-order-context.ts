export interface GroupBuyContextMembership {
  groupBuyId: string;
  allowExtraOrder: boolean;
}

export interface GroupBuyContextGroup {
  id: string;
  name: string;
  status: string;
  allowExtraOrders: boolean;
}

export interface GroupBuyContextProduct {
  groupBuyId: string;
  productId: string;
}

export type GroupBuyContextResolution =
  | { kind: "none" }
  | { kind: "unique"; groupBuyId: string }
  | { kind: "ambiguous"; eligibleGroupBuys: Array<{ id: string; name: string }> };

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function inferGroupBuyContext(input: {
  authenticatedUsername: string | null;
  submittedUsername: string;
  isWholesaleOrder: boolean;
  productIds: string[];
  memberships: GroupBuyContextMembership[];
  groupBuys: GroupBuyContextGroup[];
  eligibleProducts: GroupBuyContextProduct[];
}): GroupBuyContextResolution {
  if (
    !input.authenticatedUsername ||
    normalizeUsername(input.authenticatedUsername) !== normalizeUsername(input.submittedUsername) ||
    input.isWholesaleOrder ||
    input.productIds.length === 0
  ) {
    return { kind: "none" };
  }

  const productIds = new Set(input.productIds);
  const memberships = new Map(input.memberships.map(row => [row.groupBuyId, row]));
  const productsByGroup = new Map<string, Set<string>>();
  for (const row of input.eligibleProducts) {
    const products = productsByGroup.get(row.groupBuyId) ?? new Set<string>();
    products.add(row.productId);
    productsByGroup.set(row.groupBuyId, products);
  }

  const eligibleGroupBuys = input.groupBuys
    .filter(group => {
      const membership = memberships.get(group.id);
      if (!membership) return false;
      const isOrderable = group.status === "active" || group.allowExtraOrders || membership.allowExtraOrder;
      if (!isOrderable) return false;
      const availableProducts = productsByGroup.get(group.id);
      return availableProducts && [...productIds].every(productId => availableProducts.has(productId));
    })
    .map(group => ({ id: group.id, name: group.name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  if (eligibleGroupBuys.length === 0) return { kind: "none" };
  if (eligibleGroupBuys.length === 1) {
    return { kind: "unique", groupBuyId: eligibleGroupBuys[0].id };
  }
  return { kind: "ambiguous", eligibleGroupBuys };
}

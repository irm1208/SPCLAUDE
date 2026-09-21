type PaymentItem = { quantity?: unknown; unitPrice?: unknown };

export type WholesaleOrganiserPaymentMember = {
  items?: unknown;
  creditsApplied?: unknown;
};

function finiteMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function memberSubtotal(items: unknown): number | null {
  if (!Array.isArray(items)) return null;

  let subtotal = 0;
  for (const item of items as PaymentItem[]) {
    if (!item || typeof item !== "object") return null;
    const quantity = finiteMoney(item.quantity);
    const unitPrice = finiteMoney(item.unitPrice);
    if (quantity === null || unitPrice === null || quantity < 0 || unitPrice < 0) return null;
    subtotal += Number((quantity * unitPrice).toFixed(2));
  }
  return Number(subtotal.toFixed(2));
}

/**
 * The organiser forwards the member product subtotals plus vendor shipping.
 * Credits are platform-funded payment already applied to those member orders,
 * so they reduce the amount the organiser must forward. Tips and organiser fees
 * intentionally remain outside this calculation.
 */
export function calculateWholesaleOrganiserAmountDue(
  members: WholesaleOrganiserPaymentMember[],
  totalVendorShipping: unknown,
): number | null {
  const shipping = finiteMoney(totalVendorShipping);
  if (shipping === null || shipping < 0) return null;

  let combinedSubtotal = 0;
  let creditsApplied = 0;
  for (const member of members) {
    const subtotal = memberSubtotal(member.items);
    if (subtotal === null) return null;
    combinedSubtotal += subtotal;

    const credits = finiteMoney(member.creditsApplied);
    if (credits !== null && credits > 0) creditsApplied += credits;
  }

  return Math.max(0, Number((combinedSubtotal + shipping - creditsApplied).toFixed(2)));
}
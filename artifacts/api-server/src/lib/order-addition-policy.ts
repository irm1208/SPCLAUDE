/** Preparation ("Confirm batch"), not supplier placement, commits an order. */
export function additionMustSplit(legacyLocked: boolean, allocationState?: string): boolean {
  return legacyLocked || allocationState === "prepared" || allocationState === "ordered";
}

export function additionBlockReason(legacyLocked: boolean, allocationState?: string, orderStatus?: string): string | null {
  if (allocationState === "ordered" || ["Shipped", "Completed"].includes(orderStatus ?? "")) {
    return "Items can no longer be added because this order has already been submitted to the vendor.";
  }
  if (legacyLocked) return "Items can no longer be added because this order is supplier-locked.";
  return null;
}

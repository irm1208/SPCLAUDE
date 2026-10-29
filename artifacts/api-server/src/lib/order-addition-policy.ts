/** Preparation ("Confirm batch"), not supplier placement, commits an order. */
export function additionMustSplit(legacyLocked: boolean, allocationState?: string): boolean {
  return legacyLocked || allocationState === "prepared" || allocationState === "ordered";
}

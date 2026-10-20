export function isVendorShippingIncluded(
  amount: string | number | null | undefined,
): boolean {
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return false;
  }
  return Number(amount) === 0;
}

export function setVendorShippingIncluded(
  amount: string,
  included: boolean,
): string {
  if (included) return "0";
  return isVendorShippingIncluded(amount) ? "" : amount;
}

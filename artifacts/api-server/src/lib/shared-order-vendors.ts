export function parseSharedOrderVendors(value: unknown, vendors: { id: string }[]): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(id => typeof id !== "string")) {
    throw new Error("Select at least one supplier.");
  }
  const ids = [...new Set(value as string[])];
  if (ids.some(id => !vendors.some(v => v.id === id))) {
    throw new Error("One of the selected suppliers is no longer available. Refresh and choose again.");
  }
  return ids;
}

export function sharedOrderAllowsVendor(allowed: string[] | null | undefined, vendorId: string): boolean {
  return allowed == null || allowed.includes(vendorId);
}

export function sharedOrderVendorConflict(
  allowed: string[],
  members: { quantity: number; vendorId?: string | null }[][],
  fallbackVendorId: string | null,
): boolean {
  return members.some(items => items.some(item =>
    item.quantity > 0 && !allowed.includes(item.vendorId || fallbackVendorId || ""),
  ));
}

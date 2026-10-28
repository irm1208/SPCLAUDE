// Pure helpers for multi-vendor wholesale display. Never compute money here —
// all amounts come from the server; we only group and label.

export interface VendorTagged {
  vendorId?: string | null;
  vendorName?: string | null;
}

export interface VendorGroup<T> {
  key: string;
  vendorId: string | null;
  vendorName: string | null;
  items: T[];
}

/** Group items by vendor, preserving first-seen vendor order and item order. */
export function groupByVendor<T extends VendorTagged>(items: T[]): VendorGroup<T>[] {
  const groups = new Map<string, VendorGroup<T>>();
  for (const it of items) {
    const key = it.vendorId ?? "__none__";
    let g = groups.get(key);
    if (!g) {
      g = { key, vendorId: it.vendorId ?? null, vendorName: it.vendorName ?? null, items: [] };
      groups.set(key, g);
    }
    if (!g.vendorName && it.vendorName) g.vendorName = it.vendorName;
    g.items.push(it);
  }
  return [...groups.values()];
}

/** True only when the list genuinely spans more than one vendor. */
export function isMultiVendor<T extends VendorTagged>(items: T[]): boolean {
  return groupByVendor(items).filter(g => g.vendorId).length > 1;
}

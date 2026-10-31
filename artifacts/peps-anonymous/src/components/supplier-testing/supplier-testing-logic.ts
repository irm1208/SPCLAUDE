export type SupplierTestingItemState = "eligible" | "awaiting_batch" | "assigned" | "retained_ineligible";

export type SupplierTestingItem = {
  orderId: string; orderCode: string; orderType: string;
  productId: string; productName: string;
  supplierId: string; supplierName: string;
  quantity: number; eligible: boolean;
  interestId: string | null; groupId: string | null;
  state: SupplierTestingItemState; assignmentNote: string | null;
};

export type SupplierTestingGroup = {
  id: string; poolId: string; slug: string; title: string;
  supplierId: string; supplierName: string; productId: string; productName: string;
  batchNumber: string; status: string;
  targetAmountUsd: number; raisedUsd: number; hasResults: boolean; joined: boolean;
  contributions: { id: string; amountUsd: number; paymentStatus: string }[];
};

export type SupplierTestingResponse = { items: SupplierTestingItem[]; groups: SupplierTestingGroup[] };

export const STATE_COPY: Record<SupplierTestingItemState, { label: string; detail: string; tone: "blue" | "amber" | "green" | "slate" }> = {
  eligible: { label: "Eligible", detail: "You can register interest. Nothing is charged.", tone: "blue" },
  awaiting_batch: { label: "Interest registered", detail: "Waiting for staff to confirm the actual batch. No contribution has been taken.", tone: "amber" },
  assigned: { label: "Batch assigned", detail: "Linked to a confirmed batch group. Contributing is a separate, optional step.", tone: "green" },
  retained_ineligible: { label: "Interest kept", detail: "This order is no longer eligible, but your existing registration is retained.", tone: "slate" },
};

export type Filters = { supplierId: string; productId: string; batch: string };

export function filterItems(items: SupplierTestingItem[], f: Filters, orderId?: string, compact?: boolean) {
  return items.filter(i => {
    if (orderId && i.orderId !== orderId) return false;
    if (compact && !(i.eligible || i.interestId)) return false;
    if (f.supplierId && i.supplierId !== f.supplierId) return false;
    if (f.productId && i.productId !== f.productId) return false;
    return true;
  });
}

export function filterGroups(groups: SupplierTestingGroup[], f: Filters) {
  const q = f.batch.trim().toLowerCase();
  return groups.filter(g => {
    if (f.supplierId && g.supplierId !== f.supplierId) return false;
    if (f.productId && g.productId !== f.productId) return false;
    if (q && !g.batchNumber.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function canJoin(i: SupplierTestingItem) {
  return i.eligible && !i.interestId && i.state === "eligible";
}

export function pct(raised: number, target: number) {
  return target > 0 ? Math.min(100, (raised / target) * 100) : 0;
}

export function usd(n: number) { return `$${(n ?? 0).toFixed(2)}`; }

/** Groups an admin may assign an interest to: same supplier + product only. */
export function assignableGroups<G extends { supplierId: string; productId: string }>(
  groups: G[], interest: { supplierId: string; productId: string },
) {
  return groups.filter(g => g.supplierId === interest.supplierId && g.productId === interest.productId);
}

export async function readError(r: Response, fallback: string) {
  try { const j = await r.json(); return (j && (j.error || j.message)) || fallback; } catch { return fallback; }
}

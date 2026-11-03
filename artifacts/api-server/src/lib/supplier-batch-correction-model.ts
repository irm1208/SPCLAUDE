import { fingerprint, propose, SupplierBatchError, type BatchOrder, type BatchRegion } from "./supplier-batches-model";
interface CorrectionNote {
  direction: string; reference: string; reason: string; kits: number;
  orderCodes: string[]; createdAt: string; actor: string;
}

/** Partition whole orders; never alter customer quantities or money snapshots. */
export function correctionSnapshots(snapshot: any, orderIds: string[]) {
  if (!Array.isArray(orderIds) || !orderIds.length || orderIds.length > 1000
    || orderIds.some(id => typeof id !== "string") || new Set(orderIds).size !== orderIds.length) {
    throw new SupplierBatchError("Select distinct complete orders to move.", 400);
  }
  const selected = new Set(orderIds);
  const orders = snapshot.orders as BatchOrder[];
  if (orders.filter(o => selected.has(o.id)).length !== selected.size) {
    throw new SupplierBatchError("Selected orders are no longer in this batch. Reload and review.");
  }
  const make = (items: BatchOrder[]): ReturnType<typeof propose> & {
    token: string; region: BatchRegion; readyAt: string | null; corrections?: CorrectionNote[];
  } => ({
    ...snapshot, ...propose(items, snapshot.region.targetKits, true),
    token: fingerprint({ prior: snapshot.token, orders: items }),
  });
  return {
    remaining: make(orders.filter(o => !selected.has(o.id))),
    moved: { ...make(orders.filter(o => selected.has(o.id))), corrections: [] as CorrectionNote[] },
  };
}

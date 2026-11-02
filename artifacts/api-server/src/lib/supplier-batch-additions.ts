import { fingerprint, propose, SupplierBatchError, type BatchOrder } from "./supplier-batches-model";

export interface AddedQuantity { orderId: string; productId: string; productName: string; quantity: number }
export interface QuantityMove { orderId: string; productId: string; quantity: number }
const key = (o: string, p: string) => JSON.stringify([o, p]);
export const reservationBatch = (order: BatchOrder, batchId: string) => order.allocationRootBatchId ?? batchId;
export const wholeSnapshot = (order: BatchOrder) => order.fullOrder ?? order;

/** Replay the complete append/review history, not the last 100 UI events. */
export function batchAdditions(batch: any, history: any[]): AddedQuantity[] {
  const amounts = new Map<string, number>();
  for (const event of history) {
    const d = event.detail;
    if (d.batchId !== batch.id) continue;
    if (event.kind === "appended") for (const id of d.orderIds ?? []) {
      const firstReview = history.find(e => e.kind === "refreshed" && e.detail.batchId === batch.id
        && e.detail.changes?.some((c: any) => c.orderId === id));
      const original = firstReview?.detail.changes.find((c: any) => c.orderId === id)?.before
        ?? d.orders?.find((o: any) => o.id === id)
        ?? history.find(e => e.kind === "quantities_moved" && e.detail.batchId === batch.id)?.detail.beforeSnapshot?.orders.find((o: any) => o.id === id)
        ?? batch.snapshot.orders.find((o: any) => o.id === id);
      for (const item of original?.items ?? []) amounts.set(key(id, item.productId), item.quantity);
    }
    if (event.kind === "refreshed") for (const change of d.changes ?? []) {
      const before = new Map<string, number>();
      for (const i of change.before?.items ?? []) before.set(i.productId, (before.get(i.productId) ?? 0) + i.quantity);
      const after = new Map<string, number>();
      for (const i of change.after?.items ?? []) after.set(i.productId, (after.get(i.productId) ?? 0) + i.quantity);
      for (const productId of new Set([...before.keys(), ...after.keys()])) {
        const k = key(change.orderId, productId);
        amounts.set(k, Math.max(0, (amounts.get(k) ?? 0) + (after.get(productId) ?? 0) - (before.get(productId) ?? 0)));
      }
    }
    if (event.kind === "quantities_moved") for (const line of d.lines ?? []) {
      const k = key(line.orderId, line.productId);
      amounts.set(k, Math.max(0, (amounts.get(k) ?? 0) - line.quantity));
    }
  }
  return batch.snapshot.orders.flatMap((o: BatchOrder) => o.items.flatMap(i => {
    const quantity = Math.min(i.quantity, amounts.get(key(o.id, i.productId)) ?? 0);
    return quantity > 0 ? [{ orderId: o.id, productId: i.productId, productName: i.productName, quantity }] : [];
  }));
}

export function splitBatchQuantities(batch: any, lines: QuantityMove[]) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 1000) throw new SupplierBatchError("Choose added product quantities.", 400);
  const amounts = new Map<string, number>();
  for (const l of lines) {
    if (!l || typeof l.orderId !== "string" || typeof l.productId !== "string" || !Number.isFinite(l.quantity)
      || l.quantity <= 0 || l.quantity * 2 % 1 || amounts.has(key(l.orderId, l.productId))) {
      throw new SupplierBatchError("Select each product once, using positive half-kit quantities.", 400);
    }
    amounts.set(key(l.orderId, l.productId), l.quantity);
  }
  const remaining: BatchOrder[] = [], moved: BatchOrder[] = [];
  for (const o of batch.snapshot.orders as BatchOrder[]) {
    const stay: typeof o.items = [], transfer: typeof o.items = [];
    const selectedProducts = o.items.filter(i => amounts.has(key(o.id, i.productId))).map(i => i.productId);
    if (new Set(selectedProducts).size !== selectedProducts.length) {
      throw new SupplierBatchError("This product has multiple price lines. Review its allocation manually before splitting.");
    }
    for (const i of o.items) {
      const k = key(o.id, i.productId), q = amounts.get(k) ?? 0;
      amounts.delete(k);
      if (q > i.quantity) throw new SupplierBatchError("The quantity exceeds this batch allocation.");
      const cents = Math.round(Number(i.lineTotal) * 100);
      const movedCents = Math.round(cents * q / i.quantity);
      if (q) transfer.push({ ...i, quantity: q, lineTotal: (movedCents / 100).toFixed(2) });
      if (q < i.quantity) stay.push({ ...i, quantity: i.quantity - q, lineTotal: ((cents - movedCents) / 100).toFixed(2) });
    }
    const sliced = stay.length > 0 && transfer.length > 0 || !!o.fullOrder;
    const make = (items: typeof o.items): BatchOrder => ({ ...o, items, kits: items.reduce((sum, i) => sum + i.quantity, 0),
      ...(sliced ? { fullOrder: wholeSnapshot(o), allocationRootBatchId: reservationBatch(o, batch.id) } : {}) });
    if (stay.length) remaining.push(transfer.length ? make(stay) : o);
    if (transfer.length) moved.push(make(transfer));
  }
  if (amounts.size) throw new SupplierBatchError("A selected product is no longer in this batch.");
  const make = (orders: BatchOrder[]) => ({ ...batch.snapshot, ...propose(orders, batch.snapshot.region.targetKits, true),
    token: fingerprint({ previous: batch.snapshot.token, lines, orders }) });
  return { remaining: make(remaining), moved: { ...make(moved), corrections: [] as any[] } };
}

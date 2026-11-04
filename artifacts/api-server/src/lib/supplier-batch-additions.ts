import { fingerprint, propose, SupplierBatchError, type BatchOrder } from "./supplier-batches-model";

export interface AddedQuantity { orderId: string; productId: string; productName: string; quantity: number }
export interface QuantityMove { orderId: string; productId: string; quantity: number }
const key = (o: string, p: string) => JSON.stringify([o, p]);
export const reservationBatch = (order: BatchOrder, batchId: string) => order.allocationRootBatchId ?? batchId;
export const wholeSnapshot = (order: BatchOrder) => order.fullOrder ?? order;

const timestamp = (value: unknown) => value instanceof Date ? value.getTime()
  : typeof value === "string" && value ? Date.parse(value) : NaN;

/** Whole orders appended to this batch, not historical customer quantity edits. */
export function appendedBatchOrders(batch: any, history: any[]): { orderId: string; kits: number; addedAt: string }[] {
  if (batch.state === "released") return [];
  const preparedAt = timestamp(batch.createdAt);
  if (!Number.isFinite(preparedAt)) return [];
  const appended = new Map<string, string>();
  for (const event of history) {
    const at = timestamp(event.createdAt);
    if (event.kind !== "appended" || event.detail.batchId !== batch.id || !(at > preparedAt)) continue;
    for (const id of event.detail.orderIds ?? []) {
      if (!appended.has(id)) appended.set(id, new Date(at).toISOString());
    }
  }
  return (batch.snapshot.orders as BatchOrder[]).flatMap(order => {
    const addedAt = appended.get(order.id);
    const kits = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    return addedAt && reservationBatch(order, batch.id) === batch.id && kits > 0
      ? [{ orderId: order.id, kits, addedAt }] : [];
  });
}

/** The allocation baseline is batch preparation, never the customer's first order. */
export function postPreparationAdditions(batch: any, history: any[], orderEdits: any[] = []): AddedQuantity[] {
  if (batch.state === "released" || !Number.isFinite(timestamp(batch.createdAt))) return [];
  const preparedAt = timestamp(batch.createdAt);
  const late = new Set(appendedBatchOrders(batch, history).map(order => order.orderId));
  return batchAdditions({ ...batch, snapshot: { ...batch.snapshot,
    orders: batch.snapshot.orders.filter((order: BatchOrder) => !late.has(order.id)),
  } }, history.filter(event => event.kind !== "refreshed" || timestamp(event.createdAt) > preparedAt),
  orderEdits.filter(edit => timestamp(edit.createdAt) > preparedAt));
}

/** Batch appends are NOT customer additions. Prefer original order-edit evidence. */
export function batchAdditions(batch: any, history: any[], orderEdits: any[] = []): AddedQuantity[] {
  const undone = new Set(history.filter(e => e.kind === "move_undone").map(e => e.detail.moveEventId));
  history = history.filter(e => !e.id || !undone.has(e.id));
  const amounts = new Map<string, number>();
  // These records are supplied oldest-first. A before/after edit predating batch
  // preparation still establishes the original customer quantity (e.g. 1 -> 2).
  for (const o of batch.snapshot.orders as BatchOrder[]) {
    const whole = wholeSnapshot(o);
    const edit = orderEdits.find(e => e.metadata?.orderId === o.id
      && Array.isArray(e.metadata.before?.lineItems) && Array.isArray(e.metadata.after?.lineItems));
    const review = history.find(e => e.kind === "refreshed" && e.detail.batchId === batch.id
      && e.detail.changes?.some((c: any) => c.orderId === o.id && Array.isArray(c.before?.items)))
      ?.detail.changes.find((c: any) => c.orderId === o.id);
    if (!edit && !review) continue; // No evidence: never assume the whole order is extra.
    const before = edit ? edit.metadata.before.lineItems : review.before.items;
    const after = edit ? edit.metadata.after.lineItems : review.after?.items ?? [];
    for (const item of o.items) {
      const k = key(o.id, item.productId);
      // Historical customer logs omit product IDs. Never guess between products
      // with the same name or malformed quantities.
      const matches = whole.items.filter(i => edit
        ? i.productName === item.productName : i.productId === item.productId);
      if (matches.length !== 1 || [...before, ...after].some((i: any) =>
        !Number.isFinite(Number(i.quantity)) || Number(i.quantity) < 0)) {
        amounts.set(k, 0);
        continue;
      }
      const matchesItem = (i: any) => edit ? i.productName === item.productName : i.productId === item.productId;
      const original = before.filter(matchesItem)
        .reduce((sum: number, i: any) => sum + Number(i.quantity), 0);
      const known = before.some(matchesItem) || after.some(matchesItem);
      if (!known) { amounts.set(k, 0); continue; }
      const moves = history.filter(e => e.kind === "quantities_moved"
        && e.detail.lines?.some((l: QuantityMove) => l.orderId === o.id && l.productId === item.productId));
      const alreadyMoved = moves.reduce((sum, e) => sum + e.detail.lines
        .filter((l: QuantityMove) => l.orderId === o.id && l.productId === item.productId)
        .reduce((n: number, l: QuantityMove) => n + l.quantity, 0), 0);
      const destination = moves.some(e => e.detail.targetBatchId === batch.id)
        || reservationBatch(o, batch.id) !== batch.id;
      amounts.set(k, destination ? 0 : Math.max(0, Math.min(
        item.quantity - original, matches[0].quantity - original - alreadyMoved,
      )));
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

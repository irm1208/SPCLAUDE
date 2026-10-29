import {
  eligibleOrder, fingerprint, propose, snapshotOrder, SupplierBatchError,
  type BatchOrder, type BatchRegion, type SupplierConfig,
} from "./supplier-batches-model";

type Allocation = { orderId: string; batchId: string };
interface RefreshBatch {
  id: string; groupBuyId: string; reference: string; state: string;
  snapshot: { token: string; region: BatchRegion; orders: BatchOrder[]; kits: number; products: unknown[] };
}
interface RefreshData {
  config: SupplierConfig; stored?: { version: number } | null;
  all: any[]; used: Allocation[]; elig: { orderId: string; reviewedAt?: unknown }[];
}

/** Keep the original payment/queue evidence; settling timestamps alone are not a material edit. */
export function refreshedOrderSnapshot(order: any, old: BatchOrder): BatchOrder {
  return { ...snapshotOrder(order, old.orderingAt), paidAt: old.paidAt,
    orderingAt: old.orderingAt, historicalReviewed: old.historicalReviewed };
}

/** Pure preview. It never repairs an order, its allocation, or its payment. */
export function buildPreparedBatchRefresh(batch: RefreshBatch, data: RefreshData, actual: Allocation[], currency: string) {
  if (batch.state !== "prepared") throw new SupplierBatchError("Only prepared batches can be updated, before supplier submission.");
  const blockers: { orderId: string | null; code: string | null; reason: string }[] = [];
  const block = (reason: string, old?: BatchOrder) => blockers.push({ orderId: old?.id ?? null, code: old?.code ?? null, reason });
  if (!data.config.enabled) block("Supplier batching is disabled.");
  const saved = batch.snapshot, region = data.config.regions.find(r => r.id === saved.region.id);
  if (!region || fingerprint([...region.countries].sort()) !== fingerprint([...saved.region.countries].sort())) {
    block("The batch region was removed or its countries changed. Restore its region or release this unsent batch for review.");
  }
  const ids = saved.orders.map(o => o.id).sort();
  if (!ids.length || new Set(ids).size !== ids.length ||
      fingerprint(actual.map(a => a.orderId).sort()) !== fingerprint(ids) ||
      actual.some(a => a.batchId !== batch.id)) {
    block("Batch allocation mismatch. Contact Admin for review; no orders will be dropped or reassigned.");
  }
  const changes: { orderId: string; code: string; before: BatchOrder; after: BatchOrder | null }[] = [];
  const orders: BatchOrder[] = [];
  for (const old of saved.orders) {
    const live = data.all.find(o => o.id === old.id);
    if (!live || live.groupBuyId !== batch.groupBuyId) {
      block("Order is missing or moved out of this group buy.", old);
      changes.push({ orderId: old.id, code: old.code, before: old, after: null });
      continue;
    }
    if (data.used.filter(a => a.orderId === old.id && a.batchId === batch.id).length !== 1) {
      block("Order allocation is missing or belongs to another batch.", old);
    }
    const eligibility = data.elig.find(e => e.orderId === old.id);
    const reason = eligibleOrder(live, false, !!eligibility?.reviewedAt);
    if (reason) block(reason, old);
    if (["verifying", "pending_confirmation"].includes(live.balancePaymentStatus)) {
      block("Balance payment is still awaiting verification.", old);
    }
    const validItems = Array.isArray(live.lineItems) && live.lineItems.some((i: any) => !i.isOos) &&
      live.lineItems.filter((i: any) => !i.isOos).every((i: any) =>
        Number.isFinite(Number(i.quantity)) && Number(i.quantity) > 0 && Number(i.quantity) * 2 % 1 === 0);
    const after = validItems ? refreshedOrderSnapshot(live, old) : null;
    if (after) {
      if (!saved.region.countries.includes(after.country) || !region?.countries.includes(after.country)) {
        block("Order destination is outside this batch's saved region.", old);
      }
      orders.push(after);
    }
    if (!after || fingerprint(after) !== fingerprint(old)) changes.push({ orderId: old.id, code: old.code, before: old, after });
  }
  const combined = orders.length === saved.orders.length ? propose(orders, saved.region.targetKits, true) : null;
  // Convert PostgreSQL Date instances to ISO before canonical hashing; Date has no enumerable keys.
  const token = fingerprint(JSON.parse(JSON.stringify({
    batchId: batch.id, state: batch.state, snapshot: saved, currency,
    version: data.stored?.version ?? 0, config: data.config,
    allocations: actual.map(a => [a.orderId, a.batchId]).sort(),
    live: saved.orders.map(o => data.all.find(live => live.id === o.id) ?? null),
    eligibility: data.elig.filter(e => ids.includes(e.orderId)).sort((a, b) => a.orderId.localeCompare(b.orderId)),
    membership: data.used.filter(a => ids.includes(a.orderId)).sort((a, b) => a.orderId.localeCompare(b.orderId)),
  })));
  return {
    batchId: batch.id, reference: batch.reference, expectedBatchToken: saved.token, token, currency,
    canConfirm: blockers.length === 0 && changes.length > 0 && combined !== null,
    blockers, changes,
    before: { kits: saved.kits, orderCount: saved.orders.length, products: saved.products },
    after: combined ? { kits: combined.kits, orderCount: orders.length, products: combined.products } : null,
    // Internal only: the HTTP preview deliberately strips the replacement orders.
    orders,
  };
}

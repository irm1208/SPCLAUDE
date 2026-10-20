import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supplierKey, supplierRequest, type SupplierScope } from "@/lib/supplier-batches";

const filterKey = (scope: SupplierScope, id?: string) => `supplier-order-filter:${scope}:${id ?? ""}`;
const savedFilter = (scope: SupplierScope, id?: string) => { try { return sessionStorage.getItem(filterKey(scope, id)) ?? "all"; } catch { return "all"; } };
/** Survives switching from the purchasing/fulfilment tab to Orders. */
export function selectSupplierOrderBatch(scope: SupplierScope, id: string, batchId: string, orderId?: string) {
  try {
    sessionStorage.setItem(filterKey(scope, id), batchId);
    if (orderId) sessionStorage.setItem(`${filterKey(scope, id)}:order`, orderId);
    else sessionStorage.removeItem(`${filterKey(scope, id)}:order`);
  } catch {}
  window.dispatchEvent(new CustomEvent("supplier-order-filter", { detail: { scope, id, batchId, orderId } }));
}
export function useOrderBatches(scope: SupplierScope, groupBuyId?: string, headers?: Record<string, string>) {
  const [filter, setFilter] = useState(() => savedFilter(scope, groupBuyId));
  const readOrder = () => { try { return sessionStorage.getItem(`${filterKey(scope, groupBuyId)}:order`) ?? ""; } catch { return ""; } };
  const [requestedOrderId, setRequestedOrderId] = useState(readOrder);
  useEffect(() => {
    setFilter(savedFilter(scope, groupBuyId));
    setRequestedOrderId(readOrder());
    const listener = (event: Event) => {
      const { scope: s, id, batchId, orderId } = (event as CustomEvent).detail ?? {};
      if (s === scope && id === groupBuyId) { setFilter(batchId); setRequestedOrderId(orderId ?? ""); }
    };
    window.addEventListener("supplier-order-filter", listener);
    return () => window.removeEventListener("supplier-order-filter", listener);
  }, [scope, groupBuyId]);
  const query = useQuery({
    queryKey: supplierKey(scope, groupBuyId ?? ""),
    queryFn: () => supplierRequest(scope, groupBuyId!, "", undefined, "GET", headers),
    enabled: !!groupBuyId, staleTime: 15_000, refetchInterval: 60_000, refetchIntervalInBackground: false,
  });
  const batches = query.data?.batches.filter(b => b.state !== "released") ?? [];
  const byOrder = new Map(batches.flatMap(b => b.snapshot.orders.map(o => [o.id, b] as const)));
  useEffect(() => {
    if (query.data && filter !== "all" && filter !== "unallocated" && !batches.some(b => b.id === filter)) setFilter("all");
  }, [query.data, filter]);
  const changeFilter = (value: string) => {
    setFilter(value);
    setRequestedOrderId("");
    try { sessionStorage.setItem(filterKey(scope, groupBuyId), value); sessionStorage.removeItem(`${filterKey(scope, groupBuyId)}:order`); } catch {}
  };
  return {
    filter, setFilter: changeFilter, batches, byOrder, error: query.isError, requestedOrderId,
    matches: (id: string) => (!requestedOrderId || requestedOrderId === id) && (filter === "all" || (filter === "unallocated" ? !byOrder.has(id) : byOrder.get(id)?.id === filter)),
  };
}
export function OrderBatchFilter({ model }: {model: ReturnType<typeof useOrderBatches>}) {
  if (!model.batches.length && !model.error) return null;
  return <label className="inline-flex flex-wrap items-center gap-2 text-xs" style={{color:"var(--t-text)"}}>
    Supplier batch
    <select aria-label="Supplier batch filter" value={model.filter} onChange={e => model.setFilter(e.target.value)}
      className="rounded-lg border px-3 py-2" style={{background:"var(--t-surface)",borderColor:"var(--t-border)"}}>
      <option value="all">All batches / orders</option><option value="unallocated">Not in a batch</option>
      {model.batches.map(b => <option key={b.id} value={b.id}>{b.reference} · {b.state}</option>)}
    </select>
    {model.requestedOrderId && <button type="button" onClick={() => model.setFilter(model.filter)} className="text-blue-600 underline">Showing one linked order · Show whole batch</button>}
    {model.error && <span role="alert">Batch details could not be refreshed.</span>}
  </label>;
}
export function OrderBatchBadge({ model, orderId }: { model: ReturnType<typeof useOrderBatches>; orderId: string }) {
  const b = model.byOrder.get(orderId);
  return b ? <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold"
    style={{background:"rgba(45,107,204,.12)",color:"var(--t-blue, #2D6BCC)"}}>{b.reference} · {b.state}{b.exceptions.length ? " · Review" : ""}</span> : null;
}

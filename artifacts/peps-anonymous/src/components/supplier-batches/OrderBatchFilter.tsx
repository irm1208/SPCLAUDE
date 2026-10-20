import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supplierKey, supplierRequest, type SupplierScope } from "@/lib/supplier-batches";

export function useOrderBatches(scope: SupplierScope, groupBuyId?: string, headers?: Record<string, string>) {
  const [filter, setFilter] = useState("all");
  useEffect(() => {setFilter("all");}, [scope, groupBuyId]);
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
  return {
    filter, setFilter, batches, byOrder, error: query.isError,
    matches: (id: string) => filter === "all" || (filter === "unallocated" ? !byOrder.has(id) : byOrder.get(id)?.id === filter),
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
    {model.error && <span role="alert">Batch details could not be refreshed.</span>}
  </label>;
}
export function OrderBatchBadge({ model, orderId }: { model: ReturnType<typeof useOrderBatches>; orderId: string }) {
  const b = model.byOrder.get(orderId);
  return b ? <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold"
    style={{background:"rgba(45,107,204,.12)",color:"var(--t-blue, #2D6BCC)"}}>{b.reference} · {b.state}{b.exceptions.length ? " · Review" : ""}</span> : null;
}

import { useQuery } from "@tanstack/react-query";
import type { MemberBatchStatusData } from "./MemberBatchStatus";

/** Mounted only while an order's action menu is open. The endpoint enforces
 * membership and member visibility; stable IDs distinguish orders with reused codes. */
export function OrderBatchDetails({ groupBuyId, orderId, accountKey }: {
  groupBuyId: string; orderId: string; accountKey?: string | null;
}) {
  const query = useQuery<MemberBatchStatusData | null>({
    queryKey: ["order-card-supplier-batches", accountKey, groupBuyId],
    enabled: !!accountKey, staleTime: 0, gcTime: 0, retry: false, refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/group-buys/${encodeURIComponent(groupBuyId)}/supplier-batches`, {
        credentials: "include", signal, cache: "no-store",
      });
      if ([401, 403, 404].includes(response.status)) return null;
      if (!response.ok) throw new Error("Could not load batch details");
      return response.json();
    },
  });
  if (!accountKey) return null;
  if (query.isPending) return <p role="status" className="px-3 py-2 text-xs" style={{ color: "var(--t-muted)" }}>Checking batch…</p>;
  if (query.isError) return <div className="px-3 py-2 text-xs" style={{ color: "var(--t-muted)" }}>
    Could not load batch details.{" "}
    <button type="button" className="underline" onClick={e => { e.stopPropagation(); void query.refetch(); }}>Retry</button>
  </div>;
  const batches = query.data?.batches.filter(b => b.isYourBatch && b.orders?.some(o => o.id === orderId)) ?? [];
  if (!batches.length) return null;
  return <section aria-label="Your order’s supplier batches" className="px-3 py-2 border-b mb-1" style={{ borderColor: "var(--t-border)" }}>
    <p className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: "var(--t-muted)" }}>Supplier batch</p>
    {batches.map(batch => <div key={batch.id} className="py-1 text-xs">
      <p className="font-semibold break-words" style={{ color: "var(--t-text)" }}>{batch.reference}</p>
      <p style={{ color: "var(--t-muted)" }}>{batch.status}</p>
    </div>)}
  </section>;
}

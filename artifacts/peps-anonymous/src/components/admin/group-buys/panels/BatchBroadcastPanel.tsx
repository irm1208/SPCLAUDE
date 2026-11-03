import { useQuery } from "@tanstack/react-query";
import { BatchMessages } from "@/components/supplier-batches/BatchMessages";
import { supplierKey, supplierRequest, type SupplierData } from "@/lib/supplier-batches";

/** Share the existing batch audience, preview, delivery queue and history with Broadcast. */
export function BatchBroadcastPanel({ groupBuyId, secret }: { groupBuyId: string; secret: string }) {
  const headers = { "x-admin-secret": secret };
  const batches = useQuery({
    queryKey: supplierKey("admin", groupBuyId),
    queryFn: () => supplierRequest<SupplierData>("admin", groupBuyId, "", undefined, "GET", headers),
    refetchInterval: 15_000,
  });
  return <section className="space-y-2" data-testid="broadcast-batch-messaging">
    <h3 className="text-sm font-semibold">Supplier batch messages</h3>
    {batches.isLoading && <p className="text-xs">Loading supplier batches…</p>}
    {batches.isError && <p role="alert" className="text-xs text-red-600">
      Supplier batches could not load. <button type="button" className="underline" onClick={() => batches.refetch()}>Retry</button>
    </p>}
    {batches.data && <BatchMessages key={groupBuyId} groupBuyId={groupBuyId} batches={batches.data.batches} headers={headers} />}
  </section>;
}

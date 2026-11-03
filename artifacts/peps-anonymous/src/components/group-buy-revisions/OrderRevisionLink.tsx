import { useQuery } from "@tanstack/react-query";
export function OrderRevisionLink({ orderId, accountName }: { orderId: string; accountName: string }) {
  const { data } = useQuery({
    queryKey: ["account", "pending-order-revisions", accountName],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/account/order-revisions", { credentials: "include", signal });
      if (!response.ok) throw new Error("Could not check order change requests.");
      return response.json() as Promise<{ orderIds: string[] }>;
    },
    enabled: !!accountName, staleTime: 15_000, refetchInterval: 30_000, retry: 1,
  });
  if (!data?.orderIds.includes(orderId)) return null;
  return <a href={`/account/orders/${encodeURIComponent(orderId)}#order-changes`}
    className="mt-3 block rounded-lg px-3 py-2 text-center text-xs font-bold"
    style={{ background: "color-mix(in srgb, var(--t-blue) 12%, transparent)", color: "var(--t-blue)" }}>
    Review proposed order changes
  </a>;
}

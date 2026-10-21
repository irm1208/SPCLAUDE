import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Group = { id: string; name: string; showSupplierBatches?: boolean };
export interface MemberBatchStatusData {
  groupBuy: { id: string; name: string };
  batches: { id: string; reference: string; region: string; kits: number; status: string; isYourBatch: boolean; createdAt: string; orderedAt: string | null }[];
}
const date = (v: string) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function MemberBatchStatus({ gb, onClose }: { gb: Group; onClose: () => void }) {
  const query = useQuery<MemberBatchStatusData>({
    queryKey: ["member-supplier-batches", gb.id], staleTime: 0, gcTime: 0, refetchInterval: 30_000, retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/group-buys/${encodeURIComponent(gb.id)}/supplier-batches`, { credentials: "include", signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load batch status.");
      return data;
    },
  });
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto" style={{ color: "var(--t-text)", background: "var(--t-surface)" }}>
      <DialogHeader><DialogTitle>Batch status — {gb.name}</DialogTitle>
        <DialogDescription>Supplier batches for this group buy. “Your batch” highlights a batch containing your order.</DialogDescription></DialogHeader>
      {query.isPending ? <p role="status">Loading batches…</p>
        : query.isError ? <div role="alert"><p>{query.error.message}</p><button type="button" onClick={() => query.refetch()} className="mt-2 underline">Try again</button></div>
        : !query.data.batches.length ? <p>No supplier batches have been prepared yet.</p>
        : <>
          {!query.data.batches.some(b => b.isYourBatch) && <p className="text-sm" style={{ color: "var(--t-muted)" }}>No orders from your account are currently assigned to a listed batch.</p>}
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
            <table className="w-full text-sm text-left"><caption className="sr-only">Supplier batches and current statuses</caption>
              <thead style={{ background: "var(--t-surface2)" }}><tr>{["Batch", "Country / region", "Kits", "Status"].map(h => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{query.data.batches.map(b => <tr key={b.id} className="border-t" style={{ borderColor: "var(--t-border)", background: b.isYourBatch ? "color-mix(in srgb, var(--t-blue, #2D6BCC) 9%, transparent)" : undefined }}>
                <th scope="row" className="px-3 py-3 font-semibold whitespace-nowrap">{b.reference}
                  {b.isYourBatch && <span className="block text-xs mt-1 text-blue-600">Your batch</span>}
                  <span className="block font-normal text-xs mt-1" style={{ color: "var(--t-muted)" }}>{b.orderedAt ? `Ordered ${date(b.orderedAt)}` : `Prepared ${date(b.createdAt)}`}</span>
                </th>
                <td className="px-3 py-3">{b.region}</td><td className="px-3 py-3 tabular-nums">{b.kits.toLocaleString()}</td>
                <td className="px-3 py-3"><span className="inline-block rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: "var(--t-border)" }}>{b.status}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>This tracks the supplier batch, not final delivery to your address. Customer details and supplier tracking numbers are private. Updates refresh automatically while this window is open.</p>
    </DialogContent>
  </Dialog>;
}

/** Compact menu for the secondary Groups page, which has no shared dashboard card menu. */
export function MemberBatchMenu({ gb }: { gb: Group }) {
  const [open, setOpen] = useState(false);
  if (!gb.showSupplierBatches) return null;
  return <>
    <details className="relative">
      <summary aria-label={`More actions for ${gb.name}`} className="cursor-pointer list-none rounded-full px-2 py-1 text-white bg-white/10">⋯</summary>
      <button type="button" onClick={e => { e.currentTarget.closest("details")?.removeAttribute("open"); setOpen(true); }}
        className="absolute right-0 top-8 z-30 whitespace-nowrap rounded-lg px-3 py-2 text-sm bg-slate-900 text-white shadow-lg">View batches</button>
    </details>
    {open && <MemberBatchStatus gb={gb} onClose={() => setOpen(false)} />}
  </>;
}

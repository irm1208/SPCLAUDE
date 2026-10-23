import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Group = { id: string; name: string; showSupplierBatches?: boolean };
export interface MemberBatchStatusData {
  groupBuy: { id: string; name: string };
  regions?: { id: string; name: string; kits: number; targetKits: number; status: string; yourOrderStatus?: "included" | "waiting" | "not_included" }[];
  countryRequired?: boolean;
  directShipping?: boolean;
  directShippingOnly?: boolean;
  batches: { id: string; reference: string; region: string; kits: number; targetKits?: number | null; status: string; isYourBatch: boolean; createdAt: string; orderedAt: string | null }[];
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
  const ownBatches = query.data?.batches.filter(b => b.isYourBatch) ?? [];
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto" style={{ color: "var(--t-text)", background: "var(--t-surface)" }}>
      <DialogHeader><DialogTitle>Batch status — {gb.name}</DialogTitle>
        <DialogDescription className={query.data?.directShippingOnly ? "sr-only" : undefined}>{query.data?.directShippingOnly ? "Your order uses direct shipping." : "See your region’s batch progress and which batch includes your order."}</DialogDescription></DialogHeader>
      {query.isPending ? <p role="status">Loading batches…</p>
        : query.isError ? <div role="alert"><p>{query.error.message}</p><button type="button" onClick={() => query.refetch()} className="mt-2 underline">Try again</button></div>
        : <>
          {query.data.directShipping && <div className="rounded-lg border p-4" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
            <h3 className="font-semibold">Direct shipping</h3>
          </div>}
          {!query.data.directShippingOnly && <>
          {query.data.countryRequired ? <p>Set your country in your account profile to see your region’s batch progress.</p>
            : <>
              {!!query.data.regions?.length && <section aria-label="Regional batch progress" className="space-y-3">
                {query.data.regions.map(region => <div key={region.id} className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface2)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{region.name} — Current batch</h3>
                    <span className="rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: "var(--t-border)" }}>{region.status}</span>
                  </div>
                  {region.yourOrderStatus === "included" && <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--t-blue)", background: "color-mix(in srgb, var(--t-blue) 9%, transparent)" }}>
                    <p className="font-semibold">Your order is in this batch</p>
                    <p>Your paid order is included here. This batch has not been ordered from the supplier yet.</p>
                  </div>}
                  {region.yourOrderStatus === "waiting" && <p className="text-sm">Your order is waiting for a later batch. The current batch has reached its target.</p>}
                  {region.yourOrderStatus === "not_included" && <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                    {ownBatches.length ? "Your assigned supplier batch is listed below."
                      : "Your order is not included in this filling batch. Only fully paid, eligible orders are included; Direct Shipping orders are separate."}
                  </p>}
                  <p className="text-lg font-bold tabular-nums">{region.kits.toLocaleString()} / {region.targetKits.toLocaleString()} kits</p>
                  <div role="progressbar" aria-label={`${region.name} batch progress`} aria-valuemin={0} aria-valuemax={region.targetKits}
                    aria-valuenow={Math.min(region.kits, region.targetKits)} aria-valuetext={`${region.kits} of ${region.targetKits} kits`}
                    className="h-2 overflow-hidden rounded-full" style={{ background: "var(--t-border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, region.kits / region.targetKits * 100)}%`, background: "var(--t-blue)" }} />
                  </div>
                </div>)}
                <p className="text-xs" style={{ color: "var(--t-muted)" }}>Fully paid kits queued for your region. Orders stay together, so a batch can exceed its target. Contents are finalised when the organiser prepares the batch. Ready means the target is reached, not that the supplier order has been placed.</p>
              </section>}
              {!query.data.regions?.length && !ownBatches.length && <p>No batch region is available for your destination yet.</p>}
            </>}
          {!query.data.countryRequired && (!ownBatches.length ? <p>Your order has not been assigned to a supplier batch yet.</p> : <>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
            <table className="w-full text-sm text-left"><caption className="sr-only">Supplier batches and current statuses</caption>
              <thead style={{ background: "var(--t-surface2)" }}><tr>{["Batch", "Country / region", "Kits", "Status"].map(h => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{ownBatches.map(b => <tr key={b.id} className="border-t" style={{ borderColor: "var(--t-border)", background: b.isYourBatch ? "color-mix(in srgb, var(--t-blue, #2D6BCC) 9%, transparent)" : undefined }}>
                <th scope="row" className="px-3 py-3 font-semibold whitespace-nowrap">{b.reference}
                  {b.isYourBatch && <span className="block text-xs mt-1 text-blue-600">Your batch</span>}
                  <span className="block font-normal text-xs mt-1" style={{ color: "var(--t-muted)" }}>{b.orderedAt ? `Ordered ${date(b.orderedAt)}` : `Prepared ${date(b.createdAt)}`}</span>
                </th>
                <td className="px-3 py-3">{b.region}</td><td className="px-3 py-3 tabular-nums">{b.kits.toLocaleString()}{b.targetKits != null ? ` / ${b.targetKits.toLocaleString()}` : ""}</td>
                <td className="px-3 py-3"><span className="inline-block rounded-full border px-2 py-1 text-xs font-medium" style={{ borderColor: "var(--t-border)" }}>{b.status}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
          </>)}
          </>}
        </>}
      {!query.data?.directShippingOnly && <p className="text-xs" style={{ color: "var(--t-muted)" }}>This tracks the supplier batch, not final delivery to your address. Customer details and supplier tracking numbers are private. Updates refresh automatically while this window is open.</p>}
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

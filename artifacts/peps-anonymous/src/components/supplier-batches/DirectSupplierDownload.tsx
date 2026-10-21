import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { downloadSupplierTxt, supplierRequest } from "@/lib/supplier-batches";

type Order = { id: string; code: string; username: string; country: string; kits: number };
export function DirectSupplierDownload({ groupBuyId, headers }: { groupBuyId: string; headers?: Record<string, string> }) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const q = useQuery({ queryKey: ["supplier-direct-download", groupBuyId], enabled: open, staleTime: 0,
    queryFn: () => supplierRequest<{ orders: Order[] }>("admin", groupBuyId, "/direct-orders", undefined, "GET", headers) });
  const orders = q.data?.orders ?? [];
  const visible = selected.filter(id => orders.some(o => o.id === id));
  const download = async () => {
    setBusy(true); setError("");
    try { await downloadSupplierTxt(groupBuyId, { orderIds: visible }, headers); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
    <button type="button" onClick={() => setOpen(!open)} className="text-sm font-semibold">Direct orders — supplier TXT {open ? "▴" : "▾"}</button>
    {open && <>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Fully paid direct orders only, separate from regional batches. Uses each customer’s delivery details and FS3 supplier costs. Downloading does not process orders.</p>
      <button type="button" disabled={busy || q.isFetching} onClick={() => q.refetch()} className="text-xs underline">Refresh orders</button>
      {q.isFetching ? <p role="status">Loading direct orders…</p> : q.isError ? <p role="alert">Could not load orders. Please refresh.</p> : <>
        {orders.length === 0 ? <p className="text-xs">No eligible direct orders.</p> : <>
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={visible.length === orders.length} onChange={e => setSelected(e.target.checked ? orders.map(o => o.id) : [])} />Select all eligible direct orders</label>
          <div className="max-h-64 overflow-auto space-y-2">{orders.map(o => <label key={o.id} className="flex gap-2 text-xs">
            <input type="checkbox" checked={visible.includes(o.id)} onChange={e => setSelected(s => e.target.checked ? [...s, o.id] : s.filter(id => id !== o.id))} />
            #{o.code} · @{o.username} · {o.country} · {o.kits} kits
          </label>)}</div>
          <button type="button" onClick={download} disabled={busy || visible.length === 0 || visible.length > 500} className="rounded-lg bg-[#1B3A7A] text-white px-4 py-2 text-xs disabled:opacity-50">{busy ? "Preparing…" : `Download selected TXT (${visible.length})`}</button>
          {visible.length > 500 && <p role="alert" className="text-xs">Download up to 500 direct orders at a time.</p>}
        </>}
      </>}
      {error && <p role="alert" className="text-xs text-red-600 whitespace-pre-wrap">{error}</p>}
    </>}
  </section>;
}

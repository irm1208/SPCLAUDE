import { useEffect, useRef, useState } from "react";
import { enrichForSlip, shipmentNotesFor, SlipShipmentNotes, postageLabel, type ShipmentContextOrder } from "./ShipmentContext";
import type { CombinedPrintOrder } from "./CombinedOrderShipping";

type PrintOrder = CombinedPrintOrder & { supplierBatchReferences?: string[]; shipmentNotes?: string[] };
export function ReceiptShipmentActions({ orders, visibleOrders, fetcher, path, onPrint, onUpdated, error }: {
  orders: ShipmentContextOrder[];
  visibleOrders: PrintOrder[];
  fetcher: (path: string, opts?: RequestInit) => Promise<Response>;
  path: string;
  onPrint: (order: PrintOrder) => void;
  onUpdated: (id: string) => void;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const scope = useRef(path);
  scope.current = path;
  useEffect(() => {
    setSelected(null); setMessage(null); setBusy(false);
    return () => controller.current?.abort();
  }, [path]);
  const byId = new Map(orders.map(o => [o.id, o]));
  const ready = orders.filter(o => o.relatedOrderIds.length && o.shipmentOrderIds.length === 1
    && !["Shipped", "Completed", "Cancelled"].includes(o.status) && !o.readiness && !o.reviewReason
    && visibleOrders.some(v => v.id === o.id));
  const review = ready.find(o => o.id === selected);
  const printOrder = (o: ShipmentContextOrder) => enrichForSlip(visibleOrders.find(v => v.id === o.id)!, byId);
  const dispatch = async () => {
    if (!review || busy || error) return;
    const id = review.id, current = path;
    controller.current?.abort();
    const c = new AbortController(); controller.current = c;
    setBusy(true); setMessage(null);
    try {
      const response = await fetcher(`${path}/mark-orders-shipped`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: c.signal, body: JSON.stringify({ orderIds: [id], expectedAllocations: review.allocationToken ? { [id]: review.allocationToken } : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Dispatch failed. Reload the batch details.");
      if (c.signal.aborted || scope.current !== current) return;
      setSelected(null);
      setMessage(`Order #${review.code} marked shipped. Linked orders in other shipments were not changed.`);
      onUpdated(id);
    } catch (e) {
      if (!c.signal.aborted && scope.current === current) setMessage(e instanceof Error ? e.message : "Dispatch failed.");
    } finally {
      if (!c.signal.aborted && scope.current === current) setBusy(false);
    }
  };
  if (!ready.length) return null;
  return <section className="space-y-2 rounded-xl border border-blue-200 p-3" aria-label="Batch shipments ready to pack">
    <h3 className="font-bold text-sm">Batch shipments ready to pack</h3>
    <p className="text-xs text-muted-foreground">These linked orders ship separately. All usable kits are confirmed against their exact supplier-batch receipts.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
    {ready.map(o => <div key={o.id} className="rounded-lg border p-3 text-xs space-y-2">
      <p className="font-semibold">#{o.code} · {o.batches.map(b => `${b.reference} · ${b.kits} kits`).join(", ")}</p>
      <p>Pack this shipment: {o.lineItems.map(l => `${l.quantity} × ${l.productName}`).join(", ")}</p>
      <p>{postageLabel(o.shippingTotal, o.currency)}</p>
      <SlipShipmentNotes notes={shipmentNotesFor(o, byId)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!error} className="rounded-lg border px-3 py-2" onClick={() => onPrint(printOrder(o))}>Print packing slip</button>
        <button type="button" disabled={!!error || busy} className="rounded-lg bg-[#1B3A7A] px-3 py-2 text-white" onClick={() => { setSelected(o.id); setMessage(null); }}>Review &amp; dispatch</button>
      </div>
    </div>)}
    {review && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-label={`Review shipment ${review.code}`} className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 text-[#0F1F38] space-y-3">
        <h3 className="font-bold">Pack this shipment — #{review.code}</h3>
        <p className="text-sm">{review.batches.map(b => b.reference).join(", ")}</p>
        <ul className="text-sm">{review.lineItems.map((l, i) => <li key={i}>{l.quantity} × {l.productName}</li>)}</ul>
        <SlipShipmentNotes notes={shipmentNotesFor(review, byId)} />
        <p className="text-sm">Confirm only after posting this parcel. This updates this order only; it does not mark any separate addition shipped.</p>
        {message && <p role="alert" className="text-red-700">{message}</p>}
        <div className="flex gap-2">
          <button className="rounded-lg border px-3 py-2" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
          <button className="rounded-lg bg-[#1B3A7A] px-3 py-2 text-white" disabled={busy || !!error} onClick={() => void dispatch()}>{busy ? "Saving…" : "Confirm shipped"}</button>
        </div>
      </section>
    </div>}
  </section>;
}

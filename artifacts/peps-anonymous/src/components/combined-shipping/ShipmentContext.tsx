import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Link2, PackageCheck, RefreshCw } from "lucide-react";

export interface ShipmentBatch {
  id: string;
  reference: string;
  state: string;
  kits: number;
  items: { productId: string; productName: string; quantity: number }[];
}
export interface ShipmentContextOrder {
  id: string;
  code: string;
  additionOfOrderId: string | null;
  status: string;
  paymentStatus: string;
  amountDue: number;
  shippingTotal: number;
  currency: string;
  lineItems: { productName: string; quantity: number }[];
  batches: ShipmentBatch[];
  allocationComplete: boolean;
  readiness: string | null;
  relatedOrderIds: string[];
  shipmentOrderIds: string[];
  separateOrderIds: string[];
  reviewReason: string | null;
  allocationToken?: string;
}
type Fetcher = (path: string, opts?: RequestInit) => Promise<Response>;

/** "all" | "unallocated" | "multi" | batch id */
export function matchesShipmentBatch(order: ShipmentContextOrder, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "unallocated") return order.batches.length === 0;
  if (filter === "multi") return order.batches.length > 1;
  return order.batches.some(b => b.id === filter);
}

export function postageLabel(total: number, currency: string): string {
  if (!Number(total)) return "No extra postage charged";
  return `Postage ${currency} ${Number(total).toFixed(2)}`;
}

const paid = (s: string) => /^(confirmed|test_confirmed)$/i.test(s);
const shipped = (s: string) => /^(shipped|completed)$/i.test(s);

export function useShipmentContext(path: string | null, fetcher: Fetcher, pollMs = 30_000) {
  const [orders, setOrders] = useState<ShipmentContextOrder[]>([]);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    try {
      const r = await fetchRef.current(p, { signal: c.signal });
      const body = await r.json().catch(() => null);
      if (c.signal.aborted || pathRef.current !== p) return;
      if (!r.ok) throw new Error((body && (body.error || body.message)) || `Could not load shipment details (${r.status}).`);
      setOrders(Array.isArray(body?.orders) ? body.orders : []);
      setLoadedPath(p);
      setError(null);
    } catch (e) {
      if (c.signal.aborted || pathRef.current !== p) return;
      setError(e instanceof Error ? e.message : "Could not load shipment details.");
      setLoadedPath(p);
    } finally {
      if (!c.signal.aborted && pathRef.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrders([]); setError(null); setLoadedPath(null);
    if (!path) { ctrl.current?.abort(); setLoading(false); return; }
    void refresh();
    const iv = window.setInterval(() => void refresh(), pollMs);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(iv); window.removeEventListener("focus", focus); ctrl.current?.abort(); };
  }, [path, pollMs, refresh]);

  const scopedOrders = useMemo(() => loadedPath === path ? orders : [], [loadedPath, path, orders]);
  const byId = useMemo(() => new Map(scopedOrders.map(o => [o.id, o])), [scopedOrders]);
  return { orders: scopedOrders, byId, loading: loading || (!!path && loadedPath !== path), error: loadedPath === path ? error : null, refresh };
}

/** Separate IDs plus any already-shipped relatives (even same batch): never packed now. */
export function separateIdsFor(order: ShipmentContextOrder, byId: Map<string, ShipmentContextOrder>): string[] {
  const ids = new Set(order.separateOrderIds);
  order.relatedOrderIds.forEach(id => { if (id !== order.id && shipped(byId.get(id)?.status ?? "")) ids.add(id); });
  return [...ids];
}

/** Applies a batch filter to a host list; orders without context only match "all". */
export function filterByShipmentBatch<T extends { id: string }>(list: T[], byId: Map<string, ShipmentContextOrder>, filter: string): T[] {
  if (filter === "all") return list;
  return list.filter(o => { const c = byId.get(o.id); return !!c && matchesShipmentBatch(c, filter); });
}

/** Fail closed: linked or unknown orders cannot be printed/dispatched while context is stale. */
export function linkedBlockReason(id: string, byId: Map<string, ShipmentContextOrder>, error: string | null): string | null {
  const c = byId.get(id);
  if (error && (!c || c.relatedOrderIds.length > 0)) return "Linked shipment details could not be refreshed. Retry before printing or dispatching.";
  if (c && c.relatedOrderIds.length > 0 && c.reviewReason) return `Review needed: ${c.reviewReason}`;
  if (c?.shipmentOrderIds.length && c.shipmentOrderIds.length > 1 && !shipped(c.status)) return "Use Linked orders to print and dispatch this same-batch shipment together.";
  if (c?.relatedOrderIds.length && c.readiness && !shipped(c.status)) return c.readiness;
  if (c?.reviewReason === "Linked shipment access requires staff review." || c?.reviewReason?.startsWith("Original order unavailable")) return c.reviewReason;
  return null;
}

/** Adds per-batch references with quantities and not-in-this-parcel notes for slips. */
export function enrichForSlip<T extends { id: string; supplierBatchReferences?: string[]; shipmentNotes?: string[] }>(o: T, byId: Map<string, ShipmentContextOrder>): T {
  const c = byId.get(o.id);
  if (!c) return o;
  const refs = c.batches.map(b => `${b.reference} (${b.items.map(i => `${i.quantity} × ${i.productName}`).join(", ") || `${b.kits} kits`})`);
  const notes = shipmentNotesFor(c, byId);
  return { ...o, supplierBatchReferences: refs.length ? refs : o.supplierBatchReferences, shipmentNotes: notes.length ? notes : o.shipmentNotes };
}

export function ShipmentOrderBadges({ orderId, byId }: { orderId: string; byId: Map<string, ShipmentContextOrder> }) {
  const c = byId.get(orderId);
  if (!c) return null;
  const parent = c.additionOfOrderId ? byId.get(c.additionOfOrderId) : undefined;
  const cls = "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold";
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid={`badges-shipment-${orderId}`}>
      {c.batches.length === 0
        ? <span className={`${cls} bg-slate-100 text-slate-700`}>Not in a batch</span>
        : c.batches.map(b => <span key={b.id} className={`${cls} bg-[#EEF3FB] text-[#2D6BCC]`}>{b.reference} · {b.kits} kit{b.kits === 1 ? "" : "s"}</span>)}
      {c.additionOfOrderId && <span className={`${cls} bg-amber-50 text-amber-900`}>Addition to {parent?.code ?? "original order"}</span>}
      {!c.additionOfOrderId && c.relatedOrderIds.length > 0 && <span className={`${cls} bg-amber-50 text-amber-900`}>Original · {c.relatedOrderIds.length} linked</span>}
      {separateIdsFor(c, byId).length > 0 && <span className={`${cls} border border-dashed border-[#C8D4E0] text-[#526274]`}>Separate shipment exists</span>}
      {c.reviewReason && <span className={`${cls} bg-red-50 text-red-800`}>Review</span>}
    </span>
  );
}

/** Separate-shipment notes for a packing slip: never items to pack. */
export function shipmentNotesFor(order: ShipmentContextOrder | undefined, byId: Map<string, ShipmentContextOrder>): string[] {
  if (!order) return [];
  const notes = separateIdsFor(order, byId).map(id => {
    const o = byId.get(id);
    if (!o) return "A linked order ships separately";
    const refs = o.batches.map(b => b.reference).join(", ");
    return `${o.code} ${shipped(o.status) ? "already shipped" : "ships separately"}${refs ? ` (batch ${refs})` : " (not in a batch)"}`;
  });
  if (order.reviewReason) notes.push(`Review: ${order.reviewReason}`);
  return notes;
}

export function SlipShipmentNotes({ notes }: { notes?: string[] }) {
  if (!notes?.length) return null;
  return (
    <div className="slip-not-in-parcel" style={{ border: "1.5px dashed #111", borderRadius: 4, padding: "4px 6px", marginTop: 6, fontSize: 10, color: "#111" }}>
      <div style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>Not in this parcel — do not pack</div>
      {notes.map((n, i) => <div key={i} className="slip-note">{n}</div>)}
    </div>
  );
}

function OrderLine({ o, byId, onJump }: { o: ShipmentContextOrder; byId: Map<string, ShipmentContextOrder>; onJump?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const parent = o.additionOfOrderId ? byId.get(o.additionOfOrderId) : undefined;
  const kits = o.lineItems.reduce((s, li) => s + (Number(li.quantity) || 0), 0);
  const ref = (id: string) => byId.get(id)?.code ?? "Linked order";
  return (
    <div className="rounded-lg border border-[#E1E8EF] bg-white" data-testid={`shipment-order-${o.id}`}>
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-xs"
        data-testid={`button-expand-shipment-${o.id}`} aria-expanded={open}>
        <span className="font-mono font-bold text-[#0F1F38]">{o.code}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.additionOfOrderId ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-[#1B3A7A]"}`}>
          {o.additionOfOrderId ? `Addition to ${parent?.code ?? "original order"}` : o.relatedOrderIds.length ? "Original" : "Single order"}
        </span>
        {o.batches.length === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Not in a batch</span>}
        {o.batches.map(b => <span key={b.id} className="rounded-full bg-[#EEF3FB] px-2 py-0.5 text-[10px] font-semibold text-[#2D6BCC]">{b.reference} · {b.kits} kit{b.kits === 1 ? "" : "s"}</span>)}
        <span className="text-[#6B7280]">{kits} item{kits === 1 ? "" : "s"} · {o.status} · {paid(o.paymentStatus) ? "Paid" : `Not paid${o.amountDue ? ` · ${o.currency} ${Number(o.amountDue).toFixed(2)} due` : ""}`}</span>
        <span className="text-[#6B7280]">{postageLabel(o.shippingTotal, o.currency)}</span>
        <span className="ml-auto">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {(o.reviewReason || o.readiness) && (
        <p className="mx-3 mb-2 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{[o.reviewReason && `Review: ${o.reviewReason}`, o.readiness && `Blocker: ${o.readiness}`].filter(Boolean).join(" · ")}</span>
        </p>
      )}
      {open && (
        <div className="space-y-2 border-t border-[#E7EDF3] px-3 py-2 text-[11px] text-[#374151]">
          {o.batches.length > 1 && <p className="font-semibold text-amber-900">Spans {o.batches.length} batches — quantities below are per allocation.</p>}
          {o.batches.map(b => (
            <div key={b.id}>
              <p className="font-semibold text-[#1B3A7A]">{b.reference} · {b.state}</p>
              <ul className="ml-3 list-disc">{b.items.map((it, i) => <li key={i}>{it.quantity} × {it.productName}</li>)}</ul>
            </div>
          ))}
          {o.batches.length === 0 && <p>No supplier allocation yet. Ordered: {o.lineItems.map(li => `${li.quantity} × ${li.productName}`).join(", ") || "no items"}</p>}
          <p className="text-[10px] text-[#8A9AAA]">Readiness reflects known blockers only; check goods are physically received before packing.</p>
        </div>
      )}
      {(o.shipmentOrderIds.length > 1 || separateIdsFor(o, byId).length > 0 || o.relatedOrderIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 text-[11px]">
          {o.shipmentOrderIds.length > 1 && (
            <span className="rounded-md bg-green-50 px-2 py-0.5 font-semibold text-green-800">Pack this shipment: {o.shipmentOrderIds.map(ref).join(" + ")}</span>
          )}
          {separateIdsFor(o, byId).map(id => (
            <span key={id} className="rounded-md border border-dashed border-[#C8D4E0] px-2 py-0.5 text-[#526274]">
              Separate shipment — {shipped(byId.get(id)?.status ?? "") ? "already shipped" : "another batch"}: {ref(id)}
            </span>
          ))}
          {onJump && o.relatedOrderIds.map(id => (
            <button key={id} type="button" onClick={() => onJump(id)} className="inline-flex items-center gap-1 font-semibold text-[#2D6BCC] underline underline-offset-2"
              data-testid={`button-jump-order-${id}`}>
              <Link2 size={12} /> Open {ref(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShipmentOrderReview({ orderId, byId, onJump }: {
  orderId: string; byId: Map<string, ShipmentContextOrder>; onJump?: (id: string) => void;
}) {
  const o = byId.get(orderId);
  return o?.relatedOrderIds.length ? <OrderLine o={o} byId={byId} onJump={onJump} /> : null;
}

export function ShipmentContextPanel({ path, fetcher, context, filter: controlledFilter, onJump, onBatchChange, title = "Linked orders & batches" }: {
  /** Controlled batch filter owned by the host list. */
  filter?: string;
  path: string | null;
  fetcher: Fetcher;
  /** Pass a shared hook result to avoid a second request. */
  context?: ReturnType<typeof useShipmentContext>;
  onJump?: (orderId: string) => void;
  onBatchChange?: (batchId: string) => void;
  title?: string;
}) {
  const own = useShipmentContext(context ? null : path, fetcher);
  const { orders, byId, loading, error, refresh } = context ?? own;
  const [ownFilter, setFilter] = useState("all");
  const filter = controlledFilter ?? ownFilter;
  const [open, setOpen] = useState(true);
  useEffect(() => { setFilter("all"); }, [path]);
  const batches = useMemo(() => {
    const m = new Map<string, ShipmentBatch>();
    orders.forEach(o => o.batches.forEach(b => m.set(b.id, b)));
    return [...m.values()];
  }, [orders]);
  const relevant = orders.filter(o => o.relatedOrderIds.length > 0 || o.reviewReason || o.batches.length !== 1);
  const shown = relevant.filter(o => matchesShipmentBatch(o, filter));

  if (!path) return null;
  return (
    <section className="rounded-xl border border-[#D0DAE4] bg-[#F8FAFC] p-3" data-testid="panel-shipment-context">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-sm font-bold text-[#0F1F38]" data-testid="button-toggle-shipment-context">
          <PackageCheck size={15} className="text-[#2D6BCC]" /> {title}
          <span className="text-xs font-medium text-[#6B7280]">({relevant.length})</span>
        </button>
        <select value={filter} onChange={e => { setFilter(e.target.value); onBatchChange?.(e.target.value); }} aria-label="Shipment batch filter"
          className="ml-auto rounded-lg border border-[#D0DAE4] bg-white px-2 py-1 text-xs" data-testid="select-shipment-batch">
          <option value="all">All batches</option>
          <option value="unallocated">Not in a batch</option>
          <option value="multi">Multiple batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.reference} · {b.state}</option>)}
        </select>
        <button type="button" onClick={() => void refresh()} className="rounded-lg border border-[#D0DAE4] bg-white p-1.5" aria-label="Refresh shipment details" data-testid="button-refresh-shipment-context">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle size={14} /> {error}
          <button type="button" onClick={() => void refresh()} className="ml-auto font-semibold underline" data-testid="button-retry-shipment-context">Try again</button>
        </div>
      )}
      {open && (
        <div className="mt-2 space-y-1.5">
          {loading && orders.length === 0 && [0, 1].map(i => <div key={i} className="h-9 animate-pulse rounded-lg bg-[#E7EDF3]" />)}
          {!loading && !error && shown.length === 0 && (
            <p className="py-2 text-center text-xs text-[#6B7280]">No linked, unallocated or multi-batch orders{filter !== "all" ? " for this filter" : ""}.</p>
          )}
          {shown.map(o => <OrderLine key={o.id} o={o} byId={byId} onJump={onJump} />)}
        </div>
      )}
    </section>
  );
}

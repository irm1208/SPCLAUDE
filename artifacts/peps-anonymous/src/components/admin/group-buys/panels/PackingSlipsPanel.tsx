import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { PrintModal, type DispatchOrder } from "@/components/AdminDispatch";
import { COUNTRY_LIST } from "@/data/countries";

const countryNames = new Map(COUNTRY_LIST.map(c => [c.code.toLowerCase(), c.name]));
function country(order: DispatchOrder) {
  const raw = order.shippingCountry?.trim() ?? "";
  return countryNames.get(raw.toLowerCase() === "uk" ? "gb" : raw.toLowerCase()) ?? raw;
}
function reshipper(order: DispatchOrder) {
  return (order.reshipperUsername ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function PackingSlipsPanel({ secret, groupBuyId, groupBuyName }: {
  secret: string; groupBuyId: string; groupBuyName: string;
}) {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [countryFilter, setCountryFilter] = useState("");
  const [reshipperFilter, setReshipperFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setOrders([]);
    setSelected(new Set());
    setPrinting(false);
    setLoading(true);
    setError("");
    async function load() {
      const all: DispatchOrder[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({ groupBuyId, page: String(page), pageSize: "500" });
        const response = await fetch(`/api/admin/orders?${params}`, {
          headers: { "x-admin-secret": secret }, credentials: "omit", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load orders");
        if (!Array.isArray(data.orders)) throw new Error("Invalid orders response");
        all.push(...data.orders);
        totalPages = Number(data.pagination?.totalPages ?? 1);
        page++;
      } while (page <= totalPages);
      if (!controller.signal.aborted) {
        setOrders([...new Map(all.filter(o => o.status !== "Cancelled").map(o => [o.id, o])).values()]);
      }
    }
    load().catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load orders");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, groupBuyId, revision]);

  // Changing filters must never leave hidden orders selected for printing.
  useEffect(() => { setSelected(new Set()); setPrinting(false); }, [countryFilter, reshipperFilter, statusFilter, groupBuyId]);
  const countries = useMemo(() => [...new Set(orders.map(country).filter(Boolean))].sort(), [orders]);
  const reshippers = useMemo(() => [...new Set(orders.map(reshipper).filter(Boolean))].sort(), [orders]);
  const filtered = useMemo(() => orders.filter(order =>
    (!countryFilter || country(order) === countryFilter)
    && (!reshipperFilter || (reshipperFilter === "__none__" ? !reshipper(order) : reshipper(order) === reshipperFilter))
    && (statusFilter === "all" || !["Shipped", "Completed"].includes(order.status))
  ), [orders, countryFilter, reshipperFilter, statusFilter]);
  const printOrders = filtered.filter(order => selected.has(order.id));
  const fieldClass = "h-10 rounded-lg border border-input bg-background px-3 text-sm";
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Packing slips</h3>
        <p className="text-sm text-muted-foreground">Print directly from this group buy, with or without an assigned reshipper. Printing does not mark orders as dispatched or notify members.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background p-4">
        <label className="grid gap-1 text-xs font-medium">Country
          <select aria-label="Country" className={fieldClass} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
            <option value="">All countries</option>
            {countries.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Reshipper
          <select aria-label="Reshipper" className={fieldClass} value={reshipperFilter} onChange={e => setReshipperFilter(e.target.value)}>
            <option value="">All reshippers / unassigned</option>
            <option value="__none__">No assigned reshipper</option>
            {reshippers.map(name => <option key={name} value={name}>@{name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">Status
          <select aria-label="Status" className={fieldClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="pending">Not dispatched</option>
            <option value="all">All orders</option>
          </select>
        </label>
        <button type="button" aria-label="Refresh orders" className={`${fieldClass} flex items-center gap-2`} disabled={loading} onClick={() => setRevision(v => v + 1)}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 p-3 text-xs">
          <span>{filtered.length} orders · {printOrders.length} selected</span>
          <button type="button" disabled={loading || !!error} onClick={() => setSelected(new Set(filtered.map(o => o.id)))} className="font-semibold underline disabled:opacity-50">Select all filtered</button>
          <button type="button" onClick={() => setSelected(new Set())} className="underline">Clear</button>
          <button type="button" disabled={loading || !!error || printOrders.length === 0} onClick={() => setPrinting(true)}
            className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print Packing Slips ({printOrders.length})
          </button>
        </div>
        {loading ? <p className="flex items-center gap-2 p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders…</p>
          : filtered.length === 0 ? <p className="p-4 text-sm text-muted-foreground">{error ? "Orders could not be loaded." : "No orders match these filters."}</p>
          : <div className="max-h-[32rem] divide-y divide-border overflow-y-auto">
            {filtered.map(order => <label key={order.id} className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-muted/30">
              <input type="checkbox" className="mt-1" checked={selected.has(order.id)} aria-label={`Select order ${order.code || order.id}`}
                onChange={() => setSelected(prev => { const next = new Set(prev); next.has(order.id) ? next.delete(order.id) : next.add(order.id); return next; })} />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">#{order.code || order.id}</span> {order.telegramUsername && <span>@{order.telegramUsername.replace(/^@/, "")}</span>}
                <span className="block break-words text-xs text-muted-foreground">{order.shippingName} · {country(order) || "Country not provided"} · {reshipper(order) ? `@${reshipper(order)}` : "No assigned reshipper"}</span>
              </span>
              <span className="text-xs text-muted-foreground">{order.status}</span>
            </label>)}
          </div>}
      </div>
      {printing && printOrders.length > 0 && <PrintModal orders={printOrders} gbName={groupBuyName} onClose={() => setPrinting(false)} />}
    </div>
  );
}

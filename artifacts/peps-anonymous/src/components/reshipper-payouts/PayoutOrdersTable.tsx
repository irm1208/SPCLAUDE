import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PayoutOrder, PayoutStatus } from "../../lib/reshipper-payouts";
import { fmt, STATUS_LABEL, STATUS_TONE } from "./money";
import { inputCls, inputStyle, subtle } from "./ui";

export type Draft = { admin: string; postage: string };
type Filter = "all" | PayoutStatus;
const FILTERS: [Filter, string][] = [["all", "All"], ["owed", "Owed"], ["part_paid", "Part-paid"], ["paid", "Paid"], ["needs_review", "Needs review"], ["not_owed", "Not owed"]];

export function PayoutOrdersTable({ orders, canSelect, selection, onSelectionChange }: {
  orders: PayoutOrder[]; canSelect: boolean;
  selection: Record<string, Draft>; onSelectionChange: (next: Record<string, Draft>) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => (filter === "all" || o.status === filter) &&
      (!q || o.code.toLowerCase().includes(q) || o.member.toLowerCase().includes(q)));
  }, [orders, query, filter]);
  const selectedIds = Object.keys(selection);
  const lockCurrency = selectedIds.length ? orders.find(o => o.orderId === selectedIds[0])?.currency ?? null : null;
  const selectable = (o: PayoutOrder) => canSelect && o.eligible && (!lockCurrency || o.currency === lockCurrency);
  const bulkCurrency = lockCurrency ?? visible.find(o => canSelect && o.eligible)?.currency ?? null;
  const bulkRows = visible.filter(o => canSelect && o.eligible && o.currency === bulkCurrency);
  const allChecked = bulkRows.length > 0 && bulkRows.every(o => selection[o.orderId]);

  const defaults = (o: PayoutOrder): Draft => ({ admin: (o.remainingAdminMinor / 100).toFixed(2), postage: (o.remainingPostageMinor / 100).toFixed(2) });
  const toggle = (o: PayoutOrder) => {
    const next = { ...selection };
    if (next[o.orderId]) delete next[o.orderId]; else next[o.orderId] = defaults(o);
    onSelectionChange(next);
  };
  const toggleAll = () => {
    const next = { ...selection };
    bulkRows.forEach(o => { if (allChecked) delete next[o.orderId]; else if (!next[o.orderId]) next[o.orderId] = defaults(o); });
    onSelectionChange(next);
  };
  const edit = (id: string, key: keyof Draft, v: string) => onSelectionChange({ ...selection, [id]: { ...selection[id], [key]: v } });

  return <div className="space-y-3">
    <div className="flex flex-col sm:flex-row gap-2">
      <label className="relative flex-1">
        <span className="sr-only">Search order code or member</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={subtle} />
        <input type="search" className={inputCls + " pl-9"} style={inputStyle} placeholder="Search order code or member" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
        {FILTERS.map(([f, label]) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
          className="min-h-[36px] rounded-full px-3 text-xs font-semibold border"
          style={filter === f ? { background: "var(--t-blue-deep, #1B3A7A)", color: "#fff", borderColor: "transparent" } : { borderColor: "var(--t-border)", color: "var(--t-text)" }}>{label}</button>)}
      </div>
    </div>
    {canSelect && <div className="flex flex-wrap items-center gap-3 text-xs" style={subtle}>
      <label className="inline-flex items-center gap-2 min-h-[32px]">
        <input type="checkbox" checked={allChecked} disabled={!bulkRows.length} onChange={toggleAll} aria-label="Select all visible eligible orders" />
        Select all visible eligible{bulkCurrency ? ` (${bulkCurrency.toUpperCase()})` : ""}
      </label>
      {selectedIds.length > 0 && <span>{selectedIds.length} selected · {lockCurrency?.toUpperCase()} only</span>}
      {selectedIds.length > 0 && <button type="button" className="underline" onClick={() => onSelectionChange({})}>Clear</button>}
    </div>}
    {visible.length === 0
      ? <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
          {orders.length ? "No orders match this search or filter." : "No orders with admin fees or postage yet."}
        </div>
      : <ul className="space-y-2" aria-label="Payout orders">
        {visible.map(o => {
          const sel = selection[o.orderId];
          return <li key={o.orderId} className="rounded-xl border p-3" style={{ borderColor: sel ? "var(--t-blue)" : "var(--t-border)", background: "var(--t-surface)" }}>
            <div className="flex flex-wrap items-start gap-3">
              {canSelect && <input type="checkbox" className="mt-1" checked={!!sel} disabled={!selectable(o) && !sel}
                aria-label={`Select order ${o.code}`} onChange={() => toggle(o)} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{o.code}</span>
                  <span className="text-xs" style={subtle}>{o.member}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: STATUS_TONE[o.status], background: `color-mix(in srgb, ${STATUS_TONE[o.status]} 12%, transparent)` }}>{STATUS_LABEL[o.status]}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs tabular-nums">
                  <div><dt style={subtle}>Admin fee owed</dt><dd>{fmt(o.remainingAdminMinor, o.currency)}</dd></div>
                  <div><dt style={subtle}>Postage owed</dt><dd>{fmt(o.remainingPostageMinor, o.currency)}</dd></div>
                  <div><dt style={subtle}>Admin fee paid</dt><dd>{fmt(o.paidAdminMinor, o.currency)}</dd></div>
                  <div><dt style={subtle}>Postage paid</dt><dd>{fmt(o.paidPostageMinor, o.currency)}</dd></div>
                </dl>
                {o.reviewReason && <p className="mt-1 text-[11px]" style={subtle}>Review: {o.reviewReason}{o.collector ? ` · held by ${o.collector === "admin" ? "Admin" : "reshipper"}` : ""}</p>}
                {o.collectionEvidence && <div className="mt-2 text-[11px]" style={subtle}>
                  <p>Wallet checked · {o.collectionEvidence.network} · {new Date(o.collectionEvidence.checkedAt).toLocaleString()}</p>
                  <code className="block break-all select-text">{o.collectionEvidence.address}</code>
                </div>}
              </div>
            </div>
            {sel && <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
              <label className="text-[11px]" style={subtle}>Admin fee to pay
                <input inputMode="decimal" className={inputCls} style={inputStyle} value={sel.admin} aria-label={`Admin fee for ${o.code}`} onChange={e => edit(o.orderId, "admin", e.target.value)} /></label>
              <label className="text-[11px]" style={subtle}>Postage to pay
                <input inputMode="decimal" className={inputCls} style={inputStyle} value={sel.postage} aria-label={`Postage for ${o.code}`} onChange={e => edit(o.orderId, "postage", e.target.value)} /></label>
            </div>}
          </li>;
        })}
      </ul>}
  </div>;
}

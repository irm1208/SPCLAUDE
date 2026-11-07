import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Trash2 } from "lucide-react";
import {
  clearPage, dateFilterValid, filterOrders, fmtDate, isEligible, MAX_SELECTION, moneyOf, orderState, paginate, selectPage,
  STATE_LABEL, STATE_TONE, signedMoneyOf, toggleOne, type Filters, type LedgerOrder,
} from "./model";
import { OrderBreakdown } from "./OrderBreakdown";
import { inputCls, inputStyle, subtle } from "../../reshipper-payouts/ui";

const EMPTY: Filters = { query: "", payment: "all", fulfilment: "all", from: "", to: "" };

export function Pager({ page, pages, onPage, prefix }: { page: number; pages: number; onPage: (p: number) => void; prefix: string }) {
  if (pages <= 1) return null;
  return <div className="flex items-center justify-end gap-2 text-xs">
    <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" style={{ borderColor: "var(--t-border)" }} disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid={`${prefix}-prev`}>Previous</button>
    <span style={subtle}>Page {page} of {pages}</span>
    <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" style={{ borderColor: "var(--t-border)" }} disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid={`${prefix}-next`}>Next</button>
  </div>;
}

export function LedgerOrders({ orders, selected, onSelected, locked, onRemove, removeTarget, onRemoveCancel, onRemoveConfirm, removeBusy }: {
  orders: LedgerOrder[]; selected: Set<string>; onSelected: (next: Set<string>) => void; locked: boolean;
  onRemove: (order: LedgerOrder) => void; removeTarget: LedgerOrder | null; onRemoveCancel: () => void; onRemoveConfirm: () => void; removeBusy: boolean;
}) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const statuses = useMemo(() => Array.from(new Set(orders.map((o) => o.status))).sort(), [orders]);
  const visible = useMemo(() => filterOrders(orders, f), [orders, f]);
  const view = paginate(visible, page);
  const pageIds = new Set(view.rows.map((o) => o.id));
  const hidden = Array.from(selected).filter((id) => !pageIds.has(id)).length;
  const pageEligible = view.rows.filter(isEligible);
  const set = (k: keyof Filters, v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };
  const badDate = !dateFilterValid(f.from) || !dateFilterValid(f.to);

  return <section aria-label="Order ledger" className="space-y-3">
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <label className="relative">
        <span className="sr-only">Search order or reference</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={subtle} />
        <input type="search" className={inputCls + " pl-9"} style={inputStyle} placeholder="Order code, reference or member" value={f.query} onChange={(e) => set("query", e.target.value)} data-testid="payment-filter-search" />
      </label>
      <select aria-label="Supplier payment status" className={inputCls} style={inputStyle} value={f.payment} onChange={(e) => set("payment", e.target.value)} data-testid="payment-filter-state">
        <option value="all">All payment states</option>
        {Object.entries(STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select aria-label="Fulfilment status" className={inputCls} style={inputStyle} value={f.fulfilment} onChange={(e) => set("fulfilment", e.target.value)} data-testid="payment-filter-fulfilment">
        <option value="all">All fulfilment</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <label className="text-[11px]" style={subtle}>Submitted from<input type="date" className={inputCls} style={inputStyle} value={f.from} onChange={(e) => set("from", e.target.value)} data-testid="payment-filter-from" /></label>
      <label className="text-[11px]" style={subtle}>Submitted to<input type="date" className={inputCls} style={inputStyle} value={f.to} onChange={(e) => set("to", e.target.value)} data-testid="payment-filter-to" /></label>
    </div>
    {badDate && <p role="alert" className="text-xs text-red-600">Date filter is invalid and has been ignored.</p>}

    <div className="flex flex-wrap items-center gap-3 rounded-xl border p-2.5 text-xs" style={{ borderColor: "var(--t-border)" }}>
      <button type="button" disabled={locked || !pageEligible.length} className="rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-40" style={{ background: "var(--t-blue-deep)" }}
        onClick={() => { const r = selectPage(selected, view.rows); onSelected(r.next); setNote(r.skipped ? `${r.skipped} eligible on this page not added: the ${MAX_SELECTION}-order receipt limit is reached.` : null); }} data-testid="payment-select-page">
        Select eligible on this page ({pageEligible.length})
      </button>
      <button type="button" disabled={locked || !view.rows.some((o) => selected.has(o.id))} className="underline disabled:opacity-40" onClick={() => { onSelected(clearPage(selected, view.rows)); setNote(null); }} data-testid="payment-clear-page">Clear this page</button>
      {selected.size > 0 && <button type="button" disabled={locked} className="underline" onClick={() => { onSelected(new Set()); setNote(null); }} data-testid="payment-clear-all">Clear all</button>}
      <span style={subtle}>Page scope only · max {MAX_SELECTION} orders per receipt</span>
      {selected.size > 0 && <span className="font-semibold" data-testid="payment-selected-count">{selected.size} selected</span>}
      {hidden > 0 && <span className="font-semibold" style={{ color: "#B4770E" }} data-testid="payment-hidden-selected">{hidden} selected on other pages or hidden by filters</span>}
    </div>
    {note && <p role="status" className="text-xs" style={{ color: "#B4770E" }}>{note}</p>}

    {visible.length === 0
      ? <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)" }}>
          {orders.length ? "No orders match this search or filter." : "No supplier submissions for this vendor yet."}
        </div>
      : <ul className="space-y-1.5">
        {view.rows.map((o) => {
          const st = orderState(o); const sel = selected.has(o.id); const isOpen = open.has(o.id);
          const profit = o.profit;
          const codes = (o.sourceOrders ?? []).map((s) => s.code).filter(Boolean);
          return <li key={o.id} className="rounded-xl border" style={{ borderColor: sel ? "var(--t-blue-40)" : "var(--t-border)", background: sel ? "color-mix(in srgb, var(--t-blue) 6%, var(--t-surface))" : "var(--t-surface)" }}>
            <div className="flex items-start gap-3 p-3 text-xs">
              <input type="checkbox" className="mt-1" aria-label={`Select ${o.reference}`} checked={sel} disabled={locked || (!sel && !isEligible(o))}
                onChange={() => onSelected(toggleOne(selected, o))} data-testid={`payment-order-${o.id}`} />
              <div className="min-w-0 flex-1 grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(180px,1.7fr)_minmax(120px,.9fr)_minmax(130px,1fr)_minmax(135px,auto)] sm:items-center">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm break-all">{o.reference}</p>
                  <p className="truncate" style={subtle}>{o.sourceType === "shared" ? "Shared · " : ""}{codes.length ? codes.join(", ") : "No order code"} · {fmtDate(o.submittedAt)}</p>
                </div>
                <p style={subtle}>Fulfilment: <span style={{ color: "var(--t-text)" }}>{o.status}</span></p>
                <div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap" style={{ color: STATE_TONE[st], background: `color-mix(in srgb, ${STATE_TONE[st]} 12%, transparent)` }}>Supplier: {STATE_LABEL[st]}</span>
                  {o.stale && <span className="block mt-1 text-[11px]" style={{ color: "#B4770E" }}>Stale submission · awaiting resubmission</span>}
                  {o.reviewReason && <span className="block mt-1 text-[11px]" style={{ color: "#B4770E" }}>{o.reviewReason}</span>}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide" style={subtle}>Supplier cost</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: moneyOf(o.totalCost) === "Unavailable" ? "#B4770E" : "var(--t-text)" }}>{moneyOf(o.totalCost)}</p>
                  </div>
                  <div className="min-w-[112px] border-l pl-3 text-right" style={{ borderColor: "var(--t-border)" }} data-testid={`payment-profit-${o.id}`}>
                    <p className="text-[10px] uppercase tracking-wide" style={subtle}>Estimated product profit</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: !profit?.amountUsd ? "#B4770E" : (profit.amountUsd.startsWith("-") ? "#B42318" : "#15803D") }}>{signedMoneyOf(profit?.amountUsd)}</p>
                    <p className="text-[10px] tabular-nums" style={subtle}>Sales {moneyOf(profit?.salesUsd)} − product cost {moneyOf(profit?.supplierProductsUsd)}</p>
                    {(profit?.reason || !profit) && <p className="max-w-[190px] text-[10px] leading-tight" style={{ color: "#8A5A00" }}>{profit?.reason || "Profit details unavailable; refresh the ledger."}</p>}
                  </div>
                </div>
              </div>
              <button type="button" aria-expanded={isOpen} aria-label={`Details for ${o.reference}`} className="p-1 rounded-lg"
                onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} data-testid={`payment-expand-${o.id}`}>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {o.canRemove === true
                ? <button type="button" disabled={locked} onClick={() => onRemove(o)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50" style={{ borderColor: "#D7A3A0", color: "#A12924" }} data-testid={`payment-remove-${o.id}`}><Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Remove</span></button>
                : <button type="button" disabled title={o.removalReason ?? undefined} className="max-w-[120px] shrink-0 cursor-not-allowed text-right text-[10px] leading-tight opacity-100 sm:max-w-[150px]" style={{ color: "#8A5A00" }} data-testid={`payment-remove-${o.id}`}>{o.removalReason || (o.canRemove === false ? "Removal unavailable" : "Refresh to check removal permission")}</button>}
            </div>
            {isOpen && <div className="border-t p-3 space-y-3" style={{ borderColor: "var(--t-border)" }}>
              <OrderBreakdown src={o} testId={`payment-order-detail-${o.id}`} />
              {o.profit && <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)" }} data-testid={`payment-profit-detail-${o.id}`}>
                <p className="font-semibold">Estimated product profit · {signedMoneyOf(o.profit.amountUsd)}</p>
                <p className="mt-1" style={subtle}>Customer product sales: {moneyOf(o.profit.salesUsd)} · Supplier product cost: {moneyOf(o.profit.supplierProductsUsd)}</p>
                <p className="mt-1" style={subtle}>{o.profit.definition}</p>
                {o.profit.reason && <p className="mt-1 font-medium" style={{ color: "#B4770E" }}>{o.profit.reason}</p>}
              </div>}
            </div>}
          </li>;
        })}
      </ul>}
    {removeTarget && <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#D7A3A0", background: "color-mix(in srgb, #B42318 4%, var(--t-surface))" }} data-testid="payment-remove-confirmation" aria-label="Confirm supplier submission removal">
      <p className="text-sm font-bold">Remove supplier submission · <span className="font-mono">{removeTarget.reference}</span></p>
      <p className="text-xs leading-relaxed">This removes the supplier submission from the vendor portal and payment list. It keeps the customer order and historical receipts. It does not cancel the customer order or reverse any transfer.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={removeBusy} onClick={onRemoveConfirm} className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: "#A12924" }} data-testid="payment-remove-confirm">{removeBusy ? "Removing…" : "Confirm removal"}</button>
        <button type="button" disabled={removeBusy} onClick={onRemoveCancel} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "var(--t-border)" }} data-testid="payment-remove-cancel">Cancel</button>
      </div>
    </section>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={subtle}>
      <span>{visible.length} of {orders.length} orders shown by filters</span>
      <Pager page={view.page} pages={view.pages} onPage={setPage} prefix="payment-page" />
    </div>
  </section>;
}

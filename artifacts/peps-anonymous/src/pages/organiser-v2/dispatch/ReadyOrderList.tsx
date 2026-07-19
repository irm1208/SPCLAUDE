import { AlertTriangle, Bell, Check, ChevronDown, Loader2, PackageCheck, Printer, QrCode, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { V2_CARD_BORDER } from "../theme";
import { getReminderEligibleOrders } from "./model";
import type { DeskState, DispatchOrder } from "./types";

interface ReadyOrderListProps {
  state: DeskState;
  remindedOrderIds: string[];
  reminderState: "idle" | "sending" | "sent";
  onSelectedOrderIdsChange: (ids: string[]) => void;
  onSendReminders: () => void;
  onConfirmDispatch: () => void;
}

function QrStatus({ order, reminded }: { order: DispatchOrder; reminded: boolean }) {
  if (order.qrState === "uploaded") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700"><QrCode className="h-3 w-3" /> QR uploaded</span>;
  }
  if (order.qrState === "reminder_needed") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"><Bell className="h-3 w-3" /> {reminded ? "Reminder sent" : "QR reminder needed"}</span>;
  }
  return <span className="text-[10px]" style={{ color: "var(--t-subtle)" }}>No QR required</span>;
}

function PrintSlips({ orders, onClose }: { orders: DispatchOrder[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white p-4 sm:p-8">
      <div className="print:hidden mx-auto mb-5 flex max-w-3xl items-center justify-between border-b pb-4" style={{ borderColor: V2_CARD_BORDER }}>
        <div><p className="text-[15px] font-bold">Packing slips</p><p className="text-[11px] text-slate-500">{orders.length} ready to print</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold text-white" style={{ background: "var(--t-blue)" }}><Printer className="h-4 w-4" /> Print</button>
          <button type="button" onClick={onClose} className="flex h-10 items-center gap-2 rounded-lg border px-4 text-[12px] font-semibold" style={{ borderColor: V2_CARD_BORDER }}><X className="h-4 w-4" /> Close</button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-0">
        {orders.map(order => (
          <article key={order.id} className="dispatch-print-slip rounded-xl border-2 border-slate-800 p-6 text-slate-950 print:min-h-[96vh] print:break-after-page">
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-wider">Winter Peptide Run 2025</p><h1 className="mt-1 text-xl font-bold">Packing slip</h1></div>
              <p className="font-mono text-xl font-bold">#{order.code}</p>
            </div>
            <div className="grid grid-cols-2 gap-5 border-b border-slate-300 py-4 text-sm">
              <div><p className="text-[9px] font-bold uppercase text-slate-500">Member</p><p className="mt-1 font-semibold">{order.memberName}</p><p className="text-xs">@{order.telegramUsername}</p></div>
              <div><p className="text-[9px] font-bold uppercase text-slate-500">Delivery</p><p className="mt-1 font-semibold">{order.deliveryMethod}</p><p className="text-xs">{order.shippingCountry}</p></div>
            </div>
            <div className="py-4">
              {order.items.map(item => <div key={item.productId} className="flex items-center gap-3 border-b py-3"><span className="h-5 w-5 rounded border-2 border-slate-700" /><span className="flex-1 font-semibold">{item.name}</span><span className="font-mono text-lg font-bold">×{item.quantity}</span></div>)}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function ReadyOrderList({ state, remindedOrderIds, reminderState, onSelectedOrderIdsChange, onSendReminders, onConfirmDispatch }: ReadyOrderListProps) {
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const readyRows = (state.fulfilment ?? []).filter(row => row.ready);
  const waitingRows = (state.fulfilment ?? []).filter(row => !row.ready);
  const selected = new Set(state.selectedOrderIds);
  const reminded = new Set(remindedOrderIds);
  const selectedOrders = useMemo(() => readyRows.filter(row => selected.has(row.order.id)).map(row => row.order), [readyRows, state.selectedOrderIds]);
  const reminderOrders = getReminderEligibleOrders(selectedOrders).filter(order => !reminded.has(order.id));

  if (state.selectedParcelIds.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-center sm:p-8" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <PackageCheck className="mx-auto h-6 w-6" style={{ color: "var(--t-blue)" }} />
        <p className="mt-2 text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Select delivered parcels to see which orders are ready.</p>
      </div>
    );
  }

  const toggleOrder = (id: string) => {
    onSelectedOrderIdsChange(selected.has(id) ? state.selectedOrderIds.filter(orderId => orderId !== id) : [...state.selectedOrderIds, id]);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div><h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Ready to dispatch</h3><p className="mt-0.5 text-[11px]" style={{ color: "var(--t-subtle)" }}>{readyRows.length} order{readyRows.length === 1 ? "" : "s"} can be fully packed.</p></div>
        {readyRows.length > 0 && <button type="button" onClick={() => onSelectedOrderIdsChange(readyRows.map(row => row.order.id))} className="text-[11px] font-semibold" style={{ color: "var(--t-blue)" }}>Select all</button>}
      </div>

      {readyRows.map(row => {
        const order = row.order;
        const checked = selected.has(order.id);
        return (
          <button key={order.id} type="button" role="checkbox" aria-checked={checked} onClick={() => toggleOrder(order.id)} className="w-full rounded-xl p-4 text-left transition-colors sm:p-5" style={{ background: checked ? "var(--t-blue-05)" : "#fff", border: `1px solid ${checked ? "var(--t-blue)" : V2_CARD_BORDER}` }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2" style={{ borderColor: checked ? "var(--t-blue)" : "#A1A1AA", background: checked ? "var(--t-blue)" : "#fff" }}>{checked && <Check className="h-3.5 w-3.5 text-white" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[13px] font-bold" style={{ color: "var(--t-text)" }}>#{order.code}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{order.memberName}</span>
                  <span className="text-[11px]" style={{ color: "var(--t-subtle)" }}>@{order.telegramUsername}</span>
                  <QrStatus order={order} reminded={reminded.has(order.id)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">{order.items.map(item => <span key={item.productId} className="rounded-lg border bg-slate-50 px-2.5 py-1 text-[12px] text-slate-700" style={{ borderColor: "#DCE3EC" }}>{item.name} ×{item.quantity}</span>)}</div>
                <p className="mt-2 text-[11px]" style={{ color: "var(--t-subtle)" }}>{order.deliveryMethod} · {order.shippingCountry}</p>
              </div>
            </div>
          </button>
        );
      })}

      {readyRows.length === 0 && <div className="rounded-xl bg-white p-6 text-center text-[12px]" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-subtle)" }}>No orders can be fully packed from the selected parcels.</div>}

      {waitingRows.length > 0 && (
        <div className="rounded-xl bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button type="button" onClick={() => setWaitingOpen(value => !value)} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"><span className="text-[12px] font-semibold" style={{ color: "var(--t-muted)" }}>Waiting for stock ({waitingRows.length})</span><ChevronDown className={`h-4 w-4 transition-transform ${waitingOpen ? "rotate-180" : ""}`} style={{ color: "var(--t-subtle)" }} /></button>
          {waitingOpen && <div className="divide-y border-t" style={{ borderColor: V2_CARD_BORDER }}>{waitingRows.map(row => <div key={row.order.id} className="px-4 py-3"><p className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>#{row.order.code} · {row.order.memberName}</p><div className="mt-1 flex flex-wrap gap-2">{row.missingItems.map(item => <span key={item.productId} className="text-[10px] text-amber-700">{item.name}: need {item.quantity} · {item.available} available</span>)}</div></div>)}</div>}
        </div>
      )}

      {selectedOrders.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-end" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button type="button" onClick={() => setPrintOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[12px] font-semibold" style={{ borderColor: V2_CARD_BORDER, color: "var(--t-muted)" }}><Printer className="h-4 w-4" /> Print packing slips</button>
          {reminderOrders.length > 0 && <button type="button" onClick={onSendReminders} disabled={reminderState === "sending"} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-[12px] font-semibold text-amber-700 disabled:opacity-50">{reminderState === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Send QR reminders ({reminderOrders.length})</button>}
          <button type="button" onClick={() => setConfirmOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[12px] font-semibold text-white" style={{ background: "var(--t-blue)" }}><Send className="h-4 w-4" /> Dispatch selected ({selectedOrders.length})</button>
        </div>
      )}

      {printOpen && <PrintSlips orders={selectedOrders} onClose={() => setPrintOpen(false)} />}
      {confirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" onMouseDown={event => event.target === event.currentTarget && setConfirmOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-dispatch-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle className="h-4 w-4" /></div><div><h3 id="confirm-dispatch-title" className="text-[16px] font-bold" style={{ color: "var(--t-text)" }}>Confirm dispatch?</h3><p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--t-subtle)" }}>This marks {selectedOrders.length} orders as dispatched and deducts stock from {state.selectedParcelIds.length} selected parcels.</p></div></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmOpen(false)} className="h-10 rounded-lg border px-4 text-[12px] font-semibold" style={{ borderColor: V2_CARD_BORDER }}>Cancel</button><button type="button" onClick={() => { setConfirmOpen(false); onConfirmDispatch(); }} className="h-10 rounded-lg px-4 text-[12px] font-semibold text-white" style={{ background: "var(--t-blue)" }}>Confirm dispatch</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

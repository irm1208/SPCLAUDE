import { AlertTriangle, ArrowLeft, Bell, Check, Loader2, PackageCheck, Printer, QrCode, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getReminderEligibleOrders } from "./model";
import type { DeskState, DispatchOrder } from "./types";

interface DispatchStageProps {
  state: DeskState;
  reminderState: "idle" | "sending" | "sent";
  remindedOrderIds: string[];
  onBack: () => void;
  onSendReminders: () => void;
  onConfirm: () => void;
}

function QrStatus({ order, reminded }: { order: DispatchOrder; reminded: boolean }) {
  if (order.qrState === "uploaded") {
    return <span className="inline-flex items-center gap-1 text-[9px] font-extrabold" style={{ color: "var(--dispatch-green)" }}><Check className="h-3 w-3" /> Uploaded</span>;
  }
  if (order.qrState === "reminder_needed") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold" style={{ color: "var(--dispatch-amber)" }}>
        <Bell className="h-3 w-3" /> {reminded ? "Reminder sent" : "Reminder needed"}
      </span>
    );
  }
  return <span className="text-[9px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>Not required</span>;
}

function PrintSlips({ orders, onClose }: { orders: DispatchOrder[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white p-4 sm:p-8">
      <div className="print:hidden mx-auto mb-6 flex max-w-3xl items-center justify-between border-b pb-4" style={{ borderColor: "#D9DED8" }}>
        <div>
          <p className="text-sm font-extrabold text-slate-900">Packing slips</p>
          <p className="text-xs text-slate-500">{orders.length} slips ready to print</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="flex min-h-10 items-center gap-2 bg-[#134E3A] px-4 text-xs font-bold text-white"><Printer className="h-4 w-4" /> Print</button>
          <button type="button" onClick={onClose} className="flex min-h-10 items-center gap-2 border border-slate-300 px-4 text-xs font-bold text-slate-700"><X className="h-4 w-4" /> Close</button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 print:max-w-none print:space-y-0">
        {orders.map(order => (
          <article key={order.id} className="dispatch-print-slip border-2 border-slate-900 p-6 text-slate-950 print:min-h-[96vh] print:break-after-page">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em]">Peps Anonymous · Group Buy</p>
                <h1 className="mt-1 text-2xl font-black">Winter Peptide Run 2025</h1>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-black">#{order.code}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest">Packing slip</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 border-b border-slate-300 py-5 text-sm">
              <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Member</p><p className="mt-1 font-bold">{order.memberName}</p><p className="font-mono text-xs">@{order.telegramUsername}</p></div>
              <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Delivery</p><p className="mt-1 font-bold">{order.deliveryMethod}</p><p className="text-xs">{order.shippingCountry}</p></div>
            </div>
            <div className="py-5">
              <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Pick list</p>
              {order.items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 border-t border-slate-300 py-3 last:border-b">
                  <span className="h-5 w-5 border-2 border-slate-900" />
                  <span className="flex-1 text-base font-bold">{item.name}</span>
                  <span className="font-mono text-xl font-black">×{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-between border-t border-slate-300 pt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <span>Packed by __________________</span><span>Checked __________________</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function DispatchStage({ state, reminderState, remindedOrderIds, onBack, onSendReminders, onConfirm }: DispatchStageProps) {
  const [printOpen, setPrintOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedOrders = useMemo(() => {
    const selected = new Set(state.selectedOrderIds);
    return (state.fulfilment ?? []).filter(row => row.ready && selected.has(row.order.id)).map(row => row.order);
  }, [state.fulfilment, state.selectedOrderIds]);
  const reminded = new Set(remindedOrderIds);
  const reminderOrders = getReminderEligibleOrders(selectedOrders).filter(order => !reminded.has(order.id));
  const selectedParcels = state.parcels.filter(parcel => state.selectedParcelIds.includes(parcel.id));
  const totalUnits = selectedOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  return (
    <>
      <section className="grid min-h-[520px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b p-4 sm:p-5 lg:border-b-0 lg:border-r" style={{ borderColor: "var(--dispatch-rule)", background: "rgba(255,255,255,.32)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Dispatch batch</p>
          <h3 className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>{selectedOrders.length} orders on the bench</h3>
          <div className="mt-5 border-y" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="flex items-center justify-between border-b py-3" style={{ borderColor: "var(--dispatch-rule)" }}><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--dispatch-muted)" }}>Items to pack</span><span className="font-mono text-[15px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>{totalUnits}</span></div>
            <div className="flex items-center justify-between border-b py-3" style={{ borderColor: "var(--dispatch-rule)" }}><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--dispatch-muted)" }}>Source parcels</span><span className="font-mono text-[15px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>{selectedParcels.length}</span></div>
            <div className="flex items-center justify-between py-3"><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--dispatch-muted)" }}>QR reminders</span><span className="font-mono text-[15px] font-extrabold" style={{ color: reminderOrders.length ? "var(--dispatch-amber)" : "var(--dispatch-green)" }}>{reminderOrders.length}</span></div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--dispatch-muted)" }}>Stock sources</p>
            {selectedParcels.map(parcel => <p key={parcel.id} className="flex items-center gap-2 border-t py-2 text-[10px] font-bold" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-ink)" }}><PackageCheck className="h-3.5 w-3.5" style={{ color: "var(--dispatch-green)" }} /> {parcel.label}</p>)}
          </div>
          <p className="mt-6 text-[9px] leading-relaxed" style={{ color: "var(--dispatch-muted)" }}>QR reminders are optional. They never block dispatch confirmation.</p>
        </aside>

        <div className="min-w-0 p-4 pb-0 sm:p-5 sm:pb-0">
          <div className="mb-4 border-b pb-4" style={{ borderColor: "var(--dispatch-rule)" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Step 03</p>
            <h3 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>Final dispatch manifest</h3>
            <p className="mt-1 text-[11px]" style={{ color: "var(--dispatch-muted)" }}>Print, send any reminders, then confirm when the physical batch leaves your hands.</p>
          </div>

          <div className="dispatch-ruled overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="hidden grid-cols-[110px_minmax(160px,1.1fr)_minmax(150px,.8fr)_120px] border-b px-3 py-2 text-[8px] font-extrabold uppercase tracking-[0.15em] sm:grid" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-muted)", background: "rgba(255,255,255,.78)" }}>
              <span>Order</span><span>Items</span><span>Delivery</span><span>QR status</span>
            </div>
            {selectedOrders.map(order => (
              <div key={order.id} className="grid gap-2 border-b bg-white px-3 py-3 last:border-b-0 sm:grid-cols-[110px_minmax(160px,1.1fr)_minmax(150px,.8fr)_120px] sm:items-center" style={{ borderColor: "var(--dispatch-rule)" }}>
                <div><p className="font-mono text-[11px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>#{order.code}</p><p className="text-[9px]" style={{ color: "var(--dispatch-muted)" }}>@{order.telegramUsername}</p></div>
                <div className="text-[10px] font-bold" style={{ color: "var(--dispatch-ink)" }}>{order.items.map(item => <p key={item.productId}>{item.quantity}× {item.name}</p>)}</div>
                <div><p className="text-[10px] font-semibold" style={{ color: "var(--dispatch-ink)" }}>{order.deliveryMethod}</p><p className="text-[9px]" style={{ color: "var(--dispatch-muted)" }}>{order.shippingCountry}</p></div>
                <QrStatus order={order} reminded={reminded.has(order.id)} />
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-col gap-2 border-t bg-white px-4 py-3 sm:-mx-5 sm:flex-row sm:items-center sm:px-5" style={{ borderColor: "var(--dispatch-rule)", boxShadow: "0 -10px 20px rgba(15,31,56,.05)" }}>
            <button type="button" onClick={onBack} className="flex min-h-10 items-center justify-center gap-2 border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-muted)" }}><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <button type="button" onClick={() => setPrintOpen(true)} className="flex min-h-10 items-center justify-center gap-2 border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: "var(--dispatch-green)", color: "var(--dispatch-green)" }}><Printer className="h-3.5 w-3.5" /> Print slips ({selectedOrders.length})</button>
            {reminderOrders.length > 0 && (
              <button type="button" onClick={onSendReminders} disabled={reminderState === "sending"} className="flex min-h-10 items-center justify-center gap-2 border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] disabled:opacity-60" style={{ borderColor: "rgba(184,107,23,.45)", color: "var(--dispatch-amber)", background: "rgba(184,107,23,.06)" }}>
                {reminderState === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                {reminderState === "sent" ? "Reminders sent" : `Send reminders (${reminderOrders.length})`}
              </button>
            )}
            <button type="button" onClick={() => setConfirmOpen(true)} className="flex min-h-10 items-center justify-center gap-2 px-5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white sm:ml-auto" style={{ background: "var(--dispatch-green-deep)" }}><Send className="h-3.5 w-3.5" /> Confirm dispatch</button>
          </div>
        </div>
      </section>

      {printOpen && <PrintSlips orders={selectedOrders} onClose={() => setPrintOpen(false)} />}

      {confirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && setConfirmOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="dispatch-confirm-title" className="w-full max-w-md overflow-hidden rounded-xl border bg-white shadow-2xl" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="flex items-start gap-3 border-b p-5" style={{ borderColor: "var(--dispatch-rule)" }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center" style={{ background: "rgba(184,107,23,.1)", color: "var(--dispatch-amber)" }}><AlertTriangle className="h-5 w-5" /></div>
              <div><h3 id="dispatch-confirm-title" className="text-[17px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>Confirm physical dispatch?</h3><p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--dispatch-muted)" }}>This marks {selectedOrders.length} orders as dispatched and deducts their stock from {selectedParcels.length} source parcels.</p></div>
            </div>
            <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmOpen(false)} className="min-h-10 border px-4 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-muted)" }}>Cancel</button>
              <button type="button" onClick={() => { setConfirmOpen(false); onConfirm(); }} className="flex min-h-10 items-center justify-center gap-2 px-5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: "var(--dispatch-green-deep)" }}><Send className="h-3.5 w-3.5" /> Dispatch {selectedOrders.length} orders</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

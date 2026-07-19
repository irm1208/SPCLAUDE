import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, CircleDashed, PackageCheck, QrCode } from "lucide-react";
import { useState } from "react";
import type { DeskState, DispatchOrder, FulfilmentRow } from "./types";

interface PrepareStageProps {
  state: DeskState;
  onSelectedOrderIdsChange: (ids: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

function QrLabel({ order }: { order: DispatchOrder }) {
  const labels = {
    uploaded: { text: "QR uploaded", fg: "#167A55", bg: "rgba(22,122,85,.08)" },
    reminder_needed: { text: "Reminder needed", fg: "#A35B11", bg: "rgba(184,107,23,.09)" },
    not_required: { text: "No QR required", fg: "#66736B", bg: "rgba(102,115,107,.08)" },
  } as const;
  const config = labels[order.qrState];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em]" style={{ background: config.bg, color: config.fg }}>
      <QrCode className="h-2.5 w-2.5" /> {config.text}
    </span>
  );
}

function OrderRow({ row, selected, selectable, onToggle }: { row: FulfilmentRow; selected?: boolean; selectable?: boolean; onToggle?: () => void }) {
  const order = row.order;
  const content = (
    <>
      {selectable && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center border" style={{ borderColor: selected ? "var(--dispatch-green)" : "#AEB7B1", background: selected ? "var(--dispatch-green)" : "transparent" }}>
          {selected && <Check className="h-3 w-3 text-white" />}
        </span>
      )}
      <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[112px_minmax(130px,1fr)_minmax(150px,1.2fr)_auto] sm:items-center">
        <span>
          <span className="block font-mono text-[11px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>#{order.code}</span>
          <span className="block truncate text-[9px]" style={{ color: "var(--dispatch-muted)" }}>@{order.telegramUsername}</span>
        </span>
        <span>
          <span className="block truncate text-[11px] font-bold" style={{ color: "var(--dispatch-ink)" }}>{order.memberName}</span>
          <span className="block text-[9px]" style={{ color: "var(--dispatch-muted)" }}>{order.shippingCountry}</span>
        </span>
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>
          {order.items.map(item => <span key={item.productId}>{item.quantity}× {item.name}</span>)}
        </span>
        <span className="flex items-center gap-2 sm:flex-col sm:items-end">
          <span className="text-[9px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>{order.deliveryMethod}</span>
          <QrLabel order={order} />
        </span>
        {row.missingItems.length > 0 && (
          <span className="col-span-full mt-1 flex flex-wrap gap-2 border-t pt-2 text-[9px] font-bold" style={{ borderColor: "rgba(184,107,23,.2)", color: "var(--dispatch-amber)" }}>
            {row.missingItems.map(item => <span key={item.productId}>Need {item.quantity} {item.name} · {item.available} available</span>)}
          </span>
        )}
      </span>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className="flex w-full gap-3 border-b px-3 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)]"
        style={{ borderColor: "var(--dispatch-rule)", background: selected ? "rgba(30,122,92,.065)" : "#fff" }}
      >
        {content}
      </button>
    );
  }

  return <div className="flex gap-3 border-b bg-white px-3 py-3 last:border-b-0" style={{ borderColor: "var(--dispatch-rule)" }}>{content}</div>;
}

export default function PrepareStage({ state, onSelectedOrderIdsChange, onBack, onContinue }: PrepareStageProps) {
  const [waitingOpen, setWaitingOpen] = useState(false);
  const selected = new Set(state.selectedOrderIds);
  const fulfilment = state.fulfilment ?? [];
  const ready = fulfilment.filter(row => row.ready);
  const missing = fulfilment.filter(row => !row.ready && row.missingItems.some(item => item.available > 0));
  const waiting = fulfilment.filter(row => !row.ready && row.missingItems.every(item => item.available === 0));
  const selectedParcels = state.parcels.filter(parcel => state.selectedParcelIds.includes(parcel.id));

  const toggleOrder = (id: string) => {
    onSelectedOrderIdsChange(selected.has(id) ? state.selectedOrderIds.filter(orderId => orderId !== id) : [...state.selectedOrderIds, id]);
  };

  return (
    <section className="grid min-h-[520px] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b p-4 sm:p-5 lg:border-b-0 lg:border-r" style={{ borderColor: "var(--dispatch-rule)", background: "rgba(255,255,255,.32)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Source batch</p>
        <h3 className="mt-1 text-[17px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>Stock selected</h3>
        <div className="mt-4 border-y" style={{ borderColor: "var(--dispatch-rule)" }}>
          {selectedParcels.map(parcel => {
            const units = parcel.items.reduce((sum, item) => sum + Math.max(0, item.quantity - item.dispatchedQuantity), 0);
            return (
              <div key={parcel.id} className="flex items-start gap-2 border-b py-3 last:border-b-0" style={{ borderColor: "var(--dispatch-rule)" }}>
                <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dispatch-green)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold" style={{ color: "var(--dispatch-ink)" }}>{parcel.label}</p>
                  <p className="mt-0.5 truncate font-mono text-[8px]" style={{ color: "var(--dispatch-muted)" }}>{parcel.trackingNumber}</p>
                </div>
                <span className="font-mono text-[10px] font-bold" style={{ color: "var(--dispatch-green)" }}>{units}u</span>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onBack} className="mt-4 flex min-h-9 items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dispatch-green)]" style={{ color: "var(--dispatch-green)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Change parcels
        </button>
      </aside>

      <div className="min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: "var(--dispatch-rule)" }}>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Step 02</p>
            <h3 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>Build the packing run</h3>
            <p className="mt-1 text-[11px]" style={{ color: "var(--dispatch-muted)" }}>Ready orders are selected automatically. Adjust the batch before printing.</p>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.08em]">
            <button type="button" onClick={() => onSelectedOrderIdsChange(ready.map(row => row.order.id))} style={{ color: "var(--dispatch-green)" }}>Select all ready</button>
            <span className="h-3 w-px" style={{ background: "var(--dispatch-rule)" }} />
            <button type="button" onClick={() => onSelectedOrderIdsChange([])} style={{ color: "var(--dispatch-muted)" }}>Clear</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: "var(--dispatch-rule)", background: "rgba(30,122,92,.07)" }}>
              <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--dispatch-green)" }}><Check className="h-3.5 w-3.5" /> Ready to pack</span>
              <span className="font-mono text-[10px] font-bold" style={{ color: "var(--dispatch-green)" }}>{selected.size}/{ready.length} selected</span>
            </div>
            {ready.map(row => <OrderRow key={row.order.id} row={row} selected={selected.has(row.order.id)} selectable onToggle={() => toggleOrder(row.order.id)} />)}
            {ready.length === 0 && <p className="px-3 py-6 text-center text-[11px]" style={{ color: "var(--dispatch-muted)" }}>No orders can be packed from this stock.</p>}
          </div>

          {missing.length > 0 && (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: "rgba(184,107,23,.32)" }}>
              <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: "rgba(184,107,23,.25)", background: "rgba(184,107,23,.075)" }}>
                <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--dispatch-amber)" }}><AlertTriangle className="h-3.5 w-3.5" /> Missing stock</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: "var(--dispatch-amber)" }}>{missing.length}</span>
              </div>
              {missing.map(row => <OrderRow key={row.order.id} row={row} />)}
            </div>
          )}

          {waiting.length > 0 && (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
              <button type="button" onClick={() => setWaitingOpen(value => !value)} className="flex w-full items-center justify-between px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)]" style={{ background: "rgba(102,115,107,.045)" }}>
                <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--dispatch-muted)" }}><CircleDashed className="h-3.5 w-3.5" /> Waiting for stock · {waiting.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${waitingOpen ? "rotate-180" : ""}`} style={{ color: "var(--dispatch-muted)" }} />
              </button>
              {waitingOpen && waiting.map(row => <OrderRow key={row.order.id} row={row} />)}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--dispatch-rule)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "var(--dispatch-muted)" }}>{selected.size} order{selected.size === 1 ? "" : "s"} in this dispatch batch</p>
          <button type="button" onClick={onContinue} disabled={selected.size === 0} className="flex min-h-10 items-center justify-center gap-2 px-5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--dispatch-green)]" style={{ background: "var(--dispatch-green-deep)" }}>
            Prepare dispatch batch <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

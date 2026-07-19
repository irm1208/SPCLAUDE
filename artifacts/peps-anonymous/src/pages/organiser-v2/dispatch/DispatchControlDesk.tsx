import { ArrowLeft, CheckCircle2, History, X } from "lucide-react";
import { useState } from "react";
import { V2_CARD_BORDER } from "../theme";
import DeliveredParcelList from "./DeliveredParcelList";
import DispatchLog from "./DispatchLog";
import ReadyOrderList from "./ReadyOrderList";
import { confirmDispatch, getReminderEligibleOrders, restoreDispatch, selectParcelsAndCompute } from "./model";
import type { DeskState } from "./types";

interface DispatchControlDeskProps {
  state: DeskState;
  onStateChange: (state: DeskState) => void;
}

export default function DispatchControlDesk({ state, onStateChange }: DispatchControlDeskProps) {
  const [reminderState, setReminderState] = useState<"idle" | "sending" | "sent">("idle");
  const [reminderSentAtByOrder, setReminderSentAtByOrder] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const selectedOrders = (state.fulfilment ?? [])
    .filter(row => row.ready && state.selectedOrderIds.includes(row.order.id))
    .map(row => row.order);

  const sendReminders = () => {
    const eligible = getReminderEligibleOrders(selectedOrders).filter(order => !reminderSentAtByOrder[order.id]);
    if (eligible.length === 0) return;
    setReminderState("sending");
    window.setTimeout(() => {
      const sentAt = new Date().toISOString();
      setReminderSentAtByOrder(current => ({ ...current, ...Object.fromEntries(eligible.map(order => [order.id, sentAt])) }));
      setReminderState("sent");
    }, 650);
  };

  const dispatchBatch = () => {
    const count = selectedOrders.length;
    onStateChange({
      ...confirmDispatch(state, new Date().toISOString(), reminderSentAtByOrder),
      view: "log",
    });
    setReminderState("idle");
    setReminderSentAtByOrder({});
    setBanner(`${count} order${count === 1 ? "" : "s"} dispatched successfully.`);
  };

  const attachPhotos = (orderId: string, filenames: string[]) => {
    onStateChange({
      ...state,
      log: state.log.map(record => record.id === orderId
        ? { ...record, dispatchPhotos: [...record.dispatchPhotos, ...filenames] }
        : record),
    });
  };

  const undoDispatch = (orderId: string) => {
    onStateChange(restoreDispatch(state, orderId));
    setBanner("Dispatch reversed. The order is back in the active queue.");
  };

  if (state.view === "log") {
    return (
      <div className="approved-dispatch-flow space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Dispatch Log</h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--t-subtle)" }}>Review dispatched orders, exports and uploaded evidence.</p>
          </div>
          <button type="button" onClick={() => onStateChange({ ...state, view: "desk" })} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[12px] font-semibold" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> Back to Dispatch
          </button>
        </div>
        {banner && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[12px] font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /><span className="flex-1">{banner}</span><button type="button" onClick={() => setBanner(null)} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button></div>}
        <DispatchLog records={state.log} onAttachPhotos={attachPhotos} onUndoDispatch={undoDispatch} />
      </div>
    );
  }

  return (
    <div className="approved-dispatch-flow space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Dispatch</h2>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--t-subtle)" }}>Select received parcels and dispatch the orders they can fulfil.</p>
        </div>
        <button type="button" onClick={() => onStateChange({ ...state, view: "log" })} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[12px] font-semibold" style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-muted)" }}>
          <History className="h-4 w-4" /> Dispatch Log ({state.log.length})
        </button>
      </div>

      {banner && <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[12px] font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /><span className="flex-1">{banner}</span><button type="button" onClick={() => setBanner(null)} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button></div>}

      <DeliveredParcelList
        parcels={state.parcels}
        selectedParcelIds={state.selectedParcelIds}
        onSelectionChange={ids => onStateChange(selectParcelsAndCompute(state, ids))}
      />

      <ReadyOrderList
        state={state}
        remindedOrderIds={Object.keys(reminderSentAtByOrder)}
        reminderState={reminderState}
        onSelectedOrderIdsChange={ids => onStateChange({ ...state, selectedOrderIds: ids })}
        onSendReminders={sendReminders}
        onConfirmDispatch={dispatchBatch}
      />
    </div>
  );
}

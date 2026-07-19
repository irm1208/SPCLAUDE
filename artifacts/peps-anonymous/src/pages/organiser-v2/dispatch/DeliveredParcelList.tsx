import { Check } from "lucide-react";
import { V2_CARD_BORDER } from "../theme";
import type { DeliveredParcel } from "./types";

interface DeliveredParcelListProps {
  parcels: DeliveredParcel[];
  selectedParcelIds: string[];
  onSelectionChange: (parcelIds: string[]) => void;
}

export default function DeliveredParcelList({ parcels, selectedParcelIds, onSelectionChange }: DeliveredParcelListProps) {
  const selected = new Set(selectedParcelIds);

  const toggle = (id: string) => {
    onSelectionChange(selected.has(id)
      ? selectedParcelIds.filter(parcelId => parcelId !== id)
      : [...selectedParcelIds, id]);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Delivered parcels</h3>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--t-subtle)" }}>Select the packages you have received and opened.</p>
        </div>
        <span className="text-[12px] font-semibold" style={{ color: "var(--t-subtle)" }}>{selected.size} selected</span>
      </div>

      {parcels.map(parcel => {
        const checked = selected.has(parcel.id);
        const dispatched = parcel.items.reduce((sum, item) => sum + item.dispatchedQuantity, 0);
        const remaining = parcel.items.reduce((sum, item) => sum + Math.max(0, item.quantity - item.dispatchedQuantity), 0);

        return (
          <button
            key={parcel.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(parcel.id)}
            className="w-full rounded-xl p-4 text-left transition-colors sm:p-5"
            style={{
              background: checked ? "var(--t-blue-05)" : "#fff",
              border: `1px solid ${checked ? "var(--t-blue)" : V2_CARD_BORDER}`,
            }}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2"
                style={{
                  borderColor: checked ? "var(--t-blue)" : "#A1A1AA",
                  background: checked ? "var(--t-blue)" : "#fff",
                }}
              >
                {checked && <Check className="h-4 w-4 text-white" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-[16px] font-bold sm:text-[17px]" style={{ color: "var(--t-text)" }}>{parcel.label}</span>
                  {parcel.reshipper && (
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[12px] font-semibold text-purple-600">
                      {parcel.reshipper}
                    </span>
                  )}
                  <span className="rounded-md bg-green-100 px-2.5 py-1 text-[12px] font-semibold text-green-700">delivered</span>
                  <span className="break-all font-mono text-[12px] sm:text-[13px]" style={{ color: "var(--t-muted)" }}>{parcel.trackingNumber}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {parcel.items.map(item => {
                    const itemRemaining = Math.max(0, item.quantity - item.dispatchedQuantity);
                    const exhausted = itemRemaining === 0;
                    return (
                      <span
                        key={`${parcel.id}-${item.productId}`}
                        className="inline-flex max-w-full flex-wrap items-baseline gap-1 rounded-lg border px-2.5 py-1 text-[13px] sm:text-[14px]"
                        style={{
                          borderColor: exhausted ? "#FCA5A5" : "#DCE3EC",
                          background: exhausted ? "#FFF7F7" : "#F8FAFC",
                          color: exhausted ? "#DC2626" : "#334155",
                        }}
                      >
                        <span className={exhausted ? "line-through" : ""}>{item.name} ×{itemRemaining}</span>
                        {item.dispatchedQuantity > 0 && <span style={{ color: "#94A3B8" }}>({item.dispatchedQuantity} sent)</span>}
                      </span>
                    );
                  })}
                </div>

                <p className="mt-3 text-[12px] sm:text-[13px]" style={{ color: "var(--t-muted)" }}>
                  {dispatched} already dispatched · {remaining} remaining
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}

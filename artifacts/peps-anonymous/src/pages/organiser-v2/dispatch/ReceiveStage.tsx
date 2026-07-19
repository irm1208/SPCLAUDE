import { ArrowRight, Box, Check, MapPin, PackageOpen, ScanLine } from "lucide-react";
import type { DeskState, ScopeType } from "./types";

interface ReceiveStageProps {
  state: DeskState;
  onScopeChange: (scopeType: ScopeType, scopeId: string) => void;
  onParcelSelectionChange: (parcelIds: string[]) => void;
  onContinue: () => void;
}

const SCOPES: { id: ScopeType; label: string }[] = [
  { id: "all", label: "All stock" },
  { id: "reshipper", label: "Reshipper" },
  { id: "country", label: "Country leg" },
];

export default function ReceiveStage({ state, onScopeChange, onParcelSelectionChange, onContinue }: ReceiveStageProps) {
  const reshippers = [...new Set(state.parcels.flatMap(parcel => parcel.reshipper ? [parcel.reshipper] : []))];
  const countries = [...new Set(state.parcels.flatMap(parcel => parcel.country ? [parcel.country] : []))];
  const visibleParcels = state.parcels.filter(parcel => {
    if (state.scopeType === "all") return true;
    if (!state.scopeId) return false;
    return state.scopeType === "reshipper" ? parcel.reshipper === state.scopeId : parcel.country === state.scopeId;
  });
  const selected = new Set(state.selectedParcelIds);
  const inventory = new Map<string, { name: string; received: number; dispatched: number; available: number }>();

  state.parcels.filter(parcel => selected.has(parcel.id)).forEach(parcel => {
    parcel.items.forEach(item => {
      const current = inventory.get(item.productId) ?? { name: item.name, received: 0, dispatched: 0, available: 0 };
      current.received += item.quantity;
      current.dispatched += item.dispatchedQuantity;
      current.available += Math.max(0, item.quantity - item.dispatchedQuantity);
      inventory.set(item.productId, current);
    });
  });

  const toggleParcel = (id: string) => {
    const next = selected.has(id)
      ? state.selectedParcelIds.filter(parcelId => parcelId !== id)
      : [...state.selectedParcelIds, id];
    onParcelSelectionChange(next);
  };

  const scopeOptions = state.scopeType === "reshipper" ? reshippers : countries;

  return (
    <section className="grid min-h-[520px] lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
      <div className="border-b p-4 sm:p-5 lg:border-b-0 lg:border-r" style={{ borderColor: "var(--dispatch-rule)" }}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Step 01</p>
            <h3 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>What arrived?</h3>
            <p className="mt-1 max-w-sm text-[12px] leading-relaxed" style={{ color: "var(--dispatch-muted)" }}>
              Select only parcels you have physically received and opened.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-green)" }}>
            <ScanLine className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--dispatch-muted)" }}>Fulfilment scope</p>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
            {SCOPES.map(scope => {
              const active = state.scopeType === scope.id;
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => onScopeChange(scope.id, scope.id === "all" ? "" : "")}
                  className="dispatch-segment min-h-9 border-r px-2 text-[12px] font-bold last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)]"
                  style={{
                    borderColor: "var(--dispatch-rule)",
                    background: active ? "var(--dispatch-ink)" : "rgba(255,255,255,.45)",
                    color: active ? "#fff" : "var(--dispatch-muted)",
                  }}
                >
                  {scope.label}
                </button>
              );
            })}
          </div>
          {state.scopeType !== "all" && (
            <label className="mt-2 block">
              <span className="sr-only">Select {state.scopeType}</span>
              <select
                value={state.scopeId}
                onChange={event => onScopeChange(state.scopeType, event.target.value)}
                className="h-10 w-full border bg-white/70 px-3 text-[12px] font-semibold outline-none focus:ring-2 focus:ring-[var(--dispatch-green)]"
                style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-ink)" }}
              >
                <option value="">Choose {state.scopeType === "reshipper" ? "a reshipper" : "a country leg"}</option>
                {scopeOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between border-y py-2" style={{ borderColor: "var(--dispatch-rule)" }}>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--dispatch-muted)" }}>Delivered parcels</span>
          <span className="font-mono text-[12px] font-bold" style={{ color: "var(--dispatch-green)" }}>{visibleParcels.length} available</span>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--dispatch-rule)" }}>
          {visibleParcels.map(parcel => {
            const checked = selected.has(parcel.id);
            const remaining = parcel.items.reduce((total, item) => total + Math.max(0, item.quantity - item.dispatchedQuantity), 0);
            return (
              <button
                key={parcel.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleParcel(parcel.id)}
                className="dispatch-row relative flex w-full gap-3 py-3.5 pl-3 pr-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dispatch-green)]"
                style={{ background: checked ? "rgba(30,122,92,.075)" : "transparent" }}
              >
                <span className="absolute inset-y-2 left-0 w-[3px]" style={{ background: checked ? "var(--dispatch-green)" : "transparent" }} />
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border"
                  style={{ borderColor: checked ? "var(--dispatch-green)" : "#AEB7B1", background: checked ? "var(--dispatch-green)" : "transparent" }}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-extrabold" style={{ color: "var(--dispatch-ink)" }}>{parcel.label}</span>
                    <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color: "var(--dispatch-green)" }}>{remaining}u</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium" style={{ color: "var(--dispatch-muted)" }}>
                    <span>{parcel.carrier}</span>
                    <span className="font-mono">{parcel.trackingNumber}</span>
                    <span>{new Date(parcel.receivedAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</span>
                  </span>
                </span>
              </button>
            );
          })}
          {visibleParcels.length === 0 && (
            <div className="py-10 text-center text-[12px]" style={{ color: "var(--dispatch-muted)" }}>Choose a scope to see delivered parcels.</div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--dispatch-green)" }}>Batch inventory</p>
            <h3 className="mt-1 text-[18px] font-extrabold tracking-[-0.02em]" style={{ color: "var(--dispatch-ink)" }}>Available on the bench</h3>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: "var(--dispatch-muted)" }}>
            <PackageOpen className="h-4 w-4" />
            {state.selectedParcelIds.length} selected
          </div>
        </div>

        {inventory.size === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center" style={{ borderColor: "#C9D0CB", background: "var(--t-surface2)" }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center border" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-green)" }}>
              <Box className="h-5 w-5" />
            </div>
            <p className="max-w-sm text-[14px] font-bold" style={{ color: "var(--dispatch-ink)" }}>No stock on the bench yet</p>
            <p className="mt-1.5 max-w-md text-[12px] leading-relaxed" style={{ color: "var(--dispatch-muted)" }}>
              Select the delivered parcels you have physically received to build this dispatch batch.
            </p>
          </div>
        ) : (
          <div className="dispatch-ruled flex-1 overflow-hidden rounded-lg border" style={{ borderColor: "var(--dispatch-rule)" }}>
            <div className="grid grid-cols-[minmax(150px,1fr)_72px_72px_72px] border-b px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] sm:grid-cols-[minmax(200px,1fr)_90px_90px_90px]" style={{ borderColor: "var(--dispatch-rule)", color: "var(--dispatch-muted)", background: "rgba(255,255,255,.72)" }}>
              <span>Item</span><span className="text-right">Received</span><span className="text-right">Sent</span><span className="text-right">Available</span>
            </div>
            {[...inventory.values()].map(item => (
              <div key={item.name} className="grid min-h-14 grid-cols-[minmax(150px,1fr)_72px_72px_72px] items-center border-b bg-white px-3 text-[12px] last:border-b-0 sm:grid-cols-[minmax(200px,1fr)_90px_90px_90px]" style={{ borderColor: "var(--dispatch-rule)" }}>
                <span className="truncate font-bold" style={{ color: "var(--dispatch-ink)" }}>{item.name}</span>
                <span className="text-right font-mono tabular-nums" style={{ color: "var(--dispatch-muted)" }}>{item.received}</span>
                <span className="text-right font-mono tabular-nums" style={{ color: item.dispatched ? "var(--dispatch-amber)" : "var(--dispatch-muted)" }}>{item.dispatched}</span>
                <span className="text-right font-mono text-[14px] font-extrabold tabular-nums" style={{ color: "var(--dispatch-green)" }}>{item.available}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col items-end gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--dispatch-rule)" }}>
          <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--dispatch-muted)" }}>
            <MapPin className="h-3.5 w-3.5" /> Stock remains tied to its source parcel.
          </p>
          <button
            type="button"
            onClick={onContinue}
            disabled={state.selectedParcelIds.length === 0}
            className="flex min-h-10 items-center justify-center gap-2 px-5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--dispatch-green)]"
            style={{ background: "var(--dispatch-green-deep)" }}
          >
            Review fulfilment <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

import { useId } from "react";

export type PanelDeliveryOption = {
  id: string;
  name: string;
  price: number | null;
  description?: string | null;
  requiresAddress?: boolean;
};

export type PanelDeliveryChoices = {
  options: PanelDeliveryOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  lockedName?: string;
};

export function OrderPanelDelivery({
  options, selectedId, onSelect, loading, lockedName, disabled, hidePrices, formatPrice,
}: PanelDeliveryChoices & { disabled?: boolean; hidePrices?: boolean; formatPrice: (price: number) => string }) {
  const groupName = useId();
  return (
    <fieldset disabled={disabled} className="mt-5 min-w-0 space-y-2 border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
      <legend className="float-left mb-3 w-full text-sm font-bold">Delivery</legend>
      {lockedName != null ? (
        <div className="clear-both rounded-lg border p-3" style={{ borderColor: "var(--t-border)" }}>
          <p className="break-words text-sm font-semibold">{lockedName}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>Included from your previous order — delivery cannot be changed for a top-up.</p>
        </div>
      ) : loading ? (
        <p className="clear-both text-sm" style={{ color: "var(--t-muted)" }}>Loading delivery options…</p>
      ) : options.length === 0 ? (
        <p className="clear-both text-sm" style={{ color: "var(--t-muted)" }}>No delivery options available yet.</p>
      ) : options.map(option => (
        <label key={option.id} className="clear-both flex min-h-11 items-start gap-2.5 rounded-lg border p-3"
          style={{
            borderColor: selectedId === option.id ? "#2D6BCC" : "var(--t-border)",
            background: selectedId === option.id ? "rgba(45,107,204,0.08)" : "transparent",
          }}>
          <input type="radio" name={groupName} value={option.id} checked={selectedId === option.id}
            onChange={() => onSelect(option.id)} className="mt-0.5 shrink-0 accent-[#2D6BCC]" />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold">{option.name}</span>
            {option.description && <span className="mt-1 block break-words text-xs" style={{ color: "var(--t-muted)" }}>{option.description}</span>}
            {option.requiresAddress && <span className="mt-1 block text-xs" style={{ color: "var(--t-muted)" }}>Complete your shipping details on the main form.</span>}
          </span>
          {!hidePrices && <span className="max-w-[35%] shrink-0 break-words text-right text-xs font-semibold tabular-nums">
            {option.price == null ? "Quote required" : option.price === 0 ? "Free" : formatPrice(option.price)}
          </span>}
        </label>
      ))}
    </fieldset>
  );
}

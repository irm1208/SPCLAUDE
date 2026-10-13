import { useId } from "react";

export type PanelOrderExtras = {
  notes: string;
  onNotesChange: (notes: string) => void;
  tip: number;
  tipOptions: number[];
  onTipChange: (tip: number) => void;
};

export function OrderPanelExtras({
  notes, onNotesChange, tip, tipOptions, onTipChange, disabled, formatPrice,
}: PanelOrderExtras & { disabled?: boolean; formatPrice: (amount: number) => string }) {
  const notesId = useId();
  const tipId = useId();
  return (
    <div className="mt-5 space-y-4 border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
      <div className="space-y-2">
        <label htmlFor={notesId} className="block text-sm font-bold">Additional notes <span className="font-normal" style={{ color: "var(--t-muted)" }}>(optional)</span></label>
        <textarea
          id={notesId}
          placeholder="Any special instructions? (Optional)"
          value={notes}
          onChange={event => onNotesChange(event.target.value)}
          disabled={disabled}
          rows={3}
          className="block w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC] disabled:opacity-50"
          style={{ background: "var(--t-bg)", color: "var(--t-text)", borderColor: "var(--t-border)" }}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={tipId} className="block text-sm font-bold">Tip <span className="font-normal" style={{ color: "var(--t-muted)" }}>(optional)</span></label>
        <select
          id={tipId}
          value={tip}
          onChange={event => {
            const amount = Number(event.target.value);
            if (tipOptions.includes(amount)) onTipChange(amount);
          }}
          disabled={disabled}
          className="h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC] disabled:opacity-50"
          style={{ background: "var(--t-bg)", color: "var(--t-text)", borderColor: "var(--t-border)" }}
        >
          {tipOptions.map(amount => <option key={amount} value={amount}>{amount === 0 ? "No tip" : formatPrice(amount)}</option>)}
        </select>
      </div>
    </div>
  );
}

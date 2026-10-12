import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type StockMode = "set" | "increase" | "decrease";
interface StockUpdate {
  products: Array<{ id: string; stock: number; sold: number }>;
  updatedCount: number;
}

export async function postGroupBuyStock(
  groupId: string, productIds: string[], mode: StockMode, input: string, signal?: AbortSignal,
): Promise<StockUpdate> {
  const quantity = input.trim() ? Number(input) : NaN;
  if (!productIds.length) throw new Error("Select at least one product.");
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000_000
    || !Number.isInteger(quantity * 2) || (mode !== "set" && quantity === 0)) {
    throw new Error("Enter a valid whole or half-kit quantity. Increases and decreases must be greater than zero.");
  }
  const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(groupId)}/products/stock`, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds, mode, quantity }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Stock update failed.");
  return data;
}

export function GroupBuyStockControls({ groupId, productIds, selectedIds, onSelectionChange, onUpdated, onBusyChange, editing = false }: {
  groupId: string;
  productIds: string[];
  selectedIds: Set<string>;
  onSelectionChange: Dispatch<SetStateAction<Set<string>>>;
  onUpdated: (products: StockUpdate["products"]) => void;
  onBusyChange?: (busy: boolean) => void;
  editing?: boolean;
}) {
  const [mode, setMode] = useState<StockMode>("set");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    requestRef.current?.abort();
    onBusyChange?.(false);
  }, [onBusyChange]);
  const allSelected = productIds.length > 0 && productIds.every(id => selectedIds.has(id));
  const buttonClass = "h-9 px-3 rounded-lg text-xs font-semibold border disabled:opacity-50 disabled:cursor-not-allowed";
  const fieldStyle = { background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" };

  async function updateStock() {
    if (saving || editing) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setSaving(true);
    onBusyChange?.(true);
    setFeedback(null);
    try {
      const result = await postGroupBuyStock(groupId, [...selectedIds], mode, quantity, controller.signal);
      if (controller.signal.aborted) return;
      onUpdated(result.products);
      onSelectionChange(new Set());
      setQuantity("");
      setFeedback({ error: false, text: `Available stock updated for ${result.updatedCount} products in this group buy only.` });
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ error: true, text: error instanceof Error ? error.message : "Stock update failed." });
    } finally {
      if (!controller.signal.aborted) {
        setSaving(false);
        onBusyChange?.(false);
      }
    }
  }

  return <section aria-label="Update group-buy stock" className="p-4 rounded-xl space-y-3"
    style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
    <div className="flex items-center gap-3 flex-wrap">
      <strong className="text-sm">Update stock</strong>
      <span className="text-xs">{selectedIds.size} selected</span>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" disabled={saving || !productIds.length} checked={allSelected}
          ref={element => { if (element) element.indeterminate = selectedIds.size > 0 && !allSelected; }}
          onChange={event => onSelectionChange(event.target.checked ? new Set(productIds) : new Set())} />
        Select all ({productIds.length})
      </label>
      <button type="button" disabled={saving || !selectedIds.size} className={buttonClass} style={fieldStyle}
        onClick={() => onSelectionChange(new Set())}>Clear selection</button>
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-2 text-xs">Available stock
        <select aria-label="Stock action" disabled={saving} value={mode} onChange={event => setMode(event.target.value as StockMode)}
          className={buttonClass} style={fieldStyle}>
          <option value="set">Set quantity</option><option value="increase">Increase by</option><option value="decrease">Decrease by</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs">Kits
        <input aria-label="Stock quantity in kits" disabled={saving} type="number" min="0" step="0.5" inputMode="decimal"
          value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="Quantity"
          className={`${buttonClass} w-28`} style={fieldStyle} />
      </label>
      <button type="button" disabled={saving || editing || !selectedIds.size || !quantity.trim()} onClick={() => void updateStock()}
        className={`${buttonClass} text-white`} style={{ background: "var(--t-blue-deep)", borderColor: "var(--t-blue-deep)" }}>
        {saving ? "Updating…" : "Update stock"}
      </button>
    </div>
    <p className="text-xs" style={{ color: "var(--t-muted)" }}>Group-buy only. Quantities are available kits. Already ordered kits are preserved. For unlimited stock, use Set quantity first.</p>
    {editing && <p className="text-xs">Save or cancel the product form before updating stock.</p>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className="text-xs font-semibold"
      style={{ color: feedback.error ? "#DC2626" : "var(--t-text)" }}>{feedback.text}</p>}
  </section>;
}

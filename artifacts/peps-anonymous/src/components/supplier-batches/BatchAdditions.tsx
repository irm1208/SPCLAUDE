import { useState } from "react";
import type { SupplierBatch } from "@/lib/supplier-batches";
import { BatchMoveDestination, useBatchMoveDestination } from "./BatchMoveDestination";

export function BatchAdditions({ batch, batches = [], orderId, busy, act, onClose }: {
  batch: SupplierBatch; orderId: string; busy: boolean; onClose: () => void;
  batches?: SupplierBatch[];
  act: (path: string, body: unknown, message?: string) => Promise<boolean>;
}) {
  const [token] = useState(batch.snapshot.token);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const destination = useBatchMoveDestination(batch, batches);
  const additions = (batch.additions ?? []).filter(a => orderId === "*" || a.orderId === orderId);
  const lineKey = (a: { orderId: string; productId: string }) => JSON.stringify([a.orderId, a.productId]);
  const lines = additions.flatMap(a => Number(values[lineKey(a)]) > 0
    ? [{ orderId: a.orderId, productId: a.productId, quantity: Number(values[lineKey(a)]) }] : []);
  const moving = lines.reduce((sum, l) => sum + l.quantity, 0);
  const current = batch.snapshot.orders.filter(o => orderId === "*" || o.id === orderId).reduce((sum, o) => sum + o.kits, 0);
  const invalid = additions.some(a => {
    const raw = values[lineKey(a)] ?? "";
    const n = Number(raw);
    return raw !== "" && (!Number.isFinite(n) || n < 0 || n * 2 % 1 || n > a.quantity);
  });
  const stale = token !== batch.snapshot.token;
  const button = "rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
  return <div role="group" aria-label="Move added quantities" className="mt-3 rounded-lg border border-amber-300 p-3 space-y-3">
    <strong>Move only added quantities to another batch</strong>
    <p>The original quantities stay here. The customer keeps one order and the same payment total.
      Only recorded increases to the customer's quantities are shown. Adding a whole order to a batch does not make its original kits additional kits.
      Enter the quantity to move for each product, leaving other fields blank.</p>
    {additions.map((a, i) => <label key={lineKey(a)} className="flex flex-wrap items-center justify-between gap-2">
      <span>#{batch.snapshot.orders.find(o => o.id === a.orderId)?.code} · {a.productName} · Added: {a.quantity} kits</span>
      <input type="number" min="0" max={a.quantity} step="0.5" aria-label={`Kits to move for ${a.productName}`}
        data-testid={`addition-quantity-${i}`} value={values[lineKey(a)] ?? ""} placeholder="0" disabled={busy}
        className="w-24 rounded-lg border px-2 py-1" onChange={e => {
          setValues(old => ({ ...old, [lineKey(a)]: e.target.value })); setAcknowledged(false);
        }} />
    </label>)}
    <BatchMoveDestination destination={destination} busy={busy} testId="move-additions-destination"
      onChange={() => setAcknowledged(false)} />
    <p className="font-semibold">{current - moving} kits stay · {moving} kits move to {destination.label}</p>
    <label className="block">Reason
      <textarea maxLength={1000} value={reason} data-testid="addition-reason" disabled={busy}
        className="mt-1 w-full rounded-lg border p-2" onChange={e => { setReason(e.target.value); setAcknowledged(false); }} />
    </label>
    <label className="flex gap-2">
      <input type="checkbox" checked={acknowledged} data-testid="addition-acknowledge" disabled={busy}
        onChange={e => setAcknowledged(e.target.checked)} />
      I confirm these quantities were not included in this vendor purchase.
    </label>
    {stale && <p role="alert" className="text-red-600">The batch changed. Close and reopen this review before moving quantities.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" data-testid="confirm-move-additions" className={button}
        disabled={busy || stale || destination.stale || invalid || moving <= 0 || !reason.trim() || !acknowledged}
        onClick={async () => {
          if (await act(`/${encodeURIComponent(batch.id)}/move-additions`, {
            confirm: true, expectedBatchToken: token, reason: reason.trim(), lines, ...destination.payload,
          }, `Added quantities moved to ${destination.label}. Customer order quantities and payments are unchanged.`)) onClose();
        }}>Move added quantities</button>
      <button type="button" className={button} disabled={busy} onClick={onClose}>Cancel</button>
    </div>
  </div>;
}

import { useState } from "react";
import type { SupplierBatch, SupplierScope } from "@/lib/supplier-batches";
import { BatchMoveUndo } from "./BatchMoveUndo";

const field = "w-full rounded-lg border p-2 text-sm";
const button = "rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";

/** Staff-only history and an explicitly confirmed Admin correction. */
export function BatchCorrection({ batch, scope, busy, onConfirm }: {
  batch: SupplierBatch; scope: SupplierScope; busy: boolean;
  onConfirm: (path: string, body: unknown, message?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviewedToken, setReviewedToken] = useState("");
  const orders = batch.snapshot.orders.filter(o => selected.includes(o.id));
  const movedKits = orders.reduce((sum, o) => sum + o.kits, 0);
  const stale = reviewedToken !== batch.snapshot.token;
  const blockedIds = new Set([...batch.exceptions.map(e => e.orderId), ...batch.snapshot.orders.filter(o => o.fullOrder).map(o => o.id)]);
  return <div className="space-y-2 text-xs" style={{ color: "var(--t-text, #0F1F38)" }}>
    {(batch.snapshot.corrections ?? []).map((note, index) => <div key={index}
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
      <strong>Allocation correction: {note.kits} kits moved {note.direction === "out" ? "to" : "from"} {note.reference}</strong>
      <p>Orders: {note.orderCodes.map(code => `#${code}`).join(", ")}.</p>
      <p className="whitespace-pre-wrap">{note.reason}</p>
      <p>{new Date(note.createdAt).toLocaleString("en-GB")} · {note.actor}</p>
      {note.undoneAt && <p className="font-semibold">Move undone {new Date(note.undoneAt).toLocaleString("en-GB")} · {note.undoneBy}. {note.undoReason}</p>}
      {note.direction === "in" && batch.state === "prepared" && <p>Awaiting a new vendor purchase; not part of the previous delivery.</p>}
    </div>)}
    {scope === "admin" && <BatchMoveUndo batch={batch} busy={busy} onConfirm={onConfirm} />}
    {scope === "admin" && batch.state === "ordered" && batch.snapshot.orders.length > 0 && !open &&
      <button type="button" className={button} disabled={busy} data-testid={`button-correct-${batch.id}`}
        onClick={() => { setReviewedToken(batch.snapshot.token); setSelected([]); setReason(""); setAcknowledged(false); setOpen(true); }}>
        Move orders to new batch
      </button>}
    {open && <div role="group" aria-label="Correct batch allocation" className="rounded-lg border p-3 space-y-3"
      style={{ borderColor: "var(--t-border, #D0DAE4)", background: "var(--t-surface2, #F1F5F9)" }}>
      <p className="font-semibold">Move whole orders out of {batch.reference}</p>
      <p>Choose orders not included in this vendor purchase. They will move to a new prepared batch in the same region.
        Customer quantities and payments stay unchanged. Processing orders return to Submitted.
        Unchecked package manifests are corrected; inspected packages and shipped orders cannot move.</p>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {batch.snapshot.orders.map(o => <label key={o.id} className="flex items-start gap-2">
          <input type="checkbox" data-testid={`move-order-${o.id}`} checked={selected.includes(o.id)}
            disabled={busy || blockedIds.has(o.id)} onChange={e => {
              setAcknowledged(false);
              setSelected(previous => e.target.checked ? [...previous, o.id] : previous.filter(id => id !== o.id));
            }} />
          <span>#{o.code} · {o.username} · {o.kits} kits{o.fullOrder ? " — split across batches; use added quantities" : blockedIds.has(o.id) ? " — resolve exception first" : ""}</span>
        </label>)}
      </div>
      <p className="font-semibold">{movedKits} kits move to a new batch; {batch.snapshot.kits - movedKits} kits remain in this batch.</p>
      <label className="block">Reason for correction
        <textarea className={field} maxLength={1000} data-testid="move-orders-reason" value={reason}
          disabled={busy} onChange={e => { setReason(e.target.value); setAcknowledged(false); }} />
      </label>
      <label className="flex gap-2">
        <input type="checkbox" data-testid="acknowledge-move-orders" checked={acknowledged}
          disabled={busy} onChange={e => setAcknowledged(e.target.checked)} />
        I confirm these complete orders should not be allocated to this delivery. Keep the original batch history and record this correction.
      </label>
      {stale && <p role="alert" className="text-red-600">This batch changed. Cancel and reopen to review the latest allocation.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} data-testid="confirm-move-orders"
          disabled={busy || stale || !orders.length || !reason.trim() || !acknowledged}
          onClick={async () => {
            if (await onConfirm(`/${encodeURIComponent(batch.id)}/move-orders`, {
              orderIds: selected, expectedBatchToken: reviewedToken, reason: reason.trim(), confirm: true,
            }, "Orders moved to a new prepared batch. Allocation correction recorded; payments unchanged.")) setOpen(false);
          }}>Confirm move to new batch</button>
        <button type="button" className={button} disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>}
  </div>;
}

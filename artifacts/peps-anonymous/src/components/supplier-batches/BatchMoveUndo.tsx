import { useState } from "react";
import type { SupplierBatch, SupplierMoveUndo } from "@/lib/supplier-batches";

const button = "rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";

export function BatchMoveUndo({ batch, busy, onConfirm }: {
  batch: SupplierBatch; busy: boolean;
  onConfirm: (path: string, body: unknown, message?: string) => Promise<boolean>;
}) {
  const [review, setReview] = useState<(SupplierMoveUndo & { sourceToken: string }) | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const current = batch.undoMoves?.find(m => m.eventId === review?.eventId);
  const stale = !!review && (review.sourceToken !== batch.snapshot.token
    || current?.expectedTargetToken !== review.expectedTargetToken);
  return <div className="space-y-2">
    {!review && (batch.undoMoves ?? []).map(move => <button key={move.eventId} type="button"
      className={button} disabled={busy} data-testid={`undo-move-${move.eventId}`}
      onClick={() => { setReview({ ...move, sourceToken: batch.snapshot.token }); setReason(""); setAcknowledged(false); }}>
      Undo move to {move.targetReference} · {move.kits} kits
    </button>)}
    {review && <div role="group" aria-label="Undo batch move" className="rounded-lg border border-amber-300 p-3 space-y-3">
      <strong>Return {review.kits} kits from {review.targetReference} to {batch.reference}</strong>
      <p>Orders: {review.orderCodes.map(c => `#${c}`).join(", ")}.</p>
      <p>This undoes the entire recorded move. The original batch allocation and affected unchecked package contents
        will be restored. The unused destination batch will be released. Original order quantities, prices and payments stay unchanged.</p>
      <label className="block">Reason for undo
        <textarea maxLength={1000} className="mt-1 w-full rounded-lg border p-2 text-sm"
          data-testid="undo-move-reason" value={reason} disabled={busy}
          onChange={e => { setReason(e.target.value); setAcknowledged(false); }} />
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={acknowledged} disabled={busy} data-testid="undo-move-acknowledge"
          onChange={e => setAcknowledged(e.target.checked)} />
        I confirm this move was mistaken and all {review.kits} kits should return to {batch.reference}.
      </label>
      {stale && <p role="alert" className="text-red-600">The batch changed. Cancel and review the latest move before undoing it.</p>}
      <div className="flex gap-2">
        <button type="button" className={button} data-testid="confirm-undo-move"
          disabled={busy || stale || !reason.trim() || !acknowledged}
          onClick={async () => {
            if (await onConfirm(`/${encodeURIComponent(batch.id)}/undo-move`, {
              confirm: true, moveEventId: review.eventId, reason: reason.trim(),
              expectedBatchToken: review.sourceToken, expectedTargetToken: review.expectedTargetToken,
            }, "Move undone. The original batch allocation and unchecked package contents were restored; payments unchanged.")) setReview(null);
          }}>Confirm undo move</button>
        <button type="button" className={button} disabled={busy} onClick={() => setReview(null)}>Cancel</button>
      </div>
    </div>}
  </div>;
}

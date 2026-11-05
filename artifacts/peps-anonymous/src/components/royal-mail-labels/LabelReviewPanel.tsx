import React, { useEffect, useRef, useState } from "react";
import { composeLabelPdf, checkCancelled } from "@/lib/royal-mail-labels";
import { renderRoyalMailPage, type InspectedPage } from "@/lib/royal-mail-pdf-preview";
import { LabelCropPreview } from "./LabelCropPreview";

export function LabelReviewPanel({ title, bytes, region, position, total, pending, morePending, initialAdjust,
  onChange, onConfirm, onExclude, onPrevious, onNext, onBack }: {
  title: string; bytes: Uint8Array; region: InspectedPage; position: number; total: number;
  pending: number; morePending: boolean; initialAdjust: boolean;
  onChange: React.ComponentProps<typeof LabelCropPreview>["onChange"];
  onConfirm: () => void; onExclude: () => void; onPrevious: () => void; onNext: () => void; onBack: () => void;
}) {
  const [adjusting, setAdjusting] = useState(initialAdjust);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const signature = JSON.stringify([region.pageIndex, region.rotation, region.viewBox, region.crop]);
  useEffect(() => {
    const element = canvas.current;
    if (adjusting || !element) return;
    const controller = new AbortController(), signal = controller.signal;
    setLoading(true); setError("");
    // Preview the same normalised PDF page that will be printed, not a small
    // label surrounded by an A4 source page's blank space.
    composeLabelPdf([{ id: title, bytes, labels: [region] }], signal)
      .then(pdf => { checkCancelled(signal); return renderRoyalMailPage(pdf, 0, element, signal); })
      .catch(err => { if (!signal.aborted) setError(err instanceof Error ? err.message : "Could not render label."); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    return () => { controller.abort(); element.width = 0; element.height = 0; };
    // Only print geometry, source bytes and editing mode affect this preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes, signature, adjusting]);
  return <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="Current label">
    <header className="shrink-0 rounded-lg border border-border bg-muted/30 p-3" aria-live="polite">
      <p className="text-xs text-muted-foreground">Label {position} of {total} · Page {region.pageIndex + 1} · {pending} awaiting confirmation</p>
      <h3 className="mt-1 break-words text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs">{adjusting ? "Adjust the crop below." : "This is the 4×6 print preview. Check the complete address and every barcode, then confirm."}</p>
    </header>
    <div className={`h-[44dvh] min-h-0 shrink rounded-lg border border-border bg-muted/20 p-3 ${adjusting ? "overflow-y-auto" : "grid grid-rows-[minmax(0,1fr)] overflow-hidden"}`}>
      {adjusting ? <LabelCropPreview bytes={bytes} pageIndex={region.pageIndex} crop={region.crop} onChange={onChange} onConfirm={onConfirm} /> : <>
        {loading && <p role="status" className="text-sm">Rendering label preview…</p>}
        {error && <p role="alert" className="break-words text-sm text-red-600">{error} Adjust the crop, return to the list to open the original PDF, or exclude this label.</p>}
        <canvas ref={canvas} hidden={loading || !!error}
          className="h-full min-h-0 w-full object-contain" aria-label={`4×6 print preview for ${title}, page ${region.pageIndex + 1}`} />
      </>}
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background pt-3">
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={onBack}>Back to list</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" disabled={position <= 1} onClick={onPrevious}>Previous label</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" disabled={position >= total} onClick={onNext}>Next label</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => setAdjusting(value => !value)}>{adjusting ? "Show print preview" : "Adjust crop"}</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={onExclude}>Exclude this label</button>
      {!adjusting && <button type="button" disabled={loading || !!error} onClick={onConfirm}
        className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {morePending ? "Confirm & next" : "Confirm label"}
      </button>}
    </div>
  </section>;
}

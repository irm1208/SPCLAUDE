import React, { useEffect, useRef, useState } from "react";
import type { InspectedPage } from "@/lib/royal-mail-pdf-preview";
import type { LabelPreviewCache } from "@/lib/royal-mail-preview-cache";
import { LabelCropPreview } from "./LabelCropPreview";

export function LabelReviewPanel({ title, bytes, region, regionId, previewCache, nextPreview, position, total, pending, morePending, initialAdjust,
  onChange, onConfirm, onExclude, onPrevious, onNext, onBack }: {
  title: string; bytes: Uint8Array; region: InspectedPage; position: number; total: number;
  pending: number; morePending: boolean; initialAdjust: boolean;
  regionId: string; previewCache: LabelPreviewCache; nextPreview?: { bytes: Uint8Array; region: InspectedPage };
  onChange: React.ComponentProps<typeof LabelCropPreview>["onChange"];
  onConfirm: () => void; onExclude: () => void; onPrevious: () => void; onNext: () => void; onBack: () => void;
}) {
  const [adjustment, setAdjustment] = useState<{ id: string; value: boolean } | null>(null);
  const adjusting = adjustment?.id === regionId ? adjustment.value : initialAdjust;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState("");
  const [retry, setRetry] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const signature = JSON.stringify([region.pageIndex, region.rotation, region.viewBox, region.crop]);
  const displayKey = `${regionId}:${signature}`;
  useEffect(() => {
    const element = canvas.current;
    if (adjusting || !element) return;
    let active = true;
    setLoading(true); setError("");
    previewCache.get(bytes, region)
      .then(prepared => {
        if (!active) return;
        element.width = prepared.width; element.height = prepared.height;
        const context = element.getContext("2d");
        if (!context) throw new Error("Could not create label preview.");
        context.drawImage(prepared, 0, 0);
        setRendered(displayKey);
        // Preload just the next label, not the whole batch. This shares the
        // pending promise if Next is clicked before preparation finishes.
        if (nextPreview) void previewCache.get(nextPreview.bytes, nextPreview.region).catch(() => {});
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not render label."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Only print geometry, source bytes and editing mode affect this preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes, signature, adjusting, regionId, previewCache, retry]);
  return <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label="Current label">
    <header className="shrink-0 rounded-lg border border-border bg-muted/30 p-3" aria-live="polite">
      <p className="text-xs text-muted-foreground">Label {position} of {total} · Page {region.pageIndex + 1} · {pending} awaiting confirmation</p>
      <h3 className="mt-1 break-words text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs">{adjusting ? "Adjust the crop below." : "This is the 4×6 print preview. Check the complete address and every barcode, then confirm."}</p>
    </header>
    <div className={`h-[44dvh] min-h-0 shrink rounded-lg border border-border bg-muted/20 p-3 ${adjusting ? "overflow-y-auto" : "grid grid-rows-[minmax(0,1fr)] overflow-hidden"}`}>
      {adjusting ? <LabelCropPreview bytes={bytes} pageIndex={region.pageIndex} crop={region.crop} onChange={onChange} onConfirm={onConfirm} /> : <>
        {(loading || rendered !== displayKey) && !error && <p role="status" className="text-sm">Preparing label preview…</p>}
        {error && <div role="alert" className="break-words text-sm text-red-600"><p>{error} Adjust the crop, return to the list to open the label PDF, or exclude this label.</p>
          <button type="button" className="mt-2 underline" onClick={() => setRetry(value => value + 1)}>Retry preview</button></div>}
        <canvas ref={canvas} hidden={loading || !!error || rendered !== displayKey}
          className="h-full min-h-0 w-full object-contain" aria-label={`4×6 print preview for ${title}, page ${region.pageIndex + 1}`} />
      </>}
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background pt-3">
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={onBack}>Back to list</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" disabled={position <= 1} onClick={onPrevious}>Previous label</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" disabled={position >= total} onClick={onNext}>Next label</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => setAdjustment({ id: regionId, value: !adjusting })}>{adjusting ? "Show print preview" : "Adjust crop"}</button>
      <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={onExclude}>Exclude this label</button>
      {!adjusting && <button type="button" disabled={loading || !!error || rendered !== displayKey} onClick={onConfirm}
        className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {morePending ? "Confirm & next" : "Confirm label"}
      </button>}
    </div>
  </section>;
}

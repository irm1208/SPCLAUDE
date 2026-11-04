import React, { useEffect, useRef, useState } from "react";
import { FULL_PAGE, validCrop, type Crop } from "@/lib/royal-mail-labels";
import { renderRoyalMailPage } from "@/lib/royal-mail-pdf-preview";

export function LabelCropPreview({ bytes, pageIndex, crop, onChange, onConfirm }: {
  bytes: Uint8Array; pageIndex: number; crop: Crop; onChange: (crop: Crop) => void; onConfirm: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const element = canvas.current!;
    setLoading(true); setError("");
    renderRoyalMailPage(bytes, pageIndex, element, controller.signal)
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Preview failed"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); element.width = 0; element.height = 0; };
  }, [bytes, pageIndex]);
  function point(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!start.current) return;
    const end = point(event), origin = start.current;
    const next = { x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(end.x - origin.x), height: Math.abs(end.y - origin.y) };
    if (validCrop(next)) onChange(next);
  }
  return <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
    <p className="text-xs text-muted-foreground">Draw a box around the complete label, including every barcode and address. Leave a little white margin. You can also adjust the percentages below.</p>
    {loading && <p role="status" className="text-sm">Rendering page…</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error} Close this dialog to use the original PDF download.</p>}
    <div className="relative mx-auto max-w-lg bg-white" hidden={loading || !!error}>
      <canvas ref={canvas} className="block h-auto w-full" aria-label={`Royal Mail source page ${pageIndex + 1}`} />
      <svg className="absolute inset-0 h-full w-full cursor-crosshair" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ touchAction: "none" }}
        aria-label="Drag to select label crop"
        onPointerDown={event => { event.preventDefault(); start.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={move}
        onPointerUp={event => { move(event); start.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { start.current = null; }}>
        <path d={`M0 0H1000V1000H0Z M${crop.x * 1000} ${crop.y * 1000}v${crop.height * 1000}h${crop.width * 1000}v${-crop.height * 1000}Z`}
          fill="rgba(0,0,0,.45)" fillRule="evenodd" />
        <rect x={crop.x * 1000} y={crop.y * 1000} width={crop.width * 1000} height={crop.height * 1000}
          fill="none" stroke="#2563eb" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(["x", "y", "width", "height"] as const).map((key, index) => <label key={key} className="text-xs">
        {["Left", "Top", "Width", "Height"][index]} %
        <input type="number" min={0} max={100} step={.1} aria-label={`${["Left", "Top", "Width", "Height"][index]} percent`}
          className="mt-1 w-full rounded border border-input bg-background p-2"
          value={Math.round(crop[key] * 1000) / 10}
          onChange={event => {
            const value = Number(event.target.value) / 100;
            const next = { ...crop, [key]: value };
            if (key === "x") next.width = Math.min(next.width, 1 - value);
            if (key === "y") next.height = Math.min(next.height, 1 - value);
            if (validCrop(next)) onChange(next);
          }} />
      </label>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-lg border border-input px-3 py-2 text-xs" onClick={() => onChange({ ...FULL_PAGE })}>Use whole page</button>
      <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" disabled={loading || !!error || !validCrop(crop)} onClick={onConfirm}>Confirm this label crop</button>
    </div>
  </div>;
}

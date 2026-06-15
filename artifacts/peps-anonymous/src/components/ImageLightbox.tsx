import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  thumbnailClassName?: string;
  thumbnailStyle?: React.CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export function ImageLightbox({
  src,
  alt = "Image",
  thumbnailClassName,
  thumbnailStyle,
  wrapperClassName,
  wrapperStyle,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setScale(1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const zoomIn  = (e: React.MouseEvent) => { e.stopPropagation(); setScale(s => Math.min(s + 0.5, 4)); };
  const zoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setScale(s => Math.max(s - 0.5, 0.5)); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={wrapperClassName ?? "relative inline-block group"}
        style={wrapperStyle}
        title="Click to zoom"
        aria-label={`Zoom image: ${alt}`}
      >
        <img src={src} alt={alt} className={thumbnailClassName} style={thumbnailStyle} />
        <span className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity bg-black/10 group-hover:bg-black/20 rounded-[inherit]">
          <Maximize2 className="w-5 h-5 text-white drop-shadow" />
        </span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              style={{
                transform: `scale(${scale})`,
                transition: "transform 0.2s ease",
                maxWidth: "85vw",
                maxHeight: "85vh",
                objectFit: "contain",
                display: "block",
                borderRadius: 8,
              }}
            />

            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-40"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={zoomIn}
                disabled={scale >= 4}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-40"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={close}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Close"
                aria-label="Close image viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scale !== 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setScale(1); }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
              >
                Reset zoom
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

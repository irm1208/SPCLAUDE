import type { PDFDocumentProxy } from "pdfjs-dist";
// @ts-ignore Vite bundles the PDF.js worker URL.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { checkCancelled, detectLabelCrop, type Crop, type ViewBox } from "./royal-mail-labels";

export interface InspectedPage {
  pageIndex: number;
  viewBox: ViewBox;
  rotation: number;
  crop: Crop;
  confirmed: boolean;
  reason: string;
}

async function withPdf<T>(bytes: Uint8Array, signal: AbortSignal, use: (pdf: PDFDocumentProxy) => Promise<T>) {
  checkCancelled(signal);
  const pdfjs = await import("pdfjs-dist");
  checkCancelled(signal);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  // PDF.js transfers its buffer to the worker. Keep the source bytes intact.
  const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false });
  const abort = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    checkCancelled(signal);
    const pdf = await task.promise;
    const result = await use(pdf);
    checkCancelled(signal);
    return result;
  } finally {
    signal.removeEventListener("abort", abort);
    await task.destroy().catch(() => {});
  }
}

/** Find all visible ink, adding a safe white margin. Never assume a fixed corner. */
export function inkBounds(data: Uint8ClampedArray, width: number, height: number): Crop | null {
  let left = width, top = height, right = -1, bottom = -1, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] > 128 && Math.min(data[i], data[i + 1], data[i + 2]) < 210) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
    }
  }
  if (count < 20) return null;
  const margin = Math.max(3, Math.ceil(Math.max(width, height) * .006));
  left = Math.max(0, left - margin); top = Math.max(0, top - margin);
  right = Math.min(width, right + margin + 1); bottom = Math.min(height, bottom + margin + 1);
  return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
}

export async function inspectRoyalMailPdf(bytes: Uint8Array, signal: AbortSignal): Promise<InspectedPage[]> {
  return withPdf(bytes, signal, async pdf => {
    if (pdf.numPages > 100) throw new Error("PDF exceeds 100 pages. Split it into smaller files first.");
    const pages: InspectedPage[] = [];
    const canvas = document.createElement("canvas");
    try {
      for (let index = 0; index < pdf.numPages; index++) {
        checkCancelled(signal);
        const page = await pdf.getPage(index + 1);
        try {
          const annotations = await page.getAnnotations({ intent: "display" });
          if (annotations.some(annotation => annotation.annotationType !== 2)) {
            throw new Error("PDF contains annotations or form fields that cannot be safely copied. Flatten it to a normal PDF first, or use the original download.");
          }
          const viewport = page.getViewport({ scale: 1 });
          const small = page.getViewport({ scale: 600 / Math.max(viewport.width, viewport.height) });
          canvas.width = Math.ceil(small.width); canvas.height = Math.ceil(small.height);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("PDF preview is unavailable in this browser.");
          await page.render({ canvas, canvasContext: ctx, viewport: small, background: "white" }).promise;
          checkCancelled(signal);
          const text = (await page.getTextContent()).items.map(item => "str" in item ? item.str : "").join(" ");
          const bounds = inkBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
          pages.push({ pageIndex: index, viewBox: [...page.view] as ViewBox, rotation: page.rotate,
            ...detectLabelCrop(viewport.width, viewport.height, text, bounds) });
        } finally { page.cleanup(); }
      }
      return pages;
    } finally { canvas.width = 0; canvas.height = 0; }
  });
}

export async function renderRoyalMailPage(bytes: Uint8Array, pageIndex: number, canvas: HTMLCanvasElement, signal: AbortSignal) {
  return withPdf(bytes, signal, async pdf => {
    const page = await pdf.getPage(pageIndex + 1);
    try {
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 1100 / Math.max(original.width, original.height)) });
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create PDF preview.");
      await page.render({ canvas, canvasContext: ctx, viewport, background: "white" }).promise;
    } finally { page.cleanup(); }
  });
}

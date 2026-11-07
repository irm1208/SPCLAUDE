import { checkCancelled, composeLabelPdf, type LabelRegion } from "./royal-mail-labels";
import { renderRoyalMailPage } from "./royal-mail-pdf-preview";

/** Session-only, bounded canvas cache. Source data never leaves the browser. */
export function createLabelPreviewCache(signal: AbortSignal) {
  const sources = new WeakMap<Uint8Array, number>();
  const entries = new Map<string, Promise<HTMLCanvasElement>>();
  let sequence = 0;
  const clear = () => {
    for (const entry of entries.values()) void entry.then(canvas => { canvas.width = 0; canvas.height = 0; }).catch(() => {});
    entries.clear();
  };
  signal.addEventListener("abort", clear, { once: true });
  return {
    get(bytes: Uint8Array, region: LabelRegion) {
      checkCancelled(signal);
      if (!sources.has(bytes)) sources.set(bytes, ++sequence);
      const key = JSON.stringify([sources.get(bytes), region.pageIndex, region.rotation, region.viewBox, region.crop]);
      const cached = entries.get(key);
      if (cached) {
        entries.delete(key); entries.set(key, cached);
        return cached;
      }
      const entry = (async () => {
        const canvas = document.createElement("canvas");
        try {
          const pdf = await composeLabelPdf([{ id: "Label preview", bytes, labels: [region] }], signal);
          checkCancelled(signal);
          await renderRoyalMailPage(pdf, 0, canvas, signal);
          checkCancelled(signal);
          return canvas;
        } catch (error) {
          canvas.width = 0; canvas.height = 0;
          entries.delete(key);
          throw error;
        }
      })();
      entries.set(key, entry);
      if (entries.size > 8) {
        const oldest = entries.keys().next().value!;
        const removed = entries.get(oldest)!;
        entries.delete(oldest);
        void removed.then(canvas => { canvas.width = 0; canvas.height = 0; }).catch(() => {});
      }
      return entry;
    },
  };
}
export type LabelPreviewCache = ReturnType<typeof createLabelPreviewCache>;

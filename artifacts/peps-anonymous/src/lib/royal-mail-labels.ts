// Load with the label tools, not on the first preview/download. An old open
// page must not request a now-removed lazy converter chunk after a publish.
import { PDFDocument, degrees } from "pdf-lib";

export type Crop = { x: number; y: number; width: number; height: number };
export type ViewBox = [number, number, number, number];
export type LabelRegion = { pageIndex: number; crop: Crop; viewBox: ViewBox; rotation: number };
export type LabelDocument = { id: string; bytes: Uint8Array; labels: LabelRegion[] };
export const FULL_PAGE: Crop = { x: 0, y: 0, width: 1, height: 1 };
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_LABELS = 500;

export function royalMailUploads(data: { royalMailQrCode?: string | null; qrCodes?: Record<string, string> | null }): string[] {
  return [...new Set([data.royalMailQrCode, data.qrCodes?.["royal-mail"]].filter((src): src is string => !!src))];
}
export function royalMailSources(data: Parameters<typeof royalMailUploads>[0]) {
  return royalMailUploads(data).filter(src => /^data:(?:application\/(?:pdf|octet-stream)|image\/(?:png|jpe?g))/i.test(src) || /^data:[^,]+;base64,JVBE/i.test(src) || /\.(?:pdf|jpe?g|png)(?:[?#]|$)/i.test(src));
}
export function checkCancelled(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Label export cancelled", "AbortError");
}
export function validCrop(crop: Crop) {
  return [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite)
    && crop.x >= 0 && crop.y >= 0 && crop.width > .001 && crop.height > .001
    && crop.x + crop.width <= 1.000001 && crop.y + crop.height <= 1.000001;
}
/** Crops use fractions of PDF.js's rotated, top-left-origin display viewport. */
export function cropToPdfBox(crop: Crop, viewBox: ViewBox, rotation: number) {
  if (!validCrop(crop)) throw new Error("Crop must stay inside the page and have positive width and height.");
  const [x0, y0, x1, y1] = viewBox;
  const w = x1 - x0, h = y1 - y0, r = ((rotation % 360) + 360) % 360;
  if (!(w > 0 && h > 0) || ![0, 90, 180, 270].includes(r)) throw new Error("Unsupported PDF page geometry.");
  const displayW = r % 180 ? h : w, displayH = r % 180 ? w : h;
  const toPdf = (x: number, y: number) => {
    if (r === 90) return [x0 + y, y0 + x];
    if (r === 180) return [x1 - x, y0 + y];
    if (r === 270) return [x1 - y, y1 - x];
    return [x0 + x, y1 - y];
  };
  const a = toPdf(crop.x * displayW, crop.y * displayH);
  const b = toPdf((crop.x + crop.width) * displayW, (crop.y + crop.height) * displayH);
  return { left: Math.min(a[0], b[0]), bottom: Math.min(a[1], b[1]), right: Math.max(a[0], b[0]), top: Math.max(a[1], b[1]) };
}

/** Conservative suggestions only: unfamiliar pages must be reviewed, not guessed. */
export function detectLabelCrop(width: number, height: number, text: string, inkBounds: Crop | null) {
  const instructions = /invoice|instructions|proof of postage|certificate of posting|customer receipt|order summary/i.test(text);
  const labelSized = (Math.abs(width - 288) < 8 && Math.abs(height - 432) < 8)
    || (Math.abs(width - 432) < 8 && Math.abs(height - 288) < 8)
    || (Math.abs(width - 283.46) < 6 && Math.abs(height - 425.2) < 6);
  if (labelSized && !instructions) return { crop: { ...FULL_PAGE }, confirmed: true, reason: "Already label-sized; full page preserved." };
  const crop = inkBounds ?? { ...FULL_PAGE };
  const ratio = crop.width * width / (crop.height * height);
  const template = /royal\s*mail/i.test(text) && /tracked|click\s*&?\s*drop/i.test(text) && /postage|paid/i.test(text);
  const isolated = crop.width * crop.height < .8 && ratio > .56 && ratio < .76;
  return { crop, confirmed: !!inkBounds && template && isolated && !instructions,
    reason: template && isolated && !instructions ? "Royal Mail label bounds detected; preview available." : "Review this page: confirm or adjust the crop, or exclude it." };
}

export async function sourcePdfBytes(source: string, signal: AbortSignal): Promise<Uint8Array> {
  checkCancelled(signal);
  let bytes: Uint8Array;
  if (source.startsWith("data:")) {
    const comma = source.indexOf(",");
    if (comma < 0) throw new Error("Invalid uploaded label.");
    const payload = source.slice(comma + 1);
    if (payload.length > MAX_FILE_BYTES * 1.4) throw new Error("Label exceeds the 20 MB per-file limit.");
    const raw = /;base64/i.test(source.slice(0, comma)) ? atob(payload.replace(/\s/g, "")) : decodeURIComponent(payload);
    bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  } else {
    const url = new URL(source, window.location.href);
    if (url.origin !== window.location.origin || !["http:", "https:", "blob:"].includes(url.protocol)) throw new Error("Only uploaded same-site labels are supported.");
    const response = await fetch(url.href, { credentials: "include", signal });
    if (!response.ok) throw new Error(`PDF download failed (${response.status}).`);
    if (Number(response.headers.get("content-length")) > MAX_FILE_BYTES) throw new Error("PDF exceeds the 20 MB per-file limit.");
    // Bound streamed responses too, including those without Content-Length.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Could not read PDF response.");
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      while (true) {
        checkCancelled(signal);
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > MAX_FILE_BYTES) throw new Error("PDF exceeds the 20 MB per-file limit.");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  }
  checkCancelled(signal);
  if (bytes.length > MAX_FILE_BYTES) throw new Error("PDF exceeds the 20 MB per-file limit.");
  if (new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).includes("%PDF-")) return bytes;
  // Inspect file signatures, not extension/MIME, which legacy uploads may lack.
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new Error("Royal Mail upload must be a PDF, JPEG or PNG. Use its original download instead.");
  const size = imageDimensions(bytes, png);
  if (size.width > 20000 || size.height > 20000 || size.width * size.height > 40_000_000) {
    throw new Error("Label image exceeds 40 megapixels or 20,000 pixels per side. Resize the original first.");
  }
  const pdf = await PDFDocument.create();
  const image = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  checkCancelled(signal);
  // 300dpi gives standard 1200×1800 thermal images an exact 4×6 page.
  const width = image.width * 72 / 300, height = image.height * 72 / 300;
  pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  const result = await pdf.save();
  checkCancelled(signal);
  return result;
}

/** Read dimensions before decoding compressed image data to bound memory. */
function imageDimensions(bytes: Uint8Array, png: boolean) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (png && bytes.length >= 24) {
    const width = view.getUint32(16), height = view.getUint32(20);
    if (width && height) return { width, height };
  }
  if (!png) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 8) {
        const height = view.getUint16(offset + 3), width = view.getUint16(offset + 5);
        if (width && height) return { width, height };
      }
      offset += length;
    }
  }
  throw new Error("Could not read label image dimensions. Check the original file.");
}

export function labelFilename(group: string, batch: string) {
  const safe = `${group}-${batch}`.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "labels";
  return `${safe}-royal-mail-4x6.pdf`;
}

export async function composeLabelPdf(files: LabelDocument[], signal: AbortSignal, onProgress?: (count: number) => void) {
  checkCancelled(signal);
  const total = files.reduce((sum, file) => sum + file.labels.length, 0);
  if (!total || total > MAX_LABELS) throw new Error(`Choose between 1 and ${MAX_LABELS} labels per download.`);
  const output = await PDFDocument.create();
  let completed = 0;
  for (const file of files) {
    checkCancelled(signal);
    if (!file.labels.length) continue;
    try {
      const source = await PDFDocument.load(file.bytes);
      for (const label of file.labels) {
        checkCancelled(signal);
        const box = cropToPdfBox(label.crop, label.viewBox, label.rotation);
        const embedded = await output.embedPage(source.getPage(label.pageIndex), box);
        const w = box.right - box.left, h = box.top - box.bottom;
        let rotation = ((label.rotation % 360) + 360) % 360;
        let displayW = rotation % 180 ? h : w, displayH = rotation % 180 ? w : h;
        if (displayW > displayH) { rotation = (rotation + 90) % 360; [displayW, displayH] = [displayH, displayW]; }
        const scale = Math.min(288 / displayW, 432 / displayH);
        let x = (288 - displayW * scale) / 2, y = (432 - displayH * scale) / 2;
        if (rotation === 90) y += w * scale;
        if (rotation === 180) { x += w * scale; y += h * scale; }
        if (rotation === 270) x += h * scale;
        output.addPage([288, 432]).drawPage(embedded, { x, y, width: w * scale, height: h * scale, rotate: degrees(-rotation) });
        onProgress?.(++completed);
        // Yield so cancellation/navigation remains responsive during bulk generation.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (error) {
      checkCancelled(signal);
      throw new Error(`${file.id}: ${error instanceof Error ? error.message : "Could not convert PDF"}`);
    }
  }
  checkCancelled(signal);
  const bytes = await output.save();
  checkCancelled(signal);
  return bytes;
}

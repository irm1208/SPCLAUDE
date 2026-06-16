// ── Lab certificate storage helper ────────────────────────────────────────────
// Centralises how certificate bytes are prepared before being stored in
// lab_tests.pdf_blob. Image certificates (Janoshik scans, Uzorak JPEG
// snapshots, admin uploads) are recompressed to WebP so they take far less
// space in the DB and load faster on the website. PDFs and anything we can't
// safely re-encode are stored unchanged. The serve layer (sniffBlobMime) reads
// the magic bytes, so WebP output is rendered correctly without any schema
// change.
//
// All store points (bookmarklet import, auto-download, admin uploads, community
// submissions) should funnel their bytes through prepareCertificateForStorage /
// prepareCertificateBase64 so behaviour stays consistent in one place.

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Detect the real media type from magic numbers (mirrors sniffBlobMime in the
// route layer). Defaults to PDF, matching how unknown blobs are served.
export function sniffCertMime(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf"; // %PDF
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png"; // ‰PNG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"; // JPEG
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "application/pdf";
}

// Lazily load sharp once. If the native binary can't load in this environment,
// we cache the failure and silently fall back to storing bytes uncompressed so
// the feature never blocks an import or upload.
type SharpFactory = typeof import("sharp").default;
let sharpLoad: Promise<SharpFactory | null> | null = null;
function loadSharp(): Promise<SharpFactory | null> {
  if (!sharpLoad) {
    sharpLoad = import("sharp")
      .then((m) => m.default)
      .catch((err) => {
        console.warn("[lab-cert] sharp unavailable — certificates will be stored uncompressed:", String(err).slice(0, 160));
        return null;
      });
  }
  return sharpLoad;
}

// Tuned so multi-page-free single CoA scans stay legible (text must remain
// readable) while shrinking dramatically. Resize never enlarges.
const MAX_WIDTH = 1800;
const MAX_HEIGHT = 2600;
const WEBP_QUALITY = 85;
// Only keep the recompressed version when it actually saves space; this also
// makes the recompress backfill idempotent (a second pass over an already-small
// WebP won't beat the threshold, so the original is kept and never degraded).
const KEEP_IF_AT_MOST = 0.9; // store compressed only if <= 90% of original size

export interface PreparedCert {
  bytes: Buffer;
  mime: string;
  changed: boolean; // true when we re-encoded to a smaller image
  originalBytes: number;
  storedBytes: number;
}

function passthrough(buf: Buffer, mime: string): PreparedCert {
  return { bytes: buf, mime, changed: false, originalBytes: buf.length, storedBytes: buf.length };
}

// Compress an image certificate to WebP; leave PDFs / unknown / non-images
// untouched. Never throws — on any failure the original bytes are returned.
export async function prepareCertificateForStorage(input: Buffer, hintedMime?: string): Promise<PreparedCert> {
  const original = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (original.length === 0) return passthrough(original, "application/pdf");

  const detected = sniffCertMime(original);
  const looksImage = IMAGE_MIMES.has(detected) || (!!hintedMime && IMAGE_MIMES.has(hintedMime) && detected === "application/pdf" && original[0] !== 0x25);
  if (!looksImage) return passthrough(original, detected);

  const sharp = await loadSharp();
  if (!sharp) return passthrough(original, detected);

  try {
    const compressed = await sharp(original, { failOn: "none" })
      .rotate() // honour EXIF orientation, then strip metadata
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (compressed.length > 0 && compressed.length <= original.length * KEEP_IF_AT_MOST) {
      return { bytes: compressed, mime: "image/webp", changed: true, originalBytes: original.length, storedBytes: compressed.length };
    }
    return passthrough(original, detected);
  } catch (err) {
    console.warn("[lab-cert] compression failed, storing original:", String(err).slice(0, 160));
    return passthrough(original, detected);
  }
}

// Convenience wrapper for the common case: prepare and return base64 ready to
// write into pdf_blob.
export async function prepareCertificateBase64(input: Buffer, hintedMime?: string): Promise<string> {
  const prepared = await prepareCertificateForStorage(input, hintedMime);
  return prepared.bytes.toString("base64");
}

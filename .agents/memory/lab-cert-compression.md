---
name: Lab certificate compression
description: How lab_tests certificate blobs are compressed to WebP before storage and recompressed in bulk.
---

All certificate bytes written to `lab_tests.pdfBlob` must funnel through `prepareCertificateForStorage` / `prepareCertificateBase64` (api-server `src/lib/lab-cert-storage.ts`). Images (PNG/JPEG/WebP, detected by magic bytes — NOT the upload MIME) are auto-oriented, resized within 1800x2600 (fit:inside, no enlargement), and re-encoded to WebP q85. PDFs / non-images / sharp-unavailable pass through untouched. The helper never throws and lazy-loads sharp with a passthrough fallback if the native binary won't load.

**Why:** Stored certs were uncompressed; large base64 blobs bloat the DB and slow page loads. The serve layer's `sniffBlobMime` already recognizes WebP, so storing WebP needs no schema change.

**How to apply:**
- Any NEW code path that writes `pdfBlob` must go through the helper, or it silently regresses compression.
- Compress only the STORED bytes — run Gemini/AI extraction on the ORIGINAL full-res bytes (extraction quality depends on it).
- Recompression is idempotent: the helper keeps the new blob only if it is <= 90% of the original size, so re-running over an already-small WebP keeps the original and never degrades. The admin bulk job `POST /admin/lab-tests/recompress-certs` (GET status, `/stop` to cancel) relies on this; it selects IDs first, loads one blob at a time, and yields between rows. Status is in-memory and per-process (resets on restart).
- Janoshik certs still cannot be fetched server-side (Cloudflare 403); they arrive via the browser bookmarklet import path, which also funnels through the helper.

---
name: Lab test AI-extract must prefer stored blob over URL
description: Admin single/batch CoA re-extract endpoints must try pdfBlob before external url, or Cloudflare-blocked sources always fail even with a local copy.
---

Both `POST /admin/lab-tests/:id/extract` (single) and `POST /admin/lab-tests/extract-all` (batch)
independently fetch the report to run Gemini extraction. Each must check `test.pdfBlob` first
(decode base64, `sniffBlobMime`, `extractCoADataFromBuffer`) and only fall back to
`extractCoADataFromAnyUrl(test.url)` when no blob is stored. Erroring only when neither exists.

**Why:** Janoshik blocks server-side fetches behind Cloudflare (see
`janoshik-cloudflare-import.md`). A record can have a perfectly good locally-stored CoA image
(from prior import/upload) but a `url` that 404/403s on server fetch — URL-only extraction logic
always fails those, even though a local copy is sitting right there in `pdfBlob`.

**How to apply:** Any new/edited extraction, re-extraction, or backfill code path touching
`lab_tests` must replicate this same blob-first-then-url branching. Don't just special-case one
endpoint — this repo has both a single-record and a batch variant, and they drifted independently
before (batch endpoint's select query didn't even project `pdfBlob`).

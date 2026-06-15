---
name: Janoshik import via browser helper
description: Why Janoshik lab reports can no longer be fetched server-side, and the bookmarklet workaround.
---

# Janoshik import moved client-side (Cloudflare block)

Janoshik enabled a Cloudflare managed challenge — the server can no longer fetch
Janoshik report pages or images (everything 403s). The old direct-fetch /
bulk-import path is dead for Janoshik. (Uzorak still has its own RPC bypass.)

**Workaround in place:** a free admin bookmarklet ("Import to Salt&Peps",
generated in the Lab Tests admin tab). It runs ON janoshik.com where the admin's
browser has already passed Cloudflare, collects the report image(s), opens the
receiver page `/sleepingpepisadmin/janoshik-receiver` (intentionally NOT behind
the admin login gate), and `postMessage`s the images + admin secret to it. The
receiver POSTs multipart to `POST /admin/lab-tests/bookmarklet-import`.

**Why this shape:**
- postMessage (not direct cross-origin fetch) sidesteps Janoshik's CSP connect-src.
- Multipart (not JSON) avoids the 64kb express.json limit; multer caps 6 files.
- Secret is baked into the bookmarklet (admin's own machine) and is what
  authorizes the import; the receiver also requires `e.source === window.opener`.
- Imported records store the image as `pdfBlob` with `url:null` (same as an
  uploaded file), so /preview returns type "pdf" and the frontend iframes /proxy.
  Dedupe falls back to batch+date+resolved-name since there's no URL.

**How to apply:** if lab-test imports for Janoshik break again, do NOT try to make
the server fetch janoshik.com — it will 403. The supported path is the browser
helper. Real end-to-end testing requires a live Janoshik report + the admin
secret (can't be done from the agent environment).

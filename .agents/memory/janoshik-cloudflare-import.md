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
- Imported records store the image as `pdfBlob`. /preview + /proxy PREFER the
  stored blob whenever it exists (not only when url is null), so the iframe shows
  the saved bytes and never re-hits Cloudflare. This means a record can safely keep
  BOTH a source url (for dedupe) and a blob (for preview) at the same time.

**Bulk importer (free, browser-driven):**
- Two-tab postMessage worker/orchestrator. The bookmarklet on the Cloudflare-cleared
  janoshik tab is a long-lived fetch WORKER (it is `window.opener`); the receiver
  page (`?mode=bulk`) on the app origin is the orchestrator that drives a sequential
  loop and POSTs each report to the SAME `/bookmarklet-import` endpoint.
- Protocol: worker repeats `janoshik-bulk-hello{secret}` → receiver acks `{runId}`
  and captures opener origin → receiver sends `janoshik-bulk-fetch{runId,reqId,url}`
  (strict targetOrigin) → worker replies `janoshik-bulk-image{images:[...]}` or
  `error{reason}`, correlated by runId+reqId, with a receiver-side timeout.
- CORS constraint: the worker can only fetch URLs on the SAME host it runs on.
  Cross-subdomain fetch fails; admin must run the bulk button on the same Janoshik
  host as the pasted links (worker rejects host mismatch with a clear message).
- Worker imports ALL discovered cert images bounded to 6 (not just the first), to
  match the single importer and avoid incomplete multi-image reports.
- Bulk import now STORES the canonicalized source url (`canonicalizeLabUrl`: trim +
  drop hash, keep path/query) and runs a fast url-dup pre-check BEFORE Gemini, plus
  the post-extraction batch+date+name check as a fallback.

**How to apply:** if lab-test imports for Janoshik break again, do NOT try to make
the server fetch janoshik.com — it will 403. The supported path is the browser
helper. Real end-to-end testing requires a live Janoshik report + the admin
secret (can't be done from the agent environment).

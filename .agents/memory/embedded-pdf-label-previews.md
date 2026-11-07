---
name: Embedded PDF label previews
description: Reliable inline rendering for uploaded delivery-label PDFs inside embedded app surfaces.
---

Render uploaded delivery-label PDFs onto a canvas with PDF.js rather than relying on an iframe, object, or the browser's native PDF plugin. Keep open-in-new-tab and download controls as fallbacks.

**Why:** Chromium can show “This content is blocked” for a valid blob-backed PDF when the app itself runs inside a nested preview or embedded frame. The PDF bytes and permissions are fine; the blocked component is the native PDF viewer.

**How to apply:** For protected PDF data already returned to the client, parse those bytes locally with the bundled PDF.js worker and render pages to canvas. Do not expose a new public file URL merely to make embedding work.

Safari Lockdown Mode can remove `FileReader` entirely; do not assume ordinary Safari support means it is available.

Bulk Royal Mail label review should show the actual 4×6 print preview, keep the order/member identity visible, and allow confirmation without searching the long upload list again.

**Why:** The user found inline source-page previews too time-consuming and lost track of whose label they were reviewing.

**How to apply:** Preserve a focused preview-and-confirm flow in future label export changes. Keep crop adjustment available separately rather than making it a required step for a usable suggested crop.

Keep the PDF converter available when label tools load, rather than deferring its module download to the first print preview.

**Why:** An open Admin page requested an obsolete hashed converter chunk after publishing; the chunk returned 404 and prevented label review/download.

**How to apply:** Avoid new late-loaded dependencies within an already-open label review. Keep bounded, session-only previews keyed by source and crop geometry; prefetch the next label without discarding confirmations. Never persist label images in a shared cache.

**Why:** A member's label upload reached the server successfully but the subsequent local preview failed with “Can't find variable: FileReader”, misleadingly presenting a saved upload as a failure.

**How to apply:** Read upload bytes with `Blob.arrayBuffer()` (or `Response(blob).arrayBuffer()` where needed). Prepare local preview data before saving, and test with `FileReader` absent. Do not ask members to disable Lockdown Mode.
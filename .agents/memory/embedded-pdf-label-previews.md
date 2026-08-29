---
name: Embedded PDF label previews
description: Reliable inline rendering for uploaded delivery-label PDFs inside embedded app surfaces.
---

Render uploaded delivery-label PDFs onto a canvas with PDF.js rather than relying on an iframe, object, or the browser's native PDF plugin. Keep open-in-new-tab and download controls as fallbacks.

**Why:** Chromium can show “This content is blocked” for a valid blob-backed PDF when the app itself runs inside a nested preview or embedded frame. The PDF bytes and permissions are fine; the blocked component is the native PDF viewer.

**How to apply:** For protected PDF data already returned to the client, parse those bytes locally with the bundled PDF.js worker and render pages to canvas. Do not expose a new public file URL merely to make embedding work.
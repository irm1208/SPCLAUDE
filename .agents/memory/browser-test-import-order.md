---
name: Browser test import order
description: Browser-only libraries can silently disable portal effects if imported before the DOM exists.
---

In the node/tsx test harness, initialize the jsdom browser globals before importing browser-only routing and portal libraries.

**Why:** Radix captures document availability when its layout-effect module first loads; an early import permanently selects a no-op effect and its portal stays empty. Wouter likewise installs its history event patch only if the browser globals already exist.

**How to apply:** Dynamically import these libraries after DOM setup in node tests. A missing dialog without a render error can be a test initialization issue rather than an app defect.

Vitest’s built-in jsdom environment resolves its dependency from the root runner, not the frontend artifact.

**Why:** A browser test failed to start although the workspace had a usable jsdom dependency for its existing manual test harness.

**How to apply:** Reuse the manual DOM setup when the root runner cannot resolve jsdom. Supply location/history and global event listeners before importing Wouter, not just window/document.

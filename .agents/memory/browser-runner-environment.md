---
name: Browser runner environment
description: Choosing a Chromium executable that works with Replit's Nix runtime.
---

Use the Replit-provided Chromium wrapper when available, rather than assuming a browser downloaded by Playwright can run on Nix.

**Why:** A Playwright Chromium download succeeded but could not launch because its shared-library loader could not locate GLib. The provided wrapper supplies the required runtime dependencies.

**How to apply:** Browser test runners should accept an explicit executable override, use the provided wrapper in Replit, and retain Playwright's standard installation path elsewhere. A successful browser download alone does not establish that the browser can launch.

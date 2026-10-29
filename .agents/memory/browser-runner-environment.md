---
name: Browser runner environment
description: Choosing a Chromium executable that works with Replit's Nix runtime.
---

Use the Replit-provided Chromium wrapper when available, rather than assuming a browser downloaded by Playwright can run on Nix.

**Why:** A Playwright Chromium download succeeded but could not launch because its shared-library loader could not locate GLib. The provided wrapper supplies the required runtime dependencies.

**How to apply:** Browser test runners should accept an explicit executable override, use the provided wrapper in Replit, and retain Playwright's standard installation path elsewhere. A successful browser download alone does not establish that the browser can launch.

Browser-intercepted HTML harnesses do not receive Vite's normal module rewriting
or React refresh preamble. When loading optimized CommonJS dependencies directly,
use their default namespace rather than assuming named exports.

**Why:** A raw browser fixture failed to mount even though the application worked;
Vite normally rewrites ReactDOM's named imports and injects refresh setup, but an
intercepted HTML response skips both transformations.

**How to apply:** Keep harness setup inside the test response, use the dependency's
default namespace, and supply the refresh preamble when importing development
React components. Never change production auth or imports to compensate.

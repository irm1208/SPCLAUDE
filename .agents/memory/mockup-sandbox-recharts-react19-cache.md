---
name: Vite duplicate-React stale dependency cache
description: App or mockup Vite optimize-deps caches can retain an old React path after dependency graph changes and cause invalid-hook-call crashes.
---

Vite's dependency pre-bundler can retain chunks that resolve a different physical React path after a dependency install or when a heavy dependency is first added. This causes "Invalid hook call" or `Cannot read properties of null (reading 'useEffect'/'useRef')` in generated `chunk-*.js`, even when React versions match and `resolve.dedupe` is configured.

**Why:** the artifact's `.vite` cache was built against an earlier physical dependency graph; the stale chunk resolves a different React instance than the one actually mounted.

**How to apply:** first verify React versions match and Vite dedupe is present. Then clear only the affected artifact's `node_modules/.vite` cache and restart its canonical workflow. For Peps use `artifacts/peps-anonymous/node_modules/.vite`; for mockups use `artifacts/mockup-sandbox/node_modules/.vite`.

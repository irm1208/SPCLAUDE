---
name: Mockup sandbox recharts + React 19 stale dep cache
description: Recharts components in mockup-sandbox throw "Invalid hook call" / "Cannot read properties of null (reading 'useRef')" on first load after adding a chart mockup; not a real incompatibility.
---

Recharts v2 + React 19 work fine (the main peps-anonymous app uses this combo across several pages), but the **first** time a recharts-based component is added to `artifacts/mockup-sandbox`, Vite's dependency pre-bundler can produce a stale/duplicate optimize-deps cache that causes an "Invalid hook call" crash pointing into `recharts.js`/`chunk-*.js` in `node_modules/.vite`.

**Why:** the sandbox's `.vite` cache was built before recharts was pre-bundled against the current React 19 deps graph; the stale chunk resolves a different React instance than the one actually mounted.

**How to apply:** if a new recharts (or other newly-added heavy dep) mockup throws an "Invalid hook call" / duplicate-React error on first render, `rm -rf artifacts/mockup-sandbox/node_modules/.vite` then restart the "Component Preview Server" workflow. Don't waste time downgrading recharts or chasing a real incompatibility — it isn't one.

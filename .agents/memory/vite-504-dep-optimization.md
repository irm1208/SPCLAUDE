---
name: Vite dep optimisation 504s on .replit.dev
description: Why clearing the Vite cache causes 504 Gateway Timeout on chunk files through the Replit edge proxy, and the permanent fix.
---

## The problem

Clearing `node_modules/.vite` forces Vite to rediscover all deps from scratch. For a large app, Vite restarts its optimiser each time it finds a new import on a new page. Each restart generates new chunk filenames (e.g. `chunk-KKJXEWU7.js`). References baked into earlier module loads become stale 404s or timeout. Through the Replit edge proxy (~30s timeout), these appear as **504 Gateway Timeout** on chunk files — leaving the user with a blank white page.

**Why:**  The Replit edge proxy sits between the browser and port 5000. If Vite is mid-optimisation when a chunk is requested, the response takes >30s and the edge returns 504 before Vite can reply.

## The fix

Add `optimizeDeps.entries` to `vite.config.ts` listing every page file in `src/pages/`. Vite then scans all possible imports in ONE pass at startup, stabilises chunk hashes before any user request arrives, and never needs to restart mid-load.

**How to apply:** Scan the application bootstrap as well as every page. Page-only scanning misses provider and renderer imports, which can trigger re-optimisation and invalid-hook errors during the first render. Keep new pages covered too.

## Rules

- **Never clear `node_modules/.vite` on a live session** without following up with a full warmup (curl all pages from localhost, wait 60s+, verify hash stability before user access).
- During warmup, compare dependency metadata before and after loading all pages, including `browserHash` (not just the config `hash`); newly discovered dependencies can change browser chunks without changing the config hash.

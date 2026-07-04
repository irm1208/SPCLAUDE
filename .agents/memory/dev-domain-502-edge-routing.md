---
name: Dev-domain 502 vs working preview
description: When the public .replit.dev URL 502s but the app is actually healthy — how to tell it's an edge issue, not code.
---

# Public .replit.dev 502 while app is healthy

After heavy workflow restarts + DB operations (e.g. schema push, reseed), the
public `REPLIT_DEV_DOMAIN` (`*.replit.dev`) can return HTTP/2 **502 with empty
body** for every path, while the app is fully working.

**How to confirm it's an edge/routing issue, not the app:**
- `curl http://127.0.0.1:5000/` → 200 (the start.sh proxy).
- `curl -H "Host: $REPLIT_DEV_DOMAIN" http://127.0.0.1:5000/` → 200 (real edge Host header works locally).
- `screenshot` app_preview (port 5000) renders the app fine — the preview pane uses an internal authenticated path, NOT the public edge.
- Container is IPv4-only (`/proc/net/tcp6` absent), port 5000 listens on `0.0.0.0` — so it's not an IPv6-bind problem.
- The node proxy on 5000 returns a clean 200 identical to Vite; the 502 body is empty → it originates at the Replit edge, not the node proxy (which returns 503 on upstream failure).

**Consequence:** the Playwright testing agent (`runTest`) navigates to the public
URL and gets 502 → "unable"/"failure" even though the app is fine. Fall back to
verifying flows via `screenshot` app_preview (which works).

**Why:** during a window where port 5000 served errors (e.g. DB tables missing
mid-migration), the edge appears to mark the upstream unhealthy / serve stale
502s; it does not always recover from a workflow restart within a session. This
is a platform routing artifact, not a code defect — nothing to fix in the repo.

---
name: Dispatch factory router auth must be path-scoped
description: Why role-scoped dispatch routers (admin/reshipper/organiser) must scope their auth middleware to their own prefix
---

The dispatch UI is served by three router instances built from one factory
(`createDispatchRouter(cfg)` in admin-dispatch.ts): admin (`/admin/dispatch`),
reshipper (`/reshipper/dispatch`), organiser (`/organiser/dispatch`). All three
are mounted at the app root via `router.use(...)` in routes/index.ts, in that
order.

**Rule:** the factory's auth/forceScope/bodyScopeFilter middleware MUST be
mounted path-scoped (`router.use(cfg.prefix, ...authChain)` plus, for admin
only, `cfg.ordersImagesPrefix` when it isn't under `prefix`), NEVER as a bare
`router.use(authChain)`.

**Why:** a bare `router.use(mw)` runs for EVERY request that reaches that router
instance. Because the admin instance is mounted first, a bare auth middleware
made its `requireAdmin` run on `/reshipper/dispatch/*` and `/organiser/dispatch/*`
requests that fall through to it — returning 503 ("Admin not configured", since
ADMIN_SECRET is unset in dev) before they ever reached their own routers. Symptom:
every dispatch tab empty for reshipper/organiser, all `/reshipper/dispatch/*`
endpoints 503 in ~1ms. requireAdmin returns 503 when ADMIN_SECRET is unset, 401
when the secret header is missing/wrong.

**How to apply:** any new role-scoped router built from this factory (or a similar
multi-instance, root-mounted factory pattern) must scope its global middleware to
its own path prefix(es). Quick check: an unauthenticated curl to
`/reshipper/dispatch/...` should return 401 (its own auth), not 503 (admin's).

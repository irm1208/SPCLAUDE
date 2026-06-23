---
name: Reshipper dispatch orders scope
description: Why the reshipper "Dispatched Orders" list leaked other reshippers' orders and how scoping must work.
---

# Reshipper dispatch orders scope

The reshipper "Dispatch & Packing Slips → Dispatched Orders" list is served by
`/reshipper/dispatch/orders`, which runs the shared `adminOrdersHandler`. The
reshipper router's `forceScope` injects `reshipper=<me>` AND `scopeType=reshipper`
into the query on every request under the reshipper prefix.

**Rule:** Any reshipper-scoped read that flows through `adminOrdersHandler` must
narrow by strict ownership — `reshipperUsername == me OR dispatchedByReshipper == me`
(normalized: lowercased, `@` stripped) — NOT by country-leg assignment.

**Why:** `adminOrdersHandler`'s default `reshipper` filter expands via
`gb_reshippers` → country legs, returning *every* order routed to the reshipper's
legs regardless of who actually owns/dispatched it. That leaked all reshippers'
orders into one reshipper's view (e.g. 8 different reshipper pills in one
reshipper's Dispatched Orders). Every other reshipper read endpoint
(dispatch-images-map, parcels, body filters) already narrows by ownership via
`cfg.reshipperScope`; the orders list was the outlier.

**How to apply:** Branch on `scopeType === "reshipper"` (only ever set by the
reshipper `forceScope`, never by admin) and use ownership matching there; keep the
country-leg expansion in the admin/else branch so admin behavior is unchanged.
The ownership definition mirrors `orderOwnedByReshipper` (admin-dispatch.ts) and
`reshipperOwnsOrder` (dispatch-scoped.ts). Both Dispatched and Archived tabs hit
this same route (differing only by `dispatchArchived`), so the fix covers both.

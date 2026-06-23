---
name: api-server vitest + drizzle db mock
description: How to unit-test api-server Express routes without a real DB, and the scoped-router auth gotcha.
---

# Testing api-server routes with vitest

**Framework:** vitest (added to `@workspace/api-server`; `"test": "vitest run"`, node env). Node 20 has no `node:test` `mock.module`, so vitest is required for module mocking.

## Mocking @workspace/db without a Pool
`vi.mock` factory **must not return a Proxy** (vitest rejects it). Pattern:
```ts
vi.mock("@workspace/db", async () => {
  const s = await import("@workspace/db/schema"); // schema-only export builds NO pg Pool -> no DATABASE_URL throw
  return { ...s, db: fakeDb, pool: {} };
});
```
Importing the real `./schema` gives genuine table identity/columns. The fake `db` routes SELECTs by drizzle `getTableName(t)` (SQL names like `orders`, `gb_parcels`, `group_buys`) and records writes via spies. Import the route module **after** the `vi.mock` calls (vi.mock is hoisted, so it's safe).

Auth middleware is mocked per-file (e.g. `../../middleware/require-reshipper`) reading test headers like `x-test-reshipper` / `x-test-organiser`.

## Scoped-router auth gotcha (the real trap)
`createDispatchRouter` (admin-dispatch.ts) applies auth via **path-less** `router.use(cfg.auth)`. Express runs a path-less sub-router `use()` for EVERY request entering that router, even paths it has no route for, and a blocking 401/403 there stops the chain (verified by repro). So mounting BOTH `reshipperDispatchRouter` and `organiserDispatchRouter` in one test app makes the reshipper auth fire on organiser requests -> 401.

**Why production works:** the real `requireReshipper`/`requireOrganiser` pass such requests through via the admin-impersonation `next()` branch, so non-matching paths fall through to the next router.

**How to apply:** in tests, isolate each guard by mounting ONLY the router under test (`buildApp(reshipperDispatchRouter)` vs `buildApp(organiserDispatchRouter)`), don't mount both.

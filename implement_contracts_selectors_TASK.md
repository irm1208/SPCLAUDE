# Agent task: approved organiser contracts and selectors

Work only in `/home/amoney/UpdateSP`.

Use test-driven development. Do not commit. Preserve unrelated dirty files.

1. Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts`.
   - Read the five production components and assert these root hooks are present:
     `approved-command-overview`, `approved-order-desk`, `approved-dispatch-flow`,
     `approved-inventory-allocation`, `approved-member-hub`.
   - Read `approved-workspace.css` and assert Peps brand colours, 236px sidebar,
     64px topbar, 1023px/767px breakpoints, and reduced-motion support.
   - Run it and confirm it fails because implementation/hooks are absent.

2. Create `approved-selectors.test.ts` first, then `approved-selectors.ts`.
   - `buildOrderTrend(orders)` returns at least four chronological cumulative
     points, ending with total non-cancelled received and verified (non-pending)
     counts. It must be deterministic for empty and same-day data.
   - `buildDispatchLanes(state)` returns four lanes (`awaiting`, `packing`,
     `label`, `carrier`) and assigns each active/logged order exactly once.
     Use state fulfilment/readiness/qr status/log without mutating state.
   - `buildProductAllocation(product)` accepts the minimal structural input
     `{id,soldCount,stock,visible}` and returns non-negative required/ordered/
     received/allocated values with `allocated <= received <= ordered`, plus a
     readiness status (`ready`, `shortage`, or `review`). Do not persist fields.
   - Watch selector tests fail for missing exports, implement minimally, then
     watch them pass.

3. Add `test:approved-workspace` to
   `artifacts/peps-anonymous/package.json`, running both tests with Node's
   `--experimental-strip-types --test`.

4. Do not create CSS or edit the five production components in this task.
   It is expected that the visual contract test remains red while selector
   tests pass. Report exact RED/GREEN commands and output summary.

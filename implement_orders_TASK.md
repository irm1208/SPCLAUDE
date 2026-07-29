# Agent task: approved Order Desk

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit. Preserve all
unrelated dirty/untracked files.

This is Task 5 of the approved five-picture GB Organiser production system.
The shared shell and Command Overview are already implemented and must remain
intact.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/02-order-desk.svg`

Modify only:

- `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`
- create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css`
- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` only to import the new
  stylesheet after the already-approved styles.
- the focused approved contract test only where needed to add meaningful
  Orders-specific structural assertions before implementation.

Required result:

1. Root JSX element uses `approved-order-desk`.
2. Replace the current competing/duplicated table, saved-view sidebar, card,
   Atlas drawer and quick-view presentations with one coherent production
   surface: compact toolbar + connected summary strip + semantic order table +
   persistent inspector. Keep modals after this main surface.
3. Add `inspectedOrderId` state, initially `highlightId ?? null`; choose the
   inspected order from filtered results and fall back to the first filtered
   order. Clicking or keyboard-activating a row opens it. Selection checkboxes
   remain independent and continue to drive the current bulk mutations.
4. Toolbar keeps existing search, status/stage, country, sort, import/export and
   add-order/edit flows. Do not create a second source of filter state.
5. Summary strip shows exact live totals (total orders, awaiting payment,
   preparing/active, verified value) from repository orders.
6. Desktop table uses real fields for order/member, products, payment, stage,
   destination and total. Use visible text status pills and accessible table
   markup. Selected/inspected rows have distinct, non-colour-only state.
7. Persistent desktop inspector shows member identity, order contents, payment,
   destination/carrier/tracking, current stage, notes and a simple timeline
   derived from the actual order fields. Its edit/status actions must call the
   existing handlers/mutations rather than duplicate state changes.
8. Preserve all existing operational functionality: mark paid/dispatched,
   proof handling, row/bulk selection, CSV import/export, add-product, task,
   edit, delete, saved-view/filter state if still externally used, and all
   current modals. Do not replace repository data with picture mock data.
9. At <=767px render table rows as labelled order cards and stack/show the
   inspector as a full-width panel with a visible close button; no horizontal
   page overflow. At <=1023px allow a stacked inspector.
10. Style beneath `.organiser-v2 .approved-order-desk`: 27px title hierarchy,
    14px body, 12–13px controls, shallow `#D0DAE4` borders/shadows, Peps navy and
    blue, semantic green/amber/red. Include visible focus and reduced motion.
    Do not edit legacy CSS layers.

Important code-quality constraints:

- `OrdersTab.tsx` is already large. Reuse existing types/handlers and extract
  small file-level presentational helpers within the same file if needed; do
  not add another full parallel order implementation.
- There is a documented pre-existing type error around the prior Atlas table
  near line 1045. The approved rewrite should remove/resolve that stale
  conflicting block rather than suppressing it.
- Do not add dependencies.

TDD and verification:

1. Add focused source/structure assertions for the root, inspector state,
   semantic table, mobile close control and stylesheet import; observe RED.
2. Implement and make the Orders contract GREEN.
3. Run `pnpm test:approved-workspace`, `pnpm test:domain`, a targeted TypeScript
   check for Orders/imports, and `git diff --check`.
4. Self-review every existing handler/modal is still reachable and compare the
   main surface against the SVG. Report DONE/DONE_WITH_CONCERNS with exact
   results. Do not alter other tabs.

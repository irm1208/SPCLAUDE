# Agent task: approved Inventory & Allocation

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit. Preserve all
unrelated dirty/untracked files.

This is Task 7 of the approved five-picture GB Organiser production system.
Previously approved shell/tab work must remain intact.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/04-inventory-allocation.svg`

Modify only:

- `artifacts/peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx`
- create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-products.css`
- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` only to import the new
  stylesheet after the existing approved styles.
- the focused approved contract test only where needed to add meaningful
  Products-specific structure assertions before implementation.

Required result:

1. Root JSX element uses `approved-inventory-allocation`.
2. Keep the existing catalogue source, search/category/filter state, add/edit,
   expand/collapse, visibility, delete, CSV import/export and price-list flows.
   Do not replace products with the three picture examples.
3. Header follows the approved catalogue hierarchy and live status treatment.
4. Render one connected summary ribbon derived from current products: active
   products, member demand, received stock and exception count.
5. Render a compact filter band using the existing search/categories plus
   useful readiness filters without duplicating the source state.
6. For each product call `buildProductAllocation` with its real id, soldCount,
   stock and visible values. Display required, ordered, received, allocated,
   available/progress and visible readiness text. These are presentation-only;
   never persist derived allocation fields.
7. Use full-width allocation records, not a generic card grid. Each has a
   restrained semantic left rail/status label, product identity and supplier/
   batch details where actual data exists, allocation progress, and an action/
   readiness area. Existing expand/edit controls remain reachable.
8. Unlimited stock, zero demand, hidden/review and shortage states must render
   honestly from selector output. Do not fabricate supplier/COA data when the
   product lacks it.
9. <=1023px stack each record’s columns; <=767px use one-column readable
   records, wrapping toolbars and no page overflow. Include visible focus and
   reduced motion.
10. Style only beneath `.organiser-v2 .approved-inventory-allocation` with
    approved typography, `#D0DAE4` shallow borders/shadows, Peps navy/blue and
    semantic status colours. Do not edit legacy CSS.

TDD and verification:

1. Add focused assertions for root hook, selector use, summary/filter/record
   semantics and stylesheet import; observe RED.
2. Implement and make those assertions GREEN.
3. Run `pnpm test:approved-workspace`, relevant storage/domain tests, a targeted
   strict TypeScript check for Products/imports, and `git diff --check`.
4. Self-review every existing product operation is still reachable and compare
   the layout against the SVG. Report DONE/DONE_WITH_CONCERNS with exact
   results. Do not alter other tabs.

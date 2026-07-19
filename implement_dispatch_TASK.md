# Agent task: approved Dispatch Flow

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit. Preserve all
unrelated dirty/untracked files.

This is Task 6 of the approved five-picture GB Organiser production system.
Previously approved shell/tab work must remain intact.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/03-dispatch-flow.svg`

Modify only:

- `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/DispatchControlDesk.tsx`
- create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-dispatch.css`
- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` only to import the new
  stylesheet after the existing approved styles.
- the focused approved contract test only where needed to add meaningful
  Dispatch-specific structure assertions before implementation.

Required result:

1. Root JSX element uses `approved-dispatch-flow`.
2. Preserve the existing dispatch view/log switch and all state mutations.
3. At top render a connected dispatch-readiness/carrier summary from real
   `DeskState`: ready/total, progress, log count, and useful carrier/country
   grouping available in the current records. Do not copy picture totals.
4. Call `buildDispatchLanes(state)` once and render four semantic pipeline
   sections: Awaiting stock, Ready to pack, Label ready, Handed to carrier.
5. Each lane card must use the actual `DispatchOrder`/`DispatchRecord` fields:
   code/member, country, products/quantities, QR/packing/readiness status,
   parcel/label/tracking data where available. Every state has visible text,
   never colour alone.
6. Keep parcel selection through `selectParcelsAndCompute`, order selection via
   `selectedOrderIds`, confirmation through `confirmDispatch`, restore/undo via
   `restoreDispatch`, and the current log view. Do not create duplicate
   dispatch state or static cards.
7. Pipeline cards can select active orders using the existing callbacks; logged
   records are read-only apart from the existing restore action.
8. Desktop: four balanced columns with horizontally safe min-widths. <=1023px:
   two columns. <=767px: one stacked flow, no page overflow, primary actions
   remain reachable. Keep visible focus and reduced-motion support.
9. Style only beneath `.organiser-v2 .approved-dispatch-flow` with approved
   27px/14px/12–13px hierarchy, shallow borders/shadows, Peps navy/blue and
   restrained semantic amber/green/red. Do not edit legacy CSS.

TDD and verification:

1. Add focused assertions for root hook, one `buildDispatchLanes` use, all four
   lane semantics, preserved mutation function references, and stylesheet
   import; observe RED.
2. Implement and make those assertions GREEN.
3. Run `pnpm test:dispatch`, `pnpm test:approved-workspace`, a targeted strict
   TypeScript check for dispatch/imports, and `git diff --check`.
4. Self-review both desk and log modes and compare the desk against the SVG.
   Report DONE/DONE_WITH_CONCERNS with exact results. Do not alter other tabs.


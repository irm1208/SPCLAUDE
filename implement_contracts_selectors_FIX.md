# Required fixes from spec review

Work in `/home/amoney/UpdateSP`. Use TDD. Do not touch unrelated files.

1. Strengthen `approved-selectors.test.ts` first and watch new assertions fail:
   - `buildOrderTrend([])` and one same-day input must return at least four
     chronological cumulative points.
   - Cancelled orders do not count as received or verified.
   - Exact final received/verified totals are asserted.
   - Lane IDs are exactly `awaiting`, `packing`, `label`, `carrier`; every
     active/logged order occurs once; input state is unchanged.
   - Allocation values are all non-negative and satisfy
     `allocated <= received <= ordered`; readiness is exactly one of
     `ready | shortage | review`; input is unchanged.
2. Update `approved-selectors.ts` minimally to pass those tests.
3. Strengthen `approved-workspace.test.ts` to assert `236px` sidebar and
   `64px` topbar in `approved-workspace.css`.
4. Add package script:
   `test:approved-workspace`: `node --experimental-strip-types --test src/pages/organiser-v2/approved-workspace.test.ts src/pages/organiser-v2/approved-selectors.test.ts`
5. Run selector tests GREEN. The visual contract may remain RED because CSS and
   component hooks are intentionally not implemented yet. Report RED/GREEN evidence.

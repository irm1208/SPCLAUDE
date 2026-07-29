# Required fixes from code-quality review

Work in `/home/amoney/UpdateSP`; TDD; do not edit unrelated files.

1. Strengthen tests first and confirm RED:
   - Strictly reject impossible calendar dates such as `2026-02-30`.
   - Treat timezone-less ISO datetime as a calendar date without host-TZ drift;
     exact expected dates must be hard-coded, not copied from actual output.
   - Build explicit dispatch state with unready, ready+reminder, ready+uploaded,
     ready+not-required, and logged records. Assert exact IDs per `awaiting`,
     `packing`, `label`, and `carrier` lane.
   - Assert exact allocation outputs for sufficient, shortage, hidden/review,
     zero, negative, NaN, and Infinity inputs.
2. Implement strict deterministic date extraction/validation. Accept date-only or
   ISO datetime prefixes only when YYYY-MM-DD is a real UTC calendar date. Do
   not use host-local parsing to choose the grouping date.
3. Tighten `approved-workspace.test.ts` so component hooks must appear in an
   actual JSX `className` and `GbOrganiserV2.tsx` must import
   `approved-workspace.css` after `peps-native.css`.
4. Run selector tests GREEN, targeted strict TypeScript GREEN, and confirm the
   combined visual contract remains RED only for intentional missing UI/CSS.

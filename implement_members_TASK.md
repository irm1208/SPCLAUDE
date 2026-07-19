# Agent task: approved Member Hub

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit. Preserve all
unrelated dirty/untracked files.

This is Task 8 of the approved five-picture GB Organiser production system.
Previously approved shell/tab work must remain intact.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/05-member-hub.svg`

Modify only:

- `artifacts/peps-anonymous/src/pages/organiser-v2/MembersTab.tsx`
- create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-members.css`
- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` only to import the new
  stylesheet after the existing approved styles.
- the focused approved contract test only where needed to add meaningful
  Members-specific structure assertions before implementation.

Required result:

1. Root JSX element uses `approved-member-hub`.
2. Preserve current member construction from repository orders and existing
   search, country, sort, highlight and open-orders actions. Do not replace it
   with picture mock members.
3. Selection is persistent: default to highlighted member when available,
   otherwise the first filtered member. Clicking or keyboard-activating a
   directory row selects it; filtering must gracefully choose a valid result.
4. Render approved page header/member totals, a compact search/status/filter
   toolbar, then one connected desktop split: member directory on the left and
   persistent member profile on the right.
5. Directory rows show actual initials/name/contact/country, order count,
   aggregate value and a visible derived payment state. Selected state is
   clear beyond colour alone and keyboard operable.
6. Profile header and summary show live aggregate value, orders, payment status
   and latest activity. Current order uses real recent order/product data.
7. Member details, delivery/payment fields, organiser note and recent activity
   must be derived conservatively from existing member/order fields. Use clear
   “Not recorded” copy when data is absent; do not fabricate picture details.
8. Keep message/open-orders actions. If messaging has no existing mutation,
   retain the existing UI behavior rather than inventing persistence.
9. <=1023px reduce split proportions; <=767px stack directory then profile with
   selection and close/back access, no page overflow. Include visible focus and
   reduced motion.
10. Style only beneath `.organiser-v2 .approved-member-hub` with the approved
    27px/14px/12–13px hierarchy, Peps navy/blue, shallow borders/shadows and
    restrained semantic status colours. Do not edit legacy CSS.

TDD and verification:

1. Add focused assertions for root hook, persistent selected-member state,
   directory/profile semantics, keyboard selection, and stylesheet import;
   observe RED.
2. Implement and make those assertions GREEN.
3. Run `pnpm test:domain`, `pnpm test:approved-workspace`, a targeted strict
   TypeScript check for Members/imports, and `git diff --check`.
4. Self-review empty/search-filtered/member-selected states and compare against
   the SVG. Report DONE/DONE_WITH_CONCERNS with exact results. Do not alter
   other tabs.

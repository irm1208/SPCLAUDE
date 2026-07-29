# Shared shell spec fixes after review

Work only in `/home/amoney/UpdateSP`. Do not commit. Preserve unrelated files.
Use TDD and fix only the reviewed shared-shell issues below.

Blocking issues:

1. `approved-workspace.css` currently hides Share and secondary actions at
   `<=767px`. Share and Manage (and the analogous setup actions) must remain
   keyboard/touch reachable as condensed icon controls. Wrap labels in spans
   where necessary, retain accessible names, and keep the topbar within 320px
   without horizontal page overflow.
2. Earlier legacy rules hide `.ov2-page-crumb` with `!important` at <=1023px
   while Peps Native hides the brand crumb. Explicitly restore a meaningful
   page breadcrumb in the final approved layer at tablet/mobile widths (using
   the specificity/importance needed to beat the earlier rule). Do not restore
   every long breadcrumb segment.
3. When the sidebar is collapsed, the setup-switch and dashboard-exit visible
   labels are hidden while their icons are aria-hidden. Give both buttons
   stable accessible names in `DashboardSidebar.tsx`. Every setup-step button
   must also retain an accessible name when its visible label is collapsed.

Verified correctness concerns to include in this fix:

4. `OrganiserTopbar` renders enabled Notifications and Profile buttons, but
   `Workspace` supplies no handlers. Wire Profile to the existing `/account`
   destination and Notifications to the organiser’s actionable Todo view (or
   another existing in-scope notification destination); do not leave enabled
   no-op controls. Render optional Back, Share, Notifications and Profile
   controls only when their handler exists, so Setup does not expose no-ops.
5. `handleShare` uses optional chaining on `clipboard.writeText` and can show a
   false success toast when Clipboard API is absent. Treat a missing write
   function as failure and only show copied state after a real resolved write.
6. Provide a meaningful existing contextual primary navigation action for
   non-Overview workspace tabs (for example, Orders→Dispatch,
   Dispatch→QR codes, Members→Orders, Products→Dispatch, and Edit setup for
   remaining destinations). Do not add no-op buttons or duplicate tab mutation
   logic.

TDD requirements:

- Extend `approved-workspace.test.ts` with focused source/CSS assertions for
  responsive breadcrumb restoration, reachable condensed actions, collapsed
  button accessible names, supplied notification/profile handlers, and guarded
  clipboard support. Observe RED before implementation.
- Keep the approved dashboard typography fix unchanged.
- Run the focused shell tests, workspace theme, Peps theme, targeted strict
  TypeScript for changed TSX, and `git diff --check`.
- Self-review at 1023px, 767px, 375px and 320px from the CSS cascade.
- Report DONE/DONE_WITH_CONCERNS with exact results. Do not touch tab content.

# User feedback fix: match the main website typography

Work only in `/home/amoney/UpdateSP`. Do not commit. Preserve unrelated files.

The user has reviewed the live shell and reported that its typography does not
match the rest of the website. This is valid and belongs in the current shared
shell slice.

Verified codebase evidence:

- The main dashboard uses
  `'Inter','Salesforce Sans','Helvetica Neue',Arial,sans-serif` from
  `components/dashboard-theme.ts`.
- Dashboard navigation is 13–13.5px at standard 600/700 weights; controls are
  generally 12.5–13px.
- The late Atlas rule leaves `.organiser-v2` at 13px.
- The new `approved-workspace.css` currently shrinks important shell copy to
  8–11px and uses synthetic unsupported values such as 520, 560, 710, 720,
  760 and 780, causing the visual mismatch.

Fix with TDD inside the current shell task:

1. Extend the shell typography contract and observe RED. It should enforce the
   dashboard font stack, a 14px organiser base, readable 13–13.5px navigation,
   12.5–13px topbar controls, and standard available weights only
   (400/500/600/700/800) for approved-workspace rules.
2. Update only `approved-workspace.css` (and its focused test) to align the
   shell typography with `DashboardShell` while preserving the approved shell
   layout and colours.
3. Active group-buy label/name/status, nav group headings, footer/profile,
   breadcrumbs/search/actions/profile must no longer use 8–10px essential
   copy. Use the dashboard hierarchy and standard weights.
4. Keep compact density; do not redesign the cards/layout or touch tab content.
5. Re-run shell contract, workspace/Peps theme tests and `git diff --check`.
   Ensure reviewers re-check the updated result before reporting completion.

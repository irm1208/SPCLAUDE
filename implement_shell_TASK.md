# Agent task: approved organiser shared shell

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit and preserve all
unrelated dirty/untracked files.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/01-command-overview.svg`

Implement only the shared production shell slice:

- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css`.
- Modify `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` to import it
  after `peps-native.css`.
- Modify `DashboardSidebar.tsx`, `OrganiserTopbar.tsx`, and `Workspace.tsx` only
  as needed for the approved shell.

Test-first requirements:

1. Before implementation, extend `approved-workspace.test.ts` with separate
   shell assertions and confirm RED:
   - `approved-workspace.css` exists and contains exact `236px` sidebar,
     `64px` topbar, `#F4F6F9`, `#1B3164`, `#1B3A7A`, `#2D6BCC`, `#0F1F38`.
   - final CSS includes 1023px and 767px breakpoints and reduced motion.
   - sidebar source contains an accessible `ov2-active-gb-card` button and
     retains every workspace destination through `WORKSPACE_GROUPS`.
   - topbar source contains labelled search, notifications, and organiser
     profile controls.
   - `GbOrganiserV2.tsx` imports the final stylesheet after `peps-native.css`.
2. Watch the new shell assertions fail for missing source/CSS.
3. Implement minimally, then run only shell/style assertions GREEN. The five
   page-hook test remains expected RED.

Visual/behaviour requirements:

- Keep `OrganiserShell` structure, skip link, mobile drawer, collapse state,
  Cmd/Ctrl+K search, setup/workspace switching, badges, and every nav tab.
- Restore the approved dark navy gradient sidebar despite the late Atlas CSS.
- 236px expanded sidebar; 76px collapsed; 64px topbar; `#F4F6F9` canvas.
- Brand block says `Peps Anonymous` and `GB Organiser`.
- Add a separate active-group-buy button showing `Winter Peptide Run 2025`, a
  green live dot, and close status. Do not delete the existing `gbName` prop.
- Navigation remains compact (13px, minimum 32px row), active row is white with
  navy text/blue indicator, labels remain readable on navy.
- Topbar uses compact breadcrumb, functional search, labelled notification
  button, organiser avatar/name, Manage/Share/contextual primary actions.
- At <=1023px use existing drawer. At <=767px stack/condense actions without
  horizontal overflow. Visible focus and reduced motion are required.
- Scope every style beneath `.organiser-v2`; do not edit `peps-native.css` or
  `organiser-v2.css` in this task.

Verification:

- Run `pnpm test:approved-workspace` and report which expected page-hook test
  remains red.
- Run `pnpm test:workspace-theme`, `pnpm test:peps-native-theme`, and
  `git diff --check`.
- Run a targeted TypeScript check for modified TSX if practical; full project
  typecheck has many documented pre-existing failures.

# Code-quality review: approved shared organiser shell

Review only; do not modify files and do not commit.

Workspace: `/home/amoney/UpdateSP`

Scope:

- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`
- `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`
- `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx`
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css`
- shell portions of `approved-workspace.test.ts`

The spec-compliance review is approved. Review implementation quality only:

- React/TypeScript correctness and unnecessary rerenders/state;
- every rendered interactive control performs its labelled action;
- responsive CSS cascade at 1023/767/375/320, no hidden required actions or
  horizontal page overflow;
- typography alignment with main `DashboardShell` and standard loaded weights;
- accessibility names/focus/collapsed states and reduced motion;
- clipboard/share correctness and timer cleanup risks;
- test quality (real regression protection, not comments/dead-string matches);
- scope isolation beneath `.organiser-v2` and late legacy-rule precedence;
- no hard-coded behaviour that should use existing props/data;
- preserve all workspace destinations and current repository/navigation flows.

Run focused shell tests, targeted TypeScript if practical, theme tests and
`git diff --check`. Report `APPROVED` or prioritized findings with exact file
locations and evidence. Do not report the intentionally unbuilt five-tab hook
failure as a shell defect.

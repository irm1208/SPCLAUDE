# GB Organiser Quiet Context Rail Implementation Plan

> **For agentic workers:** Execute inline in the active workspace. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the approved B2 dark context strip with option A: a quiet, pale summary row showing group-buy status, member count, and total order count.

**Architecture:** Keep the shared `OrganiserTopbar` responsible for presentation, derive the three values from the existing live workspace repositories/API query, and retain the setup flow with explicit zero values. Use the existing Peps Native tokens and the final `approved-workspace.css` layer; no new navigation controls or data endpoints are introduced.

**Tech Stack:** React 19, TypeScript, TanStack Query, Node test runner, Lucide React, scoped CSS.

---

## File map

- Modify `src/pages/organiser-v2/topbar-context.ts` and its test — format only status/member/order labels.
- Modify `src/pages/organiser-v2/OrganiserTopbar.tsx` — render semantic option-A metrics and remove obsolete currency/close-date presentation.
- Modify `src/pages/organiser-v2/Workspace.tsx` — query the member directory and pass live member/order totals.
- Modify `src/pages/organiser-v2/SetupWizard.tsx` — pass zero-value draft metrics.
- Modify `src/pages/organiser-v2/approved-workspace.css` — replace the navy rail with the pale utility row and preserve responsive behavior.
- Modify focused contract tests/package script as needed.

## Task 1: Lock the option-A model and source contracts

- [ ] Update the model tests first for status, member count, and order count, then run them and confirm the expected failure.
- [ ] Update the topbar contract to require the pale summary row, semantic metric labels, live member/order wiring, and absence of the old currency/close-date rail fields.
- [ ] Run the focused tests and confirm they fail only because production code still renders B2.

## Task 2: Implement the quiet summary rail

- [ ] Implement the smallest model change that formats status and numeric counts, preserving zero and omitting unavailable values.
- [ ] Add the member-directory query in `Workspace` using the existing `organiserApi.members` cache key; derive the unique count with `mergeMemberDirectory(repositoryOrders, membersQuery.data ?? [])`.
- [ ] Pass `orderCount={repositoryOrders.length}` and explicit zero counts from `SetupWizard`.
- [ ] Render a `dl`-based context row with labels `Status`, `Members`, and `Orders`; keep the work bar/search/actions/profile unchanged.
- [ ] Replace only the context-rail CSS with a light `#F8FAFC` utility surface, subtle bottom border, readable labels, and compact responsive rules.

## Task 3: Verify

- [ ] Run the focused context, redesign-contract, and approved-workspace suites.
- [ ] Run the production Vite build.
- [ ] Fetch `/gborganiser-v2` from port 3001 and inspect the served bundle response after the watcher rebuilds.
- [ ] Check `git diff --check` on the touched paths and report any unrelated pre-existing typecheck failures separately.

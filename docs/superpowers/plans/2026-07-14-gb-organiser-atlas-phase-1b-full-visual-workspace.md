# GB Organiser Atlas Phase 1B Full Visual Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Atlas 2.3 visual system to every GB Organiser V2 destination and setup step, including Members, professional Orders/Members tables, and contextual quick-view drawers.

**Architecture:** Keep all existing feature data and mutations in their current domain boundaries, and add a scoped presentation layer under `.organiser-v2`. Shared Atlas primitives own page headers, badges, filter/table geometry, empty states, and drawers; route components compose those primitives without moving persistence back into the UI.

**Tech Stack:** React 19, TypeScript, Vite, Lucide, Recharts, scoped CSS, Node test runner.

---

## Workspace Constraint

The organiser source is untracked in the shared workspace and would be omitted by a fresh worktree. The user previously selected inline execution, so implementation remains in the current workspace and preserves unrelated files. `/gborganiser` is out of scope.

### Task 1: Atlas Contract and Navigation

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/atlas-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/nav.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] Write a failing source-contract test asserting an organiser-only sidebar, a Members destination, an explicit dashboard exit, and the Atlas root marker.
- [ ] Run `node --experimental-strip-types --test src/pages/organiser-v2/atlas-contract.test.ts`; expect a Members assertion failure.
- [ ] Add `members` to the workspace type, navigation, metadata, search vocabulary, and route switch.
- [ ] Replace utility links with one explicit “Back to main dashboard” exit and a compact organiser profile.
- [ ] Run the contract test; expect all navigation assertions to pass.

### Task 2: Shared Atlas Primitives

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/AtlasUi.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserUi.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/WorkspaceScreen.tsx`

- [ ] Extend the failing contract test with assertions for `AtlasPageHeader`, `AtlasStatusBadge`, `AtlasDataTable`, and `AtlasQuickViewDrawer` exports.
- [ ] Run the contract test; expect missing primitive assertions.
- [ ] Implement typed presentation-only primitives for headers, filters, tables, badges, empty states, drawers, and stat cards.
- [ ] Make `WorkspaceScreen` supply one consistent route heading while allowing Overview’s command-centre hero.
- [ ] Re-run the contract test; expect primitive assertions to pass.

### Task 3: Members Directory and Member Quick View

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/member.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/member.test.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/MembersTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] Write failing tests for member aggregation from the normalized order snapshot, including totals, countries, payment counts, and fulfilment counts.
- [ ] Run the member test; expect `ERR_MODULE_NOT_FOUND` for `member.ts`.
- [ ] Implement a pure member read-model selector over `OrganiserOrder[]`.
- [ ] Re-run the member test; expect all aggregation assertions to pass.
- [ ] Build a searchable, filterable, sortable member directory using group-buy data and an accessible member quick-view drawer.

### Task 4: Professional Orders Table and Order Quick View

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] Extend the contract test to assert Orders composes the Atlas table and drawer.
- [ ] Run the contract test; expect Orders composition assertions to fail.
- [ ] Keep repository reads and mutations, replacing the large-card default view with a compact sortable data table, saved-view chips, filters, row selection, bulk action bar, and responsive card fallback.
- [ ] Add an order quick-view drawer with member, items, payment, delivery, notes, and context-preserving actions.
- [ ] Re-run contract and domain tests; expect both to pass.

### Task 5: Overview and Analytics Alignment

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`

- [ ] Add a contract assertion for overview attention, pipeline, and chart landmarks.
- [ ] Run the contract test; confirm any missing landmark fails.
- [ ] Align the command centre to Atlas metrics, compact status colours, smaller chart geometry, attention list, fulfilment pulse, and recent activity.
- [ ] Re-run the contract test and overview tests.

### Task 6: Apply Atlas to All Operational Routes

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Modify when markup is missing: `TodoTab.tsx`, `BroadcastTab.tsx`, `ParcelsTab.tsx`, `DispatchTab.tsx`, `QrCodesTab.tsx`, `ReshippersTab.tsx`, `CountryLegsTab.tsx`, `ShippingTab.tsx`, `PnLTab.tsx`, `VendorCoasTab.tsx`, `TestingGroupsTab.tsx`, `SummaryTab.tsx`, `TicketsTab.tsx`, `GbSettingsTab.tsx`, `GbProductsTab.tsx`, `RulesTab.tsx`

- [ ] Add a route-coverage assertion listing all 19 destinations and their visual treatment marker.
- [ ] Run the contract test; expect coverage to fail until all destinations are present.
- [ ] Normalize each destination’s first viewport: header rhythm, toolbar, white surfaces, compact statuses, form controls, table/list density, empty states, and responsive stacking.
- [ ] Preserve all existing handlers, storage keys, exports, imports, and feature interactions.
- [ ] Re-run the contract and focused organiser tests.

### Task 7: Apply Atlas to the Seven-Step Setup Flow

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/BasicsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ProductsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ShippingStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/PaymentsStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/AccessStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/RulesStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/ReviewStep.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`

- [ ] Add setup coverage assertions for all seven step labels and Atlas setup markers.
- [ ] Run the contract test; expect the missing marker to fail.
- [ ] Apply the same sidebar, typography, field, card, summary, sticky action, validation, and responsive patterns to every step without changing setup state logic.
- [ ] Re-run the contract and workspace-theme tests.

### Task 8: Responsive, Accessibility, and Preview Verification

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/atlas-contract.test.ts`

- [ ] Add assertions for dialog semantics, labelled tables, current navigation, mobile drawer controls, and reduced-motion CSS.
- [ ] Run the contract test and correct failing accessibility assertions.
- [ ] Run `npm run test:domain`, all focused organiser tests, and `npm run build` from `artifacts/peps-anonymous`.
- [ ] Start or refresh Vite preview on localhost and verify `/gborganiser-v2` returns HTTP 200.
- [ ] Inspect the rendered desktop and mobile pages, then correct any clipping, mismatched type, or route-specific legacy surface that remains.

## Completion Gate

The phase is complete only when all workspace destinations and setup steps are reachable, Members and both drawers function, Orders and Members use the professional table treatment, existing organiser tests remain green, the production build succeeds, and the localhost preview returns the rebuilt route.

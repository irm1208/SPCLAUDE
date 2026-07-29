# GB Organiser V2 Peps Native Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Peps Native Workspace system to `/gborganiser-v2` across all 18 workspace destinations and all seven setup steps without changing existing data or feature behavior.

**Architecture:** Keep the existing React feature components and state boundaries. Update the shared TypeScript theme contract, add one focused `peps-native.css` layer after the existing V2 stylesheet, and make only the small markup changes required for the approved brand mark and breadcrumb hierarchy. Page-treatment attributes already provided by `WorkspaceScreen` remain the styling boundary for dashboard, board, table, composer, logistics, insight, support, and configuration screens.

**Tech Stack:** React 19, TypeScript, Vite, CSS custom properties, Tailwind utility output already present in feature components, Node test runner.

---

## File Structure

- Create `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts` — executable contract test for approved tokens and shell dimensions.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css` — isolated visual override layer for the selected system.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts` — Peps Native CSS variables and exported palette constants.
- Modify `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` — import the selected theme layer after the existing V2 stylesheet.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx` — four-tile Peps mark markup.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx` — add Peps Anonymous to the breadcrumb hierarchy.
- Modify `artifacts/peps-anonymous/package.json` — add a focused theme-test script.
- Modify `docs/organiser-v2-completion-report.md` only if the existing report claims a superseded visual system.

### Task 1: Peps Native Theme Contract

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write the failing theme contract test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { PEPS_NATIVE, V2_VARS } from "./theme.ts";

test("Peps Native exposes the approved brand and surface palette", () => {
  assert.equal(PEPS_NATIVE.deepNavy, "#1B3164");
  assert.equal(PEPS_NATIVE.navy, "#1B3A7A");
  assert.equal(PEPS_NATIVE.blue, "#2D6BCC");
  assert.equal(PEPS_NATIVE.amber, "#E9A020");
  assert.equal(PEPS_NATIVE.canvas, "#F4F6F9");
  assert.equal(PEPS_NATIVE.text, "#0F1F38");
  assert.equal(PEPS_NATIVE.border, "#D0DAE4");
});

test("V2 variables use the approved compact shell", () => {
  assert.equal(V2_VARS["--ov2-canvas"], "#F4F6F9");
  assert.equal(V2_VARS["--ov2-primary"], "#1B3A7A");
  assert.equal(V2_VARS["--ov2-sidebar-width"], "236px");
  assert.equal(V2_VARS["--ov2-topbar-height"], "64px");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types src/pages/organiser-v2/peps-native-theme.test.ts
```

Expected: FAIL because `PEPS_NATIVE` does not exist and the current shell values are `309px` and `100px`.

- [ ] **Step 3: Implement the approved theme contract**

Add this palette above `V2_VARS` in `theme.ts` and derive the V2 variables from it:

```ts
export const PEPS_NATIVE = {
  deepNavy: "#1B3164",
  navy: "#1B3A7A",
  blue: "#2D6BCC",
  amber: "#E9A020",
  canvas: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFC",
  border: "#D0DAE4",
  borderSoft: "#DBE3EC",
  text: "#0F1F38",
  body: "#374151",
  muted: "#6B7280",
  subtle: "#8A9AAA",
  success: "#22C55E",
  danger: "#EF4444",
} as const;
```

Set `V2_VARS` to the approved values, including:

```ts
["--ov2-canvas" as string]: PEPS_NATIVE.canvas,
["--ov2-sidebar" as string]: PEPS_NATIVE.deepNavy,
["--ov2-card" as string]: PEPS_NATIVE.surface,
["--ov2-border" as string]: PEPS_NATIVE.border,
["--ov2-border-strong" as string]: "#BECADA",
["--ov2-text" as string]: PEPS_NATIVE.text,
["--ov2-muted" as string]: PEPS_NATIVE.muted,
["--ov2-subtle" as string]: PEPS_NATIVE.subtle,
["--ov2-primary" as string]: PEPS_NATIVE.navy,
["--ov2-primary-hover" as string]: PEPS_NATIVE.deepNavy,
["--ov2-green" as string]: PEPS_NATIVE.success,
["--ov2-orange" as string]: PEPS_NATIVE.amber,
["--ov2-danger" as string]: PEPS_NATIVE.danger,
["--ov2-sidebar-width" as string]: "236px",
["--ov2-topbar-height" as string]: "64px",
["--t-bg" as string]: PEPS_NATIVE.canvas,
["--t-surface" as string]: PEPS_NATIVE.surface,
["--t-surface2" as string]: PEPS_NATIVE.surfaceSoft,
["--t-border" as string]: PEPS_NATIVE.border,
["--t-nav" as string]: PEPS_NATIVE.navy,
["--t-blue" as string]: PEPS_NATIVE.blue,
["--t-blue-deep" as string]: PEPS_NATIVE.navy,
["--t-text" as string]: PEPS_NATIVE.text,
["--t-muted" as string]: PEPS_NATIVE.muted,
["--t-subtle" as string]: PEPS_NATIVE.subtle,
```

Add to `package.json`:

```json
"test:peps-native-theme": "node --experimental-strip-types src/pages/organiser-v2/peps-native-theme.test.ts"
```

- [ ] **Step 4: Run the theme contract test and verify it passes**

Run:

```bash
pnpm --dir artifacts/peps-anonymous test:peps-native-theme
```

Expected: two passing Node subtests and exit code 0.

- [ ] **Step 5: Commit the theme contract**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts \
  artifacts/peps-anonymous/package.json
git commit -m "Add Peps Native organiser theme contract"
```

### Task 2: Shared Shell and Navigation

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`

- [ ] **Step 1: Import the new visual layer after the legacy V2 stylesheet**

```ts
import "./organiser-v2/organiser-v2.css";
import "./organiser-v2/peps-native.css";
```

- [ ] **Step 2: Replace the decorative sidebar mark with the approved four-tile mark**

```tsx
<div className="ov2-brand-mark" aria-hidden="true">
  <span />
  <span />
  <span />
  <span />
</div>
```

- [ ] **Step 3: Add Peps Anonymous to the top-bar breadcrumb**

Add this first breadcrumb segment before “Group buys”:

```tsx
<span className="ov2-brand-crumb">Peps Anonymous</span>
<ChevronRight aria-hidden="true" />
```

- [ ] **Step 4: Create the shell styles in `peps-native.css`**

The shell section must define the approved canvas, navy sidebar gradient, compact top bar, white active sidebar item, accessible collapsed rail, white search control, outlined secondary actions, navy primary action, focus ring, and responsive drawer. Use these exact selectors as the stable boundaries:

```css
.organiser-v2 { background: #f4f6f9; color: #0f1f38; }
.organiser-v2 .ov2-shell { background: #f4f6f9; }
.organiser-v2 .ov2-sidebar-desktop,
.organiser-v2 .ov2-sidebar { background: linear-gradient(165deg, #1b3164, #1b3a7a); }
.organiser-v2 .ov2-topbar { min-height: 64px; background: #fff; border-color: #dbe3ec; }
.organiser-v2 .ov2-nav-link.is-active { background: #fff; color: #1b3a7a; }
.organiser-v2 .ov2-primary-button { background: #1b3a7a; color: #fff; }
.organiser-v2 :focus-visible { outline-color: #2d6bcc; }
```

The file must also include the four-tile brand mark, sidebar group labels, badge states, profile block, collapsed 76px rail, breadcrumb, search trigger, mobile drawer, and max-width responsive behavior from the approved mockups.

- [ ] **Step 5: Run the focused tests**

```bash
pnpm --dir artifacts/peps-anonymous test:peps-native-theme
pnpm --dir artifacts/peps-anonymous test:workspace-theme
```

Expected: all subtests pass.

- [ ] **Step 6: Commit the shell**

```bash
git add artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css
git commit -m "Apply Peps Native organiser shell"
```

### Task 3: Shared Cards, Overview, Boards, and Tables

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/TodoTab.tsx`

- [ ] **Step 1: Run the overview model test before visual changes**

```bash
pnpm --dir artifacts/peps-anonymous test:overview
```

Expected: all overview-model subtests pass.

- [ ] **Step 2: Add shared card and page-header rules**

Implement white 14–16px cards, blue-grey borders, compact page insets, navy values, semantic status pills, and restrained shadows using:

```css
.organiser-v2 .ov2-page { padding: 20px 22px 28px; }
.organiser-v2 .ov2-card { border: 1px solid #dbe3ec; border-radius: 15px; background: #fff; }
.organiser-v2 .ov2-page-header h1 { color: #0f1f38; }
.organiser-v2 .ov2-status-pill { background: rgba(34,197,94,.12); color: #17743d; }
.organiser-v2 .ov2-metric-value { color: #0f1f38; }
```

- [ ] **Step 3: Add dashboard and board-treatment rules**

Style `.ov2-analytics-grid`, metric cards, status segments, charts, the board toolbar, board columns, and order cards. Keep all existing overview view-switch behavior and make board lanes horizontally contained at tablet widths.

- [ ] **Step 4: Add table-treatment rules**

Under `[data-treatment="table"]`, style saved views, filters, bulk bars, table headers, selected rows, order expansion, dialogs, and import controls using the approved compact register treatment.

- [ ] **Step 5: Add board-treatment rules**

Under `[data-treatment="board"]`, style todo lanes, task cards, filters, drag states, empty states, and badges with pale blue-grey lanes and white cards.

- [ ] **Step 6: Re-run overview and workspace tests**

```bash
pnpm --dir artifacts/peps-anonymous test:overview
pnpm --dir artifacts/peps-anonymous test:workspace-theme
```

Expected: all subtests pass.

- [ ] **Step 7: Commit dashboard, board, and table treatments**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css
git commit -m "Style organiser dashboard boards and tables"
```

### Task 4: Logistics, Insight, Composer, Support, and Configuration Treatments

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Verify: feature components mapped by `workspace-theme.ts`

- [ ] **Step 1: Run the dispatch model test before logistics styling**

```bash
pnpm --dir artifacts/peps-anonymous test:dispatch
```

Expected: all dispatch model subtests pass.

- [ ] **Step 2: Add logistics treatment styles**

Under `[data-treatment="logistics"]`, normalize parcel lists, dispatch panels, QR registers, forwarder cards, country-leg surfaces, and shipping tables. Override dispatch variables so the active stage uses `#2D6BCC`/`#1B3A7A`, completed stages use semantic green, and blocked states use amber or red with written labels.

- [ ] **Step 3: Add insight treatment styles**

Under `[data-treatment="insight"]`, normalize P&L metrics, COA registers, testing progress, document cards, exports, and summary tables. Use blue for information, green for approved evidence, amber for review, and red for rejected evidence.

- [ ] **Step 4: Add composer and support treatment styles**

Under `[data-treatment="composer"]` and `[data-treatment="support"]`, style the broadcast composer, campaign history, ticket list, conversation pane, unread counts, and response controls without applying table density to message bodies.

- [ ] **Step 5: Add configuration treatment styles**

Under `[data-treatment="configuration"]`, normalize form sections, inputs, selects, toggles, product rows, rule editors, save buttons, status panels, and danger zones using the approved Settings example.

- [ ] **Step 6: Re-run dispatch and workspace tests**

```bash
pnpm --dir artifacts/peps-anonymous test:dispatch
pnpm --dir artifacts/peps-anonymous test:workspace-theme
```

Expected: all subtests pass.

- [ ] **Step 7: Commit the remaining workspace treatments**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css
git commit -m "Style organiser operational page treatments"
```

### Task 5: Setup Wizard and Responsive Behavior

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/steps/*.tsx`

- [ ] **Step 1: Add setup-step navigation rules**

Style `.ov2-setup-nav`, `.ov2-setup-link`, `.ov2-step-number`, and complete/current states so the current step is white on navy and completed steps use semantic green.

- [ ] **Step 2: Add setup form and launch-dialog rules**

Style `.ov2-setup-page`, `.ov2-setup-stats`, `.ov2-form-panel`, `.ov2-form-content`, `.ov2-form-footer`, `.ov2-launch-dialog`, and `.ov2-visibility-options` with the same cards, inputs, borders, and actions as the approved GB Settings example.

- [ ] **Step 3: Add responsive rules**

At 1023px, hide the desktop sidebar and use the existing drawer with the navy theme. At 767px, stack metrics and forms, keep 40px touch targets, collapse breadcrumb detail before the primary action, and contain tables and boards horizontally.

- [ ] **Step 4: Add reduced-motion rules**

Under `@media (prefers-reduced-motion: reduce)`, disable new transitions and preserve the existing reduced-motion contract.

- [ ] **Step 5: Run all focused tests**

```bash
pnpm --dir artifacts/peps-anonymous test:peps-native-theme
pnpm --dir artifacts/peps-anonymous test:overview
pnpm --dir artifacts/peps-anonymous test:workspace-theme
pnpm --dir artifacts/peps-anonymous test:dispatch
```

Expected: every subtest passes.

- [ ] **Step 6: Commit setup and responsive styling**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/peps-native.css
git commit -m "Finish Peps Native setup and responsive styling"
```

### Task 6: Production and Visual Verification

**Files:**
- Modify: `docs/organiser-v2-completion-report.md` only when its current visual-direction claims are inaccurate.

- [ ] **Step 1: Run focused tests together**

```bash
pnpm --dir artifacts/peps-anonymous test:peps-native-theme
pnpm --dir artifacts/peps-anonymous test:overview
pnpm --dir artifacts/peps-anonymous test:workspace-theme
pnpm --dir artifacts/peps-anonymous test:dispatch
```

Expected: exit code 0 from all four commands.

- [ ] **Step 2: Run typecheck and record unrelated failures separately**

```bash
pnpm --dir artifacts/peps-anonymous typecheck
```

Expected: no new errors in `GbOrganiserV2.tsx` or `pages/organiser-v2`. Existing repository errors outside this scope may remain and must be listed in the completion report.

- [ ] **Step 3: Run the production build**

```bash
pnpm --dir artifacts/peps-anonymous build
```

Expected: Vite build completes with exit code 0.

- [ ] **Step 4: Verify the running application**

Open `/gborganiser-v2` and inspect Overview, Orders, Dispatch, Vendor COAs, GB Settings, all remaining workspace destinations, and all seven setup steps. Confirm sidebar collapse, drawer behavior, search, filters, tables, dialogs, dispatch selection, and primary actions.

- [ ] **Step 5: Confirm the original organiser is unchanged**

Open `/gborganiser` and compare it with the pre-change route. No selected-theme stylesheet may escape the `.organiser-v2` scope.

- [ ] **Step 6: Update documentation if required**

If `docs/organiser-v2-completion-report.md` names the superseded screenshot-remap system, replace that visual-direction section with the Peps Native tokens, shell dimensions, page-treatment coverage, and fresh verification results.

- [ ] **Step 7: Commit verification documentation**

```bash
git add docs/organiser-v2-completion-report.md
git commit -m "Document Peps Native organiser verification"
```

## Self-Review Result

- Every requirement in the approved design specification maps to Tasks 1–6.
- The plan introduces no new backend, state-management, chart, or animation dependency.
- Existing feature components retain responsibility for their own data and interactions.
- All new styling remains scoped to `.organiser-v2`.
- No placeholders or deferred implementation steps remain.

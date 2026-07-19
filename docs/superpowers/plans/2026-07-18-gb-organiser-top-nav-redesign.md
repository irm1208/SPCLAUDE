# GB Organiser V2 Top Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current crowded GB Organiser V2 desktop top bar with the approved Group-first cockpit B2 navigation while preserving existing workspace, setup, search, sidebar, primary-action, and profile behaviour.

**Architecture:** Add one pure presentation model for deterministic status, close-date, currency, and member labels. Refactor the shared `OrganiserTopbar` into a context rail plus work bar, wire it from the existing workspace/setup projections, and keep the current mobile composition below 768px. Apply the final appearance in the last-loaded `approved-workspace.css` layer so older organiser styles cannot override the approved picture.

**Tech Stack:** React 19, TypeScript, Node test runner, Lucide React, scoped CSS, existing organiser shell and API-backed group-buy projection.

**Workspace constraint:** The organiser V2 implementation is largely untracked in the active workspace. A clean worktree would omit the files this plan modifies. Execute in `/home/amoney/UpdateSP`, preserve unrelated changes, edit with `apply_patch`, and use the path-scoped diff checkpoints below instead of staging or committing implementation files unless the user separately requests a commit.

---

## File map

- Create `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts` — pure formatting for lifecycle, close timing, currency, and member labels.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts` — deterministic model coverage with a fixed clock.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts` — source and stylesheet contracts for B2 structure, wiring, omissions, and responsive priorities.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx` — render the context rail, refined dual-mode menu control, expanded search, actions, and profile.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx` — expose separate desktop sidebar-toggle and drawer-open controls to the shared top bar.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx` — supply live context, remove dead Share/notification wiring, and retain existing action routing.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx` — supply draft context and the new shell navigation controls without losing setup actions.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css` — implement B2 dimensions, hierarchy, responsive collapse rules, focus, and long-content handling.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts` — make the inline topbar token resolve through a responsive stylesheet-owned token.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts` — lock the responsive topbar token contract.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts` — remove obsolete Share/bell expectations and lock the new shell height.
- Modify `artifacts/peps-anonymous/package.json` — include both new tests in the approved workspace suite.

### Task 1: Lock the pure topbar context model

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write the failing model tests**

Create `topbar-context.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildTopbarContext } from "./topbar-context.ts";

const now = new Date("2026-07-18T12:00:00Z");

test("active context exposes open status and future close timing", () => {
  assert.deepEqual(buildTopbarContext({
    status: "active",
    currency: "gbp",
    closeDate: "2026-07-30T12:00:00Z",
    memberCount: 148,
  }, now), {
    statusLabel: "Open group buy",
    statusTone: "active",
    currencyLabel: "GBP",
    closeLabel: "Closes in 12 days",
    memberLabel: "148 members",
  });
});

test("draft context omits fields that were not supplied", () => {
  assert.deepEqual(buildTopbarContext({ status: "draft" }, now), {
    statusLabel: "Draft group buy",
    statusTone: "neutral",
  });
});

test("explicitly missing and invalid close dates use the fallback", () => {
  assert.equal(buildTopbarContext({ closeDate: null }, now).closeLabel, "No close date");
  assert.equal(buildTopbarContext({ closeDate: "not-a-date" }, now).closeLabel, "No close date");
});

test("past close dates and singular member totals are grammatical", () => {
  const context = buildTopbarContext({
    status: "closed",
    closeDate: "2026-07-16T12:00:00Z",
    memberCount: 1,
  }, now);
  assert.equal(context.statusLabel, "Closed group buy");
  assert.equal(context.closeLabel, "Closed 2 days ago");
  assert.equal(context.memberLabel, "1 member");
});

test("confirmed zero renders while unavailable or invalid members are omitted", () => {
  assert.equal(buildTopbarContext({ memberCount: 0 }, now).memberLabel, "0 members");
  assert.equal(buildTopbarContext({}, now).memberLabel, undefined);
  assert.equal(buildTopbarContext({ memberCount: -1 }, now).memberLabel, undefined);
});

test("unknown lifecycle values fall back without an active status tone", () => {
  assert.deepEqual(buildTopbarContext({ status: "paused" }, now), {
    statusLabel: "Group buy",
    statusTone: "neutral",
  });
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-context.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `topbar-context.ts`.

- [ ] **Step 3: Implement the deterministic formatter**

Create `topbar-context.ts`:

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TopbarContextInput {
  status?: string | null;
  currency?: string | null;
  closeDate?: string | null;
  memberCount?: number | null;
}

export interface TopbarContextLabels {
  statusLabel: string;
  statusTone: "active" | "neutral";
  currencyLabel?: string;
  closeLabel?: string;
  memberLabel?: string;
}

function statusPresentation(status: string | null | undefined): Pick<TopbarContextLabels, "statusLabel" | "statusTone"> {
  switch (status?.trim().toLowerCase()) {
    case "active":
    case "open":
      return { statusLabel: "Open group buy", statusTone: "active" };
    case "draft":
      return { statusLabel: "Draft group buy", statusTone: "neutral" };
    case "closed":
      return { statusLabel: "Closed group buy", statusTone: "neutral" };
    case "archived":
      return { statusLabel: "Archived group buy", statusTone: "neutral" };
    default:
      return { statusLabel: "Group buy", statusTone: "neutral" };
  }
}

function closePresentation(closeDate: string | null | undefined, now: Date): string | undefined {
  if (closeDate === undefined) return undefined;
  if (closeDate === null) return "No close date";

  const closeTime = Date.parse(closeDate);
  if (!Number.isFinite(closeTime)) return "No close date";

  const difference = closeTime - now.getTime();
  if (difference > 0) {
    const days = Math.max(1, Math.ceil(difference / DAY_MS));
    return days === 1 ? "Closes in 1 day" : `Closes in ${days} days`;
  }

  const elapsedDays = Math.floor(Math.abs(difference) / DAY_MS);
  if (elapsedDays === 0) return "Closed today";
  return elapsedDays === 1 ? "Closed 1 day ago" : `Closed ${elapsedDays} days ago`;
}

function memberPresentation(memberCount: number | null | undefined): string | undefined {
  if (typeof memberCount !== "number" || !Number.isFinite(memberCount) || memberCount < 0) return undefined;
  const count = Math.floor(memberCount);
  return count === 1 ? "1 member" : `${count} members`;
}

export function buildTopbarContext(input: TopbarContextInput, now = new Date()): TopbarContextLabels {
  const status = statusPresentation(input.status);
  const currency = input.currency?.trim().toUpperCase();
  const closeLabel = closePresentation(input.closeDate, now);
  const memberLabel = memberPresentation(input.memberCount);

  return {
    ...status,
    ...(currency ? { currencyLabel: currency } : {}),
    ...(closeLabel ? { closeLabel } : {}),
    ...(memberLabel ? { memberLabel } : {}),
  };
}
```

- [ ] **Step 4: Add the model test to the approved workspace script**

Change the script value in `artifacts/peps-anonymous/package.json` to include the new file:

```json
"test:approved-workspace": "node --experimental-strip-types --test src/pages/organiser-v2/topbar-context.test.ts src/pages/organiser-v2/approved-workspace.test.ts src/pages/organiser-v2/approved-selectors.test.ts src/pages/organiser-v2/typography-mobile-contract.test.ts src/pages/organiser-v2/organiser-mobile-contract.test.ts src/pages/organiser-v2/approved-responsive.test.ts"
```

- [ ] **Step 5: Run the model test and verify GREEN**

Run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-context.test.ts
```

Expected: 6 tests pass and 0 fail.

- [ ] **Step 6: Review the Task 1 diff without staging user work**

Run:

```bash
cd /home/amoney/UpdateSP
git diff --check -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts
git status --short -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts
```

Expected: no whitespace errors; only the three Task 1 paths are reported. Do not stage or commit them.

### Task 2: Refactor the shared topbar and wire live context

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write the failing B2 source contracts**

Create `topbar-redesign-contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const topbar = read("./OrganiserTopbar.tsx");
const shell = read("./OrganiserShell.tsx");
const workspace = read("./Workspace.tsx");
const setup = read("./SetupWizard.tsx");

test("topbar renders the approved context rail and work bar", () => {
  for (const hook of [
    "ov2-topbar-context-rail",
    "ov2-topbar-status",
    "ov2-topbar-workbar",
    "ov2-page-context",
    "ov2-menu-glyph",
  ]) assert.match(topbar, new RegExp(hook));
  assert.match(topbar, /Search orders, members, parcels…/);
  assert.match(topbar, /buildTopbarContext/);
});

test("desktop and drawer menu controls keep distinct behaviour and names", () => {
  assert.match(topbar, /ov2-menu-button-desktop/);
  assert.match(topbar, /sidebarCollapsed \? "Open navigation" : "Collapse navigation"/);
  assert.match(topbar, /ov2-menu-button-drawer/);
  assert.match(topbar, /aria-label="Open navigation"/);
  assert.match(shell, /onToggleSidebar/);
  assert.match(shell, /onOpenDrawer/);
});

test("topbar omits Share and the standalone notification control", () => {
  assert.doesNotMatch(topbar, /Share2|Bell|onShare|onNotifications|ov2-notification-button|ov2-share-action/);
  assert.doesNotMatch(workspace, /handleShare|shareCopied|onShare=|onNotifications=/);
});

test("workspace supplies live context and preserves existing actions", () => {
  assert.match(workspace, /groupStatus=\{gb\.status\}/);
  assert.match(workspace, /currency=\{gb\.currency\}/);
  assert.match(workspace, /closeDate=\{gb\.closeDate\}/);
  assert.match(workspace, /memberCount=\{gb\.members\}/);
  assert.match(workspace, /secondaryActions=\{onModeChange/);
  assert.match(workspace, /primaryAction=\{primaryAction\}/);
  assert.match(workspace, /onProfile=\{\(\) => window\.location\.assign\("\/account"\)\}/);
});

test("setup supplies draft context and retains every setup action", () => {
  assert.match(setup, /groupStatus="draft"/);
  for (const label of ["Save draft", "Preview", "Launch group buy", "Continue"]) {
    assert.match(setup, new RegExp(label));
  }
});
```

- [ ] **Step 2: Add the contract to the approved test script and verify RED**

Insert `src/pages/organiser-v2/topbar-redesign-contract.test.ts` immediately after `topbar-context.test.ts` in `test:approved-workspace`, then run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-redesign-contract.test.ts
```

Expected: FAIL because the current component has no B2 hooks and still contains Share and Bell.

- [ ] **Step 3: Replace `OrganiserTopbar.tsx` with the approved structure**

Use this complete component:

```tsx
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { buildTopbarContext } from "./topbar-context";

export interface OrganiserTopbarProps {
  groupName: string;
  groupStatus?: string | null;
  currency?: string | null;
  closeDate?: string | null;
  memberCount?: number | null;
  pageLabel: string;
  onOpenMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onSearch: () => void;
  onBack?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  secondaryActions?: ReactNode;
  onProfile?: () => void;
  organiserName?: string;
  organiserRole?: string;
}

function MenuGlyph() {
  return (
    <span className="ov2-menu-glyph" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function OrganiserTopbar({
  groupName,
  groupStatus,
  currency,
  closeDate,
  memberCount,
  pageLabel,
  onOpenMenu,
  onToggleSidebar,
  sidebarCollapsed,
  onSearch,
  onBack,
  primaryAction,
  secondaryActions,
  onProfile,
  organiserName = "Alex Morgan",
  organiserRole = "Lead organiser",
}: OrganiserTopbarProps) {
  const organiserInitials = organiserName
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const context = buildTopbarContext({ status: groupStatus, currency, closeDate, memberCount });

  return (
    <header className="ov2-topbar">
      <div className="ov2-topbar-context-rail" aria-label="Group buy context">
        <div className="ov2-topbar-context-primary">
          <span className="ov2-topbar-status" data-tone={context.statusTone}>{context.statusLabel}</span>
          <strong title={groupName}>{groupName}</strong>
          {context.currencyLabel ? <span>{context.currencyLabel}</span> : null}
        </div>
        <div className="ov2-topbar-context-secondary">
          {context.closeLabel ? <span>{context.closeLabel}</span> : null}
          {context.memberLabel ? <span>{context.memberLabel}</span> : null}
        </div>
      </div>

      <div className="ov2-topbar-workbar">
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-desktop"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Open navigation" : "Collapse navigation"}
          aria-expanded={!sidebarCollapsed}
        >
          <MenuGlyph />
        </button>
        <button
          type="button"
          className="ov2-icon-button ov2-menu-button ov2-menu-button-drawer"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          aria-haspopup="dialog"
        >
          <MenuGlyph />
        </button>
        {onBack ? (
          <button type="button" className="ov2-icon-button ov2-back-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}

        <div className="ov2-mobile-group-context">
          <small>Active group buy</small>
          <strong title={groupName}>{groupName}</strong>
        </div>

        <div className="ov2-page-context">
          <strong title={pageLabel}>{pageLabel}</strong>
          <small>GB Organiser workspace</small>
        </div>

        <button type="button" className="ov2-search-trigger" onClick={onSearch} aria-label="Search orders, members, and parcels">
          <Search aria-hidden="true" />
          <span>Search orders, members, parcels…</span>
          <kbd aria-hidden="true">⌘ K</kbd>
        </button>

        <div className="ov2-topbar-actions">
          {secondaryActions}
          {primaryAction ? (
            <button type="button" className="ov2-primary-button" onClick={primaryAction.onClick}>
              <span>{primaryAction.label}</span>
            </button>
          ) : null}
        </div>

        {onProfile ? (
          <button
            type="button"
            className="ov2-topbar-profile"
            onClick={onProfile}
            aria-label={`Open organiser profile for ${organiserName}`}
            title="Organiser profile"
          >
            <span className="ov2-topbar-avatar" aria-hidden="true">{organiserInitials}</span>
            <span className="ov2-topbar-profile-copy">
              <strong>{organiserName}</strong>
              <small>{organiserRole}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Give the shell separate desktop and drawer navigation controls**

In `OrganiserShell.tsx`, add the exported control type and replace the `topbar` callback type:

```tsx
export interface OrganiserShellNavigationControls {
  onOpenDrawer: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

// In the component props:
topbar: (navigation: OrganiserShellNavigationControls) => ReactNode;
```

Replace `{topbar(openNavigation)}` with:

```tsx
{topbar({
  onOpenDrawer: openNavigation,
  onToggleSidebar: () => setCollapsed(value => !value),
  sidebarCollapsed: collapsed,
})}
```

Keep the existing `Sheet`, `closeNavigation`, sidebar render callback, and mobile navigation unchanged.

- [ ] **Step 5: Wire workspace context and remove dead Share/bell logic**

In `Workspace.tsx`:

1. Remove `const [shareCopied, setShareCopied] = useState(false);`.
2. Remove the complete `handleShare` function.
3. Replace the topbar render callback with:

```tsx
topbar={({ onOpenDrawer, onToggleSidebar, sidebarCollapsed }) => (
  <OrganiserTopbar
    groupName={gb.name}
    groupStatus={gb.status}
    currency={gb.currency}
    closeDate={gb.closeDate}
    memberCount={gb.members}
    pageLabel={breadcrumbLabel}
    onOpenMenu={onOpenDrawer}
    onToggleSidebar={onToggleSidebar}
    sidebarCollapsed={sidebarCollapsed}
    onSearch={() => setSearchOpen(true)}
    onProfile={() => window.location.assign("/account")}
    organiserName={organiserName}
    organiserRole="Lead organiser"
    secondaryActions={onModeChange ? (
      <button type="button" className="ov2-secondary-button" onClick={onModeChange}>
        <FolderCog aria-hidden="true" /> <span className="ov2-action-label">Manage</span>
      </button>
    ) : undefined}
    primaryAction={primaryAction}
  />
)}
```

4. Remove `{shareCopied ? <div className="ov2-copy-toast" ... /> : null}` from the shell body.
5. Do not change `handleNavigate`, the order repositories, `GlobalSearch`, or primary-navigation mapping.

- [ ] **Step 6: Wire the setup flow without losing setup controls**

Replace the setup topbar callback with:

```tsx
topbar={({ onOpenDrawer, onToggleSidebar, sidebarCollapsed }) => (
  <OrganiserTopbar
    groupName="New group buy"
    groupStatus="draft"
    pageLabel={step.label}
    onOpenMenu={onOpenDrawer}
    onToggleSidebar={onToggleSidebar}
    sidebarCollapsed={sidebarCollapsed}
    onSearch={() => setBanner("Setup search becomes available after the group buy is launched.")}
    onBack={current > 0 ? () => setCurrent(value => value - 1) : undefined}
    secondaryActions={(
      <>
        <button type="button" className="ov2-secondary-button" onClick={saveDraft} disabled={saving}><Save aria-hidden="true" /> <span className="ov2-action-label">Save draft</span></button>
        <button type="button" className="ov2-topbar-link" onClick={() => setBanner("Preview uses the current draft values.")}><Eye aria-hidden="true" /> <span className="ov2-action-label">Preview</span></button>
      </>
    )}
    primaryAction={{ label: isLast ? "Launch group buy" : "Continue", onClick: handleContinue }}
  />
)}
```

- [ ] **Step 7: Run the component contracts and verify GREEN**

Run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-context.test.ts src/pages/organiser-v2/topbar-redesign-contract.test.ts
```

Expected: 11 tests pass and 0 fail.

- [ ] **Step 8: Review the Task 2 diff without staging user work**

Run:

```bash
cd /home/amoney/UpdateSP
git diff --check -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts
git status --short -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts
```

Expected: no whitespace errors and no unrelated path appears. Do not stage or commit.

### Task 3: Apply the approved B2 visual and responsive hierarchy

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts`

- [ ] **Step 1: Extend the failing contract with dimensions and responsive priorities**

Append to `topbar-redesign-contract.test.ts`:

```ts
const approvedCss = read("./approved-workspace.css");

test("approved B2 dimensions prioritise context and search", () => {
  assert.match(approvedCss, /--ov2-responsive-topbar-height:\s*102px/);
  assert.match(approvedCss, /--ov2-context-rail-height:\s*32px/);
  assert.match(approvedCss, /--ov2-workbar-height:\s*70px/);
  assert.match(approvedCss, /\.ov2-menu-button[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(approvedCss, /\.ov2-search-trigger\s*\{[^}]*min-width:\s*440px[^}]*flex:\s*1 1 440px/s);
  assert.match(approvedCss, /\.ov2-primary-button\s*\{[^}]*background:\s*var\(--approved-blue\)/s);
  assert.match(approvedCss, /\.ov2-topbar :where\(button\):active:not\(:disabled\)/);
  assert.match(approvedCss, /\.ov2-topbar :where\(button\):disabled/);
});

test("responsive rules keep tablet context and restore compact mobile navigation", () => {
  assert.match(approvedCss, /@media\s*\(max-width:\s*1399px\)[\s\S]*\.ov2-search-trigger\s*\{[^}]*min-width:\s*260px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*1023px\)[\s\S]*\.ov2-menu-button-desktop\s*\{[^}]*display:\s*none/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*1023px\)[\s\S]*\.ov2-menu-button-drawer\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*900px\)[\s\S]*\.ov2-search-trigger\s*\{[^}]*min-width:\s*200px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*767px\)[\s\S]*--ov2-responsive-topbar-height:\s*64px/s);
  assert.match(approvedCss, /@media\s*\(max-width:\s*767px\)[\s\S]*\.ov2-topbar-context-rail\s*\{[^}]*display:\s*none/s);
});
```

Run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-redesign-contract.test.ts
```

Expected: the five source-contract tests pass and the two new CSS-contract tests fail.

- [ ] **Step 2: Make the inline token responsive**

In `theme.ts`, replace the current topbar token with:

```ts
["--ov2-topbar-height" as string]: "var(--ov2-responsive-topbar-height, 102px)",
```

In `peps-native-theme.test.ts`, replace the 64px assertion with:

```ts
assert.equal(
  V2_VARS["--ov2-topbar-height" as string],
  "var(--ov2-responsive-topbar-height, 102px)",
);
```

This keeps inline theme ownership while allowing the stylesheet media query to resolve the effective height to 64px on mobile.

- [ ] **Step 3: Add the shell dimensions and replace the desktop topbar rules**

In the root `.organiser-v2` rule in `approved-workspace.css`, replace `--ov2-topbar-height: 64px;` with:

```css
--ov2-responsive-topbar-height: 102px;
--ov2-context-rail-height: 32px;
--ov2-workbar-height: 70px;
```

Replace the existing approved topbar block from `.organiser-v2 .ov2-topbar` through `.organiser-v2 .ov2-topbar-profile-copy small` with:

```css
.organiser-v2 .ov2-topbar {
  display: grid;
  height: var(--ov2-topbar-height);
  min-height: var(--ov2-topbar-height);
  grid-template-rows: var(--ov2-context-rail-height) var(--ov2-workbar-height);
  gap: 0;
  border-color: #E1E7EF;
  padding: 0;
  color: var(--approved-ink);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 2px 10px rgba(27, 49, 100, 0.03);
  backdrop-filter: blur(14px);
}

.organiser-v2 .ov2-topbar-context-rail {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 18px;
  color: rgba(255, 255, 255, 0.75);
  background: linear-gradient(90deg, var(--approved-deep-navy), var(--approved-navy));
  font-size: var(--approved-type-label);
  line-height: var(--approved-leading-label);
}

.organiser-v2 .ov2-topbar-context-primary,
.organiser-v2 .ov2-topbar-context-secondary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.organiser-v2 .ov2-topbar-context-primary strong {
  max-width: min(36vw, 420px);
  overflow: hidden;
  color: #FFFFFF;
  font-weight: 700;
  text-overflow: ellipsis;
}

.organiser-v2 .ov2-topbar-context-secondary {
  flex: 0 0 auto;
  gap: 18px;
}

.organiser-v2 .ov2-topbar-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #FFFFFF;
  font-weight: 600;
}

.organiser-v2 .ov2-topbar-status[data-tone="active"] {
  color: #DCFCE7;
}

.organiser-v2 .ov2-topbar-status[data-tone="active"]::before {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.14);
  content: "";
}

.organiser-v2 .ov2-topbar-workbar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
}

.organiser-v2 .ov2-menu-button {
  width: 44px;
  height: 44px;
  min-width: 44px;
  flex: 0 0 44px;
  border: 0;
  border-radius: 13px;
  color: var(--approved-navy);
  background: #EAF1FB;
  box-shadow: inset 0 0 0 1px rgba(27, 58, 122, 0.08);
}

.organiser-v2 .ov2-menu-button:hover {
  border-color: transparent;
  color: var(--approved-deep-navy);
  background: #DDE9F8;
}

.organiser-v2 .ov2-menu-button-desktop { display: inline-flex; }
.organiser-v2 .ov2-menu-button-drawer { display: none; }

.organiser-v2 .ov2-menu-glyph {
  display: grid;
  width: 18px;
  gap: 4px;
}

.organiser-v2 .ov2-menu-glyph span {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.organiser-v2 .ov2-menu-glyph span:nth-child(2) { width: 13px; }
.organiser-v2 .ov2-menu-glyph span:nth-child(3) { width: 16px; }

.organiser-v2 .ov2-page-context {
  display: grid;
  width: 184px;
  min-width: 130px;
  flex: 0 1 184px;
  gap: 3px;
  line-height: 1.2;
}

.organiser-v2 .ov2-page-context strong,
.organiser-v2 .ov2-page-context small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organiser-v2 .ov2-page-context strong {
  color: var(--approved-ink);
  font-size: var(--approved-type-body);
  font-weight: 700;
}

.organiser-v2 .ov2-page-context small {
  color: #667085;
  font-size: var(--approved-type-label);
  font-weight: 500;
}

.organiser-v2 .ov2-search-trigger {
  width: auto;
  min-width: 440px;
  min-height: 46px;
  flex: 1 1 440px;
  gap: 10px;
  margin-left: 0;
  border: 1px solid #BECADA;
  border-radius: 13px;
  padding: 0 12px 0 14px;
  color: #667085;
  background: #FBFCFE;
  font-size: var(--approved-type-control);
  font-weight: 400;
}

.organiser-v2 .ov2-search-trigger:hover {
  border-color: #8FA6C0;
  background: #FFFFFF;
}

.organiser-v2 .ov2-search-trigger kbd {
  border-color: #D5DDE8;
  border-radius: 7px;
  color: #667085;
  background: #FFFFFF;
  font-size: var(--approved-type-label);
  font-weight: 600;
}

.organiser-v2 .ov2-topbar-actions {
  min-width: 0;
  flex: 0 0 auto;
  gap: 8px;
}

.organiser-v2 .ov2-topbar-link,
.organiser-v2 .ov2-primary-button,
.organiser-v2 .ov2-secondary-button {
  min-height: 44px;
  border-radius: 12px;
  padding-inline: 14px;
  font-size: var(--approved-type-control);
  font-weight: 700;
  white-space: nowrap;
}

.organiser-v2 .ov2-topbar-link,
.organiser-v2 .ov2-secondary-button {
  border: 1px solid #C8D3DF;
  color: var(--approved-navy);
  background: #FFFFFF;
}

.organiser-v2 .ov2-primary-button {
  border-color: var(--approved-blue);
  color: #FFFFFF;
  background: var(--approved-blue);
}

.organiser-v2 .ov2-primary-button:hover {
  border-color: var(--approved-navy);
  background: var(--approved-navy);
}

.organiser-v2 .ov2-topbar-profile {
  position: relative;
  display: inline-flex;
  min-height: 48px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-left: 1px solid #E0E6ED;
  border-radius: 0;
  padding: 0 8px 0 12px;
  color: #667085;
  background: transparent;
  text-align: left;
}

.organiser-v2 .ov2-topbar-profile:hover {
  color: var(--approved-navy);
  background: #F8FAFC;
}

.organiser-v2 .ov2-topbar-profile > svg {
  width: 13px;
  height: 13px;
}

.organiser-v2 .ov2-topbar-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 50%;
  color: var(--approved-navy);
  background: #DDEAFF;
  font-size: var(--approved-type-control);
  font-weight: 700;
}

.organiser-v2 .ov2-topbar-profile-copy {
  display: grid;
  min-width: 0;
  max-width: 128px;
}

.organiser-v2 .ov2-topbar-profile-copy strong,
.organiser-v2 .ov2-topbar-profile-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organiser-v2 .ov2-topbar-profile-copy strong {
  color: var(--approved-ink);
  font-size: var(--approved-type-control);
  font-weight: 700;
  line-height: 1.25;
}

.organiser-v2 .ov2-topbar-profile-copy small {
  color: #667085;
  font-size: var(--approved-type-label);
  font-weight: 500;
  line-height: 1.25;
}

.organiser-v2 .ov2-topbar :where(button) {
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease, transform 160ms ease;
}

.organiser-v2 .ov2-topbar :where(button):active:not(:disabled) {
  transform: translateY(1px);
}

.organiser-v2 .ov2-topbar :where(button):disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
```

Keep `.ov2-mobile-group-context` and `.ov2-mobile-bottom-nav` hidden by default immediately after this block.

- [ ] **Step 4: Add the desktop-to-tablet search collapse**

Insert before the existing 1180px media query:

```css
@media (max-width: 1399px) {
  .organiser-v2 .ov2-page-context {
    width: 150px;
    flex-basis: 150px;
  }

  .organiser-v2 .ov2-search-trigger {
    min-width: 260px;
    flex-basis: 320px;
  }
}
```

In the existing 1180px rule, keep the profile-copy and profile-chevron collapse, remove the obsolete `width: clamp(...)` override, and use these narrower values:

```css
.organiser-v2 .ov2-page-context {
  width: 130px;
  flex-basis: 130px;
}

.organiser-v2 .ov2-search-trigger {
  min-width: 220px;
  flex-basis: 260px;
}
```

- [ ] **Step 5: Update tablet and mobile rules**

In the 1023px media query, replace the generic menu display rule with:

```css
.organiser-v2 .ov2-menu-button-desktop { display: none; }
.organiser-v2 .ov2-menu-button-drawer { display: inline-flex; }

.organiser-v2 .ov2-topbar-workbar {
  padding-inline: 14px;
}
```

Keep the context rail visible at tablet widths and remove obsolete breadcrumb selectors. Remove the existing 40px icon-only tablet search override and the rule that hides its text and shortcut. The search remains a labelled 260px control at tablet widths.

Add this narrower-tablet compaction rule before the 767px media query. It keeps Save Draft, Preview, Manage, and the page-specific primary action available while reducing fixed context widths:

```css
@media (max-width: 900px) {
  .organiser-v2 .ov2-topbar-workbar {
    gap: 8px;
    padding-inline: 10px;
  }

  .organiser-v2 .ov2-page-context {
    width: 80px;
    min-width: 80px;
    flex-basis: 80px;
  }

  .organiser-v2 .ov2-search-trigger {
    min-width: 200px;
    flex-basis: 220px;
  }
}
```

At the start of the 767px media query, set the responsive height and replace the mobile topbar rules with:

```css
.organiser-v2 {
  --ov2-responsive-topbar-height: 64px;
}

.organiser-v2 .ov2-topbar {
  display: block;
  height: var(--ov2-topbar-height);
  min-height: var(--ov2-topbar-height);
  overflow-x: clip;
  padding: 0;
}

.organiser-v2 .ov2-topbar-context-rail {
  display: none;
}

.organiser-v2 .ov2-topbar-workbar {
  height: var(--ov2-topbar-height);
  gap: 8px;
  padding: 8px 10px;
}

.organiser-v2 .ov2-page-context,
.organiser-v2 .ov2-search-trigger,
.organiser-v2 .ov2-topbar-actions > .ov2-secondary-button,
.organiser-v2 .ov2-topbar-actions > .ov2-topbar-link {
  display: none;
}
```

Retain the current mobile group context, primary-action truncation, 44px targets, avatar sizing, bottom navigation, and safe-area rules. Remove obsolete `.ov2-breadcrumbs` and `.ov2-notification-button` entries from the mobile hide/size selectors.

- [ ] **Step 6: Update existing approved contracts**

In `approved-workspace.test.ts`:

1. Replace the 64px direct token assertion with:

```ts
assert.match(css, /--ov2-responsive-topbar-height:\s*102px\s*;/i);
```

2. In the mobile accessibility test, remove the assertion that matches the Share label and add:

```ts
assert.doesNotMatch(topbar, /className="ov2-action-label">Share/);
assert.match(topbar, /className="ov2-menu-glyph"/);
```

3. Replace the optional-handler loop with:

```ts
for (const handler of ["onBack", "onProfile"]) {
  assert.match(topbar, new RegExp(`\\{${handler} \\? \\(`), `${handler} must guard its control`);
}
assert.doesNotMatch(topbar, /onShare|onNotifications/);
assert.match(workspace, /onProfile=\{\(\) => window\.location\.assign\("\/account"\)\}/);
```

4. Delete the obsolete clipboard-sharing test. Sharing is no longer part of the topbar contract.

- [ ] **Step 7: Run focused visual contracts and theme tests**

Run:

```bash
cd /home/amoney/UpdateSP/artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/topbar-redesign-contract.test.ts src/pages/organiser-v2/peps-native-theme.test.ts src/pages/organiser-v2/typography-mobile-contract.test.ts
```

Expected: all focused tests pass, no font below 11px is introduced, and all declared font weights remain 400/500/600/700.

- [ ] **Step 8: Review the Task 3 diff without staging user work**

Run:

```bash
cd /home/amoney/UpdateSP
git diff --check -- artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts
git status --short -- artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts
```

Expected: no whitespace errors and no unrelated path appears. Do not stage or commit.

### Task 4: Verify the complete organiser shell

**Files:**
- Verify only. If a check fails, return to the task that owns that contract; do not expand the file map.

- [ ] **Step 1: Run the complete approved workspace suite**

Run:

```bash
cd /home/amoney/UpdateSP
pnpm --filter @workspace/peps-anonymous test:approved-workspace
```

Expected: every approved workspace, selector, typography, mobile, responsive, context, and topbar contract passes.

- [ ] **Step 2: Run the broader organiser theme and domain suites**

Run:

```bash
cd /home/amoney/UpdateSP
pnpm --filter @workspace/peps-anonymous test:peps-native-theme
pnpm --filter @workspace/peps-anonymous test:workspace-theme
pnpm --filter @workspace/peps-anonymous test:domain
```

Expected: all tests pass with 0 failures.

- [ ] **Step 3: Typecheck and build production assets**

Run:

```bash
cd /home/amoney/UpdateSP
pnpm --filter @workspace/peps-anonymous typecheck
PORT=3002 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous build
```

Expected: TypeScript exits 0 and Vite completes the production build without errors.

- [ ] **Step 4: Perform the authenticated runtime visual check**

Start the frontend with the existing environment:

```bash
cd /home/amoney/UpdateSP
PORT=3002 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous dev
```

Open `http://localhost:3002/gborganiser-v2` with an approved organiser account and verify:

- At 1440px or wider, the 32px context rail and 70px work bar are visible; search is at least 440px when the remaining width permits.
- The context rail shows the real status, group name, currency, relative close timing, and member total without collisions.
- The refined staggered menu collapses/expands the desktop sidebar and has the correct accessible label for its state.
- Manage and the page-specific primary action still navigate correctly.
- Search opens from click and `⌘/Ctrl + K`.
- Share and the standalone bell are absent.
- The profile opens `/account` and long names truncate safely.
- At 1024px, the context rail and desktop sidebar toggle remain usable without horizontal overflow.
- At 1023px and 768px, the context rail remains visible, the drawer menu replaces the desktop toggle, and no horizontal viewport overflow appears.
- At 375px, the context rail is hidden and the existing compact top bar plus five-item bottom navigation remain intact.
- In Setup, Save draft, Preview, Continue/Launch, Back, and search feedback all remain usable.

- [ ] **Step 5: Run a final path-scoped integrity check**

Run:

```bash
cd /home/amoney/UpdateSP
git diff --check -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts
git status --short -- artifacts/peps-anonymous/package.json artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/SetupWizard.tsx artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-context.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/topbar-redesign-contract.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/theme.ts artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts
```

Expected: no whitespace errors; the output is limited to the planned topbar files plus the pre-existing modifications already present on those same paths. Do not report unrelated dirty-worktree files as part of this redesign.

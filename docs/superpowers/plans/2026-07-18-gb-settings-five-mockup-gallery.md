# GB Settings Five-Mockup Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, interactive mockup-sandbox gallery containing five complete GB Settings redesigns, with Focus Flow selected by default and no changes to the production GB Settings page.

**Architecture:** Add one auto-discovered component group to `artifacts/mockup-sandbox`. A typed local settings model and shared GB Organiser shell/editor primitives feed five dedicated concept components. A single gallery coordinator owns concept selection, focused settings section, edits, copy/save feedback, info-card mutations, and restricted-action notices; scoped CSS supplies the five visual systems, responsive layouts, focus states, and reduced-motion behavior.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React, Node's built-in test runner, pnpm workspace scripts

---

## File Structure

- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/data.ts` for concept metadata, section metadata, the typed local settings model, initial data, completion state, and next-section selection.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsShared.tsx` for the miniature GB Organiser shell, shared metrics, semantic settings rail, section editor, accessible controls, and common concept props.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/AtlasClear.tsx` for the calm light all-rounder.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/BlueprintDesk.tsx` for the precise technical configuration treatment.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/LedgerStudio.tsx` for the warm editorial record treatment.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/SignalNavy.tsx` for the dark operational cockpit.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/FocusFlow.tsx` for the selected readiness-led, confidence-first treatment.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsConcepts.tsx` as the auto-discovered gallery entry point and local-state coordinator.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css` for scoped Peps tokens, shared layout rules, five concept themes, responsive behavior, focus styles, and reduced motion.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts` for source-contract tests covering the five concepts, default selection, settings capabilities, production isolation, accessibility markers, responsiveness, and reduced motion.

Do not hand-edit or stage `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`; `mockupPreviewPlugin.ts` owns that file and regenerates it during Vite startup/build. It is already user-modified in the current dirty worktree. Do not modify or stage `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx` or any other production organiser file. Execute this plan in an isolated worktree if available; if execution occurs in the shared dirty worktree, every commit must stage only the exact new `gb-settings-concepts` paths named by its task.

### Task 1: Define the source contract and local settings model

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/data.ts`

- [ ] **Step 1: Record the production-file baseline and target status**

Run:

```bash
git status --short -- artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts artifacts/mockup-sandbox/src/.generated/mockup-components.ts artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx
sha256sum artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx
```

Expected: the new target directory is absent; the generated registry may already be modified; record the live settings file hash for Task 7 without changing or staging either existing file.

- [ ] **Step 2: Write the failing source-contract tests**

Create `gb-settings-concepts.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("data declares the five approved settings concepts and Focus Flow default", () => {
  const data = source("./data.ts");
  for (const id of ["atlas", "blueprint", "ledger", "signal", "focus"]) {
    assert.match(data, new RegExp(`id: \\"${id}\\"`));
  }
  for (const label of ["Atlas Clear", "Blueprint Desk", "Ledger Studio", "Signal Navy", "Focus Flow"]) {
    assert.match(data, new RegExp(label));
  }
  assert.match(data, /DEFAULT_CONCEPT: ConceptId = "focus"/);
  assert.match(data, /Winter Peptide Run 2025/);
  assert.match(data, /WPR-25/);
});

test("shared editor exposes every approved settings capability", () => {
  const shared = source("./GbSettingsShared.tsx");
  for (const label of ["Identity", "Lifecycle", "Access & fee", "Member cards", "Danger zone"]) {
    assert.match(shared, new RegExp(label));
  }
  for (const control of ["Group buy name", "Description", "Currency", "Close date", "Member limit", "Join code", "Entry fee", "Fee label", "Invite-only"]) {
    assert.match(shared, new RegExp(control));
  }
  assert.match(shared, /aria-live="polite"/);
  assert.match(shared, /aria-current/);
});

test("gallery imports five dedicated concepts and starts on Focus Flow", () => {
  const entry = source("./GbSettingsConcepts.tsx");
  for (const component of ["AtlasClear", "BlueprintDesk", "LedgerStudio", "SignalNavy", "FocusFlow"]) {
    assert.match(entry, new RegExp(component));
  }
  assert.match(entry, /useState<ConceptId>\(DEFAULT_CONCEPT\)/);
  assert.match(entry, /aria-label="Choose GB Settings concept"/);
  assert.match(entry, /aria-pressed/);
  assert.match(entry, /onCopyJoinCode/);
  assert.match(entry, /onAddInfoCard/);
  assert.match(entry, /onCancel/);
  assert.match(entry, /onRestrictedAction/);
});

test("styles contain five themes, responsive layouts, focus, and reduced motion", () => {
  const css = source("./_group.css");
  for (const concept of ["atlas", "blueprint", "ledger", "signal", "focus"]) {
    assert.match(css, new RegExp(`data-concept=\\"${concept}\\"`));
  }
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
});

test("the mockup group contains no production API integration", () => {
  const files = [
    "./GbSettingsConcepts.tsx",
    "./GbSettingsShared.tsx",
    "./AtlasClear.tsx",
    "./BlueprintDesk.tsx",
    "./LedgerStudio.tsx",
    "./SignalNavy.tsx",
    "./FocusFlow.tsx",
  ].map(source).join("\n");
  assert.doesNotMatch(files, /organiserApi|@workspace\/api-client|fetch\s*\(/);
});
```

- [ ] **Step 3: Run the new test and verify the intended failure**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
```

Expected: FAIL with `ENOENT` for `data.ts` because implementation files do not exist.

- [ ] **Step 4: Add the typed concept, section, and settings data**

Create `data.ts` with these exports and values:

```ts
export type ConceptId = "atlas" | "blueprint" | "ledger" | "signal" | "focus";
export type SectionId = "identity" | "lifecycle" | "access" | "cards" | "danger";
export type GbStatus = "draft" | "active" | "closed" | "archived";
export type Currency = "GBP" | "EUR" | "USD";

export type InfoCard = {
  id: string;
  title: string;
  body: string;
};

export type SettingsModel = {
  name: string;
  description: string;
  currency: Currency;
  closeDate: string;
  maxMembers: string;
  status: GbStatus;
  joinCode: string;
  entryFeeAmount: string;
  entryFeeLabel: string;
  inviteOnly: boolean;
  infoCards: InfoCard[];
};

export type ConceptMeta = {
  id: ConceptId;
  number: string;
  label: string;
  description: string;
  note: string;
};

export type SectionMeta = {
  id: SectionId;
  label: string;
  shortLabel: string;
  description: string;
};

export const DEFAULT_CONCEPT: ConceptId = "focus";
export const FOCUS_READINESS = 82;

export const CONCEPTS: ConceptMeta[] = [
  { id: "atlas", number: "01", label: "Atlas Clear", description: "Native, calm, immediately legible", note: "All-rounder" },
  { id: "blueprint", number: "02", label: "Blueprint Desk", description: "Technical, exact, configuration-first", note: "Dense" },
  { id: "ledger", number: "03", label: "Ledger Studio", description: "Warm, editorial, built around trust", note: "Premium" },
  { id: "signal", number: "04", label: "Signal Navy", description: "High-contrast operations cockpit", note: "Distinctive" },
  { id: "focus", number: "05", label: "Focus Flow", description: "Guided, spacious, confidence-first", note: "Selected direction" },
];

export const SECTIONS: SectionMeta[] = [
  { id: "identity", label: "Identity", shortLabel: "Identity", description: "Name, description, timing and capacity" },
  { id: "lifecycle", label: "Lifecycle", shortLabel: "Lifecycle", description: "Draft, active, closed or archived" },
  { id: "access", label: "Access & fee", shortLabel: "Access", description: "Join code, visibility and entry fee" },
  { id: "cards", label: "Member cards", shortLabel: "Cards", description: "Notices published to members" },
  { id: "danger", label: "Danger zone", shortLabel: "Danger", description: "Archive and deletion controls" },
];

export const INITIAL_SETTINGS: SettingsModel = {
  name: "Winter Peptide Run 2025",
  description: "Private peptide order coordinated for verified members.",
  currency: "GBP",
  closeDate: "2025-07-31T18:00",
  maxMembers: "60",
  status: "active",
  joinCode: "WPR-25",
  entryFeeAmount: "5.00",
  entryFeeLabel: "Admin & materials fee",
  inviteOnly: true,
  infoCards: [
    { id: "payment-window", title: "Payment window", body: "Payment is due within 48 hours of confirmation." },
    { id: "shipping-timeline", title: "Shipping timeline", body: "Dispatch starts after the supplier parcel is checked." },
  ],
};

export function sectionCompletion(settings: SettingsModel): Record<SectionId, boolean> {
  return {
    identity: Boolean(settings.name.trim() && settings.description.trim() && settings.closeDate && settings.maxMembers),
    lifecycle: settings.status === "active" || settings.status === "closed",
    access: Boolean(settings.joinCode.trim()),
    cards: settings.infoCards.length > 0 && settings.infoCards.every(card => card.title.trim() && card.body.trim()),
    danger: false,
  };
}

export function cloneSettings(settings: SettingsModel): SettingsModel {
  return { ...settings, infoCards: settings.infoCards.map(card => ({ ...card })) };
}

export function nextSection(section: SectionId): SectionId {
  const order: SectionId[] = ["identity", "lifecycle", "access", "cards", "danger"];
  return order[Math.min(order.indexOf(section) + 1, order.length - 1)];
}
```

- [ ] **Step 5: Run the focused data test**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test --test-name-pattern="data declares" src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
```

Expected: PASS for the data contract.

- [ ] **Step 6: Commit the contract and model**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/data.ts artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
git commit -m "test: define GB Settings mockup contract"
```

### Task 2: Build the shared shell, rail, editor, and theme foundation

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsShared.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css`

- [ ] **Step 1: Run the shared-editor test and verify it fails**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test --test-name-pattern="shared editor" src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
```

Expected: FAIL with `ENOENT` for `GbSettingsShared.tsx`.

- [ ] **Step 2: Define the shared concept interface**

In `GbSettingsShared.tsx`, import React types, Lucide icons, and the model types, then export:

```tsx
export type SaveState = "idle" | "saving" | "saved";
export type RestrictedAction = "archive" | "delete";

export type SettingsConceptProps = {
  settings: SettingsModel;
  activeSection: SectionId;
  dirtySections: ReadonlySet<SectionId>;
  saveState: SaveState;
  codeCopied: boolean;
  notice: string | null;
  onSectionChange: (section: SectionId) => void;
  onPatch: (patch: Partial<SettingsModel>) => void;
  onUpdateInfoCard: (id: string, patch: Partial<InfoCard>) => void;
  onAddInfoCard: () => void;
  onRemoveInfoCard: (id: string) => void;
  onCopyJoinCode: () => void;
  onSave: (advance?: boolean) => void;
  onCancel: () => void;
  onRestrictedAction: (action: RestrictedAction) => void;
};

export type ConceptFrameProps = SettingsConceptProps & {
  concept: ConceptId;
  children: ReactNode;
};
```

- [ ] **Step 3: Implement the shared miniature GB Organiser shell**

Export `GbOrganiserFrame({ concept, children }: Pick<ConceptFrameProps, "concept" | "children">)`. Render:

```tsx
<div className="gbs-browser-frame" data-concept={concept}>
  <header className="gbs-browser-bar" aria-label="Preview frame">
    <span className="gbs-browser-dots" aria-hidden="true"><i /><i /><i /></span>
    <span>GB Organiser v2 · Winter Peptide Run 2025</span>
    <span className="gbs-secure">Preview</span>
  </header>
  <div className="gbs-app-shell">
    <aside className="gbs-global-sidebar" aria-label="GB Organiser navigation">
      <div className="gbs-brand"><span aria-hidden="true">PA</span><div><small>Peps Anonymous</small><strong>GB Organiser</strong></div></div>
      <nav>
        <button type="button"><LayoutDashboard aria-hidden="true" />Overview</button>
        <button type="button"><ShoppingBag aria-hidden="true" />Orders</button>
        <button type="button"><Truck aria-hidden="true" />Dispatch</button>
        <button type="button"><Users aria-hidden="true" />Members</button>
        <button type="button" className="is-active" aria-current="page"><Settings aria-hidden="true" />GB Settings</button>
      </nav>
    </aside>
    <div className="gbs-app-main">
      <header className="gbs-topbar"><span>GB Organiser / Winter Peptide Run / <strong>Settings</strong></span><span className="gbs-avatar">AM</span></header>
      {children}
    </div>
  </div>
</div>
```

Use semantic buttons and `aria-current="page"`; the shell controls are visual context and need no navigation callbacks.

- [ ] **Step 4: Implement shared metrics and the semantic settings rail**

Export `MetricCard`, `StatusPill`, `ReadinessRing`, and `SettingsRail`. `SettingsRail` receives `activeSection`, `settings`, `onSectionChange`, and a `mode` union of `"plain" | "numbered" | "roman" | "telemetry" | "progress"`. Map `SECTIONS` to `<button type="button">` controls, use `aria-current={activeSection === section.id ? "step" : undefined}`, and show a check mark for completed Focus Flow sections from `sectionCompletion(settings)`. Never make the rail a nested navigation link.

Use these public signatures so every concept consumes the same primitives:

```tsx
export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }): ReactNode;
export function StatusPill({ status }: { status: GbStatus }): ReactNode;
export function ReadinessRing({ value }: { value: number }): ReactNode;
export function SettingsRail({
  activeSection,
  settings,
  onSectionChange,
  mode,
}: {
  activeSection: SectionId;
  settings: SettingsModel;
  onSectionChange: (section: SectionId) => void;
  mode: "plain" | "numbered" | "roman" | "telemetry" | "progress";
}): ReactNode;
```

- [ ] **Step 5: Implement all five shared editor sections**

Export `SettingsSectionEditor(props: SettingsConceptProps & { saveLabel: string; advanceOnSave?: boolean; headingStyle?: "plain" | "system" | "record" | "supportive" })`. Switch on `activeSection` and render:

- `identity`: labelled name and description fields, plus currency, `datetime-local` close date, and numeric member-limit controls;
- `lifecycle`: four labelled status buttons for Draft, Active, Closed, and Archived, with `aria-pressed` and explanatory text;
- `access`: read-only join code, Copy button, copied status, entry-fee amount and label fields, and an accessible invite-only checkbox/switch;
- `cards`: both initial cards with labelled title/body fields, remove buttons, and `Add member card`;
- `danger`: archive and delete explanations with explicit `Mock action` text and buttons that call `onRestrictedAction` rather than mutating settings.

Use controlled values from `settings`, `onPatch`, `onUpdateInfoCard`, `onAddInfoCard`, and `onRemoveInfoCard`. The footer calls `onSave(advanceOnSave)`, offers a neutral `Cancel` button that calls `onCancel`, renders `Saving…`, `Saved`, or `saveLabel`, and contains `<span className="gbs-feedback" aria-live="polite">{notice}</span>`.

- [ ] **Step 6: Establish scoped Peps tokens and base layout CSS**

Start `_group.css` with:

```css
.gbs-gallery,
.gbs-gallery * { box-sizing: border-box; }

.gbs-gallery {
  --gbs-navy: #1B3A7A;
  --gbs-deep: #1B3164;
  --gbs-blue: #2D6BCC;
  --gbs-amber: #E9A020;
  --gbs-ink: #0F1F38;
  --gbs-body: #374151;
  --gbs-muted: #6B7280;
  --gbs-subtle: #8A9AAA;
  --gbs-canvas: #F4F6F9;
  --gbs-surface: #FFFFFF;
  --gbs-border: #D0DAE4;
  min-height: 100dvh;
  color: var(--gbs-ink);
  background: #EAF0F6;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.gbs-gallery button,
.gbs-gallery input,
.gbs-gallery select,
.gbs-gallery textarea { color: inherit; font: inherit; }

.gbs-gallery :focus-visible {
  outline: 3px solid color-mix(in srgb, var(--gbs-blue) 48%, white);
  outline-offset: 2px;
}
```

Add shared gallery, concept-picker, browser-frame, 236px global sidebar, 64px topbar, page heading, status context, settings rail/editor split, labelled fields, buttons, feedback, and form-grid rules. Scope every selector below `.gbs-gallery` or `.gbs-browser-frame`; do not add global element rules.

- [ ] **Step 7: Verify the shared contract and TypeScript**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test --test-name-pattern="shared editor" src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
```

Expected: the shared-editor test passes. Typecheck emits no errors from `data.ts` or `GbSettingsShared.tsx`; concept and entry modules are not imported yet, so their absence is not a TypeScript error.

- [ ] **Step 8: Commit the shared foundation**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsShared.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css
git commit -m "feat: add shared GB Settings mockup foundation"
```

### Task 3: Implement the selected Focus Flow concept first

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/FocusFlow.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css`

- [ ] **Step 1: Add the failing Focus Flow contract**

Append:

```ts
test("Focus Flow renders readiness, progress navigation, and supportive saving", () => {
  const focus = source("./FocusFlow.tsx");
  assert.match(focus, /FOCUS_READINESS/);
  assert.match(focus, /SETUP HEALTH/);
  assert.match(focus, /Your group buy is ready to run/);
  assert.match(focus, /1 suggestion/);
  assert.match(focus, /mode="progress"/);
  assert.match(focus, /saveLabel="Save & continue"/);
  assert.match(focus, /advanceOnSave/);
});
```

- [ ] **Step 2: Run the Focus Flow test and verify it fails**

Run the Node test with `--test-name-pattern="Focus Flow"`. Expected: FAIL with `ENOENT` for `FocusFlow.tsx`.

- [ ] **Step 3: Implement the selected concept**

Create `FocusFlow.tsx`:

```tsx
import { Lightbulb } from "lucide-react";
import { FOCUS_READINESS, sectionCompletion } from "./data";
import {
  GbOrganiserFrame,
  ReadinessRing,
  SettingsRail,
  SettingsSectionEditor,
  StatusPill,
  type SettingsConceptProps,
} from "./GbSettingsShared";

export function FocusFlow(props: SettingsConceptProps) {
  const complete = sectionCompletion(props.settings);
  const completeCount = Object.entries(complete).filter(([id, value]) => id !== "danger" && value).length;

  return (
    <GbOrganiserFrame concept="focus">
      <main className="gbs-workspace gbs-focus-workspace">
        <header className="gbs-page-heading">
          <div><span className="gbs-eyebrow">SETUP HEALTH</span><h1>GB Settings</h1><p>One clear decision at a time, with guidance when it matters.</p></div>
          <StatusPill status={props.settings.status} />
        </header>
        <section className="gbs-focus-readiness" aria-label="Setup readiness">
          <ReadinessRing value={FOCUS_READINESS} />
          <div><strong>Your group buy is ready to run</strong><span>{completeCount} sections complete · changes stay in this mockup</span></div>
          <span className="gbs-recommendation"><Lightbulb aria-hidden="true" />1 suggestion</span>
        </section>
        <div className="gbs-settings-layout">
          <SettingsRail mode="progress" settings={props.settings} activeSection={props.activeSection} onSectionChange={props.onSectionChange} />
          <SettingsSectionEditor {...props} headingStyle="supportive" saveLabel="Save & continue" advanceOnSave />
        </div>
      </main>
    </GbOrganiserFrame>
  );
}
```

- [ ] **Step 4: Add the Focus Flow visual system**

In `_group.css`, add `[data-concept="focus"]` tokens and `.gbs-focus-*` rules for the pale blue-to-white workspace, 82% conic readiness ring, soft 12px cards, completion checks, supportive recommendation chip, spacious editor heading, and navy `Save & continue` action. At widths below 900px, place the rail above the editor; below 680px, make it a horizontally scrollable step row with snap points and 44px targets, then stack all form grids to one column.

- [ ] **Step 5: Run Focus Flow verification**

Run the Focus Flow test and `pnpm --filter @workspace/mockup-sandbox typecheck`. Expected: both pass.

- [ ] **Step 6: Commit Focus Flow**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/FocusFlow.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
git commit -m "feat: add Focus Flow GB Settings concept"
```

### Task 4: Implement Atlas Clear and Blueprint Desk

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/AtlasClear.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/BlueprintDesk.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css`

- [ ] **Step 1: Add failing contracts for both concepts**

Append a test that reads both files and asserts:

```ts
test("Atlas Clear and Blueprint Desk remain structurally distinct", () => {
  const atlas = source("./AtlasClear.tsx");
  const blueprint = source("./BlueprintDesk.tsx");
  assert.match(atlas, /Group buy control/);
  assert.match(atlas, /Visibility/);
  assert.match(atlas, /mode="plain"/);
  assert.match(atlas, /saveLabel="Save identity"/);
  assert.match(blueprint, /CONFIGURATION \/ LIVE RECORD/);
  assert.match(blueprint, /VALIDATION CLEAR/);
  assert.match(blueprint, /mode="numbered"/);
  assert.match(blueprint, /saveLabel="COMMIT CHANGES"/);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run with `--test-name-pattern="Atlas Clear and Blueprint"`. Expected: FAIL with `ENOENT` for `AtlasClear.tsx`.

- [ ] **Step 3: Implement Atlas Clear**

Export `AtlasClear(props: SettingsConceptProps)` with this composition:

```tsx
export function AtlasClear(props: SettingsConceptProps) {
  return (
    <GbOrganiserFrame concept="atlas">
      <main className="gbs-workspace gbs-atlas-workspace">
        <header className="gbs-page-heading">
          <div><span className="gbs-eyebrow">Group buy control</span><h1>GB Settings</h1><p>Configure what members see and how this run operates.</p></div>
          <StatusPill status={props.settings.status} />
        </header>
        <div className="gbs-metric-strip">
          <MetricCard label="Visibility" value={props.settings.inviteOnly ? "Invite only" : "Open join"} />
          <MetricCard label="Closes" value="31 Jul" detail="18:00" />
          <MetricCard label="Capacity" value="42 of 60" detail="70% filled" />
        </div>
        <div className="gbs-settings-layout">
          <SettingsRail mode="plain" settings={props.settings} activeSection={props.activeSection} onSectionChange={props.onSectionChange} />
          <SettingsSectionEditor {...props} headingStyle="plain" saveLabel="Save identity" />
        </div>
      </main>
    </GbOrganiserFrame>
  );
}
```

- [ ] **Step 4: Implement Blueprint Desk**

Export `BlueprintDesk(props: SettingsConceptProps)`:

```tsx
export function BlueprintDesk(props: SettingsConceptProps) {
  return (
    <GbOrganiserFrame concept="blueprint">
      <main className="gbs-workspace gbs-blueprint-workspace">
        <header className="gbs-page-heading gbs-system-heading">
          <div><span className="gbs-eyebrow">CONFIGURATION / LIVE RECORD</span><h1>GB_SETTINGS</h1><p>System controls for WPR-25 · local preview</p></div>
          <StatusPill status={props.settings.status} />
        </header>
        <div className="gbs-metric-strip gbs-system-metrics">
          <MetricCard label="VISIBILITY" value={props.settings.inviteOnly ? "INVITE_ONLY" : "OPEN"} />
          <MetricCard label="CLOSE_AT" value="31_JUL_18:00" />
          <MetricCard label="MEMBERS" value="42 / 60" />
        </div>
        <div className="gbs-validation-strip">✓ VALIDATION CLEAR</div>
        <div className="gbs-settings-layout">
          <SettingsRail mode="numbered" settings={props.settings} activeSection={props.activeSection} onSectionChange={props.onSectionChange} />
          <SettingsSectionEditor {...props} headingStyle="system" saveLabel="COMMIT CHANGES" />
        </div>
      </main>
    </GbOrganiserFrame>
  );
}
```

- [ ] **Step 5: Add distinct Atlas and Blueprint CSS**

Add `[data-concept="atlas"]` rules for the Peps light canvas, rounded 11–12px panels, soft blue rail selection, generous gaps, and minimal shadow. Add `[data-concept="blueprint"]` rules for `#EEF4FB`, a 15px blueprint line grid, `#173C72` structural navy, Peps amber module numbering, 2–3px radii, monospace labels, squared inputs, and explicit validation strips. Both must retain readable body typography and not depend on colour alone.

- [ ] **Step 6: Run both focused tests and TypeScript**

Run the new test pattern and typecheck. Expected: PASS.

- [ ] **Step 7: Commit both concepts**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/AtlasClear.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/BlueprintDesk.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
git commit -m "feat: add Atlas and Blueprint settings concepts"
```

### Task 5: Implement Ledger Studio and Signal Navy

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/LedgerStudio.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/SignalNavy.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css`

- [ ] **Step 1: Add failing contracts for both concepts**

Append:

```ts
test("Ledger Studio and Signal Navy expose trust and telemetry treatments", () => {
  const ledger = source("./LedgerStudio.tsx");
  const signal = source("./SignalNavy.tsx");
  assert.match(ledger, /The group-buy record/);
  assert.match(ledger, /Last amended by Alex/);
  assert.match(ledger, /mode="roman"/);
  assert.match(ledger, /saveLabel="Save record"/);
  assert.match(signal, /LIVE CONFIGURATION/);
  assert.match(signal, /SYSTEM LIVE/);
  assert.match(signal, /VALIDATION CLEAR/);
  assert.match(signal, /mode="telemetry"/);
  assert.match(signal, /saveLabel="COMMIT"/);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run with `--test-name-pattern="Ledger Studio and Signal"`. Expected: FAIL with `ENOENT` for `LedgerStudio.tsx`.

- [ ] **Step 3: Implement Ledger Studio**

Export `LedgerStudio(props: SettingsConceptProps)`:

```tsx
export function LedgerStudio(props: SettingsConceptProps) {
  return (
    <GbOrganiserFrame concept="ledger">
      <main className="gbs-workspace gbs-ledger-workspace">
        <header className="gbs-page-heading gbs-record-heading">
          <div><span className="gbs-eyebrow">The group-buy record</span><h1>GB Settings</h1><p>A considered place to keep the member promise exact.</p></div>
          <StatusPill status={props.settings.status} />
        </header>
        <div className="gbs-metric-strip gbs-record-metrics">
          <MetricCard label="Visibility" value={props.settings.inviteOnly ? "Invite only" : "Open join"} />
          <MetricCard label="Closes on" value="31 July" />
          <MetricCard label="Member places" value="42 of 60" />
        </div>
        <p className="gbs-amendment">Last amended by Alex · today</p>
        <div className="gbs-settings-layout">
          <SettingsRail mode="roman" settings={props.settings} activeSection={props.activeSection} onSectionChange={props.onSectionChange} />
          <SettingsSectionEditor {...props} headingStyle="record" saveLabel="Save record" />
        </div>
      </main>
    </GbOrganiserFrame>
  );
}
```

- [ ] **Step 4: Implement Signal Navy**

Export `SignalNavy(props: SettingsConceptProps)`:

```tsx
export function SignalNavy(props: SettingsConceptProps) {
  return (
    <GbOrganiserFrame concept="signal">
      <main className="gbs-workspace gbs-signal-workspace">
        <header className="gbs-page-heading gbs-signal-heading">
          <div><span className="gbs-eyebrow">LIVE CONFIGURATION</span><h1>GB Settings</h1><p>Operating controls and readiness signals for WPR-25.</p></div>
          <span className="gbs-system-live">● SYSTEM LIVE</span>
        </header>
        <div className="gbs-telemetry-strip">
          <MetricCard label="Member access" value={props.settings.inviteOnly ? "● Invite only" : "● Open join"} />
          <MetricCard label="Closes in" value="13d 08h" />
          <MetricCard label="Capacity" value="70%" />
        </div>
        <div className="gbs-validation-strip">✓ VALIDATION CLEAR</div>
        <div className="gbs-settings-layout">
          <SettingsRail mode="telemetry" settings={props.settings} activeSection={props.activeSection} onSectionChange={props.onSectionChange} />
          <SettingsSectionEditor {...props} headingStyle="system" saveLabel="COMMIT" />
        </div>
      </main>
    </GbOrganiserFrame>
  );
}
```

- [ ] **Step 5: Add distinct Ledger and Signal CSS**

Add `[data-concept="ledger"]` rules for warm `#EBE7DE` canvas, `#FFFEFA` paper surfaces, deep teal-navy `#17383B`, Peps amber highlights, Georgia/editorial headings, 3px geometry, and visible audit dividers. Add `[data-concept="signal"]` rules for `#081421` canvas, `#0F1D2D` panels, `#293D55` borders, high-contrast text, Peps blue plus restrained teal status accents, telemetry blocks, and no glow on body text. All Signal inputs and buttons must meet contrast requirements.

- [ ] **Step 6: Run both focused tests and TypeScript**

Run the new test pattern and typecheck. Expected: PASS.

- [ ] **Step 7: Commit both concepts**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/LedgerStudio.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/SignalNavy.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
git commit -m "feat: add Ledger and Signal settings concepts"
```

### Task 6: Wire the interactive gallery coordinator

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css`

- [ ] **Step 1: Run the gallery contract and verify it fails**

Run with `--test-name-pattern="gallery imports"`. Expected: FAIL with `ENOENT` for `GbSettingsConcepts.tsx`.

- [ ] **Step 2: Add the gallery state model and local callbacks**

Create `GbSettingsConcepts.tsx`, import the five concepts, shared types, `_group.css`, and data constants, then initialise:

```tsx
const [concept, setConcept] = useState<ConceptId>(DEFAULT_CONCEPT);
const [settings, setSettings] = useState<SettingsModel>(INITIAL_SETTINGS);
const [savedSettings, setSavedSettings] = useState<SettingsModel>(() => cloneSettings(INITIAL_SETTINGS));
const [activeSection, setActiveSection] = useState<SectionId>("identity");
const [dirtySections, setDirtySections] = useState<Set<SectionId>>(() => new Set());
const [saveState, setSaveState] = useState<SaveState>("idle");
const [codeCopied, setCodeCopied] = useState(false);
const [notice, setNotice] = useState<string | null>(null);
const nextCardId = useRef(3);
```

Implement immutable local mutation callbacks as follows. Every edit adds the active section to `dirtySections` and resets `saveState` to `idle`:

```tsx
const markDirty = (section: SectionId) => {
  setDirtySections(previous => new Set(previous).add(section));
  setSaveState("idle");
};

const handlePatch = (patch: Partial<SettingsModel>) => {
  setSettings(previous => ({ ...previous, ...patch }));
  markDirty(activeSection);
};

const handleUpdateInfoCard = (id: string, patch: Partial<InfoCard>) => {
  setSettings(previous => ({
    ...previous,
    infoCards: previous.infoCards.map(card => card.id === id ? { ...card, ...patch } : card),
  }));
  markDirty("cards");
};

const handleAddInfoCard = () => {
  const id = `member-card-${nextCardId.current++}`;
  setSettings(previous => ({ ...previous, infoCards: [...previous.infoCards, { id, title: "", body: "" }] }));
  markDirty("cards");
};

const handleRemoveInfoCard = (id: string) => {
  setSettings(previous => ({ ...previous, infoCards: previous.infoCards.filter(card => card.id !== id) }));
  markDirty("cards");
};
```

- [ ] **Step 3: Add copy, save, advance, and restricted-action feedback**

Implement these behaviors without API calls or `alert()`:

```tsx
const handleCopyJoinCode = () => {
  void navigator.clipboard?.writeText(settings.joinCode);
  setCodeCopied(true);
  setNotice("Join code copied");
  window.setTimeout(() => setCodeCopied(false), 1600);
};

const handleSave = (advance = false) => {
  const sectionToSave = activeSection;
  setSaveState("saving");
  setNotice(null);
  window.setTimeout(() => {
    setSavedSettings(cloneSettings(settings));
    setDirtySections(previous => {
      const next = new Set(previous);
      next.delete(sectionToSave);
      return next;
    });
    setSaveState("saved");
    setNotice(`${SECTIONS.find(section => section.id === sectionToSave)?.label} saved in this mockup`);
    if (advance) setActiveSection(nextSection(sectionToSave));
    window.setTimeout(() => setSaveState("idle"), 1500);
  }, 450);
};

const handleCancel = () => {
  setSettings(cloneSettings(savedSettings));
  setDirtySections(() => new Set());
  setSaveState("idle");
  setNotice("Changes discarded in this mockup");
};

const handleRestrictedAction = (action: RestrictedAction) => {
  setNotice(`${action === "archive" ? "Archive" : "Delete"} is a mock action — no group-buy data changed`);
};
```

- [ ] **Step 4: Render the five-item concept picker**

Render one `<button type="button">` per `CONCEPTS` item inside a container with `aria-label="Choose GB Settings concept"`. Each button shows `01`–`05`, label, description, and note; use `aria-pressed={concept === item.id}`. Mark Focus Flow visibly as `Selected direction`. Switching concept preserves settings, current section, and local feedback state.

- [ ] **Step 5: Route one shared props object to five dedicated concepts**

Build a `SettingsConceptProps` object once. Use a `switch (concept)` to render `AtlasClear`, `BlueprintDesk`, `LedgerStudio`, `SignalNavy`, or `FocusFlow`. Do not duplicate state or callback creation inside the concept branches. Wrap the picker and selected concept in `<div className="gbs-gallery" data-active-concept={concept}>`.

- [ ] **Step 6: Finish gallery and mobile CSS**

Add the gallery introduction, five-item picker, selected card, transition, and browser-frame sizing rules. Desktop may use a five-column picker above the preview; tablet uses a two-column wrapping grid; mobile uses a horizontally scrollable snap row. Add:

```css
@media (max-width: 680px) {
  .gbs-global-sidebar { display: none; }
  .gbs-app-shell { grid-template-columns: 1fr; }
  .gbs-settings-layout { grid-template-columns: 1fr; }
  .gbs-form-grid { grid-template-columns: 1fr; }
  .gbs-gallery button,
  .gbs-gallery input,
  .gbs-gallery select { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .gbs-gallery *,
  .gbs-gallery *::before,
  .gbs-gallery *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
```

- [ ] **Step 7: Run focused tests, typecheck, and build**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
MOCKUP_PORT=4183 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build
```

Expected: all focused tests pass, TypeScript emits no errors, and Vite builds successfully while regenerating the registry entry for `gb-settings-concepts/GbSettingsConcepts.tsx`. Do not stage the generated registry.

- [ ] **Step 8: Commit the gallery coordinator**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/GbSettingsConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
git commit -m "feat: wire five GB Settings mockups"
```

### Task 7: Verify the direct preview, accessibility, responsiveness, and isolation

**Files:**
- Modify only when a verification failure identifies the exact defect: `artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts/*`

- [ ] **Step 1: Confirm auto-discovery without editing the registry**

Run:

```bash
rg -n "gb-settings-concepts/GbSettingsConcepts" artifacts/mockup-sandbox/src/.generated/mockup-components.ts
```

Expected: exactly one generated dynamic-import entry. If absent, rerun the sandbox build from Task 6; do not edit or stage the registry manually.

- [ ] **Step 2: Start the direct sandbox preview**

Run:

```bash
cd artifacts/mockup-sandbox
MOCKUP_PORT=4183 MOCKUP_BASE_PATH=/ pnpm dev --host 0.0.0.0
```

Open `/preview/gb-settings-concepts/GbSettingsConcepts`. Expected: Focus Flow opens by default, all five picker buttons appear, and no runtime error overlay is present.

- [ ] **Step 3: Exercise all required local interactions**

Verify in the browser:

1. each concept button changes the complete visual treatment while retaining `Winter Peptide Run 2025` data;
2. Identity, Lifecycle, Access & fee, Member cards, and Danger zone are reachable in every concept;
3. editing the name marks Identity dirty and Save clears its dirty state;
4. Focus Flow `Save & continue` advances to the next section after feedback;
5. Cancel restores the last saved local snapshot and clears dirty state;
6. status buttons expose text and `aria-pressed` state;
7. invite-only toggles without a network request;
8. Copy produces `Join code copied` feedback;
9. adding, editing, and removing a member card updates local state;
10. archive/delete show mock-only feedback and do not remove content;
11. keyboard focus remains visible through concept buttons, rail buttons, fields, and save actions.

- [ ] **Step 4: Inspect responsive behavior**

Check 1440px, 1024px, 768px, and 375px widths. Confirm:

- no page-level horizontal overflow;
- the desktop rail/editor split remains readable;
- tablet content reflows without clipped controls;
- mobile hides the miniature global sidebar, presents the settings rail as a compact step navigator, and stacks fields;
- touch targets are at least 44px;
- the save action remains reachable;
- Signal Navy text and controls retain adequate contrast.

- [ ] **Step 5: Re-run automated verification**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-settings-concepts/gb-settings-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
MOCKUP_PORT=4183 MOCKUP_BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox build
git diff --check -- src/components/mockups/gb-settings-concepts
```

Expected: the focused test, typecheck, build, and whitespace check pass.

- [ ] **Step 6: Prove the production GB Settings file is unchanged**

Run:

```bash
sha256sum artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx
git status --short -- artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx artifacts/mockup-sandbox/src/.generated/mockup-components.ts
git diff --cached --name-only
```

Expected: the `GbSettingsTab.tsx` hash matches Task 1; the status command may show its pre-existing state and the generator's pre-existing modification, but neither path is staged; the cached-name list contains no production organiser file or generated registry.

- [ ] **Step 7: Commit any final scoped corrections**

If Steps 1–6 required target-group corrections, stage only the target directory and commit them:

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-settings-concepts
git commit -m "test: verify GB Settings mockup gallery"
```

If there were no corrections, skip this commit rather than creating an empty commit.

## Plan Self-Review

- **Spec coverage:** Tasks 1–7 cover the same local settings model, all five dedicated concepts, Focus Flow default, Control Navigator structure, concept switching, local edits, copy/save/cancel/card/restricted-action feedback, responsive behavior, accessibility, source tests, typecheck, build, direct preview, and production isolation.
- **Placeholder scan:** The plan contains no unfinished markers, deferred implementation, generic error-handling instruction, or unnamed test request. Each step names exact files, code contracts, commands, and expected outcomes.
- **Type consistency:** `ConceptId`, `SectionId`, `SettingsModel`, and `InfoCard` live in `data.ts`; every concept consumes `SettingsConceptProps`; `SaveState` and `RestrictedAction` live in `GbSettingsShared.tsx`; the coordinator owns all mutations and passes one props object to every concept.
- **Scope check:** This is one isolated mockup-sandbox subsystem. The auto-generated registry and production GB Settings component are explicitly excluded from manual edits and commits.

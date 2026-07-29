# GB Settings Atlas Clear Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production GB Settings accordion with the approved Atlas Clear rail-and-editor interface while preserving every current API call and save behavior.

**Architecture:** Keep `GbSettingsTab` as the existing API-backed state container and reorganize only its presentation around one typed active section, a semantic settings rail, live summary metrics, and one focused editor. Import one new stylesheet scoped beneath `.gb-settings-atlas`, and protect the behavior with a focused source-contract test plus the existing organiser resource test.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React, TanStack Query, Node test runner

---

## File Structure and Safety Boundary

- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx`
  - Retain API normalization, payload shaping, mutations, query invalidation, and save state.
  - Replace accordion presentation state and markup with Atlas Clear navigation and editor markup.
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css`
  - Own every Atlas-specific token, layout, responsive rule, focus state, and reduced-motion rule.
  - Scope every selector beneath `.gb-settings-atlas` or an Atlas state root.
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts`
  - Verify structural, behavioral-preservation, responsive, and accessibility contracts.

The production component is existing user-owned, untracked work with baseline SHA-256:

```text
4c4abb0250c9572fd56f03c66dc5e901d0ea52d846876c6048be6aaf7bce781c
```

Do not edit `peps-native.css`, `organiser-v2.css`, `approved-tabs.css`, the mockup gallery, or the generated mockup registry. Do not commit the application changes from this dirty shared workspace because the complete untracked `GbSettingsTab.tsx` cannot be separated from its user-owned baseline. The already approved design and this plan may be committed independently.

### Task 1: Define the failing Atlas production contract

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts`
- Read: `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx`
- Read: `artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-resources.test.ts`

- [ ] **Step 1: Confirm the production baseline and target status**

Run:

```bash
sha256sum artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx
git status --short -- \
  artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts
```

Expected: the hash is the recorded baseline, only `GbSettingsTab.tsx` is present, and it is untracked.

- [ ] **Step 2: Write the focused source-contract test**

Create `gb-settings-atlas-contract.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("GB Settings uses the five-section Atlas Clear control navigator", () => {
  const tab = source("./GbSettingsTab.tsx");

  assert.match(tab, /import "\.\/gb-settings-atlas\.css"/);
  assert.match(tab, /type SettingsSectionId = "identity" \| "lifecycle" \| "access" \| "cards" \| "danger"/);
  for (const label of ["Identity", "Lifecycle", "Access & fee", "Member cards", "Danger zone"]) {
    assert.match(tab, new RegExp(label));
  }
  assert.match(tab, /useState<SettingsSectionId>\("identity"\)/);
  assert.match(tab, /className="gb-settings-atlas"/);
  assert.match(tab, /aria-label="GB settings sections"/);
  assert.match(tab, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(tab, /data-section-id=\{section\.id\}/);
});

test("Atlas metrics use live settings and retain production API behavior", () => {
  const tab = source("./GbSettingsTab.tsx");

  assert.match(tab, /settings\.inviteOnly/);
  assert.match(tab, /settings\.closeDate/);
  assert.match(tab, /settings\.maxMembers/);
  assert.doesNotMatch(tab, /42 of 60|WPR-25|31 Jul/);
  assert.match(tab, /organiserApi\.groupBuy/);
  assert.match(tab, /organiserApi\.updateGroupBuy/);
  assert.match(tab, /organiserApi\.archiveGroupBuy/);
  assert.match(tab, /invalidateQueries\(\{ queryKey: \["organiser", "group-buys"\] \}\)/);
  assert.doesNotMatch(tab, /onCancel|dirtySections|Save & continue/);
});

test("Atlas controls expose labels, live feedback, and named icon actions", () => {
  const tab = source("./GbSettingsTab.tsx");

  for (const id of [
    "gb-settings-name",
    "gb-settings-description",
    "gb-settings-currency",
    "gb-settings-close-date",
    "gb-settings-member-limit",
    "gb-settings-entry-fee",
    "gb-settings-fee-label",
  ]) {
    assert.match(tab, new RegExp(`htmlFor="${id}"`));
    assert.match(tab, new RegExp(`id="${id}"`));
  }
  assert.match(tab, /aria-live="polite"/);
  assert.match(tab, /aria-label=\{`Remove \$\{card\.title/);
  assert.match(tab, /role="switch"/);
});

test("Atlas stylesheet is scoped, responsive, focus-visible, and motion-safe", () => {
  const css = source("./gb-settings-atlas.css");

  assert.match(css, /\.gb-settings-atlas\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(210px, 232px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.gb-settings-atlas :focus-visible/);
  assert.match(css, /outline:\s*3px solid/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /overflow-x:\s*auto/);
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
node --experimental-strip-types --test \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts
```

Expected: FAIL because `GbSettingsTab.tsx` does not import Atlas CSS or expose the rail structure, and `gb-settings-atlas.css` does not exist.

### Task 2: Refactor the production component into Atlas Clear

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx`
- Test: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts`

- [ ] **Step 1: Replace accordion types and metadata with typed Atlas sections**

Update the React import to include `useRef`, import the new CSS file, remove `Lightbulb`, `ChevronDown`, and `ChevronRight`, and add the Atlas navigation/metric icons used below.

Add these declarations after `GbSettingsState`:

```tsx
type SettingsSectionId = "identity" | "lifecycle" | "access" | "cards" | "danger";

type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof Settings;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "identity", label: "Identity", description: "Name, timing and capacity", icon: FileText },
  { id: "lifecycle", label: "Lifecycle", description: "Draft, active, closed or archived", icon: ClipboardList },
  { id: "access", label: "Access & fee", description: "Join code, visibility and entry fee", icon: KeyRound },
  { id: "cards", label: "Member cards", description: "Notices published to members", icon: Info },
  { id: "danger", label: "Danger zone", description: "Archive and deletion controls", icon: AlertTriangle },
];
```

Remove the old collapsible `Section` helper and replace it with:

```tsx
function AtlasEditorSection({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gb-settings-atlas__editor" aria-labelledby="gb-settings-editor-title">
      <header className="gb-settings-atlas__editor-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id="gb-settings-editor-title">{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="gb-settings-atlas__editor-content">{children}</div>
    </section>
  );
}

function AtlasMetric({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Settings;
}) {
  return (
    <div className="gb-settings-atlas__metric">
      <Icon aria-hidden="true" />
      <span><small>{label}</small><strong>{value}</strong>{detail ? <em>{detail}</em> : null}</span>
    </div>
  );
}
```

- [ ] **Step 2: Add active-section state and mobile selected-item visibility**

Replace `openSections` and `toggleSection` with:

```tsx
const [activeSection, setActiveSection] = useState<SettingsSectionId>("identity");
const settingsRailRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  settingsRailRef.current
    ?.querySelector<HTMLElement>(`[data-section-id="${activeSection}"]`)
    ?.scrollIntoView({ block: "nearest", inline: "center" });
}, [activeSection]);
```

Keep the existing selected-group loading effect unchanged.

- [ ] **Step 3: Add live display helpers without changing payload behavior**

Add:

```tsx
function formatCloseDate(value: string): { value: string; detail?: string } {
  if (!value) return { value: "Not scheduled" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { value: "Not scheduled" };
  return {
    value: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    detail: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}
```

Inside the loaded render path derive:

```tsx
const currentSection = SETTINGS_SECTIONS.find(section => section.id === activeSection) ?? SETTINGS_SECTIONS[0];
const closeDate = formatCloseDate(settings.closeDate);
const memberLimit = settings.maxMembers.trim() ? `${settings.maxMembers} members` : "Unlimited";
```

- [ ] **Step 4: Render the Atlas header, metrics, and semantic rail**

Replace the current header/explainer/accordion wrapper with this structure:

```tsx
<div className="gb-settings-atlas">
  <header className="gb-settings-atlas__page-heading">
    <div>
      <span>Group buy control</span>
      <h1>GB Settings</h1>
      <p>Configure what members see and how this run operates.</p>
    </div>
    {currentStatus ? (
      <span className="gb-settings-atlas__status" data-status={currentStatus.key}>
        <CheckCircle2 aria-hidden="true" />
        {currentStatus.label}
      </span>
    ) : null}
  </header>

  <div className="gb-settings-atlas__metrics" aria-label="Current group buy settings summary">
    <AtlasMetric icon={Eye} label="Visibility" value={settings.inviteOnly ? "Invite only" : "Open join"} />
    <AtlasMetric icon={CalendarDays} label="Closes" value={closeDate.value} detail={closeDate.detail} />
    <AtlasMetric icon={Users} label="Member limit" value={memberLimit} />
  </div>

  <div className="gb-settings-atlas__workspace">
    <nav ref={settingsRailRef} className="gb-settings-atlas__rail" aria-label="GB settings sections">
      {SETTINGS_SECTIONS.map(section => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            data-section-id={section.id}
            className={isActive ? "is-active" : ""}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="gb-settings-atlas__rail-icon"><Icon aria-hidden="true" /></span>
            <span><strong>{section.label}</strong><small>{section.description}</small></span>
          </button>
        );
      })}
    </nav>

  </div>
</div>
```

- [ ] **Step 5: Move every existing control into its matching conditional editor block**

After the rail, render one `AtlasEditorSection` with the current metadata:

```tsx
<AtlasEditorSection
  eyebrow={currentSection.label}
  title={currentSection.id === "identity" ? "Identity & timing" : currentSection.label}
  description={currentSection.description}
>
  {activeSection === "identity" ? identityEditor : null}
  {activeSection === "lifecycle" ? lifecycleEditor : null}
  {activeSection === "access" ? accessEditor : null}
  {activeSection === "cards" ? cardsEditor : null}
  {activeSection === "danger" ? dangerEditor : null}
</AtlasEditorSection>
```

Define `identityEditor`, `lifecycleEditor`, `accessEditor`, `cardsEditor`, and `dangerEditor` as JSX variables inside `GbSettingsTab`, immediately before the return. They are presentation variables, not new components, and map the existing baseline blocks exactly:

- `identityEditor`: current lines 342-414, containing name, description, currency, close date, member limit, and the basics `SaveButton`.
- `lifecycleEditor`: current lines 425-449, containing the four status buttons and lifecycle help.
- `accessEditor`: current lines 462-528, containing join code/copy, entry fee, fee label, invite-only control, and access `SaveButton`.
- `cardsEditor`: current lines 542-588, containing explanatory copy, card editors, add action, and cards `SaveButton`.
- `dangerEditor`: current lines 592-629, containing both danger rows and the existing archive/delete buttons.

Move those existing blocks without changing their event-handler expressions. Wrap each variable in a fragment or one semantic container with the Atlas classes from Task 3. Preserve these handlers exactly:

```tsx
saveSettings(setSavingBasics, setBasicsSaved)
handleSetStatus(status.key)
copyCode()
saveSettings(setSavingAccess, setAccessSaved)
addInfoCard()
updateInfoCard(index, key, value)
removeInfoCard(index)
saveSettings(setSavingCards, setCardsSaved)
handleArchive()
handleDelete()
```

Add stable input IDs and matching `htmlFor` values:

```text
gb-settings-name
gb-settings-description
gb-settings-currency
gb-settings-close-date
gb-settings-member-limit
gb-settings-entry-fee
gb-settings-fee-label
```

For each member card, use IDs based on the index and explicit labels:

```tsx
const titleId = `gb-settings-card-title-${index}`;
const bodyId = `gb-settings-card-body-${index}`;
```

The remove button must use:

```tsx
aria-label={`Remove ${card.title || `member card ${index + 1}`}`}
title="Remove member card"
```

The invite-only checkbox retains `type="checkbox"`, adds `role="switch"`, and remains controlled by `settings.inviteOnly`.

Add `aria-live="polite"` to save-button feedback text and copy feedback. Do not add Cancel, dirty tracking, autosave, or new API calls.

- [ ] **Step 6: Restyle the existing no-selection/loading/error/deleted states**

Use a shared class structure without changing conditions or text:

```tsx
<div className="gb-settings-atlas-state" data-tone="neutral|danger" role={loadError ? "alert" : undefined}>
  <span className="gb-settings-atlas-state__icon">...</span>
  <h3>...</h3>
  <p>...</p>
</div>
```

Keep the current load-error `role="alert"`, loading spinner, and deleted/no-selection logic.

### Task 3: Add the scoped Atlas Clear visual system

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx`
- Test: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts`

- [ ] **Step 1: Create scoped tokens and stable desktop layout**

Start the stylesheet with:

```css
.gb-settings-atlas,
.gb-settings-atlas *,
.gb-settings-atlas-state,
.gb-settings-atlas-state * {
  box-sizing: border-box;
}

.gb-settings-atlas {
  --gbs-navy: #1b3a7a;
  --gbs-deep: #1b3164;
  --gbs-blue: #2d6bcc;
  --gbs-ink: #0f1f38;
  --gbs-body: #374151;
  --gbs-muted: #6b7280;
  --gbs-subtle: #8a9aaa;
  --gbs-canvas: #f8fafc;
  --gbs-surface: #ffffff;
  --gbs-border: #d0dae4;
  --gbs-success: #168a63;
  --gbs-danger: #c94949;
  min-width: 0;
  color: var(--gbs-ink);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.gb-settings-atlas__workspace {
  display: grid;
  grid-template-columns: minmax(210px, 232px) minmax(0, 1fr);
  align-items: start;
  gap: 14px;
}
```

Implement the remaining selectors with these exact responsibilities:

- `.gb-settings-atlas__page-heading`: compact flex heading, no enclosing decorative card.
- `.gb-settings-atlas__status`: textual status pill with icon and status-specific tones.
- `.gb-settings-atlas__metrics`: three stable equal columns.
- `.gb-settings-atlas__metric`: individual 8px cards with icon, label, value, and optional detail.
- `.gb-settings-atlas__rail`: white 8px framed navigation with a vertical button list.
- `.gb-settings-atlas__rail > button`: fixed internal grid that does not shift between states.
- `.gb-settings-atlas__rail > button.is-active`: blue-tinted surface and inset blue selection marker.
- `.gb-settings-atlas__editor`: one white 8px framed editing tool.
- `.gb-settings-atlas__editor-heading`, `__editor-content`, and `__editor-footer`: clear internal bands separated by 1px borders.
- `.gb-settings-atlas__field`, `__field-grid`, and form controls: explicit label hierarchy, 42px desktop inputs, and visible focus.
- `.gb-settings-atlas__status-grid`: four stable status choices.
- `.gb-settings-atlas__join-code`: code and copy action grid.
- `.gb-settings-atlas__switch-row`: label copy plus native controlled switch.
- `.gb-settings-atlas__member-card`: unframed editor rows divided by borders, avoiding nested decorative cards.
- `.gb-settings-atlas__danger-row`: restrained action rows with danger reserved for actions.
- `.gb-settings-atlas-state`: centered 8px state panel consistent with Atlas.

- [ ] **Step 2: Add keyboard, disabled, feedback, and reduced-motion states**

Add:

```css
.gb-settings-atlas :focus-visible,
.gb-settings-atlas-state :focus-visible {
  outline: 3px solid rgba(45, 107, 204, 0.48);
  outline-offset: 2px;
}

.gb-settings-atlas button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (prefers-reduced-motion: reduce) {
  .gb-settings-atlas *,
  .gb-settings-atlas *::before,
  .gb-settings-atlas *::after,
  .gb-settings-atlas-state * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 3: Add tablet and mobile reflow**

Add:

```css
@media (max-width: 900px) {
  .gb-settings-atlas__workspace { grid-template-columns: 1fr; }
  .gb-settings-atlas__rail {
    display: grid;
    grid-template-columns: repeat(5, minmax(132px, 1fr));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }
  .gb-settings-atlas__rail > button { min-height: 56px; scroll-snap-align: start; }
}

@media (max-width: 600px) {
  .gb-settings-atlas__page-heading { align-items: flex-start; }
  .gb-settings-atlas__metrics { grid-template-columns: 1fr; }
  .gb-settings-atlas__field-grid,
  .gb-settings-atlas__status-grid,
  .gb-settings-atlas__join-code { grid-template-columns: 1fr; }
  .gb-settings-atlas button,
  .gb-settings-atlas input,
  .gb-settings-atlas select { min-height: 44px; }
  .gb-settings-atlas__editor-heading,
  .gb-settings-atlas__editor-content,
  .gb-settings-atlas__editor-footer { padding-right: 14px; padding-left: 14px; }
  .gb-settings-atlas__editor-footer { align-items: stretch; }
}
```

Ensure the document itself never gains horizontal overflow; only the rail is horizontally scrollable.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --experimental-strip-types --test \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/api/organiser-resources.test.ts
```

Expected: all Atlas contract tests and existing organiser resource tests PASS.

### Task 4: Compile, build, and inspect the production experience

**Files:**
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css`
- Verify: `artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts`

- [ ] **Step 1: Run TypeScript without invoking a workspace reinstall**

Run:

```bash
/home/amoney/UpdateSP/node_modules/.bin/tsc \
  -p artifacts/peps-anonymous/tsconfig.json --noEmit
```

Expected: exit 0, or only explicitly documented unrelated pre-existing errors with no Atlas file in the diagnostics. If an Atlas file appears, fix it before continuing.

- [ ] **Step 2: Build the Peps Anonymous application**

Run:

```bash
PORT=4174 BASE_PATH=/ \
  /home/amoney/UpdateSP/artifacts/peps-anonymous/node_modules/.bin/vite \
  build --config artifacts/peps-anonymous/vite.config.ts
```

Expected: Vite exits 0 and emits the production bundle.

- [ ] **Step 3: Start a local preview server**

Run on an available port:

```bash
PORT=4174 BASE_PATH=/ VITE_NO_WATCH=1 \
  /home/amoney/UpdateSP/artifacts/peps-anonymous/node_modules/.bin/vite \
  --config artifacts/peps-anonymous/vite.config.ts --host 0.0.0.0
```

Open:

```text
http://localhost:4174/gborganiser-v2
```

- [ ] **Step 4: Exercise behavior in the browser**

Verify:

1. The selected group buy loads from the organiser API.
2. Each of the five rail items activates one editor and exposes `aria-current="page"`.
3. Identity save uses the existing save state and refreshes settings.
4. Lifecycle status changes still call the current mutation path.
5. Join-code copy feedback is announced.
6. Access save and member-card add/edit/remove/save still work.
7. Archive and delete retain their current confirmation and mutation behavior.
8. No runtime console errors occur.

- [ ] **Step 5: Inspect responsive and accessibility evidence**

Capture screenshots at 1440x1000, 1024x900, 768x900, and 375x812. For every viewport verify:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Also verify:

- The selected mobile rail item is visible after each selection.
- No text overlaps, clips unintentionally, or escapes a button.
- All visible buttons and mobile inputs are at least 44px high at 375px.
- Keyboard focus is visibly 3px.
- Every visible input has a label and every icon-only button has a name.
- Reduced-motion computes transitions and animations to `0.01ms`.

- [ ] **Step 6: Perform the final exact-path review**

Run:

```bash
git diff --check -- \
  artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts

git status --short -- \
  artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas.css \
  artifacts/peps-anonymous/src/pages/organiser-v2/gb-settings-atlas-contract.test.ts
```

Expected: only the three approved Atlas production paths appear. Leave them uncommitted because the main component includes the pre-existing untracked user baseline.

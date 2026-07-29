# GB Settings Atlas Clear Production Design

## Purpose

Replace the current accordion-based GB Settings presentation in GB Organizer v2 with the approved Atlas Clear concept. The production screen should gain Atlas Clear's calm control-navigation structure while retaining the current live API integration and section-specific save behavior.

Atlas Clear was selected from the five-concept mockup gallery. This production decision does not remove or change the gallery; the gallery remains available as design history and comparison material.

## Approved Direction

Use the full Atlas Clear structure:

- A compact page heading with the `Group buy control` kicker, `GB Settings` title, supporting copy, and current status.
- A three-item operational summary for visibility, close date, and member limit, populated from the selected group buy.
- A persistent five-item settings rail for Identity, Lifecycle, Access & fee, Member cards, and Danger zone.
- One focused editor beside the rail rather than multiple expandable accordions.
- A light Peps Anonymous visual system using the approved navy, blue, neutral, success, and danger tokens.

The production implementation preserves the current API calls and independent section save behavior. It does not add the mockup's Cancel action, dirty-section tracking, local snapshot restoration, readiness score, or Save & continue flow.

## Goals

- Make the settings hierarchy continuously visible and easier to scan.
- Match the approved Atlas Clear mockup closely without copying mock-only shell elements or hard-coded sample values.
- Preserve all current fields, mutations, copy behavior, status transitions, archive action, and delete confirmation.
- Use live group-buy data for every summary and status treatment.
- Keep the redesign isolated from unrelated Organizer v2 screens and existing user-owned CSS changes.
- Provide a coherent responsive experience from wide desktop to 375px mobile.

## Non-goals

- No Organizer sidebar, topbar, workspace, or navigation redesign.
- No new settings fields or API endpoints.
- No change to payload shaping, query invalidation, or mutation timing.
- No mock values such as `42 of 60`, `WPR-25`, or a fixed close date in production.
- No unsaved-change warning, Cancel flow, autosave, validation framework, or retry system.
- No migration of the other four mockup concepts into production.

## Production Constraints

The live `GbSettingsTab.tsx` and much of the current Organizer v2 implementation are user-owned, untracked work in the shared main workspace. Implementation must preserve that state, edit only the approved settings surface, and stage or commit only exact Atlas Clear paths when explicitly required.

The mockup branch remains preserved at `feature/gb-settings-five-mockups`. Production implementation must not rewrite the mockup gallery or its generated registry.

## Component Architecture

`GbSettingsTab` remains the API-backed container. It continues to own loading, settings state, save state, status mutations, copy feedback, info-card mutations, archive/delete state, and query invalidation.

The presentation changes inside that container:

1. Replace `openSections` with one `activeSection` value, initially `identity`.
2. Define a small typed settings-section metadata list for the five rail entries.
3. Render an Atlas page header and live metric strip above the settings workspace.
4. Render a semantic settings rail whose buttons select the active editor section.
5. Render one focused editor with the controls and action for the active section.
6. Keep small local presentation helpers only where they reduce repeated markup, such as the rail, field group, editor heading, and save button.

The redesign uses a new `gb-settings-atlas.css` file imported by `GbSettingsTab.tsx`. All selectors are scoped beneath a `.gb-settings-atlas` root so they do not alter other Organizer v2 pages. Existing shared theme variables may be consumed, but Atlas-specific layout rules do not go into the already modified shared stylesheets.

## Section Mapping

### Identity

Contains the existing name, description, currency, close date, and maximum member controls. Its footer uses the existing settings mutation and `Save Changes` feedback state.

### Lifecycle

Contains the four existing status choices: Draft, Active, Closed, and Archived. Selecting a status keeps the current immediate mutation behavior and loading state.

### Access & Fee

Contains the read-only join code, copy action, invite-only switch, entry fee amount, and fee label. Its footer retains the existing access save state and mutation.

### Member Cards

Contains the existing editable info-card list, add action, remove action, and cards save state. Remove controls remain icon buttons with accessible names.

### Danger Zone

Contains the existing archive and delete actions with their current confirmation and request behavior. The section uses restrained danger styling and does not compete visually with routine settings.

## Data Flow and Behavior

The existing data path remains intact:

1. `selectedGbId` triggers `organiserApi.groupBuy`.
2. `settingsFromApi` normalizes the response into local settings state.
3. Field edits update local React state through the existing patch mechanism.
4. Identity, access, and member-card save actions call the existing `saveSettings` path and payload builder.
5. Lifecycle actions continue through `handleSetStatus`.
6. Archive/delete continue through their existing handlers.
7. Successful mutations continue invalidating `['organiser', 'group-buys']`.

Switching rail sections does not save, discard, or reset local edits. This matches current behavior. No Cancel control is added.

The metric strip derives values from live settings:

- Visibility: `Invite only` or `Open join`.
- Closes: formatted from `closeDate`, with a clear fallback when no date exists.
- Member limit: the configured maximum or `Unlimited`.

The current status is shown in the page heading and lifecycle editor. No member-count value is invented because the current settings model does not provide one.

## Loading and Error States

The existing no-selection, loading, load-error, and deleted states remain functionally unchanged and receive Atlas-compatible presentation. The load error retains `role="alert"`.

This redesign does not introduce new API error semantics, retries, or global notifications. Existing mutation behavior remains unchanged.

## Responsive Design

### Desktop

- The rail and editor use a stable two-column grid.
- The rail is approximately 220-240px wide; the editor consumes remaining space.
- The metric strip uses three equal columns.
- Save actions remain aligned with the active editor content.

### Tablet

- The rail remains visible where space permits, then moves above the editor at the defined breakpoint.
- Metrics retain a compact three-column arrangement until labels no longer fit.

### Mobile

- The rail becomes a horizontally scrollable row above the editor.
- The selected rail item scrolls into view when changed.
- Metrics stack or use a compact responsive grid without horizontal page overflow.
- Form grids collapse to one column.
- Interactive controls meet a 44px minimum touch target.
- Footer actions wrap without obscuring labels or adjacent content.

## Accessibility

- Use a labelled navigation region for the settings rail.
- Rail buttons expose the selected section with `aria-current="page"`.
- Every form control has a programmatic label and stable ID.
- Icon-only controls have explicit accessible names and tooltips where needed.
- Copy and save feedback use polite live regions.
- Status and destructive meaning are conveyed with text and icons, not color alone.
- Keyboard focus uses a visible 3px ring.
- Reduced-motion preferences disable non-essential transitions and scrolling animation.

## Visual System

Use the Peps Anonymous brand source of truth:

- Navy `#1B3A7A` for primary actions and active structure.
- Brand blue `#2D6BCC` for interactive emphasis and selected rail state.
- Ink `#0F1F38`, body `#374151`, muted `#6B7280`, and subtle `#8A9AAA` for hierarchy.
- Canvas `#F8FAFC`, white editor surfaces, and border `#D0DAE4`.
- Green for confirmed/saved states, amber only for genuine warning context, and red for destructive controls.
- Inter typography with compact operational headings; no viewport-scaled type.
- Cards and framed controls use an 8px maximum radius.

The screen remains quiet and work-focused. It does not use decorative gradients, nested cards, oversized headings, or marketing-style composition.

## Test Strategy

Implementation follows test-driven development:

1. Add a focused source-contract test for the Atlas root, five rail sections, active-state semantics, live metric bindings, isolated stylesheet import, current API handlers, responsive rules, visible focus, and reduced motion.
2. Run the new test before implementation and confirm it fails because Atlas production markup and styles are absent.
3. Implement the minimum production structure and CSS needed to pass.
4. Run the focused test and the existing Organizer resource/API contract tests.
5. Run the Peps Anonymous TypeScript check and production build.
6. Exercise the live settings workflow in the browser: load, section switching, each save path, status mutation, copy feedback, card add/remove, archive/delete confirmation, and error/empty states where feasible.
7. Capture and inspect desktop, tablet, and 375px mobile screenshots. Check document overflow, focus visibility, control labels, touch sizes, and runtime console errors.

## Acceptance Criteria

1. Production GB Settings uses the Atlas Clear header, live metric strip, five-item rail, and focused editor.
2. All existing fields and actions remain available in their mapped sections.
3. Existing API calls, payload behavior, independent saves, and query invalidation remain intact.
4. No mock data or mock-only workflow appears in production.
5. The page has no horizontal document overflow at desktop, tablet, or mobile widths.
6. Labels, selected state, focus treatment, live feedback, reduced motion, and touch targets meet the stated accessibility requirements.
7. Atlas styling is scoped to the GB Settings root and does not modify unrelated Organizer pages.
8. Focused tests, existing related tests, TypeScript, and the production build pass.

# GB Settings Five-Mockup Gallery Design

## Purpose

Create a visual concept gallery for the GB Settings experience in GB Organiser v2. The gallery will let the team compare five substantially different, Peps Anonymous brand-safe treatments of the same settings workflow before choosing a production direction.

The gallery is a mockup-sandbox artifact. It does not replace or mutate the live API-backed `GbSettingsTab` during this design exercise.

## Approved Direction

The approved structure is **Control Navigator**:

- The existing GB Organiser v2 shell and navigation remain visible around the mockup.
- GB Settings has a persistent settings rail with focused editor content beside it.
- The rail exposes Identity, Lifecycle, Access & fee, Member cards, and Danger zone.
- A compact readiness/status context sits above the editor.
- The focused editor has a clear primary save action and section-specific helper copy.

The approved visual direction is **Focus Flow** (concept 5). The gallery keeps all five concepts available for comparison and opens with Focus Flow selected.

## Goals

- Show five genuinely different settings UI directions, not five colour-only variants.
- Keep the same GB Organiser v2 shell, data vocabulary, and settings capabilities in every concept so the comparison is meaningful.
- Make the selected Focus Flow direction feel calm, supportive, and understandable for occasional organisers.
- Give reviewers a fast way to switch concepts and inspect the same settings section in context.
- Preserve the Peps Anonymous design language: navy/blue foundations, restrained surfaces, readable hierarchy, and accessible state colours.
- Make the mockups responsive enough to evaluate desktop, tablet, and mobile composition.

## Non-goals

- No production API calls, database mutations, or changes to the live `GbSettingsTab` behaviour.
- No redesign of the GB Organiser v2 global shell, sidebar navigation, or topbar.
- No new GB Settings fields beyond the current API-backed model.
- No image assets, external product photography, or dependency added solely for the gallery.
- No decision to merge a concept into production; the gallery supports that later decision.

## Shared Mock Data and Capabilities

Every concept renders the same representative group buy:

- Name: `Winter Peptide Run 2025`
- Description: a private peptide order coordinated for verified members
- Currency: `GBP`
- Close date: `31 Jul · 18:00`
- Capacity: `42 / 60`
- Status: `Active`
- Join code: `WPR-25`
- Entry fee: `£5.00`
- Visibility: `Invite only`
- Member info cards: `Payment window` and `Shipping timeline`

The gallery uses a local mock state object containing the fields currently handled by `GbSettingsTab`: name, description, currency, close date, max members, status, join code, entry fee amount and label, invite-only state, and info cards.

The following interactions are demonstrated locally and do not leave the gallery:

- Switch the active concept.
- Move between settings rail sections.
- Edit representative text and numeric fields.
- Toggle invite-only visibility.
- Copy the join code and show copied feedback.
- Add or remove an info card.
- Show dirty, save, and saved feedback states.
- Trigger archive/delete affordances as visibly restricted mock actions without destructive side effects.

## Five Concepts

All concepts use the Control Navigator structure but make different visual and interaction choices.

### 1. Atlas Clear

The baseline all-rounder: a light Peps-native canvas, generous spacing, restrained status cards, and a quiet editor rail. It prioritises daily scanning and production readiness.

### 2. Blueprint Desk

A technical configuration desk with squared geometry, numbered modules, a subtle blueprint grid, monospace system labels, and explicit validation language. It prioritises precision and operator confidence for dense workflows.

### 3. Ledger Studio

A warm paper-toned record view using navy, teal-blue, and amber accents, editorial hierarchy, and audit-oriented copy. It prioritises trust, history, and a premium operational feel without leaving the Peps palette.

### 4. Signal Navy

A dark navy operations cockpit with high-contrast panels, telemetry summaries, active-state glow restraint, and clear system-health language. It prioritises frequent power users who need live status at a glance.

### 5. Focus Flow (selected default)

A supportive, spacious editor for occasional organisers. It adds an 82% readiness summary, completion states in the rail, plain-language section prompts, a recommendation chip, and a `Save & continue` action. It prioritises confidence and reducing cognitive load while retaining direct access to every section.

## Gallery Architecture

Add an isolated mockup group under the existing mockup-sandbox component catalogue, following its current component, group stylesheet, and source-contract test conventions.

The group contains:

1. A gallery container that owns the selected concept and shared mock state.
2. A shared miniature GB Organiser v2 shell used by all concepts.
3. Five dedicated concept renderer components that consume the same mock state and callbacks.
4. A concept switcher with names, short descriptions, and selected state.
5. A group stylesheet with concept-scoped tokens and responsive rules.
6. A source-contract test that verifies all five concept IDs, the selected Focus Flow default, required settings sections, labelled controls, and reduced-motion handling.

The gallery must use the sandbox's existing registration/discovery path rather than editing unrelated generated output by hand. Existing unresolved or user-owned work in the sandbox registry must remain untouched unless the implementation plan identifies a safe, minimal registration change.

## Focus Flow Reference Treatment

The selected reference view contains:

- A `SETUP HEALTH` eyebrow and `GB Settings` heading.
- Active status pill and explanatory subtitle.
- A readiness card with an 82% progress ring, completion message, and one recommendation chip.
- A vertical rail with numbered or checked steps for Identity, Lifecycle, Access & fee, Member cards, and Danger zone.
- A focused editor titled in plain language, with helper text explaining where values appear.
- Name, description, currency, close date, and member-limit controls.
- A footer that says changes affect the current section and offers `Save & continue`.

When the viewport is narrow, the rail becomes a compact step navigator above the editor; the save action remains reachable without horizontal scrolling.

## Responsive and Accessibility Requirements

### Desktop

- Preserve the GB Organiser shell context.
- Keep the settings rail and focused editor side by side.
- Keep the concept switcher readable without forcing the preview below the fold where practical.

### Tablet

- Reflow the rail/editor split to a wider stacked or two-column composition based on available width.
- Keep status context and primary save action visible.

### Mobile

- Stack the settings navigator above the focused editor.
- Keep all labels visible; do not rely on placeholder text alone.
- Make save, cancel, and restricted actions reachable with touch-sized targets.
- Prevent horizontal page overflow.

### Accessibility

- Concept choices use labelled buttons or equivalent controls with clear selected state.
- Settings sections use visible labels and semantic button/input elements.
- Keyboard focus is visible for concept switching, rail navigation, fields, toggles, and save actions.
- Status is conveyed with text and icon/shape as well as colour.
- Mock save/copy feedback uses a polite status region where appropriate.
- Respect `prefers-reduced-motion` by disabling transform and entrance animations.

## Verification Strategy

- Run the mockup-sandbox source-contract test and typecheck.
- Build the mockup sandbox to confirm the gallery is registered and bundles cleanly.
- Inspect the gallery at desktop and mobile widths in the local preview.
- Confirm switching among all five concepts retains the same mock data and settings sections.
- Confirm local edits, copy feedback, and save feedback do not call the production API.
- Confirm the live `artifacts/peps-anonymous/src/pages/organiser-v2/GbSettingsTab.tsx` remains unchanged by this gallery work.

## Acceptance Criteria

The mockup gallery is complete when:

1. Five selectable concepts are present and visibly distinct in layout treatment, typography, density, or interaction framing.
2. Focus Flow is selected by default and matches the approved reference treatment.
3. Every concept is shown inside the GB Organiser v2 shell with the same representative group-buy data.
4. Identity, Lifecycle, Access & fee, Member cards, and Danger zone are discoverable in each concept.
5. The gallery supports local mock editing, section switching, copy feedback, and save feedback.
6. The gallery is responsive and has no horizontal overflow at mobile widths.
7. Keyboard focus, labels, selected states, and reduced-motion behaviour are present.
8. Sandbox typecheck, test, and build pass.
9. The production GB Settings page and API behaviour are not changed.

## Completion Standard

The design phase is complete when this specification is reviewed and approved. Implementation then follows in the mockup sandbox using a detailed plan, with Focus Flow as the default and the other four concepts retained as comparison options.

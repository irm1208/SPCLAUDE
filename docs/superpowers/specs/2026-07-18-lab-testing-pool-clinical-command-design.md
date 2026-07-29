# Lab Testing Pool Clinical Command Design

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Surfaces:** Group Buy Organizer v2 Lab Testing Pool and member-facing GB Testing Pool  
**Selected direction:** Clinical Command

## Context

Peps Anonymous has two connected Lab Testing Pool surfaces:

- the Organizer v2 workspace tab, where an organizer configures contribution rules, product voting, workflow state, and linked evidence; and
- the member-facing group-buy testing page, where contributors monitor funding, vote, contribute, and view results.

The organizer tab currently presents its live data as a sequence of generic cards and form fields. The member page has the correct workflows but does not yet give the funding gauge, thresholds, vote state, and evidence hierarchy the visual prominence required by the supplied redesign brief.

The redesign must preserve the existing API contracts and all current actions. It must also leave a permanent five-direction mockup gallery in the mockup sandbox so the alternative concepts remain available for comparison.

## Goals

- Create five legitimate, paired mockup directions, each showing an Organizer v2 screen and its matching member screen.
- Preserve the five concepts in one interactive sandbox gallery with concept and surface switching.
- Implement Clinical Command in both production surfaces.
- Make the member funding gauge the primary visual anchor, with threshold markers and monetary labels on the arc.
- Give organizers immediate visibility into funding, contributors, pending reviews, voting participation, and round status.
- Keep the two production pages visually consistent through shared presentational components without coupling their data or mutation logic.
- Preserve responsive behavior, accessibility, reduced-motion support, loading/error states, and existing workflows.

## Non-goals

- No API, database, schema, authentication, or route changes.
- No redesign of unrelated Organizer v2 tabs or member portal pages.
- No replacement of React Query or existing page-owned fetch and mutation logic.
- No new global state store.
- No production implementation of the four unselected concepts.
- No manual editing or conflict resolution of unrelated user-owned files.

## Approved Concepts

The permanent gallery contains five paired directions using the same representative round data:

1. **Clinical Command** — selected for production. Calm Peps Native operations workspace, prominent funding health, and gauge-first member hierarchy.
2. **Evidence Ledger** — lab-record and audit-led treatment emphasizing contribution traceability.
3. **Round Timeline** — lifecycle-led treatment organized around setup, funding and voting, lab dispatch, and results.
4. **Funding Cockpit** — dark, dense live telemetry for experienced operators.
5. **Community Ballot** — warmer participation-led treatment emphasizing collective voting momentum.

The gallery exposes a concept switcher and an Organizer v2 / Member view switcher. Its controls use representative local state only and never call production APIs.

## Architecture

### Shared presentation layer

Add focused presentational components under `artifacts/peps-anonymous/src/components/testing-pool/` with the following fixed responsibilities and files:

- `ClinicalPoolGauge.tsx` — renders animated funding progress, live total, contributor count, status, threshold markers, tick marks, and outward amount/test labels.
- `ClinicalTestingPoolUi.tsx` — exports the metric strip, round status rail, threshold step grid, vote leaderboard, and clinical panel primitives.
- `clinical-testing-pool.css` — scopes shared layout, responsive, focus, and reduced-motion rules.
- `ClinicalTestingPoolUi.test.tsx` — covers shared display contracts and accessible text.

These components receive immutable display props and callbacks. They do not fetch, cache, persist, or mutate data.

### Organizer adapter

`TestingGroupsTab.tsx` remains the owner of:

- `organiserApi.testingPool()` querying and refetching;
- contribution amount, contribution mode, workflow status, funding note, and selected-product drafts;
- create/update submission and error state; and
- all organizer-only navigation and save actions already exposed by the existing page.

The page maps its live response and form draft into the shared components. For the funding total, contributor count, vote totals, and leaderboard, the adapter composes the existing read-only `GET /api/group-buys/:gbId/testing` snapshot with the organizer configuration response; this is an existing endpoint and does not require a backend change. The redesigned composition adds a round-health metric strip and a two-column clinical workspace while retaining the current save behavior and unconfigured-pool path. The organizer view shows pending/confirmed/rejected contribution counts; it does not invent individual verification controls because the organizer endpoint exposes counts rather than review records.

### Member adapter

`GbTestingPool.tsx` remains the owner of:

- round loading and auto-refresh;
- eligibility, opt-in, payment, existing-vote, and admin-preview state;
- vote submission and late contribution workflows;
- milestone and cost calculations;
- results, vial-cost, public-vote, and evidence sections; and
- all current conditional rendering based on round status.

The page maps its existing state into the shared gauge, threshold, rail, and leaderboard components. No member action changes its endpoint or payload.

### Mockup gallery

Add one component beneath `artifacts/mockup-sandbox/src/components/mockups/` with its own scoped stylesheet. The sandbox plugin discovers the component automatically.

The generated registry at `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` is plugin-owned and currently has an unrelated unresolved worktree conflict. Implementation must not hand-edit that file. A sandbox start or build may regenerate it only when doing so no longer destroys user-owned conflict state; otherwise, gallery verification is limited to the component-level typecheck until the conflict is resolved.

## Clinical Command: Organizer v2

### Header and round health

- Retain the existing Organizer v2 shell, sidebar, top bar, breadcrumb, global search, and page container.
- Use the shared workspace page header rather than duplicating navigation chrome.
- Add a compact live-round treatment with refresh and save actions.
- Present four primary metrics: verified funding versus target, contributors and pending reviews, votes and participation percentage, and workflow status.

### Primary workspace

Desktop uses a two-column layout:

- **Left:** round-health progress, threshold steps, products included in the ballot, and linked evidence.
- **Right:** round controls, ballot standing, contribution status counts, and the primary save action.

The progress treatment may use a compact organizer ring, but the member gauge remains the larger hero. Organizer controls continue using native form elements and current validation semantics.

### Organizer states

- Loading shows the current live-sync indicator.
- Query failure shows the current readable error and retry action.
- An unconfigured pool shows a deliberate setup state with contribution and ballot configuration, not empty metrics.
- Save failures remain visible near the controls and do not discard the draft.
- Empty products explain that products must be configured before voting.
- Empty linked reports explain where approved or pending evidence will appear.

## Clinical Command: Member View

### Lab-report header

- Present the group-buy name, testing-round identifier, live status, and short funding note in a restrained clinical header.
- Keep the current member shell and navigation behavior.
- Add a readable lifecycle rail for Pool opened, Fund and vote, Sent to lab, and Results published.

### Gauge hero

- Increase the gauge substantially so it is the dominant element above the fold.
- Use a responsive SVG with the pool total, contributor count, and text status inside the circle.
- Render threshold marker dots and ticks on the arc.
- Place target amount and test labels outside the arc with leader lines so labels remain readable.
- Animate the fill on mount with restrained easing.
- When the round is active, render a subtle pulsing endpoint dot.
- When reduced motion is requested, show the final state immediately and disable the pulse.

### Thresholds, vote, and leaderboard

- Render thresholds as numbered Step 01, Step 02, and subsequent cards.
- Each card shows the test or vial reward, cumulative target, remaining amount where relevant, and locked/unlocked text state.
- Keep the existing vote form steps, test-selection limits, anonymity option, validation, and submission payload.
- Render leaderboard rows with rank numbers, product and optional batch, animated progress, count, and percentage.
- Preserve the existing-vote card and late-opt-in contribution states.

### Results and cost evidence

- Preserve community winner, funded tests, vial-cost breakdown, public vote list, result notes, report links, and all current conditional sections.
- Restyle these sections as clinical evidence panels without hiding or collapsing required information.
- Result and verification states always include text and do not rely on color alone.

## Responsive Behavior

### Desktop

- Organizer: four metric cards followed by a two-column operational workspace.
- Member: gauge and threshold breakdown on the left, vote and leaderboard on the right.

### Tablet

- The member gauge fills the width of its card.
- Threshold cards flow below the gauge, side by side when space permits.
- Organizer panels use a two-column card flow where labels and controls remain readable.

### Mobile

- Content stacks in task order: status, gauge, threshold steps, primary vote/contribution action, leaderboard, then evidence and results.
- Primary actions never require horizontal scrolling.
- Dense registers become stacked records or an explicitly labeled secondary horizontal scroller; essential actions stay visible.
- SVG labels stay within the responsive view box and do not clip at narrow widths.

## Visual System

- Use Peps Anonymous navy `#1B3A7A`, brand blue `#2D6BCC`, deep navy `#1B3164`, page canvas `#F8FAFC`, and white cards.
- Use amber `#E9A020` for attention and locked-next-step emphasis, green for verified/unlocked states, and red for destructive or failed states.
- Use the product's Inter typography and compact uppercase section labels.
- Use monospace numerals only for funding totals, references, percentages, and other data readouts.
- Use precise blue-grey borders, restrained shadows, and generous white space rather than decorative gradients throughout the content area.

## Data and Interaction Flow

1. Each page loads its data through its existing boundary.
2. The page derives display-ready totals, percentages, threshold status, labels, and stage status.
3. Shared components render those props and emit semantic callbacks.
4. The page executes its existing mutation or navigation behavior.
5. Existing query invalidation, refetching, auto-refresh, and user feedback update the shared presentation.

No shared component reads route params, performs a fetch, writes storage, or owns mutation state.

## Accessibility and Motion

- All icon-only actions keep accessible names.
- Progress exposes a textual value and goal in addition to the SVG.
- Threshold and workflow state include text labels.
- Keyboard focus remains visible on light and dark surfaces.
- Native form controls retain labels and disabled semantics.
- Vote selection remains operable without a pointer.
- Color combinations meet usable contrast targets.
- `prefers-reduced-motion` disables gauge draw, endpoint pulse, staggered entrance, and non-essential bar animation.

## Error Handling

- Loading, error, empty, unauthorized, and unconfigured states remain explicit.
- A refetch failure does not erase the last successfully rendered pool.
- A save or vote failure leaves user input intact and surfaces a local error.
- Invalid or missing thresholds render a safe zero-progress state without invalid SVG geometry.
- Missing optional batch, report, payment, or result fields omit only their dependent label or action.

## Verification

### Automated

- Add focused component tests for gauge geometry, accessible progress text, threshold locking, and leaderboard percentages.
- Add Organizer v2 render/contract tests for configured, unconfigured, loading, and error states.
- Preserve or extend member-page tests for active, closed, sent-to-lab, results, existing-vote, late-opt-in, and admin-preview states.
- Add a responsive CSS contract covering the desktop two-column layout, tablet threshold flow, mobile stacking, and reduced motion.
- Typecheck the Peps Anonymous artifact.
- Run its focused test suite and production build.
- Typecheck the mockup gallery without modifying the conflicted generated registry.

### Visual and interaction checks

- Inspect Organizer v2 and member surfaces at desktop, tablet, and mobile widths.
- Confirm gauge labels do not overlap or clip at supported widths.
- Confirm save, refresh, voting, test selection, late contribution, result links, and pending review status remain visible.
- Confirm the gallery switches among all five concepts and both surfaces.
- Confirm reduced motion removes persistent animation.

## Acceptance Criteria

- Five permanent paired mockup concepts are available in one sandbox gallery.
- Clinical Command is implemented in both production surfaces.
- The member gauge is materially larger, animated, responsive, and labeled directly at its thresholds.
- Organizer round health, settings, products, ballot standing, contribution status, and evidence are legible in one coherent workspace.
- Threshold cards and leaderboard match the approved Clinical Command hierarchy.
- Existing production API calls, payloads, state transitions, and user workflows are preserved.
- Desktop, tablet, and mobile layouts are usable without clipped primary content.
- Accessibility and reduced-motion requirements are met.
- No unrelated worktree changes or generated-file conflict markers are rewritten by hand.

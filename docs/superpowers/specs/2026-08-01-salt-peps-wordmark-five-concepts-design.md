# Salt&Peps Wordmark Five Concepts

**Status:** Gallery implemented for visual review
**Date:** 2026-08-01

## Objective

Create an isolated comparison gallery for five materially different `Salt&Peps` wordmark treatments. The gallery is decision material only: it must not replace the production logo or create a favicon until one direction is selected and refined.

## Shared constraints

- The visible name remains exact title case: `Salt&Peps`.
- The gallery uses the existing Peps Anonymous palette: Ink `#0F1F38`, Navy `#1B3A7A`, Brand Blue `#2D6BCC`, and Deep Navy `#1B3164`.
- No molecule, DNA, flask, salt, pepper, or other literal science symbol is introduced.
- Each concept is shown in primary, reverse, and mono proof contexts.
- The production handoff remains outlined SVG paths with no runtime font dependency, gradient, shadow, transparency, or raster source.
- The current production logo remains untouched while the gallery is under review.

## Concepts

1. **Precision Grotesk**: compact geometric sans, tight optical spacing, and a restrained blue ampersand. This is the closest continuation of the approved baseline.
2. **Soft Clinical**: humanist sans with rounded terminals and a gentler ampersand. It keeps authority while making the category more approachable.
3. **Editorial Split**: italic serif `Salt` paired with a clean sans `Peps`. It signals authored, premium, independent healthcare publishing.
4. **Lab Index**: measured mono construction with technical spacing. It is suited to protocols, labels, batch sheets, and research-facing touchpoints.
5. **Signal Link**: a custom display treatment where the ampersand acts as the visual hinge and a single baseline rule connects the word halves.

## Gallery behavior

The preview entry point is `SaltPepsWordmarkConcepts`. It owns the selected concept and proof mode, exposes all five directions through labelled tabs, and keeps a compact context check below the main proof. Selecting a concept updates the hero wordmark, all three proof cards, and the application strip without a route change. Copying the specimen provides a small convenience action without changing production assets.

## Responsive and accessibility requirements

- The desktop layout uses a persistent concept rail and proof stage.
- At widths below 760px, the concept rail becomes horizontally scrollable, the proof modes remain labelled, and proof cards stack vertically.
- Concept and proof controls expose `role="tab"`, `aria-selected`, and `aria-pressed` state.
- Wordmark previews expose an accessible image label.
- Focus-visible outlines remain visible and all transitions collapse under `prefers-reduced-motion: reduce`.

## Verification

- Run the focused source contract with Node's built-in test runner.
- Run the mockup sandbox Vite build with `MOCKUP_PORT` and `MOCKUP_BASE_PATH` set.
- Load the component through Vite SSR to catch route/import errors.
- Review the gallery at the supplied development URL on desktop and mobile widths before selecting a production direction.

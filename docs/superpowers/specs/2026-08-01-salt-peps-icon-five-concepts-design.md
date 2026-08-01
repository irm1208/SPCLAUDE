# Salt&Peps Favicon And Icon Five Concepts

**Status:** Approved for gallery implementation
**Date:** 2026-08-01

## Objective

Create an isolated, interactive comparison gallery for five small-size Salt&Peps icon directions. The gallery is decision material; it does not replace the current production favicon, `SaltPepsMark`, or brand assets until one concept is selected and refined.

## Shared constraints

- Every concept uses the existing 64-unit SVG viewBox and remains legible at 16px, 24px, 32px, 48px, and 64px.
- Primary surfaces use Ink `#0F1F38`, Navy `#1B3A7A`, Brand Blue `#2D6BCC`, and Deep Navy `#1B3164`.
- Reverse and mono proofs must survive without gradients, shadows, transparency, external fonts, or raster data.
- Concepts derive from the approved `Salt&Peps` wordmark; no generic plus sign or unrelated science icon is introduced.
- Production files under `artifacts/peps-anonymous/public/brand/` remain unchanged during comparison.

## Concepts

1. **S&P Interlock**: custom S and P letterforms joined by the ampersand's crossbar; the clearest monogram fallback at 16px.
2. **Peptide Loop**: one simplified folded backbone and two enlarged nodes; it keeps the existing peptide reference while removing small-size detail.
3. **Bond Aperture**: an ampersand-led counterform with S and P implied through negative space; distinctive without a container.
4. **Signal Tile**: a contained white monogram on Deep Navy with one blue signal node; optimized for browser chrome, app tiles, and social avatars.
5. **Orbit Pair**: two balanced letterforms around a central connector; an open silhouette for larger icon and social use.

## Gallery behavior

`SaltPepsIconConcepts` owns concept and proof-mode selection. Each selection updates the hero mark, proof cards, size ladder, and application examples. Proof modes are Primary, Reverse, and Mono; the Signal Tile concept retains its contained tile treatment in each mode.

## Responsive and accessibility requirements

- Desktop uses a concept rail beside the proof stage.
- Below 760px the rail becomes horizontally scrollable and proof cards stack without horizontal page overflow.
- Concept and proof controls expose labelled tab state and keyboard focus.
- Every SVG mark has an accessible image label; decorative repetitions are hidden from assistive technology.
- Transitions collapse under `prefers-reduced-motion: reduce`.

## Verification

- Run the focused Node source contract.
- Load the component through Vite SSR.
- Build the mockup sandbox with explicit `MOCKUP_PORT` and `MOCKUP_BASE_PATH`.
- Verify the development route responds at the supplied local URL.

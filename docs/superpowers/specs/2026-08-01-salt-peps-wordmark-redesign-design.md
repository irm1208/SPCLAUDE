# Salt&Peps Wordmark Redesign

**Status:** Direction approved; written-spec review pending  
**Date:** 2026-08-01

## Decision

The primary wordmark will use the exact title case `Salt&Peps`. The approved starting point is the path-based primary wordmark shown in the visual companion: a heavy geometric sans construction with a restrained Brand Blue ampersand and no separate icon.

The wordmark is the first identity decision. The favicon and any standalone mark will be designed only after the wordmark has been refined and approved.

## Goals

- Make `Salt&Peps` feel authored, professional, and readable at a glance.
- Keep the identity typography-led rather than forcing a peptide, molecule, DNA, flask, salt, or pepper symbol.
- Preserve the existing Peps Anonymous palette:
  - Ink: `#0F1F38`
  - Navy: `#1B3A7A`
  - Brand Blue: `#2D6BCC`
  - Deep Navy: `#1B3164`
  - Reverse: `#FFFFFF`
- Produce a real outlined-vector wordmark that does not depend on a web font at runtime.
- Support light, reverse, and one-color reproduction before any favicon work begins.

## Wordmark construction

The approved baseline uses the visual weight of the Frank reference, the controlled softness of the Pivotal reference, and the engineered curve discipline of the Yango reference. These are construction cues, not assets to copy.

The refined wordmark will:

- Use `Salt&Peps` with no spaces.
- Keep a compact, heavy sans register with rounded joins where they improve the title-case rhythm.
- Treat the ampersand as a letter in the same optical system, with Brand Blue as the only color accent in the primary version.
- Refine the `S`, `a`, `t`, ampersand, `P`, and lowercase terminals optically rather than applying a decorative slash, badge, or pseudo-icon.
- Tune spacing at the four sensitive joins: `lt`, `t&`, `&P`, and `ps`.
- Use filled SVG paths in production. No live text, external font URL, gradient, shadow, transparency, or raster data may be required.

## Asset scope

### First pass: wordmark only

- `salt-peps-logo.svg`: primary horizontal lockup using the refined `Salt&Peps` paths and the existing logo viewBox contract.
- `salt-peps-logo-reverse.svg`: white reverse version with identical geometry.
- `salt-peps-logo-mono.svg`: one-color version with identical geometry.
- `salt-peps-logo-proof.svg`: light, reverse, mono, and size proof contexts.
- Transparent PNG fallback generated from the approved SVG where the existing app contract requires it.

### Deferred pass: `S&P` small-size fallback

The standalone icon and favicon will use a compact custom `S&P` monogram derived from the approved `Salt&Peps` lettering. The ampersand remains a real connector between the two initials; it is not replaced by a generic plus sign or badge.

The monogram will be delivered in two optical grades:

1. Full `S&P` monogram for 24px and larger standalone use, social avatars, and square applications.
2. Simplified `S&P` monogram for 16px favicon use, with only the essential counters and joins retained.

Both grades must survive reverse and one-color tests. No peptide-bond illustration or generic science icon will be introduced merely to fill the favicon slot.

## Application requirements

The refined wordmark must be checked in these contexts before production replacement:

- Light surface on `#F8FAFC`.
- Reverse on `#1B3164`.
- One-color ink on white.
- Digital minimum width of 120px.
- Large-format horizontal use.
- Single-color print, foil, and embroidery suitability at a simplified wordmark scale.

The wordmark must retain the same geometry across primary, reverse, and mono assets. Only color changes between those variants.

## Verification

- Validate SVG/XML structure and viewBox contracts with the existing logo verification scripts.
- Confirm no embedded fonts, external URLs, gradients, filters, transparency, or raster images exist in master SVGs.
- Render light, reverse, and mono proofs and inspect at desktop and mobile widths.
- Run the application logo integration checks and typecheck after production assets are approved.
- Do not change application integration, navigation, copy, or favicon references until the wordmark has passed visual review.

## Out of scope

- Generating a new icon before the wordmark is approved.
- Reintroducing the previous peptide-backbone icon without a separate design review.
- Replacing the established Peps Anonymous palette.
- Using AI raster output as the production logo source.
- Changing unrelated database or application files.

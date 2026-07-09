---
name: Host chrome overlaid on a fixed-position full-viewport iframe app collides with the embedded app's own UI
description: Wrapping a standalone app (that uses position:fixed corner-anchored toolbars) in an iframe and adding your own overlay buttons/back-links on top of that iframe will visually collide with the embedded app's own fixed UI at some breakpoint.
---

## Symptom
A host page overlays its own UI (e.g. a floating "Back" button, `position:absolute`, top-right, high z-index) directly on top of an iframe showing a standalone third-party app. The embedded app also anchors its own toolbar/buttons to a screen corner via `position:fixed`. The two visually overlap/collide (e.g. "the peptide boxes are overlaid on how it works"), even though they live in separate documents (iframe CSS doesn't leak) — the collision is purely geometric (both compute their position against the same on-screen viewport rectangle).

**Why:** discovered embedding a standalone three.js peptide-explorer tool full-viewport via iframe with a floating "Learning Hub" back button at `top/right:14px` — the embedded app's own `#hud` toolbar (containing its "How it works" button) sits at `top:20px;right:24px`, directly under the host's button.

## How to apply
1. Never overlay host UI directly on top of a full-viewport iframe that hosts a third-party app you don't control the layout of — you cannot know every breakpoint's corner anchoring in advance, and it can change silently on the next asset update.
2. Instead, give the host UI (back button, breadcrumbs, etc.) its own dedicated space **outside** the iframe's box — e.g. a slim flex-column header bar above the iframe, with the iframe sized to the remaining height (`flex:1 1 auto; min-height:0` wrapper). This guarantees zero collision regardless of what the embedded app does internally, at the cost of a slightly smaller iframe viewport.
3. Separately, when the embedded app itself has content-driven panels with no height cap (a `position:fixed` panel with no `max-height`/`overflow`), it can grow into and overlap other fixed-position siblings anchored to a further-down corner (e.g. a "structure" info box growing tall enough to cover a "legend" box pinned to the bottom). If you only have the built/minified CSS (no source), patch the base rule directly: add `max-height: calc(100vh - <reserved bottom space>px)` + `display:flex;flex-direction:column` on the outer panel, and `overflow-y:auto;min-height:0` on its scrollable inner body — don't rely on existing mobile-only media queries, since the bug is usually present at the *unconstrained* base/desktop breakpoint too.

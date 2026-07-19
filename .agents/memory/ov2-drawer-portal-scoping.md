---
name: Organiser V2 drawer portal CSS scoping
description: The organiser V2 mobile drawer is a portalled shadcn Sheet; descendant-scoped .organiser-v2 .ov2-sidebar-drawer selectors never match it.
---

# Organiser V2 drawer portal CSS scoping

The rule: the mobile nav drawer in OrganiserShell is a shadcn Sheet whose SheetContent carries `organiser-v2 ov2-sidebar-drawer` on the SAME element and is portalled to document.body. Any rule written `.organiser-v2 .ov2-sidebar-drawer …` (descendant combinator) is dead code for it — style the drawer with the compound selector `.organiser-v2.ov2-sidebar-drawer …`.

**Why:** three theme files (organiser-v2.css, peps-native.css, approved-workspace.css) each carried descendant-scoped drawer rules that silently never applied — the drawer had no width cap, step blurbs hard-clipped past the edge, and a no-op collapse button stayed visible. Diagnosed from a user phone screenshot; the visible collapse button (which a "hidden in drawer" rule should have removed) proved the selectors weren't matching.

**How to apply:** rules for descendants of the drawer (e.g. `.organiser-v2 .ov2-setup-link small`) still work, because SheetContent itself is the `.organiser-v2` ancestor. Only rules that need to match the drawer element itself (width, overflow, its direct-child radix close button) need the compound form. Legacy `.ov2-mobile-layer` drawer rules (with `transform: translateX(-102%)`) target dead custom-drawer markup — never port that transform to the Sheet drawer; radix data-state classes animate it. Stale theme drawer widths (268/270px) remain as dead rules; the live width is min(86vw, 292px) at the end of organiser-v2.css.

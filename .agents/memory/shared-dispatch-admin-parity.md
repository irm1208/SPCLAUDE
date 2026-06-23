---
name: Shared dispatch admin parity
description: Why every UI change in AdminDispatch.tsx must be role-gated to preserve admin parity.
---

The dispatch UI (`artifacts/peps-anonymous/src/components/AdminDispatch.tsx`, rendered via `DispatchManager`/`DispatchManagerInner`) is shared by three roles: admin, reshipper, organiser. They are distinguished at runtime by `cfg.role` from `useDispatchCfg()`.

Rule: any UI addition or removal must be gated by `cfg.role` so the admin surface stays visually/behaviourally unchanged.

**Why:** Admin dispatch was the original, trusted surface; the reshipper/organiser tabs were added as scope-locked mirrors. Repeated user requests target only the newcomer (reshipper/organiser) experience — e.g. hide Half Kits and Shipped Items sub-tabs, add a getting-started banner and per-step "i" info popovers. Leaking those into admin is treated as a regression in code review.

**How to apply:**
- Sub-tab list in DispatchManagerInner: conditionally spread admin-only tabs with `...(cfg.role === "admin" ? [[...]] as const : [])`.
- Newcomer-only help (onboarding banner, Section `help` info icons): gate with a `showHelp = cfg.role !== "admin"` flag; pass `help={showHelp ? (...) : undefined}`.
- Info icons use a tap-friendly Popover (`InfoTip`), not hover Tooltip, because the site is mobile-first.

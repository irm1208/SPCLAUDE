---
name: PageLayout Portal-nav vs DashboardShell chrome
description: Why /order and /review already show Hub/Orders/Group Buys sidebar items even for guests, and what actually distinguishes "dashboard chrome" from "guest chrome" on these pages.
---

`PageLayout.tsx`'s `Sidebar` has an internal `isPortal` flag (true for `/account*`, `/gborganiser*`, `/reshipper*`, `/wholesale*`, and `isGbWorkflow` = `/order` or `/review`) that swaps in a "Profile Hub" style nav (Overview: Hub/Orders/Group Buys/GB Testing, Roles, Health, Research, Support groups) for **both guests and logged-in users** on those routes. So the presence of "Orders"/"Group Buys" labels in the sidebar is NOT a signal of being logged in or of using `DashboardShell` — that nav renders identically pre-login.

The real distinguishing signal of the richer `DashboardShell` chrome (used by `OrderForm.tsx`'s local `OrderFormShell` wrapper, and now `Review.tsx`'s `ReviewShell`) is the **top header row**: a search input (placeholder "Search…" with a ⌘K hint), a notifications bell icon, and a profile/avatar area showing username + credits — none of which exist in plain `PageLayout`, which only shows a "Login / Sign Up" pill (guest) or a simple profile pill in the sidebar bottom (logged-in, no search/bell/credits row).

**Why:** wasted an e2e test iteration asserting guest vs dashboard chrome by checking for sidebar nav item text (Hub/Orders/Group Buys), which is present in both and gave a false failure.

**How to apply:** when adding/verifying `DashboardShell` chrome on a page (matching the `OrderForm.tsx` `useDashChrome`/`Chrome` pattern), test for the DashboardShell-specific header elements (search bar, bell, profile+credits), not sidebar nav labels — those are shared with guest `PageLayout` on portal-workflow routes.

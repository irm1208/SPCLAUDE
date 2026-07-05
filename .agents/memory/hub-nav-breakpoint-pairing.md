---
name: Hub nav / sidebar breakpoint pairing
description: Bottom nav hide-breakpoint must match the paired layout's sidebar show-breakpoint, or tablet loses all navigation.
---

The rule: whichever layout hosts HubBottomNav, the nav's hide breakpoint must equal the breakpoint where that layout's sidebar appears.

- PageLayout sidebar shows at `md` (`hidden md:flex`) → HubBottomNav default `hideAt="md"` is correct there.
- DashboardShell sidebar shows at `lg` (`hidden lg:flex`) → its HubBottomNav render must pass `hideAt="lg"`, otherwise 768–1023px has NO navigation at all.

**Why:** The two layouts use different sidebar breakpoints; a one-size `md:hidden` on the bottom nav left DashboardShell views nav-less on tablets (found July 2026). DashboardHome content padding (`pb-24 lg:pb-8`) already assumed the bar was visible until `lg`.

**How to apply:** `hideAt` switches three gated classNames (backdrop, drawer, bottom bar) AND the body-scroll-lock matchMedia breakpoint (768 vs 1024) — they must move in lockstep (see mobile-drawer-body-lock.md). Use static class strings so Tailwind JIT emits both variants. When adding a new shell/layout that renders HubBottomNav, match `hideAt` to the sidebar's show breakpoint and give content matching bottom padding.

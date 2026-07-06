---
name: DashboardShell bottom bars
description: How to pin bottom bars (order total bars) on pages wrapped in DashboardShell
---

Pages wrapped in DashboardShell (e.g. wholesale pages via WholesaleShell) must NOT use `position: fixed` with a hardcoded left offset for bottom bars.

**Why:** The shell's sidebar collapse state (56px vs 250px) is internal component state — a fixed bar can't track it, and a hardcoded `lg:left-[...]` breaks when the user collapses/expands the sidebar. This bit the first wholesale-shell attempt.

**How to apply:** Make the bar `sticky` as the LAST child of the page content (outside any framer-motion transform wrapper):
- `sticky lg:bottom-0` — the shell's lg scroll container (`lg:h-screen lg:overflow-y-auto` main column with margin-left offset) pins it flush and it tracks collapse automatically.
- On mobile add clearance for the HubBottomNav floating pill (56px tall, 6px + safe-area above bottom): `bottom-[calc(70px_+_env(safe-area-inset-bottom))]`.
- Ensure no ancestor between the bar and the scroll container has `overflow` set (that would re-scope the sticky) and no transform wrapper around it.

Also: standalone pages reuse the portal chrome by wrapping DashboardShell with `onSection={(s) => navigate(s === "home" ? "/account" : "/account?s=" + s)}`, a cast minimal PortalNavProps for mobile pill nav, and empty orders/compounds/groupBuys arrays (search still works — products/lab tests fetch inside the shell). Workspace sidebar items take an `active` flag keyed off `activeSection` ("wholesale"/"shared-orders" etc.) — a no-op on /account since portal Section ids never match workspace ids. Remember to pass `onLogout` (useLogout) or the profile menu loses Sign out.

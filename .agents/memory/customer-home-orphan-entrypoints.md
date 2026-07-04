---
name: Customer home dashboard sole-entry-point features
description: Conditional widgets on the customer portal home that are the ONLY navigation into certain flows — must survive any home redesign.
---

The customer portal home (rendered by `DashboardHome.tsx`, wired from `CustomerPortal.tsx` home section) hosts several conditional entry points that are the **only** way a customer reaches those flows. Any redesign/refactor of the home MUST carry them over or the flows become orphaned (reachable only by typing a URL).

- **Special Access viewer grants** (`viewerAccessList` from `useViewerAccess`): per-grant buttons to `/qr-viewer/:id` (QR access) and `/leg-view/:id` (leg/shipping view). These routes have no other portal link — dropping the widget strands them. Gate on `hasQrAccess` / `hasLegAccess` per entry.
- **Store credits** (`account.credits`): show only when `typeof credits === "number"`. Mobile-first product — keep it visible on small screens, not `hidden sm:` only.
- **Organiser GB Metrics + "Go to Organiser"** → `/gborganiser`: gated on `account.organiserStatus === "approved"`. Counts from `organiserGbs`: active=`status==="active"`, draft=`status==="draft"`, total=`status!=="archived"`.

**Why:** A prior home redesign silently dropped all three; the Special Access one was flagged SEVERE because those viewer routes are otherwise unreachable from the UI.

**How to apply:** Before replacing the home block, diff the old JSX for conditional/role-gated widgets and confirm each has an equivalent in the new component. Navigate real routes via wouter `navigate()`; use `onSection` only for in-portal section switches.

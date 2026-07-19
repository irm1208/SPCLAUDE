# Agent task: approved Command Overview

Work only in `/home/amoney/UpdateSP`. Use TDD. Do not commit. Preserve all
unrelated dirty/untracked files.

This is Task 4 of the approved five-picture GB Organiser production system.
The shared shell has already been implemented and must remain intact.

Approved picture reference:
`/home/amoney/.config/superpowers/worktrees/UpdateSP/gb-organiser-dashboard-mockups/output/gb-organiser-redesign-pictures/01-command-overview.svg`

Modify only:

- `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`
- create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-overview.css`
- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` only to import the new
  CSS immediately after `approved-workspace.css`.
- the focused approved contract test only where needed to add meaningful
  Overview-specific structural assertions before implementation.

Visual hierarchy to implement:

1. Root JSX element uses `approved-command-overview`.
2. Compact greeting header: “Good morning, Organiser” plus a useful one-line
   summary derived around the active `gb.name` (no static mock member/order
   records).
3. One full-width navy-to-blue active-group-buy hero with name, product/category
   summary, open/close/member/value metadata, and a right-hand order target
   progress treatment. Derive numbers from `gb` and repository orders.
4. One connected four-metric ribbon: orders received, payment collected,
   ready to dispatch, needs attention. It should read as a single horizontal
   operational strip, not four floating icon cards. Do not put decorative icons
   above metrics.
5. Lower two-column composition: large “Order momentum” chart on the left and
   narrow “Action queue” on the right. At <=1023px stack cleanly.
6. Use `buildOrderTrend(storedOrders)` and Recharts `ResponsiveContainer`,
   `AreaChart`, accessible axes, visible legend, two series (received and
   verified), tooltip, and an adjacent textual summary for accessibility.
7. Action rows must still navigate with existing `onGoto` to `orders`,
   `dispatch`, and `labtests`; preserve `selectedGbId` use and live-region
   semantics where useful.
8. Match the approved system precisely: 27px dark navy titles, 14px body, compact
   12–13px labels, shallow `#D0DAE4` borders, restrained shadow, Peps
   `#1B3A7A`/`#2D6BCC`, green/amber/red only for semantic status.
9. Scope CSS beneath `.organiser-v2 .approved-command-overview`; include <=1023
   and <=767 responsive layouts, visible focus, no page overflow, and reduced
   motion. Do not edit legacy CSS layers.

Behaviour constraints:

- Keep `useOrders`, repository data, `buildOverviewSnapshot` if still useful,
  existing props, money formatting, and all navigation behaviour.
- No hard-coded mock orders, members, totals, or dates from the picture.
- Avoid extra dashboard boards/widgets not in the approved picture.
- Recharts is already installed; do not add dependencies.

TDD and verification:

1. Add a focused structural contract that fails for the missing root/layout,
   chart selector use, Recharts, and scoped stylesheet import; observe RED.
2. Implement minimally and make those assertions GREEN.
3. Run `pnpm test:overview`, `pnpm test:domain`, and
   `pnpm test:approved-workspace` from `artifacts/peps-anonymous`.
4. Run a targeted strict TypeScript check if practical and `git diff --check`.
5. Self-review against the SVG and report DONE/DONE_WITH_CONCERNS with exact
   results. Do not alter the other four tabs.

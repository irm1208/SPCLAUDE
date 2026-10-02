# Group-buy organiser order tip display

## Goal

Make tips visible in the organiser’s existing per-order breakdown, without adding a separate tips screen or changing order totals.

## Behavior

- Show a `Tip` row and the order’s existing tip amount when `tip > 0`.
- Place it in the breakdown immediately before `Total`.
- Use the group buy’s existing currency formatting.
- Do not render a tip row for zero or absent tips.
- Do not add new tipper wording; the order card already identifies the customer.

## Data and access

Use the existing `tip` amount and order data returned by `GET /api/organiser/group-buys/:id/orders`. The endpoint already scopes results to the authenticated organiser’s own group buy. No database, API, or role-access changes are needed.

## Verification

Add focused coverage for showing a positive tip, omitting a zero tip, and keeping the existing total unchanged. Build the Peps Anonymous frontend and visually verify the order breakdown.

## Out of scope

No separate tips summary/list, no new attribution field, no order-total or payment changes, and no changes to Admin or customer order views.
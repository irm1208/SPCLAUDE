# Group-buy Cancelled/Refunded order filter

## Goal

Add one combined **Cancelled/Refunded** filter to:

- The Admin group-buy Orders tab.
- The group-buy organiser Orders view, including its desktop pills and mobile status dropdown.

## Filtering rule

An order matches when either:

- its order status is `Cancelled` (case-insensitive), or
- its payment status is `refunded` (case-insensitive).

The filter is additive only: existing filters and their behavior remain unchanged. Search, country, payment-method, date, and other advanced filters continue to combine with the selected status filter.

## Presentation

- Admin: add a **Cancelled/Refunded** status chip with a count, following the existing payment-status chip pattern.
- Organiser desktop: add a **Cancelled/Refunded** status pill.
- Organiser mobile: add a **Cancelled/Refunded** option to the status dropdown.

## Testing

Add focused selector tests covering:

- cancelled but not refunded,
- refunded but not cancelled,
- neither condition,
- case-insensitive stored values,
- existing filters remaining unaffected.
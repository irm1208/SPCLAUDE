# Group-buy zero vendor shipping

## Goal

When an organiser sets vendor shipping to exactly zero, treat it as included in
other fees: do not show a vendor-shipping row, a TBD total label, or a yellow
TBD notice in participant order details or downloaded receipts. A blank amount
continues to mean that vendor shipping is unknown.

## Root cause

Orders currently persist only a numeric `vendor_shipping` amount. Both an
unknown amount and an explicit zero are stored as zero, so the customer detail
page and receipt generator infer TBD from zero alone.

## Design

- Add a nullable order-level `vendor_shipping_is_tbd` snapshot.
- For newly created group-buy orders, derive the snapshot on the server from
  the group-buy shipping configuration. Do not accept a client-supplied flag.
- Keep legacy rows with no snapshot readable. Infer their display state from
  the current group-buy amount: zero is known and omitted; blank or nonzero
  remains TBD when the saved order amount is zero. This fallback affects display
  only.
- In participant details and the PDF receipt, show the vendor-shipping row only
  when it is TBD or the saved amount is positive. The existing receipt TBD flag
  continues to control its estimated-total label and yellow notice.
- Preserve blank as `null` in both organiser settings interfaces. An explicit
  numeric zero remains zero.
- Do not change order totals, payment status, or paid-order state. Add the
  nullable column through the normal Drizzle schema path; do not add startup DDL
  or rewrite historical payment data.

## Verification

- Unit-test new-order snapshot resolution and legacy fallback for null, zero,
  positive amounts, non-group-buy orders, and excluded order types.
- Test the customer display model for TBD, positive shipping, and known zero.
- Run the relevant API and frontend tests, typechecks, and builds.
- Apply only the additive development schema change if needed for a running
  preview, then restart the canonical application workflow and inspect it.